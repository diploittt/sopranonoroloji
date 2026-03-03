"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Minus, Send, MessageSquare, Smile, Ban, MessageCircle } from 'lucide-react';

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
    initialPosition = { x: 100, y: 100 }
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
    const messageList = useMemo(() => messages.map((msg) => (
        <div key={msg.id} className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'}`}>
            <div
                className="max-w-[80%] px-3.5 py-2 text-[13px] leading-relaxed"
                style={msg.isSelf ? {
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(123, 159, 239, 0.20) 100%)',
                    border: '1px solid rgba(6, 182, 212, 0.25)',
                    borderRadius: '16px 16px 4px 16px',
                    color: '#e2e8f0',
                } : {
                    background: 'rgba(30, 41, 59, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '16px 16px 16px 4px',
                    color: '#cbd5e1',
                }}
            >
                {msg.message}
                <div className={`text-[9px] mt-1 ${msg.isSelf ? 'text-right text-cyan-400/40' : 'text-left text-slate-500'}`}>
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
                width: 340,
                height: 440,
                zIndex: 9999,
                willChange: isDragging ? 'transform' : 'auto',
                borderRadius: 20,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(10, 14, 24, 0.96)',
                backdropFilter: 'blur(24px) saturate(150%)',
                WebkitBackdropFilter: 'blur(24px) saturate(150%)',
                border: '1px solid rgba(6, 182, 212, 0.20)',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(6, 182, 212, 0.08), 0 0 40px rgba(6, 182, 212, 0.06)',
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Header */}
            <div
                className="dm-header-drag"
                style={{
                    height: 52,
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(123, 159, 239, 0.10) 100%)',
                    borderBottom: '1px solid rgba(6, 182, 212, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 14px',
                    cursor: 'move',
                    userSelect: 'none',
                    flexShrink: 0,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(123, 159, 239, 0.20))',
                        border: '1px solid rgba(6, 182, 212, 0.30)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <MessageCircle style={{ width: 16, height: 16, color: '#67e8f9' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.2 }}>{targetUsername}</div>
                        <div style={{ fontSize: 10, color: 'rgba(6, 182, 212, 0.7)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22d3ee', display: 'inline-block', boxShadow: '0 0 6px rgba(34, 211, 238, 0.5)' }}></span>
                            Özel Mesaj
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {onIgnore && (
                        <button
                            onClick={onIgnore}
                            style={{
                                width: 28, height: 28, borderRadius: 8,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: 'none', cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: isIgnored ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                                color: isIgnored ? '#f87171' : '#64748b',
                            }}
                            title={isIgnored ? 'Yoksayma Kaldır' : 'Yoksay'}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = isIgnored ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.08)';
                                e.currentTarget.style.color = isIgnored ? '#fca5a5' : '#e2e8f0';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = isIgnored ? 'rgba(239, 68, 68, 0.15)' : 'transparent';
                                e.currentTarget.style.color = isIgnored ? '#f87171' : '#64748b';
                            }}
                        >
                            <Ban style={{ width: 14, height: 14 }} />
                        </button>
                    )}
                    <button
                        onClick={onMinimize}
                        style={{
                            width: 28, height: 28, borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', cursor: 'pointer',
                            background: 'transparent', color: '#64748b', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e2e8f0'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                    >
                        <Minus style={{ width: 14, height: 14 }} />
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            width: 28, height: 28, borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', cursor: 'pointer',
                            background: 'transparent', color: '#64748b', transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.color = '#f87171'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                    >
                        <X style={{ width: 14, height: 14 }} />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div
                style={{
                    flex: 1, overflowY: 'auto', padding: '16px 14px',
                    display: 'flex', flexDirection: 'column', gap: 8,
                    background: 'rgba(4, 8, 16, 0.4)',
                }}
                className="custom-scrollbar"
            >
                {messages.length === 0 && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', flex: 1, opacity: 0.3, gap: 8, paddingTop: 60,
                    }}>
                        <MessageSquare style={{ width: 36, height: 36, color: '#06b6d4' }} />
                        <p style={{ fontSize: 12, color: '#94a3b8' }}>Özel mesajlaşma başladı.</p>
                    </div>
                )}
                {messageList}
                <div ref={messagesEndRef} />
            </div>

            {/* Emoji Picker */}
            {showEmoji && (
                <div style={{
                    borderTop: '1px solid rgba(6, 182, 212, 0.10)',
                    background: 'rgba(10, 14, 24, 0.98)',
                    padding: 8,
                    maxHeight: 140,
                    overflowY: 'auto',
                }}>
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2,
                    }}>
                        {EMOJI_LIST.map((emoji, i) => (
                            <button
                                key={i}
                                onClick={() => addEmoji(emoji)}
                                style={{
                                    width: 28, height: 28,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 16, background: 'transparent', border: 'none',
                                    borderRadius: 6, cursor: 'pointer', transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div style={{
                padding: '10px 12px',
                borderTop: '1px solid rgba(6, 182, 212, 0.10)',
                background: 'rgba(10, 14, 24, 0.6)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                    <button
                        onClick={() => setShowEmoji(s => !s)}
                        style={{
                            width: 32, height: 32, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', cursor: 'pointer', flexShrink: 0,
                            transition: 'all 0.2s',
                            background: showEmoji ? 'rgba(6, 182, 212, 0.20)' : 'transparent',
                            color: showEmoji ? '#22d3ee' : '#64748b',
                        }}
                        onMouseEnter={e => {
                            if (!showEmoji) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }
                        }}
                        onMouseLeave={e => {
                            if (!showEmoji) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }
                        }}
                    >
                        <Smile style={{ width: 18, height: 18 }} />
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        style={{
                            flex: 1,
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(6, 182, 212, 0.15)',
                            borderRadius: 999,
                            padding: '9px 40px 9px 16px',
                            fontSize: 13,
                            color: '#e2e8f0',
                            outline: 'none',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                        placeholder="Mesajınızı yazın..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.40)';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.08)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.15)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                    <button
                        onClick={handleSend}
                        style={{
                            position: 'absolute',
                            right: 4, top: '50%', transform: 'translateY(-50%)',
                            width: 30, height: 30, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                            color: '#fff',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 8px rgba(6, 182, 212, 0.25)',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(6, 182, 212, 0.35)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(6, 182, 212, 0.25)';
                        }}
                    >
                        <Send style={{ width: 13, height: 13 }} />
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
