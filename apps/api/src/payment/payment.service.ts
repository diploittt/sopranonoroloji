/* ═══════════════════════════════════════════════════════════
   SopranoChat API — Payment Service
   iyzico checkout + callback + bakiye yükleme
   ═══════════════════════════════════════════════════════════ */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger('PaymentService');
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly callbackBaseUrl: string;

  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
    private configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('IYZICO_API_KEY') || '';
    this.secretKey = this.configService.get<string>('IYZICO_SECRET_KEY') || '';
    this.baseUrl = this.configService.get<string>('IYZICO_BASE_URL') || 'https://sandbox-api.iyzipay.com';
    this.callbackBaseUrl = this.configService.get<string>('API_BASE_URL') || 'http://localhost:3001';
  }

  /**
   * iyzico checkout form başlat
   */
  async initCheckout(userId: string, packageId: string, tenantId: string) {
    // Kullanıcı bilgilerini al
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, email: true, ipAddress: true },
    });
    if (!user) throw new Error('Kullanıcı bulunamadı.');

    // Paketi al
    const pkg = await this.prisma.tokenPackage.findUnique({
      where: { id: packageId },
    });
    if (!pkg || !pkg.isActive) throw new Error('Paket bulunamadı veya aktif değil.');

    // Bekleyen sipariş kontrolü (max 3)
    const pendingCount = await this.prisma.tokenOrder.count({
      where: { userId, status: 'PENDING' },
    });
    if (pendingCount >= 3) {
      throw new Error('En fazla 3 bekleyen sipariş olabilir.');
    }

    // Sipariş oluştur
    const order = await this.prisma.tokenOrder.create({
      data: {
        tenantId,
        userId,
        packageId: pkg.id,
        tokenAmount: pkg.tokenAmount,
        price: pkg.price,
        status: 'PENDING',
        paymentMethod: 'iyzico',
      },
    });

    // iyzico checkout form iste
    const conversationId = order.id;
    const price = Number(pkg.price).toFixed(2);
    const basketId = `BSK_${order.id.slice(0, 8)}`;

    const requestBody = {
      locale: 'tr',
      conversationId,
      price,
      paidPrice: price,
      currency: 'TRY',
      basketId,
      paymentGroup: 'PRODUCT',
      callbackUrl: `${this.callbackBaseUrl}/api/payment/callback`,
      enabledInstallments: [1],
      buyer: {
        id: user.id,
        name: user.displayName || 'Kullanıcı',
        surname: ' ',
        gsmNumber: '+905000000000',
        email: user.email || `${user.id}@soprano.chat`,
        identityNumber: '11111111111',
        registrationAddress: 'Türkiye',
        ip: user.ipAddress || '127.0.0.1',
        city: 'Istanbul',
        country: 'Turkey',
      },
      shippingAddress: {
        contactName: user.displayName || 'Kullanıcı',
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Türkiye',
      },
      billingAddress: {
        contactName: user.displayName || 'Kullanıcı',
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Türkiye',
      },
      basketItems: [
        {
          id: pkg.id,
          name: pkg.name,
          category1: 'Jeton',
          itemType: 'VIRTUAL',
          price,
        },
      ],
    };

    try {
      const response = await this.iyzicoRequest(
        '/payment/iyzipos/checkoutform/initialize/auth/ecom',
        requestBody,
      );

      if (response.status === 'success' && response.token) {
        // Token'ı kaydet
        await this.prisma.tokenOrder.update({
          where: { id: order.id },
          data: { paymentToken: response.token },
        });

        this.logger.log(`[PAYMENT:INIT] Checkout başlatıldı → order=${order.id}`);

        return {
          success: true,
          orderId: order.id,
          paymentPageUrl: response.paymentPageUrl,
          token: response.token,
          checkoutFormContent: response.checkoutFormContent,
        };
      } else {
        this.logger.error(`[PAYMENT:INIT] iyzico hatası: ${response.errorMessage || JSON.stringify(response)}`);
        // Order'ı sil (başarısız)
        await this.prisma.tokenOrder.delete({ where: { id: order.id } });
        throw new Error(response.errorMessage || 'iyzico ödeme başlatılamadı.');
      }
    } catch (err: any) {
      this.logger.error(`[PAYMENT:INIT] Hata: ${err.message}`);
      // Cleanup
      try {
        await this.prisma.tokenOrder.delete({ where: { id: order.id } });
      } catch { /* ignore */ }
      throw err;
    }
  }

  /**
   * iyzico callback — ödeme sonucu doğrula + bakiye ekle
   */
  async handleCallback(token: string): Promise<{ success: boolean; orderId?: string; message: string }> {
    if (!token) {
      return { success: false, message: 'Token eksik.' };
    }

    try {
      // iyzico'dan ödeme sonucunu sorgula
      const result = await this.iyzicoRequest(
        '/payment/iyzipos/checkoutform/auth/ecom/detail',
        {
          locale: 'tr',
          token,
        },
      );

      if (result.paymentStatus !== 'SUCCESS') {
        this.logger.warn(`[PAYMENT:CALLBACK] Ödeme başarısız: ${result.errorMessage || result.paymentStatus}`);

        // Order'ı bul ve REJECTED yap
        const order = await this.prisma.tokenOrder.findFirst({
          where: { paymentToken: token },
        });
        if (order) {
          await this.prisma.tokenOrder.update({
            where: { id: order.id },
            data: { status: 'REJECTED', processedAt: new Date() },
          });
        }

        return { success: false, message: result.errorMessage || 'Ödeme başarısız.' };
      }

      // Token ile order'ı bul
      const order = await this.prisma.tokenOrder.findFirst({
        where: { paymentToken: token },
      });

      if (!order) {
        this.logger.error(`[PAYMENT:CALLBACK] Order bulunamadı: token=${token.slice(0, 20)}...`);
        return { success: false, message: 'Sipariş bulunamadı.' };
      }

      // Tekrar işleme engeli
      if (order.status === 'COMPLETED' || order.status === 'APPROVED') {
        return { success: true, orderId: order.id, message: 'Sipariş zaten işlenmiş.' };
      }

      // Transaction: order güncelle + bakiye ekle
      await this.prisma.$transaction([
        this.prisma.tokenOrder.update({
          where: { id: order.id },
          data: {
            status: 'COMPLETED',
            paymentId: result.paymentId,
            paymentMethod: 'iyzico',
            processedAt: new Date(),
          },
        }),
        this.prisma.user.update({
          where: { id: order.userId },
          data: { balance: { increment: order.tokenAmount } },
        }),
      ]);

      this.logger.log(`[PAYMENT:CALLBACK] ✅ Ödeme başarılı → user=${order.userId}, +${order.tokenAmount} jeton`);

      // Push bildirim gönder
      this.sendPaymentPush(order.userId, order.tokenAmount).catch(() => {});

      return { success: true, orderId: order.id, message: 'Ödeme başarılı! Jetonlarınız yüklendi.' };
    } catch (err: any) {
      this.logger.error(`[PAYMENT:CALLBACK] Hata: ${err.message}`, err.stack);
      return { success: false, message: `İşlem hatası: ${err.message}` };
    }
  }

  /**
   * Push bildirim — ödeme başarılı
   */
  private async sendPaymentPush(userId: string, tokenAmount: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { expoPushToken: true },
      });
      if (user?.expoPushToken) {
        await this.pushService.sendPushNotification({
          to: user.expoPushToken,
          title: '💰 Ödeme Başarılı!',
          body: `${tokenAmount.toLocaleString()} jeton hesabınıza yüklendi.`,
          data: { type: 'payment_success' },
        });
      }
    } catch { /* sessizce atla */ }
  }

  /**
   * iyzico REST API çağrısı
   */
  private async iyzicoRequest(path: string, body: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const randomStr = `${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
    
    // iyzico authentication header
    const pkiString = this.generatePkiString(body);
    const hashStr = `${this.apiKey}${randomStr}${this.secretKey}${pkiString}`;
    
    // SHA-1 base64
    const encoder = new TextEncoder();
    const data = encoder.encode(hashStr);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const base64Hash = btoa(String.fromCharCode(...hashArray));
    
    const authHeader = `IYZWS ${this.apiKey}:${base64Hash}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authHeader,
        'x-iyzi-rnd': randomStr,
      },
      body: JSON.stringify(body),
    });

    return response.json();
  }

  /**
   * iyzico PKI string oluştur (hash hesaplama için)
   */
  private generatePkiString(obj: any): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      if (Array.isArray(value)) {
        const arrStr = value.map(item => {
          if (typeof item === 'object') return this.generatePkiString(item);
          return String(item);
        }).join(', ');
        parts.push(`${key}=[${arrStr}]`);
      } else if (typeof value === 'object') {
        parts.push(`${key}=[${this.generatePkiString(value)}]`);
      } else {
        parts.push(`${key}=${value}`);
      }
    }
    return `[${parts.join(',')}]`;
  }
}
