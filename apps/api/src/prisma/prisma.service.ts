import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig, Pool } from '@neondatabase/serverless';
import ws from 'ws';

// Use WebSocket constructor for Node.js (required for @neondatabase/serverless in non-edge environments)
neonConfig.webSocketConstructor = ws;

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_Cl3YEjuNFxV1@ep-solitary-brook-agbxat72-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaNeon({ connectionString });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
