"use client";

import { Hand, Video, Volume2, VolumeX, Smile, Sticker, Settings2, Power, SendHorizontal, Clapperboard } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { AnchorPopover } from '@/components/ui/AnchorPopover';
import { EmojiPicker } from './EmojiPicker';
import { StickerPicker } from './StickerPicker';
import { GifPicker } from './GifPicker';
import { useTranslation } from '@/i18n/LanguageProvider';
import ThemeSwitcher from '@/components/room/ThemeSwitcher';
import { useCurrentTheme } from '@/hooks/useCurrentTheme';

export interface BottomToolbarProps {
    onSendMessage: (text: string) => void;
    onRequestMic: () => void;
    onReleaseMic: () => void;
    onJoinQueue: () => void;
    onLeaveQueue: () => void;
    onToggleCamera: () => void;
    onLeaveRoom: () => void;
    onToggleSettings: () => void;
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

    // Meeting Room (Discord mode)
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
    const currentTheme = useCurrentTheme();
    const isHasbihal = currentTheme === 'hasbihal-islamic';

    // ─── Animation (Sticker/GIF) restriction based on rolePermissions ───
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
        <div className="bottom-toolbar p-4 bg-[#0F1626]/60 border-t border-white/5 backdrop-blur-2xl z-20 flex flex-col gap-3">

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
                <div className="w-64 space-y-4 p-2">
                    {/* Header with Visualizer */}
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">🎤 Konuşmacı Sesi</span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    if (onToggleRemoteVolume) onToggleRemoteVolume();
                                }}
                                className={`p-2.5 rounded-xl transition-all duration-300 ${isRemoteMuted
                                    ? 'bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                                    : 'bg-[#7b9fef]/20 text-[#7b9fef] shadow-[0_0_15px_rgba(123,159,239,0.2)]'
                                    }`}
                                title={isRemoteMuted ? t.unmute : t.mute}
                            >
                                {isRemoteMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                            <div className="flex flex-col">
                                <span className={`text-xs font-bold tracking-widest ${isRemoteMuted ? 'text-red-400' : 'text-[#7b9fef]'}`}>
                                    {isRemoteMuted ? t.soundOff : t.soundOn}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono mt-0.5">
                                    {isRemoteMuted ? '--' : `%${localVolume}`}
                                </span>
                            </div>
                        </div>

                        {/* Mini Sound Wave Animation */}
                        {!isRemoteMuted && localVolume > 0 && (
                            <div className="flex items-end gap-1 h-6 px-2">
                                <div className="w-1 bg-[#7b9fef] rounded-full animate-[music-bar_1s_ease-in-out_infinite]" style={{ animationDelay: '0.0s' }}></div>
                                <div className="w-1 bg-[#a3bfff] rounded-full animate-[music-bar_1s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-1 bg-[#5a7fd4] rounded-full animate-[music-bar_1s_ease-in-out_infinite]" style={{ animationDelay: '0.4s' }}></div>
                                <div className="w-1 bg-[#7b9fef] rounded-full animate-[music-bar_1s_ease-in-out_infinite]" style={{ animationDelay: '0.1s' }}></div>
                            </div>
                        )}
                    </div>

                    {/* Gradient Slider */}
                    <div className="relative h-6 flex items-center group">
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={localVolume}
                            onChange={(e) => {
                                const val = Number(e.target.value) / 100;
                                if (onVolumeChange) onVolumeChange(val);
                                if (isRemoteMuted && val > 0 && onToggleRemoteVolume) onToggleRemoteVolume();
                            }}
                            className="w-full h-2 rounded-full appearance-none bg-[#1a1d26] cursor-pointer relative z-10
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#7b9fef]
                            [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(123,159,239,0.5)] [&::-webkit-slider-thumb]:transition-transform
                            [&::-webkit-slider-thumb]:hover:scale-125 focus:outline-none"
                        />
                        {/* Custom Track Fill */}
                        <div
                            className="absolute h-2 rounded-full bg-gradient-to-r from-[#5a7fd4] via-[#7b9fef] to-[#a3bfff] pointer-events-none transition-all duration-150 top-1/2 -translate-y-1/2"
                            style={{ width: `${localVolume}%` }}
                        ></div>
                    </div>

                    {/* Quick Select Buttons */}
                    <div className="flex justify-between gap-1 pt-1">
                        {[0, 25, 50, 75, 100].map((val) => (
                            <button
                                key={val}
                                onClick={() => {
                                    const v = val / 100;
                                    if (onVolumeChange) onVolumeChange(v);
                                    if (isRemoteMuted && v > 0 && onToggleRemoteVolume) onToggleRemoteVolume();
                                }}
                                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border
                                ${localVolume === val
                                        ? 'bg-[#7b9fef] text-[#070B14] border-[#7b9fef] shadow-[0_0_10px_rgba(123,159,239,0.4)]'
                                        : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                {val === 0 ? 'MUTE' : `${val}%`}
                            </button>
                        ))}
                    </div>

                    {/* ── TV Sesi ── */}
                    {hasTvStream && (
                        <>
                            <div className="w-full h-px bg-white/10 my-3" />
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">📺 TV Sesi</span>
                                <span className="text-[10px] text-gray-500 font-mono">%{localTvVolume}</span>
                            </div>

                            {/* TV Slider */}
                            <div className="relative h-6 flex items-center group">
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={localTvVolume}
                                    onChange={(e) => {
                                        const val = Number(e.target.value) / 100;
                                        if (onTvVolumeChange) onTvVolumeChange(val);
                                    }}
                                    className="w-full h-2 rounded-full appearance-none bg-[#1a1d26] cursor-pointer relative z-10
                                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-red-400
                                    [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(239,68,68,0.5)] [&::-webkit-slider-thumb]:transition-transform
                                    [&::-webkit-slider-thumb]:hover:scale-125 focus:outline-none"
                                />
                                <div
                                    className="absolute h-2 rounded-full bg-gradient-to-r from-red-600 via-red-400 to-orange-400 pointer-events-none transition-all duration-150 top-1/2 -translate-y-1/2"
                                    style={{ width: `${localTvVolume}%` }}
                                ></div>
                            </div>

                            {/* TV Quick Select */}
                            <div className="flex justify-between gap-1 pt-1">
                                {[0, 25, 50, 75, 100].map((val) => (
                                    <button
                                        key={`tv-${val}`}
                                        onClick={() => {
                                            if (onTvVolumeChange) onTvVolumeChange(val / 100);
                                        }}
                                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border
                                        ${localTvVolume === val
                                                ? 'bg-red-500 text-white border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                                                : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10 hover:text-white'
                                            }`}
                                    >
                                        {val === 0 ? 'MUTE' : `${val}%`}
                                    </button>
                                ))}
                            </div>
                        </>
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
            <div className="w-full max-w-5xl mx-auto flex items-center justify-between">

                <div className="flex items-center gap-3 p-2 bg-[#070B14]/80 rounded-2xl border border-white/5 shadow-xl">
                    {isMeetingRoom ? (
                        /* ─── Discord-style Mic Toggle (Meeting Room) ─── */
                        <button
                            ref={micBtnRef}
                            onClick={() => onToggleMeetingMic?.()}
                            className={`relative group w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                                ${isMicOn
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                                    : isCurrentUserMuted
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] cursor-not-allowed'
                                        : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30'}
                            `}
                            title={isMicOn ? 'Mikrofonu Kapat' : isCurrentUserMuted ? 'Susturuldunuz' : 'Mikrofonu Aç'}
                        >
                            {isMicOn ? (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                    <line x1="12" x2="12" y1="19" y2="22" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="2" x2="22" y1="2" y2="22" />
                                    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
                                    <path d="M5 10v2a7 7 0 0 0 12 5.66" />
                                    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
                                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
                                    <line x1="12" x2="12" y1="19" y2="22" />
                                </svg>
                            )}
                            {isMicOn && (
                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                </span>
                            )}
                        </button>
                    ) : (
                        /* ─── Hand/Queue Button (Stage Mode) ─── */
                        <button
                            onClick={() => {
                                console.log('[BottomToolbar] Hand clicked. isInQueue:', isInQueue, 'isMeSpeaker:', isMeSpeaker);
                                if (isInQueue) onLeaveQueue();
                                else onJoinQueue();
                            }}
                            disabled={isMeSpeaker}
                            className={`relative group w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                                ${isInQueue
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                    : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30'}
                            `}
                            title={isInQueue ? t.leaveQueue : t.joinQueue}
                        >
                            <Hand className={`w-5 h-5 transition-transform group-hover:scale-110`} />
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
                                className={`relative group w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                                    ${cameraDisabled
                                        ? 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed opacity-50'
                                        : isCameraOn
                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                                            : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30'}
                                `}
                                title={cameraDisabled ? t.guestCameraDisabled : t.camera}
                            >
                                <Video className="w-5 h-5 transition-transform group-hover:scale-110" />
                                {isCameraOn && <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-400 rounded-full"></span>}
                            </button>
                        );
                    })()}

                    {/* Volume (Remote Audio) */}
                    <button
                        ref={volumeBtnRef}
                        onClick={() => setShowVolumeSlider(prev => !prev)}
                        className={`relative group w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                            ${isRemoteMuted
                                ? 'bg-red-500/20 text-red-500 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-[#7b9fef]/10 hover:text-[#7b9fef] hover:border-[#7b9fef]/30'}
                        `}
                        title={t.volumeSettings}
                    >
                        {isRemoteMuted
                            ? <VolumeX className="w-5 h-5 transition-transform group-hover:scale-110" />
                            : <Volume2 className="w-5 h-5 transition-transform group-hover:scale-110" />
                        }
                    </button>

                    <div className="w-px h-6 bg-white/10 mx-2"></div>

                    {/* Fun Icons */}
                    {/* Fun Icons */}
                    <button
                        ref={emojiBtnRef}
                        className={`relative group w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                            ${showEmojiPicker
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                                : 'bg-white/5 border-white/5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 hover:border-yellow-500/30'}
                        `}
                        title="Emoji"
                        onClick={() => openPicker('emoji')}
                    >
                        <Smile className="w-5 h-5 transition-transform group-hover:rotate-12 group-hover:scale-110" />
                    </button>
                    <button
                        ref={stickerBtnRef}
                        className={`relative group w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
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
                        <Sticker className="w-5 h-5 transition-transform group-hover:-rotate-12 group-hover:scale-110" />
                    </button>
                    <button
                        ref={gifBtnRef}
                        className={`relative group w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
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
                        <Clapperboard className="w-5 h-5 transition-transform group-hover:scale-110" />
                    </button>
                </div>

                <div className="flex gap-3">
                    <ThemeSwitcher />
                    <button
                        ref={settingsBtnRef}
                        onClick={onToggleSettings}
                        className="relative group w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-400 hover:text-[#7b9fef] hover:bg-[#7b9fef]/10 hover:border-[#7b9fef]/30 transition-all duration-300 shadow-lg"
                        title={t.settings}
                    >
                        <Settings2 className="w-5 h-5 transition-transform group-hover:rotate-90" />
                    </button>
                    <button
                        ref={exitBtnRef}
                        onClick={() => setShowExitConfirm(true)}
                        className="relative group w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-red-500/60 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-300 shadow-lg hover:shadow-red-500/20"
                        title={t.exit}
                    >
                        <Power className="w-5 h-5 transition-transform group-hover:scale-110" />
                    </button>
                </div>

            </div>

            {/* BOTTOM ROW: INPUT & SEND */}
            <form onSubmit={handleSubmit} className="w-full max-w-5xl mx-auto h-14 flex gap-4">
                <div className="flex-1 relative group">
                    <div className={`absolute -inset-0.5 bg-gradient-to-r from-[#7b9fef]/20 to-[#5a7fd4]/20 rounded-xl blur opacity-0 ${!isChatDisabled && 'group-focus-within:opacity-100'} transition-opacity duration-500`}></div>
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        disabled={isChatDisabled}
                        placeholder={isCurrentUserGagged ? t.gagWarning : isChatLocked ? t.chatLocked : (isHasbihal ? 'Kelamınızı buraya yazınız...' : t.typeMessage)}
                        className={`message-input w-full h-full bg-[#070B14] text-gray-200 text-sm rounded-xl pl-6 focus:outline-none border ${isChatDisabled ? 'border-red-500/20 cursor-not-allowed text-gray-500' : 'border-white/10 focus:border-[#7b9fef]/40'} relative z-10 placeholder:text-gray-600`}
                    />
                </div>

                <button type="submit" disabled={isChatDisabled} className={`send-button h-full w-32 group rounded-xl transition-all duration-300 ${isChatDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_20px_rgba(123,159,239,0.25)]'}`}
                    style={{
                        background: isChatDisabled ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg, rgba(123,159,239,0.22) 0%, rgba(90,127,212,0.14) 50%, rgba(123,159,239,0.08) 100%)',
                        border: isChatDisabled ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(123,159,239,0.30)',
                        boxShadow: isChatDisabled ? 'none' : '0 2px 12px rgba(123,159,239,0.12), 0 0 20px rgba(123,159,239,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}
                >
                    <div className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
                        <span className="text-xs font-bold text-white tracking-widest" style={isHasbihal ? { fontFamily: "'Aref Ruqaa', serif", color: '#022c22' } : undefined}>{isHasbihal ? 'GÖNDER' : t.send}</span>
                        <SendHorizontal className="w-4 h-4 text-[#7b9fef] group-hover:translate-x-1 transition-transform" />
                    </div>
                </button>
            </form>

        </div >
    );
}
