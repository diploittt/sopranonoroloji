import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RoleGuard } from '../common/guards/role.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { BanType, BanDuration } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RoleGuard)
export class AdminController {
  constructor(private adminService: AdminService) { }

  // ═══════════════════════════════════════════════════════════
  //  0) TENANTS / CUSTOMERS (SaaS)
  // ═══════════════════════════════════════════════════════════

  @Get('customers')
  @Roles('owner', 'superadmin', 'admin')
  async getCustomers(@Req() req: any) {
    return this.adminService.getCustomers();
  }

  @Post('customers')
  @Roles('admin', 'owner', 'superadmin')
  async provisionCustomer(@Req() req: any, @Body() body: any) {
    return this.adminService.provisionCustomer(req.user.userId, body, req.ip);
  }

  @Patch('customers/:id/status')
  @Roles('admin', 'owner', 'superadmin')
  async toggleCustomerStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.adminService.toggleCustomerStatus(id, body.status);
  }

  @Patch('customers/:id')
  @Roles('admin', 'owner', 'superadmin')
  async updateCustomer(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.adminService.updateCustomer(req.user.userId, id, body, req.ip);
  }

  @Get('customers/system-tenant')
  @Roles('admin', 'owner', 'superadmin')
  async getSystemTenant() {
    return this.adminService.getSystemTenant();
  }

  @Get('customers/:id/rooms')
  @Roles('admin', 'owner', 'superadmin')
  async getCustomerRooms(@Param('id') id: string) {
    return this.adminService.getCustomerRooms(id);
  }

  @Get('customers/:id/members')
  @Roles('admin', 'owner', 'superadmin')
  async getCustomerMembers(@Param('id') id: string) {
    return this.adminService.getCustomerMembers(id);
  }

  @Post('customers/:id/godmaster-token')
  @Roles('admin', 'owner', 'superadmin')
  async getGodmasterToken(@Param('id') id: string) {
    return this.adminService.generateGodmasterToken(id);
  }

  @Post('customers/:id/reset-admin-password')
  @Roles('admin', 'owner', 'superadmin')
  async resetCustomerAdminPassword(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { password: string },
  ) {
    return this.adminService.resetCustomerAdminPassword(
      req.user.userId,
      id,
      body.password,
      req.ip,
    );
  }

  @Post('customers/:id/payment-reminder')
  @Roles('admin', 'owner', 'superadmin')
  async sendPaymentReminder(@Param('id') id: string) {
    return this.adminService.sendPaymentReminder(id);
  }

  @Post('announcement')
  @Roles('admin', 'owner', 'superadmin')
  async sendAnnouncement(
    @Req() req: any,
    @Body() body: { message: string },
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new Error('Tenant bilgisi bulunamadı');
    return this.adminService.sendAnnouncement(tenantId, body.message);
  }

  @Get('stats')
  @Roles('admin', 'owner', 'superadmin')
  async getStats() {
    return this.adminService.getAdminStats();
  }

  @Get('announcements')
  @Roles('admin', 'owner', 'superadmin')
  async getAnnouncements() {
    return this.adminService.getRecentAnnouncements();
  }

  @Delete('announcements/:id')
  @Roles('admin', 'owner', 'superadmin')
  async deleteAnnouncement(@Param('id') id: string) {
    return this.adminService.deleteAnnouncement(id);
  }

  @Patch('announcements/:id')
  @Roles('admin', 'owner', 'superadmin')
  async updateAnnouncement(
    @Param('id') id: string,
    @Body() body: { message: string },
  ) {
    return this.adminService.updateAnnouncement(id, body.message);
  }

  @Get('overdue-tenants')
  @Roles('admin', 'owner', 'superadmin')
  async getOverdueTenants() {
    return this.adminService.getOverdueTenants();
  }

  @Post('customers/:id/reset-godmaster-password')
  @Roles('admin', 'owner', 'superadmin')
  async resetGodmasterPassword(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { password: string },
  ) {
    return this.adminService.resetGodmasterPassword(
      req.user.userId,
      id,
      body.password,
      req.ip,
    );
  }

  @Delete('customers/:id')
  @Roles('admin', 'owner', 'superadmin')
  async deleteCustomer(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deleteCustomer(req.user.userId, id, req.ip);
  }

  // ═══════════════════════════════════════════════════════════
  //  1) USERS
  // ═══════════════════════════════════════════════════════════

  @Get('users')
  @Roles('admin', 'owner', 'superadmin')
  async getUsers(@Req() req: any, @Query() query: any) {
    return this.adminService.getUsers(req.user.tenantId, {
      role: query.role,
      search: query.search,
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      requesterRole: req.user.role,
    });
  }

  @Get('members')
  @Roles('admin', 'superadmin', 'owner') // Allow all admin types
  // @UseGuards(JwtAuthGuard) // Already at controller level
  async getMembers(@Query() query: any) {
    return this.adminService.getMembers({
      q: query.q,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 50,
    });
  }

  @Post('members')
  @Roles('admin', 'owner', 'superadmin')
  async createMember(@Req() req: any, @Body() body: any) {
    return this.adminService.createMember(req.user.tenantId, body);
  }

  @Get('users/:id')
  @Roles('admin')
  async getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id')
  @Roles('admin')
  async updateUser(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.adminService.updateUser(
      req.user.userId,
      id,
      body,
      req.user.role,
      req.ip,
    );
  }

  @Delete('users/:id')
  @Roles('admin', 'owner', 'superadmin')
  async deleteUser(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deleteUser(req.user.userId, id, req.ip);
  }

  @Patch('users/:id/balance')
  @Roles('admin', 'owner', 'superadmin')
  async updateUserBalance(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { amount: number; operation: 'add' | 'subtract' | 'set' },
  ) {
    return this.adminService.updateUserBalance(
      req.user.userId,
      id,
      body.amount,
      body.operation,
      req.ip,
    );
  }

  // ─── Toplu Jeton Dağıtımı ─────────────────────────────
  @Post('users/bulk-balance')
  @Roles('admin', 'owner', 'superadmin')
  async bulkAddBalance(@Req() req: any, @Body() body: { amount: number; targetRoles: string[] }) {
    return this.adminService.bulkAddBalance(req.user.userId, body.amount, body.targetRoles || [], req.ip);
  }

  // ─── Jeton Sipariş Yönetimi ───────────────────────────
  @Get('token-orders')
  @Roles('admin', 'owner', 'superadmin')
  async getTokenOrders(@Query('status') status?: string) {
    return this.adminService.getTokenOrders(status);
  }

  @Patch('token-orders/:id')
  @Roles('admin', 'owner', 'superadmin')
  async processTokenOrder(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; adminNote?: string },
  ) {
    return this.adminService.processTokenOrder(id, body.action, req.user.userId, body.adminNote, req.ip);
  }

  // ─── Jeton Paketleri ──────────────────────────────────
  @Get('token-packages')
  @Roles('admin', 'owner', 'superadmin')
  async getTokenPackages(@Req() req: any) {
    return this.adminService.getTokenPackages(req.user.tenantId);
  }

  @Post('token-packages')
  @Roles('admin', 'owner', 'superadmin')
  async createTokenPackage(@Req() req: any, @Body() body: any) {
    return this.adminService.createTokenPackage(req.user.tenantId, body);
  }

  @Patch('token-packages/:id')
  @Roles('admin', 'owner', 'superadmin')
  async updateTokenPackage(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateTokenPackage(id, body);
  }

  @Delete('token-packages/:id')
  @Roles('admin', 'owner', 'superadmin')
  async deleteTokenPackage(@Param('id') id: string) {
    return this.adminService.deleteTokenPackage(id);
  }

  // ═══════════════════════════════════════════════════════════
  //  2) ROOMS
  // ═══════════════════════════════════════════════════════════

  @Get('rooms')
  @Roles('admin')
  async getRooms(@Req() req: any) {
    return this.adminService.getRooms(req.user.tenantId);
  }

  @Post('rooms')
  @Roles('admin')
  async createRoom(
    @Req() req: any,
    @Body()
    body: {
      name: string;
      slug?: string;
      password?: string;
      announcement?: string;
      maxParticipants?: number;
    },
  ) {
    return this.adminService.createRoom(
      req.user.userId,
      req.user.tenantId,
      body,
      req.ip,
    );
  }

  @Patch('rooms/:id')
  @Roles('admin')
  async updateRoom(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.adminService.updateRoom(req.user.userId, id, body, req.ip);
  }

  @Delete('rooms/:id')
  @Roles('admin')
  async deleteRoom(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deleteRoom(req.user.userId, id, req.ip);
  }

  @Post('rooms/:id/close')
  @Roles('admin', 'owner', 'superadmin')
  async closeRoom(@Req() req: any, @Param('id') id: string) {
    // In a real app, this might trigger the socket close event via an event bus or direct gateway injection
    // For now, we will handle the DB part and assume Gateway handles the live connections via admin:roomAction 'close_room'
    // BUT, if the Test Plan calls this API, we should try to close the room.
    return this.adminService.closeRoom(req.user.userId, id, req.ip);
  }

  // ═══════════════════════════════════════════════════════════
  //  3) BANS
  // ═══════════════════════════════════════════════════════════

  @Get('bans')
  @Roles('superadmin')
  async getBans(@Req() req: any, @Query() query: any) {
    return this.adminService.getBans(req.user.tenantId, {
      type: query.type as BanType,
      active:
        query.active === 'true'
          ? true
          : query.active === 'false'
            ? false
            : undefined,
    });
  }

  @Post('bans')
  @Roles('moderator')
  async createBan(
    @Req() req: any,
    @Body()
    body: {
      userId: string;
      type?: BanType;
      duration?: BanDuration;
      reason?: string;
      ip?: string;
    },
  ) {
    return this.adminService.createBan(
      req.user.userId,
      req.user.tenantId,
      body,
      req.ip,
    );
  }

  @Delete('bans/:id')
  @Roles('superadmin')
  async removeBan(@Req() req: any, @Param('id') id: string) {
    return this.adminService.removeBan(req.user.userId, id, req.ip);
  }

  // ═══════════════════════════════════════════════════════════
  //  4) IP BANS
  // ═══════════════════════════════════════════════════════════

  @Get('ipbans')
  @Roles('superadmin')
  async getIpBans(@Req() req: any) {
    return this.adminService.getIpBans(req.user.tenantId);
  }

  @Post('ipbans')
  @Roles('superadmin')
  async createIpBan(
    @Req() req: any,
    @Body() body: { ip: string; reason?: string },
  ) {
    return this.adminService.createIpBan(
      req.user.userId,
      req.user.tenantId,
      body,
      req.ip,
    );
  }

  @Delete('ipbans/:id')
  @Roles('superadmin')
  async removeIpBan(@Req() req: any, @Param('id') id: string) {
    return this.adminService.removeIpBan(req.user.userId, id, req.ip);
  }

  // ═══════════════════════════════════════════════════════════
  //  5) AUDIT LOGS
  // ═══════════════════════════════════════════════════════════

  @Get('audit-logs')
  @Roles('admin')
  async getAuditLogs(@Req() req: any, @Query() query: any) {
    return this.adminService.getAuditLogs(req.user.tenantId, {
      event: query.event,
      adminId: query.adminId,
      userId: query.userId,
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      excludeSystemEvents: query.excludeSystemEvents === 'true',
    });
  }

  @Get('system-logs')
  @Roles('owner', 'superadmin', 'admin')
  async getSystemLogs(@Req() req: any, @Query() query: any) {
    return this.adminService.getSystemLogs(req.user.tenantId, {
      event: query.event,
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  6) WORD FILTERS
  // ═══════════════════════════════════════════════════════════

  @Get('words')
  @Roles('superadmin')
  async getWordFilters(@Req() req: any) {
    return this.adminService.getWordFilters(req.user.tenantId);
  }

  @Post('words')
  @Roles('superadmin')
  async createWordFilter(
    @Req() req: any,
    @Body() body: { badWord: string; replacement?: string },
  ) {
    return this.adminService.createWordFilter(
      req.user.userId,
      req.user.tenantId,
      body,
      req.ip,
    );
  }

  @Delete('words/:id')
  @Roles('superadmin')
  async removeWordFilter(@Req() req: any, @Param('id') id: string) {
    return this.adminService.removeWordFilter(req.user.userId, id, req.ip);
  }

  // ═══════════════════════════════════════════════════════════
  //  7) SYSTEM SETTINGS
  // ═══════════════════════════════════════════════════════════

  @Get('settings')
  @Roles('owner', 'admin', 'superadmin')
  async getSettings(@Req() req: any) {
    return this.adminService.getSettings(req.user.tenantId);
  }

  @Patch('settings')
  @Roles('owner', 'admin', 'superadmin')
  async updateSettings(@Req() req: any, @Body() body: Record<string, any>) {
    return this.adminService.updateSettings(
      req.user.userId,
      req.user.tenantId,
      body,
      req.ip,
    );
  }

  // ─── İLETİŞİM MESAJLARI ──────────────────────

  @Get('contact-messages')
  async getContactMessages(@Query() query: any) {
    return this.adminService.getContactMessages({
      unreadOnly: query.unreadOnly === 'true',
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 50,
    });
  }

  @Patch('contact-messages/:id/read')
  async markMessageRead(@Param('id') id: string) {
    return this.adminService.markMessageRead(id);
  }

  @Delete('contact-messages/:id')
  async deleteContactMessage(@Param('id') id: string) {
    return this.adminService.deleteContactMessage(id);
  }

  // ── SİPARİŞ YÖNETİMİ ──

  @Get('orders/pending-count')
  async getPendingOrderCount() {
    return this.adminService.getPendingOrderCount();
  }

  @Get('orders')
  async getOrders(@Query() query: any) {
    return this.adminService.getOrders({
      status: query.status,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 50,
    });
  }

  @Patch('orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
    @Req() req: any,
  ) {
    return this.adminService.updateOrderStatus(id, body.status, body.notes, req.user?.id);
  }

  @Delete('orders/:id')
  async deleteOrder(@Param('id') id: string) {
    return this.adminService.deleteOrder(id);
  }
}
