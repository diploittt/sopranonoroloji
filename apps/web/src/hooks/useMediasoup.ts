"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Device, types as mediasoupTypes } from 'mediasoup-client';
import type { Socket } from 'socket.io-client';

// ─── Types ──────────────────────────────────────────────
interface RemoteStream {
    producerId: string;
    consumerId: string;
    userId: string;
    kind: 'audio' | 'video';
    stream: MediaStream;
    track: MediaStreamTrack;
}

interface UseMediasoupProps {
    socket: Socket | null;
    roomId: string; // scoped room ID or slug
    enabled: boolean; // only init when connected
}

// ─── Hook ───────────────────────────────────────────────
export function useMediasoup({ socket, roomId, enabled }: UseMediasoupProps) {
    const deviceRef = useRef<Device | null>(null);
    const sendTransportRef = useRef<mediasoupTypes.Transport | null>(null);
    const recvTransportRef = useRef<mediasoupTypes.Transport | null>(null);
    const videoProducerRef = useRef<mediasoupTypes.Producer | null>(null);
    const audioProducerRef = useRef<mediasoupTypes.Producer | null>(null);
    const consumersRef = useRef<Map<string, mediasoupTypes.Consumer>>(new Map());
    const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

    const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
    const [isProducing, setIsProducing] = useState(false);
    const initializedRef = useRef(false);
    const initInProgressRef = useRef(false); // ★ Init sırasında ikinci çağrıyı önle
    const audioProducingRef = useRef(false);  // ★ produceAudio race condition önleme
    const roomIdRef = useRef(roomId);
    roomIdRef.current = roomId;
    const socketRef = useRef(socket);
    socketRef.current = socket;
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;

    // ─── Socket request helper (emit + callback) — stable ref-based ───
    const request = useCallback((event: string, data?: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            const s = socketRef.current;
            if (!s) return reject(new Error('No socket'));
            s.emit(event, data, (response: any) => {
                if (response?.error) reject(new Error(response.error));
                else resolve(response);
            });
        });
    }, []); // ★ Boş deps — socketRef üzerinden her zaman güncel socket'e erişir

    // ─── Full cleanup helper (reusable) ───
    const fullCleanup = useCallback(() => {
        for (const [, consumer] of consumersRef.current) { consumer.close(); }
        consumersRef.current.clear();
        for (const [, audioEl] of audioElementsRef.current) { audioEl.pause(); audioEl.srcObject = null; }
        audioElementsRef.current.clear();
        if (videoProducerRef.current) { videoProducerRef.current.close(); videoProducerRef.current = null; }
        if (audioProducerRef.current) { audioProducerRef.current.close(); audioProducerRef.current = null; }
        if (sendTransportRef.current) { sendTransportRef.current.close(); sendTransportRef.current = null; }
        if (recvTransportRef.current) { recvTransportRef.current.close(); recvTransportRef.current = null; }
        deviceRef.current = null;
        initializedRef.current = false;
        setIsProducing(false);
        setRemoteStreams([]);
    }, []);

    // ─── Initialize Device + Transports ───
    const initDevice = useCallback(async () => {
        if (!socketRef.current || !enabledRef.current) return;
        // Prevent double-init while already initialized for THIS room
        if (initializedRef.current) return;
        // Prevent concurrent init calls
        if (initInProgressRef.current) return;
        initInProgressRef.current = true;

        try {
            // 1. Get router RTP capabilities
            const rtpCapabilities = await request('media:getRouterRtpCapabilities', { roomId });
            if (!rtpCapabilities || rtpCapabilities.error) {
                console.error('[Mediasoup] Failed to get RTP capabilities:', rtpCapabilities?.error);
                return;
            }

            // 2. Create Device
            const device = new Device();
            await device.load({ routerRtpCapabilities: rtpCapabilities });
            deviceRef.current = device;

            // 3. Create Send Transport
            const sendTransportInfo = await request('media:createWebRtcTransport', {
                roomId,
                direction: 'send',
            });
            if (sendTransportInfo.error) throw new Error(sendTransportInfo.error);

            const sendTransport = device.createSendTransport({
                id: sendTransportInfo.id,
                iceParameters: sendTransportInfo.iceParameters,
                iceCandidates: sendTransportInfo.iceCandidates,
                dtlsParameters: sendTransportInfo.dtlsParameters,
            });

            sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                    await request('media:connectWebRtcTransport', {
                        transportId: sendTransport.id,
                        dtlsParameters,
                    });
                    callback();
                } catch (err: any) {
                    errback(err);
                }
            });

            sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
                try {
                    const { id } = await request('media:produce', {
                        transportId: sendTransport.id,
                        kind,
                        rtpParameters,
                        appData,
                    });
                    callback({ id });
                } catch (err: any) {
                    errback(err);
                }
            });

            sendTransportRef.current = sendTransport;

            // 4. Create Receive Transport
            const recvTransportInfo = await request('media:createWebRtcTransport', {
                roomId,
                direction: 'recv',
            });
            if (recvTransportInfo.error) throw new Error(recvTransportInfo.error);

            const recvTransport = device.createRecvTransport({
                id: recvTransportInfo.id,
                iceParameters: recvTransportInfo.iceParameters,
                iceCandidates: recvTransportInfo.iceCandidates,
                dtlsParameters: recvTransportInfo.dtlsParameters,
            });

            recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                    await request('media:connectWebRtcTransport', {
                        transportId: recvTransport.id,
                        dtlsParameters,
                    });
                    callback();
                } catch (err: any) {
                    errback(err);
                }
            });

            recvTransportRef.current = recvTransport;
            initializedRef.current = true;
            initInProgressRef.current = false;

            console.log('[Mediasoup] Device initialized, transports created');

            // 5. Consume existing producers in the room
            await consumeExistingProducers();

        } catch (err) {
            console.error('[Mediasoup] Init error:', err);
            initInProgressRef.current = false;
        }
    }, [request, fullCleanup]); // ★ socket ve enabled ref'ten okunuyor — deps'e EKLEME

    // ─── Consume existing producers ───
    const consumeExistingProducers = useCallback(async () => {
        if (!socketRef.current || !deviceRef.current || !recvTransportRef.current) return;

        try {
            const producers = await request('media:getProducers', { roomId: roomIdRef.current });
            if (!Array.isArray(producers)) return;

            for (const producer of producers) {
                await consumeProducer(producer.producerId, producer.userId, producer.kind);
            }
        } catch (err) {
            console.error('[Mediasoup] Error consuming existing producers:', err);
        }
    }, [request]);

    // ─── Consume a single producer ───
    const consumeProducer = useCallback(async (producerId: string, userId: string, kind: 'audio' | 'video') => {
        if (!deviceRef.current || !recvTransportRef.current) {
            console.warn('[Mediasoup] Cannot consume — device or transport not ready');
            return;
        }

        // Don't consume our own producers
        const authUser = typeof window !== 'undefined'
            ? JSON.parse(sessionStorage.getItem('soprano_tenant_user') || sessionStorage.getItem('soprano_auth_user') || 'null')
            : null;
        if (authUser && userId === authUser.userId) return;

        // Already consuming this producer?
        for (const [, consumer] of consumersRef.current) {
            if (consumer.producerId === producerId) return;
        }

        try {
            const consumerInfo = await request('media:consume', {
                roomId: roomIdRef.current,
                transportId: recvTransportRef.current.id,
                producerId,
                rtpCapabilities: deviceRef.current.rtpCapabilities,
            });
            if (consumerInfo.error) {
                console.error('[Mediasoup] Consume error:', consumerInfo.error);
                return;
            }

            const consumer = await recvTransportRef.current.consume({
                id: consumerInfo.id,
                producerId: consumerInfo.producerId,
                kind: consumerInfo.kind,
                rtpParameters: consumerInfo.rtpParameters,
            });

            consumersRef.current.set(consumer.id, consumer);

            // Resume consumer on server
            await request('media:resumeConsumer', { consumerId: consumer.id });

            // Create MediaStream from track
            const stream = new MediaStream([consumer.track]);

            // ★ AUTO-PLAY audio streams via hidden <audio> element
            if (consumerInfo.kind === 'audio') {
                try {
                    const audioEl = new Audio();
                    audioEl.srcObject = stream;
                    audioEl.autoplay = true;
                    audioEl.volume = 1.0;
                    await audioEl.play().catch(e => console.warn('[Mediasoup] Audio autoplay blocked:', e));
                    audioElementsRef.current.set(producerId, audioEl);
                    console.log(`[Mediasoup] Audio playback started for user ${userId}`);
                } catch (e) {
                    console.warn('[Mediasoup] Failed to create audio element:', e);
                }
            }

            setRemoteStreams(prev => {
                // Remove existing stream for same producer
                const filtered = prev.filter(s => s.producerId !== producerId);
                return [...filtered, {
                    producerId,
                    consumerId: consumer.id,
                    userId,
                    kind: consumerInfo.kind,
                    stream,
                    track: consumer.track,
                }];
            });

            console.log(`[Mediasoup] Consuming ${kind} from user ${userId}, producer ${producerId}`);

        } catch (err) {
            console.error('[Mediasoup] consumeProducer error:', err);
        }
    }, [request]);

    // ─── Produce video ───
    const produceVideo = useCallback(async (videoTrack: MediaStreamTrack) => {
        if (!sendTransportRef.current || !deviceRef.current) {
            console.warn('[Mediasoup] Cannot produce — transport not ready');
            // Try initializing first
            await initDevice();
            if (!sendTransportRef.current) return null;
        }

        try {
            const producer = await sendTransportRef.current!.produce({
                track: videoTrack,
                encodings: [
                    { maxBitrate: 100000, scaleResolutionDownBy: 4 },
                    { maxBitrate: 300000, scaleResolutionDownBy: 2 },
                    { maxBitrate: 900000 },
                ],
                appData: { mediaType: 'video' },
            });

            videoProducerRef.current = producer;
            setIsProducing(true);

            producer.on('transportclose', () => {
                videoProducerRef.current = null;
                setIsProducing(false);
            });

            producer.on('trackended', () => {
                closeVideoProducer();
            });

            console.log('[Mediasoup] Video producer created:', producer.id);
            return producer;

        } catch (err) {
            console.error('[Mediasoup] produceVideo error:', err);
            return null;
        }
    }, [initDevice]);

    // ─── Produce audio — with lock to prevent concurrent calls ───
    const produceAudio = useCallback(async (audioTrack: MediaStreamTrack) => {
        // ★ DEBUG: Kim çağırıyor?
        console.log('[Mediasoup] produceAudio called — track state:', audioTrack?.readyState);
        console.trace('[Mediasoup] produceAudio caller stack');

        // ★ Race condition guard
        if (audioProducingRef.current) {
            console.warn('[Mediasoup] produceAudio already in progress, skipping');
            return null;
        }

        // ★ Track geçerliliğini kontrol et
        if (!audioTrack || audioTrack.readyState !== 'live') {
            console.warn('[Mediasoup] Cannot produce audio — track not live');
            return null;
        }

        if (!sendTransportRef.current || !deviceRef.current) {
            console.warn('[Mediasoup] Cannot produce audio — transport not ready');
            await initDevice();
            if (!sendTransportRef.current) return null;
        }

        audioProducingRef.current = true;

        // Close any existing audio producer first
        if (audioProducerRef.current) {
            try {
                const oldId = audioProducerRef.current.id;
                audioProducerRef.current.close();
                await request('media:closeProducer', { producerId: oldId }).catch(() => { });
            } catch (e) { /* ignore */ }
            audioProducerRef.current = null;
        }

        try {
            // ★ Son kontrol — track hala canlı mı?
            if (audioTrack.readyState !== 'live') {
                console.warn('[Mediasoup] Track not live before produce call');
                audioProducingRef.current = false;
                return null;
            }

            const producer = await sendTransportRef.current!.produce({
                track: audioTrack,
                appData: { mediaType: 'audio' },
            });

            audioProducerRef.current = producer;

            producer.on('transportclose', () => {
                audioProducerRef.current = null;
            });

            // ★ trackended: SADECE ref temizle, closeAudioProducer ÇAĞIRMA
            // Çünkü onMicReleased zaten cleanup yapıyor, ikisi çakışırsa döngü oluşur
            producer.on('trackended', () => {
                console.log('[Mediasoup] Audio track ended (stream stopped)');
                if (audioProducerRef.current === producer) {
                    audioProducerRef.current = null;
                }
            });

            console.log('[Mediasoup] Audio producer created:', producer.id);
            audioProducingRef.current = false;
            return producer;

        } catch (err) {
            console.error('[Mediasoup] produceAudio error:', err);
            audioProducingRef.current = false;
            return null;
        }
    }, [initDevice, request]);

    // ─── Close audio producer (defensive — server hatası sessizce yutulur) ───
    const closeAudioProducer = useCallback(async () => {
        console.log('[Mediasoup] closeAudioProducer called, ref exists:', !!audioProducerRef.current);
        console.trace('[Mediasoup] closeAudioProducer caller stack');
        if (audioProducerRef.current) {
            const producerId = audioProducerRef.current.id;
            try {
                audioProducerRef.current.close();
            } catch { /* already closed */ }
            audioProducerRef.current = null;

            // Notify server — producer zaten kapalı olabilir, hatayı sessizce yut
            try {
                await request('media:closeProducer', { producerId });
            } catch {
                // ★ 'Producer not found' hatası normal — server zaten temizlemiş olabilir
            }

            console.log('[Mediasoup] Audio producer closed');
        }
    }, [request]);

    // ─── Close video producer ───
    const closeVideoProducer = useCallback(async () => {
        if (videoProducerRef.current) {
            const producerId = videoProducerRef.current.id;
            videoProducerRef.current.close();
            videoProducerRef.current = null;
            setIsProducing(false);

            // Notify server
            try {
                await request('media:closeProducer', { producerId });
            } catch (err) {
                console.warn('[Mediasoup] closeProducer server error:', err);
            }

            console.log('[Mediasoup] Video producer closed');
        }
    }, [request]);

    // ─── Socket listeners for new/closed producers ───
    useEffect(() => {
        if (!socket) return;

        const onNewProducer = async (data: { producerId: string; userId: string; kind: 'audio' | 'video'; appData: any }) => {
            console.log('[Mediasoup] New producer:', data.producerId, data.kind, 'from user', data.userId);
            // Wait for device init with retry — up to 5 attempts, 500ms apart
            let attempts = 0;
            while ((!deviceRef.current || !recvTransportRef.current) && attempts < 10) {
                console.log(`[Mediasoup] Device not ready, waiting... (attempt ${attempts + 1}/10)`);
                await new Promise(r => setTimeout(r, 500));
                attempts++;
            }
            if (!deviceRef.current || !recvTransportRef.current) {
                console.error('[Mediasoup] Device still not ready after retries, cannot consume producer', data.producerId);
                return;
            }
            await consumeProducer(data.producerId, data.userId, data.kind);
        };

        const onProducerClosed = (data: { producerId: string; consumerId?: string; userId?: string }) => {
            console.log('[Mediasoup] Producer closed:', data.producerId);

            // Remove consumer
            if (data.consumerId) {
                const consumer = consumersRef.current.get(data.consumerId);
                if (consumer) {
                    consumer.close();
                    consumersRef.current.delete(data.consumerId);
                }
            }

            // Remove from remote streams
            setRemoteStreams(prev => prev.filter(s => s.producerId !== data.producerId));

            // Cleanup audio element if any
            const audioEl = audioElementsRef.current.get(data.producerId);
            if (audioEl) {
                audioEl.pause();
                audioEl.srcObject = null;
                audioElementsRef.current.delete(data.producerId);
            }
        };

        socket.on('media:new-producer', onNewProducer);
        socket.on('media:producer-closed', onProducerClosed);

        return () => {
            socket.off('media:new-producer', onNewProducer);
            socket.off('media:producer-closed', onProducerClosed);
        };
    }, [socket, consumeProducer]);

    // ─── Init device when enabled and socket available ───
    useEffect(() => {
        if (enabled && socket) {
            // Küçük delay ile socket room:join'in tamamlanmasını bekle
            const timer = setTimeout(() => initDevice(), 300);
            return () => clearTimeout(timer);
        }
    }, [enabled, socket]); // ★ initDevice deps'ten ÇIKARILDI — stable ref

    // ─── Reset on socket reconnect (server clears old transports) ───
    useEffect(() => {
        if (!socket) return;

        // ★ 'connect' yerine socket.io 'reconnect' olayını dinle
        // Bu sayede ilk bağlantıda tetiklenmez, sadece yeniden bağlantıda çalışır
        const onReconnect = () => {
            console.log('[Mediasoup] Socket reconnected — resetting media state');
            fullCleanup();

            // Re-initialize with fresh transports
            if (enabledRef.current) {
                setTimeout(() => initDevice(), 500);
            }
        };

        socket.io.on('reconnect', onReconnect);
        return () => {
            socket.io.off('reconnect', onReconnect);
        };
    }, [socket, fullCleanup, initDevice]);

    // ─── Cleanup + reinit on room change ───
    const prevRoomIdRef = useRef(roomId);
    useEffect(() => {
        // İlk render'da cleanup yapma — sadece gerçek oda değişimlerinde
        if (prevRoomIdRef.current === roomId) return;
        prevRoomIdRef.current = roomId;

        // Oda değiştiğinde eski kaynakları temizle ve yeniden başlat
        console.log(`[Mediasoup] Room changed to ${roomId} — reinitializing`);
        fullCleanup();

        // Yeni oda için init — küçük delay ile socket room:join'in tamamlanmasını bekle
        let timer: ReturnType<typeof setTimeout> | null = null;
        if (enabledRef.current && socketRef.current) {
            timer = setTimeout(() => {
                initDevice();
            }, 600);
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [roomId, fullCleanup, initDevice]); // Re-run on room change

    return {
        remoteStreams,
        isProducing,
        produceVideo,
        closeVideoProducer,
        produceAudio,
        closeAudioProducer,
        initDevice,
    };
}
