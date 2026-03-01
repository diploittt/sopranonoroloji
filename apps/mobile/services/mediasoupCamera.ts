/**
 * Mediasoup Camera Service for Mobile
 * 
 * Replicates the web's useMediasoup flow using the same socket events,
 * enabling cross-platform camera visibility between web and mobile users.
 * 
 * Socket events used:
 *   - media:getRouterRtpCapabilities → get RTP caps from server
 *   - media:createWebRtcTransport    → create send/recv transports
 *   - media:connectWebRtcTransport   → connect transport DTLS
 *   - media:produce                  → produce a video/audio track
 *   - media:consume                  → consume a remote producer
 *   - media:closeProducer            → close a producer
 *   - media:new-producer             → (incoming) new remote producer
 *   - media:producer-closed          → (incoming) remote producer closed
 */
import { Device, types as mediasoupTypes } from 'mediasoup-client';
import type { Socket } from 'socket.io-client';

// Note: WebRTC globals are already registered by @livekit/react-native in the app entry
// Do NOT call registerGlobals() here — it would conflict with LiveKit

export interface RemoteVideoStream {
    producerId: string;
    consumerId: string;
    userId: string;
    kind: 'audio' | 'video';
    stream: MediaStream;
    track: MediaStreamTrack;
}

class MediasoupCameraService {
    private device: Device | null = null;
    private sendTransport: mediasoupTypes.Transport | null = null;
    private recvTransport: mediasoupTypes.Transport | null = null;
    private videoProducer: mediasoupTypes.Producer | null = null;
    private consumers: Map<string, mediasoupTypes.Consumer> = new Map();
    private socket: Socket | null = null;
    private roomId: string = '';
    private initialized: boolean = false;

    private onRemoteStreamAdded?: (stream: RemoteVideoStream) => void;
    private onRemoteStreamRemoved?: (producerId: string) => void;

    // Socket request helper (emit + callback)
    private request(event: string, data?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.socket) return reject(new Error('No socket'));
            this.socket.emit(event, data, (response: any) => {
                if (response?.error) reject(new Error(response.error));
                else resolve(response);
            });
        });
    }

    async init(socket: Socket, roomId: string, callbacks?: {
        onRemoteStreamAdded?: (stream: RemoteVideoStream) => void;
        onRemoteStreamRemoved?: (producerId: string) => void;
    }) {
        // Force reinitialize if already initialized (handles reconnection)
        if (this.initialized) {
            this.destroy();
        }

        this.socket = socket;
        this.roomId = roomId;
        this.onRemoteStreamAdded = callbacks?.onRemoteStreamAdded;
        this.onRemoteStreamRemoved = callbacks?.onRemoteStreamRemoved;

        try {
            // 1. Get router RTP capabilities
            const rtpCapabilities = await this.request('media:getRouterRtpCapabilities', { roomId });
            if (!rtpCapabilities || rtpCapabilities.error) {
                console.error('[MediMobile] Failed to get RTP capabilities');
                return;
            }

            // 2. Create Device
            this.device = new Device();
            await this.device.load({ routerRtpCapabilities: rtpCapabilities });

            // 3. Create Send Transport
            const sendTransportInfo = await this.request('media:createWebRtcTransport', {
                roomId,
                direction: 'send',
            });
            if (sendTransportInfo.error) throw new Error(sendTransportInfo.error);

            this.sendTransport = this.device.createSendTransport({
                id: sendTransportInfo.id,
                iceParameters: sendTransportInfo.iceParameters,
                iceCandidates: sendTransportInfo.iceCandidates,
                dtlsParameters: sendTransportInfo.dtlsParameters,
            });

            this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                    await this.request('media:connectWebRtcTransport', {
                        transportId: this.sendTransport!.id,
                        dtlsParameters,
                    });
                    callback();
                } catch (err: any) {
                    errback(err);
                }
            });

            this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
                try {
                    const { id } = await this.request('media:produce', {
                        transportId: this.sendTransport!.id,
                        kind,
                        rtpParameters,
                        appData,
                    });
                    callback({ id });
                } catch (err: any) {
                    errback(err);
                }
            });

            // 4. Create Receive Transport
            const recvTransportInfo = await this.request('media:createWebRtcTransport', {
                roomId,
                direction: 'recv',
            });
            if (recvTransportInfo.error) throw new Error(recvTransportInfo.error);

            this.recvTransport = this.device.createRecvTransport({
                id: recvTransportInfo.id,
                iceParameters: recvTransportInfo.iceParameters,
                iceCandidates: recvTransportInfo.iceCandidates,
                dtlsParameters: recvTransportInfo.dtlsParameters,
            });

            this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                    await this.request('media:connectWebRtcTransport', {
                        transportId: this.recvTransport!.id,
                        dtlsParameters,
                    });
                    callback();
                } catch (err: any) {
                    errback(err);
                }
            });

            // 5. Listen for remote producers
            this.socket.on('media:new-producer', this.onNewProducer);
            this.socket.on('media:producer-closed', this.onProducerClosed);

            this.initialized = true;
            console.log('[MediMobile] Mediasoup initialized for room:', roomId);

        } catch (err) {
            console.error('[MediMobile] Init error:', err);
        }
    }

    // Produce video track through mediasoup (visible to web users)
    async produceVideo(videoTrack: MediaStreamTrack): Promise<string | null> {
        if (!this.sendTransport || !this.device) {
            console.warn('[MediMobile] Cannot produce video — transport not ready');
            return null;
        }

        try {
            const producer = await this.sendTransport.produce({
                track: videoTrack,
                encodings: [
                    { maxBitrate: 100000, scaleResolutionDownBy: 4 },
                    { maxBitrate: 300000, scaleResolutionDownBy: 2 },
                    { maxBitrate: 900000 },
                ],
                appData: { mediaType: 'video' },
            });

            this.videoProducer = producer;
            console.log('[MediMobile] Video producer created:', producer.id);

            producer.on('transportclose', () => {
                this.videoProducer = null;
            });

            producer.on('trackended', () => {
                this.closeVideoProducer();
            });

            return producer.id;
        } catch (err) {
            console.error('[MediMobile] produceVideo error:', err);
            return null;
        }
    }

    // Close video producer
    async closeVideoProducer() {
        if (this.videoProducer) {
            const producerId = this.videoProducer.id;
            this.videoProducer.close();
            this.videoProducer = null;

            try {
                await this.request('media:closeProducer', { producerId });
            } catch (err) {
                console.warn('[MediMobile] closeProducer server error:', err);
            }

            console.log('[MediMobile] Video producer closed');
        }
    }

    // Consume a remote producer
    private async consumeProducer(producerId: string, userId: string, kind: 'audio' | 'video') {
        if (!this.device || !this.recvTransport) return;

        // Skip if already consuming this producer
        for (const [, consumer] of this.consumers) {
            if (consumer.producerId === producerId) return;
        }

        try {
            const consumerData = await this.request('media:consume', {
                roomId: this.roomId,
                transportId: this.recvTransport.id,
                producerId,
                rtpCapabilities: this.device.rtpCapabilities,
            });

            if (consumerData.error) {
                console.error('[MediMobile] consume error:', consumerData.error);
                return;
            }

            const consumer = await this.recvTransport.consume({
                id: consumerData.id,
                producerId: consumerData.producerId,
                kind: consumerData.kind,
                rtpParameters: consumerData.rtpParameters,
            });

            this.consumers.set(consumer.id, consumer);

            // Resume consumer on server (consumer starts paused)
            await this.request('media:resumeConsumer', { consumerId: consumer.id });

            // Create MediaStream from consumer track
            const stream = new MediaStream([consumer.track]);

            if (kind === 'video') {
                this.onRemoteStreamAdded?.({
                    producerId,
                    consumerId: consumer.id,
                    userId,
                    kind,
                    stream,
                    track: consumer.track,
                });
            }

            console.log('[MediMobile] Consumer created:', kind, 'from', userId);
        } catch (err) {
            console.error('[MediMobile] consumeProducer error:', err);
        }
    }

    // Handle new remote producer
    private onNewProducer = async (data: { producerId: string; userId: string; kind: 'audio' | 'video' }) => {
        console.log('[MediMobile] New producer:', data.kind, 'from', data.userId);
        // Wait for device init
        let attempts = 0;
        while ((!this.device || !this.recvTransport) && attempts < 10) {
            await new Promise(r => setTimeout(r, 500));
            attempts++;
        }
        if (!this.device || !this.recvTransport) return;
        await this.consumeProducer(data.producerId, data.userId, data.kind);
    };

    // Handle producer closed
    private onProducerClosed = (data: { producerId: string; consumerId?: string }) => {
        console.log('[MediMobile] Producer closed:', data.producerId);
        if (data.consumerId) {
            const consumer = this.consumers.get(data.consumerId);
            if (consumer) {
                consumer.close();
                this.consumers.delete(data.consumerId);
            }
        }
        this.onRemoteStreamRemoved?.(data.producerId);
    };

    // Cleanup
    destroy() {
        this.closeVideoProducer();

        for (const consumer of this.consumers.values()) {
            consumer.close();
        }
        this.consumers.clear();

        this.sendTransport?.close();
        this.recvTransport?.close();
        this.sendTransport = null;
        this.recvTransport = null;
        this.device = null;

        if (this.socket) {
            this.socket.off('media:new-producer', this.onNewProducer);
            this.socket.off('media:producer-closed', this.onProducerClosed);
        }

        this.initialized = false;
        console.log('[MediMobile] Destroyed');
    }

    isInitialized() { return this.initialized; }
    hasVideoProducer() { return !!this.videoProducer; }
}

// Singleton instance
export const mediasoupCamera = new MediasoupCameraService();
