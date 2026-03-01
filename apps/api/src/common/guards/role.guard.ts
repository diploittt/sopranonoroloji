import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { hasRole, Role } from '../rbac';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(PrismaService) private prisma: PrismaService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by JwtAuthGuard

    if (!user?.role) {
      throw new ForbiddenException('No role found in token');
    }

    // GodMaster override — always passes, no matter what roles are required
    if (user.role.toLowerCase() === 'godmaster') {
      return true;
    }

    // ★ BAN CHECK — Only for MUTATION operations (POST/PATCH/PUT/DELETE)
    // GET requests pass through so banned users can still read data (settings, lists etc.)
    const httpMethod = request.method?.toUpperCase();
    if (httpMethod && httpMethod !== 'GET' && (user.sub || user.userId)) {
      try {
        const activeBan = await this.prisma.banLog.findFirst({
          where: {
            userId: user.sub || user.userId,
            isActive: true,
            type: 'BAN',
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        });
        if (activeBan) {
          throw new ForbiddenException('Hesabınız yasaklanmış. Bu işlemi yapamazsınız.');
        }
      } catch (e) {
        if (e instanceof ForbiddenException) throw e;
        console.error('[RoleGuard] Ban check DB error:', e.message);
      }
    }

    // Check if user's role meets ANY of the required roles (takes highest)
    const meetsRequirement = requiredRoles.some((role) =>
      hasRole(user.role, role as Role),
    );

    if (!meetsRequirement) {
      throw new ForbiddenException(
        `Role "${user.role}" is not authorized for this action`,
      );
    }

    return true;
  }
}
