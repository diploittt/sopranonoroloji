import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParticipantRole } from '@prisma/client';

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  async addParticipant(
    roomId: string,
    userId: string,
    socketId: string,
    role: ParticipantRole = 'PARTICIPANT',
  ) {
    // Check if participant exists
    const existing = await this.prisma.participant.findUnique({
      where: {
        roomId_userId_sessionId: {
          roomId,
          userId,
          sessionId: '', // TODO: Handle session logic later, for now maybe just unique by room/user if session is not active?
          // But schema says unique(roomId, userId, sessionId).
          // If sessionId is nullable in schema? Yes `sessionId String?`.
          // But uniq constraint might fail if multiple nulls?
          // PostgreSQL allows multiple nulls in unique constraint usually.
          // Let's check schema: @@unique([roomId, userId, sessionId])
        },
      },
    });

    // Actually, for Phase 1/2, let's just create/update participant for the *current* active session of the room?
    // Or just treat "No Session" as the lobby.
    // Let's keep it simple: Create a participant entry. If checking uniqueness is hard with nulls, we manage it.

    // Better: Update existing "active" participant or create new.
    // Let's find any active participant for this user in this room.
    const activeParticipant = await this.prisma.participant.findFirst({
      where: {
        roomId,
        userId,
        isActive: true,
      },
    });

    if (activeParticipant) {
      return this.prisma.participant.update({
        where: { id: activeParticipant.id },
        data: { socketId, isActive: true, joinedAt: new Date() },
      });
    }

    return this.prisma.participant.create({
      data: {
        roomId,
        userId,
        socketId,
        role,
        isActive: true,
      },
      include: {
        user: true,
      },
    });
  }

  async removeParticipant(socketId: string) {
    // Find participant by socketId
    const participant = await this.prisma.participant.findFirst({
      where: { socketId, isActive: true },
    });

    if (participant) {
      return this.prisma.participant.update({
        where: { id: participant.id },
        data: { isActive: false, leftAt: new Date(), socketId: null },
      });
    }
    return null;
  }

  async getActiveParticipants(roomId: string) {
    return this.prisma.participant.findMany({
      where: { roomId, isActive: true },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
  }
}
