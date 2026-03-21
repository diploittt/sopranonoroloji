/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — Push Notification Service
   Expo Notifications ile push token alma, backend kayıt,
   bildirim dinleme ve deep link yönlendirme
   
   NOT: Expo Go SDK 53'te remote notifications desteklenmiyor.
   Tüm çağrılar try-catch ile sarılmıştır.
   ═══════════════════════════════════════════════════════════ */

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { realtimeService } from './realtimeService';

// ── Güvenli expo-notifications yükleme ──
// Expo Go SDK 53'te remote notifications desteklenmiyor
// appOwnership kontrolü ile modülü hiç yüklemiyoruz
const isExpoGo = Constants.appOwnership === 'expo';
let Notifications: any = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    console.warn('[Push] expo-notifications yüklenemedi');
  }
} else {
  console.log('[Push] Expo Go tespit edildi — push notifications devre dışı');
}

export interface PushNotificationData {
  type: 'dm' | 'mention' | 'gift' | 'room';
  roomId?: string;
  roomSlug?: string;
  fromUserId?: string;
}

class PushService {
  private pushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  /**
   * Push notification izni al ve Expo push token döndür
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (Platform.OS === 'web' || !Notifications) return null;

    if (!Device.isDevice) {
      console.warn('[Push] Emülatörde push notification çalışmaz');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[Push] Bildirim izni reddedildi');
        return null;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      });

      this.pushToken = tokenData.data;
      console.log('[Push] Token alındı:', this.pushToken);

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'SopranoChat',
          importance: Notifications.AndroidImportance?.HIGH ?? 4,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#818cf8',
          sound: 'default',
        });
      }

      return this.pushToken;
    } catch (error) {
      console.warn('[Push] Token alınamadı:', error);
      return null;
    }
  }

  /**
   * Push token'ı backend'e kaydet (socket üzerinden)
   */
  savePushTokenToBackend(token: string): void {
    realtimeService.emit('push:register', { expoPushToken: token });
    console.log('[Push] Token backend\'e gönderildi');
  }

  /**
   * Bildirim listener'larını kur
   */
  setupListeners(onNotificationTap: (data: PushNotificationData) => void): void {
    if (!Notifications) return;

    try {
      this.notificationListener = Notifications.addNotificationReceivedListener(
        (notification: any) => {
          console.log('[Push] Bildirim alındı:', notification.request.content.title);
        }
      );

      this.responseListener = Notifications.addNotificationResponseReceivedListener(
        (response: any) => {
          const data = (response.notification.request.content.data || {}) as PushNotificationData;
          console.log('[Push] Bildirime tıklandı:', data);
          if (data) {
            onNotificationTap(data);
          }
        }
      );
    } catch {
      console.warn('[Push] Listener kurulumu başarısız (Expo Go?)');
    }
  }

  /**
   * Listener'ları temizle
   */
  cleanup(): void {
    try {
      if (this.notificationListener) {
        this.notificationListener.remove();
        this.notificationListener = null;
      }
      if (this.responseListener) {
        this.responseListener.remove();
        this.responseListener = null;
      }
    } catch {
      // cleanup güvenli — hata önemsiz
    }
  }

  /**
   * Mevcut token'ı döndür
   */
  getToken(): string | null {
    return this.pushToken;
  }
}

export const pushService = new PushService();
export default pushService;
