import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'secretKey',
    });
  }

  async validate(payload: any) {
    // If it's a guest, rely on payload (no DB record)
    if (payload.isGuest || payload.sub.startsWith('guest_')) {
      return {
        userId: payload.sub,
        username: payload.username,
        tenantId: payload.tenantId,
        displayName: payload.displayName,
        role: payload.role || 'guest',
        avatar: payload.avatar || null,
        gender: payload.gender || null,
        isGuest: true,
        permissions: payload.permissions || null,
        nameColor: payload.nameColor || null,
      };
    }

    // specific handling for system/permanent tokens if any?
    // checking DB for latest data
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      // User might be deleted or token invalid?
      // Fallback to payload or throw unauthorized?
      // Better to throw if user is supposed to exist
      // But for robustness, let's fallback to payload if DB fails 
      // (though findUnique returning null means user is GONE)
      throw new UnauthorizedException('User not found');
    }

    return {
      userId: user.id,
      username: user.email, // or displayName if that's how we map it
      tenantId: user.tenantId,
      displayName: user.displayName,
      role: user.role,
      avatar: user.avatarUrl,
      gender: user.gender,
      isGuest: false,
      permissions: user.permissions,
      nameColor: (user as any).nameColor,
      isBanned: user.isBanned, // Useful to have latest ban status too
    };
  }
}
