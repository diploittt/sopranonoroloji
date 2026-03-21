/* ═══════════════════════════════════════════════════════════
   SopranoChat API — Payment Controller
   POST /api/payment/init — JWT auth + ödeme başlat
   POST /api/payment/callback — iyzico callback (public)
   ═══════════════════════════════════════════════════════════ */

import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentService } from './payment.service';

@Controller('api/payment')
export class PaymentController {
  private readonly logger = new Logger('PaymentController');

  constructor(private paymentService: PaymentService) {}

  /**
   * POST /api/payment/init
   * JWT auth — kullanıcı ödeme başlatır
   */
  @Post('init')
  @UseGuards(AuthGuard('jwt'))
  async initPayment(
    @Req() req: Request,
    @Body() body: { packageId: string },
  ) {
    const user = (req as any).user;
    if (!user?.sub || !user?.tenantId) {
      throw new HttpException('Yetkilendirme hatası.', HttpStatus.UNAUTHORIZED);
    }

    if (!body.packageId) {
      throw new HttpException('packageId gerekli.', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.paymentService.initCheckout(
        user.sub,
        body.packageId,
        user.tenantId,
      );
      return result;
    } catch (err: any) {
      this.logger.error(`[INIT] Hata: ${err.message}`);
      throw new HttpException(
        err.message || 'Ödeme başlatılamadı.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * POST /api/payment/callback
   * iyzico'dan gelen callback (public — token doğrulaması ile güvenli)
   */
  @Post('callback')
  async handleCallback(
    @Body() body: { token: string },
    @Res() res: any,
  ) {
    this.logger.log(`[CALLBACK] iyzico callback alındı`);

    const result = await this.paymentService.handleCallback(body.token);

    if (result.success) {
      // Başarılı — kullanıcıya başarı sayfası göster
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Ödeme Başarılı</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0f1628; color: white; }
            .card { text-align: center; padding: 40px; background: rgba(99,102,241,0.1); border-radius: 20px; border: 1px solid rgba(99,102,241,0.2); max-width: 400px; }
            h1 { font-size: 48px; margin-bottom: 8px; }
            p { color: #94a3b8; margin: 8px 0; }
            .success { color: #4ade80; font-weight: 700; font-size: 18px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✅</h1>
            <p class="success">${result.message}</p>
            <p>Bu sayfayı kapatıp uygulamaya dönebilirsiniz.</p>
          </div>
        </body>
        </html>
      `);
    } else {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Ödeme Hatası</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0f1628; color: white; }
            .card { text-align: center; padding: 40px; background: rgba(239,68,68,0.1); border-radius: 20px; border: 1px solid rgba(239,68,68,0.2); max-width: 400px; }
            h1 { font-size: 48px; margin-bottom: 8px; }
            p { color: #94a3b8; margin: 8px 0; }
            .error { color: #f87171; font-weight: 700; font-size: 18px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>❌</h1>
            <p class="error">${result.message}</p>
            <p>Tekrar denemek için uygulamaya dönün.</p>
          </div>
        </body>
        </html>
      `);
    }
  }
}
