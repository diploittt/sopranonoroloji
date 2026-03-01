import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    super({
      clientID:
        configService.get<string>('FACEBOOK_APP_ID') ||
        'FACEBOOK_APP_ID_NOT_SET',
      clientSecret:
        configService.get<string>('FACEBOOK_APP_SECRET') ||
        'FACEBOOK_APP_SECRET_NOT_SET',
      callbackURL:
        configService.get<string>('FACEBOOK_CALLBACK_URL') ||
        'http://localhost:3001/auth/facebook/callback',
      scope: ['email'],
      profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    const user = {
      email: emails?.[0]?.value || null,
      displayName:
        `${name?.givenName || ''} ${name?.familyName || ''}`.trim() ||
        profile.displayName,
      avatar: photos?.[0]?.value || null,
      provider: 'facebook',
      providerId: profile.id,
    };
    done(null, user);
  }
}
