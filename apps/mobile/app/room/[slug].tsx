import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SIZES, ROLE_COLORS } from '@/constants';
import { useAuthStore } from '@/stores/authStore';
import { getSocket } from '@/services/socket';
import LiveKitMedia, { LiveKitMediaHandle } from '@/components/LiveKitAudio';
import RoomHeader, { RoomInfo } from '@/components/RoomHeader';
import UserListPanel, { RoomParticipant } from '@/components/UserListPanel';
import BottomToolbar from '@/components/BottomToolbar';
import ChatMessages, { ChatMessage } from '@/components/ChatMessages';
import DMWindow from '@/components/DMWindow';
import ProfileModal from '@/components/ProfileModal';
import RadioPlayer from '@/components/RadioPlayer';
import GiftPanel from '@/components/GiftPanel';
import ContextMenu from '@/components/ContextMenu';
import BanOverlay from '@/components/BanOverlay';
import DuelArena from '@/components/DuelArena';
import MeetingModal from '@/components/MeetingModal';
import RoomMonitorModal from '@/components/RoomMonitorModal';
import AllUsersModal from '@/components/AllUsersModal';
import TokenShop from '@/components/TokenShop';
import GodMasterProfileModal from '@/components/GodMasterProfileModal';
import OneToOneCallView from '@/components/OneToOneCallView';
import EmojiPicker from '@/components/EmojiPicker';
import StickerPicker from '@/components/StickerPicker';
import GifPicker from '@/components/GifPicker';
import GiftAnimation from '@/components/GiftAnimation';
import UserHistoryModal from '@/components/UserHistoryModal';
import ChangeNameModal from '@/components/ChangeNameModal';
import MeetingRoomBanner from '@/components/MeetingRoomBanner';
import CameraPreview from '@/components/CameraPreview';
import { mediasoupCamera } from '@/services/mediasoupCamera';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ChatMessage is now imported from ChatMessages component

export default function RoomScreen() {
    const { slug: rawSlug } = useLocalSearchParams<{ slug: string }>();
    const [activeSlug, setActiveSlug] = useState(rawSlug || '');
    const user = useAuthStore((s) => s.user);
    const router = useRouter();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [participants, setParticipants] = useState<RoomParticipant[]>([]);
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [inputText, setInputText] = useState('');
    const [showUsers, setShowUsers] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const flatListRef = useRef<any>(null);
    const liveKitRef = useRef<LiveKitMediaHandle>(null);

    // ═══ Mic / Camera / Queue state ═══
    const [isMicOn, setIsMicOn] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isMeSpeaker, setIsMeSpeaker] = useState(false);
    const [isInQueue, setIsInQueue] = useState(false);
    const [queueCount, setQueueCount] = useState(0);
    const [isChatLocked, setIsChatLocked] = useState(false);
    const [isGagged, setIsGagged] = useState(false);
    const [systemSettings, setSystemSettings] = useState<any>(null);

    // ═══ Modal state ═══
    const [dmTarget, setDmTarget] = useState<RoomParticipant | null>(null);
    const [profileTarget, setProfileTarget] = useState<RoomParticipant | null>(null);
    const [giftTarget, setGiftTarget] = useState<RoomParticipant | null>(null);
    const [contextTarget, setContextTarget] = useState<RoomParticipant | null>(null);
    const [showRadio, setShowRadio] = useState(false);
    const [showMeeting, setShowMeeting] = useState(false);
    const [meetingMode, setMeetingMode] = useState<'meeting' | 'conference'>('meeting');
    const [showRoomMonitor, setShowRoomMonitor] = useState(false);
    const [showAllUsers, setShowAllUsers] = useState(false);
    const [showTokenShop, setShowTokenShop] = useState(false);
    const [showGodMaster, setShowGodMaster] = useState(false);
    const [activeCallData, setActiveCallData] = useState<any>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [giftAnimData, setGiftAnimData] = useState<any>(null);
    const [historyTarget, setHistoryTarget] = useState<RoomParticipant | null>(null);
    const [showChangeName, setShowChangeName] = useState(false);
    const [isMeetingRoom, setIsMeetingRoom] = useState(false);
    const [meetingInfo, setMeetingInfo] = useState<any>(null);
    const [isBanned, setIsBanned] = useState(false);
    const [banInfo, setBanInfo] = useState<any>(null);

    // Sync slug from params
    useEffect(() => { if (rawSlug) setActiveSlug(rawSlug); }, [rawSlug]);

    // ═══ SOCKET CONNECTION — Web ile aynı event yapısı ═══
    useEffect(() => {
        const socket = getSocket();
        if (!socket || !activeSlug) return;

        // ─── room:join (web ile aynı payload) ────────────────
        socket.emit('room:join', {
            roomId: activeSlug,
            avatar: user?.avatar,
            gender: user?.gender,
        });

        // ─── room:joined — mesajlar, katılımcılar, odalar ───
        const onJoined = (data: {
            messages: ChatMessage[];
            participants: RoomParticipant[];
            rooms?: RoomInfo[];
            roomSettings?: any;
            systemSettings?: any;
        }) => {
            console.log('[Mobile] room:joined', data.participants?.length, 'participants');
            setMessages(data.messages || []);
            setParticipants(data.participants || []);
            if (data.rooms) setRooms(data.rooms);
            if (data.roomSettings) {
                setIsChatLocked(data.roomSettings.chatLocked || false);
            }
            if (data.systemSettings) {
                setSystemSettings(data.systemSettings);
            }
            setIsConnected(true);

            // Initialize mediasoup for cross-platform camera
            const s = getSocket();
            if (s) {
                mediasoupCamera.init(s as any, activeSlug).catch((err: any) =>
                    console.warn('[Room] Mediasoup init error:', err?.message || err)
                );
            }
        };

        // ─── Chat mesajları ─────────────────────────────────
        const onMessage = (msg: ChatMessage) => {
            setMessages((prev) => [...prev, { ...msg, id: msg.id || `${Date.now()}_${Math.random()}` }]);
        };

        // ─── Participant events ─────────────────────────────
        const onParticipantJoined = (p: RoomParticipant) => {
            setParticipants((prev) => {
                if (prev.find(x => x.userId === p.userId)) return prev;
                return [...prev, p];
            });
        };

        const onParticipantLeft = (payload: { userId: string; socketId: string }) => {
            setParticipants((prev) => prev.filter(p => p.userId !== payload.userId));
        };

        const onParticipants = (data: { participants: RoomParticipant[] }) => {
            setParticipants(data.participants || []);
        };

        // ─── Room count updates ─────────────────────────────
        const onRoomCounts = (data: { roomCounts: Record<string, number> }) => {
            setRooms(prev => prev.map(room => ({
                ...room,
                participantCount: data.roomCounts[room.slug] ?? room.participantCount,
            })));
        };

        // ─── Ban/unban ──────────────────────────────────────
        const onBanned = (data: { userId: string }) => {
            setParticipants(prev => prev.map(p =>
                p.userId === data.userId ? { ...p, isBanned: true } : p
            ));
        };
        const onUnbanned = (data: { userId: string }) => {
            setParticipants(prev => prev.map(p =>
                p.userId === data.userId ? { ...p, isBanned: false } : p
            ));
        };

        // ─── System messages ────────────────────
        const onSystemMessage = (data: any) => {
            if (data.content || data.message) {
                setMessages((prev) => [...prev, {
                    id: `sys_${Date.now()}`,
                    message: data.content || data.message,
                    sender: data.senderName || '🔔 Sistem',
                    type: 'system' as const,
                    timestamp: Date.now(),
                }]);
            }
        };

        // ─── Mic / Speaker events ────────────────────────────
        const onMicAcquired = (data: any) => {
            if (data.userId === user?.userId) {
                setIsMicOn(true);
                setIsMeSpeaker(true);
            }
        };
        const onMicReleased = (data: any) => {
            if (data.userId === user?.userId) {
                setIsMicOn(false);
                setIsMeSpeaker(false);
            }
        };
        const onMicGranted = () => {
            setIsMicOn(true);
            setIsMeSpeaker(true);
        };
        const onQueueUpdate = (queue: string[]) => {
            const q = Array.isArray(queue) ? queue : [];
            setQueueCount(q.length);
            setIsInQueue(q.includes(user?.userId || ''));
        };
        const onChatLocked = (data: { locked: boolean }) => setIsChatLocked(data.locked);
        const onGagged = (data: { userId: string; gagged: boolean }) => {
            if (data.userId === user?.userId) setIsGagged(data.gagged);
        };

        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));
        socket.on('room:joined', onJoined);
        socket.on('chat:message', onMessage);
        socket.on('room:participant-joined', onParticipantJoined);
        socket.on('room:participant-left', onParticipantLeft);
        socket.on('room:participants', onParticipants);
        socket.on('rooms:count-updated', onRoomCounts);
        socket.on('room:user-banned', onBanned);
        socket.on('room:user-unbanned', onUnbanned);
        socket.on('room:system-message', onSystemMessage);
        socket.on('mic:acquired', onMicAcquired);
        socket.on('mic:released', onMicReleased);
        socket.on('mic:granted', onMicGranted);
        socket.on('mic:queue-updated', onQueueUpdate);
        socket.on('room:chat-locked', onChatLocked);
        socket.on('room:user-gagged', onGagged);

        // ─── Gift animation ──────────────────────────────────
        const onGiftAnimation = (data: any) => {
            setGiftAnimData(data);
        };
        socket.on('gift:animation', onGiftAnimation);

        // ─── Ban/kicked detection ────────────────────────────
        const onRoomBanned = (data: any) => {
            if (data.userId === user?.userId || !data.userId) {
                setIsBanned(true);
                setBanInfo(data);
            }
        };
        const onRoomKicked = () => {
            router.back();
        };
        socket.on('room:banned', onRoomBanned);
        socket.on('room:kicked', onRoomKicked);

        // ─── One-to-one call incoming ────────────────────────
        const onCallIncoming = (data: any) => {
            setActiveCallData(data);
        };
        socket.on('one2one:incoming', onCallIncoming);

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('room:joined', onJoined);
            socket.off('chat:message', onMessage);
            socket.off('room:participant-joined', onParticipantJoined);
            socket.off('room:participant-left', onParticipantLeft);
            socket.off('room:participants', onParticipants);
            socket.off('rooms:count-updated', onRoomCounts);
            socket.off('room:user-banned', onBanned);
            socket.off('room:user-unbanned', onUnbanned);
            socket.off('room:system-message', onSystemMessage);
            socket.off('mic:acquired', onMicAcquired);
            socket.off('mic:released', onMicReleased);
            socket.off('mic:granted', onMicGranted);
            socket.off('mic:queue-updated', onQueueUpdate);
            socket.off('room:chat-locked', onChatLocked);
            socket.off('room:user-gagged', onGagged);
            socket.off('gift:animation', onGiftAnimation);
            socket.off('room:banned', onRoomBanned);
            socket.off('room:kicked', onRoomKicked);
            socket.off('one2one:incoming', onCallIncoming);
        };
    }, [activeSlug, user?.userId]);

    // Auto-scroll on new messages
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages.length]);

    // ═══ SEND MESSAGE — web ile aynı: chat:send ═══
    const sendMessage = useCallback(() => {
        const text = inputText.trim();
        if (!text) return;

        const socket = getSocket();
        if (!socket) return;

        socket.emit('chat:send', {
            roomId: activeSlug,
            content: text,
        });
        setInputText('');
    }, [inputText, activeSlug]);

    // ═══ MIC CONTROLS ═══
    const handleRequestMic = useCallback(() => {
        const socket = getSocket();
        if (socket) socket.emit('mic:take', { roomId: activeSlug, userId: user?.userId });
    }, [activeSlug, user]);

    const handleReleaseMic = useCallback(() => {
        const socket = getSocket();
        if (socket) socket.emit('mic:release', { roomId: activeSlug });
        setIsMicOn(false);
        setIsMeSpeaker(false);
    }, [activeSlug]);

    // ═══ QUEUE CONTROLS ═══
    const handleJoinQueue = useCallback(() => {
        const socket = getSocket();
        if (socket) socket.emit('mic:request', { roomId: activeSlug, userId: user?.userId });
    }, [activeSlug, user]);

    const handleLeaveQueue = useCallback(() => {
        const socket = getSocket();
        if (socket) socket.emit('mic:leave-queue', { roomId: activeSlug, userId: user?.userId });
    }, [activeSlug, user]);

    // ═══ CAMERA TOGGLE — uses getUserMedia directly + mediasoup (not LiveKit) ═══
    const cameraStreamRef = useRef<any>(null);
    const handleToggleCamera = useCallback(async () => {
        try {
            if (isCameraOn) {
                // Stop camera
                if (cameraStreamRef.current) {
                    cameraStreamRef.current.getTracks().forEach((t: any) => t.stop());
                    cameraStreamRef.current = null;
                }
                await mediasoupCamera.closeVideoProducer();
                setIsCameraOn(false);
                console.log('[Room] Camera stopped');
            } else {
                // Start camera — get video stream directly via WebRTC
                const { mediaDevices } = require('@livekit/react-native-webrtc');
                const stream = await mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: 640, height: 480 },
                    audio: false,
                });
                cameraStreamRef.current = stream;

                // Produce through mediasoup for web visibility
                const videoTrack = stream.getVideoTracks()[0];
                if (videoTrack) {
                    await mediasoupCamera.produceVideo(videoTrack);
                    console.log('[Room] Camera produced via mediasoup');
                }

                setIsCameraOn(true);
                console.log('[Room] Camera started');
            }
        } catch (err: any) {
            console.error('[Room] Camera toggle error:', err?.message || err);
        }
    }, [isCameraOn]);

    // ═══ LEAVE ROOM ═══
    const handleLeaveRoom = useCallback(() => {
        const socket = getSocket();
        if (socket) socket.emit('room:leave', { roomId: activeSlug });
        mediasoupCamera.destroy();
        router.back();
    }, [activeSlug, router]);

    // ═══ ROOM SWITCH — odalar arası geçiş ═══
    const handleRoomSwitch = useCallback((room: RoomInfo) => {
        if (room.slug === activeSlug) return;
        setMessages([]);
        setParticipants([]);
        setActiveSlug(room.slug);
    }, [activeSlug]);

    // ═══ REACTION HANDLER ═══
    const handleReaction = useCallback((messageId: string, emoji: string) => {
        const socket = getSocket();
        if (socket) socket.emit('chat:addReaction', { messageId, emoji });
    }, []);

    // ═══ USER INTERACTION HANDLERS ═══
    const handleUserPress = useCallback((participant: RoomParticipant) => {
        setProfileTarget(participant);
    }, []);

    const handleUserLongPress = useCallback((participant: RoomParticipant) => {
        setContextTarget(participant);
    }, []);

    const handleOpenDM = useCallback((participant: RoomParticipant) => {
        setDmTarget(participant);
    }, []);

    const handleOpenGift = useCallback((participant: RoomParticipant) => {
        setGiftTarget(participant);
    }, []);

    // ═══ LAYOUT ═══
    const userListHeight = useMemo(() => Math.min(SCREEN_HEIGHT * 0.4, 300), []);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header with room tabs */}
            <RoomHeader
                currentRoomSlug={activeSlug}
                rooms={rooms}
                participantCount={participants.length}
                onRoomPress={handleRoomSwitch}
                onBackPress={() => router.back()}
                onToggleUsers={() => setShowUsers(!showUsers)}
                showUsers={showUsers}
            />

            {/* Main content: UserList (left) + Chat (right) */}
            <View style={{ flex: 1, flexDirection: 'row' }}>
                {/* User list panel — sol taraf (web SidebarLeft gibi) */}
                {showUsers && (
                    <View style={{ width: '45%', borderRightWidth: 1, borderRightColor: COLORS.border }}>
                        <UserListPanel
                            participants={participants}
                            currentUserId={user?.userId}
                            onUserPress={handleUserPress}
                            onUserLongPress={handleUserLongPress}
                        />
                    </View>
                )}

                {/* Chat + Input — sağ taraf */}
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={0}
                >
                    {/* Messages — web ChatMessages ile birebir aynı */}
                    <ChatMessages
                        messages={messages}
                        currentUsername={user?.displayName || user?.username}
                        onReaction={handleReaction}
                        roomName={rooms.find(r => r.slug === activeSlug)?.name}
                    />

                    {/* LiveKit Audio + Video */}
                    {user && (
                        <LiveKitMedia
                            ref={liveKitRef}
                            room={activeSlug || ''}
                            username={user.displayName || ''}
                            onCameraStateChange={setIsCameraOn}
                            showLocalPreview={isCameraOn}
                        />
                    )}

                    {/* ═══ Bottom Toolbar — web ile aynı yapı ═══ */}
                    <BottomToolbar
                        onSendMessage={(text) => {
                            const socket = getSocket();
                            if (socket) {
                                socket.emit('chat:send', { roomId: activeSlug, content: text });
                            }
                            setInputText('');
                        }}
                        inputText={inputText}
                        onChangeText={setInputText}
                        onRequestMic={handleRequestMic}
                        onReleaseMic={handleReleaseMic}
                        isMicOn={isMicOn}
                        isMeSpeaker={isMeSpeaker}
                        onJoinQueue={handleJoinQueue}
                        onLeaveQueue={handleLeaveQueue}
                        isInQueue={isInQueue}
                        queueCount={queueCount}
                        onToggleCamera={handleToggleCamera}
                        isCameraOn={isCameraOn}
                        hasCameraPackage={systemSettings?.packageType === 'CAMERA'}
                        isChatLocked={isChatLocked}
                        isGagged={isGagged}
                    />

                    {/* Connection status */}
                    {!isConnected && (
                        <View style={styles.connectionBar}>
                            <Text style={styles.connectionText}>⏳ Bağlanıyor...</Text>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </View>

            {/* ═══ CAMERA PREVIEW OVERLAY ═══ */}
            {isCameraOn && (
                <CameraPreview
                    localStream={cameraStreamRef.current}
                    onClose={handleToggleCamera}
                />
            )}

            {/* ═══ BAN OVERLAY ═══ */}
            {isBanned && <BanOverlay reason={banInfo?.reason} bannedBy={banInfo?.bannedBy} expiresAt={banInfo?.expiresAt} />}

            {/* ═══ MODALS ═══ */}
            {dmTarget && (
                <DMWindow
                    visible={!!dmTarget}
                    onClose={() => setDmTarget(null)}
                    targetUserId={dmTarget.userId}
                    targetUsername={dmTarget.displayName || dmTarget.username || ''}
                    targetAvatar={dmTarget.avatar}
                    currentUserId={user?.userId || ''}
                    currentUsername={user?.displayName || user?.username || ''}
                />
            )}

            {profileTarget && (
                <ProfileModal
                    visible={!!profileTarget}
                    onClose={() => setProfileTarget(null)}
                    user={profileTarget}
                    currentUserRole={user?.role}
                    roomId={activeSlug}
                    onDM={() => handleOpenDM(profileTarget)}
                />
            )}

            {giftTarget && (
                <GiftPanel
                    visible={!!giftTarget}
                    onClose={() => setGiftTarget(null)}
                    targetUserId={giftTarget.userId}
                    targetUsername={giftTarget.displayName || giftTarget.username || ''}
                    roomId={activeSlug}
                />
            )}

            <RadioPlayer
                visible={showRadio}
                onClose={() => setShowRadio(false)}
                roomId={activeSlug}
            />

            {contextTarget && (
                <ContextMenu
                    visible={!!contextTarget}
                    onClose={() => setContextTarget(null)}
                    targetUser={contextTarget}
                    currentUserRole={user?.role}
                    onViewProfile={() => setProfileTarget(contextTarget)}
                    onSendDM={() => handleOpenDM(contextTarget)}
                    onSendGift={() => handleOpenGift(contextTarget)}
                    onMute={() => {
                        const socket = getSocket();
                        if (socket) socket.emit(contextTarget.isMuted ? 'room:unmute' : 'room:mute', { roomId: activeSlug, userId: contextTarget.userId });
                    }}
                    onGag={() => {
                        const socket = getSocket();
                        if (socket) socket.emit(contextTarget.isGagged ? 'room:ungag' : 'room:gag', { roomId: activeSlug, userId: contextTarget.userId });
                    }}
                    onKick={() => {
                        const socket = getSocket();
                        if (socket) socket.emit('room:kick', { roomId: activeSlug, userId: contextTarget.userId });
                    }}
                    onBan={() => {
                        const socket = getSocket();
                        if (socket) socket.emit('room:ban', { roomId: activeSlug, userId: contextTarget.userId });
                    }}
                />
            )}

            {/* ═══ DuelArena (inline, auto-shows during duel) ═══ */}
            <DuelArena currentUserId={user?.userId || ''} roomSlug={activeSlug} />

            {/* ═══ Meeting Modal ═══ */}
            <MeetingModal
                visible={showMeeting}
                onClose={() => setShowMeeting(false)}
                roomSlug={activeSlug}
                users={participants}
                mode={meetingMode}
            />

            {/* ═══ Room Monitor (admin) ═══ */}
            <RoomMonitorModal
                visible={showRoomMonitor}
                onClose={() => setShowRoomMonitor(false)}
                currentRoomSlug={activeSlug}
                currentUserRole={user?.role}
                onNavigateToRoom={(slug) => router.push(`/room/${slug}`)}
            />

            {/* ═══ All Users Modal ═══ */}
            <AllUsersModal
                visible={showAllUsers}
                onClose={() => setShowAllUsers(false)}
                onUserPress={(u) => { setShowAllUsers(false); setProfileTarget(u); }}
            />

            {/* ═══ Token Shop ═══ */}
            <TokenShop
                visible={showTokenShop}
                onClose={() => setShowTokenShop(false)}
            />

            {/* ═══ GodMaster Profile (admin only) ═══ */}
            <GodMasterProfileModal
                visible={showGodMaster}
                onClose={() => setShowGodMaster(false)}
                currentUser={user}
            />

            {/* ═══ One-to-One Call View ═══ */}
            {activeCallData && (
                <OneToOneCallView
                    visible={!!activeCallData}
                    currentUser={{ userId: user?.userId || '', displayName: user?.displayName || '', avatar: user?.avatar }}
                    otherUser={activeCallData.otherUser}
                    callId={activeCallData.callId}
                    onHangUp={() => setActiveCallData(null)}
                />
            )}

            {/* ═══ Gift Animation Overlay ═══ */}
            <GiftAnimation
                animationData={giftAnimData}
                onComplete={() => setGiftAnimData(null)}
            />

            {/* ═══ User History Modal ═══ */}
            {historyTarget && (
                <UserHistoryModal
                    visible={!!historyTarget}
                    onClose={() => setHistoryTarget(null)}
                    userId={historyTarget.userId}
                    displayName={historyTarget.displayName}
                />
            )}

            {/* ═══ Change Name Modal ═══ */}
            <ChangeNameModal
                visible={showChangeName}
                onClose={() => setShowChangeName(false)}
                currentName={user?.displayName || ''}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    // Connection status
    connectionBar: {
        backgroundColor: COLORS.warning + '20',
        paddingVertical: 4,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.warning + '30',
    },
    connectionText: {
        color: COLORS.warning,
        fontSize: SIZES.sm,
        fontWeight: '500',
    },
});
