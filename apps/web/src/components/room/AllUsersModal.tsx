'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getRoleLevel, ROLE_LABELS } from '@/common/roomPermissions';
import './AllUsersModal.css';

// ─── Types ──────────────────────────────────────────────────
interface OnlineUser {
    userId: string;
    displayName: string;
    avatar: string;
    role: string;
    status: string;
    isMuted: boolean;
    isGagged: boolean;
    isBanned: boolean;
    isCamBlocked: boolean;
    isStealth: boolean;
}

interface RoomData {
    roomId: string;
    users: OnlineUser[];
}

interface AllUsersModalProps {
    isOpen: boolean;
    onClose: () => void;
    socket: any;
    currentUser: any;
    onOpenDM?: (username: string) => void;
}

// ─── Room Name Map ──────────────────────────────────────────
const ROOM_NAMES: Record<string, string> = {
    'genel': 'Genel Sohbet',
    'muzik': 'Müzik Odası',
    'oyun': 'Oyun Alanı',
    'vip': 'VIP Lounge',
};

const ROOM_ICONS: Record<string, string> = {
    'genel': '💬',
    'muzik': '🎵',
    'oyun': '🎮',
    'vip': '👑',
};

// ─── Actions per user level ────────────────────────────────
function getRemoteActions(actorLevel: number, targetUser: OnlineUser, isSelf: boolean) {
    if (isSelf) return [];
    const targetLevel = getRoleLevel(targetUser.role);
    if (actorLevel <= targetLevel) return [];

    const actions: { id: string; label: string; icon: string; action: string; variant?: 'danger' | 'warn' }[] = [];

    actions.push({ id: 'pm', label: 'Özel Mesaj', icon: '💬', action: 'pm' });

    if (actorLevel >= 3) {
        actions.push({
            id: 'mute',
            label: targetUser.isMuted ? 'Sesi Aç' : 'Sustur',
            icon: targetUser.isMuted ? '🔊' : '🔇',
            action: 'mute',
            variant: 'warn',
        });
    }

    if (actorLevel >= 4) {
        actions.push({
            id: 'gag',
            label: targetUser.isGagged ? 'Yazı Yasağını Kaldır' : 'Yazı Yasağı',
            icon: targetUser.isGagged ? '💬' : '🤐',
            action: 'gag',
            variant: 'warn',
        });
    }

    if (actorLevel >= 3) {
        actions.push({ id: 'kick', label: 'At', icon: '👢', action: 'kick', variant: 'danger' });
    }

    if (actorLevel >= 4) {
        actions.push({ id: 'ban-1d', label: '1 Gün Yasakla', icon: '🚫', action: 'ban', variant: 'danger' });
    }

    if (actorLevel >= 7) {
        actions.push({ id: 'ban-perm', label: 'Kalıcı Yasakla', icon: '⛔', action: 'ban-permanent', variant: 'danger' });
    }

    return actions;
}

// ─── Component ─────────────────────────────────────────────
export default function AllUsersModal({ isOpen, onClose, socket, currentUser, onOpenDM }: AllUsersModalProps) {
    const [rooms, setRooms] = useState<RoomData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Draggable state
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [centered, setCentered] = useState(true);
    const dragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);

    const actorLevel = getRoleLevel(currentUser?.role);

    const fetchUsers = useCallback(() => {
        if (!socket || !isOpen) return;
        setLoading(true);
        socket.emit('admin:getAllOnlineUsers');
    }, [socket, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        setCentered(true);
        fetchUsers();

        const handleResponse = (data: { rooms: RoomData[] }) => {
            // GodMaster kullanıcıları frontend'de de filtrele
            const filteredRooms = data.rooms?.map(room => ({
                ...room,
                users: room.users.filter(u => {
                    // GodMaster: hide only when visibilityMode is 'hidden' or default
                    if (u.role?.toLowerCase() === 'godmaster' && u.userId !== currentUser?.userId) {
                        const mode = (u as any).visibilityMode || 'hidden';
                        if (mode === 'hidden') return false;
                    }
                    return true;
                })
            })).filter(room => room.users.length > 0) || [];
            setRooms(filteredRooms);
            setLoading(false);
        };

        const handleRemoteResult = (data: { success: boolean; message: string }) => {
            setToast({ message: data.message, type: data.success ? 'success' : 'error' });
            setTimeout(() => fetchUsers(), 500);
        };

        socket.on('admin:allOnlineUsers', handleResponse);
        socket.on('admin:remoteActionResult', handleRemoteResult);

        return () => {
            socket.off('admin:allOnlineUsers', handleResponse);
            socket.off('admin:remoteActionResult', handleRemoteResult);
        };
    }, [isOpen, socket, fetchUsers, currentUser?.userId]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    // Draggable handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!modalRef.current) return;
        if (centered) {
            const rect = modalRef.current.getBoundingClientRect();
            setPosition({ x: rect.left, y: rect.top });
            offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            setCentered(false);
        } else {
            offset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        }
        dragging.current = true;
        e.preventDefault();
    }, [centered, position]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!dragging.current) return;
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - offset.current.x)),
                y: Math.max(0, Math.min(window.innerHeight - 50, e.clientY - offset.current.y)),
            });
        };
        const handleMouseUp = () => { dragging.current = false; };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const handleAction = (user: OnlineUser, actionId: string) => {
        if (actionId === 'pm') {
            onOpenDM?.(user.displayName);
            onClose();
            return;
        }
        if (actionId === 'ban-permanent') {
            socket.emit('admin:remoteAction', { action: 'ban', targetUserId: user.userId, duration: 'permanent' });
            return;
        }
        if (actionId === 'ban') {
            socket.emit('admin:remoteAction', { action: 'ban', targetUserId: user.userId, duration: '1d' });
            return;
        }
        socket.emit('admin:remoteAction', { action: actionId, targetUserId: user.userId });
    };

    const totalUsers = rooms.reduce((sum, r) => sum + r.users.length, 0);

    if (!isOpen) return null;

    const modalStyle: React.CSSProperties = centered
        ? {}
        : {
            position: 'fixed',
            left: position.x,
            top: position.y,
            margin: 0,
            transform: 'none',
        };

    const modalContent = (
        <div className="all-users-overlay" onClick={onClose}>
            <div
                ref={modalRef}
                className="all-users-modal"
                onClick={(e) => e.stopPropagation()}
                style={modalStyle}
            >
                {/* Draggable Header */}
                <div
                    className="au-header"
                    onMouseDown={handleMouseDown}
                    style={{ cursor: 'move', userSelect: 'none' }}
                >
                    <h2>
                        <span className="au-icon">👥</span>
                        Çevrimiçi Kullanıcılar
                        <span className="au-badge">{totalUsers}</span>
                    </h2>
                    <button className="au-close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Body */}
                <div className="au-body">
                    {loading ? (
                        <div className="au-loading">
                            <div className="au-spinner" />
                            <span>Kullanıcılar yükleniyor...</span>
                        </div>
                    ) : rooms.length === 0 ? (
                        <div className="au-empty">Çevrimiçi kullanıcı bulunamadı.</div>
                    ) : (
                        rooms.map((room) => (
                            <div key={room.roomId} className="au-room-section">
                                <div className="au-room-header">
                                    <span className="au-room-icon">{ROOM_ICONS[room.roomId] || '🏠'}</span>
                                    <span className="au-room-name">{ROOM_NAMES[room.roomId] || room.roomId}</span>
                                    <span className="au-room-count">{room.users.length} kişi</span>
                                </div>

                                {room.users.map((user) => {
                                    const isSelf = user.userId === currentUser?.userId;
                                    const isSelected = selectedUserId === user.userId && !isSelf;
                                    const actions = isSelected ? getRemoteActions(actorLevel, user, isSelf) : [];

                                    return (
                                        <React.Fragment key={user.userId}>
                                            <div
                                                className={`au-user-row ${isSelected ? 'selected' : ''}`}
                                                onClick={() => {
                                                    if (isSelf) return;
                                                    setSelectedUserId(isSelected ? null : user.userId);
                                                }}
                                            >
                                                <div
                                                    className="au-user-avatar"
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e293b, #0f172a)', fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', overflow: 'hidden' }}
                                                >{user.avatar ? <img src={user.avatar} alt={user.displayName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : (user.displayName || '?').charAt(0)}</div>
                                                <div className="au-user-info">
                                                    <div className="au-user-name">
                                                        {user.displayName}
                                                        {isSelf && <span style={{ color: '#6366f1', marginLeft: 6, fontSize: 11 }}>(sen)</span>}
                                                    </div>
                                                    <div className="au-user-role">
                                                        {ROLE_LABELS[user.role] || user.role}
                                                        {user.status && user.status !== 'online' && ` • ${user.status}`}
                                                    </div>
                                                </div>
                                                <div className="au-user-badges">
                                                    {user.isMuted && <span className="au-status-dot muted" title="Susturulmuş" />}
                                                    {user.isGagged && <span className="au-status-dot gagged" title="Yazı Yasağı" />}
                                                    {user.isStealth && <span className="au-status-dot stealth" title="Gizli" />}
                                                </div>
                                            </div>

                                            {isSelected && actions.length > 0 && (
                                                <div className="au-actions-panel">
                                                    {actions.map((act) => (
                                                        <button
                                                            key={act.id}
                                                            className={`au-action-btn ${act.variant || ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAction(user, act.action);
                                                            }}
                                                        >
                                                            <span className="au-action-icon">{act.icon}</span>
                                                            {act.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {toast && <div className={`au-toast ${toast.type}`}>{toast.message}</div>}
        </div>
    );

    return createPortal(modalContent, document.body);
}
