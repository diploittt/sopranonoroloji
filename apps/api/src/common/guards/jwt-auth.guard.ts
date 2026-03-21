import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const canActivate = await super.canActivate(context) as boolean;
        const request = context.switchToHttp().getRequest();

        if (canActivate && request.user) {
            const overrideTenant = request.headers['x-tenant-id'];
            if (overrideTenant) {
                const r = (request.user.role || '').toLowerCase();
                if (r === 'superadmin' || r === 'super_admin' || r === 'godmaster') {
                    // Sadece SuperAdmin/GodMaster başka bir tenant ID'si istediğinde JWT tenantId'sini anlık olarak eziyoruz
                    // Böylece tüm /admin/... endpointleri o tenant için çalışmış oluyor
                    request.user.tenantId = overrideTenant;
                }
            }
        }
        return canActivate;
    }
}
