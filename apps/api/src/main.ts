import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { AdminService } from './admin/admin.service';
import * as bcrypt from 'bcryptjs';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Increase body size limit for base64 logo uploads
  app.use(json({ limit: '2mb' }));

  // Enable CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT') || 3001;
  await app.listen(port);
  // Order System Ready
  console.log(`Application is running on: ${await app.getUrl()}`);

  // Auto-seed admin account and default rooms
  try {
    const adminService = app.get(AdminService);
    await adminService.setupRootAdmin();
    console.log('✓ Root admin & default rooms seeded.');
  } catch (e) {
    console.warn('⚠ setupRootAdmin skipped:', e.message);
  }
}
bootstrap();
