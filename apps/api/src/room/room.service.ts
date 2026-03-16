import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { Room } from '@prisma/client';

@Injectable()
export class RoomService {
  constructor(private prisma: PrismaService) { }

  async create(tenantId: string, data: CreateRoomDto): Promise<Room> {
    const existing = await this.prisma.room.findUnique({
      where: {
        tenantId_slug: { tenantId, slug: data.slug },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Room with this slug already exists for this tenant',
      );
    }

    // TODO: Check Tenant room limit here using TenantService

    return this.prisma.room.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { roomLimit: true },
    });
    return this.prisma.room.findMany({
      where: { tenantId, status: { not: 'CLOSED' } },
      include: {
        _count: { select: { participants: { where: { isActive: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      take: tenant?.roomLimit || undefined,
    });
  }

  // Public: Ana sayfa için system odalarını auth gerektirmeden döndür
  async findAllPublicSystem() {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: 'system' },
      select: { id: true, roomLimit: true },
    });
    if (!tenant) return [];
    return this.prisma.room.findMany({
      where: { tenantId: tenant.id, status: { not: 'CLOSED' }, isMeetingRoom: false },
      select: {
        id: true,
        name: true,
        slug: true,
        isVipRoom: true,
        _count: { select: { participants: { where: { isActive: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      take: tenant.roomLimit || undefined,
    });
  }

  // Public: Kayıtlı kullanıcıların temel bilgilerini döndür (ana sayfa kartı için)
  async getPublicUsers() {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: 'system' } });
    if (!tenant) return [];
    const users = await this.prisma.user.findMany({
      where: { tenantId: tenant.id, role: { notIn: ['guest', 'godmaster'] } },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        isOnline: true,
        // @ts-ignore — userLike/notification models not yet in Prisma schema
        _count: { select: { likesReceived: true } },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
    return users.filter(u => u.displayName);
  }

  // Like: Kullanıcı beğen
  async likeUser(likerId: string, likedId: string) {
    if (likerId === likedId) throw new ConflictException('Kendinizi beğenemezsiniz.');

    // Liker bilgisi
    const liker = await this.prisma.user.findUnique({
      where: { id: likerId },
      select: { tenantId: true, displayName: true, avatarUrl: true },
    });
    if (!liker) throw new NotFoundException('Kullanıcı bulunamadı.');

    // Zaten beğenmiş mi?
    // @ts-ignore
    const existing = await this.prisma.userLike.findUnique({
      where: { likerId_likedId: { likerId, likedId } },
    });
    if (existing) throw new ConflictException('Zaten beğenmişsiniz.');

    // Like oluştur
    // @ts-ignore
    const like = await this.prisma.userLike.create({
      data: { tenantId: liker.tenantId, likerId, likedId },
    });

    // Notification oluştur
    // @ts-ignore
    await this.prisma.notification.create({
      data: {
        userId: likedId,
        type: 'LIKE',
        fromUserId: likerId,
        fromName: liker.displayName,
        fromAvatar: liker.avatarUrl,
        message: `${liker.displayName} seni beğendi!`,
      },
    });

    return like;
  }

  // Unlike: Beğeni geri al
  async unlikeUser(likerId: string, likedId: string) {
    // @ts-ignore
    await this.prisma.userLike.deleteMany({
      where: { likerId, likedId },
    });
    return { success: true };
  }

  // Kullanıcının verdiği beğenileri döndür (hangi ID'leri beğenmiş?)
  async getMyLikes(userId: string) {
    // @ts-ignore
    const likes = await this.prisma.userLike.findMany({
      where: { likerId: userId },
      select: { likedId: true },
    });
    return likes.map(l => l.likedId);
  }

  // Bildirimleri getir (okunmamış)
  async getNotifications(userId: string) {
    // @ts-ignore
    return this.prisma.notification.findMany({
      where: { userId, isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // Bildirimleri okundu işaretle
  async markNotificationsRead(userId: string) {
    // @ts-ignore
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }

  async findOne(tenantId: string, id: string): Promise<Room> {
    const room = await this.prisma.room.findFirst({
      where: { id, tenantId },
    });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async closeRoom(id: string): Promise<Room> {
    return this.prisma.room.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });
  }

  async findBySlug(tenantId: string, slug: string): Promise<Room | null> {
    return this.prisma.room.findUnique({
      where: {
        tenantId_slug: { tenantId, slug },
      },
    });
  }

  // Public: accessCode ile tenant bilgisi ve odaları döndür
  async findByAccessCode(code: string) {
    // Önce accessCode ile ara, bulamazsa slug ile dene
    let tenant = await this.prisma.tenant.findFirst({
      where: { accessCode: code },
      select: {
        id: true,
        name: true,
        displayName: true,
        slug: true,
        domain: true,
        status: true,
        logoUrl: true,
      },
    });

    if (!tenant) {
      tenant = await this.prisma.tenant.findFirst({
        where: { slug: code },
        select: {
          id: true,
          name: true,
          displayName: true,
          slug: true,
          domain: true,
          status: true,
          logoUrl: true,
        },
      });
    }

    if (!tenant) {
      // 3. fallback: oda slug'ı ile dene (login URL'si room slug kullanıyor olabilir)
      const room = await this.prisma.room.findFirst({
        where: { slug: code },
        select: {
          tenant: {
            select: {
              id: true,
              name: true,
              displayName: true,
              slug: true,
              domain: true,
              status: true,
              logoUrl: true,
            },
          },
        },
      });
      if (room?.tenant) {
        tenant = room.tenant;
      }
    }

    if (!tenant) {
      throw new NotFoundException(`Geçersiz erişim kodu.`);
    }

    const rooms = await this.prisma.room.findMany({
      where: { tenantId: tenant.id, status: { not: 'CLOSED' } },
      select: {
        id: true,
        name: true,
        slug: true,
        isVipRoom: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Branding ayarlarını çek (login sayfası chatroom metin logosuyla senkron olsun)
    const sysSettings = await this.prisma.systemSettings.findUnique({
      where: { tenantId: tenant.id },
      select: {
        logoName: true,
        logoTextColor: true,
        logoTextColor2: true,
        logoTextSize: true,
        logoTextFont: true,
        logoUrl: true,
      },
    });

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      displayName: tenant.displayName,
      slug: tenant.slug,
      domain: tenant.domain,
      status: tenant.status,
      logoUrl: sysSettings?.logoUrl || tenant.logoUrl,
      rooms,
      // Branding ayarları (admin panelinden gelen)
      logoName: sysSettings?.logoName || null,
      logoTextColor: sysSettings?.logoTextColor || null,
      logoTextColor2: sysSettings?.logoTextColor2 || null,
      logoTextSize: sysSettings?.logoTextSize || null,
      logoTextFont: sysSettings?.logoTextFont || null,
    };
  }

  // Public: slug ile tenant bilgisi ve odaları döndür (embed sayfası için)
  async findTenantBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        displayName: true,
        slug: true,
        domain: true,
        status: true,
        logoUrl: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Geçersiz tenant slug.`);
    }

    const rooms = await this.prisma.room.findMany({
      where: { tenantId: tenant.id, status: { not: 'CLOSED' } },
      select: {
        id: true,
        name: true,
        slug: true,
        isVipRoom: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      displayName: tenant.displayName,
      slug: tenant.slug,
      domain: tenant.domain,
      status: tenant.status,
      logoUrl: tenant.logoUrl,
      rooms,
    };
  }

  // Public: anasayfa için aktif müşteri tenant listesini döndür
  async getPublicTenants() {
    const tenants = await this.prisma.tenant.findMany({
      where: {
        status: 'ACTIVE',
        slug: { not: 'system' },
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        slug: true,
        domain: true,
        hostingType: true,
        logoUrl: true,
        rooms: {
          where: { status: { not: 'CLOSED' } },
          select: {
            id: true,
            name: true,
            slug: true,
            _count: { select: { participants: { where: { isActive: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const sopranoChatCustomers = tenants
      .filter(t => !t.hostingType || t.hostingType === 'SopranoChat' || t.hostingType === 'sopranochat')
      .map(t => ({
        id: t.id,
        name: t.displayName || t.name,
        slug: t.slug,
        logoUrl: t.logoUrl,
        roomCount: t.rooms.length,
        onlineUsers: t.rooms.reduce((sum, r) => sum + (r._count?.participants || 0), 0),
        firstRoom: t.rooms[0]?.slug || null,
        firstRoomName: t.rooms[0]?.name || null,
      }));

    const ownDomainCustomers = tenants
      .filter(t => t.hostingType === 'own_domain')
      .map(t => ({
        id: t.id,
        name: t.displayName || t.name,
        slug: t.slug,
        domain: t.domain,
        logoUrl: t.logoUrl,
        roomCount: t.rooms.length,
        onlineUsers: t.rooms.reduce((sum, r) => sum + (r._count?.participants || 0), 0),
      }));

    return { sopranoChatCustomers, ownDomainCustomers };
  }
}
