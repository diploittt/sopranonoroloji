"use client";

import { Hand, Video, Volume2, VolumeX, Smile, Sticker, Settings2, Power, SendHorizontal, Clapperboard, Mic, MicOff, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { AnchorPopover } from '@/components/ui/AnchorPopover';
import { EmojiPicker } from './EmojiPicker';
import { StickerPicker } from './StickerPicker';
import { GifPicker } from './GifPicker';
import { useTranslation } from '@/i18n/LanguageProvider';


export interface BottomToolbarProps {
    onSendMessage: (text: string) => void;
    onRequestMic: () => void;
    onReleaseMic: () => void;
    onJoinQueue: () => void;
    onLeaveQueue: () => void;
    onToggleCamera: () => void;
    onLeaveRoom: () => void;
    onToggleSettings: () => void;
    onToggleProfile?: () => void;
    onRegisterSettingsRef: (ref: React.RefObject<HTMLButtonElement | null>) => void;
    isCameraOn: boolean;
    isMicOn: boolean;
    currentSpeaker: { userId: string } | null;
    currentUser: any;
    queue: string[];

    // Remote Volume (Moved from Header)
    onToggleRemoteVolume?: () => void;
    isRemoteMuted?: boolean;
    remoteVolume?: number;

    // Error Handling
    lastError: { type: string; message: string; id: number } | null;
    onDismissError: () => void;

    // Chat Lock
    isChatLocked?: boolean;

    // Moderation State
    isCurrentUserMuted?: boolean;
    isCurrentUserGagged?: boolean;
    banInfo?: any;

    // Toolbar placeholder callbacks
    onEmojiClick?: () => void;
    onStickerClick?: () => void;
    onGifClick?: () => void;

    // Volume Slider
    onVolumeChange?: (volume: number) => void;

    // TV Volume
    tvVolume?: number;
    onTvVolumeChange?: (volume: number) => void;
    hasTvStream?: boolean;

    // System Settings (for guest restrictions)
    systemSettings?: any;

    // Meeting Room (Zoom mode)
    isMeetingRoom?: boolean;
    onToggleMeetingMic?: () => void;
}

export function BottomToolbar({
    onSendMessage,
    onRequestMic,
    onReleaseMic,
    onJoinQueue,
    onLeaveQueue,
    onToggleCamera,
    onLeaveRoom,
    onToggleSettings,
    onToggleProfile,
    onRegisterSettingsRef,
    isCameraOn,
    isMicOn,
    currentSpeaker,
    currentUser,
    queue,
    onToggleRemoteVolume,
    isRemoteMuted,
    remoteVolume,
    lastError,
    onDismissError,
    isChatLocked = false,
    isCurrentUserMuted = false,
    isCurrentUserGagged = false,
    onEmojiClick,
    onStickerClick,
    onGifClick,
    onVolumeChange,
    tvVolume = 0.7,
    onTvVolumeChange,
    hasTvStream = false,
    systemSettings,
    isMeetingRoom = false,
    onToggleMeetingMic,
}: BottomToolbarProps) {
    const [text, setText] = useState('');
    const isChatDisabled = isChatLocked || isCurrentUserGagged;
    const { t } = useTranslation();


    // ─── Animation (Sticker/GIF) restriction based on rolePermissions ───
    const isHasbihal = systemSettings?.theme === 'hasbihal-islamic';
    const isAnimationBlocked = (() => {
        // Bireysel yetki varsa bypass
        if (currentUser?.permissions?.['self.animation'] === true) return false;
        const roleLower = (currentUser?.role || 'guest').toLowerCase();
        const DEFAULT_ROLE_PERMS: Record<string, Record<string, boolean>> = {
            guest: { animation: false },
            member: { animation: true },
        };
        const rolePerms = systemSettings?.rolePermissions?.[roleLower];
        const defaults = DEFAULT_ROLE_PERMS[roleLower];
        const animPerm = rolePerms?.animation ?? defaults?.animation ?? true;
        return animPerm === false;
    })();

    // Refs
    const settingsBtnRef = useRef<HTMLButtonElement>(null);
    const exitBtnRef = useRef<HTMLButtonElement>(null);
    const micBtnRef = useRef<HTMLButtonElement>(null);
    const cameraBtnRef = useRef<HTMLButtonElement>(null);
    const volumeBtnRef = useRef<HTMLButtonElement>(null);
    const emojiBtnRef = useRef<HTMLButtonElement>(null);
    const stickerBtnRef = useRef<HTMLButtonElement>(null);
    const gifBtnRef = useRef<HTMLButtonElement>(null);

    // Anchor States
    const [placeholderPopover, setPlaceholderPopover] = useState<{
        isOpen: boolean;
        anchorRef: React.RefObject<HTMLElement | null> | null;
        message: string;
    }>({ isOpen: false, anchorRef: null, message: '' });

    const handlePlaceholderClick = (ref: React.RefObject<HTMLButtonElement | null>, message: string) => {
        setPlaceholderPopover({
            isOpen: true,
            anchorRef: ref,
            message
        });
        // Auto-close after 2s
        setTimeout(() => {
            setPlaceholderPopover(prev => ({ ...prev, isOpen: false }));
        }, 2000);
    };

    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [showGifPicker, setShowGifPicker] = useState(false);

    // Mutual exclusion: close all pickers except the one being opened
    const openPicker = (picker: 'emoji' | 'sticker' | 'gif') => {
        setShowEmojiPicker(picker === 'emoji' ? prev => !prev : false);
        setShowStickerPicker(picker === 'sticker' ? prev => !prev : false);
        setShowGifPicker(picker === 'gif' ? prev => !prev : false);
    };

    const localVolume = isRemoteMuted ? 0 : Math.round((remoteVolume ?? 1) * 100);
    const localTvVolume = Math.round((tvVolume ?? 0.7) * 100);

    useEffect(() => {
        if (settingsBtnRef.current) {
            onRegisterSettingsRef(settingsBtnRef);
        }
    }, [onRegisterSettingsRef]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || isChatDisabled) return;
        onSendMessage(text);
        setText('');
    };

    const isMeSpeaker = currentSpeaker?.userId === currentUser?.userId;
    const isInQueue = queue.includes(currentUser?.userId || '');

    return (
        <div className="bottom-toolbar pt-6 pb-5 px-4 bg-transparent border-t border-white/5 backdrop-blur-sm z-20 flex flex-col gap-1.5 min-h-[100px] mt-4">
            {/* Anchors */}
            <AnchorPopover
                targetRef={exitBtnRef}
                isOpen={showExitConfirm}
                onClose={() => setShowExitConfirm(false)}
                variant="confirm"
                title={t.leaveRoom}
                confirmText={t.yesLeave}
                cancelText={t.cancel}
                onConfirm={onLeaveRoom}
            >
                {t.leaveConfirm}
            </AnchorPopover>

            {/* Volume Slider Popover */}
            <AnchorPopover
                targetRef={volumeBtnRef}
                isOpen={showVolumeSlider}
                onClose={() => setShowVolumeSlider(false)}
                variant="panel"
                title={`🔊 ${t.volumeLevel}`}
            >
                <div className="w-52 p-2" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Speaker Volume */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>🎤 {t.speakerVolume}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: isRemoteMuted ? '#ef4444' : '#2563eb', fontFamily: 'monospace' }}>
                                {isRemoteMuted ? 'MUTE' : `${localVolume}%`}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                                onClick={() => { if (onToggleRemoteVolume) onToggleRemoteVolume(); }}
                                style={{
                                    width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0',
                                    background: isRemoteMuted ? '#fef2f2' : '#f0f7ff',
                                    color: isRemoteMuted ? '#ef4444' : '#2563eb',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                                title={isRemoteMuted ? t.unmute : t.mute}
                            >
                                {isRemoteMuted ? <VolumeX style={{ width: 14, height: 14 }} /> : <Volume2 style={{ width: 14, height: 14 }} />}
                            </button>
                            <input
                                type="range" min={0} max={100} value={localVolume}
                                onChange={(e) => {
                                    const val = Number(e.target.value) / 100;
                                    if (onVolumeChange) onVolumeChange(val);
                                    if (isRemoteMuted && val > 0 && onToggleRemoteVolume) onToggleRemoteVolume();
                                }}
                                style={{ flex: 1, height: 4, accentColor: '#2563eb', cursor: 'pointer' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                            {[0, 25, 50, 75, 100].map((val) => (
                                <button
                                    key={val}
                                    onClick={() => {
                                        const v = val / 100;
                                        if (onVolumeChange) onVolumeChange(v);
                                        if (isRemoteMuted && v > 0 && onToggleRemoteVolume) onToggleRemoteVolume();
                                    }}
                                    style={{
                                        flex: 1, padding: '3px 0', borderRadius: 4, fontSize: 9, fontWeight: 700,
                                        cursor: 'pointer', transition: 'all 0.15s',
                                        background: localVolume === val ? '#dbeafe' : '#f8fafc',
                                        color: localVolume === val ? '#2563eb' : '#64748b',
                                        border: localVolume === val ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                                    }}
                                >
                                    {val === 0 ? 'MUTE' : `${val}%`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* TV Volume */}
                    {hasTvStream && (
                        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>📺 {t.tvVolume}</span>
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#dc2626', fontFamily: 'monospace' }}>{localTvVolume}%</span>
                            </div>
                            <input
                                type="range" min={0} max={100} value={localTvVolume}
                                onChange={(e) => { if (onTvVolumeChange) onTvVolumeChange(Number(e.target.value) / 100); }}
                                style={{ width: '100%', height: 4, accentColor: '#dc2626', cursor: 'pointer' }}
                            />
                            <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
                                {[0, 25, 50, 75, 100].map((val) => (
                                    <button
                                        key={`tv-${val}`}
                                        onClick={() => { if (onTvVolumeChange) onTvVolumeChange(val / 100); }}
                                        style={{
                                            flex: 1, padding: '3px 0', borderRadius: 4, fontSize: 9, fontWeight: 700,
                                            cursor: 'pointer', transition: 'all 0.15s',
                                            background: localTvVolume === val ? '#fef2f2' : '#f8fafc',
                                            color: localTvVolume === val ? '#dc2626' : '#64748b',
                                            border: localTvVolume === val ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                                        }}
                                    >
                                        {val === 0 ? 'MUTE' : `${val}%`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </AnchorPopover >

            <AnchorPopover
                targetRef={micBtnRef} // Reusing mic ref for generic errors if needed or specific ones
                isOpen={!!lastError && (lastError.type === 'mic_denied' || lastError.type === 'camera_error')}
                onClose={onDismissError}
                variant="toast"
                toastType="error"
                message={lastError?.message}
            />

            {/* EMOJI PICKER POPOVER — Appends emoji to message input */}
            <AnchorPopover
                targetRef={emojiBtnRef}
                isOpen={showEmojiPicker}
                onClose={() => setShowEmojiPicker(false)}
                variant="panel"
                title={`${t.selectEmoji}`}
            >
                <EmojiPicker onEmojiSelect={(emoji) => {
                    setText(prev => prev + emoji);
                }} />
            </AnchorPopover>

            {/* STICKER PICKER POPOVER — Sends sticker emoji as message */}
            <AnchorPopover
                targetRef={stickerBtnRef}
                isOpen={showStickerPicker}
                onClose={() => setShowStickerPicker(false)}
                variant="panel"
                title={t.sendSticker}
            >
                <StickerPicker onStickerSelect={(stickerEmoji) => {
                    onSendMessage(`[sticker]${stickerEmoji}`);
                    setShowStickerPicker(false);
                }} />
            </AnchorPopover>

            {/* GIF PICKER POPOVER — Sends GIF URL as message */}
            <AnchorPopover
                targetRef={gifBtnRef}
                isOpen={showGifPicker}
                onClose={() => setShowGifPicker(false)}
                variant="panel"
                title={t.searchGif}
            >
                <GifPicker onGifSelect={(gifUrl) => {
                    onSendMessage(gifUrl);
                    setShowGifPicker(false);
                }} />
            </AnchorPopover>

            {/* Placeholder Popover (REMOVED - replaced by real pickers) */}
            {/* <AnchorPopover
                targetRef={placeholderPopover.anchorRef || emojiBtnRef}
                isOpen={placeholderPopover.isOpen}
                onClose={() => setPlaceholderPopover(prev => ({ ...prev, isOpen: false }))}
                variant="toast"
                toastType="info"
                message={placeholderPopover.message}
            /> */}

            {/* TOP ROW: ICONS */}
            <div className="w-full max-w-7xl mx-auto flex items-center justify-between">

                <div className="flex items-center gap-2 p-1 bg-white/[0.025] rounded-xl border border-white/5">
                    {/* Hand (Queue) OR Meeting Mic Toggle */}
                    {isMeetingRoom ? (
                        <button
                            onClick={() => onToggleMeetingMic?.()}
                            className={`relative group w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300
                                ${isCurrentUserMuted
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/50 cursor-not-allowed opacity-60'
                                    : isMicOn
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                        : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30'}
                            `}
                            title={isCurrentUserMuted ? t.youAreMuted : isMicOn ? t.turnOffMic : t.turnOnMic}
                        >
                            {isCurrentUserMuted ? (
                                <MicOff className="w-4 h-4" />
                            ) : isMicOn ? (
                                <Mic className="w-4 h-4" />
                            ) : (
                                <Mic className="w-4 h-4" />
                            )}
                            {isMicOn && !isCurrentUserMuted && (
                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                console.log('[BottomToolbar] Hand clicked. isInQueue:', isInQueue, 'isMeSpeaker:', isMeSpeaker);
                                if (isInQueue) onLeaveQueue();
                                else onJoinQueue();
                            }}
                            disabled={isMeSpeaker}
                            className={`relative group w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300
                                ${isInQueue
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                    : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30'}
                            `}
                            title={isInQueue ? t.leaveQueue : t.joinQueue}
                        >
                            <Hand className={`w-4 h-4 transition-transform group-hover:scale-110`} />
                            {isInQueue && (
                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                            )}
                            {queue.length > 0 && !isInQueue && (
                                <span className="absolute -top-2 -left-2 bg-[#1f2937] text-white text-[9px] font-bold rounded-md px-1.5 py-0.5 border border-white/10 shadow-lg">
                                    {queue.length}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Camera — only for CAMERA tenants */}
                    {systemSettings?.packageType === 'CAMERA' && (() => {
                        const isGuest = currentUser?.role === 'guest';
                        const cameraDisabled = isGuest && systemSettings?.guestCamera === false;
                        return (
                            <button
                                ref={cameraBtnRef}
                                onClick={() => {
                                    if (cameraDisabled) {
                                        handlePlaceholderClick(cameraBtnRef, t.guestCameraDisabled);
                                        return;
                                    }
                                    onToggleCamera();
                                }}
                                className={`relative group w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300
                                    ${cameraDisabled
                                        ? 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed opacity-50'
                                        : isCameraOn
                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                            : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30'}
                                `}
                                title={cameraDisabled ? t.guestCameraDisabled : t.camera}
                            >
                                <Video className="w-4 h-4 transition-transform group-hover:scale-110" />
                                {isCameraOn && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-400 rounded-full"></span>}
                            </button>
                        );
                    })()}

                    {/* Volume (Remote Audio) */}
                    <button
                        ref={volumeBtnRef}
                        onClick={() => setShowVolumeSlider(prev => !prev)}
                        className={`relative group w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300
                            ${isRemoteMuted
                                ? 'bg-red-500/20 text-red-500 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-[#7b9fef]/10 hover:text-[#7b9fef] hover:border-[#7b9fef]/30'}
                        `}
                        title={t.volumeSettings}
                    >
                        {isRemoteMuted
                            ? <VolumeX className="w-4 h-4 transition-transform group-hover:scale-110" />
                            : <Volume2 className="w-4 h-4 transition-transform group-hover:scale-110" />
                        }
                    </button>

                    <div className="w-px h-6 bg-white/10 mx-2"></div>

                    {/* Fun Icons */}
                    {/* Fun Icons */}
                    <button
                        ref={emojiBtnRef}
                        className={`relative group w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300
                            ${showEmojiPicker
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                : 'bg-white/5 border-white/5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/30'}
                        `}
                        title="Emoji"
                        onClick={() => openPicker('emoji')}
                    >
                        <Smile className="w-4 h-4 transition-transform group-hover:rotate-12 group-hover:scale-110" />
                    </button>
                    <button
                        ref={stickerBtnRef}
                        className={`relative group w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300
                            ${isAnimationBlocked
                                ? 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed opacity-50'
                                : showStickerPicker
                                    ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50'
                                    : 'bg-white/5 border-white/5 text-gray-400 hover:text-pink-400 hover:bg-pink-500/10 hover:border-pink-500/30'}
                        `}
                        title={isAnimationBlocked ? 'Animasyonlar bu rol için kapalı' : 'Sticker'}
                        onClick={() => {
                            if (isAnimationBlocked) {
                                handlePlaceholderClick(stickerBtnRef, 'Animasyonlar bu rol için kapalı');
                                return;
                            }
                            openPicker('sticker');
                        }}
                    >
                        <Sticker className="w-4 h-4 transition-transform group-hover:-rotate-12 group-hover:scale-110" />
                    </button>
                    <button
                        ref={gifBtnRef}
                        className={`relative group w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300
                            ${isAnimationBlocked
                                ? 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed opacity-50'
                                : showGifPicker
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                    : 'bg-white/5 border-white/5 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30'}
                        `}
                        title={isAnimationBlocked ? 'Animasyonlar bu rol için kapalı' : 'GIF'}
                        onClick={() => {
                            if (isAnimationBlocked) {
                                handlePlaceholderClick(gifBtnRef, 'Animasyonlar bu rol için kapalı');
                                return;
                            }
                            openPicker('gif');
                        }}
                    >
                        <Clapperboard className="w-4 h-4 transition-transform group-hover:scale-110" />
                    </button>
                </div>

                <div className="flex gap-2">

                    <button
                        ref={settingsBtnRef}
                        onClick={onToggleSettings}
                        className="relative group w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-[#7b9fef] hover:bg-[#7b9fef]/10 hover:border-[#7b9fef]/30 transition-all duration-300 shadow-lg"
                        title={t.settings}
                    >
                        <Settings2 className="w-4 h-4 transition-transform group-hover:rotate-90" />
                    </button>
                    <button
                        onClick={() => onToggleProfile?.()}
                        className="relative group w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all duration-300 shadow-lg"
                        title="Profilim"
                    >
                        <User className="w-4 h-4 transition-transform group-hover:scale-110" />
                    </button>
                    <button
                        ref={exitBtnRef}
                        onClick={() => setShowExitConfirm(true)}
                        className="relative group w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-red-500/60 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-300 shadow-lg hover:shadow-red-500/20"
                        title={t.exit}
                    >
                        <Power className="w-4 h-4 transition-transform group-hover:scale-110" />
                    </button>
                </div>

            </div>

            {/* BOTTOM ROW: INPUT & SEND */}
            <form onSubmit={handleSubmit} className="w-full max-w-7xl mx-auto h-9 flex gap-2">
                <div className="flex-1 relative group">
                    <div className="absolute -inset-0.5 rounded-xl" style={{ opacity: 0, pointerEvents: 'none' }}></div>
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        disabled={isChatDisabled}
                        placeholder={isCurrentUserGagged ? t.gagWarning : isChatLocked ? t.chatLocked : t.typeMessage}
                        className={`message-input w-full h-full bg-white/[0.03] text-gray-200 text-sm rounded-xl pl-6 focus:outline-none border ${isChatDisabled ? 'border-red-500/20 cursor-not-allowed text-gray-500' : 'border-white/10 focus:border-white/25'} relative z-10 placeholder:text-gray-600`}
                        style={{ transition: 'border-color 0.3s ease, box-shadow 0.3s ease' }}
                        onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(148,163,184,0.15), 0 0 16px rgba(148,163,184,0.08)'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.3)'; }}
                        onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = ''; }}
                    />
                </div>

                <button type="submit" disabled={isChatDisabled} className={`send-button h-full w-24 group transition-all duration-300 ${isChatDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{
                        borderRadius: 14,
                        background: isChatDisabled
                            ? 'rgba(255,255,255,0.03)'
                            : 'linear-gradient(180deg, #5a6070 0%, #3d4250 15%, #1e222e 50%, #282c3a 75%, #3a3f50 100%)',
                        border: 'none',
                        borderTop: isChatDisabled ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(120,130,150,0.35)',
                        borderBottom: isChatDisabled ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.3)',
                        boxShadow: isChatDisabled
                            ? 'none'
                            : '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.03)',
                        cursor: isChatDisabled ? 'not-allowed' : 'pointer',
                    }}
                >
                    <div className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
                        <span className="font-extrabold tracking-[0.15em] uppercase" style={isHasbihal ? { fontFamily: "'Aref Ruqaa', serif", color: '#022c22', fontSize: 11 } : { color: '#cbd5e1', fontSize: 11 }}>{isHasbihal ? 'GÖNDER' : t.send}</span>
                        <SendHorizontal className="w-4 h-4 group-hover:translate-x-1 transition-transform" style={{ color: '#94a3b8' }} />
                    </div>
                </button>
            </form>

        </div >
    );
}
