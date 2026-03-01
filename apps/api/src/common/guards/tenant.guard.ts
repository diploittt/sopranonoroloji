import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantService } from '../../tenant/tenant.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private tenantService: TenantService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Prioritize API Key or JWT payload
    // If JWT, user is already validated, we can get tenantId from user
    // If API Key, passport strategy handled it

    // Check for X-TENANT-ID header as explicit override or fallback
    const tenantId = request.headers['x-tenant-id'];
    if (tenantId) {
      // Validate existence?
      // request.tenant = ...
      return true;
    }

    return true; // Allow pass, logic depends on specific route needs
  }
}
