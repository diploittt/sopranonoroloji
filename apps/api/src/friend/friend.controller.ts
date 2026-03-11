import {
    Controller, Get, Post, Patch, Delete,
    Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FriendService } from './friend.service';

@Controller('friend')
@UseGuards(AuthGuard('jwt'))
export class FriendController {
    constructor(private friendService: FriendService) { }

    /** Arkadaşlık isteği gönder */
    @Post('request')
    async sendRequest(@Request() req: any, @Body() body: { receiverId: string }) {
        const tenantId = req.user.tenantId || 'system';
        return this.friendService.sendRequest(req.user.userId, body.receiverId, tenantId);
    }

    /** İsteği kabul et */
    @Patch('accept/:id')
    async acceptRequest(@Request() req: any, @Param('id') id: string) {
        return this.friendService.acceptRequest(id, req.user.userId);
    }

    /** İsteği reddet */
    @Patch('reject/:id')
    async rejectRequest(@Request() req: any, @Param('id') id: string) {
        return this.friendService.rejectRequest(id, req.user.userId);
    }

    /** Arkadaşı sil */
    @Delete('remove/:id')
    async removeFriend(@Request() req: any, @Param('id') id: string) {
        return this.friendService.removeFriend(id, req.user.userId);
    }

    /** Arkadaş listesi */
    @Get('list')
    async getFriends(@Request() req: any) {
        const tenantId = req.user.tenantId || 'system';
        return this.friendService.getFriends(req.user.userId, tenantId);
    }

    /** Bekleyen istekler */
    @Get('requests')
    async getPendingRequests(@Request() req: any) {
        const tenantId = req.user.tenantId || 'system';
        return this.friendService.getPendingRequests(req.user.userId, tenantId);
    }

    /** İki kullanıcı arası arkadaşlık durumu */
    @Get('status/:userId')
    async getStatus(@Request() req: any, @Param('userId') userId: string) {
        return this.friendService.getStatus(req.user.userId, userId);
    }

    /** DM geçmişi */
    @Get('dm/:friendId')
    async getMessages(@Request() req: any, @Param('friendId') friendId: string) {
        const tenantId = req.user.tenantId || 'system';
        return this.friendService.getMessages(req.user.userId, friendId, tenantId);
    }

    /** DM gönder */
    @Post('dm/:friendId')
    async sendMessage(@Request() req: any, @Param('friendId') friendId: string, @Body() body: { content: string }) {
        const tenantId = req.user.tenantId || 'system';
        return this.friendService.sendMessage(req.user.userId, friendId, body.content, tenantId);
    }

    /** Okunmamış DM sayısı */
    @Get('unread-count')
    async getUnreadCount(@Request() req: any) {
        const tenantId = req.user.tenantId || 'system';
        return { count: await this.friendService.getUnreadCount(req.user.userId, tenantId) };
    }
}
