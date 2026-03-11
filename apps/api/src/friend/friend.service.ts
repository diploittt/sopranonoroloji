import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FriendService {
    constructor(private prisma: PrismaService) { }

    /** Arkadaşlık isteği gönder */
    async sendRequest(senderId: string, receiverId: string, tenantId: string) {
        if (senderId === receiverId) throw new BadRequestException('Kendinize istek gönderemezsiniz');

        // Zaten var mı kontrol et (her iki yön)
        const existing = await this.prisma.friendship.findFirst({
            where: {
                OR: [
                    { senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId },
                ],
            },
        });

        if (existing) {
            if (existing.status === 'ACCEPTED') throw new BadRequestException('Zaten arkadaşsınız');
            if (existing.status === 'PENDING') throw new BadRequestException('Zaten bekleyen bir istek var');
            if (existing.status === 'BLOCKED') throw new BadRequestException('Bu kullanıcı engellenmiş');
            // REJECTED ise tekrar gönderebilir
            return this.prisma.friendship.update({
                where: { id: existing.id },
                data: { senderId, receiverId, status: 'PENDING', updatedAt: new Date() },
                include: { sender: { select: { id: true, displayName: true, avatarUrl: true } }, receiver: { select: { id: true, displayName: true, avatarUrl: true } } },
            });
        }

        return this.prisma.friendship.create({
            data: { tenantId, senderId, receiverId, status: 'PENDING' },
            include: { sender: { select: { id: true, displayName: true, avatarUrl: true } }, receiver: { select: { id: true, displayName: true, avatarUrl: true } } },
        });
    }

    /** İsteği kabul et */
    async acceptRequest(friendshipId: string, userId: string) {
        const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
        if (!friendship) throw new NotFoundException('İstek bulunamadı');
        if (friendship.receiverId !== userId) throw new BadRequestException('Bu isteği kabul etme yetkiniz yok');
        if (friendship.status !== 'PENDING') throw new BadRequestException('İstek zaten işlenmiş');

        return this.prisma.friendship.update({
            where: { id: friendshipId },
            data: { status: 'ACCEPTED' },
            include: { sender: { select: { id: true, displayName: true, avatarUrl: true } }, receiver: { select: { id: true, displayName: true, avatarUrl: true } } },
        });
    }

    /** İsteği reddet */
    async rejectRequest(friendshipId: string, userId: string) {
        const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
        if (!friendship) throw new NotFoundException('İstek bulunamadı');
        if (friendship.receiverId !== userId) throw new BadRequestException('Bu isteği reddetme yetkiniz yok');

        return this.prisma.friendship.update({
            where: { id: friendshipId },
            data: { status: 'REJECTED' },
        });
    }

    /** Arkadaşı sil */
    async removeFriend(friendshipId: string, userId: string) {
        const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
        if (!friendship) throw new NotFoundException('Arkadaşlık bulunamadı');
        if (friendship.senderId !== userId && friendship.receiverId !== userId) {
            throw new BadRequestException('Bu arkadaşlığı silme yetkiniz yok');
        }

        return this.prisma.friendship.delete({ where: { id: friendshipId } });
    }

    /** Arkadaş listesi */
    async getFriends(userId: string, tenantId: string) {
        const friendships = await this.prisma.friendship.findMany({
            where: {
                tenantId,
                status: 'ACCEPTED',
                OR: [{ senderId: userId }, { receiverId: userId }],
            },
            include: {
                sender: { select: { id: true, displayName: true, avatarUrl: true, isOnline: true, lastSeenAt: true, role: true } },
                receiver: { select: { id: true, displayName: true, avatarUrl: true, isOnline: true, lastSeenAt: true, role: true } },
            },
            orderBy: { updatedAt: 'desc' },
        });

        return friendships.map(f => ({
            friendshipId: f.id,
            friend: f.senderId === userId ? f.receiver : f.sender,
            since: f.updatedAt,
        }));
    }

    /** Bekleyen istekler (gelen) */
    async getPendingRequests(userId: string, tenantId: string) {
        return this.prisma.friendship.findMany({
            where: { tenantId, receiverId: userId, status: 'PENDING' },
            include: {
                sender: { select: { id: true, displayName: true, avatarUrl: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /** İki kullanıcı arası durum */
    async getStatus(userId: string, otherUserId: string) {
        const friendship = await this.prisma.friendship.findFirst({
            where: {
                OR: [
                    { senderId: userId, receiverId: otherUserId },
                    { senderId: otherUserId, receiverId: userId },
                ],
            },
        });

        if (!friendship) return { status: 'none', friendshipId: null };
        return { status: friendship.status.toLowerCase(), friendshipId: friendship.id, isSender: friendship.senderId === userId };
    }

    /** DM geçmişi */
    async getMessages(userId: string, friendId: string, tenantId: string, limit = 50) {
        // Arkadaş mı kontrol et
        const friendship = await this.prisma.friendship.findFirst({
            where: {
                tenantId,
                status: 'ACCEPTED',
                OR: [
                    { senderId: userId, receiverId: friendId },
                    { senderId: friendId, receiverId: userId },
                ],
            },
        });
        if (!friendship) throw new BadRequestException('Bu kullanıcı arkadaşınız değil');

        // Okunmamışları okundu yap
        await this.prisma.directMessage.updateMany({
            where: { senderId: friendId, receiverId: userId, isRead: false },
            data: { isRead: true },
        });

        return this.prisma.directMessage.findMany({
            where: {
                tenantId,
                OR: [
                    { senderId: userId, receiverId: friendId },
                    { senderId: friendId, receiverId: userId },
                ],
            },
            include: {
                sender: { select: { id: true, displayName: true, avatarUrl: true } },
            },
            orderBy: { createdAt: 'asc' },
            take: limit,
        });
    }

    /** DM gönder */
    async sendMessage(senderId: string, receiverId: string, content: string, tenantId: string) {
        // Arkadaş mı kontrol et
        const friendship = await this.prisma.friendship.findFirst({
            where: {
                tenantId,
                status: 'ACCEPTED',
                OR: [
                    { senderId: senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId },
                ],
            },
        });
        if (!friendship) throw new BadRequestException('Bu kullanıcı arkadaşınız değil');

        return this.prisma.directMessage.create({
            data: { tenantId, senderId, receiverId, content },
            include: {
                sender: { select: { id: true, displayName: true, avatarUrl: true } },
            },
        });
    }

    /** Okunmamış DM sayısı */
    async getUnreadCount(userId: string, tenantId: string) {
        return this.prisma.directMessage.count({
            where: { tenantId, receiverId: userId, isRead: false },
        });
    }
}
