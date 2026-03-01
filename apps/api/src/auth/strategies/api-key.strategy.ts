import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy,
  'api-key',
) {
  constructor(private authService: AuthService) {
    // HeaderAPIKeyStrategy(options, verify)
    // @ts-ignore
    super({ header: 'X-API-KEY', prefix: '' }, async (apiKey, done) => {
      const valid = await this.authService.validateApiKey(apiKey);
      if (!valid) {
        return done(new UnauthorizedException(), null);
      }
      return done(null, valid);
    });
  }

  validate(apiKey: string, done: (err: any, user: any) => void) {
    return true;
  }
}
