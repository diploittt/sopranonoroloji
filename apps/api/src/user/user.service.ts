import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        tenantId,
        email,
      },
    });
  }

  async findByExternalId(
    tenantId: string,
    externalId: string,
  ): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        tenantId,
        externalId,
      },
    });
  }

  async create(data: any): Promise<User> {
    return this.prisma.user.create({ data });
  }
}
