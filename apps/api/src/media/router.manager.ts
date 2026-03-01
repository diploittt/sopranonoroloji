import { Injectable, Logger } from '@nestjs/common';
import { WorkerManager } from './worker.manager';
import { types } from 'mediasoup';
import { config } from './mediasoup.config';

@Injectable()
export class RouterManager {
  private routers: Map<string, types.Router> = new Map(); // roomId -> Router
  private logger = new Logger('RouterManager');

  constructor(private workerManager: WorkerManager) {}

  async getRouter(roomId: string): Promise<types.Router> {
    let router = this.routers.get(roomId);
    if (!router) {
      router = await this.workerManager.getWorker().createRouter({
        mediaCodecs: config.mediasoup.router.mediaCodecs,
      });

      this.routers.set(roomId, router);

      router.on('workerclose', () => {
        this.routers.delete(roomId);
        this.logger.log(`Router closed for room ${roomId}`);
      });

      this.logger.log(`Created new Router for room ${roomId}`);
    }
    return router;
  }

  async closeRouter(roomId: string) {
    const router = this.routers.get(roomId);
    if (router) {
      router.close();
    }
  }
}
