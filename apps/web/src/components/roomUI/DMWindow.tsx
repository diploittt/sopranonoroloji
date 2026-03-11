"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Minus, Send, MessageSquare, Smile, Ban, MessageCircle, Vibrate, BellOff, Bell } from 'lucide-react';

interface DMMessage {
    id: string;
    from: string;
    message: string;
    timestamp: number;
    isSelf?: boolean;
}

interface DMWindowProps {
    targetUsername: string;
    messages: DMMessage[];
    onClose: () => void;
    onMinimize: () => void;
    onSendMessage: (text: string) => void;
    onIgnore?: () => void;
    isIgnored?: boolean;
    initialPosition?: { x: number; y: number };
    nudgeActive?: boolean;
    onNudge?: () => void;
    nudgeDisabled?: boolean;
    onNudgeToggle?: () => void;
    nudgeCooldown?: number;
}

const EMOJI_LIST = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
    '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋',
    '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🫡',
    '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬',
    '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
    '🤮', '🥴', '😵', '🤯', '🥳', '🥸', '😎', '🤓', '🧐', '😕',
    '👍', '👎', '👋', '🤝', '👏', '🙌', '🤞', '✌️', '🤟', '🤘',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕',
    '🔥', '⭐', '✨', '🎉', '🎊', '💯', '👀', '💬', '🎵', '🎶',
];

export function DMWindow({
    targetUsername,
    messages,
    onClose,
    onMinimize,
    onSendMessage,
    onIgnore,
    isIgnored,
    initialPosition = { x: 100, y: 100 },
    nudgeActive = false,
    onNudge,
    nudgeDisabled = false,
    onNudgeToggle,
    nudgeCooldown = 0,
}: DMWindowProps) {
    const [position, setPosition] = useState(initialPosition);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [inputText, setInputText] = useState("");
    const [showEmoji, setShowEmoji] = useState(false);
    const [mounted, setMounted] = useState(false);
    const windowRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Mount state for portal
    useEffect(() => setMounted(true), []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    // Drag Logic
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.dm-header-drag')) {
            e.preventDefault();
            setIsDragging(true);
            setDragOffset({
                x: e.clientX - position.x,
                y: e.clientY - position.y
            });
        }
    }, [position]);

    useEffect(() => {
        if (!isDragging) return;
        const handleMouseMove = (e: MouseEvent) => {
            const newX = Math.max(0, Math.min(window.innerWidth - 340, e.clientX - dragOffset.x));
            const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y));
            setPosition({ x: newX, y: newY });
        };
        const handleMouseUp = () => setIsDragging(false);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    const handleSend = useCallback(() => {
        if (!inputText.trim()) return;
        onSendMessage(inputText);
        setInputText("");
    }, [inputText, onSendMessage]);

    const addEmoji = useCallback((emoji: string) => {
        setInputText(prev => prev + emoji);
        setShowEmoji(false);
        inputRef.current?.focus();
    }, []);

    // Memoize message list
    const messageList = useMemo(() => messages.map((msg, idx) => (
        <div key={`${msg.id}-${idx}`} className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'}`}>
            <div
                className="max-w-[80%] px-3 py-1.5 text-[12px] leading-relaxed"
                style={msg.isSelf ? {
                    background: 'linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(99,102,241,0.14) 100%)',
                    border: '1px solid rgba(37,99,235,0.20)',
                    borderRadius: '14px 14px 4px 14px',
                    color: '#1e293b',
                } : {
                    background: 'rgba(226,232,240,0.6)',
                    border: '1px solid rgba(148,163,184,0.15)',
                    borderRadius: '14px 14px 14px 4px',
                    color: '#334155',
                }}
            >
                {msg.message}
                <div className={`text-[8px] mt-0.5 ${msg.isSelf ? 'text-right text-blue-500/50' : 'text-left text-slate-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    )), [messages]);

    if (!mounted) return null;

    const content = (
        <div
            ref={windowRef}
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                width: 320,
                height: 400,
                zIndex: 9999,
                willChange: isDragging ? 'transform' : 'auto',
                borderRadius: 18,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(165deg, rgba(226,232,240,0.97) 0%, rgba(218,225,235,0.96) 50%, rgba(210,218,230,0.95) 100%)',
                backdropFilter: 'blur(28px) saturate(130%)',
                WebkitBackdropFilter: 'blur(28px) saturate(130%)',
                border: '1px solid rgba(255,255,255,0.65)',
                boxShadow: nudgeActive
                    ? '0 0 30px rgba(239,68,68,0.4), 0 25px 60px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)'
                    : '0 25px 60px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
                animation: nudgeActive ? 'dmNudgeShake 0.08s linear infinite' : undefined,
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Header — Admin Panel style */}
            <div
                className="dm-header-drag"
                style={{
                    height: 38,
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    borderBottom: '1px solid rgba(37,99,235,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 12px',
                    cursor: 'move',
                    userSelect: 'none',
                    flexShrink: 0,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.20)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <MessageCircle style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.9)' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{targetUsername}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 4px rgba(34, 197, 94, 0.5)' }}></span>
                            Özel Mesaj
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {onNudge && (
                        <button
                            onClick={onNudge}
                            disabled={nudgeCooldown > 0}
                            style={{
                                width: 24, height: 24, borderRadius: 6,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: 'none', cursor: nudgeCooldown > 0 ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                background: nudgeCooldown > 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)',
                                color: nudgeCooldown > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)',
                                position: 'relative',
                            }}
                            title={nudgeCooldown > 0 ? `${nudgeCooldown}sn bekle` : 'Titret'}
                            onMouseEnter={e => {
                                if (nudgeCooldown <= 0) {
                                    e.currentTarget.style.background = 'rgba(251,146,60,0.25)';
                                    e.currentTarget.style.color = '#fb923c';
                                }
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = nudgeCooldown > 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)';
                                e.currentTarget.style.color = nudgeCooldown > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)';
                            }}
                        >
                            <Vibrate style={{ width: 12, height: 12 }} />
                            {nudgeCooldown > 0 && (
                                <span style={{
                                    position: 'absolute', top: -4, right: -4,
                                    fontSize: 7, fontWeight: 800, color: '#fff',
                                    background: '#ef4444', borderRadius: 6,
                                    padding: '0 3px', lineHeight: '12px', minWidth: 12, textAlign: 'center',
                                }}>{nudgeCooldown}</span>
                            )}
                        </button>
                    )}
                    {onNudgeToggle && (
                        <button
                            onClick={onNudgeToggle}
                            style={{
                                width: 24, height: 24, borderRadius: 6,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: 'none', cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: nudgeDisabled ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.08)',
                                color: nudgeDisabled ? '#fca5a5' : 'rgba(255,255,255,0.6)',
                            }}
                            title={nudgeDisabled ? 'Titremeyi Aç' : 'Titremeyi Kapat'}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = nudgeDisabled ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255,255,255,0.15)';
                                e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = nudgeDisabled ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.08)';
                                e.currentTarget.style.color = nudgeDisabled ? '#fca5a5' : 'rgba(255,255,255,0.6)';
                            }}
                        >
                            {nudgeDisabled ? <BellOff style={{ width: 12, height: 12 }} /> : <Bell style={{ width: 12, height: 12 }} />}
                        </button>
                    )}
                    {onIgnore && (
                        <button
                            onClick={onIgnore}
                            style={{
                                width: 24, height: 24, borderRadius: 6,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: 'none', cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: isIgnored ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.08)',
                                color: isIgnored ? '#fca5a5' : 'rgba(255,255,255,0.6)',
                            }}
                            title={isIgnored ? 'Yoksayma Kaldır' : 'Yoksay'}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = isIgnored ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255,255,255,0.15)';
                                e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = isIgnored ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.08)';
                                e.currentTarget.style.color = isIgnored ? '#fca5a5' : 'rgba(255,255,255,0.6)';
                            }}
                        >
                            <Ban style={{ width: 12, height: 12 }} />
                        </button>
                    )}
                    <button
                        onClick={onMinimize}
                        style={{
                            width: 24, height: 24, borderRadius: 6,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', cursor: 'pointer',
                            background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                    >
                        <Minus style={{ width: 12, height: 12 }} />
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            width: 24, height: 24, borderRadius: 6,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', cursor: 'pointer',
                            background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'; e.currentTarget.style.color = '#fca5a5'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                    >
                        <X style={{ width: 12, height: 12 }} />
                    </button>
                </div>
            </div>

            {/* Messages Area — light admin style */}
            <div
                style={{
                    flex: 1, overflowY: 'auto', padding: '12px 12px',
                    display: 'flex', flexDirection: 'column', gap: 6,
                    background: 'rgba(241,245,249,0.5)',
                }}
                className="custom-scrollbar"
            >
                {messages.length === 0 && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', flex: 1, opacity: 0.35, gap: 6, paddingTop: 50,
                    }}>
                        <MessageSquare style={{ width: 28, height: 28, color: '#2563eb' }} />
                        <p style={{ fontSize: 11, color: '#64748b' }}>Özel mesajlaşma başladı.</p>
                    </div>
                )}
                {messageList}
                <div ref={messagesEndRef} />
            </div>

            {/* Emoji Picker */}
            {showEmoji && (
                <div style={{
                    borderTop: '1px solid rgba(148,163,184,0.15)',
                    background: 'rgba(241,245,249,0.95)',
                    padding: 6,
                    maxHeight: 120,
                    overflowY: 'auto',
                }}>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 1,
                    }}>
                        {EMOJI_LIST.map((emoji, i) => (
                            <button
                                key={i}
                                onClick={() => addEmoji(emoji)}
                                style={{
                                    width: 26, height: 26,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 14, background: 'transparent', border: 'none',
                                    borderRadius: 6, cursor: 'pointer', transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.08)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area — admin style */}
            <div style={{
                padding: '8px 10px',
                borderTop: '1px solid rgba(148,163,184,0.15)',
                background: 'rgba(226,232,240,0.6)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                    <button
                        onClick={() => setShowEmoji(s => !s)}
                        style={{
                            width: 30, height: 30, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', cursor: 'pointer', flexShrink: 0,
                            transition: 'all 0.2s',
                            background: showEmoji ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                            color: showEmoji ? '#2563eb' : '#94a3b8',
                        }}
                        onMouseEnter={e => {
                            if (!showEmoji) { e.currentTarget.style.background = 'rgba(37,99,235,0.06)'; e.currentTarget.style.color = '#64748b'; }
                        }}
                        onMouseLeave={e => {
                            if (!showEmoji) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }
                        }}
                    >
                        <Smile style={{ width: 16, height: 16 }} />
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        style={{
                            flex: 1,
                            background: 'rgba(255,255,255,0.85)',
                            border: '1px solid rgba(148,163,184,0.2)',
                            borderRadius: 999,
                            padding: '8px 36px 8px 14px',
                            fontSize: 12,
                            color: '#1e293b',
                            outline: 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                        placeholder="Mesajınızı yazın..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(37,99,235,0.35)';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.06)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(148,163,184,0.2)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                    <button
                        onClick={handleSend}
                        style={{
                            position: 'absolute',
                            right: 4, top: '50%', transform: 'translateY(-50%)',
                            width: 28, height: 28, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                            color: '#fff',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.35)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.25)';
                        }}
                    >
                        <Send style={{ width: 12, height: 12 }} />
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(
        <>
            <style>{`
                @keyframes dmNudgeShake {
                    0% { transform: translate(0, 0); }
                    25% { transform: translate(-4px, 3px); }
                    50% { transform: translate(3px, -3px); }
                    75% { transform: translate(-3px, -2px); }
                    100% { transform: translate(4px, 2px); }
                }
            `}</style>
            {content}
        </>,
        document.body
    );
}
