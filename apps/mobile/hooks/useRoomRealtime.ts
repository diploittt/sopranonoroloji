/**
 * useRoomRealtime — Mobile equivalent of web's useRoomRealtime hook.
 * Manages all real-time socket events for room interaction:
 *   - Mic acquire/release/deny/grant/force-release
 *   - Queue management
 *   - Moderation (mute/gag/cam-block)
 *   - Ban/kick/session management
 *   - Chat lock/clear
 *   - DM receive
 *   - Speaker timer
 *   - One-to-one calls
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { getSocket } from '@/services/socket';
import { Alert } from 'react-native';

interface SpeakerInfo {
    userId: string;
    displayName: string;
    socketId: string;
    role: string;
    startedAt: number;
    duration: number;
}

interface UseRoomRealtimeProps {
    slug: string;
    currentUserId: string;
}

export function useRoomRealtime({ slug, currentUserId }: UseRoomRealtimeProps) {
    // ─── State ───
    const [isMicOn, setIsMicOn] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isMeSpeaker, setIsMeSpeaker] = useState(false);
    const [isInQueue, setIsInQueue] = useState(false);
    const [queueCount, setQueueCount] = useState(0);
    const [isChatLocked, setIsChatLocked] = useState(false);
    const [isGagged, setIsGagged] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isBanned, setIsBanned] = useState(false);
    const [banInfo, setBanInfo] = useState<any>(null);
    const [speakerInfo, setSpeakerInfo] = useState<SpeakerInfo | null>(null);
    const [micTimeLeft, setMicTimeLeft] = useState(0);
    const [currentSpeakerName, setCurrentSpeakerName] = useState('');
    const [systemSettings, setSystemSettings] = useState<any>(null);

    // One-to-one call
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [activeCall, setActiveCall] = useState<any>(null);

    const micTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    // ─── Socket listeners ───
    useEffect(() => {
        const socket = getSocket();
        if (!socket || !slug) return;

        // Reset state on room change
        setIsMicOn(false);
        setIsCameraOn(false);
        setIsMeSpeaker(false);
        setIsInQueue(false);
        setIsGagged(false);
        setIsMuted(false);
        setIsBanned(false);
        setBanInfo(null);
        setSpeakerInfo(null);
        setMicTimeLeft(0);

        // ─── Mic events ───
        const onMicAcquired = (data: SpeakerInfo & { isDuel?: boolean }) => {
            setCurrentSpeakerName(data.displayName);
            setSpeakerInfo(data);
            if (data.userId === currentUserId) {
                setIsMeSpeaker(true);
                setIsMicOn(true);
                setIsInQueue(false);
                // Start timer
                if (micTimerRef.current) clearInterval(micTimerRef.current);
                let timeLeft = data.duration;
                setMicTimeLeft(timeLeft);
                micTimerRef.current = setInterval(() => {
                    timeLeft--;
                    setMicTimeLeft(timeLeft);
                    if (timeLeft <= 0 && micTimerRef.current) clearInterval(micTimerRef.current);
                }, 1000);
            }
        };

        const onMicReleased = (data: { userId: string }) => {
            if (data.userId === currentUserId) {
                setIsMeSpeaker(false);
                setIsMicOn(false);
                if (micTimerRef.current) clearInterval(micTimerRef.current);
            }
            setSpeakerInfo(null);
            setCurrentSpeakerName('');
        };

        const onMicDenied = (data: { reason: string }) => {
            Alert.alert('Mikrofon', data.reason || 'Mikrofon alınamadı');
        };

        const onMicGranted = (_data: { grantedBy: string }) => {
            // Admin granted mic, will trigger mic:acquired shortly
        };

        const onQueueUpdated = (newQueue: string[]) => {
            setQueueCount(newQueue.length);
            setIsInQueue(newQueue.includes(currentUserId));
        };

        const onMicForceReleased = (data: { by: string }) => {
            setIsMeSpeaker(false);
            setIsMicOn(false);
            if (micTimerRef.current) clearInterval(micTimerRef.current);
            Alert.alert('Mikrofon', `Mikrofon ${data.by} tarafından alındı`);
        };

        // ─── Moderation events ───
        const onRoomModeration = (data: { action: string; isMuted?: boolean; isGagged?: boolean }) => {
            if (data.action === 'mute' || data.action === 'unmute') {
                setIsMuted(!!data.isMuted);
            }
            if (data.action === 'gag' || data.action === 'ungag') {
                setIsGagged(!!data.isGagged);
            }
        };

        const onChatLock = (data: { locked: boolean }) => {
            setIsChatLocked(data.locked);
        };

        // ─── Ban/Kick ───
        const onRoomKicked = (data: { reason: string }) => {
            Alert.alert('Atıldınız', data.reason || 'Odadan atıldınız');
        };

        const onRoomBanned = (data: any) => {
            setIsBanned(true);
            setBanInfo(data);
        };

        const onBanLifted = () => {
            setIsBanned(false);
            setBanInfo(null);
        };

        const onSessionKicked = (data: { message: string }) => {
            Alert.alert('Oturum', data.message || 'Başka bir oturum açıldı');
        };

        // ─── One-to-one calls ───
        const onCallIncoming = (data: any) => {
            setIncomingCall(data);
        };
        const onCallAccepted = (data: any) => {
            setActiveCall(data);
            setIncomingCall(null);
        };
        const onCallEnded = () => {
            setActiveCall(null);
            setIncomingCall(null);
        };

        // ─── System settings ───
        const onSystemSettings = (data: any) => {
            setSystemSettings(data);
        };

        // Register all listeners
        socket.on('mic:acquired', onMicAcquired);
        socket.on('mic:released', onMicReleased);
        socket.on('mic:timer-expired', onMicReleased);
        socket.on('mic:denied', onMicDenied);
        socket.on('mic:granted', onMicGranted);
        socket.on('mic:queue-updated', onQueueUpdated);
        socket.on('mic:force-released', onMicForceReleased);
        socket.on('room:moderation', onRoomModeration);
        socket.on('room:chat-lock', onChatLock);
        socket.on('room:kicked', onRoomKicked);
        socket.on('room:banned', onRoomBanned);
        socket.on('room:ban-lifted', onBanLifted);
        socket.on('session:kicked', onSessionKicked);
        socket.on('one2one:incoming', onCallIncoming);
        socket.on('one2one:accepted', onCallAccepted);
        socket.on('one2one:ended', onCallEnded);
        socket.on('system:settings', onSystemSettings);

        return () => {
            socket.off('mic:acquired', onMicAcquired);
            socket.off('mic:released', onMicReleased);
            socket.off('mic:timer-expired', onMicReleased);
            socket.off('mic:denied', onMicDenied);
            socket.off('mic:granted', onMicGranted);
            socket.off('mic:queue-updated', onQueueUpdated);
            socket.off('mic:force-released', onMicForceReleased);
            socket.off('room:moderation', onRoomModeration);
            socket.off('room:chat-lock', onChatLock);
            socket.off('room:kicked', onRoomKicked);
            socket.off('room:banned', onRoomBanned);
            socket.off('room:ban-lifted', onBanLifted);
            socket.off('session:kicked', onSessionKicked);
            socket.off('one2one:incoming', onCallIncoming);
            socket.off('one2one:accepted', onCallAccepted);
            socket.off('one2one:ended', onCallEnded);
            socket.off('system:settings', onSystemSettings);
            if (micTimerRef.current) clearInterval(micTimerRef.current);
        };
    }, [slug, currentUserId]);

    // ─── Actions ───
    const takeMic = useCallback(() => {
        const socket = getSocket();
        if (socket) socket.emit('mic:request', { roomId: slug });
    }, [slug]);

    const releaseMic = useCallback(() => {
        const socket = getSocket();
        if (socket) socket.emit('mic:release', { roomId: slug });
        setIsMeSpeaker(false);
        setIsMicOn(false);
    }, [slug]);

    const joinQueue = useCallback(() => {
        const socket = getSocket();
        if (socket) socket.emit('mic:queue-join', { roomId: slug });
        setIsInQueue(true);
    }, [slug]);

    const leaveQueue = useCallback(() => {
        const socket = getSocket();
        if (socket) socket.emit('mic:queue-leave', { roomId: slug });
        setIsInQueue(false);
    }, [slug]);

    const forceTakeMic = useCallback((targetSocketId?: string) => {
        const socket = getSocket();
        if (socket) socket.emit('mic:force-take', { roomId: slug, targetSocketId });
    }, [slug]);

    const toggleCamera = useCallback(() => {
        setIsCameraOn(prev => !prev);
    }, []);

    const acceptCall = useCallback(() => {
        if (!incomingCall) return;
        const socket = getSocket();
        if (socket) socket.emit('one2one:accept', { callId: incomingCall.callId });
    }, [incomingCall]);

    const rejectCall = useCallback(() => {
        if (!incomingCall) return;
        const socket = getSocket();
        if (socket) socket.emit('one2one:reject', { callId: incomingCall.callId });
        setIncomingCall(null);
    }, [incomingCall]);

    const endCall = useCallback(() => {
        if (!activeCall) return;
        const socket = getSocket();
        if (socket) socket.emit('one2one:end', { callId: activeCall.callId });
        setActiveCall(null);
    }, [activeCall]);

    return {
        // State
        isMicOn,
        isCameraOn,
        isMeSpeaker,
        isInQueue,
        queueCount,
        isChatLocked,
        isGagged,
        isMuted,
        isBanned,
        banInfo,
        speakerInfo,
        micTimeLeft,
        currentSpeakerName,
        systemSettings,
        incomingCall,
        activeCall,

        // Actions
        takeMic,
        releaseMic,
        joinQueue,
        leaveQueue,
        forceTakeMic,
        toggleCamera,
        acceptCall,
        rejectCall,
        endCall,
    };
}
