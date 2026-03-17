import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from '../user/user.service';
import { TenantService } from '../tenant/tenant.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

/**
 * Cinsiyete uygun yerel PNG avatar URL'i oluşturur.
 * seed parametresi ile deterministik seçim yapılır.
 */
const MALE_AVATARS = ['/avatars/male_1.png', '/avatars/male_2.png', '/avatars/male_3.png', '/avatars/male_4.png'];
const FEMALE_AVATARS = ['/avatars/female_1.png', '/avatars/female_2.png', '/avatars/female_3.png', '/avatars/female_4.png'];
const NEUTRAL_AVATARS = ['/avatars/neutral_1.png', '/avatars/neutral_2.png', '/avatars/neutral_3.png', '/avatars/neutral_4.png'];

function seedToIndex(seed: string, count: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash) % count;
}

function generateGenderAvatar(seed: string, gender?: string): string {
  const g = (gender || '').toLowerCase();
  if (g === 'male' || g === 'erkek') {
    return MALE_AVATARS[seedToIndex(seed, MALE_AVATARS.length)];
  }
  if (g === 'female' || g === 'kadın' || g === 'kadin') {
    return FEMALE_AVATARS[seedToIndex(seed, FEMALE_AVATARS.length)];
  }
  return NEUTRAL_AVATARS[seedToIndex(seed, NEUTRAL_AVATARS.length)];
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private tenantService: TenantService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) { }

  async validateApiKey(apiKey: string) {
    const tenant = await this.tenantService.findByApiKey(apiKey);
    if (!tenant) return null;
    return tenant;
  }

  async validateUser(
    tenantIdOrSlug: string,
    identifier: string,
    pass: string,
  ): Promise<any> {
    let tenantId = tenantIdOrSlug;

    // If it's not a UUID or cuid pattern, assume it's a slug and find the real ID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cuidRegex = /^c[a-z0-9]{24,}$/i;
    if (!uuidRegex.test(tenantIdOrSlug) && !cuidRegex.test(tenantIdOrSlug)) {
      let tenant = await this.prisma.tenant.findUnique({
        where: { slug: tenantIdOrSlug },
      });
      // Fallback: if slug is 'default' and not found, use first tenant
      if (!tenant && tenantIdOrSlug === 'default') {
        tenant = await this.prisma.tenant.findFirst();
      }
      if (!tenant) return null;
      tenantId = tenant.id;
    }

    const user = await this.prisma.user.findFirst({
      where: {
        tenantId: tenantId,
        OR: [
          { email: { equals: identifier, mode: 'insensitive' } },
          { displayName: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });

    if (user && user.passwordHash) {
      const isMatch = await bcrypt.compare(pass, user.passwordHash);
      if (isMatch) {
        const { passwordHash, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async login(user: any) {
    // JWT payload — keep minimal, NEVER include large data like base64 avatars
    const jwtPayload = {
      username: user.email,
      sub: user.id,
      tenantId: user.tenantId,
      displayName: user.displayName,
      role: user.role || 'member',
      isMember: true,
      nameColor: user.nameColor || null,
    };

    // Full user response includes avatar and gender (not in JWT to avoid bloat)
    const userResponse = {
      ...jwtPayload,
      avatar: user.avatarUrl || null,
      gender: user.gender || null,
    };

    // Update login stats
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginCount: { increment: 1 },
        isOnline: true,
      },
    });

    return {
      access_token: this.jwtService.sign(jwtPayload),
      user: userResponse,
    };
  }

  /**
   * Guest login — no DB validation, but uses real tenant ID
   */
  async guestLogin(username: string, avatar?: string, gender?: string, tenantId?: string) {
    // If a valid tenant UUID was provided, use it directly
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // Also support cuid format (starts with 'c', 25+ chars)
    const cuidRegex = /^c[a-z0-9]{24,}$/i;

    let tenant: any = null;

    if (tenantId && (uuidRegex.test(tenantId) || cuidRegex.test(tenantId))) {
      tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    } else if (tenantId) {
      // It might be a slug
      tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantId } });
    }

    // Fallback to system/default tenant
    if (!tenant) {
      tenant = await this.prisma.tenant.findFirst({
        where: { OR: [{ slug: 'system' }, { slug: 'default' }] },
      });
    }
    if (!tenant) {
      tenant = await this.prisma.tenant.findFirst({ where: { slug: 'guest' } });
    }
    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: {
          slug: 'default',
          name: 'Default Tenant',
          packageType: 'CAMERA',
          apiSecret: 'default-secret',
        },
      });
    }

    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const guestAvatar = avatar || generateGenderAvatar(username, gender);
    const jwtPayload = {
      username: username,
      sub: guestId,
      displayName: username,
      gender: gender || 'Unspecified',
      role: 'guest',
      isGuest: true,
      isMember: false,
      tenantId: tenant.id, // Gerçek tenant UUID — 'default' string değil!
    };
    const userResponse = {
      ...jwtPayload,
      avatar: guestAvatar,
    };
    return {
      access_token: this.jwtService.sign(jwtPayload),
      user: userResponse,
    };
  }

  /**
   * Register a new member with email + password.
   */
  async register(data: {
    email: string;
    username: string;
    password: string;
    avatar?: string;
    gender?: string;
    tenantId?: string;
  }) {
    if (!data.email || !data.username || !data.password) {
      throw new BadRequestException(
        'E-posta, kullanıcı adı ve şifre zorunludur.',
      );
    }

    if (data.password.length < 4) {
      throw new BadRequestException('Şifre en az 4 karakter olmalıdır.');
    }

    // Tenant lookup — use provided tenantId or fall back to system/default
    let tenant: any = null;
    if (data.tenantId) {
      tenant = await this.prisma.tenant.findUnique({ where: { id: data.tenantId } });
      if (!tenant) {
        // Try by slug or accessCode
        tenant = await this.prisma.tenant.findFirst({
          where: { OR: [{ slug: data.tenantId }, { accessCode: data.tenantId }] },
        });
      }
    }
    if (!tenant) {
      tenant = await this.prisma.tenant.findFirst({
        where: { OR: [{ slug: 'system' }, { slug: 'default' }] },
      });
    }
    if (!tenant) {
      tenant = await this.prisma.tenant.findFirst({ where: { slug: 'guest' } });
    }
    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: {
          slug: 'default',
          name: 'Default Tenant',
          packageType: 'CAMERA',
          apiSecret: 'default-secret',
        },
      });
    }

    // Check if user already exists (email OR username)
    const existing = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { email: data.email },
          { displayName: data.username }, // displayName is used as username
        ],
      },
    });
    if (existing) {
      if (existing.email === data.email) {
        throw new ConflictException('Bu e-posta adresi zaten kayıtlı.');
      } else {
        throw new ConflictException('Bu kullanıcı adı zaten alınmış.');
      }
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const avatarUrl =
      data.avatar ||
      generateGenderAvatar(data.username, data.gender);

    // Başlangıç jetonu — tenant ayarlarından oku
    let initialBalance = 100;
    try {
      const settings = await this.prisma.systemSettings.findUnique({
        where: { tenantId: tenant.id },
        select: { initialBalance: true },
      });
      if (settings?.initialBalance != null) {
        initialBalance = settings.initialBalance;
      }
    } catch { /* settings tablosu yoksa default kullan */ }

    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        displayName: data.username,
        email: data.email,
        passwordHash: hashedPassword,
        avatarUrl,
        gender: data.gender || null,
        role: 'member',
        isOnline: true,
        lastLoginAt: new Date(),
        loginCount: 1,
        balance: initialBalance,
      },
    });

    // JWT payload — keep minimal, no avatar
    const jwtPayload = {
      username: user.email,
      sub: user.id,
      tenantId: tenant.id,
      displayName: user.displayName,
      role: 'member',
      isMember: true,
    };

    const userResponse = {
      ...jwtPayload,
      avatar: user.avatarUrl,
    };

    return {
      access_token: this.jwtService.sign(jwtPayload),
      user: userResponse,
    };
  }

  /**
   * Social login (Google, Facebook, Apple)
   */
  async socialLogin(reqUser: {
    email?: string;
    displayName: string;
    avatar?: string;
    provider: string;
    providerId: string;
  }) {
    if (!reqUser) {
      throw new BadRequestException('Sosyal giriş sağlayıcısından kullanıcı bilgisi alınamadı.');
    }

    // Build provider-specific search conditions
    const orConditions: any[] = [];
    if (reqUser.provider === 'google' && reqUser.providerId) {
      orConditions.push({ googleId: reqUser.providerId });
    }
    if (reqUser.provider === 'facebook' && reqUser.providerId) {
      orConditions.push({ facebookId: reqUser.providerId });
    }
    if (reqUser.provider === 'apple' && reqUser.providerId) {
      orConditions.push({ appleId: reqUser.providerId });
    }
    if (reqUser.email) {
      orConditions.push({ email: reqUser.email });
    }

    let user = orConditions.length > 0
      ? await this.prisma.user.findFirst({ where: { OR: orConditions } })
      : null;

    if (!user) {
      // Create new user
      const tenant =
        (await this.prisma.tenant.findFirst({ where: { OR: [{ slug: 'system' }, { slug: 'default' }] } })) ||
        (await this.prisma.tenant.create({
          data: {
            slug: 'default',
            name: 'Default',
            packageType: 'CAMERA',
            apiSecret: 'default',
          },
        }));

      // Build provider ID data
      const providerData: any = {};
      if (reqUser.provider === 'google') providerData.googleId = reqUser.providerId;
      if (reqUser.provider === 'facebook') providerData.facebookId = reqUser.providerId;
      if (reqUser.provider === 'apple') providerData.appleId = reqUser.providerId;

      user = await this.prisma.user.create({
        data: {
          email:
            reqUser.email ||
            `${reqUser.provider}_${reqUser.providerId}@soprano.chat`,
          displayName: reqUser.displayName || 'Social User',
          avatarUrl: reqUser.avatar && !reqUser.avatar.startsWith('http') ? reqUser.avatar : `/avatars/neutral_${Math.floor(Math.random() * 4) + 1}.png`,
          role: 'member',
          tenantId: tenant.id,
          isOnline: true,
          lastLoginAt: new Date(),
          loginCount: 1,
          ...providerData,
        },
      });
    } else {
      // Update provider ID if missing (e.g. user found by email but provider ID not linked)
      const updateData: any = {};
      if (reqUser.provider === 'google' && !user.googleId) updateData.googleId = reqUser.providerId;
      if (reqUser.provider === 'facebook' && !user.facebookId) updateData.facebookId = reqUser.providerId;
      if (reqUser.provider === 'apple' && !user.appleId) updateData.appleId = reqUser.providerId;
      if (reqUser.avatar && !reqUser.avatar.startsWith('http') && !user.avatarUrl) updateData.avatarUrl = reqUser.avatar;
      if (!user.avatarUrl) updateData.avatarUrl = `/avatars/neutral_${Math.floor(Math.random() * 4) + 1}.png`;

      if (Object.keys(updateData).length > 0) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    return this.login(user);
  }

  async updateProfile(
    user: any,
    data: {
      displayName?: string;
      avatar?: string;
      email?: string;
      password?: string;
      gender?: string;
    },
  ) {
    const updatedUser = { ...user };
    // Ensure isMember is preserved or set correctly
    if (user.role === 'member' || user.isMember) {
      updatedUser.isMember = true;
    }

    if (user.isGuest || user.role === 'guest') {
      // Update JWT payload only for guests
      if (data.displayName) {
        updatedUser.displayName = data.displayName;
        updatedUser.username = data.displayName;
      }
      if (data.avatar) updatedUser.avatar = data.avatar;
      if (data.gender) updatedUser.gender = data.gender;
      // Guests can't persist nameColor easily without DB, but we can update payload
      if ((data as any).nameColor) updatedUser.nameColor = (data as any).nameColor;
    } else {
      // It's a member, update DB
      try {
        const updateData: any = {};
        if (data.displayName) updateData.displayName = data.displayName;
        if (data.avatar) updateData.avatarUrl = data.avatar;
        if ((data as any).nameColor) updateData.nameColor = (data as any).nameColor;
        if (data.gender) updateData.gender = data.gender;
        if (data.email) {
          updateData.email = data.email;
          // Also update payload
          updatedUser.username = data.email; // If username is email based logic
          updatedUser.email = data.email;
        }

        const dbUser = await this.prisma.user.update({
          where: { id: user.sub },
          data: updateData,
        });

        if (dbUser.displayName) updatedUser.displayName = dbUser.displayName;
        if (dbUser.avatarUrl) updatedUser.avatar = dbUser.avatarUrl;
        if (dbUser.nameColor) updatedUser.nameColor = dbUser.nameColor;
        if (dbUser.gender) updatedUser.gender = dbUser.gender;
        if (dbUser.email) updatedUser.email = dbUser.email; // Ensure email in payload if needed

        // Preserve the actual role from DB (don't force 'member' — that breaks GodMaster/Owner/Admin roles)
        if (dbUser.role) updatedUser.role = dbUser.role;
        updatedUser.isMember = true;
      } catch (e) {
        // If update fails (maybe social user without DB record?), just update payload
        if (data.displayName) updatedUser.displayName = data.displayName;
        if (data.avatar) updatedUser.avatar = data.avatar;
        if (data.email) updatedUser.email = data.email;
        if ((data as any).nameColor) updatedUser.nameColor = (data as any).nameColor;
        if (data.gender) updatedUser.gender = data.gender;
      }
    }

    // Create a clean, minimal JWT payload (never include permissions or avatars)
    const jwtPayload = {
      username: updatedUser.username || updatedUser.email,
      sub: updatedUser.sub || updatedUser.userId,
      tenantId: updatedUser.tenantId,
      displayName: updatedUser.displayName,
      role: updatedUser.role || 'member',
      isMember: updatedUser.isMember ?? !updatedUser.isGuest,
      isGuest: updatedUser.isGuest || false,
      nameColor: updatedUser.nameColor || null,
      gender: updatedUser.gender || null,
    };

    const userResponse = {
      ...jwtPayload,
      avatar: updatedUser.avatar,
    };

    return {
      access_token: this.jwtService.sign(jwtPayload),
      user: userResponse,
    };
  }

  async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new BadRequestException('Kullanıcı bulunamadı veya şifresi yok.');
    }

    const isMatch = await bcrypt.compare(oldPass, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Eski şifre hatalı.');
    }

    if (newPass.length < 4) {
      throw new BadRequestException('Yeni şifre en az 4 karakter olmalıdır.');
    }

    const newHash = await bcrypt.hash(newPass, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true };
  }
}
