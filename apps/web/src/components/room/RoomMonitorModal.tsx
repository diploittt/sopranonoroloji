'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ContextMenu, { ContextMenuItem } from './ContextMenu';
import { getRoleLevel, getMenuForUser } from '@/common/roomPermissions';

interface RoomUser {
    userId: string;
    displayName: string;
    avatar: string;
    role: string;
    status: string;
    socketId: string;
    isMuted?: boolean;
    isGagged?: boolean;
    isBanned?: boolean;
    isCamBlocked?: boolean;
}

interface RoomInfo {
    id: string;
    name: string;
    slug: string;
    userCount: number;
    maxParticipants?: number | null;
    status: string;
    isLocked: boolean;
    isMeetingRoom: boolean;
    isVipRoom: boolean;
    users: RoomUser[];
}

interface RoomMonitorModalProps {
    isOpen: boolean;
    onClose: () => void;
    socket: any;
    currentRoomSlug: string;
    onNavigateToRoom: (slug: string) => void;
    onUserAction: (item: ContextMenuItem, targetUser: RoomUser) => void;
    userLevel: number;
    currentUserId?: string;
    currentUserRole?: string;
}

const ROLE_ICONS: Record<string, string> = {
    godmaster: '🔮',
    owner: '👑',
    super_admin: '🛡️',
    superadmin: '🛡️',
    admin: '🛡️',
    moderator: '⚔️',
    operator: '🔧',
    vip: '⭐',
};

const ROLE_COLORS: Record<string, string> = {
    godmaster: '#c084fc',
    owner: '#fbbf24',
    super_admin: '#a78bfa',
    superadmin: '#a78bfa',
    admin: '#60a5fa',
    moderator: '#34d399',
    operator: '#fb923c',
    vip: '#facc15',
    member: '#94a3b8',
    guest: '#64748b',
};

const ROLE_ORDER: Record<string, number> = {
    godmaster: 0, owner: 1, super_admin: 2, superadmin: 2,
    admin: 3, moderator: 4, operator: 5, vip: 6, member: 7, guest: 8,
};

function sortUsersByRole(users: RoomUser[]): RoomUser[] {
    return [...users].sort((a, b) => {
        const aOrder = ROLE_ORDER[a.role?.toLowerCase()] ?? 99;
        const bOrder = ROLE_ORDER[b.role?.toLowerCase()] ?? 99;
        return aOrder - bOrder;
    });
}

// ─── USER CONTEXT MENU ITEMS (same as page.tsx) ─────────────────────
function getUserMenuItems(targetUser?: RoomUser): ContextMenuItem[] {
    const isMuted = targetUser?.isMuted;
    const isGagged = targetUser?.isGagged;
    const isBanned = targetUser?.isBanned;
    const isCamBlocked = targetUser?.isCamBlocked;

    return [
        // Pull to current room
        { id: 'pull-to-room', label: 'Odaya Çek', icon: '📞', action: 'pullToRoom', description: 'Bu odaya çek' },
        // Moderation
        isMuted
            ? { id: 'unmute', label: 'Sesi Aç', icon: '🔊', action: 'unmuteUser', description: 'Susturmayı kaldır' }
            : { id: 'mute', label: 'Sustur', icon: '🔇', action: 'muteUser', description: 'Kullanıcıyı sustur' },
        { id: 'kick', label: 'At', icon: '👢', action: 'kickUser', confirm: true, confirmMessage: 'Kullanıcı odadan atılacak. Emin misiniz?' },
        { id: 'hard-kick', label: 'Zorla At', icon: '⚡', action: 'hardKickUser', confirm: true, confirmMessage: 'Zorla atılacak. Sayfayı yenilemeden giremeyecek.' },
        isGagged
            ? { id: 'ungag', label: 'Yazı Yasağını Kaldır', icon: '💬', action: 'ungagUser', description: 'Yazma izni ver' }
            : { id: 'gag', label: 'Yazı Yasağı', icon: '🤐', action: 'gagUser', description: 'Chat yazamaz' },

        // Ban
        ...(isBanned
            ? [{ id: 'unban', label: 'Yasağı Kaldır', icon: '✅', action: 'unbanUser', confirm: true, confirmMessage: 'Kullanıcının yasağı kaldırılacak. Emin misiniz?' }]
            : [
                { id: 'ban-1day', label: '1 Gün Yasakla', icon: '🚫', action: 'banUser', duration: '1d' as string, confirm: true, confirmMessage: 'Kullanıcı 1 gün yasaklanacak. Emin misiniz?' },
                {
                    id: 'ban-more', label: 'Daha Fazla Yasakla', icon: '⛔', type: 'submenu' as const,
                    submenu: [
                        { id: 'ban-1week', label: '1 Hafta', duration: '1w' as string, action: 'banUser', confirm: true, confirmMessage: '1 hafta yasaklanacak. Emin misiniz?' },
                        { id: 'ban-1month', label: '1 Ay', duration: '1m' as string, action: 'banUser', confirm: true, confirmMessage: '1 ay yasaklanacak. Emin misiniz?' },
                        { id: 'ban-permanent', label: 'Kalıcı', duration: 'permanent' as string, action: 'banUser', confirm: true, confirmMessage: 'Kalıcı yasaklanacak! Emin misiniz?' },
                    ]
                }
            ]
        ),

        // Camera & browser
        isCamBlocked
            ? { id: 'cam-unblock', label: 'Kamera İznini Aç', icon: '📷', action: 'unblockCamera', description: 'Kamera engelini kaldır' }
            : { id: 'cam-block', label: 'Kamera Engelle', icon: '📷🚫', action: 'blockCamera', description: 'Kamerasını engelle' },
        { id: 'exit-browser', label: 'Tarayıcıyı Kapat', icon: '🌐', action: 'exitBrowser', confirm: true, confirmMessage: 'Kullanıcının tarayıcısı kapatılacak! Emin misiniz?' },

        // Role management
        ...(targetUser?.role && ['operator', 'moderator', 'admin'].includes(targetUser.role)
            ? [{ id: 'revoke-role', label: 'Yetkiyi Geri Al', icon: '❌', action: 'revokeRole', confirm: true, confirmMessage: `${targetUser.role} yetkisi geri alınacak. Emin misiniz?` }]
            : [{ id: 'make-room-op', label: 'Oda Operatörü Yap', icon: '👑', action: 'makeRoomOperator', confirm: true, confirmMessage: 'Kullanıcı oda operatörü yapılacak. Emin misiniz?' }]
        ),

        // Messages & mic
        { id: 'clear-text', label: 'Mesajları Sil', icon: '🗑️', action: 'clearUserMessages', confirm: true, confirmMessage: 'Tüm mesajları silinecek. Emin misiniz?' },
        { id: 'free-mic', label: 'Mikrofonu Serbest Bırak', icon: '🎤', action: 'freeMicForUser' },
        { id: 'take-mic', label: 'Mikrofonu Al', icon: '🎙️', action: 'takeMicFromUser' },

        // Room actions
        { id: 'move-to-meeting', label: 'Toplantıya Çek', icon: '🔒', action: 'moveUserToMeeting' },
    ];
}

const MAX_VISIBLE_USERS = 8;

export function RoomMonitorModal({
    isOpen, onClose, socket, currentRoomSlug, onNavigateToRoom,
    onUserAction, userLevel, currentUserId, currentUserRole,
}: RoomMonitorModalProps) {
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    // Context menu state
    const [userContextMenu, setUserContextMenu] = useState<{
        x: number;
        y: number;
        targetUser: RoomUser;
        items: ContextMenuItem[];
    } | null>(null);

    // Inline confirm dialog state
    const [inlineConfirm, setInlineConfirm] = useState<{
        item: ContextMenuItem;
        targetUser: RoomUser;
        message: string;
    } | null>(null);

    // Expanded rooms state
    const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());

    // Draggable
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [centered, setCentered] = useState(true);
    const dragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);

    const fetchMonitorData = useCallback(() => {
        if (!socket) return;
        socket.emit('room:monitor', null, (data: { rooms: RoomInfo[] }) => {
            if (data?.rooms) {
                setRooms(data.rooms);
                setLastUpdate(new Date());
            }
            setLoading(false);
        });
    }, [socket]);

    // Initial load + auto-refresh every 10s
    useEffect(() => {
        if (!isOpen || !socket) return;
        setLoading(true);
        setSearchQuery('');
        setCentered(true);

        fetchMonitorData();

        const interval = setInterval(fetchMonitorData, 10000);
        return () => clearInterval(interval);
    }, [isOpen, socket, fetchMonitorData]);

    // Draggable logic
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!modalRef.current) return;
        if (centered) {
            const rect = modalRef.current.getBoundingClientRect();
            setPosition({ x: rect.left, y: rect.top });
            dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            setCentered(false);
        } else {
            dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        }
        dragging.current = true;
        e.preventDefault();
    }, [centered, position]);

    useEffect(() => {
        const move = (e: MouseEvent) => {
            if (!dragging.current) return;
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x)),
                y: Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.current.y)),
            });
        };
        const up = () => { dragging.current = false; };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const handlePullUser = useCallback((userId: string) => {
        if (!socket) return;
        socket.emit('admin:pull-user', {
            userId,
            targetRoomSlug: currentRoomSlug,
        }, (response: any) => {
            console.log('[RoomMonitor] admin:pull-user ACK:', response);
        });
        setTimeout(() => fetchMonitorData(), 500);
        setTimeout(() => fetchMonitorData(), 1500);
        setTimeout(() => fetchMonitorData(), 3000);
    }, [socket, currentRoomSlug, fetchMonitorData]);

    // ─── USER RIGHT-CLICK HANDLER ───────────────────────────────────
    const handleUserContextMenu = useCallback((e: React.MouseEvent, user: RoomUser) => {
        e.preventDefault();
        e.stopPropagation();

        const isSelf = user.userId === currentUserId;
        const targetLevel = getRoleLevel(user.role);
        const rawItems = getUserMenuItems(user);
        const filteredItems = getMenuForUser(rawItems, userLevel, 'user', targetLevel, isSelf);

        if (filteredItems.length === 0) return;

        setUserContextMenu({
            x: e.clientX,
            y: e.clientY,
            targetUser: user,
            items: filteredItems,
        });
    }, [currentUserId, userLevel]);

    // Use ref to avoid stale closure
    const userContextMenuRef = useRef(userContextMenu);
    userContextMenuRef.current = userContextMenu;

    const handleContextMenuAction = useCallback((item: ContextMenuItem) => {
        const ctx = userContextMenuRef.current;
        console.log('[RoomMonitor] handleContextMenuAction:', item.action, item.id, ctx?.targetUser?.userId);
        if (!ctx) {
            console.warn('[RoomMonitor] userContextMenu is null — stale closure!');
            return;
        }

        if (item.confirm && !item._confirmed) {
            setInlineConfirm({
                item,
                targetUser: ctx.targetUser,
                message: item.confirmMessage || 'Bu işlemi gerçekleştirmek istediğinize emin misiniz?',
            });
            setUserContextMenu(null);
            return;
        }

        if (item.action === 'pullToRoom') {
            console.log('[RoomMonitor] Pulling user:', ctx.targetUser.userId, 'to', currentRoomSlug);
            handlePullUser(ctx.targetUser.userId);
        } else {
            onUserAction({ ...item, _confirmed: true }, ctx.targetUser);
        }
        setUserContextMenu(null);
        setTimeout(() => fetchMonitorData(), 500);
    }, [onUserAction, fetchMonitorData, handlePullUser, currentRoomSlug]);

    // Handle inline confirm approval
    const handleInlineConfirm = useCallback(() => {
        if (!inlineConfirm) return;
        const { item, targetUser } = inlineConfirm;
        if (item.action === 'pullToRoom') {
            handlePullUser(targetUser.userId);
        } else {
            onUserAction({ ...item, _confirmed: true }, targetUser);
        }
        setInlineConfirm(null);
        setTimeout(() => fetchMonitorData(), 500);
    }, [inlineConfirm, onUserAction, handlePullUser, fetchMonitorData]);

    if (!isOpen) return null;

    const filteredRooms = rooms.filter(r => !r.isMeetingRoom).filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.users?.some(u => u.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const visibleRooms = rooms.filter(r => !r.isMeetingRoom);
    const activeRooms = visibleRooms.filter(r => r.userCount > 0).length;
    const totalUsers = visibleRooms.reduce((sum, r) => sum + r.userCount, 0);

    const modalStyle: React.CSSProperties = centered
        ? {}
        : { position: 'fixed', left: position.x, top: position.y, margin: 0, transform: 'none' };

    const content = (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={onClose} style={centered ? {} : { display: 'block' }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div
                ref={modalRef}
                className="relative w-full max-w-4xl max-h-[82vh] animate-pure-fade flex flex-col"
                onClick={(e) => e.stopPropagation()}
                style={{
                    ...modalStyle,
                    background: 'linear-gradient(160deg, rgba(30,33,58,0.97) 0%, rgba(22,25,48,0.98) 100%)',
                    border: '1px solid rgba(167,139,250,0.22)',
                    borderRadius: 18,
                    boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 1px rgba(167,139,250,0.3), inset 0 1px 0 rgba(255,255,255,0.07)',
                    backdropFilter: 'blur(40px) saturate(150%)',
                }}
            >
                {/* Premium top accent gradient */}
                <div style={{
                    height: 2, borderRadius: '18px 18px 0 0',
                    background: 'linear-gradient(90deg, transparent 5%, rgba(167,139,250,0.5) 30%, rgba(251,191,36,0.4) 50%, rgba(56,189,248,0.4) 70%, transparent 95%)',
                }} />

                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 py-3"
                    onMouseDown={handleMouseDown}
                    style={{ cursor: 'move', userSelect: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                >
                    <div className="flex items-center gap-3">
                        <div style={{
                            width: 36, height: 36, borderRadius: 12,
                            background: 'linear-gradient(135deg, rgba(167,139,250,0.25), rgba(56,189,248,0.18))',
                            border: '1px solid rgba(167,139,250,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16,
                            boxShadow: '0 4px 12px rgba(167,139,250,0.15)',
                        }}>
                            📡
                        </div>
                        <div>
                            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '0.02em' }}>Oda Monitör</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    fontSize: 9, fontWeight: 700, color: '#34d399',
                                    padding: '2px 8px', borderRadius: 10,
                                    background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)',
                                }}>
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px rgba(34,197,94,0.5)' }} />
                                    {activeRooms} aktif oda
                                </span>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    fontSize: 9, fontWeight: 700, color: '#c4b5fd',
                                    padding: '2px 8px', borderRadius: 10,
                                    background: 'rgba(167,139,250,0.14)', border: '1px solid rgba(167,139,250,0.2)',
                                }}>
                                    👥 {totalUsers} kişi
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); fetchMonitorData(); }}
                            style={{
                                padding: '5px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                                color: '#94a3b8', background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s',
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(167,139,250,0.1)'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.2)'; e.currentTarget.style.color = '#c4b5fd'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
                            title="Yenile"
                        >
                            🔄 <span style={{ fontSize: 8, color: '#475569' }}>{lastUpdate.toLocaleTimeString('tr-TR')}</span>
                        </button>
                        <button onClick={onClose} style={{
                            width: 30, height: 30, borderRadius: 8,
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                            color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, transition: 'all 0.2s',
                        }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#f87171'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#64748b'; }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div style={{ padding: '8px 20px 6px' }}>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#475569', pointerEvents: 'none' }}>🔍</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Oda veya kullanıcı ara..."
                            style={{
                                width: '100%', fontSize: 12, color: '#e2e8f0', fontWeight: 500,
                                borderRadius: 10, paddingLeft: 34, paddingRight: 14, paddingTop: 8, paddingBottom: 8,
                                border: '1px solid rgba(167,139,250,0.15)', background: 'rgba(15,18,40,0.5)',
                                outline: 'none', transition: 'all 0.25s',
                                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.3)'; e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.2), 0 0 12px rgba(167,139,250,0.08)'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.1)'; e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.2)'; }}
                        />
                    </div>
                </div>

                {/* Room Grid */}
                <div className="flex-1 overflow-y-auto" style={{ padding: '8px 20px 16px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(167,139,250,0.12) transparent' }}>
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                <span className="text-xs text-gray-500 font-medium">Odalar yükleniyor...</span>
                            </div>
                        </div>
                    ) : filteredRooms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                            <span className="text-4xl mb-3 opacity-20">📡</span>
                            <p className="text-xs font-medium">Oda bulunamadı</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                            {filteredRooms.map(room => {
                                const isCurrent = room.slug === currentRoomSlug;
                                const hasUsers = room.userCount > 0;
                                const sortedUsers = sortUsersByRole(room.users || []);
                                const isExpanded = expandedRooms.has(room.id);
                                const visibleUsers = isExpanded ? sortedUsers : sortedUsers.slice(0, MAX_VISIBLE_USERS);
                                const extraCount = room.userCount - MAX_VISIBLE_USERS;
                                const capacity = room.maxParticipants || 30;
                                const fillPct = Math.min(100, (room.userCount / capacity) * 100);

                                return (
                                    <div
                                        key={room.id}
                                        style={{
                                            padding: '14px', borderRadius: 14,
                                            background: isCurrent ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.04)',
                                            border: `1px solid ${isCurrent ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                            transition: 'all 0.25s ease', position: 'relative', overflow: 'hidden',
                                            display: 'flex', flexDirection: 'column',
                                        }}
                                        onMouseOver={(e) => { if (!isCurrent) { e.currentTarget.style.background = 'rgba(167,139,250,0.08)'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.25)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(167,139,250,0.1)'; } }}
                                        onMouseOut={(e) => { if (!isCurrent) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; } }}
                                    >
                                        {/* Room Header */}
                                        <div className="flex items-center justify-between mb-2" style={{ cursor: isCurrent ? 'default' : 'pointer' }} onClick={() => { if (!isCurrent) { onNavigateToRoom(room.slug); onClose(); } }}>
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: 9,
                                                    background: hasUsers ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(52,211,153,0.12))' : 'rgba(255,255,255,0.05)',
                                                    border: `1px solid ${hasUsers ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0,
                                                }}>
                                                    {room.isVipRoom ? '👑' : room.isLocked ? '🔒' : hasUsers ? '🎙️' : '💤'}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[12px] font-bold text-white truncate" style={{ lineHeight: 1.2 }}>{room.name}</div>
                                                    {isCurrent && <span style={{ fontSize: 8, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1 }}>● Buradasın</span>}
                                                </div>
                                            </div>
                                            <span style={{
                                                fontSize: 10, fontWeight: 700,
                                                color: hasUsers ? '#34d399' : '#475569',
                                                padding: '3px 8px', borderRadius: 8,
                                                background: hasUsers ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
                                                border: `1px solid ${hasUsers ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)'}`,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {room.userCount}/{capacity}
                                            </span>
                                        </div>

                                        {/* Capacity bar */}
                                        <div style={{ height: 3, borderRadius: 2, marginBottom: 8, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', borderRadius: 2, width: `${fillPct}%`,
                                                background: fillPct > 80 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : fillPct > 50 ? 'linear-gradient(90deg, #34d399, #fbbf24)' : 'linear-gradient(90deg, rgba(167,139,250,0.4), rgba(56,189,248,0.4))',
                                                transition: 'width 0.5s ease, background 0.3s ease',
                                            }} />
                                        </div>

                                        {/* User List */}
                                        <div style={{ minHeight: 28, flex: 1 }}>
                                            {!hasUsers ? (
                                                <div style={{ fontSize: 10, color: '#475569', textAlign: 'center', padding: '6px 0', fontStyle: 'italic' }}>Boş oda</div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    {visibleUsers.map((user) => {
                                                        const roleLower = user.role?.toLowerCase() || 'guest';
                                                        const icon = ROLE_ICONS[roleLower];
                                                        const color = ROLE_COLORS[roleLower] || '#64748b';
                                                        return (
                                                            <div
                                                                key={user.userId}
                                                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 6px', borderRadius: 8, cursor: 'context-menu', transition: 'background 0.15s' }}
                                                                onContextMenu={(e) => handleUserContextMenu(e, user)}
                                                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                            >
                                                                <div style={{
                                                                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                                                    border: `1.5px solid ${color}30`,
                                                                    background: 'linear-gradient(135deg, rgba(30,35,50,0.9), rgba(15,18,28,0.95))',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: 8, fontWeight: 800, color, textTransform: 'uppercase', overflow: 'hidden',
                                                                }}>
                                                                    {user.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (user.displayName || '?').charAt(0)}
                                                                </div>
                                                                <span style={{ fontSize: 10, fontWeight: 600, color, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.displayName}</span>
                                                                {icon && <span style={{ fontSize: 10, opacity: 0.7 }}>{icon}</span>}
                                                                {user.isMuted && <span style={{ fontSize: 9, opacity: 0.5 }}>🔇</span>}
                                                                {user.isGagged && <span style={{ fontSize: 9, opacity: 0.5 }}>🤐</span>}
                                                                {user.isBanned && <span style={{ fontSize: 9, opacity: 0.5 }}>🚫</span>}
                                                            </div>
                                                        );
                                                    })}
                                                    {extraCount > 0 && !isExpanded && (
                                                        <button
                                                            onClick={() => setExpandedRooms(prev => new Set(prev).add(room.id))}
                                                            style={{ fontSize: 9, color: '#a78bfa', fontWeight: 600, paddingLeft: 26, paddingTop: 2, paddingBottom: 2, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'color 0.2s' }}
                                                            onMouseOver={e => e.currentTarget.style.color = '#c4b5fd'}
                                                            onMouseOut={e => e.currentTarget.style.color = '#a78bfa'}
                                                        >
                                                            + {extraCount} kişi daha
                                                        </button>
                                                    )}
                                                    {isExpanded && sortedUsers.length > MAX_VISIBLE_USERS && (
                                                        <button
                                                            onClick={() => setExpandedRooms(prev => { const s = new Set(prev); s.delete(room.id); return s; })}
                                                            style={{ fontSize: 9, color: '#64748b', fontWeight: 600, paddingLeft: 26, paddingTop: 2, paddingBottom: 2, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                                        >
                                                            ▲ gizle
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {!isCurrent && (
                                            <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                                <button
                                                    onClick={() => { onNavigateToRoom(room.slug); onClose(); }}
                                                    style={{
                                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                        padding: '6px 0', borderRadius: 8, fontSize: 10, fontWeight: 700,
                                                        background: 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(99,102,241,0.08))',
                                                        color: '#a78bfa', border: '1px solid rgba(167,139,250,0.15)',
                                                        cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.03em',
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(99,102,241,0.15))'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.3)'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(99,102,241,0.08))'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.15)'; }}
                                                >
                                                    🚪 Gir
                                                </button>
                                                <button
                                                    onClick={() => { onNavigateToRoom(room.slug); onClose(); }}
                                                    style={{
                                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                                        padding: '6px 0', borderRadius: 8, fontSize: 10, fontWeight: 700,
                                                        background: 'rgba(255,255,255,0.03)', color: '#64748b',
                                                        border: '1px solid rgba(255,255,255,0.06)',
                                                        cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.03em',
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(56,189,248,0.08)'; e.currentTarget.style.borderColor = 'rgba(56,189,248,0.15)'; e.currentTarget.style.color = '#38bdf8'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#64748b'; }}
                                                    title="Görünmez olarak odaya gir"
                                                >
                                                    👁️ Gözle
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer tip */}
                <div style={{ padding: '6px 20px 10px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 9, color: '#64748b', fontStyle: 'italic' }}>💡 Kullanıcıya sağ tık → moderasyon işlemleri</span>
                </div>
            </div>

            {/* User Context Menu */}
            {userContextMenu && (
                <ContextMenu
                    items={userContextMenu.items}
                    x={userContextMenu.x}
                    y={userContextMenu.y}
                    onClose={() => setUserContextMenu(null)}
                    onItemClick={handleContextMenuAction}
                />
            )}

            {/* Inline Confirm Dialog */}
            {inlineConfirm && (
                <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setInlineConfirm(null)} />
                    <div
                        className="relative w-full max-w-[380px] overflow-hidden"
                        style={{
                            background: 'linear-gradient(180deg, rgba(30,34,55,0.98) 0%, rgba(22,25,45,0.98) 100%)',
                            border: '1px solid rgba(167,139,250,0.15)', borderRadius: 16,
                            boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(239,68,68,0.12)',
                            animation: 'inlineConfirmIn 0.15s ease-out',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #ef4444, transparent)' }} />
                        <div style={{ padding: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                </div>
                                <div style={{ flex: 1, paddingTop: 2 }}>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>{inlineConfirm.targetUser.displayName}</h3>
                                    <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 }}>{inlineConfirm.message}</p>
                                </div>
                            </div>
                            <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '12px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                <button
                                    onClick={() => setInlineConfirm(null)}
                                    style={{
                                        padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                                        color: '#94a3b8', background: 'transparent',
                                        border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#e2e8f0'; }}
                                    onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#94a3b8'; }}
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleInlineConfirm}
                                    style={{
                                        padding: '7px 20px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                                        color: '#fff', background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        border: 'none', cursor: 'pointer',
                                        boxShadow: '0 4px 16px rgba(239,68,68,0.25)', transition: 'all 0.2s',
                                    }}
                                >
                                    Onayla
                                </button>
                            </div>
                        </div>
                        <style>{`
                            @keyframes inlineConfirmIn {
                                from { opacity: 0; transform: scale(0.95) translateY(-8px); }
                                to { opacity: 1; transform: scale(1) translateY(0); }
                            }
                        `}</style>
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(content, document.body);
}
