
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
        const authUser = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('soprano_auth_user') || 'null') : null;
        const tenantUserCheck = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('soprano_tenant_user') || 'null') : null;
        const effectiveAuthUser = tenantUserCheck || authUser;
        const isGuest = !effectiveAuthUser || effectiveAuthUser.role === 'guest';
        if (isGuest) {
            sessionStorage.removeItem('soprano_user_status');
            sessionStorage.removeItem('soprano_godmaster_disguise_name');
        }
        const storedStatus = isGuest ? undefined : (typeof window !== 'undefined' ? sessionStorage.getItem('soprano_user_status') : undefined);
        const storedDisguiseName = isGuest ? undefined : (typeof window !== 'undefined' ? sessionStorage.getItem('soprano_godmaster_disguise_name') : undefined);
        const tenantUser = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('soprano_tenant_user') || 'null') : null;
        const effectiveUser = tenantUser || authUser;
        const userAvatar = effectiveUser?.avatar || undefined;
        const userGender = effectiveUser?.gender || undefined;
        const storedGodmasterIcon = typeof window !== 'undefined' ? sessionStorage.getItem('soprano_godmaster_icon') : undefined;

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

        // Detect tenant slug from URL for cross-tenant join (e.g. GodMaster in tenant room)
        const urlTenantMatch = typeof window !== 'undefined' ? window.location.pathname.match(/^\/t\/([^/]+)\/room\//) : null;
        const urlTenantSlug = urlTenantMatch ? urlTenantMatch[1] : undefined;

        return { roomId: targetRoomId, initialStatus: effectiveStatus, disguiseName: storedDisguiseName || undefined, avatar: userAvatar, gender: userGender, godmasterIcon: storedGodmasterIcon || undefined, urlTenantSlug };
    }, []);

    // ─── Socket Connection (stable — NOT re-created on room change) ───
    useEffect(() => {
        if (!roomId || roomId === '__skip__') return;

        // Force token from localStorage if not provided (fixes admin/socket auth)
        const isTenantPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/t/');
        const storedToken = typeof window !== 'undefined'
            ? (isTenantPage
                ? (sessionStorage.getItem('soprano_tenant_token') || sessionStorage.getItem('soprano_auth_token'))
                : sessionStorage.getItem('soprano_auth_token'))
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
            // ★ Mesaj mantığı: Odaya ilk girişte eski diyaloglar gösterilmez.
            // Sadece oturum içinde odalar arası geçişte mesajlar sessionStorage'dan korunur.
            // Çıkışta (session end) tüm cache otomatik temizlenir.
            const targetRoomId = currentRoomRef.current || roomId;
            const cacheKey = `soprano_room_messages_${targetRoomId}`;
            try {
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    setMessages(JSON.parse(cached));
                } else {
                    setMessages([]);
                }
            } catch { setMessages([]); }
            // ★ room:joined = kesin truth — her zaman sunucudan gelen listeyi kabul et
            setParticipants(data.participants || []);
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

            // ★ AVATAR/PROFİL SENKRONİZASYONU — Backend (DB truth) → sessionStorage
            // Oda girişinde backend'den gelen participant bilgisi DB'den geliyor (deferredDbRefresh).
            // Bu veriyi sessionStorage'a yansıtarak hesap paneli ile oda profili arasında
            // tek doğru kaynak (DB) kullanılmasını sağlıyoruz.
            try {
                const authUser = JSON.parse(sessionStorage.getItem('soprano_auth_user') || 'null');
                const tenantUser = JSON.parse(sessionStorage.getItem('soprano_tenant_user') || 'null');
                const myUserId = tenantUser?.userId || authUser?.userId;
                if (myUserId && data.participants) {
                    const me = data.participants.find((p: any) => p.userId === myUserId);
                    if (me) {
                        for (const key of ['soprano_auth_user', 'soprano_tenant_user']) {
                            const raw = sessionStorage.getItem(key);
                            if (raw) {
                                const stored = JSON.parse(raw);
                                let changed = false;
                                if (me.avatar && me.avatar !== stored.avatar) { stored.avatar = me.avatar; changed = true; }
                                if (me.displayName && me.displayName !== stored.displayName) { stored.displayName = me.displayName; stored.username = me.displayName; changed = true; }
                                if (me.nameColor && me.nameColor !== stored.nameColor) { stored.nameColor = me.nameColor; changed = true; }
                                if (changed) {
                                    sessionStorage.setItem(key, JSON.stringify(stored));
                                    console.log(`[useSocket] Synced profile from backend → sessionStorage (${key})`);
                                }
                            }
                        }
                    }
                }
            } catch (e) { /* silent */ }
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
            setMessages((prev) => {
                const updated = [...prev, message];
                // ★ Mesajı sessionStorage cache'ine kaydet (oda geçişlerinde korunması için)
                try {
                    const cacheRoomId = currentRoomRef.current || roomId;
                    const cacheKey = `soprano_room_messages_${cacheRoomId}`;
                    // Son 200 mesajı cache'le (bellek tasarrufu)
                    const toCache = updated.slice(-200);
                    sessionStorage.setItem(cacheKey, JSON.stringify(toCache));
                } catch { /* sessionStorage full — silent */ }
                return updated;
            });
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

        // ★ Mesaj silme — sessionStorage cache'i de temizle (F5'te geri gelmesin)
        socket.on('room:chat-cleared', () => {
            const cacheKey = `soprano_room_messages_${currentRoomRef.current || roomId}`;
            sessionStorage.removeItem(cacheKey);
            setMessages([]);
        });

        socket.on('room:clear-user-messages', (data: { userId: string }) => {
            const cacheKey = `soprano_room_messages_${currentRoomRef.current || roomId}`;
            try {
                const cached = sessionStorage.getItem(cacheKey);
                if (cached) {
                    const msgs = JSON.parse(cached);
                    const filtered = msgs.filter((m: any) => m.sender !== data.userId && m.senderName !== data.userId);
                    sessionStorage.setItem(cacheKey, JSON.stringify(filtered));
                }
            } catch { sessionStorage.removeItem(cacheKey); }
            setMessages(prev => prev.filter((m: any) => m.sender !== data.userId && m.senderName !== data.userId));
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

            // ★ PROFİL SENKRONİZASYONU — Backend → sessionStorage
            // NOT: Avatar senkronizasyonu YAPILMAZ! Frontend sessionStorage her zaman
            // avatar için kaynak-doğruluktur (handleProfileUpdate optimistik güncelleme).
            // Sunucudan gelen eski avatar, kullanıcının yeni seçtiğini ezebilir.
            // Sadece displayName ve nameColor senkronize edilir.
            try {
                const authUser = JSON.parse(sessionStorage.getItem('soprano_auth_user') || 'null');
                const tenantUser = JSON.parse(sessionStorage.getItem('soprano_tenant_user') || 'null');
                const myUserId = tenantUser?.userId || authUser?.userId;
                if (myUserId && data.participants) {
                    const me = data.participants.find((p: any) => p.userId === myUserId);
                    if (me) {
                        for (const key of ['soprano_auth_user', 'soprano_tenant_user']) {
                            const raw = sessionStorage.getItem(key);
                            if (raw) {
                                const stored = JSON.parse(raw);
                                let changed = false;
                                // ★ Avatar SYNC YAPILMAZ — sessionStorage her zaman günceldir
                                if (me.displayName && me.displayName !== stored.displayName) { stored.displayName = me.displayName; stored.username = me.displayName; changed = true; }
                                if (me.nameColor && me.nameColor !== stored.nameColor) { stored.nameColor = me.nameColor; changed = true; }
                                if (changed) {
                                    sessionStorage.setItem(key, JSON.stringify(stored));
                                    window.dispatchEvent(new Event('auth-change'));
                                    console.log(`[useSocket] room:participants synced profile → sessionStorage (${key})`);
                                }
                            }
                        }
                    }
                }
            } catch (e) { /* silent */ }
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
            // Also update rooms array so header tabs reflect changes (buttonColor, name, etc.)
            if (data.roomId) {
                setRooms(prev => prev.map(room =>
                    room.id === data.roomId
                        ? {
                            ...room,
                            ...(data.name !== undefined && { name: data.name }),
                            ...(data.isLocked !== undefined && { isLocked: data.isLocked }),
                            ...(data.isVipRoom !== undefined && { isVipRoom: data.isVipRoom }),
                            ...(data.isMeetingRoom !== undefined && { isMeetingRoom: data.isMeetingRoom }),
                            ...(data.buttonColor !== undefined && { buttonColor: data.buttonColor }),
                        }
                        : room
                ));
            }
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
                const userJson = sessionStorage.getItem('soprano_auth_user') || sessionStorage.getItem('soprano_tenant_user');
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
                const authUser = JSON.parse(sessionStorage.getItem('soprano_tenant_user') || sessionStorage.getItem('soprano_auth_user') || 'null');
                const role = (authUser?.role || 'guest').toLowerCase();
                const stealthRoles = ['vip', 'operator', 'moderator', 'admin', 'super_admin', 'superadmin', 'owner', 'godmaster'];
                if (stealthRoles.includes(role)) {
                    sessionStorage.removeItem('soprano_user_status');
                    // Tab kapanınca oturum-içi görünürlük tercihi de temizlensin
                    sessionStorage.removeItem('soprano_session_visibility');
                    if (role === 'godmaster') {
                        sessionStorage.removeItem('soprano_godmaster_disguise_name');
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
            const authUserPw = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('soprano_auth_user') || 'null') : null;
            const tenantUserPw = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('soprano_tenant_user') || 'null') : null;
            const pwUser = tenantUserPw || authUserPw;
            const pwRoleLevel = (() => {
                const role = (pwUser?.role || 'guest').toLowerCase();
                const levels: Record<string, number> = { guest: 0, member: 1, vip: 2, operator: 3, moderator: 4, admin: 5, superadmin: 6, super_admin: 6, owner: 7, godmaster: 8 };
                return levels[role] ?? 0;
            })();
            const pwIsVipPlus = pwRoleLevel >= 2;
            const storedStatus = pwIsVipPlus ? undefined : (typeof window !== 'undefined' ? sessionStorage.getItem('soprano_user_status') : undefined);
            const storedDisguiseName2 = typeof window !== 'undefined' ? sessionStorage.getItem('soprano_godmaster_disguise_name') : undefined;
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
