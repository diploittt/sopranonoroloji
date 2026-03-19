import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import * as mediasoup from 'mediasoup';
import { types } from 'mediasoup';
import { config } from './mediasoup.config';

@Injectable()
export class WorkerManager implements OnModuleInit, OnModuleDestroy {
  private workers: types.Worker[] = [];
  private nextWorkerIndex = 0;
  private logger = new Logger('WorkerManager');

  async onModuleInit() {
    this.logger.log(
      `Starting ${config.mediasoup.numWorkers} Mediasoup Workers...`,
    );
    for (let i = 0; i < config.mediasoup.numWorkers; i++) {
      // @ts-ignore
      const worker = await mediasoup.createWorker({
        logLevel: config.mediasoup.worker.logLevel as types.WorkerLogLevel,
        logTags: config.mediasoup.worker.logTags,
        rtcMinPort: config.mediasoup.worker.rtcMinPort,
        rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
      });

      worker.on('died', () => {
        this.logger.error(`Worker ${worker.pid} died, but preventing server exit for stability.`);
        // process.exit(1); // CRASH PREVENTED
        
        // Opsiyonel: Çöken worker'ı yeniden canlandırmayı deneyebiliriz
        setTimeout(async () => {
          try {
            const newWorker = await mediasoup.createWorker({
              logLevel: config.mediasoup.worker.logLevel as types.WorkerLogLevel,
              logTags: config.mediasoup.worker.logTags,
              rtcMinPort: config.mediasoup.worker.rtcMinPort,
              rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
            });
            newWorker.on('died', () => this.logger.error(`Recreated Worker ${newWorker.pid} also died!`));
            const idx = this.workers.indexOf(worker);
            if (idx !== -1) this.workers[idx] = newWorker;
          } catch (e) {
            this.logger.error('Failed to recreate died worker', e);
          }
        }, 3000);
      });

      this.workers.push(worker);
    }
    this.logger.log('All Mediasoup Workers started.');
  }

  async onModuleDestroy() {
    this.workers.forEach((worker) => worker.close());
  }

  getWorker(): types.Worker {
    const worker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    return worker;
  }
}
