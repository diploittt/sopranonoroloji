import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true = 465, false = 587
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  async sendResetCode(email: string, code: string): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@soprano.com',
        to: email,
        subject: '🔐 SopranoChat — Şifre Sıfırlama Kodu',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0a0a0f; border-radius: 20px; border: 1px solid rgba(255,255,255,0.06);">
            <div style="text-align: center; margin-bottom: 32px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #e11d48, #db2777); padding: 14px; border-radius: 16px; margin-bottom: 16px;">
                <span style="font-size: 28px;">🛡️</span>
              </div>
              <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0;">Soprano<span style="color: #e11d48;">Chat</span></h1>
              <p style="color: #6b7280; font-size: 13px; margin-top: 6px;">Yönetim Paneli Şifre Sıfırlama</p>
            </div>

            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 28px; text-align: center; margin-bottom: 24px;">
              <p style="color: #9ca3af; font-size: 13px; margin: 0 0 16px 0;">Şifre sıfırlama kodunuz:</p>
              <div style="background: linear-gradient(135deg, rgba(225,29,72,0.1), rgba(219,39,119,0.1)); border: 2px solid rgba(225,29,72,0.3); border-radius: 12px; padding: 20px; letter-spacing: 12px; font-size: 36px; font-weight: 900; color: #ffffff; font-family: 'SF Mono', 'Fira Code', monospace;">
                ${code}
              </div>
              <p style="color: #6b7280; font-size: 11px; margin: 16px 0 0 0;">Bu kod <strong style="color: #f59e0b;">10 dakika</strong> içinde geçerlidir.</p>
            </div>

            <p style="color: #4b5563; font-size: 11px; text-align: center; margin: 0;">
              Bu işlemi siz yapmadıysanız bu e-postayı görmezden gelebilirsiniz.
            </p>

            <div style="border-top: 1px solid rgba(255,255,255,0.04); margin-top: 28px; padding-top: 16px; text-align: center;">
              <p style="color: #374151; font-size: 10px; margin: 0; text-transform: uppercase; letter-spacing: 2px;">
                Soprano Secure Administration Module v2.0
              </p>
            </div>
          </div>
        `,
      });
      return true;
    } catch (error) {
      console.error('Mail gönderme hatası:', error);
      return false;
    }
  }

  async sendContactNotification(data: { name: string; email: string; subject: string; message: string }): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@sopranochat.com',
        to: 'destek@sopranochat.com',
        replyTo: data.email,
        subject: `📩 Yeni İletişim Mesajı: ${data.subject}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #0a0a0f; border-radius: 20px; border: 1px solid rgba(255,255,255,0.06);">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #ec4899); padding: 14px; border-radius: 16px; margin-bottom: 16px;">
                <span style="font-size: 28px;">📩</span>
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0;">Yeni İletişim Mesajı</h1>
            </div>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; margin-bottom: 16px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 4px;"><strong style="color: #e2e8f0;">Gönderen:</strong></p>
              <p style="color: #ffffff; margin: 0 0 16px;">${data.name} (${data.email})</p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 4px;"><strong style="color: #e2e8f0;">Konu:</strong></p>
              <p style="color: #ffffff; margin: 0 0 16px;">${data.subject}</p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 4px;"><strong style="color: #e2e8f0;">Mesaj:</strong></p>
              <p style="color: #d1d5db; white-space: pre-wrap; margin: 0;">${data.message}</p>
            </div>
            <div style="border-top: 1px solid rgba(255,255,255,0.04); padding-top: 16px; text-align: center;">
              <p style="color: #374151; font-size: 10px; margin: 0; text-transform: uppercase; letter-spacing: 2px;">SopranoChat İletişim Sistemi</p>
            </div>
          </div>
        `,
      });
      return true;
    } catch (error) {
      console.error('İletişim bildirim maili hatası:', error);
      return false;
    }
  }

  async sendOrderNotification(order: any): Promise<boolean> {
    try {
      const hostingLabel = order.hostingType === 'own_domain' ? `Kendi Domaini: ${order.customDomain}` : 'SopranoChat Platformu';
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@sopranochat.com',
        to: 'destek@sopranochat.com',
        subject: `🛒 Yeni Sipariş: ${order.packageName} — ${order.paymentCode}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; background: #0a0a0f; border-radius: 20px; border: 1px solid rgba(255,255,255,0.06);">
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; background: linear-gradient(135deg, #10b981, #0ea5e9); padding: 14px; border-radius: 16px; margin-bottom: 16px;">
                <span style="font-size: 28px;">🛒</span>
              </div>
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 0;">Yeni Sipariş Geldi!</h1>
            </div>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; margin-bottom: 16px;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 4px;"><strong style="color: #e2e8f0;">Müşteri:</strong></p>
              <p style="color: #ffffff; margin: 0 0 16px;">${order.firstName} ${order.lastName}</p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 4px;"><strong style="color: #e2e8f0;">E-posta / Telefon:</strong></p>
              <p style="color: #ffffff; margin: 0 0 16px;">${order.email} | ${order.phone}</p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 4px;"><strong style="color: #e2e8f0;">Paket:</strong></p>
              <p style="color: #ffffff; margin: 0 0 16px;">${order.packageName}</p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 4px;"><strong style="color: #e2e8f0;">Hosting:</strong></p>
              <p style="color: #ffffff; margin: 0 0 16px;">${hostingLabel}</p>
              <p style="color: #9ca3af; font-size: 12px; margin: 0 0 4px;"><strong style="color: #e2e8f0;">Ödeme Kodu:</strong></p>
              <p style="color: #10b981; font-size: 18px; font-weight: 900; letter-spacing: 4px; margin: 0;">${order.paymentCode}</p>
            </div>
            <div style="border-top: 1px solid rgba(255,255,255,0.04); padding-top: 16px; text-align: center;">
              <p style="color: #374151; font-size: 10px; margin: 0; text-transform: uppercase; letter-spacing: 2px;">SopranoChat Sipariş Sistemi</p>
            </div>
          </div>
        `,
      });
      return true;
    } catch (error) {
      console.error('Sipariş bildirim maili hatası:', error);
      return false;
    }
  }
}
