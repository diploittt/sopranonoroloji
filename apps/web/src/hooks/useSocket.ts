
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { SOCKET_URL_BASE } from '@/lib/api';
import { getAuthUser, setAuthUser } from '@/lib/auth';
const SOCKET_URL = SOCKET_URL_BASE;

interface UseSocketProps {
    roomId: string; // The backend uses the room ID for joining
    token?: string;
    tenantId?: string;
}

export type Message = {
    id: string;
    content: string;
    sender: string; // User ID or Name
    createdAt: string;
    senderName?: string;
    senderAvatar?: string;
    senderNameColor?: string;
    role?: string;
};

export type Participant = {
    id: string;
    userId: string;
    displayName: string;
    socketId: string;
    avatar?: string;
    role?: string;
    isStealth?: boolean;
    isMuted?: boolean;
    isGagged?: boolean;
    isBanned?: boolean;
    isCamBlocked?: boolean;
    status?: string;
    visibilityMode?: 'hidden' | 'visible' | 'disguised';
    platform?: 'web' | 'mobile' | 'embed';
};

export type RoomInfo = {
    id: string;
    name: string;
    slug: string;
    status: string;
    isLocked: boolean;
    isVipRoom: boolean;
    isMeetingRoom: boolean;
    participantCount: number;
    buttonColor?: string | null;
};


export const useSocket = ({ roomId, token, tenantId }: UseSocketProps) => {
    const socketRef = useRef<Socket | null>(null);
    const currentRoomRef = useRef<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [passwordRequired, setPasswordRequired] = useState<{ roomId: string; roomName: string } | null>(null);
    const [roomSettings, setRoomSettings] = useState<any>(null);
    const [roomError, setRoomError] = useState<{ message: string; code?: string; fallbackSlug?: string } | null>(null);
    const [systemSettings, setSystemSettings] = useState<any>(null);
    const [userPermissions, setUserPermissions] = useState<Record<string, boolean> | null>(null);
    const [tenantSuspended, setTenantSuspended] = useState(false);
    const [paymentReminder, setPaymentReminder] = useState<{ tenantName: string; message: string; sentAt: string } | null>(null);
    const [announcement, setAnnouncement] = useState<{ id: string; message: string; createdAt: string } | null>(null);
    const [hasNewAnnouncement, setHasNewAnnouncement] = useState(false);
    const [duplicateBlocked, setDuplicateBlocked] = useState<{ message: string; countdown: number } | null>(null);
    const [lastBonus, setLastBonus] = useState<{ amount: number; type: string; message: string } | null>(null);

    // ★ Action indicators — kullanıcı kartlarında geçici overlay göstermek için
    const [actionIndicators, setActionIndicators] = useState<Map<string, { icon: string; message: string; type: string; action: string; actor: string; ts: number }>>(new Map());

    // ─── Helper: build room:join payload ─────────────────────────────
    const buildJoinPayload = useCallback((targetRoomId: string) => {
        const authUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('soprano_auth_user') || 'null') : null;
        const tenantUserCheck = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('soprano_tenant_user') || 'null') : null;
        const effectiveAuthUser = tenantUserCheck || authUser;
        const isGuest = !effectiveAuthUser || effectiveAuthUser.role === 'guest';
        if (isGuest) {
            localStorage.removeItem('soprano_user_status');
            localStorage.removeItem('soprano_godmaster_disguise_name');
        }
        const storedStatus = isGuest ? undefined : (typeof window !== 'undefined' ? localStorage.getItem('soprano_user_status') : undefined);
        const storedDisguiseName = isGuest ? undefined : (typeof window !== 'undefined' ? localStorage.getItem('soprano_godmaster_disguise_name') : undefined);
        const tenantUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('soprano_tenant_user') || 'null') : null;
        const effectiveUser = tenantUser || authUser;
        const userAvatar = effectiveUser?.avatar || undefined;
        const userGender = effectiveUser?.gender || undefined;
        const storedGodmasterIcon = typeof window !== 'undefined' ? localStorage.getItem('soprano_godmaster_icon') : undefined;

        // ★ VIP+ roller için initialStatus gönderme — backend her zaman stealth uygular
        // Ancak kullanıcı oturum içinde "görünür" olduysa sessionStorage'dan oku
        const roleLevel = (() => {
            const role = (effectiveUser?.role || 'guest').toLowerCase();
            const levels: Record<string, number> = { guest: 0, member: 1, vip: 2, operator: 3, moderator: 4, admin: 5, superadmin: 6, super_admin: 6, owner: 7, godmaster: 8 };
            return levels[role] ?? 0;
        })();
        const isVipPlus = roleLevel >= 2; // VIP_LEVEL = 2
        // ★ VIP+ kullanıcılar için localStorage'daki eski status değerini SİL
        // Bu kritik: sayfa yenilendiğinde eski 'godmaster-visible' değeri kalmamalı
        if (isVipPlus && typeof window !== 'undefined') {
            localStorage.removeItem('soprano_user_status');
            localStorage.removeItem('soprano_godmaster_disguise_name');
        }
        // ★ sessionStorage'daki oturum-içi tercih: kullanıcı görünür olduysa 'online' gönder
        const sessionVisibility = typeof window !== 'undefined' ? sessionStorage.getItem('soprano_session_visibility') : null;
        const effectiveStatus = isVipPlus ? (sessionVisibility || undefined) : storedStatus;

        return { roomId: targetRoomId, initialStatus: effectiveStatus, disguiseName: storedDisguiseName || undefined, avatar: userAvatar, gender: userGender, godmasterIcon: storedGodmasterIcon || undefined };
    }, []);

    // ─── Socket Connection (stable — NOT re-created on room change) ───
    useEffect(() => {
        if (!roomId || roomId === '__skip__') return;

        // Force token from localStorage if not provided (fixes admin/socket auth)
        const isTenantPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/t/');
        const storedToken = typeof window !== 'undefined'
            ? (isTenantPage
                ? (localStorage.getItem('soprano_tenant_token') || localStorage.getItem('soprano_auth_token'))
                : localStorage.getItem('soprano_auth_token'))
            : null;
        const effectiveToken = token || storedToken;

        console.log('useSocket: Connecting with token:', effectiveToken ? effectiveToken.substring(0, 10) + '...' : 'MISSING');

        const socket = io(SOCKET_URL, {
            query: {
                tenantId: tenantId || 'default',
            },
            auth: {
                token: effectiveToken
            },
            transports: ['polling', 'websocket'],
        });

        socketRef.current = socket;
        currentRoomRef.current = roomId;

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
            setIsConnected(true);
            // Join the current room on connect/reconnect
            const targetRoom = currentRoomRef.current || roomId;
            socket.emit('room:join', buildJoinPayload(targetRoom));
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        socket.on('room:joined', (data: { messages: any[], participants: any[], rooms?: RoomInfo[], roomSettings?: any, systemSettings?: any, userPermissions?: Record<string, boolean> }) => {
            console.log('Joined room:', data);
            console.log('[useSocket] room:joined systemSettings:', data.systemSettings ? 'EXISTS' : 'NULL');
            // Merge instead of replace — prevent UI flash on reconnect
            if (data.messages && data.messages.length > 0) {
                setMessages(data.messages);
            }
            // ★ room:joined = kesin truth — kullanıcı yeni bağlandığında sunucudan gelen
            // liste her zaman kabul edilmeli (kick sonrası yeniden girişte stale data'yı önler)
            if (data.participants && data.participants.length > 0) {
                setParticipants(data.participants);
            }
            if (data.rooms) setRooms(data.rooms);
            if (data.roomSettings) {
                setRoomSettings(data.roomSettings);
            }
            if (data.systemSettings) {
                setSystemSettings(data.systemSettings);
            } else {
                // systemSettings null ise backend'den tekrar iste
                console.log('[useSocket] systemSettings null, admin:refreshSettings emit ediliyor...');
                socket.emit('admin:refreshSettings');
            }
            if (data.userPermissions) {
                setUserPermissions(data.userPermissions);
            }
        });

        // Bireysel yetki canlı güncelleme — admin panelinden değişiklik yapıldığında
        socket.on('auth:permissions-update', (data: { permissions: Record<string, boolean> }) => {
            console.log('[useSocket] auth:permissions-update received:', data.permissions);
            setUserPermissions(data.permissions);
        });

        socket.on('settings:updated', (data: any) => {
            console.log('[useSocket] settings:updated received:', JSON.stringify(data).substring(0, 300));
            console.log('[useSocket] settings:updated rolePermissions:', JSON.stringify(data.rolePermissions || 'MISSING'));
            console.log('[useSocket] settings:updated member perms:', JSON.stringify(data.rolePermissions?.member || 'NO MEMBER KEY'));
            console.log('[useSocket] settings:updated duelEnabled:', data.duelEnabled, 'nudgeEnabled:', data.nudgeEnabled);
            // MERGE — kısmi güncelleme packageType, isCameraAllowed gibi kritik alanları silmesin
            setSystemSettings((prev: any) => prev ? { ...prev, ...data } : data);
        });

        socket.on('chat:message', (message: any) => {
            setMessages((prev) => [...prev, message]);
        });

        // Emoji reaction updates — her kullanıcı bir mesaja sadece 1 emoji atabilir
        socket.on('chat:reactionUpdate', (data: { messageId: string; emoji: string; username: string; action: string }) => {
            setMessages((prev) => prev.map((msg: any) => {
                if (msg.id !== data.messageId) return msg;
                const reactions = { ...(msg.reactions || {}) };

                // Kullanıcının bu emojide zaten olup olmadığını kontrol et
                const currentUsers = reactions[data.emoji] ? [...reactions[data.emoji]] : [];
                const alreadyHasThisEmoji = currentUsers.includes(data.username);

                if (alreadyHasThisEmoji) {
                    // Aynı emojiye tekrar tıkladı — kaldır (toggle off)
                    const filtered = currentUsers.filter((u: string) => u !== data.username);
                    if (filtered.length === 0) delete reactions[data.emoji];
                    else reactions[data.emoji] = filtered;
                } else {
                    // Farklı emoji — önce kullanıcıyı tüm diğer emojilerden kaldır
                    for (const key of Object.keys(reactions)) {
                        if (key === data.emoji) continue;
                        const users = reactions[key].filter((u: string) => u !== data.username);
                        if (users.length === 0) delete reactions[key];
                        else reactions[key] = users;
                    }
                    // Yeni emojiyi ekle
                    currentUsers.push(data.username);
                    reactions[data.emoji] = currentUsers;
                }

                return { ...msg, reactions };
            }));
        });

        // Gift chat message — premium styled system message
        socket.on('chat:giftMessage', (data: any) => {
            const giftContent = `[gift]${JSON.stringify({
                senderName: data.senderName,
                receiverName: data.receiverName,
                giftEmoji: data.giftEmoji,
                giftName: data.giftName,
                giftCategory: data.giftCategory,
                giftPrice: data.giftPrice,
                quantity: data.quantity,
                totalCost: data.totalCost,
            })}`;
            const giftMsg = {
                id: data.id || `gift_${Date.now()}`,
                content: giftContent,
                message: giftContent,
                sender: 'system',
                senderName: 'system',
                type: 'system',
                createdAt: data.timestamp || new Date().toISOString(),
                role: 'system',
            };
            setMessages((prev) => [...prev, giftMsg]);
        });

        socket.on('room:participant-joined', (participant: any) => {
            console.log('[room:participant-joined]', participant.displayName, participant.userId);
            setParticipants((prev) => {
                if (prev.find(p => p.userId === participant.userId)) return prev;
                return [...prev, participant];
            });
        });

        // Add listener for full participant list updates (e.g. status changes)
        socket.on('room:participants', (data: { participants: any[] }) => {
            console.log('[room:participants] received:', data.participants.length, 'users:', data.participants.map((p: any) => p.displayName).join(', '));
            setParticipants(prev => {
                const next = data.participants;
                // Quick length check
                if (prev.length !== next.length) return next;
                // Deep compare by serializing — only update if actually changed
                const prevKey = prev.map(p => `${p.userId}|${p.displayName}|${p.role}|${p.isStealth}|${p.status}|${p.isMuted}|${p.isGagged}|${p.isBanned}|${p.isCamBlocked}|${p.avatar}|${(p as any).nameColor}`).join(',');
                const nextKey = next.map((p: any) => `${p.userId}|${p.displayName}|${p.role}|${p.isStealth}|${p.status}|${p.isMuted}|${p.isGagged}|${p.isBanned}|${p.isCamBlocked}|${p.avatar}|${p.nameColor}`).join(',');
                if (prevKey === nextKey) return prev; // No change — skip re-render
                return next;
            });
            // ★ currentUser senkronizasyonu: participant listesinden mevcut kullanıcının güncel verisini localStorage'a yaz
            // NOT: setAuthUser KULLANMA — auth-change event'ı dispatch eder → DemoChatRoom user:profileUpdate emit eder → sonsuz döngü!
            try {
                const authUser = getAuthUser();
                if (authUser) {
                    const me = data.participants.find((p: any) => p.userId === authUser.userId);
                    if (me) {
                        let changed = false;
                        if (me.displayName && me.displayName !== authUser.username) { authUser.username = me.displayName; authUser.displayName = me.displayName; changed = true; }
                        if (me.avatar && me.avatar !== authUser.avatar) { authUser.avatar = me.avatar; changed = true; }
                        if ((me as any).nameColor && (me as any).nameColor !== (authUser as any).nameColor) { (authUser as any).nameColor = (me as any).nameColor; changed = true; }
                        if (changed) {
                            // Sessiz localStorage yazması — auth-change dispatch ETME (döngü kırılır)
                            const key = window.location.pathname.startsWith('/t/') ? 'soprano_tenant_user' : 'soprano_auth_user';
                            localStorage.setItem(key, JSON.stringify(authUser));
                        }
                    }
                }
            } catch {}
        });

        // ★ NOTE: user-status-changed, room:user-banned, room:user-unbanned are handled
        // exclusively in useRoomRealtime.ts to avoid duplicate setParticipants calls.

        socket.on('room:participant-left', (payload: { userId: string, socketId: string }) => {
            setParticipants((prev) => prev.filter(p => p.userId !== payload.userId));
        });

        // Admin pull-user: force navigate to another room (dispatch event for SPA navigation)
        socket.on('room:force-navigate', (data: { roomSlug: string; by: string }) => {
            console.log(`[room:force-navigate] Admin "${data.by}" is pulling you to room: ${data.roomSlug}`);
            // Dispatch custom event so room page can handle via router.push (SPA navigation)
            window.dispatchEvent(new CustomEvent('soprano:force-navigate', { detail: data }));
        });


        // Password-protected room handler
        socket.on('room:password-required', (data: { roomId: string; roomName: string; rooms?: RoomInfo[] }) => {
            console.log('[Password] Room requires password:', data.roomName);
            setPasswordRequired(data);
            if (data.rooms && data.rooms.length > 0) {
                setRooms(data.rooms);
            }
        });

        // Room settings updated (real-time from admin panel)
        socket.on('room:settings-updated', (data: any) => {
            console.log('[Room Settings] Updated:', data);
            setRoomSettings(data);
        });

        // Gerçek zamanlı oda katılımcı sayısı güncellemesi
        socket.on('rooms:count-updated', (data: { roomCounts: Record<string, number> }) => {
            setRooms(prev => prev.map(room => ({
                ...room,
                participantCount: data.roomCounts[room.slug] || 0,
            })));
        });

        // Room access error handler (locked, full, VIP-only)
        socket.on('room:error', (data: { message: string; code?: string; fallbackSlug?: string }) => {
            console.warn('[Room Error]', data.message, data.code);
            setRoomError(data);
        });

        // ─── DUPLICATE LOGIN BLOCKED — bu hesap zaten aktif ───
        socket.on('session:duplicate-blocked', (data: { message: string }) => {
            console.warn('[DUPLICATE BLOCKED]', data.message);
            // Reconnect'i kapat — backend 3sn sonra disconnect edecek, 
            // Socket.IO'nun otomatik yeniden bağlanmasını engellemek lazım
            socket.io.opts.reconnection = false;

            setDuplicateBlocked({ message: data.message, countdown: 3 });
            let remaining = 3;
            const countdownInterval = setInterval(() => {
                remaining--;
                setDuplicateBlocked(prev => prev ? { ...prev, countdown: remaining } : null);
                if (remaining <= 0) {
                    clearInterval(countdownInterval);
                    socket.disconnect();
                    // Tenant kullanıcısıysa tenant login'e, sistem üyesiyse ana sayfaya dön
                    const tenantMatch = window.location.pathname.match(/^\/t\/([^/]+)/);
                    window.location.href = tenantMatch ? `/t/${tenantMatch[1]}` : '/';
                }
            }, 1000);
        });

        // Tenant status değişikliği (admin panelden toggle) — anında tepki
        socket.on('tenant:statusChanged', (data: { tenantId: string; status: string; tenantName: string }) => {
            console.log('[tenant:statusChanged]', data);
            if (data.status === 'PASSIVE' || data.status === 'SUSPENDED') {
                setTenantSuspended(true);
            } else {
                setTenantSuspended(false);
            }
        });

        // Ödeme hatırlatma bildirimi (sadece owner/admin görür)
        socket.on('payment:reminder', (data: { tenantName: string; message: string; sentAt: string }) => {
            console.log('[payment:reminder]', data);
            setPaymentReminder(data);
        });

        // Tenant genel duyurusu (owner/admin/superadmin)
        socket.on('tenant:announcement', (data: { id: string; message: string; createdAt: string }) => {
            console.log('[tenant:announcement]', data);
            setAnnouncement(data);
            setHasNewAnnouncement(true);
        });

        // Bonus bildirimi (günlük, VIP haftalık, oda giriş puanı)
        socket.on('dailyBonus:received', (data: { amount: number; type: string; message: string }) => {
            console.log('[dailyBonus:received]', data);
            setLastBonus(data);
            // 5sn sonra temizle
            setTimeout(() => setLastBonus(null), 5000);
        });

        // ═══ Profil senkronizasyonu (cross-tab + aynı tab) ═══
        const emitProfileUpdate = () => {
            if (!socket.connected) return;
            try {
                const userJson = localStorage.getItem('soprano_auth_user') || localStorage.getItem('soprano_tenant_user');
                if (userJson) {
                    const user = JSON.parse(userJson);
                    socket.emit('user:profileUpdate', {
                        displayName: user.displayName || user.username,
                        avatar: user.avatar,
                        nameColor: user.nameColor || null,
                    });
                    console.log('[useSocket] Profile update emitted:', user.displayName || user.username);
                }
            } catch (err) {
                console.warn('[useSocket] Profile sync error:', err);
            }
        };

        // Cross-tab: diğer tab'da localStorage değiştiğinde
        const handleStorageChange = (e: StorageEvent) => {
            if ((e.key === 'soprano_auth_token' || e.key === 'soprano_auth_user' || e.key === 'soprano_tenant_user') && e.newValue) {
                console.log('[useSocket] Storage changed in another tab:', e.key);
                emitProfileUpdate();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Aynı tab: HomePage'de setAuthUser() çağrıldığında dispatch edilen event
        const handleAuthChange = () => {
            console.log('[useSocket] auth-change event detected (same tab)');
            emitProfileUpdate();
        };
        window.addEventListener('auth-change', handleAuthChange);

        // ★ Cleanup on tab close / page navigation — prevent ghost sessions
        const handleBeforeUnload = () => {
            const room = currentRoomRef.current;
            // ★ Yöneticiler — tab kapatıldığında görünürlük tercihini sıfırla
            // Tekrar girişte varsayılan 'stealth' modu geçerli olsun
            try {
                const authUser = JSON.parse(localStorage.getItem('soprano_tenant_user') || localStorage.getItem('soprano_auth_user') || 'null');
                const role = (authUser?.role || 'guest').toLowerCase();
                const stealthRoles = ['vip', 'operator', 'moderator', 'admin', 'super_admin', 'superadmin', 'owner', 'godmaster'];
                if (stealthRoles.includes(role)) {
                    localStorage.removeItem('soprano_user_status');
                    // Tab kapanınca oturum-içi görünürlük tercihi de temizlensin
                    sessionStorage.removeItem('soprano_session_visibility');
                    if (role === 'godmaster') {
                        localStorage.removeItem('soprano_godmaster_disguise_name');
                    }
                }
            } catch { }
            if (room && socket.connected) {
                socket.emit('room:leave', { roomId: room });
                socket.disconnect();
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('auth-change', handleAuthChange);
            const room = currentRoomRef.current;
            if (room && socket.connected) {
                socket.emit('room:leave', { roomId: room });
            }
            socket.disconnect();
            currentRoomRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, tenantId]); // ★ roomId removed — socket is NOT recreated on room change

    // ─── Room Switch (leave old → join new, same socket) ─────────────
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !roomId) return;
        const prevRoom = currentRoomRef.current;
        if (prevRoom === roomId) return; // same room, no-op

        console.log(`[useSocket] Room switch: ${prevRoom} → ${roomId}`);
        if (prevRoom) {
            socket.emit('room:leave', { roomId: prevRoom });
        }
        // Clear stale data
        setMessages([]);
        setParticipants([]);
        setRoomSettings(null);
        setPasswordRequired(null);
        setRoomError(null);
        // Join new room
        currentRoomRef.current = roomId;
        socket.emit('room:join', buildJoinPayload(roomId));
    }, [roomId, buildJoinPayload]);

    const sendMessage = (content: string) => {
        if (socketRef.current) {
            socketRef.current.emit('chat:send', { roomId, content });
        }
    };

    // Optimistic local participant update (for instant UI feedback after admin actions)
    const updateParticipantLocally = (userId: string, updates: Partial<Participant>) => {
        setParticipants(prev => prev.map(p =>
            p.userId === userId ? { ...p, ...updates } : p
        ));
    };

    // Join a password-protected room
    const joinWithPassword = (password: string) => {
        if (socketRef.current && passwordRequired) {
            // ★ VIP+ kullancılar için localStorage status gönderme
            const authUserPw = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('soprano_auth_user') || 'null') : null;
            const tenantUserPw = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('soprano_tenant_user') || 'null') : null;
            const pwUser = tenantUserPw || authUserPw;
            const pwRoleLevel = (() => {
                const role = (pwUser?.role || 'guest').toLowerCase();
                const levels: Record<string, number> = { guest: 0, member: 1, vip: 2, operator: 3, moderator: 4, admin: 5, superadmin: 6, super_admin: 6, owner: 7, godmaster: 8 };
                return levels[role] ?? 0;
            })();
            const pwIsVipPlus = pwRoleLevel >= 2;
            const storedStatus = pwIsVipPlus ? undefined : (typeof window !== 'undefined' ? localStorage.getItem('soprano_user_status') : undefined);
            const storedDisguiseName2 = typeof window !== 'undefined' ? localStorage.getItem('soprano_godmaster_disguise_name') : undefined;
            socketRef.current.emit('room:join', { roomId: passwordRequired.roomId, initialStatus: storedStatus, password, disguiseName: storedDisguiseName2 || undefined });
            setPasswordRequired(null);
        }
    };

    return {
        socket: socketRef.current,
        isConnected,
        messages,
        participants,
        sendMessage,
        updateParticipantLocally,
        rooms,
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
    };
};
