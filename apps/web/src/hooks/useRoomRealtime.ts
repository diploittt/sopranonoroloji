
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSocket, Message as SocketMessage, Participant as SocketParticipant } from './useSocket';
import { useMediasoup } from './useMediasoup';
import { User, Message } from '@/types';
import { ensureAuthUser, getAuthUser } from '@/lib/auth';
import { generateGenderAvatar } from '@/lib/avatar';

const AUTH_TOKEN_KEY = 'soprano_auth_token';

interface UseRoomRealtimeProps {
    slug: string;
}

// ─── Speaker info from server ───────────────────────────
interface SpeakerInfo {
    userId: string;
    displayName: string;
    socketId: string;
    role: string;
    startedAt: number;
    duration: number; // ms
}

export function useRoomRealtime({ slug }: UseRoomRealtimeProps) {
    // Read JWT from localStorage — pick correct token based on URL context
    const token = typeof window !== 'undefined'
        ? (() => {
            const isTenantPage = window.location.pathname.startsWith('/t/');
            if (isTenantPage) {
                return localStorage.getItem('soprano_tenant_token') || localStorage.getItem(AUTH_TOKEN_KEY) || undefined;
            }
            return localStorage.getItem(AUTH_TOKEN_KEY) || undefined;
        })()
        : undefined;

    // 1. Core Hooks
    const {
        socket,
        isConnected,
        messages: socketMessages,
        participants: socketParticipants,
        sendMessage: sendSocketMessage,
        updateParticipantLocally,
        rooms: socketRooms,
        passwordRequired,
        joinWithPassword,
        roomSettings,
        roomError,
        systemSettings,
        tenantSuspended,
        paymentReminder,
        setPaymentReminder,
        announcement,
        hasNewAnnouncement,
        setHasNewAnnouncement,
        setAnnouncement,
        duplicateBlocked,
        userPermissions,
        lastBonus,
        actionIndicators,
        setActionIndicators,
    } = useSocket({ roomId: slug, token });

    // Mediasoup — camera/video + audio streaming
    const {
        remoteStreams: mediaRemoteStreams,
        isProducing: isVideoProducing,
        produceVideo,
        closeVideoProducer,
        produceAudio,
        closeAudioProducer,
        initDevice: initMediaDevice,
    } = useMediasoup({ socket, roomId: slug, enabled: isConnected });

    // 2. Local State for UI Compatibility
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isMicOn, setIsMicOn] = useState(false);

    // Refs for stable access inside useEffect (avoid re-registering listeners)
    const isCameraOnRef = useRef(isCameraOn);
    const isMicOnRef = useRef(isMicOn);
    const localStreamRef = useRef(localStream);
    isCameraOnRef.current = isCameraOn;
    isMicOnRef.current = isMicOn;
    localStreamRef.current = localStream;

    // UI State
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info', title: string, message?: string } | null>(null);
    const [lastError, setLastError] = useState<{ type: string; message: string; id: number } | null>(null);
    const [availableDevices, setAvailableDevices] = useState<any>({ videoInputs: [], audioInputs: [], audioOutputs: [] });
    const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | null>(null);
    const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string | null>(null);

    // Speaker / Mic State (SERVER-DRIVEN)
    const [currentSpeaker, setCurrentSpeaker] = useState<SpeakerInfo | null>(null);
    const [duelSpeakers, setDuelSpeakers] = useState<SpeakerInfo[]>([]);
    const [micTimeLeft, setMicTimeLeft] = useState<number>(0); // seconds remaining
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);

    // Chat State
    const [isChatLocked, setIsChatLocked] = useState(false);
    const [isLocalChatStopped, setIsLocalChatStopped] = useState(false); // Stop Text Local
    const [blockedUsers, setBlockedUsers] = useState<string[]>([]); // Locally blocked users (unused yet)
    const [isCurrentUserMuted, setIsCurrentUserMuted] = useState(false);
    const [isCurrentUserGagged, setIsCurrentUserGagged] = useState(false);

    // Other state
    const [queue, setQueue] = useState<string[]>([]);
    const [remoteVolume, setRemoteVolume] = useState(1);
    const [isRemoteMuted, setIsRemoteMuted] = useState(false);
    const [openDMs, setOpenDMs] = useState<string[]>([]);
    const [dmMessages, setDmMessages] = useState<any>({});
    // DM ignore: userIds whose DMs should be silently dropped
    const dmIgnoredUserIdsRef = useRef<Set<string>>(new Set());
    const [stereoMode, setStereoMode] = useState(false);
    const [banInfo, setBanInfo] = useState<{ reason: string; expiresAt?: string | null; banLevel?: 'soft' | 'hard' } | null>(null);
    const [sessionKicked, setSessionKicked] = useState<{ message: string } | null>(null);

    // ─── Meeting Room: who is currently speaking (userId → audioLevel 0-1) ───
    const [speakingUsers, setSpeakingUsers] = useState<Record<string, number>>({});

    // ─── Timer Logic ─────────────────────────────────────
    const startCountdown = useCallback((durationMs: number, startedAt: number) => {
        // Clear any existing timer
        if (timerRef.current) clearInterval(timerRef.current);

        const updateTimeLeft = () => {
            const elapsed = Date.now() - startedAt;
            const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
            setMicTimeLeft(remaining);
            if (remaining <= 0 && timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
        updateTimeLeft(); // immediate
        timerRef.current = setInterval(updateTimeLeft, 1000);
    }, []);

    const stopCountdown = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setMicTimeLeft(0);
    }, []);

    // ─── Socket Listeners for Mic Events ─────────────────
    useEffect(() => {
        if (!socket) return;

        const onMicAcquired = async (data: SpeakerInfo & { isDuel?: boolean }) => {
            if (data.isDuel) {
                // Düello mod: iki konuşmacıyı destekle (currentSpeaker'a dokunma)
                setDuelSpeakers(prev => {
                    const filtered = prev.filter(s => s.userId !== data.userId);
                    return [...filtered, data];
                });
            } else {
                setCurrentSpeaker(data);
                startCountdown(data.duration, data.startedAt);
            }

            // If it's us, activate mic and produce audio via mediasoup
            const authUser = getAuthUser();
            if (authUser && data.userId === authUser.userId) {
                setIsMicOn(true);
                try {
                    const constraints: MediaStreamConstraints = {
                        audio: selectedAudioDeviceId
                            ? { deviceId: { exact: selectedAudioDeviceId } }
                            : true,
                    };
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    micStreamRef.current = stream;
                    const audioTrack = stream.getAudioTracks()[0];
                    if (audioTrack) {
                        await produceAudio(audioTrack);
                        console.log('[Mic] Audio track produced via mediasoup');
                    }
                } catch (err: any) {
                    console.error('[Mic] Failed to capture audio:', err);
                    setIsMicOn(false);
                    // Server'a mic bırakma bildir — UI bug'da kalmasın
                    socket.emit('mic:release', { roomId: slug });
                    setToastMessage({ type: 'error', title: 'Mikrofon Hatası', message: err.message || 'Mikrofon yakılanamıyor.' });
                }
            }
        };

        const onMicReleased = (data: { userId: string; displayName: string; reason: string }) => {
            // Düello speaker'larından mı bak
            setDuelSpeakers(prev => {
                const filtered = prev.filter(s => s.userId !== data.userId);
                return filtered;
            });

            // Normal speaker da temizle
            setCurrentSpeaker(prev => {
                if (prev && prev.userId === data.userId) {
                    stopCountdown();
                    return null;
                }
                return prev;
            });

            const authUser = getAuthUser();
            if (authUser && data.userId === authUser.userId) {
                setIsMicOn(false);
                cleanupMicStream();
                closeAudioProducer();
            }
        };

        const onMicTimerExpired = (data: { userId: string; displayName: string; reason: string }) => {
            setDuelSpeakers(prev => prev.filter(s => s.userId !== data.userId));
            setCurrentSpeaker(prev => {
                if (prev && prev.userId === data.userId) {
                    stopCountdown();
                    return null;
                }
                return prev;
            });

            const authUser = getAuthUser();
            if (authUser && data.userId === authUser.userId) {
                setIsMicOn(false);
                cleanupMicStream();
                closeAudioProducer();
                setToastMessage({ type: 'info', title: 'Süre doldu', message: 'Mikrofon süresi sona erdi.' });
            }
        };

        const onMicDenied = (data: { reason: string; currentSpeaker: { userId: string; displayName: string }, deniedBy?: string }) => {
            if (data.reason === 'occupied') {
                setToastMessage({ type: 'error', title: 'Mikrofon meşgul', message: `${data.currentSpeaker?.displayName} konuşuyor.` });
            } else if (data.reason === 'insufficient_rank') {
                setToastMessage({ type: 'error', title: 'Yetki yetersiz', message: 'Mevcut konuşmacının rolünden yüksek olmalısınız.' });
            } else if (data.deniedBy) {
                setToastMessage({ type: 'error', title: 'Mikrofon Reddedildi', message: `${data.deniedBy} isteğinizi reddetti.` });
            }
        };

        const onMicGranted = async (data: { grantedBy: string }) => {
            setToastMessage({ type: 'success', title: 'Mikrofon Verildi', message: `${data.grantedBy} size mikrofon verdi. Bağlanıyor...` });

            // Audio is now handled by LiveKit
            console.log('Mic granted — audio handled by LiveKit');
        };

        const onQueueUpdated = (newQueue: string[]) => {
            setQueue(newQueue);
        };

        const onUserGranted = (data: { userId: string; grantedBy: string }) => {
            const user = socketParticipants.find((p: SocketParticipant) => p.userId === data.userId);
            if (user) {
                setToastMessage({ type: 'info', title: 'Mikrofon Verildi', message: `${user.displayName}, mikrofona alındı.` });
            }
        };

        const onMicForceReleased = (data: { by: string; byRole: string }) => {
            setIsMicOn(false);
            cleanupMicStream();
            closeAudioProducer();
            setToastMessage({ type: 'info', title: 'Mikrofon alındı', message: `${data.by} mikrofonu zorla aldı.` });
        };

        const onRoomKicked = (data: { reason: string }) => {
            setToastMessage({ type: 'error', title: 'Odadan Atıldınız', message: data.reason || 'Yönetici tarafından uzaklaştırıldınız.' });
            // Give time for toast to be seen ? or just redirect
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        };

        const onRoomHardKicked = (data: { reason: string }) => {
            setToastMessage({ type: 'error', title: '⛔ Zorla Atıldınız', message: data.reason || 'Yönetici tarafından zorla uzaklaştırıldınız.' });
            // ★ Clear ALL auth data — force full logout
            setTimeout(() => {
                localStorage.removeItem('soprano_auth_token');
                localStorage.removeItem('soprano_auth_user');
                localStorage.removeItem('soprano_entry_url');
                // Clear any tenant-scoped tokens too
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('soprano_auth_token_') || key.startsWith('soprano_auth_user_')) {
                        localStorage.removeItem(key);
                    }
                });
                window.location.href = '/';
            }, 1500);
        };

        const onRoomBanned = (data: { reason: string; expiresAt?: string | null; banLevel?: 'soft' | 'hard' }) => {
            setBanInfo({
                reason: data.reason || 'Yasaklandınız.',
                expiresAt: data.expiresAt || null,
                banLevel: data.banLevel || 'hard',
            });
        };

        // ─── DUPLICATE SESSION (başka yerden giriş) ───
        const onSessionKicked = (data: { message: string }) => {
            setSessionKicked({ message: data.message || 'Başka bir yerden giriş yapıldı. Bu oturum sonlandırıldı.' });
            setToastMessage({ type: 'error', title: '⚠️ Oturum Sonlandırıldı', message: data.message || 'Başka bir yerden giriş yapıldı.' });
            setTimeout(() => {
                localStorage.removeItem('soprano_tenant_token');
                localStorage.removeItem('soprano_tenant_user');
                const tenantMatch = window.location.pathname.match(/^\/t\/([^/]+)/);
                const entryUrl = tenantMatch ? `/t/${tenantMatch[1]}` : '/';
                window.location.href = entryUrl;
            }, 5000);
        };

        const onRoomModeration = async (data: { action: string; isMuted?: boolean; isGagged?: boolean; isCamBlocked?: boolean }) => {
            console.log('[MODERATION EVENT]', data);

            if (data.action === 'mute') {
                if (data.isMuted) {
                    setIsCurrentUserMuted(true);
                    if (currentUser?.userId) {
                        updateParticipantLocally(currentUser.userId, { isMuted: true });
                    }
                    setToastMessage({ type: 'error', title: '🔇 Susturuldunuz', message: 'Yönetici tarafından mikrofon yetkiniz kaldırıldı.' });
                    if (isMicOnRef.current) {
                        setIsMicOn(false);
                        cleanupMicStream();
                        closeAudioProducer(); // Also close mediasoup audio producer
                    }
                } else {
                    setIsCurrentUserMuted(false);
                    if (currentUser?.userId) {
                        updateParticipantLocally(currentUser.userId, { isMuted: false });
                    }
                    setToastMessage({ type: 'success', title: '🔊 Susturma Kaldırıldı', message: 'Artık tekrar mikrofon kullanabilirsiniz.' });
                }
            } else if (data.action === 'gag') {
                if (data.isGagged) {
                    setIsCurrentUserGagged(true);
                    if (currentUser?.userId) {
                        updateParticipantLocally(currentUser.userId, { isGagged: true });
                    }
                    setToastMessage({ type: 'error', title: '🤐 Yazı Yasağı', message: 'Yönetici tarafından yazma yetkiniz kaldırıldı.' });
                } else {
                    setIsCurrentUserGagged(false);
                    if (currentUser?.userId) {
                        updateParticipantLocally(currentUser.userId, { isGagged: false });
                    }
                    setToastMessage({ type: 'success', title: '✏️ Yazı Yasağı Kaldırıldı', message: 'Artık tekrar yazabilirsiniz.' });
                }
            } else if (data.action === 'cam_block') {
                if (data.isCamBlocked) {
                    // Participant verisini güncelle — toggleCamera kontrolü burayı okur
                    if (currentUser?.userId) {
                        updateParticipantLocally(currentUser.userId, { isCamBlocked: true });
                    }
                    setToastMessage({ type: 'error', title: '📷 Kamera Engellendi', message: 'Kameranız yönetici tarafından kapatıldı.' });
                    if (isCameraOnRef.current) {
                        // Kamerayı zorla kapat
                        if (localStreamRef.current) {
                            localStreamRef.current.getTracks().forEach(track => track.stop());
                        }
                        setLocalStream(null);
                        setIsCameraOn(false);
                    }
                } else {
                    if (currentUser?.userId) {
                        updateParticipantLocally(currentUser.userId, { isCamBlocked: false });
                    }
                    setToastMessage({ type: 'success', title: '📷 Kamera İzni Verildi', message: 'Artık kameranızı açabilirsiniz.' });
                }
            } else if (data.action === 'exit_browser') {
                setToastMessage({ type: 'error', title: 'Tarayıcı Kapatılıyor', message: 'Yönetici tarafından çıkışa zorlandınız.' });
                // Clear all auth tokens to prevent re-entry
                localStorage.removeItem('soprano_tenant_user');
                localStorage.removeItem('soprano_auth_user');
                localStorage.removeItem('soprano_jwt');
                sessionStorage.clear();
                // Disconnect socket
                if (socket) socket.disconnect();
                setTimeout(() => {
                    // Try to close window/tab
                    window.close();
                    // If window.close() didn't work (not opened via script), destroy the page
                    setTimeout(() => {
                        // Replace history so back button doesn't work
                        window.location.replace('about:blank');
                        document.documentElement.innerHTML = '<body style="background:#000;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><h1>Oturum sonlandırıldı</h1></body>';
                    }, 500);
                }, 1500);
            } else if (data.action === 'release_mic') {
                // Admin forced mic release — turn off mic locally
                setIsMicOn(false);
                cleanupMicStream();
                closeAudioProducer();
                setToastMessage({ type: 'info', title: '🎤 Mikrofon Serbest', message: 'Mikrofonunuz yönetici tarafından serbest bırakıldı.' });
            } else if (data.action === 'take_mic') {
                // Server already assigned mic to us — capture audio and produce
                setIsMicOn(true);
                setToastMessage({ type: 'success', title: '🎤 Mikrofon Alındı', message: 'Mikrofon sizde.' });
                try {
                    const constraints: MediaStreamConstraints = {
                        audio: selectedAudioDeviceId
                            ? { deviceId: { exact: selectedAudioDeviceId } }
                            : true,
                    };
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    micStreamRef.current = stream;
                    const audioTrack = stream.getAudioTracks()[0];
                    if (audioTrack) {
                        await produceAudio(audioTrack);
                        console.log('[Mic] Audio track produced via mediasoup (take_mic)');
                    }
                } catch (err: any) {
                    console.error('[Mic] Failed to capture audio (take_mic):', err);
                }
            }
        };

        const onChatLock = (data: { locked: boolean; by?: string }) => {
            setIsChatLocked(data.locked);
            // Toast handled by socket.emit response usually, or we can show here
            if (data.locked) {
                setToastMessage({ type: 'info', title: 'Sohbet Kilitlendi', message: `${data.by || 'Yönetici'} sohbeti durdurdu.` });
            } else {
                setToastMessage({ type: 'success', title: 'Sohbet Açıldı', message: 'Sohbet tekrar aktif.' });
            }
        };

        const onClearUserMessages = (data: { userId: string }) => {
            // Store userId with timestamp — only messages BEFORE this time will be hidden.
            // New messages after clear will still appear normally.
            setClearedUserIds(prev => new Map(prev).set(data.userId, Date.now()));
        };

        const onChatCleared = (data: { by: string }) => {
            // This is "Clear Chat Global"
            // We need to clear ALL messages.
            // Again, depends on useSocket.
            setForceClearTimestamp(Date.now());
            setToastMessage({ type: 'info', title: 'Sohbet Temizlendi', message: `${data.by} sohbeti temizledi.` });
        };

        socket.on('mic:acquired', onMicAcquired);
        socket.on('mic:released', onMicReleased);
        socket.on('mic:timer-expired', onMicTimerExpired);
        socket.on('mic:denied', onMicDenied);
        socket.on('mic:granted', onMicGranted);
        socket.on('mic:queue-updated', onQueueUpdated);
        socket.on('mic:user-granted', onUserGranted);
        socket.on('mic:force-released', onMicForceReleased);
        socket.on('room:kicked', onRoomKicked);
        socket.on('room:hard-kicked', onRoomHardKicked);
        socket.on('room:banned', onRoomBanned);
        socket.on('session:kicked', onSessionKicked);
        socket.on('room:moderation', onRoomModeration);
        socket.on('room:chat-lock', onChatLock);
        socket.on('room:clear-user-messages', onClearUserMessages);
        socket.on('room:chat-cleared', onChatCleared);

        // ★ BAN LIFTED — Yasak kaldırıldığında overlay'i anlık kaldır
        const onBanLifted = () => {
            setBanInfo(null);
            setToastMessage({ type: 'success', title: 'Yasak Kaldırıldı', message: 'Yasağınız kaldırıldı. Artık tüm özellikleri kullanabilirsiniz.' });
        };
        socket.on('room:ban-lifted', onBanLifted);

        // ★ BAN/UNBAN BROADCAST — Diğer kullanıcılar için anlık sidebar güncellemesi
        const onUserBanned = (data: { userId: string; displayName: string; banLevel: string }) => {
            updateParticipantLocally(data.userId, { isBanned: true } as any);
        };
        const onUserUnbanned = (data: { userId: string; displayName: string }) => {
            updateParticipantLocally(data.userId, { isBanned: false } as any);
        };
        socket.on('room:user-banned', onUserBanned);
        socket.on('room:user-unbanned', onUserUnbanned);

        const onMoveToMeeting = (data: { roomSlug: string; by: string }) => {
            setToastMessage({ type: 'info', title: '🔒 Toplantıya Çekildiniz', message: `${data.by} sizi toplantı odasına çekti.` });
            const currentPath = window.location.pathname;
            const tenantMatch = currentPath.match(/^\/t\/([^/]+)/);
            if (tenantMatch) {
                window.location.href = `/t/${tenantMatch[1]}/room/${data.roomSlug}`;
            } else {
                window.location.href = `/room/${data.roomSlug}`;
            }
        };
        socket.on('room:moveToMeeting', onMoveToMeeting);

        const onUserStatusChanged = (data: { userId: string; status: string; isInvisible: boolean }) => {
            console.log('[Status Change]', data);

            // Update in participants list so sidebar reflects immediately
            updateParticipantLocally(data.userId, { status: data.status, isStealth: data.isInvisible } as any);

            // Update Local User State if it is me
            if (currentUser && data.userId === currentUser.userId) {
                setCurrentUser((prev: any) => ({
                    ...prev,
                    status: data.status,
                    isStealth: data.isInvisible
                }));
            }
        };
        socket.on('user-status-changed', onUserStatusChanged);

        const onSessionUpdate = (data: { displayName?: string; role?: string; avatar?: string }) => {
            setCurrentUser((prev: any) => {
                if (!prev) return prev;
                const newState = { ...prev, ...data };
                if (data.displayName) {
                    newState.displayName = data.displayName;
                    newState.username = data.displayName;
                }
                try {
                    localStorage.setItem('soprano_user', JSON.stringify(newState));
                } catch (e) { console.error(e); }
                // Also update participant list so sidebar reflects the change immediately
                if (data.role && prev.userId) {
                    updateParticipantLocally(prev.userId, { role: data.role } as any);
                }
                return newState;
            });
            // Session update applied silently (no toast needed)
        };
        socket.on('auth:session-update', onSessionUpdate);

        // DM Listener
        const onDmReceive = (data: { id: string; from: string; fromUserId: string; to: string; toUserId: string; message: string; timestamp: number; isSelf: boolean }) => {
            // Determine the partner (the other person)
            const partnerName = data.isSelf ? data.to : data.from;
            const partnerUserId = data.isSelf ? data.toUserId : data.fromUserId;

            // ★ DM Ignore: gelen mesaj ignore edilen kullanıcıdan geliyorsa sessizce engelle
            if (!data.isSelf && dmIgnoredUserIdsRef.current.has(data.fromUserId)) {
                return; // Mesajı gösterme, DM penceresi açma
            }

            // Auto-open DM window for incoming messages
            setOpenDMs(prev => {
                if (!prev.includes(partnerName)) return [...prev, partnerName];
                return prev;
            });

            // Add to messages
            setDmMessages((prev: any) => ({
                ...prev,
                [partnerName]: [
                    ...(prev[partnerName] || []),
                    { id: data.id, from: data.from, message: data.message, timestamp: data.timestamp, isSelf: data.isSelf }
                ]
            }));
        };

        socket.on('dm:receive', onDmReceive);

        // Socket disconnect — mic state temizle
        const onDisconnect = () => {
            setIsMicOn(false);
            setCurrentSpeaker(null);
            setDuelSpeakers([]);
            stopCountdown();
            cleanupMicStream();
        };
        socket.on('disconnect', onDisconnect);

        return () => {
            socket.off('mic:acquired', onMicAcquired);
            socket.off('mic:released', onMicReleased);
            socket.off('mic:timer-expired', onMicTimerExpired);
            socket.off('mic:denied', onMicDenied);
            socket.off('mic:granted', onMicGranted);
            socket.off('mic:queue-updated', onQueueUpdated);
            socket.off('mic:user-granted', onUserGranted);
            socket.off('mic:force-released', onMicForceReleased);
            socket.off('room:kicked', onRoomKicked);
            socket.off('room:hard-kicked', onRoomHardKicked);
            socket.off('room:banned', onRoomBanned);
            socket.off('session:kicked', onSessionKicked);
            socket.off('room:moderation', onRoomModeration);
            socket.off('room:chat-lock', onChatLock);
            socket.off('room:clear-user-messages', onClearUserMessages);
            socket.off('room:chat-cleared', onChatCleared);
            socket.off('room:moveToMeeting', onMoveToMeeting);
            socket.off('auth:session-update', onSessionUpdate);
            socket.off('dm:receive', onDmReceive);
            socket.off('room:ban-lifted', onBanLifted);
            socket.off('room:user-banned', onUserBanned);
            socket.off('room:user-unbanned', onUserUnbanned);
            socket.off('disconnect', onDisconnect);
        };
    }, [socket, startCountdown, stopCountdown]); // Removed isCameraOn/isMicOn — now accessed via refs

    // Filter Logic States
    const [clearedUserIds, setClearedUserIds] = useState<Map<string, number>>(new Map());
    const [forceClearTimestamp, setForceClearTimestamp] = useState<number>(0);
    const [stopChatTimestamp, setStopChatTimestamp] = useState<number>(0); // For local stop

    // Cleanup mic stream helper
    const cleanupMicStream = useCallback(() => {
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
    }, []);

    // 3. User & Message Mapping
    const users: User[] = useMemo(() => {
        return socketParticipants.map((p: SocketParticipant) => {
            const authUser = getAuthUser();
            const isSelf = authUser && p.userId === authUser.userId;
            // Check if this user has a video track — local or remote
            const hasLocalVideo = isSelf ? isCameraOn : false;
            const hasRemoteVideo = !isSelf && mediaRemoteStreams.some(s => s.userId === p.userId && s.kind === 'video');
            const hasVideoTrack = hasLocalVideo || hasRemoteVideo;
            return {
                id: p.userId,
                userId: p.userId,
                socketId: p.socketId,
                username: p.displayName,
                displayName: p.displayName,
                avatar: (() => {
                    const av = p.avatar;
<<<<<<< HEAD
                    if (!av) return `/avatars/neutral_1.png`;
                    // GIF avatarlar sadece GodMaster'a özel
                    const isGif = av.toLowerCase().endsWith('.gif') || av.startsWith('data:image/gif');
                    if (isGif && (p.role || 'member').toLowerCase() !== 'godmaster') {
                        return `/avatars/neutral_1.png`;
=======
                    if (!av) return generateGenderAvatar(p.displayName);
                    // GIF avatarlar sadece GodMaster'a özel
                    const isGif = av.toLowerCase().endsWith('.gif') || av.startsWith('data:image/gif');
                    if (isGif && (p.role || 'member').toLowerCase() !== 'godmaster') {
                        return generateGenderAvatar(p.displayName);
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
                    }
                    return av;
                })(),
                isOnline: true,
                isMicOn: currentSpeaker?.userId === p.userId,
                micState: currentSpeaker?.userId === p.userId ? 'speaker' as const : 'listener' as const,
                cameraOn: hasVideoTrack,
                role: p.role || 'member',
                isStealth: p.isStealth,
                status: (p.status as any) || 'online',
                isMuted: p.isMuted,
                isGagged: p.isGagged,
                isCamBlocked: p.isCamBlocked,
                isBanned: p.isBanned,
                nameColor: (p as any).nameColor,
                godmasterIcon: (p as any).godmasterIcon,
                platform: (p as any).platform || 'web',
            };
        });
    }, [socketParticipants, currentSpeaker, isCameraOn, mediaRemoteStreams]);

    const messages: Message[] = useMemo(() => {
        return socketMessages
            .filter(m => {
                // Global clear check (if message older than clear timestamp)
                // We don't have message timestamps easily parsable, assuming new messages come after.
                // Actually socketMessages contains history.
                // If we force clear, we essentially want to hide everything BEFORE now.
                // But `socketMessages` is permanent in useSocket...
                // Quick fix: if forceClearTimestamp > 0, hide all existing?
                // Better: Check if `m.createdAt` (string) < forceClearTimestamp.
                if (forceClearTimestamp > 0 && new Date(m.createdAt).getTime() < forceClearTimestamp) return false;
                // Local Chat Stop Check
                if (isLocalChatStopped && stopChatTimestamp > 0 && new Date(m.createdAt).getTime() > stopChatTimestamp) return false;
                // User clear check
                // User clear check — only hide messages sent BEFORE the clear timestamp
                const clearTimeSender = clearedUserIds.get(m.sender);
                const clearTimeName = m.senderName ? clearedUserIds.get(m.senderName) : undefined;
                const clearTime = clearTimeSender || clearTimeName;
                if (clearTime && new Date(m.createdAt).getTime() < clearTime) return false;
                // Sender ID check might need `m.sender` (sub)
                return true;
            })
            .map((m: SocketMessage) => ({
                id: m.id,
                message: m.content,
                content: m.content,
                sender: m.senderName || m.sender, // Prefer senderName (Display Name)
                timestamp: m.createdAt,
                type: (m as any).type === 'system' ? 'system' as const : 'user' as const,
                avatar: m.senderAvatar,
                role: m.role || 'member',
                nameColor: m.senderNameColor,
                reactions: (m as any).reactions,
            }));
    }, [socketMessages, clearedUserIds, forceClearTimestamp, isLocalChatStopped, stopChatTimestamp]);

    // 4. Initialization — LiveKit handles media, no mediasoup init needed

    useEffect(() => {
        const user = ensureAuthUser();
        if (user) setCurrentUser(user);
    }, []);

    // ─── Bonus toast (oda giriş, günlük, VIP haftalık) ───
    useEffect(() => {
        if (lastBonus) {
            setToastMessage({ type: 'success', title: '🎁 Bonus', message: lastBonus.message });
        }
    }, [lastBonus]);

    // Merge static auth user with live socket participant data (for isStealth, isMuted, etc.)
    const mergedCurrentUser = useMemo(() => {
        if (!currentUser) return null;
        const socketSelf = socketParticipants.find(
            (p: SocketParticipant) => p.userId === currentUser.userId || p.displayName === currentUser.username
        );
        if (socketSelf) {
            return {
                ...currentUser,
                displayName: socketSelf.displayName || currentUser.displayName || currentUser.username,
                username: socketSelf.displayName || currentUser.username,
                avatar: socketSelf.avatar || currentUser.avatar,
                nameColor: (socketSelf as any).nameColor || currentUser.nameColor,
                isStealth: socketSelf.isStealth ?? false,
                status: socketSelf.status || 'online',
                isMuted: socketSelf.isMuted ?? false,
                isGagged: socketSelf.isGagged ?? false,
                isCamBlocked: socketSelf.isCamBlocked ?? false,
                isBanned: socketSelf.isBanned ?? false,
                role: socketSelf.role || currentUser.role,
                socketId: socketSelf.socketId,
                visibilityMode: (socketSelf as any).visibilityMode,
                permissions: userPermissions || currentUser.permissions,
            };
        }
        return { ...currentUser, permissions: userPermissions || currentUser.permissions };
    }, [currentUser, socketParticipants, userPermissions]);

    // ─── Reset mic/speaker state when slug (room) changes ───
    // When the socket reconnects for a new room, React state persists.
    // We must explicitly clear speaker/mic state so the UI reflects the new room.
    useEffect(() => {
        setCurrentSpeaker(null);
        setDuelSpeakers([]);
        setIsMicOn(false);
        setMicTimeLeft(0);
        stopCountdown();
        cleanupMicStream();
        setQueue([]);
        setIsChatLocked(false);
        setIsCurrentUserMuted(false);
        setIsCurrentUserGagged(false);
    }, [slug]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCountdown();
            cleanupMicStream();
        };
    }, []);

    // 5. Actions Adapter
    const actions = {
        sendMessage: (text: string) => sendSocketMessage(text),

        takeMic: async () => {
            if (!socket) return;
            if (isCurrentUserMuted) {
                setToastMessage({ type: 'error', title: '🔇 Mikrofon Engelli', message: 'Susturuldunuz.' });
                return;
            }
            // Emit mic:take
            socket.emit('mic:take', { roomId: slug, userId: currentUser?.userId });
        },
        requestMic: async () => {
            // Alias for joinQueue now
            if (!socket) return;
            if (isCurrentUserMuted) {
                setToastMessage({ type: 'error', title: '🔇 Mikrofon Engelli', message: 'Susturuldunuz.' });
                return;
            }
            // For queue system, we request only. Media is acquired on grant.
            socket.emit('mic:request', { roomId: slug, userId: currentUser?.userId });
        },

        releaseMic: () => {
            if (!socket) return;
            socket.emit('mic:release', { roomId: slug });
            setIsMicOn(false);
            cleanupMicStream();
            closeAudioProducer();
        },

        forceTakeMic: (targetSocketId?: string) => {
            if (!socket) return;
            socket.emit('mic:force-take', { roomId: slug, targetSocketId });
        },

        joinQueue: () => {
            if (!socket) return;
            if (isCurrentUserMuted) {
                setToastMessage({ type: 'error', title: '🔇 Mikrofon Engelli', message: 'Susturuldunuz.' });
                return;
            }
            socket.emit('mic:request', { roomId: slug, userId: currentUser?.userId });
        },

        leaveQueue: () => {
            if (!socket) return;
            socket.emit('mic:leave-queue', { roomId: slug, userId: currentUser?.userId });
        },

        grantMic: (targetUserId: string) => {
            if (!socket) return;
            socket.emit('mic:grant', { roomId: slug, userId: targetUserId });
        },

        denyMic: (targetUserId: string) => {
            if (!socket) return;
            socket.emit('mic:deny', { roomId: slug, userId: targetUserId });
        },

        toggleCamera: async () => {
            if (isCameraOn) {
                // Stop camera
                if (localStream) {
                    localStream.getTracks().forEach(track => track.stop());
                }
                setLocalStream(null);
                setIsCameraOn(false);
                // Close mediasoup video producer
                await closeVideoProducer();
            } else {
                // Kamera engelli mi kontrol et
                const socketSelf = socketParticipants.find(
                    (p: SocketParticipant) => p.userId === currentUser?.userId || p.displayName === currentUser?.username
                );
                if (socketSelf?.isCamBlocked) {
                    setToastMessage({ type: 'error', title: '📷 Kamera Engelli', message: 'Kameranız yönetici tarafından engellenmiştir.' });
                    return;
                }

                try {
                    const constraints: MediaStreamConstraints = { video: selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true, audio: false };
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    setLocalStream(stream);
                    setIsCameraOn(true);

                    // Produce video via mediasoup so other users can see it
                    const videoTrack = stream.getVideoTracks()[0];
                    if (videoTrack) {
                        await produceVideo(videoTrack);
                    }
                } catch (err: any) {
                    setToastMessage({ type: 'error', title: 'Kamera açılamadı', message: err.message || 'Tarayıcı izni reddedilmiş olabilir.' });
                }
            }
        },

        // ─── Zoom-style meeting room mic toggle ───
        toggleMeetingMic: async () => {
            if (isCurrentUserMuted) {
                setToastMessage({ type: 'error', title: '🔇 Mikrofon Engelli', message: 'Susturuldunuz.' });
                return;
            }
            if (isMicOnRef.current) {
                setIsMicOn(false);
                cleanupMicStream();
                closeAudioProducer();
            } else {
                try {
                    const constraints: MediaStreamConstraints = {
                        audio: selectedAudioDeviceId
                            ? { deviceId: { exact: selectedAudioDeviceId } }
                            : true,
                    };
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    micStreamRef.current = stream;
                    setIsMicOn(true);
                    const audioTrack = stream.getAudioTracks()[0];
                    if (audioTrack) {
                        await produceAudio(audioTrack);
                    }
                } catch (err: any) {
                    setToastMessage({ type: 'error', title: 'Mikrofon Hatası', message: err.message || 'Mikrofon açılamıyor.' });
                }
            }
        },

        leaveRoom: () => {
            // 0. Forfeit active duel before leaving
            if (socket) {
                socket.emit('duel:forfeit');
            }

            // 1. Release mic before leaving
            if (isMicOn && socket) {
                socket.emit('mic:release', { roomId: slug });
                cleanupMicStream();
            }

            // 2. Stop camera
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                setLocalStream(null);
                setIsCameraOn(false);
            }

            // 3. Disconnect socket cleanly
            if (socket) {
                socket.disconnect();
            }

            // 4. Ana pencereye (opener) odadan çıkış bilgisi gönder
            // Token/auth BURADA TEMİZLENMEZ — ana sayfa soracak
            const currentPath = window.location.pathname;
            const tenantMatch = currentPath.match(/^\/t\/([^/]+)/);
            try {
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage({
                        type: 'soprano-room-exit',
                        tenantSlug: tenantMatch ? tenantMatch[1] : null,
                    }, '*');
                }
            } catch (e) {
                console.warn('Failed to notify opener:', e);
            }

            // 5. Pencereyi kapat (popup olarak açıldıysa). Kapanamıyorsa redirect yap.
            try {
                window.close();
            } catch (e) { /* tarayıcı engelleyebilir */ }

            // window.close() çalışmadıysa (tarayıcı engellediyse) fallback redirect
            setTimeout(() => {
                if (!window.closed) {
                    if (tenantMatch && tenantMatch[1] !== 'system') {
                        window.location.href = `/t/${tenantMatch[1]}`;
                    } else {
                        window.location.href = '/';
                    }
                }
            }, 300);
        },

        refreshDevices: async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                setAvailableDevices({
                    videoInputs: devices.filter(d => d.kind === 'videoinput'),
                    audioInputs: devices.filter(d => d.kind === 'audioinput'),
                    audioOutputs: devices.filter(d => d.kind === 'audiooutput')
                });
            } catch (e) { console.error(e); }
        },

        setSelectedVideoDeviceId,
        setSelectedAudioDeviceId,
        setStereoMode,
        showToast: (type: any, title: any, msg: any) => setToastMessage({ type, title, message: msg }),
        toggleRemoteVolume: () => setIsRemoteMuted(prev => !prev),
        setRemoteVolume,
        dismissError: () => setLastError(null),
        toggleStealth: () => {
            if (!socket) return;
            const currentlyStealthed = mergedCurrentUser?.isStealth;
            const newStatus = currentlyStealthed ? 'online' : 'stealth';
            // ★ sessionStorage'a oturum-içi görünürlük tercihini kaydet
            // Böylece oda değişikliklerinde buildJoinPayload bu tercihi kullanır
            if (typeof window !== 'undefined') {
                if (newStatus === 'online') {
                    sessionStorage.setItem('soprano_session_visibility', 'online');
                } else {
                    sessionStorage.removeItem('soprano_session_visibility');
                }
            }
            // Optimistic local update for instant UI feedback
            if (mergedCurrentUser?.userId) {
                updateParticipantLocally(mergedCurrentUser.userId, {
                    isStealth: !currentlyStealthed,
                    status: newStatus,
                });
            }
            socket.emit('status:change', { status: newStatus });
            console.log(`[toggleStealth] ${currentlyStealthed ? 'visible' : 'stealth'} → emit status:change(${newStatus})`);
        },
        changeStatus: (newStatus: string) => {
            console.log(`[changeStatus] called with status=${newStatus}, socket=${!!socket}, connected=${socket?.connected}`);
            if (!socket) {
                console.warn('[changeStatus] SOCKET IS NULL — cannot emit status:change');
                return;
            }
            if (!socket.connected) {
                console.warn('[changeStatus] SOCKET IS DISCONNECTED — cannot emit status:change');
                return;
            }
            const isStealth = newStatus === 'stealth';
            // ★ sessionStorage'a oturum-içi görünürlük tercihini kaydet
            if (typeof window !== 'undefined') {
                if (!isStealth && newStatus !== 'stealth') {
                    sessionStorage.setItem('soprano_session_visibility', newStatus);
                } else {
                    sessionStorage.removeItem('soprano_session_visibility');
                }
            }
            // Optimistic local update
            if (mergedCurrentUser?.userId) {
                updateParticipantLocally(mergedCurrentUser.userId, {
                    isStealth,
                    status: newStatus,
                });
            }
            socket.emit('status:change', { status: newStatus });
            console.log(`[changeStatus] ✅ emitted status:change(${newStatus})`);
        },
        setGodmasterVisibility: (mode: 'hidden' | 'visible' | 'disguised', disguiseName?: string) => {
            console.log(`[setGodmasterVisibility] CALLED! mode=${mode}, socket=${!!socket}, disguiseName=${disguiseName}`);
            if (!socket) {
                console.error('[setGodmasterVisibility] SOCKET IS NULL! Cannot emit.');
                return;
            }
            const statusMap = {
                hidden: 'godmaster-hidden',
                visible: 'godmaster-visible',
                disguised: 'godmaster-disguised',
            };
            console.log(`[setGodmasterVisibility] Emitting status:change with status=${statusMap[mode]}`);
            socket.emit('status:change', { status: statusMap[mode], disguiseName });
            // ★ sessionStorage'a GodMaster görünürlük tercihini kaydet
            if (typeof window !== 'undefined') {
                if (mode === 'visible' || mode === 'disguised') {
                    sessionStorage.setItem('soprano_session_visibility', statusMap[mode]);
                } else {
                    sessionStorage.removeItem('soprano_session_visibility');
                }
            }
            // Optimistic local update — instant visual feedback
            if (mergedCurrentUser?.userId) {
                const optimistic: any = {
                    visibilityMode: mode,
                    isStealth: mode === 'hidden',
                    status: mode === 'hidden' ? 'stealth' : 'online',
                };
                // In disguised mode, show disguised name and avatar immediately
                if (mode === 'disguised') {
                    const dName = disguiseName || 'Misafir';
                    optimistic.displayName = dName;
                    optimistic.avatar = `/avatars/neutral_1.png`;
                } else if (mode === 'visible') {
                    // Restore original name/avatar from currentUser
                    optimistic.displayName = mergedCurrentUser.displayName;
                    optimistic.avatar = mergedCurrentUser.avatar;
                }
                updateParticipantLocally(mergedCurrentUser.userId, optimistic);
            }
            console.log(`[GodMaster Visibility] → ${mode}${disguiseName ? ` as "${disguiseName}"` : ''}`);
        },
        // Local Chat Actions
        clearLocalChat: () => {
            setForceClearTimestamp(Date.now());
        },
        toggleLocalChatStop: () => {
            setIsLocalChatStopped(prev => {
                const newVal = !prev;
                if (newVal) setStopChatTimestamp(Date.now());
                else setStopChatTimestamp(0);
                return newVal;
            });
        },
        // DM Actions
        openDM: (targetUsername: string) => {
            setOpenDMs(prev => {
                if (prev.includes(targetUsername)) return prev;
                return [...prev, targetUsername];
            });
        },
        closeDM: (targetUsername: string) => {
            setOpenDMs(prev => prev.filter(u => u !== targetUsername));
        },
        sendDM: (targetUsername: string, text: string) => {
            if (!socket) return;
            // Find target userId from participants
            const target = socketParticipants.find((p: SocketParticipant) => p.displayName === targetUsername);
            if (!target) return;
            socket.emit('dm:send', { targetUserId: target.userId, content: text });
        },
        // ─── Bire Bir Görüşme Ses Akışı (LiveKit handles transport) ───────────────
        startDirectAudio: async () => {
            setIsMicOn(true);
            try {
                const constraints: MediaStreamConstraints = {
                    audio: selectedAudioDeviceId
                        ? { deviceId: { exact: selectedAudioDeviceId } }
                        : true,
                };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                micStreamRef.current = stream;
                const audioTrack = stream.getAudioTracks()[0];
                if (audioTrack) {
                    await produceAudio(audioTrack);
                    console.log('[ONE2ONE] Audio track produced via mediasoup');
                }
            } catch (err: any) {
                console.error('[ONE2ONE] Failed to capture audio:', err);
            }
        },
        stopDirectAudio: () => {
            if (micStreamRef.current) {
                micStreamRef.current.getTracks().forEach(t => t.stop());
                micStreamRef.current = null;
            }
            closeAudioProducer();
            setIsMicOn(false);
            console.log('[ONE2ONE] Audio stopped + producer closed');
        },
    };

    // 6. Stream Mapping — Mediasoup remote streams mapped to useVideoState format
    const remoteStreams = useMemo(() => {
        return mediaRemoteStreams.map(s => ({
            peerId: s.userId,
            stream: s.stream,
            username: s.userId,
            kind: s.kind,
        }));
    }, [mediaRemoteStreams]);

    // ─── Audio Level Monitoring for Meeting Room ───
    useEffect(() => {
        if (mediaRemoteStreams.length === 0) return;
        let audioCtx: AudioContext | null = null;
        try { audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return; }
        const analysers = new Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>();
        let rafId: number;

        mediaRemoteStreams.forEach(rs => {
            if (rs.kind !== 'audio') return;
            try {
                const source = audioCtx!.createMediaStreamSource(rs.stream);
                const analyser = audioCtx!.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.5;
                source.connect(analyser);
                analysers.set(rs.userId, { analyser, source });
            } catch { /* ignore */ }
        });

        let prevKeys = '';
        const poll = () => {
            const levels: Record<string, number> = {};
            analysers.forEach((val, uid) => {
                const data = new Uint8Array(val.analyser.frequencyBinCount);
                val.analyser.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                const normalized = Math.min(avg / 80, 1);
                if (normalized > 0.05) levels[uid] = Math.round(normalized * 100) / 100;
            });
            // Sadece konuşanlar değiştiğinde state güncelle (her frame'de yeni obje oluşturmayı önle)
            const curKeys = Object.keys(levels).sort().map(k => `${k}:${levels[k]}`).join(',');
            if (curKeys !== prevKeys) {
                prevKeys = curKeys;
                setSpeakingUsers(levels);
            }
            rafId = requestAnimationFrame(poll);
        };
        rafId = requestAnimationFrame(poll);

        return () => {
            cancelAnimationFrame(rafId);
            analysers.forEach(v => { v.source.disconnect(); });
            analysers.clear();
            audioCtx?.close().catch(() => { });
        };
    }, [mediaRemoteStreams]);

    return {
        state: {
            users,
            messages,
            currentUser: mergedCurrentUser,
            localStream,
            remoteStreams,
            activeStream: null,
            isCameraOn,
            isMicOn,
            availableDevices,
            selectedVideoDeviceId,
            selectedAudioDeviceId,
            stereoMode,
            toastMessage,
            currentSpeaker,
            duelSpeakers,
            micTimeLeft,
            queue,
            remoteVolume,
            isRemoteMuted,
            lastError,
            dmMessages,
            openDMs,
            isChatLocked,
            isLocalChatStopped,
            isCurrentUserMuted,
            isCurrentUserGagged,
            banInfo,
            rooms: socketRooms,
            roomSettings,
            roomError,
            systemSettings,
            tenantSuspended,
            paymentReminder,
            announcement,
            hasNewAnnouncement,
            sessionKicked,
            duplicateBlocked,
            userPermissions,
            speakingUsers,
            actionIndicators,
        },
        actions: {
            ...actions,
            closeVideoProducer,
            updateParticipantLocally,
            joinWithPassword,
            dismissPaymentReminder: () => setPaymentReminder(null),
            dismissAnnouncement: () => { setAnnouncement(null); setHasNewAnnouncement(false); },
            markAnnouncementSeen: () => setHasNewAnnouncement(false),
            setDmIgnoredUserIds: (ids: Set<string>) => { dmIgnoredUserIdsRef.current = ids; },
            setActionIndicators,
        },
        socket,
        passwordRequired,
    };
}
