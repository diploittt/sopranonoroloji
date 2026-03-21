/* ═══════════════════════════════════════════════════════════
   SopranoChat API — Production Logger Service
   File log + error log ayrımı
   payment, ban, login eventleri ayrı loglansın
   ═══════════════════════════════════════════════════════════ */

import { Injectable, LoggerService as NestLoggerService, LogLevel } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AppLoggerService implements NestLoggerService {
  private logDir: string;
  private appStream: fs.WriteStream;
  private errorStream: fs.WriteStream;
  private eventStream: fs.WriteStream;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logDir)) fs.mkdirSync(this.logDir, { recursive: true });

    this.appStream = fs.createWriteStream(path.join(this.logDir, 'app.log'), { flags: 'a' });
    this.errorStream = fs.createWriteStream(path.join(this.logDir, 'error.log'), { flags: 'a' });
    this.eventStream = fs.createWriteStream(path.join(this.logDir, 'events.log'), { flags: 'a' });
  }

  private ts() { return new Date().toISOString(); }

  private write(stream: fs.WriteStream, level: string, message: string, context?: string) {
    const line = `[${this.ts()}] [${level}] ${context ? `[${context}] ` : ''}${message}\n`;
    stream.write(line);
  }

  log(message: any, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    console.log(`[${this.ts()}] [LOG] ${context ? `[${context}] ` : ''}${msg}`);
    this.write(this.appStream, 'LOG', msg, context);
  }

  error(message: any, trace?: string, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    console.error(`[${this.ts()}] [ERROR] ${context ? `[${context}] ` : ''}${msg}`);
    if (trace) console.error(trace);
    this.write(this.errorStream, 'ERROR', `${msg}${trace ? `\n${trace}` : ''}`, context);
    this.write(this.appStream, 'ERROR', msg, context);
  }

  warn(message: any, context?: string) {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    console.warn(`[${this.ts()}] [WARN] ${context ? `[${context}] ` : ''}${msg}`);
    this.write(this.appStream, 'WARN', msg, context);
  }

  debug?(message: any, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      const msg = typeof message === 'string' ? message : JSON.stringify(message);
      console.debug(`[${this.ts()}] [DEBUG] ${context ? `[${context}] ` : ''}${msg}`);
    }
  }

  verbose?(message: any, context?: string) {
    // Production'da sessiz
  }

  fatal?(message: any, context?: string) {
    this.error(message, undefined, context);
  }

  // ═══════════ Kritik Event Logları ═══════════

  /** Login event — başarılı/başarısız */
  logLogin(userId: string, displayName: string, ip?: string, success = true) {
    const emoji = success ? '🟢' : '🔴';
    const line = `${emoji} LOGIN ${success ? 'OK' : 'FAIL'} | user=${userId} name=${displayName} ip=${ip || '?'}`;
    this.write(this.eventStream, 'LOGIN', line);
    this.log(line, 'AUTH');
  }

  /** Payment event */
  logPayment(orderId: string, userId: string, amount: number, status: string, method?: string) {
    const emoji = status === 'COMPLETED' || status === 'APPROVED' ? '💰' : '❌';
    const line = `${emoji} PAYMENT | order=${orderId} user=${userId} amount=${amount} status=${status} method=${method || 'unknown'}`;
    this.write(this.eventStream, 'PAYMENT', line);
    this.log(line, 'PAYMENT');
  }

  /** Ban event */
  logBan(targetUserId: string, targetName: string, adminId: string, adminName: string, type: string, duration: string) {
    const line = `🚫 BAN | target=${targetUserId}(${targetName}) admin=${adminId}(${adminName}) type=${type} duration=${duration}`;
    this.write(this.eventStream, 'BAN', line);
    this.log(line, 'MODERATION');
  }

  /** Gift event */
  logGift(senderId: string, senderName: string, receiverId: string, giftName: string, cost: number) {
    const line = `🎁 GIFT | sender=${senderId}(${senderName}) receiver=${receiverId} gift=${giftName} cost=${cost}`;
    this.write(this.eventStream, 'GIFT', line);
  }

  /** Security event */
  logSecurity(event: string, details: string, ip?: string) {
    const line = `🔒 SECURITY | event=${event} ${details} ip=${ip || '?'}`;
    this.write(this.eventStream, 'SECURITY', line);
    this.write(this.errorStream, 'SECURITY', line);
  }
}
