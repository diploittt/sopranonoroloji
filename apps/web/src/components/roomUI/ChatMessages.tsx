"use client";

import { Message, User } from '@/types';

import { Role, ROLE_LABELS } from '@/common/roles';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRoomRealtime } from '@/hooks/useRoomRealtime';
import { AnchorPopover } from '@/components/ui/AnchorPopover';
import { useTranslation } from '@/i18n/LanguageProvider';

// ─── Chat Text Settings from localStorage ─────────
function getChatTextSettings() {
    try {
        const raw = localStorage.getItem('soprano_chat_text_settings');
        if (raw) return JSON.parse(raw);
    } catch { }
    return { fontSize: 13, fontWeight: '400', textColor: 'rgba(255,255,255,0.9)' };
}

interface ChatMessagesProps {
    room: ReturnType<typeof useRoomRealtime>;
    messages: Message[];
    currentUser: User | null;
    onContextMenu?: (e: React.MouseEvent) => void;
    ignoredUsers?: Set<string>;
    roomName?: string;
}

// YouTube role permission defaults
const YT_DEFAULT_ROLE_PERMS: Record<string, boolean> = {
    guest: false, member: true, vip: true, operator: true, moderator: true, admin: true, super_admin: true, superadmin: true, owner: true, godmaster: true,
};

// === Emoji-only mesaj mı? ===
function isEmojiOnly(text: string): boolean {
    const stripped = text.replace(/\s/g, '');
    if (!stripped) return false;
    const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji}\u200D\p{Emoji})+$/u;
    return emojiRegex.test(stripped) && stripped.length <= 24;
}

// === Sticker mesajı mı? ([sticker] prefix) ===
const STICKER_PREFIX = '[sticker]';
function isSticker(text: string): boolean {
    return text.startsWith(STICKER_PREFIX);
}
function getStickerContent(text: string): string {
    return text.slice(STICKER_PREFIX.length);
}

// === GIF URL mi? ===
function isGifUrl(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.includes(' ') || trimmed.includes('\n')) return false;
    try {
        const url = new URL(trimmed);
        if (url.hostname.includes('giphy.com') ||
            url.hostname.includes('tenor.com') ||
            url.hostname.includes('media.giphy.com') ||
            url.pathname.endsWith('.gif') ||
            url.pathname.includes('/media/')) {
            return true;
        }
    } catch {
        return false;
    }
    return false;
}

// === YouTube URL mi? ===
function getYouTubeVideoId(text: string): string | null {
    const trimmed = text.trim();
    if (trimmed.includes(' ') || trimmed.includes('\n')) return null;
    try {
        const url = new URL(trimmed);
        // youtube.com/watch?v=ID
        if ((url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com' || url.hostname === 'm.youtube.com') && url.pathname === '/watch') {
            return url.searchParams.get('v');
        }
        // youtu.be/ID
        if (url.hostname === 'youtu.be') {
            return url.pathname.slice(1) || null;
        }
        // youtube.com/shorts/ID
        if ((url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') && url.pathname.startsWith('/shorts/')) {
            return url.pathname.split('/')[2] || null;
        }
        // youtube.com/embed/ID
        if ((url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') && url.pathname.startsWith('/embed/')) {
            return url.pathname.split('/')[2] || null;
        }
    } catch {
        return null;
    }
    return null;
}

export function ChatMessages({ room, messages, currentUser, onContextMenu, ignoredUsers, roomName }: ChatMessagesProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { t, lang } = useTranslation();

    // ── Chat Text Settings ──
    const [chatTextSettings, setChatTextSettings] = useState(getChatTextSettings);
    useEffect(() => {
        const handler = () => setChatTextSettings(getChatTextSettings());
        window.addEventListener('chatTextSettingsChanged', handler);
        return () => window.removeEventListener('chatTextSettingsChanged', handler);
    }, []);

    // ── Emoji Reaction State ──
    const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
    const [openReactionMsgId, setOpenReactionMsgId] = useState<string | null>(null);
    const reactionPickerRef = useRef<HTMLDivElement>(null);

    // ── WhatsApp-style tap animation ──
    const [tappedMsgId, setTappedMsgId] = useState<string | null>(null);
    const handleBubbleTap = (msgId?: string) => {
        if (!msgId) return;
        setTappedMsgId(msgId);
        setTimeout(() => setTappedMsgId(null), 300);
    };

    // Click outside to close reaction picker
    useEffect(() => {
        if (!openReactionMsgId) return;
        const handler = (e: MouseEvent) => {
            if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target as Node)) {
                setOpenReactionMsgId(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [openReactionMsgId]);

    // Session start time — compute only on client to avoid hydration mismatch
    const [sessionTime, setSessionTime] = useState('');
    useEffect(() => {
        setSessionTime(new Date().toLocaleTimeString(
            lang === 'de' ? 'de-DE' : lang === 'en' ? 'en-US' : 'tr-TR',
            { hour: '2-digit', minute: '2-digit' }
        ));
    }, [lang]);

    // Toast Popover State
    const [toastState, setToastState] = useState<{ isOpen: boolean, anchorEl: HTMLElement | null, message: string, type: 'info' | 'error' | 'success' }>({
        isOpen: false,
        anchorEl: null,
        message: '',
        type: 'info'
    });
    const toastAnchorRef = useRef<HTMLElement | null>(null);
    useEffect(() => { toastAnchorRef.current = toastState.anchorEl; }, [toastState.anchorEl]);

    const showToastAt = (anchorEl: HTMLElement | null, msg: string, type: 'info' | 'error' | 'success' = 'info') => {
        setToastState({ isOpen: true, anchorEl, message: msg, type });
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // === Avatar URL — GIF/3D/Animated modlarda avatar gösterme ===
    const getAvatarUrl = (msgOrUsername: Message | string): string | null => {
        const resolveAvatar = (avatar?: string, username?: string) => {
            if (!avatar) return `https://api.dicebear.com/9.x/avataaars/svg?seed=${username || 'guest'}`;
            // GIF/3D/Animated mod › avatar gösterme
            if (avatar.startsWith('3d:') || avatar.startsWith('animated:') || avatar.toLowerCase().endsWith('.gif') || avatar.startsWith('data:image/gif')) {
                return null; // Avatar gizle
            }
            return avatar;
        };

        if (typeof msgOrUsername !== 'string') {
            // Message object
            const user = room.state.users.find(u => u.username === msgOrUsername.sender);
            const userRole = user?.role?.toLowerCase();

            // GodMaster special mode › no avatar
            if (userRole === 'godmaster') {
                const avatar = user?.avatar || msgOrUsername.avatar;
                const result = resolveAvatar(avatar, msgOrUsername.sender);
                if (result === null) return null;
                return result;
            }

            if (msgOrUsername.avatar) return msgOrUsername.avatar;
            if (user?.avatar) return user.avatar;
            return `https://api.dicebear.com/9.x/avataaars/svg?seed=${msgOrUsername.sender}`;
        }

        // Username string
        const user = room.state.users.find(u => u.username === msgOrUsername);
        if (user?.role?.toLowerCase() === 'godmaster') {
            const result = resolveAvatar(user.avatar, msgOrUsername);
            if (result === null) return null;
            return result;
        }
        if (user?.avatar) return user.avatar;
        return `https://api.dicebear.com/9.x/avataaars/svg?seed=${msgOrUsername}`;
    };

    // Format time
    const formatTime = (timestamp?: number | string) => {
        if (!timestamp) return '';
        return new Date(timestamp).toLocaleTimeString(
            lang === 'de' ? 'de-DE' : lang === 'en' ? 'en-US' : 'tr-TR',
            { hour: '2-digit', minute: '2-digit' }
        );
    };

    return (
        <div
            className="chat-messages-container chat-area flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-1 custom-scrollbar flex flex-col items-center"
            data-chat-messages
            ref={scrollRef}
            onContextMenu={onContextMenu}
        >
            {/* TOAST POPOVER */}
            <AnchorPopover
                isOpen={toastState.isOpen}
                targetRef={toastAnchorRef}
                onClose={() => setToastState(prev => ({ ...prev, isOpen: false }))}
                variant="toast"
                toastType={toastState.type}
                message={toastState.message}
            />

            <div className="w-full max-w-3xl space-y-1">
                {/* Session start badge */}
                <div className="flex justify-center mb-6">
                    <span className="text-[10px] font-medium px-5 py-1.5 rounded-full backdrop-blur-sm" style={{ color: 'rgba(123, 159, 239, 0.7)', background: 'rgba(123, 159, 239, 0.06)', border: '1px solid rgba(123, 159, 239, 0.15)' }}>
                        {roomName ? `${roomName} odasına hoş geldiniz` : t.chatStart} • {t.today} {sessionTime}
                    </span>
                </div>

                {messages
                    .filter(msg => {
                        // Yoksayılan kullanıcıların mesajlarını filtrele
                        if (!ignoredUsers || ignoredUsers.size === 0) return true;
                        if (msg.type === 'system') return true;
                        // sender display name'den userId'ye çevir
                        const senderUser = room.state.users.find(u => u.username === msg.sender || u.displayName === msg.sender);
                        if (senderUser && senderUser.userId && ignoredUsers.has(senderUser.userId)) return false;
                        return true;
                    })
                    .map((msg, i, filteredMsgs) => {
                        const isMe = currentUser && (msg.sender === currentUser.username || msg.sender === currentUser.displayName);
                        const avatarUrl = getAvatarUrl(msg);
                        const stickerMsg = msg.type !== 'system' && isSticker(msg.message);
                        const displayMessage = stickerMsg ? getStickerContent(msg.message) : msg.message;
                        const emojiOnly = !stickerMsg && msg.type !== 'system' && isEmojiOnly(msg.message);
                        const gifMessage = !stickerMsg && msg.type !== 'system' && isGifUrl(msg.message);
                        const youtubeId = !stickerMsg && msg.type !== 'system' ? getYouTubeVideoId(msg.message) : null;

                        // YouTube role permission check
                        const isYoutubeAllowed = (() => {
                            if (!youtubeId) return false;
                            const roleLower = (currentUser?.role || 'guest').toLowerCase();
                            const ss = (room as any).state?.systemSettings;
                            const rolePerms = ss?.rolePermissions?.[roleLower];
                            const ytPerm = rolePerms?.youtube ?? YT_DEFAULT_ROLE_PERMS[roleLower] ?? false;
                            // Individual permission override
                            if (currentUser?.permissions?.['room.youtube'] === true) return true;
                            return ytPerm;
                        })();

                        // Her mesajda avatar ve isim göster (artık gruplama yok)
                        const showHeader = msg.type !== 'system';

                        return (
                            <div key={i} className={`animate-in slide-in-from-bottom-1 duration-300 fade-in w-full flex flex-col ${isMe ? 'items-end' : 'items-start'} ${i > 0 ? 'mt-3' : 'mt-0.5'}`}>
                                {/* ═══ Gift Message Card — always render as card regardless of msg.type ═══ */}
                                {(msg.message?.startsWith('[gift]') || msg.message?.trimStart().startsWith('[gift]')) ? (() => {
                                    try {
                                        const raw = msg.message!;
                                        const jsonStart = raw.indexOf('{');
                                        if (jsonStart === -1) throw new Error('No JSON');
                                        const giftData = JSON.parse(raw.slice(jsonStart));
                                        const catColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
                                            basic: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', text: '#4ade80', glow: '0 0 12px rgba(34,197,94,0.15)' },
                                            premium: { bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.3)', text: '#c084fc', glow: '0 0 16px rgba(168,85,247,0.2)' },
                                            legendary: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', text: '#fbbf24', glow: '0 0 20px rgba(245,158,11,0.25)' },
                                        };
                                        const cat = catColors[giftData.giftCategory] || catColors.basic;
                                        return (
                                            <div className="flex justify-center my-3 w-full" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 10,
                                                    padding: '8px 16px',
                                                    borderRadius: 14,
                                                    background: cat.bg,
                                                    border: `1px solid ${cat.border}`,
                                                    boxShadow: cat.glow,
                                                }}>
                                                    <span style={{ fontSize: 24, lineHeight: 1 }}>{giftData.giftEmoji}</span>
                                                    <div>
                                                        <div style={{ fontSize: 12, fontWeight: 700, color: cat.text, lineHeight: 1.3 }}>
                                                            {giftData.senderName}
                                                            <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 4px', fontSize: 10 }}>→</span>
                                                            {giftData.receiverName}
                                                        </div>
                                                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
                                                            {giftData.giftName}
                                                            {giftData.quantity > 1 && <span style={{ color: cat.text }}> x{giftData.quantity}</span>}
                                                            <span style={{ marginLeft: 6, color: 'rgba(255,255,255,0.35)' }}>🪙 {giftData.totalCost}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } catch {
                                        return (
                                            <div className="flex justify-center my-3">
                                                <span className="text-[10px] font-medium text-gray-400/70 px-4 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
                                                    🎁 Hediye gönderildi
                                                </span>
                                            </div>
                                        );
                                    }
                                })() : msg.type === 'system' ? (
                                    <div className="flex justify-center my-3">
                                        <span className="text-[10px] font-medium text-gray-400/70 px-4 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
                                            {msg.message}
                                        </span>
                                    </div>
                                ) : (
                                    <div className={`flex gap-2.5 group ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {/* Avatar — sadece ilk mesajda ve avatar varsa göster */}
                                        <div className="w-8 flex-shrink-0">
                                            {showHeader && avatarUrl ? (
                                                <img
                                                    src={avatarUrl}
                                                    className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                                                />
                                            ) : showHeader && !avatarUrl ? (
                                                /* GodMaster GIF/3D mode — küçük rol emoji placeholder */
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-amber-800/20 flex items-center justify-center text-sm ring-1 ring-fuchsia-500/30">
                                                    ??
                                                </div>
                                            ) : null}
                                        </div>

                                        <div
                                            className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}
                                            style={{ position: 'relative', paddingLeft: isMe ? 32 : 0, paddingRight: isMe ? 0 : 32 }}
                                            onMouseEnter={() => msg.type !== 'system' && setHoveredMsgId(msg.id ?? null)}
                                            onMouseLeave={() => { if (openReactionMsgId !== msg.id) setHoveredMsgId(null); }}
                                        >
                                            {/* Sender name + time — sadece ilk mesajda */}
                                            {showHeader && (
                                                <div className={`flex items-center gap-2 mb-0.5 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                    <span
                                                        className="message-username font-semibold text-xs"
                                                        style={{ color: msg.nameColor || '#9ca3af' }}
                                                    >
                                                        {msg.sender}
                                                    </span>
                                                    <span className="text-[9px] text-gray-600">
                                                        {formatTime(msg.timestamp)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Mesaj balonu */}
                                            {gifMessage ? (
                                                /* GIF mesajı › balon içinde resim */
                                                <div
                                                    className={`message-bubble-interactive rounded-2xl overflow-hidden ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'} max-w-[280px] border border-white/[0.08] shadow-lg ${tappedMsgId === msg.id ? 'message-tap-animate' : ''}`}
                                                    onClick={() => handleBubbleTap(msg.id)}
                                                >
                                                    <img
                                                        src={msg.message.trim()}
                                                        alt="GIF"
                                                        className="w-full h-auto block"
                                                        loading="lazy"
                                                        style={{ maxHeight: 260, objectFit: 'contain', background: '#000' }}
                                                    />
                                                </div>
                                            ) : isYoutubeAllowed ? (
                                                /* YouTube embed */
                                                <div className={`rounded-2xl overflow-hidden ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'} border border-white/[0.08] shadow-lg`}
                                                    style={{ width: 320, maxWidth: '100%' }}>
                                                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                                                        <iframe
                                                            src={`https://www.youtube.com/embed/${youtubeId}`}
                                                            title="YouTube"
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                                        />
                                                    </div>
                                                    <a href={msg.message.trim()} target="_blank" rel="noopener noreferrer"
                                                        className="block px-3 py-1.5 text-[10px] text-gray-400 hover:text-[#7b9fef] truncate transition-colors"
                                                        style={{ background: 'rgba(0,0,0,0.3)' }}>
                                                        🎬 {msg.message.trim()}
                                                    </a>
                                                </div>
                                            ) : stickerMsg ? (
                                                /* Sticker › büyük emoji (text-4xl) */
                                                <div
                                                    className={`message-bubble-interactive text-4xl leading-snug py-1 px-1 select-text ${isMe ? 'text-right' : 'text-left'} ${tappedMsgId === msg.id ? 'message-tap-animate' : ''}`}
                                                    onClick={() => handleBubbleTap(msg.id)}
                                                >
                                                    {displayMessage}
                                                </div>
                                            ) : emojiOnly ? (
                                                /* Normal emoji › küçük (text-lg) */
                                                <div
                                                    className={`message-bubble-interactive text-lg leading-snug py-1 px-1 select-text ${isMe ? 'text-right' : 'text-left'} ${tappedMsgId === msg.id ? 'message-tap-animate' : ''}`}
                                                    onClick={() => handleBubbleTap(msg.id)}
                                                >
                                                    {msg.message}
                                                </div>
                                            ) : (
                                                <div className={`message-bubble message-bubble-interactive
                                                px-3.5 py-2 leading-relaxed select-text
                                                transition-all duration-200 break-all
                                                ${isMe
                                                        ? 'message-mine bg-[#1a1f2e]/80 rounded-2xl rounded-tr-sm shadow-md border border-white/[0.08]'
                                                        : 'bg-[#1a1f2e]/60 rounded-2xl rounded-tl-sm hover:bg-[#1a1f2e]/70 border border-white/[0.06]'
                                                    }
                                                ${tappedMsgId === msg.id ? 'message-tap-animate' : ''}
                                            `}
                                                    style={{
                                                        overflowWrap: 'anywhere',
                                                        wordBreak: 'break-word',
                                                        fontSize: chatTextSettings.fontSize,
                                                        fontWeight: Number(chatTextSettings.fontWeight),
                                                        color: chatTextSettings.textColor,
                                                    }}
                                                    onClick={() => handleBubbleTap(msg.id)}>
                                                    {msg.message}
                                                </div>
                                            )}

                                            {/* ── Emoji Reaction Trigger (smiley icon) ── */}
                                            {(hoveredMsgId === msg.id || openReactionMsgId === msg.id) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenReactionMsgId(prev => prev === msg.id ? null : msg.id ?? null);
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 22,
                                                        [isMe ? 'left' : 'right']: 0,
                                                        width: 24, height: 24,
                                                        background: 'rgba(255,255,255,0.08)',
                                                        border: '1px solid rgba(255,255,255,0.12)',
                                                        borderRadius: '50%',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        fontSize: 13,
                                                        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                                                        zIndex: 15,
                                                        opacity: openReactionMsgId === msg.id ? 1 : 0.7,
                                                        transform: openReactionMsgId === msg.id ? 'scale(1.1)' : 'scale(1)',
                                                        boxShadow: openReactionMsgId === msg.id ? '0 0 8px rgba(123,159,239,0.3)' : 'none',
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.opacity = '1';
                                                        e.currentTarget.style.background = 'rgba(123,159,239,0.15)';
                                                        e.currentTarget.style.borderColor = 'rgba(123,159,239,0.3)';
                                                        e.currentTarget.style.transform = 'scale(1.15)';
                                                    }}
                                                    onMouseLeave={e => {
                                                        if (openReactionMsgId !== msg.id) {
                                                            e.currentTarget.style.opacity = '0.7';
                                                            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                                                            e.currentTarget.style.transform = 'scale(1)';
                                                        }
                                                    }}
                                                >
                                                    😊
                                                </button>
                                            )}

                                            {/* ── Emoji Reaction Picker (click to open) ── */}
                                            {openReactionMsgId === msg.id && (
                                                <div
                                                    ref={reactionPickerRef}
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: '100%',
                                                        [isMe ? 'right' : 'left']: 0,
                                                        background: 'linear-gradient(135deg, rgba(15, 20, 35, 0.97) 0%, rgba(20, 28, 50, 0.97) 100%)',
                                                        backdropFilter: 'blur(20px) saturate(150%)',
                                                        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                                                        border: '1px solid rgba(123, 159, 239, 0.15)',
                                                        borderRadius: 16,
                                                        padding: '6px 8px',
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        gap: 2,
                                                        zIndex: 30,
                                                        whiteSpace: 'nowrap',
                                                        marginBottom: 6,
                                                        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(123,159,239,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
                                                        animation: 'reactionPickerIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
                                                    }}
                                                >
                                                    {['👍', '❤️', '😂', '😮', '😢', '🔥'].map((emoji, i) => {
                                                        const myName = currentUser?.displayName || currentUser?.username || '';
                                                        const alreadyReacted = msg.reactions?.[emoji]?.includes(myName);
                                                        return (
                                                            <button key={emoji}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if ((room as any).socket && msg.id) {
                                                                        (room as any).socket.emit('chat:addReaction', { messageId: msg.id, emoji });
                                                                    }
                                                                    setOpenReactionMsgId(null);
                                                                    setHoveredMsgId(null);
                                                                }}
                                                                style={{
                                                                    background: alreadyReacted ? 'rgba(123,159,239,0.18)' : 'none',
                                                                    border: alreadyReacted ? '1px solid rgba(123,159,239,0.3)' : '1px solid transparent',
                                                                    cursor: 'pointer',
                                                                    fontSize: 20,
                                                                    padding: '4px 6px',
                                                                    borderRadius: 10,
                                                                    transition: 'all 0.18s cubic-bezier(0.4,0,0.2,1)',
                                                                    lineHeight: 1,
                                                                    animation: `reactionEmojiPop 0.3s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.04}s both`,
                                                                }}
                                                                onMouseEnter={e => {
                                                                    e.currentTarget.style.transform = 'scale(1.35) translateY(-3px)';
                                                                    e.currentTarget.style.background = 'rgba(123,159,239,0.15)';
                                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(123,159,239,0.2)';
                                                                }}
                                                                onMouseLeave={e => {
                                                                    e.currentTarget.style.transform = 'scale(1)';
                                                                    e.currentTarget.style.background = alreadyReacted ? 'rgba(123,159,239,0.18)' : 'none';
                                                                    e.currentTarget.style.boxShadow = 'none';
                                                                }}
                                                            >
                                                                {emoji}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* ── Reaction Badges ── */}
                                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                <div style={{
                                                    display: 'flex', flexWrap: 'wrap', gap: 4,
                                                    marginTop: 4,
                                                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                                                }}>
                                                    {Object.entries(msg.reactions).map(([emoji, users]) => {
                                                        const myName = currentUser?.displayName || currentUser?.username || '';
                                                        const iReacted = (users as string[]).includes(myName);
                                                        return (
                                                            <button key={emoji}
                                                                title={(users as string[]).join(', ')}
                                                                onClick={() => {
                                                                    if ((room as any).socket && msg.id) {
                                                                        (room as any).socket.emit('chat:addReaction', { messageId: msg.id, emoji });
                                                                    }
                                                                }}
                                                                style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                                    background: iReacted
                                                                        ? 'linear-gradient(135deg, rgba(123,159,239,0.18) 0%, rgba(123,159,239,0.10) 100%)'
                                                                        : 'rgba(255,255,255,0.04)',
                                                                    border: iReacted
                                                                        ? '1px solid rgba(123,159,239,0.35)'
                                                                        : '1px solid rgba(255,255,255,0.08)',
                                                                    borderRadius: 999, padding: '2px 8px 2px 5px',
                                                                    fontSize: 12, cursor: 'pointer',
                                                                    color: iReacted ? '#d4b896' : '#8b95a5',
                                                                    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                                                                    boxShadow: iReacted ? '0 0 8px rgba(123,159,239,0.1)' : 'none',
                                                                }}
                                                                onMouseEnter={e => {
                                                                    e.currentTarget.style.transform = 'scale(1.08)';
                                                                    e.currentTarget.style.background = iReacted
                                                                        ? 'linear-gradient(135deg, rgba(123,159,239,0.25) 0%, rgba(123,159,239,0.15) 100%)'
                                                                        : 'rgba(255,255,255,0.10)';
                                                                }}
                                                                onMouseLeave={e => {
                                                                    e.currentTarget.style.transform = 'scale(1)';
                                                                    e.currentTarget.style.background = iReacted
                                                                        ? 'linear-gradient(135deg, rgba(123,159,239,0.18) 0%, rgba(123,159,239,0.10) 100%)'
                                                                        : 'rgba(255,255,255,0.04)';
                                                                }}
                                                            >
                                                                <span style={{ fontSize: 14 }}>{emoji}</span>
                                                                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.02em' }}>{(users as string[]).length}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
            </div>
        </div >
    );
}
