'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Users, UserCheck, MessageCircle, Check, X, Trash2, Send } from 'lucide-react';

interface Friend {
    friendshipId: string;
    friend: { id: string; displayName: string; avatarUrl?: string; isOnline?: boolean; lastSeenAt?: string; role?: string };
    since: string;
}

interface FriendRequest {
    id: string;
    senderId: string;
    sender: { id: string; displayName: string; avatarUrl?: string; role?: string };
    createdAt: string;
}

interface DM {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: string;
    sender: { id: string; displayName: string; avatarUrl?: string };
}

interface FriendsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    socket: any;
    token?: string;
    currentUserId: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

type Tab = 'friends' | 'requests' | 'messages';

export function FriendsPanel({ isOpen, onClose, socket, token: tokenProp, currentUserId }: FriendsPanelProps) {
    const [tab, setTab] = useState<Tab>('friends');
    const [friends, setFriends] = useState<Friend[]>([]);
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
    const [messages, setMessages] = useState<DM[]>([]);
    const [msgInput, setMsgInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Draggable
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [centered, setCentered] = useState(true);
    const dragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);

    // Token resolution — try multiple sources
    const resolvedToken = tokenProp || (() => {
        if (typeof window === 'undefined') return '';
        return sessionStorage.getItem('soprano_tenant_token')
            || sessionStorage.getItem('soprano_auth_token')
            || '';
    })();

    const headers = { 'Authorization': `Bearer ${resolvedToken}`, 'Content-Type': 'application/json' };

    const fetchFriends = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/friend/list`, { headers });
            if (res.ok) setFriends(await res.json());
        } catch { }
    }, [resolvedToken]);

    const fetchRequests = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/friend/requests`, { headers });
            if (res.ok) setRequests(await res.json());
        } catch { }
    }, [resolvedToken]);

    const fetchMessages = useCallback(async (friendId: string) => {
        try {
            const res = await fetch(`${API_URL}/friend/dm/${friendId}`, { headers });
            if (res.ok) setMessages(await res.json());
        } catch { }
    }, [resolvedToken]);

    useEffect(() => {
        if (!isOpen) return;
        setCentered(true);
        fetchFriends();
        fetchRequests();
    }, [isOpen]);

    // WebSocket eventleri dinle
    useEffect(() => {
        if (!socket || !isOpen) return;

        const onRequestReceived = (data: any) => {
            fetchRequests();
        };
        const onAccepted = (data: any) => {
            fetchFriends();
            fetchRequests();
        };
        const onRemoved = (data: any) => {
            setFriends(prev => prev.filter(f => f.friendshipId !== data.friendshipId));
        };
        const onDmNew = (data: DM) => {
            if (selectedFriend && (data.senderId === selectedFriend.friend.id || data.receiverId === selectedFriend.friend.id)) {
                setMessages(prev => [...prev, data]);
            }
        };

        socket.on('friend:request:received', onRequestReceived);
        socket.on('friend:accepted', onAccepted);
        socket.on('friend:removed', onRemoved);
        socket.on('friend:dm:new', onDmNew);

        return () => {
            socket.off('friend:request:received', onRequestReceived);
            socket.off('friend:accepted', onAccepted);
            socket.off('friend:removed', onRemoved);
            socket.off('friend:dm:new', onDmNew);
        };
    }, [socket, isOpen, selectedFriend]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleAccept = async (id: string) => {
        try {
            await fetch(`${API_URL}/friend/accept/${id}`, { method: 'PATCH', headers });
            if (socket) socket.emit('friend:accept', { friendshipId: id });
            fetchFriends();
            fetchRequests();
        } catch { }
    };

    const handleReject = async (id: string) => {
        try {
            await fetch(`${API_URL}/friend/reject/${id}`, { method: 'PATCH', headers });
            if (socket) socket.emit('friend:reject', { friendshipId: id });
            fetchRequests();
        } catch { }
    };

    const handleRemove = async (friendshipId: string) => {
        try {
            await fetch(`${API_URL}/friend/remove/${friendshipId}`, { method: 'DELETE', headers });
            if (socket) socket.emit('friend:remove', { friendshipId });
            setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId));
            if (selectedFriend?.friendshipId === friendshipId) { setSelectedFriend(null); setMessages([]); }
        } catch { }
    };

    const handleSendDm = () => {
        if (!msgInput.trim() || !selectedFriend) return;
        if (socket) {
            socket.emit('friend:dm', { receiverId: selectedFriend.friend.id, content: msgInput.trim() });
        }
        setMsgInput('');
    };

    const openChat = (friend: Friend) => {
        setSelectedFriend(friend);
        setTab('messages');
        fetchMessages(friend.friend.id);
    };

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
        const move = (e: MouseEvent) => { if (!dragging.current) return; setPosition({ x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - offset.current.x)), y: Math.max(0, Math.min(window.innerHeight - 50, e.clientY - offset.current.y)) }); };
        const up = () => { dragging.current = false; };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    }, []);

    if (!isOpen) return null;

    const modalStyle: React.CSSProperties = centered
        ? {}
        : { position: 'fixed', left: position.x, top: position.y, margin: 0, transform: 'none' };

    const TABS: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
        { key: 'friends', label: 'Arkadaşlar', icon: <Users size={13} />, count: friends.length },
        { key: 'requests', label: 'İstekler', icon: <UserCheck size={13} />, count: requests.length },
        { key: 'messages', label: 'Mesajlar', icon: <MessageCircle size={13} /> },
    ];

    return createPortal(
        <>
            <div className="fixed inset-0 z-[10000]" onClick={onClose} style={{ background: 'rgba(0,0,0,0.25)' }} />
            <div className="fixed inset-0 z-[10001] flex items-start justify-center p-4" style={centered ? { paddingTop: '15vh' } : { display: 'block' }}>
                <div
                    ref={modalRef}
                    className="w-full animate-pure-fade"
                    style={{
                        ...modalStyle,
                        maxWidth: 380,
                        background: 'linear-gradient(165deg, rgba(226,232,240,0.96) 0%, rgba(218,225,235,0.95) 50%, rgba(210,218,230,0.94) 100%)',
                        backdropFilter: 'blur(28px) saturate(130%)',
                        WebkitBackdropFilter: 'blur(28px) saturate(130%)',
                        border: '1px solid rgba(255,255,255,0.65)',
                        borderRadius: 14, boxShadow: '0 20px 50px rgba(0,0,0,0.18), 0 6px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
                        overflow: 'hidden',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-3.5 py-1.5"
                        onMouseDown={handleMouseDown}
                        style={{ cursor: 'move', userSelect: 'none', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
                    >
                        <h2 style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 6, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                            <span style={{ fontSize: 13 }}>👥</span> Arkadaşlar
                        </h2>
                        <button onClick={onClose} style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, transition: 'all 0.2s' }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                        >✕</button>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 2, padding: '6px 10px 4px', borderBottom: '1px solid rgba(100,116,139,0.1)' }}>
                        {TABS.map(t => (
                            <button key={t.key} onClick={() => { setTab(t.key); if (t.key === 'friends') fetchFriends(); if (t.key === 'requests') fetchRequests(); }}
                                style={{
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                    padding: '5px 8px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                                    background: tab === t.key ? 'linear-gradient(135deg, #0f172a, #1e293b)' : 'rgba(100,116,139,0.08)',
                                    color: tab === t.key ? '#fff' : '#64748b',
                                }}
                            >
                                {t.icon} {t.label}
                                {t.count !== undefined && t.count > 0 && (
                                    <span style={{ marginLeft: 2, fontSize: 9, background: tab === t.key ? 'rgba(255,255,255,0.2)' : 'rgba(100,116,139,0.15)', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>{t.count}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div style={{ maxHeight: 340, overflowY: 'auto', padding: '8px 10px' }}>

                        {/* === Arkadaşlar Listesi === */}
                        {tab === 'friends' && (
                            friends.length === 0
                                ? <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 12 }}>Henüz arkadaşınız yok</div>
                                : friends.map(f => (
                                    <div key={f.friendshipId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 10, transition: 'background 0.15s', cursor: 'pointer' }}
                                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(100,116,139,0.08)')}
                                        onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                                        onClick={() => openChat(f)}
                                    >
                                        <div style={{ position: 'relative' }}>
                                            <img src={f.friend.avatarUrl || '/avatars/default.webp'} alt="" style={{ width: 34, height: 34, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(100,116,139,0.15)' }} />
                                            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', border: '2px solid #e2e8f0', background: f.friend.isOnline ? '#22c55e' : '#94a3b8' }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.friend.displayName}</div>
                                            <div style={{ fontSize: 10, color: f.friend.isOnline ? '#22c55e' : '#94a3b8' }}>{f.friend.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button onClick={e => { e.stopPropagation(); openChat(f); }} title="Mesaj" style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, transition: 'all 0.15s' }}>
                                                <MessageCircle size={12} />
                                            </button>
                                            <button onClick={e => { e.stopPropagation(); handleRemove(f.friendshipId); }} title="Sil" style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, transition: 'all 0.15s' }}>
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                        )}

                        {/* === İstekler === */}
                        {tab === 'requests' && (
                            requests.length === 0
                                ? <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 12 }}>Bekleyen istek yok</div>
                                : requests.map(r => (
                                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 10, background: 'rgba(100,116,139,0.04)' }}>
                                        <img src={r.sender.avatarUrl || '/avatars/default.webp'} alt="" style={{ width: 34, height: 34, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(100,116,139,0.15)' }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{r.sender.displayName}</div>
                                            <div style={{ fontSize: 10, color: '#94a3b8' }}>Arkadaşlık isteği gönderdi</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button onClick={() => handleAccept(r.id)} title="Kabul Et" style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                                <Check size={14} />
                                            </button>
                                            <button onClick={() => handleReject(r.id)} title="Reddet" style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                        )}

                        {/* === Mesajlar === */}
                        {tab === 'messages' && (
                            !selectedFriend
                                ? <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 12 }}>Mesajlaşmak için bir arkadaş seçin</div>
                                : (
                                    <div>
                                        {/* Chat header */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 8px', borderBottom: '1px solid rgba(100,116,139,0.1)', marginBottom: 8 }}>
                                            <button onClick={() => { setSelectedFriend(null); setMessages([]); setTab('friends'); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, padding: 2 }}>←</button>
                                            <img src={selectedFriend.friend.avatarUrl || '/avatars/default.webp'} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} />
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{selectedFriend.friend.displayName}</div>
                                            </div>
                                        </div>

                                        {/* Messages */}
                                        <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {messages.length === 0 && <div style={{ textAlign: 'center', padding: 16, color: '#94a3b8', fontSize: 11 }}>Henüz mesaj yok</div>}
                                            {messages.map(m => {
                                                const isMine = m.senderId === currentUserId;
                                                return (
                                                    <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                                                        <div style={{
                                                            maxWidth: '75%', padding: '6px 10px', borderRadius: 10,
                                                            background: isMine ? 'linear-gradient(135deg, #0f172a, #1e293b)' : 'rgba(255,255,255,0.7)',
                                                            color: isMine ? '#fff' : '#1e293b', fontSize: 12, lineHeight: 1.4,
                                                            border: isMine ? 'none' : '1px solid rgba(100,116,139,0.1)',
                                                        }}>
                                                            {m.content}
                                                            <div style={{ fontSize: 9, color: isMine ? 'rgba(255,255,255,0.5)' : '#94a3b8', marginTop: 2, textAlign: 'right' }}>
                                                                {new Date(m.createdAt).toLocaleTimeString('tr', { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            <div ref={messagesEndRef} />
                                        </div>

                                        {/* Input */}
                                        <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(100,116,139,0.1)' }}>
                                            <input
                                                value={msgInput} onChange={e => setMsgInput(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendDm(); } }}
                                                placeholder="Mesaj yazın..."
                                                style={{ flex: 1, padding: '7px 10px', borderRadius: 10, border: '1px solid rgba(100,116,139,0.15)', background: 'rgba(255,255,255,0.5)', fontSize: 12, outline: 'none', color: '#1e293b' }}
                                            />
                                            <button onClick={handleSendDm} disabled={!msgInput.trim()} style={{
                                                width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer',
                                                background: msgInput.trim() ? 'linear-gradient(135deg, #0f172a, #1e293b)' : 'rgba(100,116,139,0.1)',
                                                color: msgInput.trim() ? '#fff' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                                            }}>
                                                <Send size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )
                        )}
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}
