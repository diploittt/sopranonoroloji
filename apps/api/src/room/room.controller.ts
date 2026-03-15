import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';

@Controller('rooms')
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
    private readonly prisma: PrismaService,
  ) { }

  // Public endpoint — tenant giriş sayfası için (auth gerektirmez)
  @Get('by-access/:code')
  async findByAccessCode(@Param('code') code: string) {
    return this.roomService.findByAccessCode(code);
  }

  // Public endpoint — embed sayfası için slug ile tenant bilgisi döner
  @Get('by-slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.roomService.findTenantBySlug(slug);
  }

  // Public endpoint — ana sayfa için system odalarını döndür (auth gerektirmez)
  @Get('public')
  async getPublicRooms() {
    return this.roomService.findAllPublicSystem();
  }

  // Public endpoint — ana sayfa kullanıcı kartı için kayıtlı üyeleri döndür
  @Get('public/users')
  async getPublicUsers() {
    return this.roomService.getPublicUsers();
  }

  // Public endpoint — anasayfa Müşteri Platformları + Referanslar için aktif tenant listesi
  @Get('public/tenants')
  async getPublicTenants() {
    return this.roomService.getPublicTenants();
  }

  // Kullanıcı beğen
  @UseGuards(AuthGuard('jwt'))
  @Post('public/like')
  async likeUser(@Request() req: any, @Body() body: { likedId: string }) {
    return this.roomService.likeUser(req.user.sub, body.likedId);
  }

  // Beğeni geri al
  @UseGuards(AuthGuard('jwt'))
  @Delete('public/like/:userId')
  async unlikeUser(@Request() req: any, @Param('userId') userId: string) {
    return this.roomService.unlikeUser(req.user.sub, userId);
  }

  // Kullanıcının verdiği beğenileri getir
  @UseGuards(AuthGuard('jwt'))
  @Get('public/my-likes')
  async getMyLikes(@Request() req: any) {
    return this.roomService.getMyLikes(req.user.sub);
  }

  // Okunmamış bildirimleri getir
  @UseGuards(AuthGuard('jwt'))
  @Get('public/notifications')
  async getNotifications(@Request() req: any) {
    return this.roomService.getNotifications(req.user.sub);
  }

  // Bildirimleri okundu işaretle
  @UseGuards(AuthGuard('jwt'))
  @Post('public/notifications/read')
  async markNotificationsRead(@Request() req: any) {
    return this.roomService.markNotificationsRead(req.user.sub);
  }

  // Using 'jwt' guard implies user is logged in
  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Request() req: any, @Body() createRoomDto: CreateRoomDto) {
    // req.user should be populated by JwtStrategy
    return this.roomService.create(req.user.tenantId, createRoomDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async findAll(@Request() req: any, @Query('tenantSlug') tenantSlug?: string) {
    // tenantSlug override: ana sayfa her zaman system odalarını gösterebilsin
    let tenantId = req.user.tenantId;
    if (tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (tenant) tenantId = tenant.id;
    }
    return this.roomService.findAll(tenantId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.roomService.findOne(req.user.tenantId, id);
  }
}
