/* ═══════════════════════════════════════════════════════════
   SopranoChat API — Push Notification Service  
   Expo Push API ile bildirim gönderme
   ═══════════════════════════════════════════════════════════ */

import { Injectable, Logger } from '@nestjs/common';

export interface PushPayload {
  to: string; // ExpoPushToken
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  badge?: number;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger('PushService');
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  /**
   * Tek bir bildirim gönder
   */
  async sendPushNotification(payload: PushPayload): Promise<boolean> {
    if (!payload.to || !payload.to.startsWith('ExponentPushToken')) {
      this.logger.warn(`[PUSH] Geçersiz token: ${payload.to}`);
      return false;
    }

    try {
      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: payload.to,
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          sound: payload.sound || 'default',
          badge: payload.badge,
          priority: 'high',
        }),
      });

      const result = await response.json();
      this.logger.log(`[PUSH] Bildirim gönderildi → ${payload.to.slice(0, 25)}...`);
      return true;
    } catch (error) {
      this.logger.error(`[PUSH] Gönderim hatası: ${error}`);
      return false;
    }
  }

  /**
   * Birden fazla bildirim gönder (batch)
   */
  async sendBatchNotifications(payloads: PushPayload[]): Promise<void> {
    const validPayloads = payloads.filter(
      (p) => p.to && p.to.startsWith('ExponentPushToken'),
    );

    if (validPayloads.length === 0) return;

    try {
      const messages = validPayloads.map((p) => ({
        to: p.to,
        title: p.title,
        body: p.body,
        data: p.data || {},
        sound: p.sound || 'default',
        priority: 'high' as const,
      }));

      // Expo batch max 100 — chunk halinde gönder
      const chunks = [];
      for (let i = 0; i < messages.length; i += 100) {
        chunks.push(messages.slice(i, i + 100));
      }

      for (const chunk of chunks) {
        await fetch(this.EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chunk),
        });
      }

      this.logger.log(`[PUSH] ${validPayloads.length} bildirim batch gönderildi`);
    } catch (error) {
      this.logger.error(`[PUSH] Batch gönderim hatası: ${error}`);
    }
  }

  /**
   * DM bildirimi
   */
  async sendDMNotification(
    expoPushToken: string,
    senderName: string,
    messagePreview: string,
    data?: Record<string, any>,
  ): Promise<void> {
    await this.sendPushNotification({
      to: expoPushToken,
      title: `💬 ${senderName}`,
      body: messagePreview.slice(0, 100),
      data: { type: 'dm', ...data },
    });
  }

  /**
   * Mention bildirimi
   */
  async sendMentionNotification(
    expoPushToken: string,
    senderName: string,
    roomName: string,
    data?: Record<string, any>,
  ): Promise<void> {
    await this.sendPushNotification({
      to: expoPushToken,
      title: `🏷️ ${senderName} seni etiketledi`,
      body: `${roomName} odasında`,
      data: { type: 'mention', ...data },
    });
  }

  /**
   * Gift bildirimi
   */
  async sendGiftNotification(
    expoPushToken: string,
    senderName: string,
    giftName: string,
    data?: Record<string, any>,
  ): Promise<void> {
    await this.sendPushNotification({
      to: expoPushToken,
      title: `🎁 ${senderName} hediye gönderdi!`,
      body: giftName,
      data: { type: 'gift', ...data },
    });
  }
}
