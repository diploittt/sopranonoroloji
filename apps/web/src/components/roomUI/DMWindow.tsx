"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Send, Smile, Ban, VolumeX, Volume2 } from 'lucide-react';

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
    const windowRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    // Drag Logic
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.dm-header')) {
            setIsDragging(true);
            const rect = windowRef.current!.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    }, []);

    useEffect(() => {
        if (!isDragging) return;
        const handleMouseMove = (e: MouseEvent) => {
            setPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            });
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
        if (!inputText.trim() || isIgnored) return;
        onSendMessage(inputText);
        setInputText("");
    }, [inputText, onSendMessage, isIgnored]);

    const addEmoji = useCallback((emoji: string) => {
        setInputText(prev => prev + emoji);
        setShowEmoji(false);
        inputRef.current?.focus();
    }, []);

    // Memoize message list
    const messageList = useMemo(() => messages.map((msg) => (
        <div key={msg.id} className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-200`}>
            <div
                style={{
                    maxWidth: '82%',
                    padding: '10px 14px',
                    borderRadius: msg.isSelf ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    wordBreak: 'break-word',
                    ...(msg.isSelf
                        ? {
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#fff',
                            boxShadow: '0 2px 12px rgba(99, 102, 241, 0.3)',
                        }
                        : {
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: '#e2e8f0',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }),
                }}
            >
                {msg.message}
                <div style={{
                    fontSize: '10px',
                    marginTop: '4px',
                    opacity: 0.5,
                    textAlign: msg.isSelf ? 'right' : 'left',
                }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    )), [messages]);

    // First letter for avatar
    const avatarLetter = targetUsername.charAt(0).toUpperCase();

    return (
        <div
            ref={windowRef}
            style={{
                position: 'fixed',
                zIndex: 9000,
                left: position.x,
                top: position.y,
                width: '340px',
                height: '460px',
                willChange: isDragging ? 'transform' : 'auto',
                borderRadius: '20px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(180deg, rgba(15, 18, 30, 0.97) 0%, rgba(10, 13, 22, 0.98) 100%)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            }}
            onMouseDown={handleMouseDown}
        >
            {/* ═══ HEADER — Premium gradient with user info ═══ */}
            <div
                className="dm-header"
                style={{
                    padding: '14px 16px',
                    cursor: 'move',
                    userSelect: 'none',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)',
                    borderBottom: '1px solid rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}
            >
                {/* Avatar */}
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                }}>
                    {avatarLetter}
                </div>

                {/* Name + Status */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#e2e8f0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        {targetUsername}
                    </div>
                    <div style={{
                        fontSize: '11px',
                        color: isIgnored ? '#f87171' : '#4ade80',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}>
                        <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: isIgnored ? '#f87171' : '#4ade80',
                            boxShadow: isIgnored ? '0 0 6px rgba(248, 113, 113, 0.5)' : '0 0 6px rgba(74, 222, 128, 0.5)',
                        }} />
                        {isIgnored ? 'Yoksayılıyor' : 'Çevrimiçi'}
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {onIgnore && (
                        <button
                            onClick={onIgnore}
                            title={isIgnored ? 'Yoksaymayı Kaldır' : 'Özel Mesajları Yoksay'}
                            style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '10px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                background: isIgnored ? 'rgba(248, 113, 113, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                color: isIgnored ? '#f87171' : '#6b7280',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = isIgnored ? 'rgba(248, 113, 113, 0.25)' : 'rgba(255, 255, 255, 0.12)';
                                if (!isIgnored) e.currentTarget.style.color = '#f87171';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = isIgnored ? 'rgba(248, 113, 113, 0.15)' : 'rgba(255, 255, 255, 0.05)';
                                if (!isIgnored) e.currentTarget.style.color = '#6b7280';
                            }}
                        >
                            {isIgnored ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        title="Kapat"
                        style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '10px',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#6b7280',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.color = '#f87171'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#6b7280'; }}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* ═══ MESSAGES AREA ═══ */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
            }} className="custom-scrollbar">
                {messages.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        marginTop: '60px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px',
                    }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
                            border: '1px solid rgba(99, 102, 241, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                        }}>
                            💬
                        </div>
                        <div>
                            <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600, margin: 0 }}>
                                Özel sohbet başladı
                            </p>
                            <p style={{ fontSize: '11px', color: '#475569', margin: '4px 0 0' }}>
                                {targetUsername} ile mesajlaşıyorsunuz
                            </p>
                        </div>
                    </div>
                )}

                {/* Ignored overlay */}
                {isIgnored && messages.length > 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        background: 'rgba(248, 113, 113, 0.08)',
                        border: '1px solid rgba(248, 113, 113, 0.12)',
                        fontSize: '11px',
                        color: '#f87171',
                        fontWeight: 500,
                    }}>
                        🔇 Bu kullanıcının özel mesajları yoksayılıyor
                    </div>
                )}

                {messageList}
                <div ref={messagesEndRef} />
            </div>

            {/* ═══ EMOJI PICKER ═══ */}
            {showEmoji && (
                <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                    background: 'rgba(15, 18, 30, 0.95)',
                    padding: '10px',
                    maxHeight: '140px',
                    overflowY: 'auto',
                }} className="custom-scrollbar">
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(10, 1fr)',
                        gap: '2px',
                    }}>
                        {EMOJI_LIST.map((emoji, i) => (
                            <button
                                key={i}
                                onClick={() => addEmoji(emoji)}
                                style={{
                                    width: '30px',
                                    height: '30px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.transform = 'scale(1.2)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ INPUT AREA ═══ */}
            <div style={{
                padding: '12px 14px',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                background: 'rgba(10, 13, 22, 0.6)',
            }}>
                {isIgnored ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '10px',
                        fontSize: '12px',
                        color: '#64748b',
                        fontWeight: 500,
                    }}>
                        Yoksayma aktif — mesaj gönderilemez
                    </div>
                ) : (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: '14px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '4px 4px 4px 6px',
                        transition: 'border-color 0.2s',
                    }}>
                        <button
                            onClick={() => setShowEmoji(s => !s)}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '10px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                background: showEmoji ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                color: showEmoji ? '#818cf8' : '#64748b',
                                flexShrink: 0,
                            }}
                        >
                            <Smile className="w-4 h-4" />
                        </button>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Mesaj yazın..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#e2e8f0',
                                fontSize: '13px',
                                padding: '6px 4px',
                            }}
                        />
                        <button
                            onClick={handleSend}
                            style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '11px',
                                border: 'none',
                                cursor: inputText.trim() ? 'pointer' : 'default',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                background: inputText.trim()
                                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                                    : 'rgba(255, 255, 255, 0.05)',
                                color: inputText.trim() ? '#fff' : '#475569',
                                boxShadow: inputText.trim() ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
                                flexShrink: 0,
                            }}
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
