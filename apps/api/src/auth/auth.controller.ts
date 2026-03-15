import {
  Controller,
  Request,
  Post,
  Get,
  Body,
  UseGuards,
  Res,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import * as express from 'express';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('login')
  async login(@Body() req: any) {
    const tenantId = req.tenantId || 'default';
    const identifier = req.username || req.email; // Allow both
    const user = await this.authService.validateUser(
      tenantId,
      identifier,
      req.password,
    );
    if (!user) throw new UnauthorizedException('E-posta veya şifre hatalı.');
    return this.authService.login(user);
  }

  // ───── Guest Login ─────
  @Post('guest')
  async guestLogin(
    @Body() body: { username: string; avatar?: string; gender?: string; tenantId?: string },
  ) {
    if (!body.username || body.username.trim().length < 2) {
      throw new BadRequestException('Kullanıcı adı en az 2 karakter olmalıdır.');
    }
    return this.authService.guestLogin(
      body.username.trim(),
      body.avatar,
      body.gender,
      body.tenantId,
    );
  }

  // ───── Register ─────
  @Post('register')
  async register(
    @Body()
    body: {
      email: string;
      username: string;
      password: string;
      avatar?: string;
      gender?: string;
      tenantId?: string;
    },
  ) {
    return this.authService.register(body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('update-profile')
  async updateProfile(
    @Request() req: any,
    @Body()
    body: {
      displayName?: string;
      avatar?: string;
      email?: string;
      password?: string;
    },
  ) {
    return this.authService.updateProfile(req.user, body);
  }

  // ───── API Key Auth ─────
  @UseGuards(AuthGuard('api-key'))
  @Post('token')
  async getToken(@Request() req: any) {
    return { message: 'Authenticated', tenant: req.user };
  }

  // ═══════════════════════════════════════════════
  //  GOOGLE OAuth
  // ═══════════════════════════════════════════════
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: any, @Res() res: express.Response) {
    const result = await this.authService.socialLogin(req.user);
    res.redirect(
      `${FRONTEND_URL}/auth/callback?token=${result.access_token}&user=${encodeURIComponent(JSON.stringify(result.user))}`,
    );
  }

  // ═══════════════════════════════════════════════
  //  FACEBOOK OAuth
  // ═══════════════════════════════════════════════
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuth() {
    // Guard redirects to Facebook
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookAuthCallback(@Req() req: any, @Res() res: express.Response) {
    const result = await this.authService.socialLogin(req.user);
    res.redirect(
      `${FRONTEND_URL}/auth/callback?token=${result.access_token}&user=${encodeURIComponent(JSON.stringify(result.user))}`,
    );
  }

  // ═══════════════════════════════════════════════
  //  APPLE OAuth (simplified — uses POST from Apple)
  // ═══════════════════════════════════════════════
  @Get('apple')
  async appleAuth(@Res() res: express.Response) {
    // Apple Sign In uses a different flow — redirect to Apple's auth page
    const clientId = process.env.APPLE_CLIENT_ID || 'APPLE_CLIENT_ID_NOT_SET';
    const redirectUri = encodeURIComponent(
      process.env.APPLE_CALLBACK_URL ||
      'http://localhost:3001/auth/apple/callback',
    );
    const appleAuthUrl = `https://appleid.apple.com/auth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=name%20email&response_mode=form_post`;
    res.redirect(appleAuthUrl);
  }

  @Post('apple/callback')
  async appleAuthCallback(@Body() body: any, @Res() res: express.Response) {
    // Apple sends data via POST with id_token
    try {
      const result = await this.authService.socialLogin({
        email: body.email || null,
        displayName: body.user
          ? JSON.parse(body.user)?.name?.firstName || 'Apple User'
          : 'Apple User',
        avatar: null,
        provider: 'apple',
        providerId: body.sub || `apple_${Date.now()}`,
      });
      res.redirect(
        `${FRONTEND_URL}/auth/callback?token=${result.access_token}&user=${encodeURIComponent(JSON.stringify(result.user))}`,
      );
    } catch (e) {
      res.redirect(`${FRONTEND_URL}?error=apple_auth_failed`);
    }
  }
}
