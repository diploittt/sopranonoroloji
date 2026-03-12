import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { can, canWithOverrides, hasRole, Role, Action, getRoleLevel, isHigherRole } from '../common/rbac';
import { BanDuration, BanType } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcryptjs';

import { ChatGateway } from '../chat/chat.gateway';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
    private mailService: MailService,
  ) { }

  onModuleInit() {
    // Her 6 saatte bir vadesi geçmiş ödemeleri kontrol et
    setInterval(() => this.checkOverduePayments(), 6 * 60 * 60 * 1000);
    // Başlangıçta 30 saniye sonra ilk kontrolü yap
    setTimeout(() => this.checkOverduePayments(), 30_000);
  }

  /** Vadesi 3+ gün geçmiş ve son 24 saatte bildirim gönderilmemiş tenant'lara otomatik hatırlatma */
  async checkOverduePayments() {
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const overdueTenants = await this.prisma.tenant.findMany({
        where: {
          expiresAt: { lt: threeDaysAgo },
          status: 'ACTIVE',
          OR: [
            { paymentReminderAt: null },
            { paymentReminderAt: { lt: twentyFourHoursAgo } },
          ],
        },
        select: { id: true, name: true },
      });

      for (const tenant of overdueTenants) {
        try {
          await this.sendPaymentReminder(tenant.id);
          this.logger.log(`Otomatik ödeme hatırlatması gönderildi: ${tenant.name}`);
        } catch (err) {
          this.logger.error(`Hatırlatma gönderilemedi (${tenant.name}):`, err);
        }
      }

      if (overdueTenants.length > 0) {
        this.logger.log(`${overdueTenants.length} tenant'a otomatik ödeme hatırlatması gönderildi.`);
      }
    } catch (err) {
      this.logger.error('Otomatik ödeme kontrolü başarısız:', err);
    }
  }

  /** Vadesi geçmiş müşterileri listele */
  async getOverdueTenants() {
    const now = new Date();
    return this.prisma.tenant.findMany({
      where: {
        expiresAt: { lt: now },
        status: 'ACTIVE',
      },
      orderBy: { expiresAt: 'asc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        email: true,
        expiresAt: true,
        paymentReminderAt: true,
      },
    });
  }

  async setupRootAdmin() {
    console.log('--- SuperAdmin Setup via API ---');

    // 1. Ensure system tenant
    let tenant = await this.prisma.tenant.findFirst({
      where: { OR: [{ slug: 'system' }, { slug: 'default' }] },
    });

    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: {
          name: 'System Administration',
          slug: 'system',
          apiSecret: 'system-' + Math.random().toString(36).slice(-8),
          status: 'ACTIVE',
        },
      });
    }

    // 2. Root admin yoksa otomatik oluştur
    let existingOwner = await this.prisma.user.findFirst({
      where: { tenantId: tenant.id, role: 'owner' },
    });

    if (!existingOwner) {
      const passwordHash = await bcrypt.hash('123456', 10);
      existingOwner = await this.prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: 'beren@soprano.chat',
          displayName: 'Beren',
          role: 'owner',
          passwordHash,
          isOnline: false,
          gender: 'Erkek',
        },
      });
      console.log('  ✓ Owner created:', existingOwner.displayName, '(email: beren@soprano.chat, password: 123456)');
    } else {
      console.log('  ✓ Owner already exists:', existingOwner.displayName);
    }

    const user = existingOwner;

    // 3. Ensure default rooms exist for this tenant (ONLY if tenant has NO rooms at all)
    const existingRoomCount = await this.prisma.room.count({
      where: { tenantId: tenant.id },
    });

    if (existingRoomCount === 0) {
      const DEFAULT_ROOMS = [
        { name: 'Genel Sohbet', slug: 'genel-sohbet' },
        { name: 'Müzik Odası', slug: 'muzik-odasi' },
        { name: 'Oyun Alanı', slug: 'oyun-alani' },
        { name: 'VIP Lounge', slug: 'vip-lounge', isVipRoom: true },
      ];

      for (const rd of DEFAULT_ROOMS) {
        await this.prisma.room.create({
          data: {
            tenantId: tenant.id,
            name: rd.name,
            slug: rd.slug,
            isVipRoom: rd.isVipRoom || false,
          },
        });
        console.log(`  ✓ Room created: ${rd.name} (${rd.slug})`);
      }
    } else {
      console.log(`  ✓ ${existingRoomCount} oda zaten mevcut — seed odaları atlanıyor.`);
    }

    return {
      success: true,
      message: 'Admin account secured.',
      email: user?.email ?? null,
      role: user?.role ?? null,
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  AUDIT LOG — auto-log every admin action
  // ═══════════════════════════════════════════════════════════

  async createAuditLog(data: {
    tenantId: string;
    event: string;
    adminId: string;
    targetUserId?: string;
    ip?: string;
    adminIp?: string;
    metadata?: any;
  }) {
    return this.prisma.auditLog.create({ data });
  }

  // ═══════════════════════════════════════════════════════════
  //  0) TENANTS / CUSTOMERS
  // ═══════════════════════════════════════════════════════════

  async getCustomers() {
    try {
      const tenants = await this.prisma.tenant.findMany({
        where: { slug: { not: 'system' } },
        include: {
          _count: { select: { rooms: true, users: true } },
          users: {
            where: { role: { in: ['owner', 'admin'] } },
            take: 1,
            orderBy: { createdAt: 'asc' },
            select: { email: true, displayName: true, id: true, role: true },
          },
          rooms: {
            where: { isMeetingRoom: true },
            take: 1,
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Add isMeetingRoom flag to each tenant and remove rooms array
      return tenants.map(({ rooms, ...tenant }) => ({
        ...tenant,
        isMeetingRoom: rooms.length > 0,
      }));
    } catch (error) {
      console.error('[getCustomers] PRISMA ERROR:', error?.message || error);
      console.error('[getCustomers] FULL ERROR:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  async getSystemTenant() {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: 'system' },
      include: {
        _count: { select: { rooms: true, users: true } },
        users: {
          where: { role: { in: ['owner', 'admin', 'godmaster'] } },
          orderBy: { createdAt: 'asc' },
          select: { email: true, displayName: true, id: true, role: true },
        },
        rooms: {
          where: { isMeetingRoom: true },
          take: 1,
          select: { id: true },
        },
      },
    });

    if (!tenant) return null;

    const { rooms, ...rest } = tenant;
    return { ...rest, isMeetingRoom: rooms.length > 0 };
  }

  // Güvenli şifre üretici
  private generatePassword(length = 12): string {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  async provisionCustomer(
    systemAdminId: string,
    data: {
      name: string;
      displayName?: string;
      domain?: string;
      hostingType?: 'sopranochat' | 'own_domain';
      slug?: string;
      roomCount?: number;
      userLimit?: number;
      cameraEnabled?: boolean;
      plan?: string;
      billingPeriod?: 'MONTHLY' | 'YEARLY';
      adminName?: string;
      adminEmail?: string;
      adminPhone?: string;
      price?: number;
      currency?: string;
      customerEmail?: string;
      customerPhone?: string;
      roomName?: string;
      logo?: string;
    },
    adminIp?: string,
  ) {
    const slug =
      data.slug ||
      (data.domain
        ? data.domain.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
        : data.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''));

    // Slug çakışma kontrolü
    const existing = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existing)
      throw new ConflictException('Bu slug ile bir müşteri zaten var.');

    // Şifreleri önceden üret (hash işlemi transaction dışında yapılır)
    const ownerPassword = this.generatePassword();
    const ownerHash = await bcrypt.hash(ownerPassword, 10);

    // Karmaşık access code üret (tahmin edilmesi zor, URL-safe)
    const accessCode = [
      Math.random().toString(36).slice(2, 10),
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 10),
    ].join('-');

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // A. Tenant oluştur (accessCode ile)
        const tenant = await tx.tenant.create({
          data: {
            name: data.name,
            displayName: data.displayName || data.roomName || null,
            slug: slug,
            domain: data.hostingType === 'own_domain' ? (data.domain || null) : null,
            hostingType: data.hostingType || 'sopranochat',
            accessCode: accessCode,
            logoUrl: data.logo || null,
            roomLimit: data.roomCount || 10,
            userLimitPerRoom: data.userLimit || 50,
            packageType: data.cameraEnabled === false ? 'NO_CAMERA' : 'CAMERA',
            status: 'ACTIVE',
            apiSecret: Math.random().toString(36).slice(-16),
            billingPeriod: data.billingPeriod || 'MONTHLY',
            price: data.price || null,
            currency: data.currency || 'TRY',
            email: data.customerEmail || data.adminEmail || null,
            phone: data.customerPhone || data.adminPhone || null,
            expiresAt: new Date(
              Date.now() + ((data.billingPeriod === 'YEARLY' ? 365 : 30) * 24 * 60 * 60 * 1000)
            ),
          },
        });

        // B. Varsayılan odalar oluştur (benzersiz isimler — system odalarıyla karışmasın)
        const firstRoomName = data.roomName || 'Oda 1';
        const firstRoomSlug = firstRoomName.toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'oda-1';
        const defaultRoomDefs = [
          { name: firstRoomName, slug: firstRoomSlug },
          { name: 'Oda 2', slug: 'oda-2' },
          { name: 'Oda 3', slug: 'oda-3' },
          { name: 'VIP Oda', slug: 'vip-oda', isVipRoom: true },
        ];

        // İstenen oda sayısına göre dinamik oda listesi oluştur
        const roomCount = data.roomCount || defaultRoomDefs.length;
        const roomsToCreate: { name: string; slug: string; isVipRoom?: boolean }[] = [
          ...defaultRoomDefs.slice(0, Math.min(roomCount, defaultRoomDefs.length)),
        ];
        // 4'ten fazla oda isteniyorsa dinamik olarak ekle
        for (let i = defaultRoomDefs.length + 1; i <= roomCount; i++) {
          roomsToCreate.push({ name: `Oda ${i}`, slug: `oda-${i}` });
        }

        const rooms: any[] = [];
        for (const rd of roomsToCreate) {
          const room = await tx.room.create({
            data: {
              tenantId: tenant.id,
              name: rd.name,
              slug: rd.slug,
              isVipRoom: rd.isVipRoom || false,
            },
          });
          rooms.push(room);
        }

        // C. Owner kullanıcı (müşteri sahibi)
        const ownerEmail = data.adminEmail || `admin@${data.domain}`;
        const ownerUser = await tx.user.create({
          data: {
            tenantId: tenant.id,
            displayName: 'admin',
            email: ownerEmail,
            role: 'owner',
            passwordHash: ownerHash,
          },
        });

        // D. Varsayılan SystemSettings — system tenant'ın logosunu kopyala
        const systemBranding = await tx.systemSettings.findUnique({
          where: { tenantId: 'system' },
          select: { logoUrl: true, logoName: true },
        });
        await tx.systemSettings.create({
          data: {
            tenantId: tenant.id,
            logoUrl: systemBranding?.logoUrl || null,
            logoName: systemBranding?.logoName || 'SopranoChat',
          },
        });

        // E. Audit Log
        await tx.auditLog.create({
          data: {
            tenantId: tenant.id,
            event: 'tenant.provision',
            adminId: ownerUser.id,
            adminIp,
            metadata: {
              tenantId: tenant.id,
              slug: tenant.slug,
              accessCode: tenant.accessCode,
              ownerEmail,
              roomCount: rooms.length,
            },
          },
        });

        return {
          tenant,
          defaultRooms: rooms,
          ownerUser,
        };
      });

      // Şifreleri response'ta döndür (plaintext — sadece oluşturma anında görüntülenir)
      return {
        ...result,
        ownerPassword,
      };
    } catch (error) {
      // NestJS istisnalarını olduğu gibi fırlat
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('[AdminService] provisionCustomer error:', error);
      throw new InternalServerErrorException(
        `Müşteri oluşturulurken hata: ${error.message || error}`,
      );
    }
  }

  async updateCustomer(
    adminId: string,
    tenantId: string,
    data: any,
    adminIp?: string,
  ) {
    console.log('[updateCustomer] START — tenantId:', tenantId, 'data:', JSON.stringify(data));

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Prevent duplicate slug if slug is being updated
    if (data.slug && data.slug !== tenant.slug) {
      const existing = await this.prisma.tenant.findUnique({
        where: { slug: data.slug },
      });
      if (existing) throw new ConflictException('Slug already taken');
    }

    // Helper to extract users if present
    const { users, isMeetingRoom, ...tenantData } = data;

    // Build update data — only include fields that are actually provided
    const updateData: any = {};
    if (tenantData.name !== undefined) updateData.name = tenantData.name;
    if (tenantData.displayName !== undefined) updateData.displayName = tenantData.displayName || null;
    if (tenantData.logoUrl !== undefined) updateData.logoUrl = tenantData.logoUrl || null;
    if (tenantData.domain !== undefined) updateData.domain = tenantData.domain;
    if (tenantData.slug !== undefined) updateData.slug = tenantData.slug;
    if (tenantData.roomLimit !== undefined) updateData.roomLimit = parseInt(tenantData.roomLimit);
    if (tenantData.userLimitPerRoom !== undefined) updateData.userLimitPerRoom = parseInt(tenantData.userLimitPerRoom);
    if (tenantData.status !== undefined) updateData.status = tenantData.status;
    if (tenantData.packageType !== undefined) updateData.packageType = tenantData.packageType;
    if (tenantData.billingPeriod !== undefined) updateData.billingPeriod = tenantData.billingPeriod;
    if (tenantData.expiresAt !== undefined) updateData.expiresAt = tenantData.expiresAt ? new Date(tenantData.expiresAt) : null;
    if (tenantData.price !== undefined) {
      const parsed = tenantData.price !== '' && tenantData.price !== null && tenantData.price !== undefined
        ? Number(tenantData.price)
        : null;
      updateData.price = (parsed !== null && !isNaN(parsed)) ? parsed : null;
    }
    if (tenantData.currency !== undefined) updateData.currency = tenantData.currency;
    if (tenantData.email !== undefined) updateData.email = tenantData.email || null;
    if (tenantData.phone !== undefined) updateData.phone = tenantData.phone || null;

    console.log('[updateCustomer] updateData:', JSON.stringify(updateData));

    let updated;
    try {
      updated = await this.prisma.tenant.update({
        where: { id: tenantId },
        data: updateData,
        include: {
          _count: { select: { rooms: true, users: true } },
          users: {
            where: { role: { in: ['owner', 'admin'] } },
            take: 1,
            orderBy: { createdAt: 'asc' },
            select: { email: true, displayName: true, id: true, role: true },
          },
        },
      });
      console.log('[updateCustomer] Prisma update OK');

      // ═══ roomLimit düşürüldüyse fazla odaları otomatik sil ═══
      if (updateData.roomLimit !== undefined) {
        const newLimit = updateData.roomLimit;
        // Toplantı odaları hariç mevcut odaları say
        const currentRooms = await this.prisma.room.findMany({
          where: { tenantId, isMeetingRoom: false, status: { not: 'CLOSED' } },
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true },
        });

        if (currentRooms.length > newLimit) {
          // En yeni (son oluşturulan) odaları sil — eski odalar korunur
          const roomsToDelete = currentRooms.slice(newLimit);
          const idsToDelete = roomsToDelete.map(r => r.id);

          // Önce bu odalardaki katılımcıları temizle
          await this.prisma.participant.deleteMany({
            where: { roomId: { in: idsToDelete } },
          });

          // Sonra odaları sil
          await this.prisma.room.deleteMany({
            where: { id: { in: idsToDelete } },
          });

          console.log(`[updateCustomer] roomLimit=${newLimit} → ${roomsToDelete.length} fazla oda silindi:`, roomsToDelete.map(r => r.name).join(', '));
        }
      }
    } catch (e) {
      console.error('[updateCustomer] Prisma update FAILED:', e);
      throw e;
    }

    // Toggle meeting room feature for tenant
    if (typeof isMeetingRoom === 'boolean') {
      if (isMeetingRoom) {
        // ON: Create a hidden staff-meeting room if not exists
        const existingMeeting = await this.prisma.room.findFirst({
          where: { tenantId, slug: 'staff-meeting' },
        });
        if (!existingMeeting) {
          await this.prisma.room.create({
            data: {
              name: 'Toplantı Odası',
              slug: 'staff-meeting',
              tenantId,
              isMeetingRoom: true,
              maxParticipants: 50,
            },
          });
        } else if (!existingMeeting.isMeetingRoom) {
          await this.prisma.room.update({
            where: { id: existingMeeting.id },
            data: { isMeetingRoom: true },
          });
        }
      } else {
        // OFF: Delete the staff-meeting room entirely
        await this.prisma.room.deleteMany({
          where: { tenantId, slug: 'staff-meeting' },
        });
      }
    }

    // If user data is provided, update the admin user
    if (users && Array.isArray(users) && users.length > 0) {
      const userData = users[0];
      if (userData.displayName || userData.email) {
        const adminUser = await this.prisma.user.findFirst({
          where: { tenantId, role: { in: ['owner', 'admin'] } },
          orderBy: { createdAt: 'asc' },
        });

        if (adminUser) {
          await this.prisma.user.update({
            where: { id: adminUser.id },
            data: {
              displayName: userData.displayName,
              email: userData.email,
            },
          });
        }
      }
    }

    try {
      await this.createAuditLog({
        tenantId: tenant.id,
        event: 'tenant.update',
        adminId,
        adminIp,
        metadata: { changes: data },
      });
    } catch (e) {
      console.warn('[updateCustomer] Audit log skipped:', e?.message || e);
    }

    // Add isMeetingRoom flag from rooms
    const meetingRoomExists = await this.prisma.room.findFirst({
      where: { tenantId, isMeetingRoom: true },
      select: { id: true },
    });

    return { ...updated, isMeetingRoom: !!meetingRoomExists };
  }

  async toggleCustomerStatus(tenantId: string, status: string) {
    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: status as any },
    });

    // Gerçek zamanlı bildirim: tenant'ın tüm odalarındaki kullanıcılara event gönder
    try {
      const rooms = await this.prisma.room.findMany({
        where: { tenantId },
        select: { slug: true },
      });
      const server = this.chatGateway.server;
      if (server) {
        for (const room of rooms) {
          server.to(room.slug).emit('tenant:statusChanged', {
            tenantId,
            status,
            tenantName: updated.name,
          });
        }
        this.chatGateway['logger'].log(
          `[toggleCustomerStatus] Emitted tenant:statusChanged to ${rooms.length} rooms for tenant ${tenantId} -> ${status}`,
        );
      }
    } catch (e) {
      console.warn('[toggleCustomerStatus] Socket emit failed:', e?.message);
    }

    return updated;
  }

  async getCustomerRooms(tenantId: string) {
    return this.prisma.room.findMany({
      where: { tenantId },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCustomerMembers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, role: { not: 'guest' } },
      select: {
        id: true,
        displayName: true,
        email: true,
        gender: true,
        role: true,
        isOnline: true,
        isPremium: true,
        isBanned: true,
        banExpiresAt: true,
        lastLoginAt: true,
        lastSeenAt: true,
        lastLoginIp: true,
        ipAddress: true,
        loginCount: true,
        balance: true,
        nameColor: true,
        avatarUrl: true,
        profilePicture: true,
        deviceInfo: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Hedef tenant'ta GodMaster kullanıcısı oluşturur/bulur ve JWT döndürür.
   * Her giriş denemesinde yeni karmaşık şifre üretir (güvenlik).
   * GodMaster görünmez (hidden) modda giriş yapar.
   */
  async generateGodmasterToken(tenantId: string) {
    // 1. Tenant'ı bul
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true, name: true },
    });
    if (!tenant) throw new NotFoundException('Tenant bulunamadı');

    // 2. Her seferinde yeni karmaşık şifre üret (48 karakter, kriptografik)
    const crypto = require('crypto');
    const randomPassword = crypto.randomBytes(36).toString('base64url');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // 3. Bu tenant'ta godmaster kullanıcı var mı?
    let godmaster = await this.prisma.user.findFirst({
      where: { tenantId, role: 'godmaster' },
    });

    // 4. Yoksa oluştur, varsa şifresini güncelle
    if (!godmaster) {
      godmaster = await this.prisma.user.create({
        data: {
          tenantId,
          displayName: 'GodMaster',
          email: `godmaster@${tenant.slug}.system`,
          role: 'godmaster',
          passwordHash: hashedPassword,
        },
      });
    } else {
      // Her girişte şifreyi yenile — tek kullanımlık güvenlik
      godmaster = await this.prisma.user.update({
        where: { id: godmaster.id },
        data: { passwordHash: hashedPassword },
      });
    }

    // 5. JWT oluştur
    const jwtPayload = {
      username: godmaster.email,
      sub: godmaster.id,
      tenantId: tenant.id,
      displayName: godmaster.displayName,
      role: 'godmaster',
      isMember: true,
      nameColor: godmaster.nameColor || null,
      initialStatus: 'godmaster-hidden',
    };

    const access_token = this.jwtService.sign(jwtPayload);

    return {
      access_token,
      slug: tenant.slug,
      tenantName: tenant.name,
      user: {
        id: godmaster.id,
        displayName: godmaster.displayName,
        role: 'godmaster',
        avatar: godmaster.avatarUrl || null,
      },
    };
  }

  async deleteCustomer(adminId: string, tenantId: string, adminIp?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Protect system tenant
    if (tenant.slug === 'system' || tenant.slug === 'default') {
      throw new ForbiddenException('Sistem tenant silinemez.');
    }

    // Cascade delete is handled by Prisma schema (onDelete: Cascade)
    await this.prisma.tenant.delete({ where: { id: tenantId } });

    return { success: true, deletedTenant: tenant.name };
  }

  async sendPaymentReminder(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Update paymentReminderAt
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { paymentReminderAt: new Date() },
    });

    // Emit to all online owner sockets of this tenant via ChatGateway
    const server = this.chatGateway.server;
    if (server) {
      const allSockets = await server.fetchSockets();
      for (const s of allSockets) {
        const user = (s as any).data?.user;
        if (user && user.tenantId === tenantId && (user.role === 'owner' || user.role === 'admin')) {
          s.emit('payment:reminder', {
            tenantName: tenant.name,
            message: `Sayın ${tenant.name}, ödeme süreniz yaklaşmaktadır. Lütfen ödemenizi gerçekleştiriniz.`,
            sentAt: new Date().toISOString(),
          });
        }
      }
    }

    return { success: true, tenantName: tenant.name };
  }

  async sendAnnouncement(tenantId: string, message: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // DB'ye kaydet
    const announcement = await this.prisma.announcement.create({
      data: {
        tenantId,
        message,
      },
    });

    // Emit to ALL online owner/admin/superadmin sockets (tüm tenant'lara)
    const server = this.chatGateway.server;
    if (server) {
      const allSockets = await server.fetchSockets();
      for (const s of allSockets) {
        const user = (s as any).data?.user;
        if (user && ['owner', 'admin', 'superadmin'].includes(user.role)) {
          s.emit('tenant:announcement', {
            id: announcement.id,
            message: announcement.message,
            createdAt: announcement.createdAt.toISOString(),
          });
        }
      }
    }

    return { success: true, id: announcement.id };
  }

  async getAdminStats() {
    // Anlık online kullanıcı sayısı (socket üzerinden)
    let onlineCount = 0;
    let activeSpeakers = 0;
    let activeRooms = 0;
    const roomUserCounts: Record<string, number> = {};

    const server = this.chatGateway.server;
    if (server) {
      const allSockets = await server.fetchSockets();
      onlineCount = allSockets.length;

      // Konuşan kişi sayısı (roomSpeakers map'inden)
      const roomSpeakersMap = (this.chatGateway as any).roomSpeakers;
      if (roomSpeakersMap) {
        activeSpeakers = roomSpeakersMap.size;
      }

      // Participants map'inden oda ve kullanıcı bilgileri
      const participantsMap = (this.chatGateway as any).participants;
      if (participantsMap) {
        const roomSet = new Set<string>();
        for (const [, p] of participantsMap) {
          if (p.roomId) {
            roomSet.add(p.roomId);
            roomUserCounts[p.roomId] = (roomUserCounts[p.roomId] || 0) + 1;
          }
        }
        activeRooms = roomSet.size;
      }
    }

    // Ödeme durumu — son 24 saat içinde hatırlatma gönderilmiş tenant'lar
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const paymentDueCount = await this.prisma.tenant.count({
      where: {
        paymentReminderAt: { gte: twentyFourHoursAgo },
      },
    });

    // Sistem metrikleri
    const memUsage = process.memoryUsage();
    const uptimeSeconds = process.uptime();

    // Son sistem logları (son 10 adet)
    let recentLogs: any[] = [];
    try {
      recentLogs = await this.prisma.auditLog.findMany({
        where: { tenantId: 'system' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          event: true,
          metadata: true,
          createdAt: true,
          adminId: true,
        },
      });
    } catch { /* audit_log table might not exist yet */ }

    return {
      onlineUsers: onlineCount,
      activeSpeakers,
      activeRooms,
      paymentDue: paymentDueCount,
      system: {
        uptimeSeconds: Math.floor(uptimeSeconds),
        memoryMB: Math.round(memUsage.rss / 1024 / 1024),
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        cpuUsage: process.cpuUsage(),
      },
      roomUserCounts,
      recentLogs,
    };
  }

  async getRecentAnnouncements() {
    return this.prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, message: true, createdAt: true, tenantId: true },
    });
  }

  async deleteAnnouncement(id: string) {
    const ann = await this.prisma.announcement.findUnique({ where: { id } });
    if (!ann) throw new NotFoundException('Duyuru bulunamadı');
    await this.prisma.announcement.delete({ where: { id } });
    return { success: true };
  }

  async updateAnnouncement(id: string, message: string) {
    const ann = await this.prisma.announcement.findUnique({ where: { id } });
    if (!ann) throw new NotFoundException('Duyuru bulunamadı');
    const updated = await this.prisma.announcement.update({
      where: { id },
      data: { message },
      select: { id: true, message: true, createdAt: true, tenantId: true },
    });
    return updated;
  }

  async resetCustomerAdminPassword(
    adminId: string,
    tenantId: string,
    newPassword: string,
    adminIp?: string,
  ) {
    // 1. Find the admin user for this tenant (role: 'owner' or 'admin' created at provision)
    const adminUser = await this.prisma.user.findFirst({
      where: { tenantId, role: { in: ['owner', 'admin'] } },
      orderBy: { createdAt: 'asc' }, // usually the first one created
    });

    if (!adminUser) {
      throw new NotFoundException('No admin user found for this tenant.');
    }

    // 2. Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // 3. Update
    await this.prisma.user.update({
      where: { id: adminUser.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 }, // invalidate sessions
      },
    });

    // 4. Audit Log
    await this.createAuditLog({
      tenantId,
      event: 'tenant.admin_password_reset',
      adminId,
      targetUserId: adminUser.id,
      adminIp,
      metadata: { targetAdmin: adminUser.email },
    });

    return { success: true, ownerEmail: adminUser.email, ownerDisplayName: adminUser.displayName, newPassword };
  }

  async resetGodmasterPassword(
    adminId: string,
    tenantId: string,
    newPassword: string,
    adminIp?: string,
  ) {
    const gmUser = await this.prisma.user.findFirst({
      where: { tenantId, role: 'godmaster' },
    });

    if (!gmUser) {
      throw new NotFoundException('No GodMaster user found for this tenant.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: gmUser.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    });

    await this.createAuditLog({
      tenantId,
      event: 'tenant.godmaster_password_reset',
      adminId,
      targetUserId: gmUser.id,
      adminIp,
      metadata: { targetGodmaster: gmUser.email },
    });

    return { success: true, email: gmUser.email, displayName: gmUser.displayName, newPassword };
  }

  // ═══════════════════════════════════════════════════════════
  //  1) USERS TAB
  // ═══════════════════════════════════════════════════════════

  async getUsers(
    tenantId: string,
    filters?: { role?: string; search?: string; page?: number; limit?: number; requesterRole?: string },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    // GodMaster kullanıcıları sadece GodMaster görebilir
    if (filters?.requesterRole?.toLowerCase() !== 'godmaster') {
      where.role = filters?.role
        ? (filters.role.toLowerCase() === 'godmaster' ? '__impossible__' : filters.role)
        : { not: 'godmaster' };
    } else if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.search) {
      where.OR = [
        { displayName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          role: true,
          isOnline: true,
          isBanned: true,
          lastLoginAt: true,
          loginCount: true,
          lastLoginIp: true,
          gender: true,
          createdAt: true,
          permissions: true,
          balance: true,
          points: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  // ═══════════════════════════════════════════════════════════
  //  NEW MEMBER LIST ENDPOINT (REQUESTED)
  // ═══════════════════════════════════════════════════════════

  async getMembers(filters?: { q?: string; page?: number; limit?: number }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {}; // Fetch from ALL tenants or specific logic? Prompt implies global list for OwnerPanel on localhost:3000 (usually single tenant or system wide).
    // If it's the OwnerPanel (SaaS Owner), they might want to see ALL users or just the 'system' tenant users.
    // The prompt says "localhost:3000 ana sayfada (HomePage) register/login/guest ile oluşturulan kullanıcılar".
    // These usually go to a default tenant.
    // I will assume we search across all users for now, or use the tenant logic if clear.
    // Given this is "OwnerPanel" and "Members/Üyeler", likely system-wide or default tenant.
    // I will default to searching all users for the SuperAdmin/Owner view.

    if (filters?.q) {
      where.OR = [
        { id: { contains: filters.q, mode: 'insensitive' } },
        { email: { contains: filters.q, mode: 'insensitive' } },
        { displayName: { contains: filters.q, mode: 'insensitive' } },
        { username: { contains: filters.q, mode: 'insensitive' } }, // If username field exists, but schema usually has displayName. Prompt asked for 'username' in response.
        // Checking schema from getUsers select above: displayName is used.
        // I will map displayName to username in response as requested.
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      total,
      page,
      limit,
      items: users.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.displayName, // Mapping displayName -> username as requested
        avatar: u.avatarUrl,
        createdAt: u.createdAt.toISOString(),
      })),
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        bansReceived: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        participants: {
          where: { isActive: true },
          include: { room: { select: { id: true, name: true, slug: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, ...result } = user;
    return result;
  }

  async updateUser(
    adminId: string,
    targetUserId: string,
    data: {
      role?: string;
      displayName?: string;
      permissions?: any;
      avatarUrl?: string;
      email?: string;
      password?: string;
    },
    adminRole: string,
    adminIp?: string,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target) throw new NotFoundException('User not found');

    // ── Temel yetki kontrolü ──
    if (
      !can(adminRole, 'ctrl.users_global') ||
      !hasRole(adminRole, Role.Admin)
    ) {
      throw new ForbiddenException('Yetersiz yetki.');
    }

    const actorLevel = getRoleLevel(adminRole);
    const targetLevel = getRoleLevel(target.role);

    // GodMaster override — tüm kontrolleri atla
    if (adminRole.toLowerCase() !== 'godmaster') {
      // ── Kendini düzenlerken rol değiştiremez ──
      if (adminId === targetUserId && data.role && data.role !== target.role) {
        throw new ForbiddenException('Kendi rolünüzü değiştiremezsiniz.');
      }
      // ── Hiyerarşi: üst sınıfı düzenleyemez, aynı seviye düzenleyebilir ──
      if (adminId !== targetUserId && actorLevel < targetLevel) {
        throw new ForbiddenException('Üst sınıftaki kullanıcıları düzenleyemezsiniz.');
      }
      // ── Rol değişikliği: kendi seviyesine kadar (dahil) atayabilir ──
      if (data.role) {
        const newRoleLevel = getRoleLevel(data.role);
        if (newRoleLevel > actorLevel) {
          throw new ForbiddenException('Kendi sınıfınızdan üstünde bir rol atayamazsınız.');
        }
      }
    }

    // ── Owner limiti: en fazla 3 owner ──
    if (data.role?.toLowerCase() === 'owner' && target.role?.toLowerCase() !== 'owner') {
      const ownerCount = await this.prisma.user.count({
        where: { tenantId: target.tenantId, role: 'owner' },
      });
      if (ownerCount >= 3) {
        throw new ForbiddenException('En fazla 3 sahip (owner) olabilir.');
      }
    }

    const updateData: any = { ...data };
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      delete updateData.password;
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
    });

    // ─── Real-time Sync ───
    try {
      this.chatGateway.handleAdminUserUpdate(targetUserId, {
        displayName: updated.displayName,
        role: updated.role,
        avatarUrl: updated.avatarUrl,
        permissions: updated.permissions,
      });
    } catch (e) {
      console.error('Failed to sync with ChatGateway:', e);
    }
    const logData = { ...data };
    if (logData.password) logData.password = '***';

    await this.createAuditLog({
      tenantId: target.tenantId,
      event: 'user.update',
      adminId,
      targetUserId,
      adminIp,
      metadata: { changes: logData },
    });

    return updated;
  }

  async deleteUser(adminId: string, targetUserId: string, adminIp?: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target) throw new NotFoundException('User not found');

    // ★ KORUMA — GodMaster koruma ★
    // GodMaster kullanıcısı asla silinemez (kendisi dahil)
    if (target.role?.toLowerCase() === 'godmaster') {
      throw new ForbiddenException('Bu kullanıcı silinemez.');
    }

    // ── Kendini silemez ──
    if (target.id === adminId) {
      throw new ConflictException('Kendinizi silemezsiniz.');
    }

    // ── Hiyerarşi kontrolü ──
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin) throw new ForbiddenException('Yetki yok.');

    // GodMaster herkesi silebilir (owner, superadmin dahil)
    if (admin.role?.toLowerCase() !== 'godmaster') {
      // GodMaster olmayan adminler için: kritik roller koruması
      const protectedRoles = ['owner', 'superadmin'];
      if (protectedRoles.includes(target.role?.toLowerCase())) {
        throw new ForbiddenException('Bu kullanıcı silinemez.');
      }

      const actorLevel = getRoleLevel(admin.role);
      const targetLevel = getRoleLevel(target.role);
      // Aynı seviye silebilir (owner→owner), üst seviye silemez
      if (actorLevel < targetLevel) {
        throw new ForbiddenException('Üst sınıftaki kullanıcıları silemezsiniz.');
      }
    }

    await this.prisma.user.delete({ where: { id: targetUserId } });

    await this.createAuditLog({
      tenantId: target.tenantId,
      event: 'user.delete',
      adminId,
      targetUserId: null, // User is deleted, cannot reference
      adminIp,
      metadata: {
        displayName: target.displayName,
        email: target.email,
        deletedUserId: targetUserId,
      },
    });

    return { success: true };
  }

  // ═══════════ User Balance Management ═══════════
  async updateUserBalance(
    adminId: string,
    targetUserId: string,
    amount: number,
    operation: 'add' | 'subtract' | 'set',
    adminIp?: string,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, tenantId: true, balance: true, displayName: true },
    });
    if (!target) throw new NotFoundException('Kullanıcı bulunamadı.');

    if (amount < 0) throw new BadRequestException('Miktar negatif olamaz.');

    let newBalance: number;
    const currentBalance = Number(target.balance);

    switch (operation) {
      case 'add':
        newBalance = currentBalance + amount;
        break;
      case 'subtract':
        newBalance = currentBalance - amount;
        if (newBalance < 0) newBalance = 0;
        break;
      case 'set':
        newBalance = amount;
        break;
      default:
        throw new BadRequestException('Geçersiz işlem tipi.');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { balance: newBalance },
      select: { id: true, displayName: true, balance: true, points: true },
    });

    await this.createAuditLog({
      tenantId: target.tenantId,
      event: 'user.balance_update',
      adminId,
      targetUserId,
      adminIp,
      metadata: {
        operation,
        amount,
        previousBalance: currentBalance,
        newBalance,
        targetName: target.displayName,
      },
    });

    // Real-time bakiye güncellemesi — kullanıcı online ise bilgilendir
    try {
      const server = this.chatGateway.server;
      if (server) {
        const allSockets = await server.fetchSockets();
        for (const s of allSockets) {
          const userData = (s as any).data?.user;
          if (userData?.sub === targetUserId) {
            s.emit('gift:balance', {
              balance: Number(updated.balance),
              points: updated.points || 0,
            });
          }
        }
      }
    } catch (e) {
      console.error('Failed to emit balance update:', e);
    }

    return {
      success: true,
      balance: Number(updated.balance),
      points: updated.points,
      displayName: updated.displayName,
    };
  }

  async createMember(tenantId: string, data: any) {
    const username = data.displayName || data.username;
    if (!username) throw new BadRequestException('Kullanıcı adı gerekli');

    // E-posta kontrolü — sadece email varsa kontrol et
    const whereConditions: any[] = [{ displayName: username }];
    if (data.email) whereConditions.push({ email: data.email });

    const existing = await this.prisma.user.findFirst({
      where: {
        tenantId,
        OR: whereConditions,
      },
    });

    if (existing) {
      throw new ConflictException('Bu kullanıcı adı veya e-posta zaten kayıtlı');
    }

    // ── Owner limiti: en fazla 3 owner ──
    if ((data.role || 'member').toLowerCase() === 'owner') {
      const ownerCount = await this.prisma.user.count({
        where: { tenantId, role: 'owner' },
      });
      if (ownerCount >= 3) {
        throw new ForbiddenException('En fazla 3 sahip (owner) olabilir.');
      }
    }

    // Şifre: varsa kullan, yoksa rastgele üret
    const rawPassword = data.password || require('crypto').randomBytes(12).toString('base64url');
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const avatarUrl =
<<<<<<< HEAD
      data.avatar ||
      `/avatars/neutral_1.png`;
=======
      data.avatar || undefined;
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        displayName: username,
        email: data.email || null,
        passwordHash: hashedPassword,
        avatarUrl,
        role: data.role || 'member',
        isOnline: false,
      },
    });

    return user;
  }

  async resetUserPassword(
    adminId: string,
    targetUserId: string,
    newPasswordHash: string,
    adminIp?: string,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target) throw new NotFoundException('User not found');

    // ── Hiyerarşi kontrolü: üst veya eşit sınıfın şifresini değiştiremez ──
    const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
    if (!admin) throw new ForbiddenException('Yetki yok.');
    const actorLevel = getRoleLevel(admin.role);
    const targetLevel = getRoleLevel(target.role);
    if (actorLevel <= targetLevel) {
      throw new ForbiddenException('Kendi sınıfınız veya üstündeki kullanıcıların şifresini değiştiremezsiniz.');
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { passwordHash: newPasswordHash },
    });

    await this.createAuditLog({
      tenantId: target.tenantId,
      event: 'user.password_reset',
      adminId,
      targetUserId,
      adminIp,
    });

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  //  2) ROOMS TAB
  // ═══════════════════════════════════════════════════════════

  async getRooms(tenantId: string) {
    const rooms = await this.prisma.room.findMany({
      where: { tenantId, isMeetingRoom: false },
      orderBy: { createdAt: 'asc' },
    });

    // ★ In-memory participant Map'ten gerçek çevrimiçi sayısını hesapla
    // DB _count yerine socket bağlantılarını sayıyoruz — daha güvenilir
    const participantsMap: Map<string, any> = (this.chatGateway as any).participants;
    const roomOnlineCounts = new Map<string, number>();
    if (participantsMap) {
      for (const [, p] of participantsMap) {
        const slug = p.roomSlug;
        if (slug) {
          roomOnlineCounts.set(slug, (roomOnlineCounts.get(slug) || 0) + 1);
        }
      }
    }

    return rooms.map(room => ({
      ...room,
      _count: { participants: roomOnlineCounts.get(room.slug) || 0 },
    }));
  }

  async createRoom(
    adminId: string,
    tenantId: string,
    data: {
      name: string;
      slug?: string;
      password?: string;
      announcement?: string;
      maxParticipants?: number;
    },
    adminIp?: string,
  ) {
    const slug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-');
    const room = await this.prisma.room.create({
      data: {
        tenantId,
        name: data.name,
        slug,
        password: data.password || null,
        announcement: data.announcement || null,
        maxParticipants: data.maxParticipants || null,
      },
    });

    await this.createAuditLog({
      tenantId,
      event: 'room.create',
      adminId,
      adminIp,
      metadata: { roomId: room.id, name: room.name },
    });

    return room;
  }

  async updateRoom(
    adminId: string,
    roomId: string,
    data: {
      name?: string;
      password?: string | null;
      announcement?: string | null;
      isLocked?: boolean;
      maxParticipants?: number | null;
      themeId?: string;
      isMeetingRoom?: boolean;
      isVipRoom?: boolean;
      isCameraAllowed?: boolean;
      isPublic?: boolean;
      micLimit?: number | null;
      cameraLimit?: number | null;
      buttonColor?: string | null;
      metadata?: any;
      status?: string;
    },
    adminIp?: string,
  ) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    // null değerleri DB'de temizlemek için koruma
    const updateData: any = { ...data };
    if (data.password === null) updateData.password = null;
    if (data.announcement === null) updateData.announcement = null;
    if (data.maxParticipants === null) updateData.maxParticipants = null;
    if (data.micLimit === null) updateData.micLimit = null;
    if (data.cameraLimit === null) updateData.cameraLimit = null;

    const updated = await this.prisma.room.update({
      where: { id: roomId },
      data: updateData,
    });

    // ─── Real-time broadcast to room participants ───
    try {
      // Socket.IO rooms are named by slug, not UUID
      this.chatGateway.server.to(updated.slug).emit('room:settings-updated', {
        roomId: updated.id,
        name: updated.name,
        isLocked: updated.isLocked,
        isPublic: updated.isPublic,
        isVipRoom: updated.isVipRoom,
        isMeetingRoom: updated.isMeetingRoom,
        isCameraAllowed: updated.isCameraAllowed,
        announcement: updated.announcement || null,
        maxParticipants: updated.maxParticipants,
        micLimit: updated.micLimit,
        cameraLimit: updated.cameraLimit,
        hasPassword: !!(updated.password && updated.password.trim()),
        themeId: updated.themeId || null,
        metadata: updated.metadata || null,
      });
    } catch (e) {
      console.error('Failed to broadcast room settings:', e);
    }

    await this.createAuditLog({
      tenantId: room.tenantId,
      event: 'room.update',
      adminId,
      adminIp,
      metadata: { roomId: room.id, changes: data },
    });

    return updated;
  }

  async deleteRoom(adminId: string, roomId: string, adminIp?: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    await this.prisma.room.delete({ where: { id: roomId } });

    await this.createAuditLog({
      tenantId: room.tenantId,
      event: 'room.delete',
      adminId,
      adminIp,
      metadata: { roomId, name: room.name },
    });

    return { success: true };
  }

  async closeRoom(adminId: string, roomId: string, adminIp?: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    // "Close" means lock it so no one can join
    await this.prisma.room.update({
      where: { id: roomId },
      data: { isLocked: true },
    });

    await this.createAuditLog({
      tenantId: room.tenantId,
      event: 'room.close',
      adminId,
      adminIp,
      metadata: { roomId, name: room.name },
    });

    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  //  3) BANS TAB
  // ═══════════════════════════════════════════════════════════

  private calculateExpiry(duration: BanDuration): Date | null {
    const now = new Date();
    switch (duration) {
      case BanDuration.ONE_DAY:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case BanDuration.ONE_WEEK:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case BanDuration.ONE_MONTH:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case BanDuration.PERMANENT:
        return null;
      default:
        return null;
    }
  }

  async getBans(
    tenantId: string,
    filters?: { type?: BanType; active?: boolean },
  ) {
    const where: any = { tenantId };
    if (filters?.type) where.type = filters.type;
    if (filters?.active !== undefined) where.isActive = filters.active;

    return this.prisma.banLog.findMany({
      where,
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        admin: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBan(
    adminId: string,
    tenantId: string,
    data: {
      userId: string;
      type?: BanType;
      duration?: BanDuration;
      reason?: string;
      ip?: string;
    },
    adminIp?: string,
  ) {
    const type = data.type || BanType.BAN;
    const duration = data.duration || BanDuration.PERMANENT;
    const expiresAt = this.calculateExpiry(duration);

    // ★ GODMASTER KORUMA BARİYERİ — GodMaster kullanıcısı ASLA banlanamaz ★
    try {
      const targetUser = await this.prisma.user.findUnique({ where: { id: data.userId }, select: { role: true } });
      if (targetUser?.role?.toLowerCase() === 'godmaster') {
        console.warn(`[GODMASTER PROTECTION] Attempted to ban GodMaster user ${data.userId} — BLOCKED`);
        throw new Error('GodMaster kullanıcısı banlanamaz.');
      }
    } catch (e) {
      if (e.message.includes('GodMaster')) throw e;
      // DB hatası — devam et ama güvenlik log'u bırak
      console.error(`[GODMASTER CHECK] Error checking target role: ${e.message}`);
    }

    const ban = await this.prisma.banLog.create({
      data: {
        tenantId,
        userId: data.userId,
        adminId,
        type,
        duration,
        reason: data.reason,
        ip: data.ip,
        expiresAt,
      },
    });

    // Update user's banned status (skip for guest users — no DB record)
    if (type === BanType.BAN && !data.userId.startsWith('guest_')) {
      await this.prisma.user.update({
        where: { id: data.userId },
        data: { isBanned: true, banExpiresAt: expiresAt },
      });
    }

    await this.createAuditLog({
      tenantId,
      event: type === BanType.BAN ? 'user.ban' : 'user.gag',
      adminId,
      targetUserId: data.userId,
      ip: data.ip,
      adminIp,
      metadata: { duration, reason: data.reason },
    });

    return ban;
  }

  async removeBan(adminId: string, banId: string, adminIp?: string) {
    const ban = await this.prisma.banLog.findUnique({ where: { id: banId } });
    if (!ban) throw new NotFoundException('Ban not found');

    // ★ SELF-UNBAN PREVENTION — Kullanıcı kendi banını kaldıramaz
    if (ban.userId === adminId) {
      throw new ForbiddenException('Kendi banınızı kaldıramazsınız.');
    }

    await this.prisma.banLog.update({
      where: { id: banId },
      data: { isActive: false, liftedAt: new Date(), liftedBy: adminId },
    });

    // Check if user has other active bans
    const otherActiveBans = await this.prisma.banLog.count({
      where: {
        userId: ban.userId,
        isActive: true,
        type: BanType.BAN,
        id: { not: banId },
      },
    });

    if (otherActiveBans === 0) {
      await this.prisma.user.update({
        where: { id: ban.userId },
        data: { isBanned: false, banExpiresAt: null },
      });
    }

    await this.createAuditLog({
      tenantId: ban.tenantId,
      event: 'user.unban',
      adminId,
      targetUserId: ban.userId,
      adminIp,
      metadata: { banId },
    });

    return { success: true };
  }

  async removeAllActiveBansForUser(
    adminId: string,
    userId: string,
    tenantId: string,
    adminIp?: string,
  ) {
    const activeBans = await this.prisma.banLog.findMany({
      where: {
        userId,
        tenantId,
        isActive: true,
        type: BanType.BAN,
      },
    });

    for (const ban of activeBans) {
      await this.removeBan(adminId, ban.id, adminIp);
    }

    return { success: true, liftedCount: activeBans.length };
  }

  /**
   * Check if a user has an active ban. Auto-removes expired bans.
   * ★ GodMaster ASLA banlı değildir — mevcut banları otomatik temizler ★
   */
  async checkActiveBan(userId: string) {
    // ★ GODMASTER KORUMA — Eğer bu kullanıcı GodMaster ise banını otomatik temizle
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role?.toLowerCase() === 'godmaster') {
        // Mevcut banları otomatik temizle
        await this.prisma.banLog.updateMany({
          where: { userId, isActive: true },
          data: { isActive: false, liftedAt: new Date() },
        });
        await this.prisma.user.update({
          where: { id: userId },
          data: { isBanned: false, banExpiresAt: null },
        });
        return null; // GodMaster ASLA banlı değildir
      }
    } catch (e) {
      // DB hatası — yine de null dön (GodMaster güvenliği)
    }

    const activeBan = await this.prisma.banLog.findFirst({
      where: {
        userId,
        isActive: true,
        type: BanType.BAN,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeBan) return null;

    // Auto-clean expired bans
    if (activeBan.expiresAt && activeBan.expiresAt < new Date()) {
      await this.prisma.banLog.update({
        where: { id: activeBan.id },
        data: { isActive: false, liftedAt: new Date() },
      });
      await this.prisma.user.update({
        where: { id: userId },
        data: { isBanned: false, banExpiresAt: null },
      });
      return null; // Ban expired
    }

    return activeBan; // Still active
  }

  // ═══════════════════════════════════════════════════════════
  //  4) IP BANS TAB
  // ═══════════════════════════════════════════════════════════

  async getIpBans(tenantId: string) {
    return this.prisma.ipBan.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createIpBan(
    adminId: string,
    tenantId: string,
    data: { ip: string; reason?: string },
    adminIp?: string,
  ) {
    const ipBan = await this.prisma.ipBan.create({
      data: {
        tenantId,
        ip: data.ip,
        reason: data.reason,
        bannedBy: adminId,
      },
    });

    await this.createAuditLog({
      tenantId,
      event: 'ip.ban',
      adminId,
      adminIp,
      metadata: { ip: data.ip, reason: data.reason },
    });

    return ipBan;
  }

  async removeIpBan(adminId: string, banId: string, adminIp?: string) {
    const ban = await this.prisma.ipBan.findUnique({ where: { id: banId } });
    if (!ban) throw new NotFoundException('IP Ban not found');

    await this.prisma.ipBan.delete({ where: { id: banId } });

    await this.createAuditLog({
      tenantId: ban.tenantId,
      event: 'ip.unban',
      adminId,
      adminIp,
      metadata: { ip: ban.ip },
    });

    return { success: true };
  }

  async checkIpBanned(tenantId: string, ip: string): Promise<boolean> {
    const ban = await this.prisma.ipBan.findUnique({
      where: { tenantId_ip: { tenantId, ip } },
    });
    if (ban) {
      await this.prisma.ipBan.update({
        where: { id: ban.id },
        data: { hits: { increment: 1 }, lastHitAt: new Date() },
      });
      return true;
    }
    return false;
  }

  /**
   * Check if an IP has an active IP ban. Returns the ban object or null.
   * Used by chat gateway to block banned guests from reconnecting.
   */
  async checkActiveIpBan(ip: string, tenantId?: string) {
    const where: any = { ip };
    if (tenantId) where.tenantId = tenantId;

    const ban = await this.prisma.ipBan.findFirst({ where });
    if (ban) {
      // Increment hit counter
      await this.prisma.ipBan.update({
        where: { id: ban.id },
        data: { hits: { increment: 1 }, lastHitAt: new Date() },
      });
    }
    return ban;
  }

  // ═══════════════════════════════════════════════════════════
  //  5) AUDIT LOGS TAB
  // ═══════════════════════════════════════════════════════════

  async getAuditLogs(
    tenantId: string,
    filters?: {
      event?: string;
      adminId?: string;
      userId?: string;
      page?: number;
      limit?: number;
      excludeSystemEvents?: boolean;
    },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 100;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (filters?.event) where.event = filters.event;
    if (filters?.adminId) where.adminId = filters.adminId;
    // userId: kullanıcının hem hedef hem aktör olduğu tüm loglar
    if (filters?.userId) {
      where.OR = [
        { targetUserId: filters.userId },
        { adminId: filters.userId },
      ];
    }
    // Sistem seviye eventlerini hariç tut (tenant.update, tenant.admin_password_reset vb.)
    if (filters?.excludeSystemEvents && !filters?.event) {
      where.event = { not: { startsWith: 'tenant.' } };
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { id: true, displayName: true } },
          targetUser: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  // ═══════════════════════════════════════════════════════════
  //  SYSTEM LOGS (tenant.* events — owner panel)
  // ═══════════════════════════════════════════════════════════

  async getSystemLogs(
    tenantId: string,
    filters?: { event?: string; page?: number; limit?: number },
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 25;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };

    // Belirli bir event filtresi varsa onu kullan, yoksa tümünü getir
    if (filters?.event) {
      where.event = { startsWith: filters.event };
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: { select: { id: true, displayName: true } },
          targetUser: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  // ═══════════════════════════════════════════════════════════
  //  SEED TEST DATA
  // ═══════════════════════════════════════════════════════════

  async seedTestData() {
    console.log('🌱 Starting seed via Service...');

    // 1. Get or Create Tenant
    let tenant = await this.prisma.tenant.findFirst();
    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: {
          name: 'Soprano Test',
          slug: 'soprano-test',
          apiKey: 'test-api-key',
          apiSecret: 'test-secret',
        },
      });
      console.log('✅ Created Tenant:', tenant.name);
    } else {
      console.log('ℹ️ Using existing Tenant:', tenant.name);
    }

    const tenantId = tenant.id;
    const passwordHash = await bcrypt.hash('testpass123', 10);

    // 2. Upsert Users
    const users = [
      {
        username: 'ownertest',
        email: 'owner@test.com',
        role: 'owner',
        status: 'active',
        isBanned: false,
      },
      {
        username: 'normaluser',
        email: 'user@test.com',
        role: 'member',
        status: 'active',
        isBanned: false,
      },
      {
        username: 'moduser',
        email: 'mod@test.com',
        role: 'moderator',
        status: 'active',
        isBanned: false,
      },
      {
        username: 'vipuser',
        email: 'vip@test.com',
        role: 'vip',
        status: 'active',
        isBanned: false,
      },
      {
        username: 'banneduser',
        email: 'banned@test.com',
        role: 'member',
        status: 'banned',
        isBanned: true,
      },
    ];

    const createdUsers: any = {};

    for (const u of users) {
      const user = await this.prisma.user.upsert({
        where: { tenantId_email: { tenantId, email: u.email } },
        update: {
          role: u.role,
          isBanned: u.isBanned,
          passwordHash,
          displayName: u.username,
        },
        create: {
          tenantId,
          email: u.email,
          displayName: u.username,
          role: u.role,
          passwordHash,
          isBanned: u.isBanned,
          isOnline: false,
        },
      });
      createdUsers[u.username] = user;
      console.log(`👤 Upserted User: ${u.username} (${u.role})`);
    }

    // 3. Upsert Rooms
    const rooms = [
      {
        name: 'Test Public Room',
        slug: 'test-public-room',
        description: 'Public test room',
        ownerUsername: 'normaluser',
        isPublic: true,
        maxUsers: 50,
        password: null,
        roomType: 'free',
      },
      {
        name: 'Test Private Room',
        slug: 'test-private-room',
        description: 'Private test room',
        ownerUsername: 'normaluser',
        isPublic: false,
        maxUsers: 20,
        password: 'testpass123',
        roomType: 'free',
      },
      {
        name: 'VIP Room',
        slug: 'vip-room',
        description: 'VIP only room',
        ownerUsername: 'vipuser',
        isPublic: true,
        maxUsers: 30,
        password: null,
        roomType: 'vip',
      },
    ];

    for (const r of rooms) {
      const owner = createdUsers[r.ownerUsername];
      if (!owner) {
        console.warn(
          `⚠️  Owner not found for room ${r.name}: ${r.ownerUsername}`,
        );
        continue;
      }

      await this.prisma.room.upsert({
        where: { tenantId_slug: { tenantId, slug: r.slug } },
        update: {
          name: r.name,
          description: r.description,
          ownerId: owner.id,
          isPublic: r.isPublic,
          password: r.password,
          maxParticipants: r.maxUsers,
          roomType: r.roomType,
        },
        create: {
          tenantId,
          name: r.name,
          slug: r.slug,
          description: r.description,
          ownerId: owner.id,
          isPublic: r.isPublic,
          password: r.password,
          maxParticipants: r.maxUsers,
          roomType: r.roomType,
        },
      });
      console.log(`🏠 Upserted Room: ${r.name}`);
    }

    return { success: true, message: 'Seed completed' };
  }

  // ═══════════════════════════════════════════════════════════
  //  6) WORD FILTERS TAB
  // ═══════════════════════════════════════════════════════════

  async getWordFilters(tenantId: string) {
    return this.prisma.wordFilter.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWordFilter(
    adminId: string,
    tenantId: string,
    data: { badWord: string; replacement?: string },
    adminIp?: string,
  ) {
    const filter = await this.prisma.wordFilter.create({
      data: {
        tenantId,
        badWord: data.badWord.toLowerCase(),
        replacement: data.replacement || '***',
      },
    });

    await this.createAuditLog({
      tenantId,
      event: 'wordfilter.add',
      adminId,
      adminIp,
      metadata: { badWord: data.badWord },
    });

    return filter;
  }

  async removeWordFilter(adminId: string, filterId: string, adminIp?: string) {
    const filter = await this.prisma.wordFilter.findUnique({
      where: { id: filterId },
    });
    if (!filter) throw new NotFoundException('Word filter not found');

    await this.prisma.wordFilter.delete({ where: { id: filterId } });

    await this.createAuditLog({
      tenantId: filter.tenantId,
      event: 'wordfilter.remove',
      adminId,
      adminIp,
      metadata: { badWord: filter.badWord },
    });

    return { success: true };
  }

  /**
   * Filter chat message content through word filters.
   */
  async filterMessage(tenantId: string, content: string): Promise<string> {
    const filters = await this.prisma.wordFilter.findMany({
      where: { tenantId },
    });
    let filtered = content;
    for (const f of filters) {
      const regex = new RegExp(
        f.badWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'gi',
      );
      filtered = filtered.replace(regex, f.replacement);
    }
    return filtered;
  }

  // ═══════════════════════════════════════════════════════════
  //  7) SYSTEM SETTINGS TAB
  // ═══════════════════════════════════════════════════════════

  /**
   * Find the default tenant by slug ('default' or 'guest')
   */
  async findDefaultTenant() {
    let tenant = await this.prisma.tenant.findFirst({
      where: { slug: 'default' },
    });
    if (!tenant) {
      tenant = await this.prisma.tenant.findFirst({ where: { slug: 'guest' } });
    }
    return tenant;
  }

  async getSettings(tenantId: string) {
    let settings = await this.prisma.systemSettings.findUnique({
      where: { tenantId },
      include: { tenant: { select: { packageType: true } } },
    });

    if (!settings) {
      // Create default settings
      settings = await this.prisma.systemSettings.create({
        data: { tenantId },
        include: { tenant: { select: { packageType: true } } },
      });
    }

    // Check if tenant has any meeting room
    const hasMeetingRoom = await this.prisma.room.findFirst({
      where: { tenantId, isMeetingRoom: true },
      select: { id: true },
    });

    // Ensure guest permissions have proper defaults (for records created before these fields existed)
    return {
      ...settings,
      guestProfile: settings.guestProfile ?? true,
      guestPrivateMessage: settings.guestPrivateMessage ?? true,
      guestPrivateRoomInvite: settings.guestPrivateRoomInvite ?? false,
      guestCamera: settings.guestCamera ?? true,
      guestWebcam1v1: settings.guestWebcam1v1 ?? false,
      guestAnimation: settings.guestAnimation ?? false,
      multiLoginBlock: settings.multiLoginBlock ?? true,
      isMeetingRoom: !!hasMeetingRoom,
    };
  }

  /** Public — ana sayfa için branding + istatistik döndürür (auth gerektirmez) */
  async getPublicBranding() {
    const [settings, userCount, roomCount, messageCount] = await Promise.all([
      this.prisma.systemSettings.findFirst({
        where: { tenantId: 'system' },
        select: { logoUrl: true, logoName: true, siteConfig: true },
      }),
      this.prisma.user.count(),
      this.prisma.room.count(),
      this.prisma.message.count(),
    ]);

    // Gerçek zamanlı online kullanıcı sayısı (socket üzerinden)
    let onlineUsers = 0;
    try {
      const server = this.chatGateway.server;
      if (server) {
        const allSockets = await server.fetchSockets();
        onlineUsers = allSockets.length;
      }
    } catch { }

    const config = (settings?.siteConfig as any) || {};
    return {
      logoUrl: settings?.logoUrl || null,
      logoName: settings?.logoName || 'SopranoChat',
      stats: { userCount, roomCount, messageCount, onlineUsers },
      siteConfig: {
        pricing: config.pricing || null,
        banks: config.banks || null,
        contact: config.contact || null,
        siteTitle: config.siteTitle || null,
        siteSlogan: config.siteSlogan || null,
        footerText: config.footerText || null,
        roomConfig: config.roomConfig || null,
      },
    };
  }

  async updateSettings(
    adminId: string,
    tenantId: string,
    data: Record<string, any>,
    adminIp?: string,
  ) {
    // Only allow known SystemSettings fields — prevent unknown field errors
    const ALLOWED_KEYS = new Set([
      'welcomeMessage', 'micDuration', 'defaultLanguage',
      'micDurationGuest', 'micDurationMember', 'micDurationVip', 'micDurationAdmin',
      'banBlockEntry', 'forceOperatorIcon', 'blockHtmlColors', 'showRoomName',
      'adminAutoHdLock', 'antiFlood', 'antiFloodLimit', 'allowYoutube', 'multiLoginBlock',
      'blockVirtualMachine', 'duelEnabled', 'nudgeEnabled',
      'guestProfile', 'guestPrivateMessage', 'guestPrivateRoomInvite',
      'guestCamera', 'guestWebcam1v1', 'guestAnimation',
      'theme', 'primaryColor', 'accentColor', 'backgroundImage',
      'logoName', 'logoUrl', 'logoTextSize', 'logoTextColor', 'logoTextColor2',
      'logoPosition', 'logoImageSize', 'logoOffsetX', 'logoOffsetY', 'logoEffect',
      'textOffsetX', 'textOffsetY', 'textEffect',
      'allowedDomains',
      'rolePermissions',
      'siteConfig',
      'metadata',
    ]);

    const updateData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (ALLOWED_KEYS.has(key)) {
        updateData[key] = value;
      }
    }

    // id, tenantId, updatedAt gibi read-only alanları çıkar
    delete updateData['id'];
    delete updateData['tenantId'];
    delete updateData['updatedAt'];
    delete updateData['createdAt'];

    // Int alanları doğru tipe çevir (frontend string gönderebilir)
    const INT_FIELDS = ['logoImageSize', 'micDuration', 'micDurationGuest', 'micDurationMember', 'micDurationVip', 'micDurationAdmin', 'antiFloodLimit', 'logoOffsetX', 'logoOffsetY', 'textOffsetX', 'textOffsetY'];
    for (const field of INT_FIELDS) {
      if (updateData[field] !== undefined && updateData[field] !== null) {
        const parsed = parseInt(String(updateData[field]), 10);
        updateData[field] = isNaN(parsed) ? null : parsed;
      }
    }

    console.log(`[updateSettings] Keys to save: ${Object.keys(updateData).join(', ')}`);

    // Audit log için logoUrl/backgroundImage gibi büyük veriler hariç
    const auditChanges = { ...updateData };
    if (auditChanges.logoUrl) auditChanges.logoUrl = '[BASE64_DATA]';
    if (auditChanges.backgroundImage) auditChanges.backgroundImage = '[BASE64_DATA]';

    try {
      const settings = await this.prisma.systemSettings.upsert({
        where: { tenantId },
        update: updateData,
        create: { tenantId, ...updateData },
      });

      await this.createAuditLog({
        tenantId,
        event: 'settings.update',
        adminId,
        adminIp,
        metadata: { changes: auditChanges },
      });

      return settings;
    } catch (error: any) {
      // Detaylı hata loglama
      const valSummary = Object.entries(updateData).map(([k, v]) => {
        const t = typeof v;
        if (t === 'string') return `${k}:string(${(v as string).length})`;
        if (t === 'number') return `${k}:number(${v})`;
        if (t === 'boolean') return `${k}:bool(${v})`;
        if (v === null) return `${k}:null`;
        return `${k}:${t}`;
      }).join(', ');
      console.error(`[updateSettings] Prisma ERROR code=${error.code} meta=${JSON.stringify(error.meta || {})}`);
      console.error(`[updateSettings] Values: ${valSummary}`);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  CHECK USER BAN STATUS
  // ═══════════════════════════════════════════════════════════

  async checkUserBanned(
    userId: string,
  ): Promise<{ banned: boolean; reason?: string; expiresAt?: Date | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isBanned: true, banExpiresAt: true },
    });

    if (!user) return { banned: false };

    if (user.isBanned) {
      // Check if ban has expired
      if (user.banExpiresAt && new Date() > user.banExpiresAt) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { isBanned: false, banExpiresAt: null },
        });
        // Deactivate expired bans
        await this.prisma.banLog.updateMany({
          where: { userId, isActive: true, expiresAt: { lt: new Date() } },
          data: { isActive: false },
        });
        return { banned: false };
      }

      const activeBan = await this.prisma.banLog.findFirst({
        where: { userId, isActive: true, type: 'BAN' },
        orderBy: { createdAt: 'desc' },
      });

      return {
        banned: true,
        reason: activeBan?.reason || undefined,
        expiresAt: user.banExpiresAt,
      };
    }

    return { banned: false };
  }

  // ═══════════════════════════════════════════════════════════
  //  ŞIFRE SIFIRLAMA (Forgot / Reset Password)
  // ═══════════════════════════════════════════════════════════

  async forgotPassword(email: string) {
    if (!email) throw new BadRequestException('E-posta adresi gerekli.');

    // Sadece admin seviyesi rollerdeki kullanıcıları ara
    const adminRoles = ['admin', 'superadmin', 'owner', 'godmaster'];
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        role: { in: adminRoles },
      },
    });

    // Güvenlik: kullanıcı bulunamasa bile aynı mesajı dön
    if (!user) {
      return { success: true, message: 'Eğer bu e-posta kayıtlıysa, sıfırlama kodu gönderildi.' };
    }

    // 6 haneli kod üret
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika

    // DB'ye kaydet
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: code,
        resetTokenExpiresAt: expiresAt,
      },
    });

    // Mail gönder
    const sent = await this.mailService.sendResetCode(email, code);
    if (!sent) {
      throw new InternalServerErrorException('E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.');
    }

    return { success: true, message: 'Sıfırlama kodu e-posta adresinize gönderildi.' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    if (!email || !code || !newPassword) {
      throw new BadRequestException('E-posta, kod ve yeni şifre gerekli.');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException('Şifre en az 6 karakter olmalı.');
    }

    const adminRoles = ['admin', 'superadmin', 'owner', 'godmaster'];
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        role: { in: adminRoles },
      },
    });

    if (!user) throw new BadRequestException('Geçersiz e-posta veya kod.');
    if (!user.resetToken || user.resetToken !== code) {
      throw new BadRequestException('Geçersiz sıfırlama kodu.');
    }
    if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw new BadRequestException('Sıfırlama kodunun süresi dolmuş. Lütfen yeni kod talep edin.');
    }

    // Şifreyi güncelle ve token'ı temizle
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    return { success: true, message: 'Şifreniz başarıyla güncellendi.' };
  }

  // ─── İLETİŞİM FORMU ──────────────────────────

  async submitContactForm(data: { name: string; email: string; subject: string; message: string }) {
    const msg = await this.prisma.contactMessage.create({ data });

    // Admin'e e-posta bildirimi gönder
    try {
      await this.mailService.sendContactNotification(data);
    } catch (e) {
      console.error('İletişim mail bildirimi gönderilemedi:', e);
    }

    return { success: true, id: msg.id };
  }

  async getContactMessages(filters?: { unreadOnly?: boolean; page?: number; limit?: number }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const where = filters?.unreadOnly ? { isRead: false } : {};

    const [messages, total] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contactMessage.count({ where }),
    ]);

    return { messages, total, page, limit };
  }

  async markMessageRead(id: string) {
    await this.prisma.contactMessage.update({
      where: { id },
      data: { isRead: true },
    });
    return { success: true };
  }

  async deleteContactMessage(id: string) {
    await this.prisma.contactMessage.delete({ where: { id } });
    return { success: true };
  }

  // ── SİPARİŞ YÖNETİMİ ──

  async createOrder(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    packageName: string;
    paymentCode: string;
    hostingType?: string;
    customDomain?: string;
    roomName?: string;
    logo?: string;
    details?: any;
    amount?: number;
  }) {
    const order = await this.prisma.order.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        packageName: data.packageName,
        paymentCode: data.paymentCode,
        hostingType: data.hostingType || 'sopranochat',
        customDomain: data.customDomain || null,
        roomName: data.roomName || null,
        logo: data.logo || null,
        details: data.details || null,
        amount: data.amount || 0,
      },
    });

    // Admin'e e-posta bildirimi
    try {
      await this.mailService.sendOrderNotification(order);
    } catch (e) {
      console.error('Order notification mail error:', e);
    }

    // Admin panele anlık socket bildirimi
    try {
      const pendingCount = await this.prisma.order.count({ where: { status: 'PENDING' } });
      this.chatGateway.server.emit('admin:new_order', {
        order: {
          id: order.id,
          firstName: order.firstName,
          lastName: order.lastName,
          packageName: order.packageName,
          roomName: order.roomName,
          createdAt: order.createdAt,
        },
        pendingCount,
      });
    } catch (e) {
      console.error('Order socket notification error:', e);
    }

    return { success: true, order };
  }

  // ── Bekleyen sipariş sayısı ──
  async getPendingOrderCount() {
    const count = await this.prisma.order.count({ where: { status: 'PENDING' } });
    return { pendingCount: count };
  }

  async getOrders(filters?: { status?: string; page?: number; limit?: number }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const where: any = {};
    if (filters?.status) where.status = filters.status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  async updateOrderStatus(id: string, status: string, notes?: string, adminId?: string) {
    const updateData: any = { status };
    if (notes !== undefined) updateData.notes = notes;

    // Önce siparişi çek — provision için bilgiler lazım
    const existingOrder = await this.prisma.order.findUnique({ where: { id } });
    if (!existingOrder) throw new BadRequestException('Sipariş bulunamadı.');

    // Durumu güncelle
    const order = await this.prisma.order.update({
      where: { id },
      data: updateData,
    });

    // ── ONAYLANDI → OTOMATİK PROVİSİON ──
    if (status === 'APPROVED') {
      try {
        const details = (existingOrder.details as any) || {};
        const domain = existingOrder.hostingType === 'own_domain' && existingOrder.customDomain
          ? existingOrder.customDomain
          : `${existingOrder.firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${existingOrder.paymentCode.toLowerCase()}`;

        // Oda sayısını parse et
        let roomCount = 1;
        if (details.rooms) {
          const match = String(details.rooms).match(/(\d+)/);
          if (match) roomCount = parseInt(match[1]);
        }

        // Kullanıcı limitini parse et
        let userLimit = 30;
        if (details.capacity) {
          if (String(details.capacity).toLowerCase().includes('sınırsız') || String(details.capacity).toLowerCase().includes('unlimited')) {
            userLimit = 9999;
          } else {
            const match = String(details.capacity).match(/(\d+)/);
            if (match) userLimit = parseInt(match[1]);
          }
        }

        // Kamera özelliği
        const cameraEnabled = details.camera
          ? !String(details.camera).toLowerCase().includes('kamerasız')
          : true;

        // Ödeme periyodunu parse et
        const billingPeriod: 'MONTHLY' | 'YEARLY' =
          details.billingPeriod === 'YEARLY' || details.billingPeriod === 'Yıllık' ? 'YEARLY' : 'MONTHLY';

        const provisionResult = await this.provisionCustomer(adminId || 'system', {
          name: existingOrder.customDomain || `${existingOrder.firstName} ${existingOrder.lastName}`,
          displayName: existingOrder.roomName || undefined,
          domain: domain,
          hostingType: (existingOrder.hostingType as 'sopranochat' | 'own_domain') || 'sopranochat',
          roomCount,
          userLimit,
          cameraEnabled,
          billingPeriod,
          adminName: `${existingOrder.firstName} ${existingOrder.lastName}`,
          adminEmail: existingOrder.email,
          adminPhone: existingOrder.phone,
          price: Number(existingOrder.amount) || 0,
          currency: existingOrder.currency || 'TRY',
          customerEmail: existingOrder.email,
          customerPhone: existingOrder.phone,
          roomName: existingOrder.roomName || undefined,
          logo: existingOrder.logo || undefined,
        });

        // Provision bilgilerini sipariş notlarına yaz
        const provisionInfo = [
          notes || '',
          `\n--- OTOMATİK PROVİSİON ---`,
          `Tenant: ${provisionResult.tenant.name} (${provisionResult.tenant.slug})`,
          `Access Code: ${provisionResult.tenant.accessCode}`,
          `Owner: ${provisionResult.ownerUser.email} / Şifre: ${provisionResult.ownerPassword}`,
          `Odalar: ${provisionResult.defaultRooms.map((r: any) => r.name).join(', ')}`,
        ].filter(Boolean).join('\n');

        await this.prisma.order.update({
          where: { id },
          data: { notes: provisionInfo },
        });

        return {
          success: true,
          order: { ...order, notes: provisionInfo },
          provision: {
            tenant: provisionResult.tenant,
            rooms: provisionResult.defaultRooms,
            ownerEmail: provisionResult.ownerUser.email,
            ownerPassword: provisionResult.ownerPassword,
          },
        };
      } catch (provisionError: any) {
        // Provision başarısız olursa notu güncelle ama status CONFIRMED kalsın
        const errorNote = `${notes || ''}\n--- PROVİSİON HATASI ---\n${provisionError.message}`;
        await this.prisma.order.update({
          where: { id },
          data: { notes: errorNote },
        });
        return {
          success: true,
          order: { ...order, notes: errorNote },
          provisionError: provisionError.message,
        };
      }
    }

    return { success: true, order };
  }

  async deleteOrder(id: string) {
    await this.prisma.order.delete({ where: { id } });
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════
  // TOPLU JETON DAĞITIMI
  // ═══════════════════════════════════════════════════════════

  async bulkAddBalance(
    adminId: string,
    amount: number,
    targetRoles: string[],
    adminIp?: string,
  ) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Miktar 0\'dan büyük olmalıdır.');
    }

    const where: any = {};
    if (targetRoles && targetRoles.length > 0) {
      where.role = { in: targetRoles };
    }

    // Toplu güncelleme
    const result = await this.prisma.user.updateMany({
      where,
      data: { balance: { increment: amount } },
    });

    // Audit log
    await this.createAuditLog({
      tenantId: 'system',
      event: 'balance.bulk_add',
      adminId,
      adminIp,
      metadata: {
        amount,
        targetRoles,
        affectedCount: result.count,
      },
    });

    // Real-time: online kullanıcılara bildir
    try {
      const gateway = this.chatGateway;
      if (gateway) {
        const participants = gateway['participants'] as Map<string, any>;
        if (participants) {
          for (const [, p] of participants) {
            if (!targetRoles.length || targetRoles.includes(p.role)) {
              const dbUser = await this.prisma.user.findUnique({
                where: { id: p.userId },
                select: { balance: true, points: true },
              });
              if (dbUser) {
                gateway.server?.to(p.socketId).emit('gift:balance', {
                  balance: Number(dbUser.balance),
                  points: dbUser.points,
                });
                gateway.server?.to(p.socketId).emit('dailyBonus:received', {
                  amount,
                  type: 'bulkGrant',
                  message: `🎉 Admin tarafından ${amount} jeton eklendi!`,
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to broadcast bulk balance:', e);
    }

    return {
      success: true,
      affectedCount: result.count,
      amount,
      targetRoles,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // JETON SİPARİŞ YÖNETİMİ
  // ═══════════════════════════════════════════════════════════

  async getTokenOrders(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const orders = await this.prisma.tokenOrder.findMany({
      where,
      include: {
        user: { select: { id: true, displayName: true, email: true, role: true, avatarUrl: true } },
        package: { select: { id: true, name: true, emoji: true, tokenAmount: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return orders;
  }

  async processTokenOrder(
    orderId: string,
    action: 'approve' | 'reject',
    adminId: string,
    adminNote?: string,
    adminIp?: string,
  ) {
    const order = await this.prisma.tokenOrder.findUnique({
      where: { id: orderId },
      include: { user: true, package: true },
    });

    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Bu sipariş zaten işlenmiş.');
    }

    const now = new Date();

    if (action === 'approve') {
      // Siparişi onayla ve jeton ekle
      await this.prisma.$transaction([
        this.prisma.tokenOrder.update({
          where: { id: orderId },
          data: {
            status: 'APPROVED',
            processedBy: adminId,
            processedAt: now,
            adminNote,
          },
        }),
        this.prisma.user.update({
          where: { id: order.userId },
          data: { balance: { increment: order.tokenAmount } },
        }),
      ]);

      // Real-time bildirim
      try {
        const gateway = this.chatGateway;
        if (gateway) {
          const participants = gateway['participants'] as Map<string, any>;
          if (participants) {
            for (const [, p] of participants) {
              if (p.userId === order.userId) {
                const dbUser = await this.prisma.user.findUnique({
                  where: { id: order.userId },
                  select: { balance: true, points: true },
                });
                if (dbUser) {
                  gateway.server?.to(p.socketId).emit('gift:balance', {
                    balance: Number(dbUser.balance),
                    points: dbUser.points,
                  });
                  gateway.server?.to(p.socketId).emit('dailyBonus:received', {
                    amount: order.tokenAmount,
                    type: 'orderApproved',
                    message: `✅ ${order.package.name} siparişiniz onaylandı! ${order.tokenAmount} jeton eklendi.`,
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to notify user about order approval:', e);
      }
    } else {
      // Siparişi reddet
      await this.prisma.tokenOrder.update({
        where: { id: orderId },
        data: {
          status: 'REJECTED',
          processedBy: adminId,
          processedAt: now,
          adminNote,
        },
      });
    }

    // Audit log
    await this.createAuditLog({
      tenantId: order.tenantId,
      event: `tokenOrder.${action}`,
      adminId,
      targetUserId: order.userId,
      adminIp,
      metadata: {
        orderId,
        packageName: order.package.name,
        tokenAmount: order.tokenAmount,
        price: Number(order.price),
        adminNote,
      },
    });

    return {
      success: true,
      action,
      orderId,
      userId: order.userId,
      displayName: order.user.displayName,
      tokenAmount: order.tokenAmount,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // JETON PAKETLERİ YÖNETİMİ
  // ═══════════════════════════════════════════════════════════

  async getTokenPackages(tenantId: string) {
    return this.prisma.tokenPackage.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createTokenPackage(tenantId: string, data: {
    name: string;
    tokenAmount: number;
    price: number;
    currency?: string;
    emoji?: string;
    description?: string;
    sortOrder?: number;
  }) {
    return this.prisma.tokenPackage.create({
      data: {
        tenantId,
        name: data.name,
        tokenAmount: data.tokenAmount,
        price: data.price,
        currency: data.currency || 'TRY',
        emoji: data.emoji || '💎',
        description: data.description,
        sortOrder: data.sortOrder || 0,
      },
    });
  }

  async updateTokenPackage(packageId: string, data: any) {
    return this.prisma.tokenPackage.update({
      where: { id: packageId },
      data,
    });
  }

  async deleteTokenPackage(packageId: string) {
    await this.prisma.tokenPackage.delete({ where: { id: packageId } });
    return { success: true };
  }
}
