'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface MeetingModalProps {
    isOpen: boolean;
    onClose: () => void;
    socket: any;
    currentRoomSlug: string;
    users: any[];
    mode: 'meeting' | 'conference';
}

export function MeetingModal({ isOpen, onClose, socket, currentRoomSlug, users, mode }: MeetingModalProps) {
    const [roomName, setRoomName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [isPrivate, setIsPrivate] = useState(false);
    const [error, setError] = useState('');

    // Draggable
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [centered, setCentered] = useState(true);
    const dragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setRoomName('');
            setSelectedUsers([]);
            setIsPrivate(false);
            setError('');
            setCentered(true);
        }
    }, [isOpen]);

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

    if (!isOpen) return null;

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    const handleCreate = () => {
        if (!roomName.trim()) { setError('Oda adı gerekli'); return; }
        if (socket) {
            socket.emit('admin:roomAction', {
                action: 'create',
                name: roomName.trim(),
                isMeetingRoom: true,
                isPrivate,
                invitedUsers: selectedUsers,
                type: mode,
            });
        }
        onClose();
    };

    const availableUsers = (users || []).filter((u: any) => {
        if (u.role?.toLowerCase() === 'godmaster') {
            const mode = u.visibilityMode || 'hidden';
            if (mode === 'hidden') return false;
        }
        return true;
    });

    const modalStyle: React.CSSProperties = centered
        ? {}
        : { position: 'fixed', left: position.x, top: position.y, margin: 0, transform: 'none' };

    const content = (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={onClose} style={centered ? {} : { display: 'block' }}>
            <div className="absolute inset-0 bg-black/15" />

            <div
                ref={modalRef}
                className="relative w-full max-w-md animate-pure-fade"
                onClick={(e) => e.stopPropagation()}
                style={{
                    ...modalStyle,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
            >


                <div
                    className="flex items-center justify-between p-5 pb-3"
                    onMouseDown={handleMouseDown}
                    style={{ cursor: 'move', userSelect: 'none' }}
                >
                    <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <span>{mode === 'meeting' ? '📋' : '📞'}</span>
                        {mode === 'meeting' ? 'Toplantı Oluştur' : 'Konferans Oluştur'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">✕</button>
                </div>

                <div className="px-5 pb-5 space-y-4">
                    <div>
                        <label className="text-xs text-slate-500 mb-2 block">Oda Adı</label>
                        <input
                            value={roomName}
                            onChange={(e) => { setRoomName(e.target.value); setError(''); }}
                            placeholder={mode === 'meeting' ? 'Toplantı adı...' : 'Konferans adı...'}
                            className="w-full text-sm text-slate-800 rounded-xl px-4 py-3 border border-gray-200 focus:border-blue-400 focus:outline-none"
                            style={{ background: '#f8fafc' }}
                        />
                        {error && <span className="text-xs text-red-400 mt-1 block">{error}</span>}
                    </div>

                    <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="accent-amber-600" />
                        <span className="text-sm text-slate-600">Gizli oda (sadece davet edilenler)</span>
                    </label>

                    {availableUsers.length > 0 && (
                        <div>
                            <label className="text-xs text-slate-500 mb-2 block">Katılımcı Davet Et ({selectedUsers.length})</label>
                            <div className="max-h-[180px] overflow-y-auto space-y-1 rounded-xl p-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', scrollbarWidth: 'thin' }}>
                                {availableUsers.map((u: any) => (
                                    <button
                                        key={u.id || u.userId}
                                        onClick={() => toggleUser(u.id || u.userId)}
                                        className="w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all"
                                        style={{
                                            background: selectedUsers.includes(u.id || u.userId) ? '#dbeafe' : 'transparent',
                                            border: selectedUsers.includes(u.id || u.userId) ? '1px solid #93c5fd' : '1px solid transparent',
                                        }}
                                    >
                                        <img src={u.avatar || `/avatars/neutral_1.png`} alt="" className="w-7 h-7 rounded-full" style={{ background: '#0d0f17' }} />
                                        <span className="text-sm text-slate-700">{u.username || u.displayName}</span>
                                        {selectedUsers.includes(u.id || u.userId) && <span className="ml-auto text-blue-600 text-sm">✓</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button onClick={handleCreate} className="w-full py-3 text-sm font-bold text-white rounded-xl bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                        {mode === 'meeting' ? 'Toplantı Başlat' : 'Konferans Başlat'}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
