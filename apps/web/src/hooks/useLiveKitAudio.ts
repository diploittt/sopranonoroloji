'use client';

/**
 * useLiveKitAudio — Web ses iletimi (Mediasoup yerine LiveKit)
 * 
 * Görevler:
 * 1. LiveKit room'a bağlan (token fetch + connect)
 * 2. publishAudio(track) ile ses yayınla
 * 3. unpublishAudio() ile ses yayınını durdur
 * 4. Remote audio track'ları otomatik çal (attach to DOM)
 * 5. ActiveSpeakers değişikliklerini raporla
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// Lazy-load livekit-client
let _lk: any = null;
function getLK(): any {
    if (_lk) return _lk;
    try {
        _lk = require('livekit-client');
        return _lk;
    } catch {
        console.warn('[LiveKitAudio] livekit-client not available');
        return null;
    }
}

interface UseLiveKitAudioProps {
    roomSlug: string;
    username: string;
    enabled: boolean;
}

export function useLiveKitAudio({ roomSlug, username, enabled }: UseLiveKitAudioProps) {
    const roomRef = useRef<any>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const audioTrackRef = useRef<any>(null);
    const connectingRef = useRef(false);

    // Connect to LiveKit room
    useEffect(() => {
        if (!enabled || !roomSlug || !username) return;

        const lk = getLK();
        if (!lk) return;

        // Already connected
        if (roomRef.current?.state === lk.ConnectionState.Connected) return;
        if (connectingRef.current) return;

        let cancelled = false;
        connectingRef.current = true;

        const connect = async () => {
            try {
                const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;
                if (!livekitUrl) {
                    console.warn('[LiveKitAudio] NEXT_PUBLIC_LIVEKIT_URL not set');
                    connectingRef.current = false;
                    return;
                }

                // Fetch token from web API route
                const res = await fetch(`/api/livekit?room=${encodeURIComponent(roomSlug)}&username=${encodeURIComponent(username)}`);
                const data = await res.json();
                if (data.error || !data.token) {
                    console.error('[LiveKitAudio] Token error:', data.error);
                    connectingRef.current = false;
                    return;
                }

                if (cancelled) { connectingRef.current = false; return; }

                const room = new lk.Room();

                // Setup listeners
                room.on(lk.RoomEvent.TrackSubscribed, (track: any, _pub: any, participant: any) => {
                    if (track.kind === lk.Track.Kind.Audio) {
                        console.log('[LiveKitAudio] Remote audio subscribed:', participant.identity);
                        try {
                            const el = track.attach();
                            el.id = `lk-web-audio-${participant.identity}`;
                            el.autoplay = true;
                            document.body.appendChild(el);
                        } catch (e: any) {
                            console.warn('[LiveKitAudio] attach error:', e.message);
                        }
                    }
                });

                room.on(lk.RoomEvent.TrackUnsubscribed, (track: any, _pub: any, participant: any) => {
                    if (track.kind === lk.Track.Kind.Audio) {
                        console.log('[LiveKitAudio] Remote audio unsubscribed:', participant.identity);
                        try {
                            const els = track.detach();
                            els.forEach((el: HTMLElement) => el.remove());
                        } catch (e: any) {
                            console.warn('[LiveKitAudio] detach error:', e.message);
                        }
                    }
                });

                room.on(lk.RoomEvent.Disconnected, () => {
                    console.log('[LiveKitAudio] Disconnected');
                    setIsConnected(false);
                    setIsPublishing(false);
                });

                await room.connect(livekitUrl, data.token, { autoSubscribe: true });

                if (cancelled) {
                    room.disconnect();
                    connectingRef.current = false;
                    return;
                }

                roomRef.current = room;
                setIsConnected(true);
                connectingRef.current = false;
                console.log('[LiveKitAudio] Connected to room:', roomSlug);
            } catch (e: any) {
                console.error('[LiveKitAudio] Connect error:', e.message);
                connectingRef.current = false;
            }
        };

        connect();

        return () => {
            cancelled = true;
            if (roomRef.current) {
                roomRef.current.disconnect();
                roomRef.current = null;
                setIsConnected(false);
                setIsPublishing(false);
                connectingRef.current = false;
            }
        };
    }, [enabled, roomSlug, username]);

    // Publish audio track
    const publishAudio = useCallback(async (audioTrack?: MediaStreamTrack): Promise<boolean> => {
        const lk = getLK();
        const room = roomRef.current;
        if (!lk || !room || room.state !== lk.ConnectionState.Connected) {
            console.warn('[LiveKitAudio] Cannot publish — not connected');
            return false;
        }

        try {
            if (audioTrack) {
                // Publish a specific MediaStreamTrack
                const localTrack = new lk.LocalAudioTrack(audioTrack);
                const pub = await room.localParticipant.publishTrack(localTrack);
                audioTrackRef.current = pub;
                setIsPublishing(true);
                console.log('[LiveKitAudio] Audio published (from track)');
            } else {
                // Create new local audio track with getUserMedia
                const track = await lk.createLocalAudioTrack({
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                });
                const pub = await room.localParticipant.publishTrack(track);
                audioTrackRef.current = pub;
                setIsPublishing(true);
                console.log('[LiveKitAudio] Audio published (new track)');
            }
            return true;
        } catch (e: any) {
            console.error('[LiveKitAudio] Publish error:', e.message);
            return false;
        }
    }, []);

    // Unpublish audio
    const unpublishAudio = useCallback(async () => {
        const room = roomRef.current;
        if (!room) return;

        try {
            const localParticipant = room.localParticipant;
            for (const [, publication] of localParticipant.audioTrackPublications) {
                if (publication.track) {
                    await localParticipant.unpublishTrack(publication.track);
                    publication.track.stop();
                }
            }
            audioTrackRef.current = null;
            setIsPublishing(false);
            console.log('[LiveKitAudio] Audio unpublished');
        } catch (e: any) {
            console.error('[LiveKitAudio] Unpublish error:', e.message);
        }
    }, []);

    return {
        isConnected,
        isPublishing,
        publishAudio,
        unpublishAudio,
    };
}
