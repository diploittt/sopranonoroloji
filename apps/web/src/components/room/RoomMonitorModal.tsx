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
    godmaster: '🔮', owner: '👑', super_admin: '🛡️', superadmin: '🛡️',
    admin: '🛡️', moderator: '⚔️', operator: '🔧', vip: '⭐',
};

const ROLE_COLORS: Record<string, string> = {
    godmaster: '#c084fc', owner: '#fbbf24', super_admin: '#a78bfa', superadmin: '#a78bfa',
    admin: '#60a5fa', moderator: '#34d399', operator: '#fb923c', vip: '#facc15',
    member: '#94a3b8', guest: '#64748b',
};

const ROLE_ORDER: Record<string, number> = {
    godmaster: 0, owner: 1, super_admin: 2, superadmin: 2,
    admin: 3, moderator: 4, operator: 5, vip: 6, member: 7, guest: 8,
};

function sortUsersByRole(users: RoomUser[]): RoomUser[] {
    return [...users].sort((a, b) => (ROLE_ORDER[a.role?.toLowerCase()] ?? 99) - (ROLE_ORDER[b.role?.toLowerCase()] ?? 99));
}

function getUserMenuItems(targetUser?: RoomUser): ContextMenuItem[] {
    const isMuted = targetUser?.isMuted;
    const isGagged = targetUser?.isGagged;
    const isBanned = targetUser?.isBanned;
    const isCamBlocked = targetUser?.isCamBlocked;

    return [
        { id: 'pull-to-room', label: 'Odaya Çek', icon: '📞', action: 'pullToRoom', description: 'Bu odaya çek' },
        isMuted
            ? { id: 'unmute', label: 'Sesi Aç', icon: '🔊', action: 'unmuteUser', description: 'Susturmayı kaldır' }
            : { id: 'mute', label: 'Sustur', icon: '🔇', action: 'muteUser', description: 'Kullanıcıyı sustur' },
        { id: 'kick', label: 'At', icon: '👢', action: 'kickUser', confirm: true, confirmMessage: 'Kullanıcı odadan atılacak. Emin misiniz?' },
        { id: 'hard-kick', label: 'Zorla At', icon: '⚡', action: 'hardKickUser', confirm: true, confirmMessage: 'Zorla atılacak. Sayfayı yenilemeden giremeyecek.' },
        isGagged
            ? { id: 'ungag', label: 'Yazı Yasağını Kaldır', icon: '💬', action: 'ungagUser', description: 'Yazma izni ver' }
            : { id: 'gag', label: 'Yazı Yasağı', icon: '🤐', action: 'gagUser', description: 'Chat yazamaz' },
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
        isCamBlocked
            ? { id: 'cam-unblock', label: 'Kamera İznini Aç', icon: '📷', action: 'unblockCamera', description: 'Kamera engelini kaldır' }
            : { id: 'cam-block', label: 'Kamera Engelle', icon: '📷🚫', action: 'blockCamera', description: 'Kamerasını engelle' },
        { id: 'exit-browser', label: 'Tarayıcıyı Kapat', icon: '🌐', action: 'exitBrowser', confirm: true, confirmMessage: 'Kullanıcının tarayıcısı kapatılacak! Emin misiniz?' },
        ...(targetUser?.role && ['operator', 'moderator', 'admin'].includes(targetUser.role)
            ? [{ id: 'revoke-role', label: 'Yetkiyi Geri Al', icon: '❌', action: 'revokeRole', confirm: true, confirmMessage: `${targetUser.role} yetkisi geri alınacak. Emin misiniz?` }]
            : [{ id: 'make-room-op', label: 'Oda Operatörü Yap', icon: '👑', action: 'makeRoomOperator', confirm: true, confirmMessage: 'Kullanıcı oda operatörü yapılacak. Emin misiniz?' }]
        ),
        { id: 'clear-text', label: 'Mesajları Sil', icon: '🗑️', action: 'clearUserMessages', confirm: true, confirmMessage: 'Tüm mesajları silinecek. Emin misiniz?' },
        { id: 'free-mic', label: 'Mikrofonu Serbest Bırak', icon: '🎤', action: 'freeMicForUser' },
        { id: 'take-mic', label: 'Mikrofonu Al', icon: '🎙️', action: 'takeMicFromUser' },
        { id: 'move-to-meeting', label: 'Toplantıya Çek', icon: '🔒', action: 'moveUserToMeeting' },
    ];
}

const MAX_VISIBLE_USERS = 6;

export function RoomMonitorModal({
    isOpen, onClose, socket, currentRoomSlug, onNavigateToRoom,
    onUserAction, userLevel, currentUserId, currentUserRole,
}: RoomMonitorModalProps) {
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [userContextMenu, setUserContextMenu] = useState<{ x: number; y: number; targetUser: RoomUser; items: ContextMenuItem[] } | null>(null);
    const [inlineConfirm, setInlineConfirm] = useState<{ item: ContextMenuItem; targetUser: RoomUser; message: string } | null>(null);
    const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [centered, setCentered] = useState(true);
    const dragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);

    const fetchMonitorData = useCallback(() => {
        if (!socket) return;
        socket.emit('room:monitor', null, (data: { rooms: RoomInfo[] }) => {
            if (data?.rooms) { setRooms(data.rooms); setLastUpdate(new Date()); }
            setLoading(false);
        });
    }, [socket]);

    useEffect(() => {
        if (!isOpen || !socket) return;
        setLoading(true); setSearchQuery(''); setCentered(true);
        fetchMonitorData();
        const interval = setInterval(fetchMonitorData, 10000);
        return () => clearInterval(interval);
    }, [isOpen, socket, fetchMonitorData]);

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
        dragging.current = true; e.preventDefault();
    }, [centered, position]);

    useEffect(() => {
        const move = (e: MouseEvent) => { if (!dragging.current) return; setPosition({ x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x)), y: Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.current.y)) }); };
        const up = () => { dragging.current = false; };
        window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
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
        socket.emit('admin:pull-user', { userId, targetRoomSlug: currentRoomSlug }, (r: any) => console.log('[RoomMonitor] pull ACK:', r));
        setTimeout(() => fetchMonitorData(), 500);
        setTimeout(() => fetchMonitorData(), 1500);
        setTimeout(() => fetchMonitorData(), 3000);
    }, [socket, currentRoomSlug, fetchMonitorData]);

    const handleUserContextMenu = useCallback((e: React.MouseEvent, user: RoomUser) => {
        e.preventDefault(); e.stopPropagation();
        const isSelf = user.userId === currentUserId;
        const targetLevel = getRoleLevel(user.role);
        const filteredItems = getMenuForUser(getUserMenuItems(user), userLevel, 'user', targetLevel, isSelf);
        if (filteredItems.length === 0) return;
        setUserContextMenu({ x: e.clientX, y: e.clientY, targetUser: user, items: filteredItems });
    }, [currentUserId, userLevel]);

    const userContextMenuRef = useRef(userContextMenu);
    userContextMenuRef.current = userContextMenu;

    const handleContextMenuAction = useCallback((item: ContextMenuItem) => {
        const ctx = userContextMenuRef.current;
        if (!ctx) return;
        if (item.confirm && !item._confirmed) {
            setInlineConfirm({ item, targetUser: ctx.targetUser, message: item.confirmMessage || 'Emin misiniz?' });
            setUserContextMenu(null); return;
        }
        if (item.action === 'pullToRoom') handlePullUser(ctx.targetUser.userId);
        else onUserAction({ ...item, _confirmed: true }, ctx.targetUser);
        setUserContextMenu(null);
        setTimeout(() => fetchMonitorData(), 500);
    }, [onUserAction, fetchMonitorData, handlePullUser]);

    const handleInlineConfirm = useCallback(() => {
        if (!inlineConfirm) return;
        const { item, targetUser } = inlineConfirm;
        if (item.action === 'pullToRoom') handlePullUser(targetUser.userId);
        else onUserAction({ ...item, _confirmed: true }, targetUser);
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
        ? {} : { position: 'fixed', left: position.x, top: position.y, margin: 0, transform: 'none' };

    const content = (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={onClose} style={centered ? {} : { display: 'block' }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            <div
                ref={modalRef}
                className="glossy-panel relative w-full max-w-2xl max-h-[70vh] animate-pure-fade flex flex-col"
                onClick={(e) => e.stopPropagation()}
                style={{
                    ...modalStyle,
                    borderRadius: 16,
                    padding: 0,
                    overflow: 'hidden',
                }}
            >
                {/* Header — kompakt */}
                <div
                    className="flex items-center justify-between px-4 py-2.5"
                    onMouseDown={handleMouseDown}
                    style={{ cursor: 'move', userSelect: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
                >
                    <div className="flex items-center gap-2.5">
                        <span style={{ fontSize: 16 }}>📡</span>
                        <div>
                            <h2 style={{ fontSize: 13, fontWeight: 800, color: '#fff', margin: 0 }}>Oda Monitör</h2>
                            <div style={{ display: 'flex', gap: 6, marginTop: 1 }}>
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#34d399' }}>
                                    ● {activeRooms} aktif
                                </span>
                                <span style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8' }}>
                                    👥 {totalUsers} kişi
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* Search inline */}
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="🔍 Ara..."
                            style={{
                                width: 130, fontSize: 10, color: '#e2e8f0', fontWeight: 500,
                                borderRadius: 8, padding: '4px 10px',
                                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.15)',
                                outline: 'none', transition: 'all 0.2s',
                            }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.4)'; e.currentTarget.style.width = '180px'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; if (!e.currentTarget.value) e.currentTarget.style.width = '130px'; }}
                        />
                        <button
                            onClick={(e) => { e.stopPropagation(); fetchMonitorData(); }}
                            style={{
                                padding: '4px 8px', borderRadius: 6, fontSize: 10,
                                color: '#94a3b8', background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.color = '#c4b5fd'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.3)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                            title="Yenile"
                        >
                            🔄
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                width: 24, height: 24, borderRadius: 6,
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                color: '#64748b', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, transition: 'all 0.15s',
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#64748b'; }}
                        >✕</button>
                    </div>
                </div>

                {/* Room Grid */}
                <div className="flex-1 overflow-y-auto" style={{ padding: '10px 14px 14px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                        </div>
                    ) : filteredRooms.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-xs">Sonuç yok</div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
                            {filteredRooms.map(room => {
                                const isCurrent = room.slug === currentRoomSlug;
                                const hasUsers = room.userCount > 0;
                                const sorted = sortUsersByRole(room.users || []);
                                const isExpanded = expandedRooms.has(room.id);
                                const visible = isExpanded ? sorted : sorted.slice(0, MAX_VISIBLE_USERS);
                                const extra = room.userCount - MAX_VISIBLE_USERS;
                                const cap = room.maxParticipants || 30;
                                const pct = Math.min(100, (room.userCount / cap) * 100);

                                return (
                                    <div
                                        key={room.id}
                                        style={{
                                            padding: '10px 12px', borderRadius: 12,
                                            background: isCurrent ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${isCurrent ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.08)'}`,
                                            transition: 'all 0.2s', display: 'flex', flexDirection: 'column',
                                        }}
                                        onMouseOver={(e) => { if (!isCurrent) { e.currentTarget.style.background = 'rgba(167,139,250,0.06)'; e.currentTarget.style.borderColor = 'rgba(167,139,250,0.2)'; } }}
                                        onMouseOut={(e) => { if (!isCurrent) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; } }}
                                    >
                                        {/* Room name row */}
                                        <div
                                            className="flex items-center justify-between mb-1.5"
                                            style={{ cursor: isCurrent ? 'default' : 'pointer' }}
                                            onClick={() => { if (!isCurrent) { onNavigateToRoom(room.slug); onClose(); } }}
                                        >
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span style={{ fontSize: 12 }}>
                                                    {room.isVipRoom ? '👑' : room.isLocked ? '🔒' : hasUsers ? '🎙️' : '💤'}
                                                </span>
                                                <span className="text-[11px] font-bold text-white truncate">{room.name}</span>
                                                {isCurrent && <span style={{ fontSize: 7, color: '#a78bfa', fontWeight: 700 }}>● SEN</span>}
                                            </div>
                                            <span style={{
                                                fontSize: 9, fontWeight: 700,
                                                color: hasUsers ? '#34d399' : '#475569',
                                            }}>
                                                {room.userCount}/{cap}
                                            </span>
                                        </div>

                                        {/* Thin capacity bar */}
                                        <div style={{ height: 2, borderRadius: 1, marginBottom: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', borderRadius: 1, width: `${pct}%`,
                                                background: pct > 80 ? '#ef4444' : pct > 50 ? '#fbbf24' : '#a78bfa',
                                                transition: 'width 0.4s ease',
                                            }} />
                                        </div>

                                        {/* Users */}
                                        <div style={{ flex: 1, minHeight: 20 }}>
                                            {!hasUsers ? (
                                                <div style={{ fontSize: 9, color: '#64748b', textAlign: 'center', padding: '4px 0' }}>Boş</div>
                                            ) : (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                    {visible.map(user => {
                                                        const rl = user.role?.toLowerCase() || 'guest';
                                                        const clr = ROLE_COLORS[rl] || '#64748b';
                                                        return (
                                                            <div
                                                                key={user.userId}
                                                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 4px', borderRadius: 6, cursor: 'context-menu', transition: 'background 0.1s' }}
                                                                onContextMenu={(e) => handleUserContextMenu(e, user)}
                                                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                                                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                                            >
                                                                <div style={{
                                                                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                                                                    background: `${clr}20`, border: `1px solid ${clr}40`,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: 7, fontWeight: 800, color: clr, textTransform: 'uppercase', overflow: 'hidden',
                                                                }}>
                                                                    {user.avatar ? <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (user.displayName || '?')[0]}
                                                                </div>
                                                                <span style={{ fontSize: 10, fontWeight: 600, color: clr, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {user.displayName}
                                                                </span>
                                                                {ROLE_ICONS[rl] && <span style={{ fontSize: 9, opacity: 0.6 }}>{ROLE_ICONS[rl]}</span>}
                                                                {user.isMuted && <span style={{ fontSize: 8 }}>🔇</span>}
                                                                {user.isGagged && <span style={{ fontSize: 8 }}>🤐</span>}
                                                            </div>
                                                        );
                                                    })}
                                                    {extra > 0 && !isExpanded && (
                                                        <button onClick={() => setExpandedRooms(p => new Set(p).add(room.id))} style={{ fontSize: 8, color: '#a78bfa', fontWeight: 600, paddingLeft: 21, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                                                            +{extra} kişi daha
                                                        </button>
                                                    )}
                                                    {isExpanded && sorted.length > MAX_VISIBLE_USERS && (
                                                        <button onClick={() => setExpandedRooms(p => { const s = new Set(p); s.delete(room.id); return s; })} style={{ fontSize: 8, color: '#64748b', fontWeight: 600, paddingLeft: 21, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                                                            ▲ kapat
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Quick actions */}
                                        {!isCurrent && (
                                            <div style={{ display: 'flex', gap: 4, marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                <button
                                                    onClick={() => { onNavigateToRoom(room.slug); onClose(); }}
                                                    style={{
                                                        flex: 1, padding: '4px 0', borderRadius: 6, fontSize: 9, fontWeight: 700,
                                                        background: 'rgba(167,139,250,0.08)', color: '#c4b5fd',
                                                        border: '1px solid rgba(167,139,250,0.15)', cursor: 'pointer', transition: 'all 0.15s',
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(167,139,250,0.18)'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(167,139,250,0.08)'; }}
                                                >
                                                    Gir →
                                                </button>
                                                <button
                                                    onClick={() => { onNavigateToRoom(room.slug); onClose(); }}
                                                    style={{
                                                        flex: 1, padding: '4px 0', borderRadius: 6, fontSize: 9, fontWeight: 700,
                                                        background: 'rgba(255,255,255,0.03)', color: '#94a3b8',
                                                        border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'all 0.15s',
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(56,189,248,0.1)'; e.currentTarget.style.color = '#38bdf8'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#94a3b8'; }}
                                                    title="Görünmez gir"
                                                >
                                                    👁 Gözle
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Tiny footer */}
                <div style={{ padding: '4px 14px 6px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 8, color: '#64748b' }}>
                    💡 Sağ tık → moderasyon · {lastUpdate.toLocaleTimeString('tr-TR')}
                </div>
            </div>

            {/* Context Menu */}
            {userContextMenu && (
                <ContextMenu items={userContextMenu.items} x={userContextMenu.x} y={userContextMenu.y} onClose={() => setUserContextMenu(null)} onItemClick={handleContextMenuAction} />
            )}

            {/* Inline Confirm */}
            {inlineConfirm && (
                <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setInlineConfirm(null)} />
                    <div className="glossy-panel relative w-full max-w-xs overflow-hidden" style={{ borderRadius: 14, padding: 0, animation: 'inlineConfirmIn 0.15s ease-out' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #ef4444, transparent)' }} />
                        <div style={{ padding: '16px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <span style={{ fontSize: 20 }}>⚠️</span>
                                <div>
                                    <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>{inlineConfirm.targetUser.displayName}</h3>
                                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0', lineHeight: 1.4 }}>{inlineConfirm.message}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
                                <button onClick={() => setInlineConfirm(null)} style={{ padding: '5px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#94a3b8', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                                    İptal
                                </button>
                                <button onClick={handleInlineConfirm} style={{ padding: '5px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#fff', background: '#ef4444', border: 'none', cursor: 'pointer' }}>
                                    Onayla
                                </button>
                            </div>
                        </div>
                        <style>{`@keyframes inlineConfirmIn { from { opacity:0; transform:scale(0.95) translateY(-6px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
                    </div>
                </div>
            )}
        </div>
    );

    return createPortal(content, document.body);
}
