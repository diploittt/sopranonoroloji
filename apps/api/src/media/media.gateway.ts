import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RouterManager } from './router.manager';
import { config } from './mediasoup.config';
import { types } from 'mediasoup';
import { PrismaService } from '../prisma/prisma.service';

// ─── Per-socket media state tracking ─────────────────────────
interface SocketMediaState {
  roomId: string | null;
  transportIds: Set<string>;
  producerIds: Set<string>;
  consumerIds: Set<string>;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class MediaGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('MediaGateway');

  // Global resource maps
  private transports: Map<string, types.WebRtcTransport> = new Map();
  private producers: Map<string, types.Producer> = new Map();
  private consumers: Map<string, types.Consumer> = new Map();

  // Per-socket tracking for disconnect cleanup
  private socketMedia: Map<string, SocketMediaState> = new Map();

  constructor(
    private routerManager: RouterManager,
    private prisma: PrismaService,
  ) { }

  // ─── Helpers ───────────────────────────────────────────────
  private getSocketState(socketId: string): SocketMediaState {
    let state = this.socketMedia.get(socketId);
    if (!state) {
      state = {
        roomId: null,
        transportIds: new Set(),
        producerIds: new Set(),
        consumerIds: new Set(),
      };
      this.socketMedia.set(socketId, state);
    }
    return state;
  }

  // ═══════════════════════════════════════════════════════════
  //  0) GET EXISTING PRODUCERS
  // ═══════════════════════════════════════════════════════════

  @SubscribeMessage('media:getProducers')
  async getProducers(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const producersList = [];

    // Iterate over all sockets to find producers in this room
    for (const [socketId, state] of this.socketMedia.entries()) {
      if (state.roomId === payload.roomId) {
        for (const producerId of state.producerIds) {
          const producer = this.producers.get(producerId);
          if (producer) {
            producersList.push({
              producerId: producer.id,
              userId: producer.appData.userId,
              kind: producer.kind,
              appData: producer.appData,
            });
          }
        }
      }
    }

    this.logger.log(
      `getProducers: found ${producersList.length} producers for room ${payload.roomId}`,
    );
    return producersList;
  }

  // ═══════════════════════════════════════════════════════════
  //  1) GET ROUTER RTP CAPABILITIES
  // ═══════════════════════════════════════════════════════════

  @SubscribeMessage('media:getRouterRtpCapabilities')
  async getRouterRtpCapabilities(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    try {
      const router = await this.routerManager.getRouter(payload.roomId);
      const state = this.getSocketState(client.id);
      state.roomId = payload.roomId;
      // Ensure the socket is in the Socket.IO room for media broadcasts
      client.join(payload.roomId);
      this.logger.log(
        `RTP Capabilities sent to ${client.id} for room ${payload.roomId} (joined room)`,
      );
      return router.rtpCapabilities;
    } catch (error) {
      this.logger.error(`getRouterRtpCapabilities error: ${error}`);
      return { error: 'Failed to get RTP capabilities' };
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  2) CREATE WEBRTC TRANSPORT
  // ═══════════════════════════════════════════════════════════

  @SubscribeMessage('media:createWebRtcTransport')
  async createWebRtcTransport(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; direction: 'send' | 'recv' },
  ) {
    try {
      const router = await this.routerManager.getRouter(payload.roomId);

      const transport = await router.createWebRtcTransport({
        listenInfos: config.mediasoup.webRtcTransport.listenInfos,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate:
          config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
      });

      // Track per-socket
      const state = this.getSocketState(client.id);
      state.roomId = payload.roomId;
      state.transportIds.add(transport.id);

      // Store globally
      this.transports.set(transport.id, transport);

      transport.on('routerclose', () => {
        this.transports.delete(transport.id);
        state.transportIds.delete(transport.id);
      });

      this.logger.log(
        `Transport created: ${transport.id} (${payload.direction}) for ${client.id}`,
      );

      return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      };
    } catch (error) {
      this.logger.error(`createWebRtcTransport error: ${error}`);
      return { error: 'Failed to create transport' };
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  3) CONNECT WEBRTC TRANSPORT (DTLS handshake)
  // ═══════════════════════════════════════════════════════════

  @SubscribeMessage('media:connectWebRtcTransport')
  async connectWebRtcTransport(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { transportId: string; dtlsParameters: types.DtlsParameters },
  ) {
    try {
      const transport = this.transports.get(payload.transportId);
      if (!transport) {
        return { error: 'Transport not found' };
      }

      await transport.connect({ dtlsParameters: payload.dtlsParameters });
      this.logger.log(
        `Transport connected: ${payload.transportId} for ${client.id}`,
      );
      return { connected: true };
    } catch (error) {
      this.logger.error(`connectWebRtcTransport error: ${error}`);
      return { error: 'Failed to connect transport' };
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  4) PRODUCE (audio/video)
  // ═══════════════════════════════════════════════════════════

  @SubscribeMessage('media:produce')
  async produce(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      transportId: string;
      kind: 'audio' | 'video';
      rtpParameters: any;
      appData: any;
    },
  ) {
    try {
      const transport = this.transports.get(payload.transportId);
      if (!transport) {
        return { error: 'Transport not found' };
      }

      // Package type check for video
      if (payload.kind === 'video') {
        const userId = client.data.user?.sub;
        if (userId) {
          const participant = await this.prisma.participant.findFirst({
            where: { userId, isActive: true },
            include: { room: { include: { tenant: true } } },
          });
          if (participant?.room?.tenant?.packageType === 'NO_CAMERA') {
            return {
              error: 'Video streaming not allowed for this package type',
            };
          }
        }
      }

      const producer = await transport.produce({
        kind: payload.kind,
        rtpParameters: payload.rtpParameters,
        appData: {
          ...payload.appData,
          userId: client.data.user?.sub,
          socketId: client.id,
        },
      });

      // Track
      const state = this.getSocketState(client.id);
      state.producerIds.add(producer.id);
      this.producers.set(producer.id, producer);

      producer.on('transportclose', () => {
        this.producers.delete(producer.id);
        state.producerIds.delete(producer.id);
        producer.close();
      });

      // ─── Broadcast new-producer to room ───
      if (state.roomId) {
        const roomSockets = await this.server.in(state.roomId).fetchSockets();
        this.logger.log(
          `Room ${state.roomId} has ${roomSockets.length} sockets: ${roomSockets.map(s => s.id).join(', ')}`,
        );
        this.logger.log(`Producer socket ${client.id} rooms: ${[...client.rooms].join(', ')}`);

        client.to(state.roomId).emit('media:new-producer', {
          producerId: producer.id,
          userId: client.data.user?.sub,
          kind: producer.kind,
          appData: producer.appData,
        });
        this.logger.log(
          `Producer created: ${producer.id} (${producer.kind}) → broadcast to ${state.roomId}`,
        );
      }

      return { id: producer.id };
    } catch (error) {
      this.logger.error(`produce error: ${error}`);
      return { error: 'Failed to produce' };
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  5) CONSUME
  // ═══════════════════════════════════════════════════════════

  @SubscribeMessage('media:consume')
  async consume(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      roomId: string;
      transportId: string;
      producerId: string;
      rtpCapabilities: any;
    },
  ) {
    try {
      const router = await this.routerManager.getRouter(payload.roomId);
      const transport = this.transports.get(payload.transportId);

      if (!transport) return { error: 'Transport not found' };

      if (
        !router.canConsume({
          producerId: payload.producerId,
          rtpCapabilities: payload.rtpCapabilities,
        })
      ) {
        return { error: 'Cannot consume' };
      }

      const consumer = await transport.consume({
        producerId: payload.producerId,
        rtpCapabilities: payload.rtpCapabilities,
        paused: true,
      });

      // Track
      const state = this.getSocketState(client.id);
      state.consumerIds.add(consumer.id);
      this.consumers.set(consumer.id, consumer);

      consumer.on('transportclose', () => {
        this.consumers.delete(consumer.id);
        state.consumerIds.delete(consumer.id);
        consumer.close();
      });

      consumer.on('producerclose', () => {
        // Notify the consuming client that this producer is gone
        client.emit('media:producer-closed', {
          producerId: payload.producerId,
          consumerId: consumer.id,
        });
        this.consumers.delete(consumer.id);
        state.consumerIds.delete(consumer.id);
        consumer.close();
      });

      this.logger.log(
        `Consumer created: ${consumer.id} for producer ${payload.producerId}`,
      );

      return {
        id: consumer.id,
        producerId: payload.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      };
    } catch (error) {
      this.logger.error(`consume error: ${error}`);
      return { error: 'Failed to consume' };
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  6) RESUME CONSUMER
  // ═══════════════════════════════════════════════════════════

  @SubscribeMessage('media:resumeConsumer')
  async resumeConsumer(@MessageBody() payload: { consumerId: string }) {
    const consumer = this.consumers.get(payload.consumerId);
    if (consumer) {
      await consumer.resume();
      return { resumed: true };
    }
    return { error: 'Consumer not found' };
  }

  // ═══════════════════════════════════════════════════════════
  //  7) CLOSE PRODUCER (client-initiated)
  // ═══════════════════════════════════════════════════════════

  @SubscribeMessage('media:closeProducer')
  async closeProducer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { producerId: string },
  ) {
    const producer = this.producers.get(payload.producerId);
    if (!producer) return { error: 'Producer not found' };

    const state = this.getSocketState(client.id);

    // Broadcast to room before closing
    if (state.roomId) {
      client.to(state.roomId).emit('media:producer-closed', {
        producerId: payload.producerId,
        userId: client.data.user?.sub,
      });
    }

    producer.close();
    this.producers.delete(payload.producerId);
    state.producerIds.delete(payload.producerId);

    this.logger.log(`Producer closed: ${payload.producerId}`);
    return { closed: true };
  }

  // ═══════════════════════════════════════════════════════════
  //  8) PAUSE PRODUCER (mute)
  // ═══════════════════════════════════════════════════════════

  @SubscribeMessage('media:pauseProducer')
  async pauseProducer(@MessageBody() payload: { producerId: string }) {
    const producer = this.producers.get(payload.producerId);
    if (!producer) return { error: 'Producer not found' };
    await producer.pause();
    return { paused: true };
  }

  // ═══════════════════════════════════════════════════════════
  //  9) RESUME PRODUCER (unmute)
  // ═══════════════════════════════════════════════════════════

  @SubscribeMessage('media:resumeProducer')
  async resumeProducer(@MessageBody() payload: { producerId: string }) {
    const producer = this.producers.get(payload.producerId);
    if (!producer) return { error: 'Producer not found' };
    await producer.resume();
    return { resumed: true };
  }

  // ═══════════════════════════════════════════════════════════
  //  DISCONNECT — full resource cleanup
  // ═══════════════════════════════════════════════════════════

  async handleDisconnect(client: Socket) {
    const state = this.socketMedia.get(client.id);
    if (!state) return;

    this.logger.log(`Cleaning up media for disconnected socket ${client.id}`);

    // Close all producers (triggers producerclose on consumers automatically)
    for (const producerId of state.producerIds) {
      const producer = this.producers.get(producerId);
      if (producer) {
        // Broadcast producer-closed to room
        if (state.roomId) {
          this.server.to(state.roomId).emit('media:producer-closed', {
            producerId,
            userId: client.data.user?.sub,
          });
        }
        producer.close();
        this.producers.delete(producerId);
      }
    }

    // Close all consumers
    for (const consumerId of state.consumerIds) {
      const consumer = this.consumers.get(consumerId);
      if (consumer) {
        consumer.close();
        this.consumers.delete(consumerId);
      }
    }

    // Close all transports
    for (const transportId of state.transportIds) {
      const transport = this.transports.get(transportId);
      if (transport) {
        transport.close();
        this.transports.delete(transportId);
      }
    }

    // Remove socket state
    this.socketMedia.delete(client.id);
    this.logger.log(`Media cleanup complete for ${client.id}`);
  }
}
