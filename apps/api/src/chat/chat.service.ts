import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageType } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async sendMessage(
    roomId: string,
    userId: string,
    content: string,
    type: MessageType = 'TEXT',
  ) {
    return this.prisma.message.create({
      data: {
        roomId,
        userId,
        content,
        type,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async getMessages(roomId: string, limit: number = 50) {
    return this.prisma.message.findMany({
      where: { roomId, isDeleted: false },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }
}
