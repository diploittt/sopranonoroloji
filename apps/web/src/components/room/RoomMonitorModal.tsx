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

    // Inline confirm dialog state (replaces page.tsx ConfirmModal for z-index issues)
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
        // Re-fetch in staggered intervals so admin sees the change as user joins
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

    // Use ref to avoid stale closure — useCallback may capture old userContextMenu
    const userContextMenuRef = useRef(userContextMenu);
    userContextMenuRef.current = userContextMenu;

    const handleContextMenuAction = useCallback((item: ContextMenuItem) => {
        const ctx = userContextMenuRef.current;
        console.log('[RoomMonitor] handleContextMenuAction:', item.action, item.id, ctx?.targetUser?.userId);
        if (!ctx) {
            console.warn('[RoomMonitor] userContextMenu is null — stale closure!');
            return;
        }

        // Intercept confirm-required actions and show inline confirm dialog
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
        // Re-fetch immediately so admin sees the change
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
                className="relative w-full max-w-3xl max-h-[80vh] animate-pure-fade flex flex-col"
                onClick={(e) => e.stopPropagation()}
                style={{
                    ...modalStyle,
                    background: 'linear-gradient(160deg, rgba(15,18,30,0.97) 0%, rgba(10,12,20,0.98) 100%)',
                    border: '1px solid rgba(123,159,239,0.12)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 1px rgba(123,159,239,0.2), inset 0 1px 0 rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(40px) saturate(150%)',
                }}
            >
                {/* Top accent line */}
                <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 10%, rgba(123,159,239,0.4) 40%, rgba(200,150,46,0.3) 60%, transparent 90%)', borderRadius: '16px 16px 0 0' }} />

                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 py-3"
                    onMouseDown={handleMouseDown}
                    style={{ cursor: 'move', userSelect: 'none' }}
                >
                    <div className="flex items-center gap-2.5">
                        <div style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(123,159,239,0.12), rgba(200,150,46,0.08))',
                            border: '1px solid rgba(123,159,239,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                        }}>
                            🏠
                        </div>
                        <div>
                            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>Oda Monitör</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: '#64748b', marginTop: 1 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 4px rgba(34,197,94,0.4)' }} />
                                    {activeRooms} aktif
                                </span>
                                <span style={{ color: '#334155' }}>•</span>
                                <span>👥 {totalUsers}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={(e) => { e.stopPropagation(); fetchMonitorData(); }}
                            style={{ padding: '4px 8px', borderRadius: 8, fontSize: 11, color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4 }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                            title="Yenile"
                        >
                            🔄 <span style={{ fontSize: 9, color: '#475569' }}>{lastUpdate.toLocaleTimeString('tr-TR')}</span>
                        </button>
                        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, transition: 'all 0.2s' }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div style={{ padding: '0 20px 10px' }}>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#475569' }}>🔍</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Oda veya kullanıcı ara..."
                            style={{ width: '100%', fontSize: 12, color: '#fff', borderRadius: 10, paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)', outline: 'none', transition: 'border-color 0.2s' }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(200,150,46,0.25)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                        />
                    </div>
                </div>

                {/* Room Grid */}
                <div className="flex-1 overflow-y-auto" style={{ padding: '0 20px 16px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}>
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
                                <span className="text-sm text-gray-500">Yükleniyor...</span>
                            </div>
                        </div>
                    ) : filteredRooms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                            <span className="text-4xl mb-3 opacity-30">🏠</span>
                            <p className="text-sm">Oda bulunamadı</p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                            gap: '10px',
                        }}>
                            {filteredRooms.map(room => {
                                const isCurrent = room.slug === currentRoomSlug;
                                const hasUsers = room.userCount > 0;
                                const sortedUsers = sortUsersByRole(room.users || []);
                                const isExpanded = expandedRooms.has(room.id);
                                const visibleUsers = isExpanded ? sortedUsers : sortedUsers.slice(0, MAX_VISIBLE_USERS);
                                const extraCount = room.userCount - MAX_VISIBLE_USERS;

                                return (
                                    <div
                                        key={room.id}
                                        style={{
                                            background: isCurrent
                                                ? 'rgba(99,102,241,0.08)'
                                                : 'rgba(255,255,255,0.02)',
                                            border: isCurrent
                                                ? '1px solid rgba(99,102,241,0.25)'
                                                : '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: 12,
                                            padding: '12px',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseOver={(e) => {
                                            if (!isCurrent) {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                                e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)';
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!isCurrent) {
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                                            }
                                        }}
                                    >
                                        {/* Room Header — click to navigate */}
                                        <div
                                            className="flex items-center justify-between mb-3"
                                            style={{ cursor: isCurrent ? 'default' : 'pointer' }}
                                            onClick={() => {
                                                if (!isCurrent) {
                                                    onNavigateToRoom(room.slug);
                                                    onClose();
                                                }
                                            }}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span style={{
                                                    width: 8, height: 8, borderRadius: '50%',
                                                    background: hasUsers ? '#22c55e' : '#374151',
                                                    boxShadow: hasUsers ? '0 0 8px rgba(34,197,94,0.4)' : 'none',
                                                    flexShrink: 0,
                                                }} />
                                                <span className="text-sm font-semibold text-white truncate">
                                                    {room.isVipRoom ? '👑 ' : room.isMeetingRoom ? '📞 ' : room.isLocked ? '🔒 ' : ''}
                                                    {room.name}
                                                </span>
                                                {isCurrent && (
                                                    <span className="text-[9px] text-[#7b9fef] font-medium px-1.5 py-0.5 bg-blue-500/15 rounded-full whitespace-nowrap">
                                                        buradasın
                                                    </span>
                                                )}
                                            </div>
                                            <span style={{
                                                fontSize: 11, fontWeight: 600,
                                                color: hasUsers ? '#22c55e' : '#4b5563',
                                                padding: '2px 8px',
                                                background: hasUsers ? 'rgba(34,197,94,0.1)' : 'rgba(75,85,99,0.1)',
                                                borderRadius: 20,
                                                whiteSpace: 'nowrap',
                                            }}>
                                                👥 {room.userCount}
                                            </span>
                                        </div>

                                        {/* User List */}
                                        <div style={{ minHeight: 40 }}>
                                            {!hasUsers ? (
                                                <div className="text-xs text-gray-600 py-2 text-center" style={{ fontStyle: 'italic' }}>
                                                    Boş oda
                                                </div>
                                            ) : (
                                                <div className="space-y-1">
                                                    {visibleUsers.map((user) => {
                                                        const roleLower = user.role?.toLowerCase() || 'guest';
                                                        const icon = ROLE_ICONS[roleLower];
                                                        const color = ROLE_COLORS[roleLower] || '#64748b';
                                                        return (
                                                            <div
                                                                key={user.userId}
                                                                className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors group"
                                                                style={{ cursor: 'context-menu' }}
                                                                onContextMenu={(e) => handleUserContextMenu(e, user)}
                                                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                            >
                                                                {/* Avatar — baş harf placeholder */}
                                                                <div style={{
                                                                    width: 22, height: 22, borderRadius: '50%',
                                                                    flexShrink: 0,
                                                                    border: `1.5px solid ${color}40`,
                                                                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: 9, fontWeight: 800, color: `${color}`, textTransform: 'uppercase',
                                                                    overflow: 'hidden',
                                                                }}>
                                                                    {user.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (user.displayName || '?').charAt(0)}
                                                                </div>
                                                                {/* Name */}
                                                                <span className="text-xs truncate flex-1" style={{ color }}>
                                                                    {user.displayName}
                                                                </span>
                                                                {/* Role icon */}
                                                                {icon && (
                                                                    <span className="text-xs opacity-80" title={roleLower}>
                                                                        {icon}
                                                                    </span>
                                                                )}
                                                                {/* Moderation flags */}
                                                                {user.isMuted && <span className="text-[10px] opacity-60" title="Susturulmuş">🔇</span>}
                                                                {user.isGagged && <span className="text-[10px] opacity-60" title="Yazı yasağı">🤐</span>}
                                                                {user.isBanned && <span className="text-[10px] opacity-60" title="Yasaklı">🚫</span>}
                                                                {user.isCamBlocked && <span className="text-[10px] opacity-60" title="Kamera engelli">📷</span>}
                                                            </div>
                                                        );
                                                    })}
                                                    {extraCount > 0 && !isExpanded && (
                                                        <button
                                                            onClick={() => setExpandedRooms(prev => new Set(prev).add(room.id))}
                                                            className="text-[10px] text-[#7b9fef] hover:text-[#a3bfff] pl-8 py-0.5 transition-colors cursor-pointer bg-transparent border-none"
                                                        >
                                                            + {extraCount} kişi daha...
                                                        </button>
                                                    )}
                                                    {isExpanded && sortedUsers.length > MAX_VISIBLE_USERS && (
                                                        <button
                                                            onClick={() => setExpandedRooms(prev => { const s = new Set(prev); s.delete(room.id); return s; })}
                                                            className="text-[10px] text-gray-500 hover:text-gray-400 pl-8 py-0.5 transition-colors cursor-pointer bg-transparent border-none"
                                                        >
                                                            ▲ gizle
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {!isCurrent && (
                                            <div className="mt-3 pt-3 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                                <button
                                                    onClick={() => { onNavigateToRoom(room.slug); onClose(); }}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all"
                                                    style={{
                                                        background: 'rgba(99,102,241,0.12)',
                                                        color: '#818cf8',
                                                        border: '1px solid rgba(99,102,241,0.15)',
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.background = 'rgba(99,102,241,0.2)';
                                                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.background = 'rgba(99,102,241,0.12)';
                                                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)';
                                                    }}
                                                >
                                                    🚪 Gir
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        // ★ localStorage'a yazma — backend VIP+ kullanıcıları otomatik stealth yapar
                                                        onNavigateToRoom(room.slug);
                                                        onClose();
                                                    }}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all"
                                                    style={{
                                                        background: 'rgba(168,85,247,0.12)',
                                                        color: '#a78bfa',
                                                        border: '1px solid rgba(168,85,247,0.15)',
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.background = 'rgba(168,85,247,0.2)';
                                                        e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)';
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.background = 'rgba(168,85,247,0.12)';
                                                        e.currentTarget.style.borderColor = 'rgba(168,85,247,0.15)';
                                                    }}
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

                {/* Tip */}
                <div style={{ padding: '6px 20px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#475569' }}>
                        💡 Sağ tık → moderasyon
                    </div>
                </div>
            </div >

            {/* User Context Menu */}
            {
                userContextMenu && (
                    <ContextMenu
                        items={userContextMenu.items}
                        x={userContextMenu.x}
                        y={userContextMenu.y}
                        onClose={() => setUserContextMenu(null)}
                        onItemClick={handleContextMenuAction}
                    />
                )
            }

            {/* Inline Confirm Dialog — renders inside the portal at higher z-index */}
            {
                inlineConfirm && (
                    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setInlineConfirm(null)} />
                        <div
                            className="relative w-full max-w-[380px] rounded-2xl border border-white/10 overflow-hidden"
                            style={{
                                background: 'linear-gradient(180deg, rgba(20, 24, 40, 0.98) 0%, rgba(12, 14, 22, 0.98) 100%)',
                                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(239, 68, 68, 0.12)',
                                animation: 'inlineConfirmIn 0.15s ease-out',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, transparent, #ef4444, transparent)' }} />
                            <div className="p-5">
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-500/15 ring-1 ring-red-500/30 flex items-center justify-center">
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 pt-0.5">
                                        <h3 className="text-base font-bold text-white">{inlineConfirm.targetUser.displayName}</h3>
                                        <p className="text-[13px] text-gray-400 mt-1 leading-relaxed">{inlineConfirm.message}</p>
                                    </div>
                                </div>
                                <div className="h-px bg-white/5 my-4" />
                                <div className="flex justify-end gap-2.5">
                                    <button
                                        onClick={() => setInlineConfirm(null)}
                                        className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white border border-white/10 hover:border-white/20 transition-all"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        onClick={handleInlineConfirm}
                                        className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-lg shadow-red-900/30"
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
                )
            }
        </div >
    );

    return createPortal(content, document.body);
}
