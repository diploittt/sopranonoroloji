import { User } from '@/types';
import { generateGenderAvatar } from '@/lib/avatar';
import { ThreeDTextBanner, deserialize3DParams } from '@/components/room/ThreeDTextBanner';
import { Hand, Mic, MicOff, Phone, ChevronUp, ChevronDown, Crown, Shield, ShieldCheck, Music, Gem, User as UserIcon, MessageSquareX, Ban, CameraOff, Camera } from 'lucide-react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

import { ContextMenu } from '@/components/ui/ContextMenu';
import { getMenuItems, MenuItem } from '@/common/menuRegistry';
import { Role, ROLE_LABELS, canSeeStealthUser, hasRole, roleHierarchy, getRoleLevel } from '@/common/roles';
import { useRoomRealtime } from '@/hooks/useRoomRealtime';
import { AnchorPopover } from '@/components/ui/AnchorPopover';
import { useTranslation } from '@/i18n/LanguageProvider';
import { useCurrentTheme } from '@/hooks/useCurrentTheme';
import { AudioTestPanel } from './AudioTestPanel';
import { RadioPlayer } from './RadioPlayer';
import SopranoChatLogo from '@/components/ui/SopranoChatLogo';
import { GodMasterProfileModal } from '@/components/room/GodMasterProfileModal';

interface SidebarLeftProps {
    users: User[];
    currentUser: User | null;
    room: ReturnType<typeof useRoomRealtime>;
    onUserContextMenu?: (e: React.MouseEvent, user: User) => void;
    onEmptyContextMenu?: (e: React.MouseEvent) => void;
    isAudioTestOpen?: boolean;
    onCloseAudioTest?: () => void;
    ignoredUsers?: Set<string>;
    // Profile panel
    isProfileOpen?: boolean;
    onCloseProfile?: () => void;
    onChangeName?: (name: string) => void;
    onChangeAvatar?: (avatar: string) => void;
    onChangeNameColor?: (color: string) => void;
    onChangePassword?: (oldPass: string, newPass: string) => void;
    // Optional compatibility props
    [key: string]: any;
}

export function SidebarLeft({ users, currentUser, room, onUserContextMenu, onEmptyContextMenu, isAudioTestOpen, onCloseAudioTest, mobileSidebarOpen, onCloseMobileSidebar, ignoredUsers, isMeetingRoom, speakingUsers, isEmbed, isProfileOpen, onCloseProfile, onChangeName, onChangeAvatar, onChangeNameColor, onChangePassword }: SidebarLeftProps) {
    const { t } = useTranslation();
    const currentTheme = useCurrentTheme();
    const isHasbihal = currentTheme === 'hasbihal-islamic';

    // ── Long-press for mobile context menu ──
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressFired = useRef(false);

    const handleTouchStart = useCallback((e: React.TouchEvent, user: User) => {
        // ★ BAN CHECK — Banlı kullanıcılar long-press menüsü kullanamaz
        if (room?.state?.banInfo) return;
        longPressFired.current = false;
        const touch = e.touches[0];
        longPressTimerRef.current = setTimeout(() => {
            longPressFired.current = true;
            // Create synthetic mouse event at touch position
            if (onUserContextMenu) {
                const syntheticEvent = {
                    preventDefault: () => { },
                    stopPropagation: () => { },
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    pageX: touch.pageX,
                    pageY: touch.pageY,
                } as unknown as React.MouseEvent;
                onUserContextMenu(syntheticEvent, user);
            }
            // Haptic feedback if supported
            if (navigator.vibrate) navigator.vibrate(50);
        }, 600);
    }, [onUserContextMenu]);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const handleTouchMove = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);
    const isMidnight = currentTheme === 'midnight';


    // Queue Logic
    const queue = room.state.queue;
    const currentSpeaker = room.state.currentSpeaker;
    const isMicOn = room.state.isMicOn;
    const micTimeLeft = room.state.micTimeLeft || 0;

    const isSomeoneElseSpeaker = currentSpeaker && currentSpeaker.userId !== currentUser?.userId;
    const isInQueue = (queue || []).includes(currentUser?.userId || '');

    const [showAnnouncementPanel, setShowAnnouncementPanel] = useState(false);
    const [showLogoTooltip, setShowLogoTooltip] = useState(false);
    const [showGodMasterModal, setShowGodMasterModal] = useState(false);
    const isGodMasterUser = currentUser?.role?.toLowerCase() === 'godmaster';

    // Listen for 'openPremiumProfile' event from BottomToolbar
    useEffect(() => {
        const handler = () => setShowGodMasterModal(true);
        window.addEventListener('openPremiumProfile', handler);
        return () => window.removeEventListener('openPremiumProfile', handler);
    }, []);

    // ═══ Branding Live Preview (from admin SettingsTab) ═══
    const [brandingPreview, setBrandingPreview] = useState<Record<string, any> | null>(null);
    useEffect(() => {
        const onPreview = (e: Event) => { setBrandingPreview((e as CustomEvent).detail); };
        const onClear = () => { setBrandingPreview(null); };
        window.addEventListener('brandingPreview', onPreview);
        window.addEventListener('brandingPreviewClear', onClear);
        return () => {
            window.removeEventListener('brandingPreview', onPreview);
            window.removeEventListener('brandingPreviewClear', onClear);
        };
    }, []);

    // Toast Popover State
    // Toast Popover State
    const [toastState, setToastState] = useState<{ isOpen: boolean, anchorEl: HTMLElement | null, message: string, type: 'info' | 'error' | 'success' }>({
        isOpen: false, anchorEl: null, message: '', type: 'info'
    });
    const toastAnchorRef = useRef<HTMLElement | null>(null);

    // Status Menu State
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const statusMenuRef = useRef<HTMLDivElement>(null);

    // GodMaster Visibility State
    const isGodMaster = currentUser?.role?.toLowerCase() === 'godmaster';
    // Owner+ stealth capability (VIP+ or self.stealth permission)
    const canStealth = !isGodMaster && (
        getRoleLevel(currentUser?.role) >= 4 || // VIP+ roller
        (currentUser as any)?.permissions?.['self.stealth'] === true
    );
    const [showDisguiseInput, setShowDisguiseInput] = useState(false);
    const [disguiseName, setDisguiseName] = useState('');

    useEffect(() => { toastAnchorRef.current = toastState.anchorEl; }, [toastState.anchorEl]);

    // Click outside for status menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
                setShowStatusMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const showToastAt = (anchorEl: HTMLElement | null, msg: string, type: 'info' | 'error' | 'success' = 'info') => {
        setToastState({ isOpen: true, anchorEl, message: msg, type });
    };

    // Format timer MM:SS
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Role display helpers
    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'godmaster': return '🔱';
            case 'owner': return '👑';
            case 'superadmin': return '⚡';
            case 'admin': return '🛡️';
            case 'moderator': return '🔧';
            case 'operator': return '🎯';
            case 'vip': return '💎';
            case 'member': return null;
            default: return null;
        }
    };

    // Status display helpers
    const getStatusEmoji = (status?: string) => {
        switch (status) {
            case 'busy': return '🔴';
            case 'away': return '🟡';
            case 'brb': return '🟡';
            case 'outside': return '🚶';
            case 'phone': return '📞';
            case 'stealth': return '👻';
            default: return '🟢';
        }
    };

    const getStatusLabel = (status?: string) => {
        switch (status) {
            case 'busy': return t.statusBusy;
            case 'away': return t.statusWillReturn;
            case 'brb': return t.statusWillReturn;
            case 'outside': return t.statusOutside;
            case 'phone': return t.statusOnPhone;
            case 'stealth': return t.statusInvisible;
            default: return 'Durumum';
        }
    };

    const getStatusAccent = (status?: string) => {
        switch (status) {
            case 'busy': return 'text-red-400';
            case 'away': return 'text-amber-400';
            case 'brb': return 'text-amber-400';
            case 'outside': return 'text-amber-400';
            case 'phone': return 'text-cyan-400';
            case 'stealth': return 'text-gray-400';
            default: return 'text-emerald-400';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'godmaster': return 'GodMaster';
            case 'owner': return t.roleSiteOwner;
            case 'superadmin': return t.roleSuperAdmin;
            case 'admin': return t.roleAdmin;
            case 'moderator': return t.roleModerator;
            case 'operator': return t.roleOperator;
            case 'vip': return t.roleVip;
            case 'member': return t.roleMember;
            case 'guest': return t.roleGuest;
            default: return t.roleUser;
        }
    };

    const getRoleColorClass = (role: string) => {
        switch (role) {
            case 'godmaster': return 'text-fuchsia-400';
            case 'owner': return 'text-amber-400';
            case 'superadmin': return 'text-[#7b9fef]';
            case 'admin': return 'text-blue-400';
            case 'moderator': return 'text-emerald-400';
            case 'operator': return 'text-cyan-400';
            case 'vip': return 'text-yellow-300';
            default: return 'text-gray-400';
        }
    };

    // STEALTH FILTERING
    // ★ Backend (getRoomParticipants) zaten hiyerarşik stealth filtreleme yapıyor.
    // Frontend'e sadece kullanıcının görmesi gereken katılımcılar geliyor.
    // Burada tekrar filtreleme yapMAmalıyız — çift filtreleme hatalara neden olur.
    const visibleUsers = users;

    // SORTING LOGIC
    const sortedUsers = useMemo(() => {
        return [...visibleUsers].sort((a, b) => {
            // Meeting room: sort only by role hierarchy
            if (isMeetingRoom) {
                const levelA = getRoleLevel(a.role);
                const levelB = getRoleLevel(b.role);
                if (levelA !== levelB) return levelB - levelA;
                return (a.username || '').localeCompare(b.username || '');
            }

            // 1. Speaker
            const isSpeakerA = currentSpeaker?.userId === a.userId;
            const isSpeakerB = currentSpeaker?.userId === b.userId;
            if (isSpeakerA && !isSpeakerB) return -1;
            if (!isSpeakerA && isSpeakerB) return 1;

            // 2. Queue Position
            const queueIndexA = queue.indexOf(a.userId || '');
            const queueIndexB = queue.indexOf(b.userId || '');
            const inQueueA = queueIndexA !== -1;
            const inQueueB = queueIndexB !== -1;

            if (inQueueA && !inQueueB) return -1;
            if (!inQueueA && inQueueB) return 1;
            if (inQueueA && inQueueB) return queueIndexA - queueIndexB;

            // 3. Role Hierarchy (yüksek rol → üstte)
            const levelA = getRoleLevel(a.role);
            const levelB = getRoleLevel(b.role);
            if (levelA !== levelB) return levelB - levelA;

            // 4. Alphabetical
            return (a.username || '').localeCompare(b.username || '');
        });
    }, [visibleUsers, currentSpeaker, queue]);


    // --- CONTEXT MENU HANDLERS ---



    return (
        <aside
            className={`sidebar-left ${isProfileOpen ? 'profile-mode' : ''} ${isEmbed ? 'w-64' : 'w-80'} flex-shrink-0 flex flex-col min-h-0 border-r border-white/5 z-20 relative max-md:hidden`}
            onContextMenu={onEmptyContextMenu}
        >


            <AnchorPopover
                isOpen={toastState.isOpen}
                targetRef={toastAnchorRef}
                onClose={() => setToastState(prev => ({ ...prev, isOpen: false }))}
                variant="toast"
                toastType={toastState.type}
                message={toastState.message}
            />

            {/* ═══ COLLAPSE WRAPPER — hides sidebar content when profile opens ═══ */}
            <div style={{
                display: isProfileOpen ? 'none' : 'contents',
            }}>

            {/* HEADER */}
            <div
                className="chat-logo-area h-16 flex items-center justify-center px-4 shrink-0 relative overflow-hidden cursor-pointer group/logo"
                style={{
                    background: 'transparent',
                    borderBottom: 'none',
                    boxShadow: 'none',
                    transition: 'all 0.3s ease',
                    ...(isEmbed ? { display: 'none' } : {}),
                }}
                onMouseEnter={() => setShowLogoTooltip(true)}
                onMouseLeave={() => setShowLogoTooltip(false)}
            >
                <style>{`
                    .wm-glow-text {
                        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.6));
                        transition: filter 0.5s ease;
                    }
                    .chat-logo-area:hover .wm-glow-text {
                        filter: drop-shadow(0 0 6px rgba(0,210,210,0.6)) drop-shadow(0 0 16px rgba(0,210,210,0.35)) drop-shadow(0 0 40px rgba(0,210,210,0.15)) !important;
                    }
                `}</style>

                {/* Copyright Tooltip */}
                {showLogoTooltip && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full z-50 pointer-events-none"
                        style={{
                            animation: 'fadeInUp 0.25s ease-out both',
                        }}
                    >
                        <div style={{
                            background: 'rgba(15, 18, 28, 0.85)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(123, 159, 239, 0.15)',
                            borderRadius: '10px',
                            padding: '8px 14px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                            whiteSpace: 'nowrap',
                        }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(123, 159, 239, 0.8)', letterSpacing: '0.08em', marginBottom: '2px' }}>
                                © SopranoChat
                            </div>
                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                                Premium Voice & Video Chat Platform
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview mode indicator */}
                {brandingPreview && (
                    <div style={{
                        position: 'absolute', top: 4, right: 6, zIndex: 20,
                        fontSize: 7, fontWeight: 800, letterSpacing: '0.12em',
                        color: '#818cf8', background: 'rgba(99,102,241,0.15)',
                        border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: 4, padding: '1px 5px',
                        animation: 'pulse 2s ease-in-out infinite',
                    }}>ÖNİZLEME</div>
                )}

                <div className="flex flex-col justify-center w-full">
                    {isHasbihal ? (
                        <>
                            <div className="chat-subtitle text-[9px] font-bold tracking-[0.2em] text-[#7b9fef] uppercase mb-1 text-center w-full" style={{ fontFamily: "'Aref Ruqaa', serif" }}>◆ HASBİHAL MECLİSİ ◆</div>
                            <div className="chat-divider w-24 h-px bg-[#7b9fef] mx-auto mb-2"></div>
                        </>
                    ) : isMidnight ? (
                        null
                    ) : (
                        null
                    )}

                    {/* ═══ LOGO AREA: Text-Based Brandmark ═══ */}
                    {(() => {
                        const ss = room.state.systemSettings || {};
                        const bp = brandingPreview; // null when not previewing
                        const logoName = (bp ? bp.logoName : ss.logoName) || 'SopranoChat';
                        const logoTextSize = (bp ? bp.logoTextSize : ss.logoTextSize) || '1.4rem';
                        const logoTextColor = (bp ? bp.logoTextColor : ss.logoTextColor) || '';
                        const logoTextColor2 = (bp ? bp.logoTextColor2 : ss.logoTextColor2) || '';
                        const logoTextFont = (bp ? bp.logoTextFont : ss.logoTextFont) || '';
                        const logoPosition = (bp ? bp.logoPosition : ss.logoPosition) || 'left';
                        const hasCustomColors = logoTextColor || logoTextColor2;
                        const color1 = logoTextColor || '#38d9d9';
                        const color2 = logoTextColor2;



                        if (!hasCustomColors && logoName === 'SopranoChat' && !logoTextFont) {
                            // Default SopranoChat logo component
                            return (
                                <>
                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                                        <SopranoChatLogo size="md" animated showTagline />
                                    </div>
                                    <style>{`
                                        @keyframes speakerAvatarPulse { 0%, 100% { box-shadow: 0 0 0 3px rgba(52,211,153,0.12), 0 0 12px rgba(52,211,153,0.25); } 50% { box-shadow: 0 0 0 5px rgba(52,211,153,0.20), 0 0 20px rgba(52,211,153,0.40), 0 0 36px rgba(52,211,153,0.10); } }
                                        @keyframes speakerMicGlow { 0%, 100% { box-shadow: 0 0 6px rgba(52,211,153,0.40), 0 0 12px rgba(16,185,129,0.20); } 50% { box-shadow: 0 0 10px rgba(52,211,153,0.60), 0 0 20px rgba(16,185,129,0.35), 0 0 30px rgba(16,185,129,0.10); } }
                                        @keyframes speakerRipple { 0% { transform: scale(0.7); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
                                        @keyframes selfRingRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                                    `}</style>
                                </>
                            );
                        }

                        // Custom text brandmark
                        return (
                            <div style={{
                                width: '100%', display: 'flex', flexDirection: 'column',
                                alignItems: logoPosition === 'center' ? 'center' : 'flex-start',
                                padding: '10px 0 4px 0',
                            }}>
                                <div style={{
                                    fontSize: logoTextSize,
                                    fontWeight: 800,
                                    fontFamily: logoTextFont || 'inherit',
                                    letterSpacing: '0.02em',
                                    textAlign: logoPosition === 'center' ? 'center' : 'left',
                                    width: '100%',
                                    paddingLeft: logoPosition === 'center' ? 0 : 10,
                                    transition: 'all 0.3s ease',
                                    ...(color2 ? {
                                        backgroundImage: `linear-gradient(135deg, ${color1}, ${color2})`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                    } : {
                                        color: color1,
                                    }),
                                }}>
                                    {logoName}
                                </div>
                                <style>{`
                                    @keyframes speakerAvatarPulse { 0%, 100% { box-shadow: 0 0 0 3px rgba(52,211,153,0.12), 0 0 12px rgba(52,211,153,0.25); } 50% { box-shadow: 0 0 0 5px rgba(52,211,153,0.20), 0 0 20px rgba(52,211,153,0.40), 0 0 36px rgba(52,211,153,0.10); } }
                                    @keyframes speakerMicGlow { 0%, 100% { box-shadow: 0 0 6px rgba(52,211,153,0.40), 0 0 12px rgba(16,185,129,0.20); } 50% { box-shadow: 0 0 10px rgba(52,211,153,0.60), 0 0 20px rgba(16,185,129,0.35), 0 0 30px rgba(16,185,129,0.10); } }
                                    @keyframes speakerRipple { 0% { transform: scale(0.7); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
                                    @keyframes selfRingRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                                `}</style>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* AUDIO TEST or USER LIST — inside collapse wrapper */}
            {isAudioTestOpen && onCloseAudioTest ? (
                <AudioTestPanel onClose={onCloseAudioTest} />
            ) : (
                <div className="flex-1 p-3 custom-scrollbar space-y-3 overflow-y-auto">
                    {/* ═══ KONUŞMACI BÖLÜMÜ — logo altında, online listesinin üstünde ═══ */}
                    {!isMeetingRoom && currentSpeaker && (() => {
                        const speakerUser = sortedUsers.find(u => u.userId === currentSpeaker.userId);
                        if (!speakerUser) return null;

                        // Detect special avatar modes
                        const av = speakerUser.avatar || '';
                        const isGodMasterGif = speakerUser.role?.toLowerCase() === 'godmaster' && (av.toLowerCase().endsWith('.gif') || av.startsWith('data:image/gif'));
                        const isAnimatedMode = av.startsWith('animated:');
                        const isGifNickMode = av.startsWith('gifnick::');
                        const is3DMode = av.startsWith('3d:');
                        const isSpecialMode = isGodMasterGif || isAnimatedMode || isGifNickMode || is3DMode;

                        // Parse animated nick
                        let animClass = '', animText = '', animFontSize = 13;
                        if (isAnimatedMode) {
                            const parts = av.split(':');
                            animClass = parts[1] || 'shimmer-gold';
                            animFontSize = parseInt(parts[2]) || 13;
                            animText = parts.slice(4).join(':') || speakerUser.displayName || speakerUser.username || '';
                        }

                        // Parse gifnick
                        let gifNickUrl = '';
                        if (isGifNickMode) {
                            const parts = av.split('::');
                            gifNickUrl = parts[1] || '';
                        }

                        // Avatar src — match online list appearance
                        const speakerAvSrc = (() => {
                            if (isGodMasterGif) return av;
                            if (!av || isAnimatedMode || isGifNickMode || is3DMode) {
                                return `/avatars/neutral_1.png`;
                            }
                            return av;
                        })();

                        // Display name
                        const displayName = speakerUser.displayName || speakerUser.username || '';

                        return (
                            <div className="mb-2">
                                <div className="text-[10px] font-extrabold uppercase tracking-widest mb-1.5 flex items-center gap-2 text-red-400/80">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] animate-pulse"></span>
                                    {t.speaker.toUpperCase()}
                                </div>
                                <div className="flex items-center gap-2 px-2 py-2 rounded-xl" style={{
                                    background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(15,18,28,0.95) 100%)',
                                    border: '1px solid rgba(239,68,68,0.15)',
                                    boxShadow: '0 0 12px rgba(239,68,68,0.04), inset 0 0 8px rgba(239,68,68,0.02)',
                                }}>
                                    {(isGifNickMode && gifNickUrl) || isGodMasterGif ? (
                                        /* GIF modu — sadece GIF göster, avatar/isim yok */
                                        <>
                                            <div className="flex-1 flex flex-col items-center gap-2 py-1">
                                                <img src={isGifNickMode ? gifNickUrl : av} alt={displayName} className="h-8 max-w-full object-contain" style={{
                                                    filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.3))',
                                                }} />
                                                <div className="text-[10px] text-red-400/70 flex items-center gap-1">
                                                    <Mic className="w-3 h-3" />
                                                    <span>{t.broadcasting}</span>
                                                    {micTimeLeft > 0 && (
                                                        <span className="text-amber-400 font-mono ml-1">({formatTime(micTimeLeft)})</span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Sağ mikrofon ikonu + dalga efekti */}
                                            <div className="flex-shrink-0 relative" style={{ width: 28, height: 28 }}>
                                                <div className="absolute inset-[-4px] rounded-full" style={{
                                                    border: '1.5px solid rgba(239,68,68,0.25)',
                                                    animation: 'speakerRipple 1.8s ease-out infinite',
                                                }} />
                                                <div className="absolute inset-[-4px] rounded-full" style={{
                                                    border: '1px solid rgba(239,68,68,0.15)',
                                                    animation: 'speakerRipple 1.8s ease-out 0.6s infinite',
                                                }} />
                                                <div className="absolute inset-[-4px] rounded-full" style={{
                                                    border: '1px solid rgba(239,68,68,0.10)',
                                                    animation: 'speakerRipple 1.8s ease-out 1.2s infinite',
                                                }} />
                                                <div className="relative z-10 w-full h-full rounded-full flex items-center justify-center" style={{
                                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                                    boxShadow: '0 0 8px rgba(239,68,68,0.40), 0 0 16px rgba(239,68,68,0.15)',
                                                    animation: 'speakerMicGlow 1.5s ease-in-out infinite',
                                                }}>
                                                    <Mic className="w-3 h-3 text-white" />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        /* Normal / Animated / GodMaster GIF — Avatar + İsim */
                                        <>
                                            {/* Büyük Avatar + Dalga Efekti */}
                                            <div className="relative flex-shrink-0">
                                                <div className="absolute inset-[-2px] rounded-full" style={{
                                                    border: '1px solid rgba(239,68,68,0.15)',
                                                    animation: 'speakerRipple 2s ease-out infinite',
                                                }} />
                                                <div className="absolute inset-[-2px] rounded-full" style={{
                                                    border: '1px solid rgba(239,68,68,0.10)',
                                                    animation: 'speakerRipple 2s ease-out 0.6s infinite',
                                                }} />
                                                <div
                                                    className="w-12 h-12 rounded-full flex items-center justify-center"
                                                    style={{
                                                        border: '1px solid rgba(239,68,68,0.35)',
                                                        boxShadow: '0 0 6px rgba(239,68,68,0.15), 0 0 12px rgba(239,68,68,0.06)',
                                                        animation: 'speakerAvatarPulseRed 2s ease-in-out infinite',
                                                        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                                        fontSize: 18, fontWeight: 900, color: 'rgba(239,68,68,0.7)', textTransform: 'uppercase' as const,
                                                    }}
                                                ><img src={speakerAvSrc || generateGenderAvatar(displayName || '?')} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /></div>
                                            </div>
                                            {/* İsim ve durum */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                                                    {isAnimatedMode ? (
                                                        <span className={`animated-nick ${animClass}`} style={{ fontSize: Math.min(animFontSize, 14) }}>{animText || displayName}</span>
                                                    ) : (
                                                        speakerUser.username
                                                    )}
                                                    {speakerUser.role?.toLowerCase() === 'godmaster' && <span className="text-[10px]">{speakerUser.godmasterIcon || '🔱'}</span>}
                                                </div>
                                                <div className="text-[10px] text-red-400/70 flex items-center gap-1">
                                                    <Mic className="w-3 h-3" />
                                                    <span>Konuşuyor</span>
                                                    {micTimeLeft > 0 && (
                                                        <span className="text-amber-400 font-mono ml-1">({formatTime(micTimeLeft)})</span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Sağ mikrofon ikonu + dalga efekti */}
                                            <div className="flex-shrink-0 relative" style={{ width: 28, height: 28 }}>
                                                <div className="absolute inset-[-4px] rounded-full" style={{
                                                    border: '1.5px solid rgba(239,68,68,0.25)',
                                                    animation: 'speakerRipple 1.8s ease-out infinite',
                                                }} />
                                                <div className="absolute inset-[-4px] rounded-full" style={{
                                                    border: '1px solid rgba(239,68,68,0.15)',
                                                    animation: 'speakerRipple 1.8s ease-out 0.6s infinite',
                                                }} />
                                                <div className="absolute inset-[-4px] rounded-full" style={{
                                                    border: '1px solid rgba(239,68,68,0.10)',
                                                    animation: 'speakerRipple 1.8s ease-out 1.2s infinite',
                                                }} />
                                                <div className="relative z-10 w-full h-full rounded-full flex items-center justify-center" style={{
                                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                                    boxShadow: '0 0 8px rgba(239,68,68,0.40), 0 0 16px rgba(239,68,68,0.15)',
                                                    animation: 'speakerMicGlow 1.5s ease-in-out infinite',
                                                }}>
                                                    <Mic className="w-3 h-3 text-white" />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <style>{`
                                    @keyframes speakerAvatarPulseRed {
                                        0% { box-shadow: 0 0 6px rgba(239,68,68,0.3), 0 0 14px rgba(239,68,68,0.15); }
                                        15% { box-shadow: 0 0 10px rgba(239,68,68,0.5), 0 0 22px rgba(239,68,68,0.25); }
                                        30% { box-shadow: 0 0 4px rgba(239,68,68,0.15), 0 0 8px rgba(239,68,68,0.08); }
                                        50% { box-shadow: 0 0 12px rgba(239,68,68,0.5), 0 0 28px rgba(239,68,68,0.3); }
                                        70% { box-shadow: 0 0 5px rgba(239,68,68,0.2), 0 0 12px rgba(239,68,68,0.1); }
                                        85% { box-shadow: 0 0 10px rgba(239,68,68,0.45), 0 0 20px rgba(239,68,68,0.2); }
                                        100% { box-shadow: 0 0 6px rgba(239,68,68,0.3), 0 0 14px rgba(239,68,68,0.15); }
                                    }
                                `}</style>
                            </div>
                        );
                    })()}

                    <div>
                        <div className={`admin-card-title text-[10px] font-extrabold uppercase tracking-widest mb-1 flex items-center gap-2 ${isHasbihal ? 'text-[#7b9fef]' : 'text-gold-500'}`} style={isHasbihal ? { fontFamily: "'Aref Ruqaa', serif" } : undefined}>
                            <span className={`w-1 h-1 rounded-full ${isHasbihal ? 'bg-[#7b9fef]' : 'bg-[#7b9fef]'}`}></span> {isHasbihal ? 'MECLİS BAŞKANI' : `${t.online} (${visibleUsers.length})`}
                        </div>

                        <div className="space-y-0.5">
                            {sortedUsers.filter(u => currentSpeaker?.userId !== u.userId).map((user) => {
                                const isSpeaker = currentSpeaker?.userId === user.userId;
                                const queueIndex = queue.indexOf(user.userId || '');

                                const isSelf = user.userId === currentUser?.userId;
                                // ★ Backend'den gelen veri her zaman güncel — user.isStealth kullan
                                const isInvisible = user.isStealth;

                                const hasStatusIcons = user.isMuted || user.isGagged || user.isBanned || user.isCamBlocked;
                                const isIgnored = ignoredUsers?.has(user.userId || '') || false;
                                const isOwnerUser = user.role?.toLowerCase() === 'owner';

                                const isGodMasterUser = user.role?.toLowerCase() === 'godmaster';
                                const isGodMasterGifMode = isGodMasterUser && (user.avatar?.toLowerCase().endsWith('.gif') || user.avatar?.startsWith('data:image/gif'));
                                const isAnimatedMode = user.avatar?.startsWith('animated:'); // GodMaster tarafından atanabilir
                                const isGifNickMode = user.avatar?.startsWith('gifnick::'); // GodMaster tarafından atanan GIF nick
                                const isGodMaster3DMode = isGodMasterUser && user.avatar?.startsWith('3d:');
                                const isGodMasterSpecialMode = isGodMasterGifMode || isAnimatedMode || isGifNickMode || isGodMaster3DMode;

                                // Parse animated avatar: "animated:class:fontSize:showAvatar:text"
                                let animClass = '', animText = '', animFontSize = 13, animShowAvatar = true;
                                if (isAnimatedMode && user.avatar) {
                                    const parts = user.avatar.split(':');
                                    animClass = parts[1] || 'shimmer-gold';
                                    animFontSize = parseInt(parts[2]) || 13;
                                    animShowAvatar = parts[3] !== '0';
                                    animText = parts.slice(4).join(':') || user.displayName || user.username || 'User';
                                }

                                // Parse GIF nick: "gifnick::url::showAvatar"
                                let gifNickUrl = '', gifNickShowAvatar = true;
                                if (isGifNickMode && user.avatar) {
                                    const parts = user.avatar.split('::');
                                    gifNickUrl = parts[1] || '';
                                    gifNickShowAvatar = parts[2] !== '0';
                                }

                                // Determine if avatar should be shown for animated/gif nick modes
                                const shouldShowAvatar = isAnimatedMode ? animShowAvatar : isGifNickMode ? gifNickShowAvatar : true;

                                // Parse 3D avatar: "3d:theme:mainText" or "3d:theme:mainText:subText"
                                let tdTheme = 'purple', tdMain = 'GodMaster', tdSub = '', tdParamsStr = '';
                                if (isGodMaster3DMode && user.avatar) {
                                    // Format: 3d:theme:mainText:subText|paramsCsv
                                    const [corePart, paramsPart] = user.avatar.split('|');
                                    const parts = corePart.split(':');
                                    tdTheme = parts[1] || 'purple';
                                    tdMain = parts[2] || user.displayName || 'GodMaster';
                                    tdSub = parts[3] || '';
                                    tdParamsStr = paramsPart || '';
                                }

                                return (
                                    <div
                                        key={user.userId || user.socketId}
                                        className={`${(isGodMasterSpecialMode && !shouldShowAvatar) || isGifNickMode || isGodMasterGifMode ? '' : 'user-card'} flex items-center ${(isGodMasterSpecialMode && !shouldShowAvatar) || isGifNickMode || isGodMasterGifMode ? 'px-0 py-0' : 'px-1 py-1 rounded-xl'} transition-all duration-300 group cursor-context-menu select-none relative
                                    ${(isGodMasterSpecialMode && !shouldShowAvatar) || isGifNickMode || isGodMasterGifMode
                                                ? ''
                                                : 'hover:bg-white/[0.03]'}
                                    ${isInvisible ? 'grayscale opacity-40 saturate-0' : ''}
                                    ${!isGodMasterSpecialMode && user.isMuted && isSelf ? '!border-red-500/30 !bg-red-500/[0.04]' : ''}
                                    ${!isGodMasterSpecialMode && user.isGagged && isSelf ? '!border-orange-500/30 !bg-orange-500/[0.04]' : ''}
                                    ${!isGodMasterSpecialMode && user.isBanned ? '!border-red-600/40 !bg-red-600/[0.06]' : ''}
                                `}
                                        style={(isGodMasterSpecialMode && !shouldShowAvatar) || isGifNickMode || isGodMasterGifMode ? {
                                            background: 'transparent',
                                            border: 'none',
                                            boxShadow: 'none',
                                            outline: 'none',
                                            marginBottom: 2,
                                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                                            paddingBottom: 4,
                                        } : isSelf && !isGodMasterSpecialMode ? {
                                            background: isInvisible
                                                ? 'linear-gradient(135deg, rgba(30,41,59,0.3) 0%, rgba(15,23,42,0.4) 50%, rgba(15,23,42,0.5) 100%)'
                                                : 'linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(56,189,248,0.03) 50%, rgba(15,23,42,0.95) 100%)',
                                            borderRadius: '12px',
                                            overflow: 'hidden',
                                            marginBottom: 2,
                                            borderBottom: '1px solid rgba(34,211,238,0.12)',
                                            paddingBottom: 4,
                                            ...(isInvisible ? { filter: 'grayscale(1) brightness(0.45)', opacity: 0.35 } : {}),
                                        } : isInvisible ? {
                                            filter: 'grayscale(1) brightness(0.6)',
                                            opacity: 0.4,
                                            marginBottom: 2,
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            paddingBottom: 4,
                                        } : {
                                            marginBottom: 2,
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            paddingBottom: 4,
                                        }}
                                        onContextMenu={(e) => {
                                            // ★ BAN CHECK — Banlı kullanıcılar sağ tık menüsü kullanamaz
                                            if (room?.state?.banInfo) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                return;
                                            }
                                            if (onUserContextMenu) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onUserContextMenu(e, user);
                                            }
                                        }}
                                        onTouchStart={(e) => handleTouchStart(e, user)}
                                        onTouchEnd={handleTouchEnd}
                                        onTouchMove={handleTouchMove}
                                    >
                                        {/* ═══ isSelf Tapered Frame — avatara doğru daralan çerçeve ═══ */}
                                        {isSelf && !isGodMasterSpecialMode && !isGifNickMode && !isGodMasterGifMode && !isInvisible && (
                                            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
                                                {/* Daralan gradient overlay */}
                                                <div style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    clipPath: 'polygon(0% 20%, 10% 0%, 100% 0%, 100% 100%, 10% 100%, 0% 80%)',
                                                    background: 'linear-gradient(90deg, rgba(34,211,238,0.12) 0%, rgba(56,189,248,0.06) 30%, rgba(99,102,241,0.03) 70%, transparent 100%)',
                                                    borderRadius: '12px',
                                                }} />
                                                {/* Daralan border çizgisi — üst */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0, left: '10%', right: 0,
                                                    height: '1px',
                                                    background: 'linear-gradient(90deg, rgba(34,211,238,0.5), rgba(56,189,248,0.25), rgba(99,102,241,0.1), transparent)',
                                                }} />
                                                {/* Daralan border çizgisi — alt */}
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0, left: '10%', right: 0,
                                                    height: '1px',
                                                    background: 'linear-gradient(90deg, rgba(34,211,238,0.5), rgba(56,189,248,0.25), rgba(99,102,241,0.1), transparent)',
                                                }} />
                                                {/* Sol kenar — daralan çizgi (avatar etrafında) */}
                                                <div style={{
                                                    position: 'absolute',
                                                    left: 0, top: '20%', bottom: '20%',
                                                    width: '1px',
                                                    background: 'linear-gradient(180deg, transparent, rgba(34,211,238,0.4), transparent)',
                                                }} />
                                                {/* Üst-sol köşegen çizgi */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0, left: 0,
                                                    width: '12%', height: '20%',
                                                    borderBottom: 'none',
                                                    background: 'linear-gradient(to bottom right, transparent 49%, rgba(34,211,238,0.35) 50%, transparent 51%)',
                                                }} />
                                                {/* Alt-sol köşegen çizgi */}
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0, left: 0,
                                                    width: '12%', height: '20%',
                                                    background: 'linear-gradient(to top right, transparent 49%, rgba(34,211,238,0.35) 50%, transparent 51%)',
                                                }} />
                                            </div>
                                        )}
                                        {/* ═══ GodMaster GIF Nick Mode ═══ */}
                                        {isGodMasterGifMode ? (
                                            <div className="w-full flex items-center justify-center">
                                                <img
                                                    src={user.avatar}
                                                    className="godmaster-banner max-w-[85%] max-h-11 object-contain"
                                                    alt="GodMaster"
                                                    style={{ filter: 'drop-shadow(0 0 4px rgba(217, 70, 239, 0.25))' }}
                                                />
                                            </div>
                                        ) : isGodMaster3DMode ? (
                                            /* ═══ GodMaster 3D Text Nick Mode ═══ */
                                            <div className="w-full flex items-center justify-start pl-2">
                                                <ThreeDTextBanner
                                                    mainText={tdMain}
                                                    subText={tdSub}
                                                    theme={tdTheme}
                                                    width={240}
                                                    height={90}
                                                    className="godmaster-banner"
                                                    style={{ borderRadius: '0', border: 'none', outline: 'none', boxShadow: 'none' }}
                                                    params={tdParamsStr ? deserialize3DParams(tdParamsStr) : undefined}
                                                />
                                            </div>
                                        ) : isGifNickMode ? (
                                            /* ═══ GIF Nick Mode ═══ */
                                            <>
                                                {gifNickShowAvatar && (
                                                    <div className="relative flex-shrink-0 mr-2.5">
                                                        <img
                                                            src={`/avatars/neutral_1.png`}
                                                            className={`w-10 h-10 rounded-full border-[1.5px] transition-colors object-cover border-white/15 group-hover:border-[#7b9fef]/40`}
                                                        />
                                                    </div>
                                                )}
                                                <div className={`${gifNickShowAvatar ? '' : 'w-full'} flex items-center ${gifNickShowAvatar ? 'justify-start' : 'justify-center'}`}>
                                                    {gifNickUrl ? (
                                                        <img
                                                            src={gifNickUrl}
                                                            className="max-w-[85%] max-h-11 object-contain"
                                                            alt="GIF Nick"
                                                            style={{ filter: 'drop-shadow(0 0 4px rgba(167, 139, 250, 0.25))' }}
                                                        />
                                                    ) : (
                                                        <span className="text-sm text-white font-medium">{user.displayName || user.username || 'User'}</span>
                                                    )}
                                                </div>
                                            </>
                                        ) : isAnimatedMode ? (
                                            /* ═══ Animated Text Nick Mode ═══ */
                                            <>
                                                {animShowAvatar && (() => {
                                                    // Kendi kullanıcımız mı? Eğer öyleyse localStorage'dan özel avatar kontrol et
                                                    const isSelf = currentUser && (user.username === currentUser.username || user.displayName === currentUser.displayName);
                                                    let avatarSrc = `/avatars/neutral_1.png`;
                                                    if (isSelf) {
                                                        try {
                                                            const customAvatar = sessionStorage.getItem('soprano_custom_avatar');
                                                            if (customAvatar) avatarSrc = customAvatar;
                                                        } catch (e) { }
                                                    }
                                                    return (
                                                        <div className="relative flex-shrink-0 mr-2.5">
                                                            <img
                                                                src={avatarSrc}
                                                                className={`w-10 h-10 rounded-full border-[1.5px] transition-colors object-cover border-white/15 group-hover:border-[#7b9fef]/40`}
                                                            />
                                                        </div>
                                                    );
                                                })()}
                                                <div className={`${animShowAvatar ? '' : 'w-full'} flex items-center ${animShowAvatar ? 'justify-start' : 'justify-center'} py-1 gap-1.5`}>
                                                    <span className={`animated-nick ${animClass}`} style={{ fontSize: animFontSize }}>
                                                        {animText}
                                                    </span>
                                                    {/* Rütbe badge — ismin sağında */}
                                                    {user.role?.toLowerCase() === 'godmaster' && (
                                                        <span className="inline-flex items-center justify-center w-4 h-4 bg-gradient-to-br from-fuchsia-500 to-amber-800 rounded-full text-[8px] shadow-md border border-fuchsia-300/50 godmaster-badge-glow flex-shrink-0">{user.godmasterIcon || '🔱'}</span>
                                                    )}
                                                    {isOwnerUser && user.role?.toLowerCase() !== 'godmaster' && !room.state.systemSettings?.forceOperatorIcon && (
                                                        <span className="inline-flex items-center justify-center w-4 h-4 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full text-[8px] shadow-md border border-amber-300/50 flex-shrink-0">👑</span>
                                                    )}
                                                    {room.state.systemSettings?.forceOperatorIcon && user.role?.toLowerCase() !== 'godmaster' && user.role?.toLowerCase() !== 'guest' && (
                                                        <span className="inline-flex items-center justify-center w-4 h-4 bg-gradient-to-br from-emerald-500 to-green-700 rounded-full shadow-md border border-emerald-400/50 flex-shrink-0">
                                                            <Shield className="w-2.5 h-2.5 text-white" />
                                                        </span>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* Avatar — baş harf placeholder */}
                                                <div className="relative flex-shrink-0" style={{ marginLeft: 0 }}>
                                                    <div
                                                        className="neon-avatar w-12 h-12 rounded-full transition-all duration-300 object-cover flex items-center justify-center overflow-hidden"
                                                        style={(() => {
                                                            const role = user.role?.toLowerCase();
                                                            const audioLevel = (user.userId && speakingUsers?.[user.userId]) || 0;
                                                            const isActive = audioLevel > 0.01;
                                                            // Scale factor: 0 at silence, 1 at full volume
                                                            const s = Math.min(1, audioLevel * 2.5);
                                                            let borderColor = 'rgba(255,255,255,0.15)';
                                                            let shadow = 'none';
                                                            if (role === 'godmaster') {
                                                                borderColor = `rgba(192,132,252,${0.4 + s * 0.6})`;
                                                                shadow = `0 0 ${4 + s * 8}px rgba(192,132,252,${0.3 + s * 0.4}), 0 0 ${10 + s * 15}px rgba(217,70,239,${0.15 + s * 0.3}), 0 0 ${20 + s * 20}px rgba(168,85,247,${0.05 + s * 0.15})`;
                                                            } else if (isOwnerUser) {
                                                                borderColor = `rgba(251,191,36,${0.35 + s * 0.65})`;
                                                                shadow = `0 0 ${4 + s * 8}px rgba(251,191,36,${0.25 + s * 0.4}), 0 0 ${10 + s * 14}px rgba(245,158,11,${0.12 + s * 0.25}), 0 0 ${18 + s * 16}px rgba(251,191,36,${0.04 + s * 0.12})`;
                                                            } else if (isSelf) {
                                                                borderColor = `rgba(34,211,238,${0.4 + s * 0.6})`;
                                                                shadow = `0 0 ${4 + s * 8}px rgba(34,211,238,${0.25 + s * 0.4}), 0 0 ${10 + s * 14}px rgba(56,189,248,${0.12 + s * 0.25}), 0 0 ${18 + s * 16}px rgba(34,211,238,${0.04 + s * 0.12})`;
                                                            } else if (role === 'superadmin') {
                                                                borderColor = `rgba(129,140,248,${0.35 + s * 0.55})`;
                                                                shadow = `0 0 ${4 + s * 6}px rgba(129,140,248,${0.2 + s * 0.35}), 0 0 ${10 + s * 10}px rgba(99,102,241,${0.1 + s * 0.2})`;
                                                            } else if (role === 'admin') {
                                                                borderColor = `rgba(96,165,250,${0.3 + s * 0.5})`;
                                                                shadow = `0 0 ${4 + s * 6}px rgba(96,165,250,${0.2 + s * 0.3}), 0 0 ${8 + s * 10}px rgba(96,165,250,${0.08 + s * 0.15})`;
                                                            } else if (role === 'moderator') {
                                                                borderColor = `rgba(52,211,153,${0.25 + s * 0.45})`;
                                                                shadow = `0 0 ${3 + s * 5}px rgba(52,211,153,${0.15 + s * 0.3}), 0 0 ${8 + s * 10}px rgba(52,211,153,${0.06 + s * 0.12})`;
                                                            } else if (role === 'operator') {
                                                                borderColor = `rgba(34,211,238,${0.2 + s * 0.4})`;
                                                                shadow = `0 0 ${3 + s * 5}px rgba(34,211,238,${0.12 + s * 0.25}), 0 0 ${7 + s * 8}px rgba(34,211,238,${0.04 + s * 0.1})`;
                                                            } else if (role === 'vip') {
                                                                borderColor = `rgba(250,204,21,${0.25 + s * 0.45})`;
                                                                shadow = `0 0 ${3 + s * 5}px rgba(250,204,21,${0.15 + s * 0.3}), 0 0 ${8 + s * 10}px rgba(250,204,21,${0.06 + s * 0.12})`;
                                                            } else if (role === 'member') {
                                                                borderColor = `rgba(148,163,184,${0.15 + s * 0.25})`;
                                                                shadow = `0 0 ${2 + s * 4}px rgba(148,163,184,${0.06 + s * 0.12})`;
                                                            }
                                                            return {
                                                                border: `2px solid ${borderColor}`,
                                                                boxShadow: shadow,
                                                                background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                                                fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const,
                                                                position: 'relative' as const,
                                                                zIndex: 1,
                                                                borderRadius: '9999px',
                                                                transition: 'box-shadow 0.15s ease-out, border-color 0.15s ease-out',
                                                            };
                                                        })()}
                                                    >{(() => { const avSrc = user.avatar || generateGenderAvatar(user.displayName || user.username || '?'); return <img src={avSrc} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />; })()}</div>


                                                    {/* ╒╒╒ FORCE OPERATOR ICON — Sadece yetkili roller (vip+) ╒╒╒ */}
                                                    {room.state.systemSettings?.forceOperatorIcon && (() => {
                                                        const r = user.role?.toLowerCase();
                                                        // GodMaster kendi badge'ini yukarıda gösteriyor
                                                        if (r === 'godmaster') return null;
                                                        // Yalnızca vip ve üzerı için göster (member ve guest hariç)
                                                        const authorizedRoles = ['owner', 'superadmin', 'super_admin', 'admin', 'moderator', 'operator', 'dj', 'vip'];
                                                        if (!authorizedRoles.includes(r || '')) return null;
                                                        return (
                                                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-emerald-500 to-green-700 rounded-full flex items-center justify-center shadow-lg border border-emerald-400/50 z-10" title={t.roleOperator}>
                                                                <Shield className="w-3 h-3 text-white" />
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* ═══ MODERATION OVERLAY ICONS ═══ */}
                                                    {user.isMuted && (
                                                        <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.6)] border border-red-400/50 z-20 animate-pulse" title={t.muted}>
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                <line x1="1" y1="1" x2="23" y2="23" />
                                                                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    {user.isGagged && (
                                                        <div className={`absolute -bottom-1 ${user.isMuted ? 'left-4' : '-left-1'} w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(249,115,22,0.6)] border border-orange-400/50 z-20 animate-pulse`} title="Yazı Yasağı">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                                <line x1="4" y1="1" x2="22" y2="19" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    {user.isCamBlocked && (
                                                        <div className="absolute -top-1 -left-1.5 w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center shadow-[0_0_6px_rgba(107,114,128,0.5)] border border-gray-400/50 z-20 animate-pulse" title="Kamera Engellendi">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M16 16V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9" />
                                                                <line x1="1" y1="1" x2="23" y2="23" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    {user.isBanned && (
                                                        <div
                                                            className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-700 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(220,38,38,0.7)] border border-red-500/50 z-20"
                                                            title="Yasaklı"
                                                            style={{ animation: 'banBlink 1s ease-in-out infinite' }}
                                                        >
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                <circle cx="12" cy="12" r="10" />
                                                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                                            </svg>
                                                        </div>
                                                    )}

                                                    {/* Online/Status indicator — konuşmacı ikonu artık avatar üzerinde gösterilmiyor */}
                                                    {!hasStatusIcons && !isSpeaker && (
                                                        <div className="absolute -bottom-0.5 -right-0.5 z-10 flex items-center justify-center" title={getStatusLabel(user.status)}>
                                                            <span className="text-[14px] leading-none drop-shadow-lg">{getStatusEmoji(user.status)}</span>
                                                        </div>
                                                    )}


                                                </div>

                                                {/* Username & Status Text */}
                                                <div className="flex-1 min-w-0 ml-2">
                                                    <div
                                                        className={`text-sm font-bold transition-colors flex items-center gap-1 flex-nowrap
                                        ${!user.nameColor ? (isOwnerUser ? 'text-[#7b9fef]' : isSpeaker ? 'text-[#a3bfff]' : 'text-white group-hover:text-[#7b9fef]') : ''}
                                    `}
                                                        style={{
                                                            ...(user.nameColor ? { color: user.nameColor } : {}),
                                                            textShadow: (() => {
                                                                const r = user.role?.toLowerCase();
                                                                if (r === 'godmaster') return '0 0 8px rgba(217,70,239,0.7), 0 2px 6px rgba(0,0,0,0.6)';
                                                                if (r === 'owner' || isOwnerUser) return '0 0 8px rgba(245,158,11,0.6), 0 2px 6px rgba(0,0,0,0.6)';
                                                                if (r === 'superadmin') return '0 0 8px rgba(99,102,241,0.5), 0 2px 6px rgba(0,0,0,0.5)';
                                                                if (r === 'admin') return '0 0 8px rgba(96,165,250,0.5), 0 2px 6px rgba(0,0,0,0.5)';
                                                                if (r === 'moderator') return '0 0 6px rgba(52,211,153,0.4), 0 2px 6px rgba(0,0,0,0.5)';
                                                                if (r === 'operator') return '0 0 6px rgba(34,211,238,0.4), 0 2px 6px rgba(0,0,0,0.5)';
                                                                if (r === 'vip') return '0 0 6px rgba(250,204,21,0.4), 0 2px 6px rgba(0,0,0,0.5)';
                                                                return '0 1px 3px rgba(0,0,0,0.5)';
                                                            })(),
                                                            overflow: 'visible',
                                                        }}
                                                    >
                                                        <span className="truncate max-w-[80px]">{user.displayName || 'User'}</span>
                                                        {isSelf && <span className="text-[10px] text-cyan-400/80 font-semibold ml-0.5 flex-shrink-0">(SEN)</span>}
                                                        {isIgnored && <span className="text-[10px] text-red-400/60 ml-0.5" title="Yoksayılıyor">🚫</span>}
                                                        {user.platform === 'mobile' && (
                                                            <span className="text-[13px] flex-shrink-0 opacity-80" title={t.mobileUser}>📱</span>
                                                        )}
                                                        {user.role?.toLowerCase() === 'godmaster' ? (user.godmasterIcon || '🔱') : getRoleIcon(user.role || 'guest')}
                                                        {/* Moderation ikonları sadece avatar overlay'de gösteriliyor (satır 970-1005) */}
                                                        {/* Meeting Room: Mic icon for speaking users */}
                                                        {isMeetingRoom && speakingUsers && speakingUsers[user.userId || ''] && (
                                                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full ml-1" style={{
                                                                background: 'linear-gradient(135deg, #34d399, #10b981)',
                                                                boxShadow: `0 0 ${4 + (speakingUsers[user.userId || ''] || 0) * 12}px rgba(52,211,153,${0.3 + (speakingUsers[user.userId || ''] || 0) * 0.5})`,
                                                                animation: 'speakerMicGlow 0.8s ease-in-out infinite',
                                                                transform: `scale(${0.9 + (speakingUsers[user.userId || ''] || 0) * 0.3})`,
                                                                transition: 'all 0.15s ease',
                                                            }}>
                                                                <Mic className="w-2.5 h-2.5 text-white" />
                                                            </span>
                                                        )}
                                                        {/* Meeting Room: Mic On (but not speaking) icon */}
                                                        {isMeetingRoom && room.state.isMicOn && user.userId === currentUser?.userId && !(speakingUsers && speakingUsers[user.userId || '']) && (
                                                            <Mic className="w-3.5 h-3.5 text-emerald-400/60 ml-1 inline-block" strokeWidth={2} />
                                                        )}
                                                        {/* Status ikonu sadece avatar overlay'de gösteriliyor (satır 1008-1011) */}
                                                        {/* Camera Icon */}
                                                        {(() => {
                                                            const isMyCamera = currentUser?.userId === user.userId && room.state.isCameraOn;
                                                            const hasRemoteVideo = room.state.remoteStreams.some(s => s.peerId === user.userId && s.stream.getVideoTracks().length > 0);
                                                            if (isMyCamera || hasRemoteVideo) {
                                                                return <Camera className="w-4 h-4 text-rose-500 animate-pulse ml-1 inline-block" strokeWidth={2.5} />;
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                    <div className={`text-[10px] truncate flex items-center gap-1 ${getRoleColorClass(user.role || 'guest')}`}>
                                                        {isSpeaker ? (
                                                            <>
                                                                <span className="inline-flex items-center gap-1">
                                                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full" style={{
                                                                        background: 'linear-gradient(135deg, #34d399, #10b981)',
                                                                        boxShadow: '0 0 6px rgba(52,211,153,0.50), 0 0 14px rgba(16,185,129,0.25)',
                                                                        animation: 'speakerMicGlow 1.5s ease-in-out infinite',
                                                                    }}>
                                                                        <Mic className="w-2.5 h-2.5 text-white" />
                                                                    </span>
                                                                    <span className="text-green-400 font-bold">Konuşuyor</span>
                                                                </span>
                                                                {micTimeLeft > 0 && (
                                                                    <span className="text-amber-400 font-mono text-[9px]">({formatTime(micTimeLeft)})</span>
                                                                )}
                                                            </>
                                                        ) : user.isMuted ? (
                                                            <span className="text-[#ef4444] font-semibold">{t.muted}</span>
                                                        ) : user.isGagged ? (
                                                            <span className="text-[#f97316] font-semibold">{t.gagged}</span>
                                                        ) : user.isBanned ? (
                                                            <span className="text-[#dc2626] font-semibold">{t.bannedUser}</span>
                                                        ) : getRoleLabel(user.role || 'guest')}
                                                    </div>

                                                    {/* ═══ ACTION INDICATOR OVERLAY — admin eylemleri kart üzerinde gösterilir ═══ */}
                                                    {(() => {
                                                        const indicator = room.state.actionIndicators?.get(user.userId || '');
                                                        if (!indicator) return null;
                                                        const colorMap: Record<string, { bg: string; border: string; text: string }> = {
                                                            danger: { bg: 'rgba(220,38,38,0.88)', border: 'rgba(248,113,113,0.6)', text: '#fecaca' },
                                                            warning: { bg: 'rgba(180,83,9,0.88)', border: 'rgba(251,191,36,0.6)', text: '#fde68a' },
                                                            success: { bg: 'rgba(6,95,70,0.88)', border: 'rgba(52,211,153,0.6)', text: '#a7f3d0' },
                                                            cyan: { bg: 'rgba(8,51,68,0.88)', border: 'rgba(34,211,238,0.6)', text: '#a5f3fc' },
                                                            info: { bg: 'rgba(30,58,138,0.88)', border: 'rgba(96,165,250,0.6)', text: '#bfdbfe' },
                                                            purple: { bg: 'rgba(76,29,149,0.88)', border: 'rgba(168,85,247,0.6)', text: '#e9d5ff' },
                                                        };
                                                        const c = colorMap[indicator.type] || colorMap.info;
                                                        // SVG ikonları — referans görsellerdeki stilde
                                                        const svgIcons: Record<string, React.ReactNode> = {
                                                            mute: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill={c.text} opacity="0.9" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke={c.text} strokeWidth="2" fill="none" /><line x1="2" y1="2" x2="22" y2="22" stroke={c.text} strokeWidth="2.5" strokeLinecap="round" /></svg>,
                                                            unmute: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill={c.text} opacity="0.9" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke={c.text} strokeWidth="2" fill="none" /><line x1="12" y1="19" x2="12" y2="23" stroke={c.text} strokeWidth="2" strokeLinecap="round" /></svg>,
                                                            gag: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill={c.text} opacity="0.8" /><line x1="8" y1="8" x2="16" y2="16" stroke={c.bg.includes('180,83,9') ? '#92400e' : '#1e293b'} strokeWidth="2.5" strokeLinecap="round" /><line x1="16" y1="8" x2="8" y2="16" stroke={c.bg.includes('180,83,9') ? '#92400e' : '#1e293b'} strokeWidth="2.5" strokeLinecap="round" /></svg>,
                                                            ungag: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill={c.text} opacity="0.8" /><polyline points="8 12 11 15 17 9" stroke="#065f46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>,
                                                            kick: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill={c.text} opacity="0.2" /><path d="M9 21H5a2 2 0 0 1-2-2v-2a4 4 0 0 1 4-4h2" stroke={c.text} strokeWidth="2" strokeLinecap="round" /><circle cx="9" cy="7" r="3" stroke={c.text} strokeWidth="2" fill="none" /><line x1="17" y1="8" x2="23" y2="14" stroke={c.text} strokeWidth="2.5" strokeLinecap="round" /><line x1="23" y1="8" x2="17" y2="14" stroke={c.text} strokeWidth="2.5" strokeLinecap="round" /></svg>,
                                                            hard_kick: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#dc2626" opacity="0.85" /><line x1="8" y1="8" x2="16" y2="16" stroke="white" strokeWidth="3" strokeLinecap="round" /><line x1="16" y1="8" x2="8" y2="16" stroke="white" strokeWidth="3" strokeLinecap="round" /></svg>,
                                                            cam_block: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="14" height="14" rx="2" fill={c.text} opacity="0.7" /><path d="M16 9l5-3v12l-5-3" fill={c.text} opacity="0.5" /><line x1="2" y1="2" x2="22" y2="22" stroke={c.text} strokeWidth="2.5" strokeLinecap="round" /></svg>,
                                                            cam_unblock: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="14" height="14" rx="2" fill={c.text} opacity="0.7" /><path d="M16 9l5-3v12l-5-3" fill={c.text} opacity="0.5" /><polyline points="6 12 9 15 15 9" stroke="#065f46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>,
                                                            exit_browser: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" fill={c.text} opacity="0.7" /><line x1="8" y1="21" x2="16" y2="21" stroke={c.text} strokeWidth="2" strokeLinecap="round" /><line x1="12" y1="17" x2="12" y2="21" stroke={c.text} strokeWidth="2" /><line x1="7" y1="7" x2="17" y2="13" stroke="#7f1d1d" strokeWidth="2.5" strokeLinecap="round" /><line x1="17" y1="7" x2="7" y2="13" stroke="#7f1d1d" strokeWidth="2.5" strokeLinecap="round" /></svg>,
                                                            unban: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill={c.text} opacity="0.3" /><polyline points="7 12 10 15 17 8" stroke={c.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>,
                                                        };
                                                        const labels: Record<string, string> = {
                                                            mute: 'Susturuldu', unmute: 'Ses Açıldı', gag: 'Yazı Yasağı', ungag: 'Yazı Açıldı',
                                                            kick: 'Atıldı', hard_kick: 'Zorla Atıldı', cam_block: 'Kamera Engeli', cam_unblock: 'Kamera Açıldı',
                                                            exit_browser: 'Tarayıcı Kapandı', unban: 'Yasak Kaldırıldı',
                                                        };
                                                        return (
                                                            <div style={{
                                                                position: 'absolute', inset: 0, zIndex: 30,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                background: c.bg,
                                                                borderRadius: 10,
                                                                border: `1px solid ${c.border}`,
                                                                backdropFilter: 'blur(4px)',
                                                                animation: 'actionIndicatorFade 3.5s ease-in-out forwards',
                                                                pointerEvents: 'none',
                                                            }}>
                                                                <span style={{
                                                                    fontSize: 11, fontWeight: 700, color: c.text,
                                                                    textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                                                                    display: 'flex', alignItems: 'center', gap: 5,
                                                                }}>
                                                                    {svgIcons[indicator.action] || <span style={{ fontSize: 14 }}>{indicator.icon}</span>}
                                                                    {labels[indicator.action] || indicator.action}
                                                                </span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </>
                                        )}

                                        {/* ═══ SPEAKER MIC ICON — kartın sağında ses dalgası efektli ═══ */}
                                        {isSpeaker && !isGodMasterSpecialMode && (
                                            <div className="flex-shrink-0 ml-auto pl-2 relative flex items-center justify-center" style={{ width: 36, height: 36 }}>
                                                {/* Ses dalgası çubukları */}
                                                <div className="absolute inset-0 flex items-center justify-center gap-[2px]">
                                                    {[0, 0.15, 0.3, 0.45, 0.6].map((delay, i) => (
                                                        <div key={i} style={{
                                                            width: 2.5,
                                                            height: [8, 14, 18, 14, 8][i],
                                                            borderRadius: 2,
                                                            background: 'linear-gradient(180deg, #34d399, #059669)',
                                                            opacity: 0.5,
                                                            animation: `speakerBarBounce 1.2s ease-in-out ${delay}s infinite`,
                                                        }} />
                                                    ))}
                                                </div>
                                                <style>{`
                                                    @keyframes speakerBarBounce {
                                                        0%, 100% { transform: scaleY(0.4); opacity: 0.4; }
                                                        50% { transform: scaleY(1); opacity: 0.9; }
                                                    }
                                                `}</style>
                                            </div>
                                        )}

                                        {/* ═══ ACTION INDICATOR CSS — her zaman yüklenmeli, speaker'a bağımlı olmamalı ═══ */}
                                        <style>{`
                                            @keyframes actionIndicatorFade {
                                                0% { opacity: 0; transform: scale(0.9); }
                                                8% { opacity: 1; transform: scale(1); }
                                                80% { opacity: 1; transform: scale(1); }
                                                100% { opacity: 0; transform: scale(0.95); }
                                            }
                                        `}</style>

                                        {/* ═══ QUEUE HAND ICON — kartın sağında yanıp sönen el ═══ */}
                                        {queueIndex !== -1 && !isSpeaker && !isGodMasterSpecialMode && (
                                            <div className="flex-shrink-0 ml-auto pl-2 relative flex items-center justify-center" style={{ width: 36, height: 36 }}>
                                                <div className="relative flex items-center justify-center" style={{
                                                    animation: 'queueHandPulse 1.5s ease-in-out infinite',
                                                }}>
                                                    <span style={{ fontSize: 18, filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.6))' }}>✋</span>
                                                    <span className="absolute -bottom-1 -right-1 text-[8px] font-black text-amber-300 bg-amber-600/60 rounded-full w-3.5 h-3.5 flex items-center justify-center" style={{
                                                        boxShadow: '0 0 4px rgba(251,191,36,0.5)',
                                                    }}>{queueIndex + 1}</span>
                                                </div>
                                                <style>{`
                                                    @keyframes queueHandPulse {
                                                        0%, 100% { transform: scale(1); opacity: 0.8; }
                                                        50% { transform: scale(1.15); opacity: 1; }
                                                    }
                                                `}</style>
                                            </div>
                                        )}

                                        {/* ═══ Status indicators for GodMaster special modes ═══ */}
                                        {isGodMasterSpecialMode && (
                                            <div className="absolute bottom-0.5 right-1 flex items-center gap-1">
                                                {isSpeaker && (
                                                    <div className="w-4 h-4 bg-green-500/80 rounded-full flex items-center justify-center shadow-[0_0_6px_rgba(34,197,94,0.5)]">
                                                        <Mic className="w-2.5 h-2.5 text-white" />
                                                    </div>
                                                )}
                                                {queueIndex !== -1 && !isSpeaker && (
                                                    <Hand className="w-4 h-4 text-amber-400 animate-pulse" strokeWidth={2.5} />
                                                )}
                                                {(() => {
                                                    const isMyCamera = currentUser?.userId === user.userId && room.state.isCameraOn;
                                                    const hasRemoteVideo = room.state.remoteStreams.some(s => s.peerId === user.userId && s.stream.getVideoTracks().length > 0);
                                                    if (isMyCamera || hasRemoteVideo) {
                                                        return <Camera className="w-4 h-4 text-rose-500 animate-pulse" strokeWidth={2.5} />;
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        )}


                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* BOTTOM CONTROLS — Slim Premium */}
            <div className="slim-controls">

                    {/* 1. DURUM SEÇİCİ */}
                    <div className="relative" ref={statusMenuRef}>
                        <button
                            className="slim-status-pill"
                            onClick={() => setShowStatusMenu(!showStatusMenu)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 14, lineHeight: 1 }}>{getStatusEmoji(currentUser?.status as string)}</span>
                                <div style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: currentUser?.status === 'busy' ? '#ef4444'
                                        : currentUser?.status === 'away' || currentUser?.status === 'outside' ? '#f59e0b'
                                            : currentUser?.status === 'phone' ? '#22d3ee'
                                                : '#22c55e',
                                    boxShadow: `0 0 6px ${currentUser?.status === 'busy' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
                                }} />
                                <span style={{ fontSize: 10, fontWeight: 900, color: '#e2e8f0', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                                    {getStatusLabel(currentUser?.status as string)}
                                </span>
                            </div>
                            <ChevronDown style={{
                                width: 14, height: 14, color: '#94a3b8',
                                transition: 'transform 0.2s',
                                transform: showStatusMenu ? 'rotate(180deg)' : 'none',
                            }} />
                        </button>

                        {/* STATUS DROPDOWN MENU */}
                        {showStatusMenu && (
                            <div className="slim-dropdown" style={{
                                position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 6, zIndex: 100,
                                animation: 'contentFadeIn 0.2s ease both',
                            }}>
                                <div style={{ padding: '5px 10px', borderBottom: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: 8, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Durumunu Değiştir</span>
                                </div>

                                {/* TEMEL DURUMLAR */}
                                {([
                                    { key: 'online', emoji: '🟢', label: t.statusOnline, color: '#22c55e' },
                                    { key: 'busy', emoji: '🔴', label: t.statusBusy, color: '#ef4444' },
                                    { key: 'away', emoji: '🟡', label: t.statusWillReturn, color: '#f59e0b' },
                                ] as const).map(({ key, emoji, label, color }) => {
                                    const isActive = currentUser?.status === key && !currentUser?.isStealth;
                                    return (
                                        <button
                                            key={key}
                                            style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                                                padding: '5px 10px', border: 'none', cursor: 'pointer',
                                                background: isActive ? '#f0f7ff' : 'transparent',
                                                borderBottom: '1px solid #f1f5f9',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                            onClick={() => {
                                                room.actions.changeStatus(key);
                                                // ★ Status'u sessionStorage'a kaydet — oda geçişinde korunsun
                                                if (typeof window !== 'undefined') sessionStorage.setItem('soprano_user_status', key);
                                                if (currentUser?.isStealth) room.actions.toggleStealth();
                                                if (isGodMaster && currentUser?.visibilityMode !== 'visible') room.actions.setGodmasterVisibility('visible');
                                                setShowStatusMenu(false);
                                            }}
                                        >
                                            <span style={{ fontSize: 13, width: 18, textAlign: 'center' }}>{emoji}</span>
                                            <span style={{ fontSize: 11, fontWeight: isActive ? 800 : 600, color: isActive ? color : '#475569' }}>{label}</span>
                                            {isActive && <span style={{ marginLeft: 'auto', fontSize: 8, color, fontWeight: 900 }}>●</span>}
                                        </button>
                                    );
                                })}

                                {/* GELİŞMİŞ DURUMLAR */}
                                {getRoleLevel(currentUser?.role) >= 3 && (
                                    <>
                                        <div style={{ borderTop: '1px solid #e2e8f0' }} />
                                        {([
                                            { key: 'outside', emoji: '🚶', label: t.statusOutside, color: '#f59e0b' },
                                            { key: 'phone', emoji: '📞', label: t.statusOnPhone, color: '#22d3ee' },
                                        ] as const).map(({ key, emoji, label, color }) => {
                                            const isActive = currentUser?.status === key;
                                            return (
                                                <button
                                                    key={key}
                                                    style={{
                                                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                                        padding: '8px 14px', border: 'none', cursor: 'pointer',
                                                        background: isActive ? '#f0f7ff' : 'transparent',
                                                        borderBottom: '1px solid #f1f5f9',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                                    onClick={() => {
                                                        room.actions.changeStatus(key);
                                                        // ★ Status'u sessionStorage'a kaydet
                                                        if (typeof window !== 'undefined') sessionStorage.setItem('soprano_user_status', key);
                                                        setShowStatusMenu(false);
                                                    }}
                                                >
                                                    <span style={{ fontSize: 13, width: 18, textAlign: 'center' }}>{emoji}</span>
                                                    <span style={{ fontSize: 11, fontWeight: isActive ? 800 : 600, color: isActive ? color : '#475569' }}>{label}</span>
                                                    {isActive && <span style={{ marginLeft: 'auto', fontSize: 8, color, fontWeight: 900 }}>●</span>}
                                                </button>
                                            );
                                        })}
                                    </>
                                )}

                                {/* GÖRÜNMEZLİK */}
                                {canStealth && (
                                    <>
                                        <div style={{ borderTop: '1px solid #e2e8f0' }} />
                                        <button
                                            style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                                                padding: '5px 10px', border: 'none', cursor: 'pointer',
                                                background: currentUser?.isStealth ? '#f0f7ff' : 'transparent',
                                                borderBottom: '1px solid #f1f5f9',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                            onMouseLeave={e => { if (!currentUser?.isStealth) e.currentTarget.style.background = 'transparent'; }}
                                            onClick={() => { room.actions.toggleStealth(); setShowStatusMenu(false); }}
                                        >
                                            <span style={{ fontSize: 13, width: 18, textAlign: 'center' }}>👻</span>
                                            <span style={{ fontSize: 11, fontWeight: currentUser?.isStealth ? 800 : 600, color: currentUser?.isStealth ? '#1e293b' : '#475569' }}>{t.statusInvisible}</span>
                                            {currentUser?.isStealth && <span style={{ marginLeft: 'auto', fontSize: 8, color: '#1e293b', fontWeight: 900 }}>●</span>}
                                        </button>
                                    </>
                                )}

                                {/* GODMASTER MODLARI */}
                                {isGodMaster && (
                                    <>
                                        <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 2 }} />
                                        <div style={{ padding: '4px 10px' }}>
                                            <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(192,132,252,0.6)' }}>🔱 GodMaster Modu</span>
                                        </div>

                                        <button
                                            style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                                                padding: '5px 10px', border: 'none', cursor: 'pointer',
                                                background: currentUser?.visibilityMode === 'visible' ? 'rgba(192,132,252,0.08)' : 'transparent',
                                                borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                            onMouseLeave={e => { if (currentUser?.visibilityMode !== 'visible') e.currentTarget.style.background = 'transparent'; }}
                                            onClick={() => { room.actions.setGodmasterVisibility('visible'); setShowStatusMenu(false); setShowDisguiseInput(false); }}
                                        >
                                            <span style={{ fontSize: 10, width: 14, textAlign: 'center' }}>🔱</span>
                                            <span style={{ fontSize: 10, fontWeight: currentUser?.visibilityMode === 'visible' ? 800 : 600, color: currentUser?.visibilityMode === 'visible' ? '#9333ea' : '#475569' }}>Görünür (GodMaster)</span>
                                            {currentUser?.visibilityMode === 'visible' && <span style={{ marginLeft: 'auto', fontSize: 8, color: '#c084fc', fontWeight: 900 }}>●</span>}
                                        </button>

                                        <button
                                            style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                                                padding: '5px 10px', border: 'none', cursor: 'pointer',
                                                background: currentUser?.visibilityMode === 'disguised' ? 'rgba(59,130,246,0.08)' : 'transparent',
                                                borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                            onMouseLeave={e => { if (currentUser?.visibilityMode !== 'disguised') e.currentTarget.style.background = 'transparent'; }}
                                            onClick={() => {
                                                if (currentUser?.visibilityMode === 'disguised') {
                                                    room.actions.setGodmasterVisibility('hidden');
                                                    setShowDisguiseInput(false);
                                                } else {
                                                    setShowDisguiseInput(true);
                                                }
                                            }}
                                        >
                                            <span style={{ fontSize: 10, width: 14, textAlign: 'center' }}>👤</span>
                                            <span style={{ fontSize: 10, fontWeight: currentUser?.visibilityMode === 'disguised' ? 800 : 600, color: currentUser?.visibilityMode === 'disguised' ? '#3b82f6' : '#475569' }}>{t.disguiseAsGuest}</span>
                                            {currentUser?.visibilityMode === 'disguised' && <span style={{ marginLeft: 'auto', fontSize: 8, color: '#60a5fa', fontWeight: 900 }}>●</span>}
                                        </button>

                                        {showDisguiseInput && (
                                            <div style={{ padding: '4px 10px', display: 'flex', gap: 5 }}>
                                                <input
                                                    type="text" value={disguiseName}
                                                    onChange={(e) => setDisguiseName(e.target.value)}
                                                    placeholder={t.disguisePlaceholder}
                                                    className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && disguiseName.trim()) {
                                                            room.actions.setGodmasterVisibility('disguised', disguiseName.trim());
                                                            setShowStatusMenu(false); setShowDisguiseInput(false); setDisguiseName('');
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (disguiseName.trim()) {
                                                            room.actions.setGodmasterVisibility('disguised', disguiseName.trim());
                                                            setShowStatusMenu(false); setShowDisguiseInput(false); setDisguiseName('');
                                                        }
                                                    }}
                                                    className="px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] rounded-lg font-bold transition-colors"
                                                >{t.confirm}</button>
                                            </div>
                                        )}

                                        <button
                                            style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: 7,
                                                padding: '5px 10px', border: 'none', cursor: 'pointer',
                                                background: (!currentUser?.visibilityMode || currentUser?.visibilityMode === 'hidden') ? '#f0f7ff' : 'transparent',
                                                transition: 'background 0.15s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                                            onMouseLeave={e => { if (currentUser?.visibilityMode && currentUser?.visibilityMode !== 'hidden') e.currentTarget.style.background = 'transparent'; }}
                                            onClick={() => { room.actions.setGodmasterVisibility('hidden'); setShowStatusMenu(false); setShowDisguiseInput(false); }}
                                        >
                                            <span style={{ fontSize: 10, width: 14, textAlign: 'center' }}>👻</span>
                                            <span style={{ fontSize: 10, fontWeight: (!currentUser?.visibilityMode || currentUser?.visibilityMode === 'hidden') ? 800 : 600, color: (!currentUser?.visibilityMode || currentUser?.visibilityMode === 'hidden') ? '#1e293b' : '#475569' }}>{t.statusInvisible}</span>
                                            {(!currentUser?.visibilityMode || currentUser?.visibilityMode === 'hidden') && <span style={{ marginLeft: 'auto', fontSize: 8, color: '#1e293b', fontWeight: 900 }}>●</span>}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 2. DUYURU BİLDİRİM — Modern Glassmorphism */}
                    {room.state.announcement && (
                        <div className="relative" style={{ margin: '2px 0' }}>
                            <button
                                className="group"
                                onClick={() => {
                                    if (showAnnouncementPanel) {
                                        setShowAnnouncementPanel(false);
                                    } else {
                                        setShowAnnouncementPanel(true);
                                        room.actions.markAnnouncementSeen();
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 10px',
                                    borderRadius: 12,
                                    border: room.state.hasNewAnnouncement
                                        ? '1px solid rgba(251,191,36,0.35)'
                                        : '1px solid rgba(255,255,255,0.08)',
                                    background: room.state.hasNewAnnouncement
                                        ? 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.06) 100%)'
                                        : 'rgba(255,255,255,0.03)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    boxShadow: room.state.hasNewAnnouncement
                                        ? '0 2px 12px rgba(251,191,36,0.1), inset 0 1px 0 rgba(255,255,255,0.06)'
                                        : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                                }}
                            >
                                {/* İkon */}
                                <div style={{
                                    width: 28, height: 28, borderRadius: 8,
                                    background: room.state.hasNewAnnouncement
                                        ? 'linear-gradient(135deg, rgba(251,191,36,0.25), rgba(245,158,11,0.15))'
                                        : 'rgba(255,255,255,0.05)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                    border: room.state.hasNewAnnouncement
                                        ? '1px solid rgba(251,191,36,0.3)'
                                        : '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <span style={{
                                        fontSize: 13,
                                        filter: room.state.hasNewAnnouncement ? 'drop-shadow(0 0 4px rgba(251,191,36,0.5))' : 'none',
                                    }}>📢</span>
                                </div>

                                {/* Metin */}
                                <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                                    <div style={{
                                        fontSize: 9, fontWeight: 800,
                                        color: room.state.hasNewAnnouncement ? '#fcd34d' : '#94a3b8',
                                        letterSpacing: '0.12em', textTransform: 'uppercase',
                                    }}>
                                        {t.announcements}
                                    </div>
                                    <div style={{
                                        fontSize: 10, color: '#cbd5e1',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                        marginTop: 1,
                                    }}>
                                        {room.state.announcement.message?.substring(0, 40)}...
                                    </div>
                                </div>

                                {/* Yeni badge */}
                                {room.state.hasNewAnnouncement && (
                                    <span style={{
                                        fontSize: 7, fontWeight: 900, color: '#fcd34d',
                                        padding: '2px 6px', borderRadius: 4,
                                        background: 'rgba(251,191,36,0.15)',
                                        border: '1px solid rgba(251,191,36,0.25)',
                                        animation: 'pulse 2s ease-in-out infinite',
                                        flexShrink: 0, letterSpacing: '0.1em',
                                    }}>YENİ</span>
                                )}

                                {/* Chevron */}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                    stroke={room.state.hasNewAnnouncement ? '#fcd34d' : '#64748b'}
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    style={{
                                        transition: 'transform 0.3s',
                                        transform: showAnnouncementPanel ? 'rotate(180deg)' : 'rotate(0)',
                                        flexShrink: 0,
                                    }}
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>

                            {/* Açılır Duyuru Kartı */}
                            {showAnnouncementPanel && room.state.announcement && (
                                <div style={{
                                    marginTop: 4, borderRadius: 14, overflow: 'hidden',
                                    background: 'linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.9) 100%)',
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(251,191,36,0.15)',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08)',
                                    animation: 'contentFadeIn 0.3s ease both',
                                }}>
                                    {/* Header */}
                                    <div style={{
                                        padding: '10px 14px',
                                        background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(245,158,11,0.04) 100%)',
                                        borderBottom: '1px solid rgba(251,191,36,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 12 }}>📢</span>
                                            <span style={{
                                                fontSize: 10, fontWeight: 800,
                                                color: '#fcd34d', textTransform: 'uppercase',
                                                letterSpacing: '0.12em',
                                            }}>{t.announcement}</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setShowAnnouncementPanel(false); }}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: 6, cursor: 'pointer', color: '#94a3b8',
                                                width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.2s',
                                            }}>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    </div>

                                    {/* İçerik */}
                                    <div style={{ padding: '12px 14px' }}>
                                        <p style={{
                                            fontSize: 12, color: '#e2e8f0', lineHeight: 1.6,
                                            margin: 0, fontWeight: 500,
                                        }}>{room.state.announcement.message}</p>
                                        <div style={{
                                            marginTop: 8, paddingTop: 8,
                                            borderTop: '1px solid rgba(255,255,255,0.04)',
                                            display: 'flex', alignItems: 'center', gap: 4,
                                        }}>
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                                            </svg>
                                            <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>
                                                {new Date(room.state.announcement.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. RADYO WIDGET */}
                    <RadioPlayer />

            </div>

            <style>{`
                @keyframes contentFadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes neonPulseRed {
                    0%, 100% {
                        box-shadow: 0 0 10px rgba(255,50,50,0.7), 0 0 25px rgba(255,50,50,0.5), 0 0 50px rgba(255,50,50,0.3), 0 0 80px rgba(255,50,50,0.15), inset 0 1px 0 rgba(255,255,255,0.2);
                    }
                    50% {
                        box-shadow: 0 0 15px rgba(255,50,50,0.9), 0 0 35px rgba(255,50,50,0.7), 0 0 70px rgba(255,50,50,0.4), 0 0 100px rgba(255,50,50,0.2), inset 0 1px 0 rgba(255,255,255,0.3);
                    }
                }
            `}</style>

                {/* ═══ openPremiumProfile event listener ═══ */}


                {/* MIC REQUEST BUTTON — toplantı odasında gizle (toolbar'da mic toggle var) */}
                {!isMeetingRoom && <>

                    {/* MIC REQUEST BUTTON */}
                    <button
                        onClick={() => {
                            if (room?.state?.banInfo) return;
                            if (isMicOn) {
                                room.actions.releaseMic();
                            } else if (isSomeoneElseSpeaker) {
                                if (isInQueue) {
                                    room.actions.leaveQueue();
                                } else {
                                    room.actions.joinQueue();
                                }
                            } else {
                                room.actions.takeMic();
                            }
                        }}
                        className={`mic-reactor group mt-2 cursor-pointer relative ${isMicOn ? 'speaking' : ''} ${isInQueue ? 'queueing' : ''} max-md:sticky max-md:bottom-0 max-md:z-50 max-md:bg-[#070b14]/95 max-md:border-t max-md:border-white/5 max-md:backdrop-blur-sm`}
                        style={{
                            background: isMicOn
                                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 40%, #b91c1c 70%, #dc2626 100%)'
                                : isInQueue
                                    ? 'linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(245,158,11,0.10) 50%, rgba(251,191,36,0.06) 100%)'
                                    : 'linear-gradient(135deg, rgba(123,159,239,0.22) 0%, rgba(90,127,212,0.14) 50%, rgba(123,159,239,0.08) 100%)',
                            borderRadius: 14,
                            border: isMicOn
                                ? '1px solid rgba(255,80,80,0.8)'
                                : isInQueue
                                    ? '1px solid rgba(251,191,36,0.30)'
                                    : '1px solid rgba(123,159,239,0.30)',
                            boxShadow: isMicOn
                                ? '0 0 10px rgba(255,50,50,0.7), 0 0 25px rgba(255,50,50,0.5), 0 0 50px rgba(255,50,50,0.3), 0 0 80px rgba(255,50,50,0.15), inset 0 1px 0 rgba(255,255,255,0.2)'
                                : isInQueue
                                    ? '0 2px 12px rgba(251,191,36,0.12), 0 0 20px rgba(251,191,36,0.05), inset 0 1px 0 rgba(255,255,255,0.06)'
                                    : '0 2px 12px rgba(123,159,239,0.12), 0 0 20px rgba(123,159,239,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
                            padding: '16px 18px',
                            transition: 'all 0.3s ease',
                            overflow: 'hidden',
                            animation: isMicOn ? 'neonPulseRed 1.5s ease-in-out infinite' : 'none',
                        }}
                    >
                        <div className={`reactor-core ${isMicOn ? 'speaking' : ''} ${isInQueue ? 'queueing' : ''}`}>
                            <div className="reactor-lines"></div>
                            {isMicOn ? (
                                <MicOff className="w-5 h-5 relative z-20" style={{ color: '#ffffff' }} />
                            ) : isInQueue ? (
                                <Hand className="w-5 h-5 relative z-20 animate-pulse" style={{ color: '#fbbf24' }} />
                            ) : (
                                <svg className="w-5 h-5 relative z-20" viewBox="0 0 24 24" fill="none" style={{ color: '#7b9fef' }}>
                                    <rect x="8" y="2" width="8" height="13" rx="4" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" />
                                    <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    <line x1="9" y1="22" x2="15" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            )}
                        </div>
                        <div className="flex-1 flex flex-col items-start ml-3">
                            <span className={`text-xs font-bold tracking-widest transition-colors
                            ${isMicOn ? 'text-red-300' : isInQueue ? 'text-amber-300' : 'text-white'}
                        `}>
                                {isSomeoneElseSpeaker
                                    ? (isInQueue ? 'SIRADAN ÇIK' : 'SIRAYA GİR')
                                    : (isMicOn ? 'MİKROFONU BIRAK' : (isHasbihal ? 'KELAM İSTE' : isMidnight ? 'Mikrofon İste' : 'MİKROFON AL'))}
                            </span>
                        </div>
                        <div className={`w-2 h-2 rounded-full animate-pulse
                         ${isMicOn ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : isSomeoneElseSpeaker ? 'bg-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]'}
                    `}></div>
                    </button>
                </>}

            </div>{/* end collapse wrapper */}

            {/* GodMaster Premium Profile Modal — toolbar'dan açılır */}
            {isGodMasterUser && (
                <GodMasterProfileModal
                    isOpen={showGodMasterModal}
                    onClose={() => setShowGodMasterModal(false)}
                    currentUser={currentUser}
                    onChangeAvatar={(avatar) => { onChangeAvatar?.(avatar); }}
                    onChangeName={(name) => { onChangeName?.(name); }}
                    onChangeNameColor={(color) => { onChangeNameColor?.(color); }}
                    onChangeIcon={() => {}}
                />
            )}

            {/* ═══ HESAP PANELİ — visible when profile is open ═══ */}
            {isProfileOpen && (
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column' as const,
                minHeight: 0,
            }}>
                <SidebarProfilePanel
                    currentUser={currentUser}
                    onClose={() => onCloseProfile?.()}
                    onChangeName={onChangeName}
                    onChangeAvatar={onChangeAvatar}
                    onChangeNameColor={onChangeNameColor}
                    onChangePassword={onChangePassword}
                />
            </div>
            )}

        </aside >
    );
}

// ═══════════════════════════════════════════════════════
// SIDEBAR PROFILE PANEL — Hesap Paneli style
// ═══════════════════════════════════════════════════════
const ALL_AVATARS = [
    '/avatars/male_1.png', '/avatars/male_2.png', '/avatars/male_3.png', '/avatars/male_4.png',
    '/avatars/female_1.png', '/avatars/female_2.png', '/avatars/female_3.png', '/avatars/female_4.png',
    '/avatars/neutral_1.png', '/avatars/neutral_2.png', '/avatars/neutral_3.png', '/avatars/neutral_4.png',
];
const NAME_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6',
    '#8b5cf6', '#ec4899', '#ffffff', '#94a3b8', '#fbbf24', '#34d399',
];

const getRoleBadge = (role?: string) => {
    switch (role?.toLowerCase()) {
        case 'godmaster': return '🔱 GodMaster';
        case 'owner': return '👑 Owner';
        case 'super_admin': case 'superadmin': return '⚡ Süper Admin';
        case 'admin': return '🛡️ Admin';
        case 'moderator': return '🔧 Moderatör';
        case 'operator': return '🎯 Operatör';
        case 'vip': return '💎 VIP';
        case 'member': return '✦ Üye';
        default: return '👤 Misafir';
    }
};
const getRoleBadgeColor = (role?: string) => {
    switch (role?.toLowerCase()) {
        case 'godmaster': return '#d946ef';
        case 'owner': return '#fbbf24';
        case 'super_admin': case 'superadmin': return '#7b9fef';
        case 'admin': return '#60a5fa';
        case 'moderator': return '#34d399';
        case 'operator': return '#22d3ee';
        case 'vip': return '#fde047';
        case 'member': return '#38bdf8';
        default: return '#94a3b8';
    }
};

function SidebarProfilePanel({ currentUser, onClose, onChangeName, onChangeAvatar, onChangeNameColor, onChangePassword }: {
    currentUser: any;
    onClose: () => void;
    onChangeName?: (name: string) => void;
    onChangeAvatar?: (avatar: string) => void;
    onChangeNameColor?: (color: string) => void;
    onChangePassword?: (oldPass: string, newPass: string) => void;
}) {
    const [activeTab, setActiveTab] = useState<'profil' | 'ayarlar'>('profil');
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
    const [newName, setNewName] = useState(currentUser?.username || '');
    const [selectedColor, setSelectedColor] = useState(currentUser?.nameColor || '#ffffff');
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    const roleColor = getRoleBadgeColor(currentUser?.role);
    const isMember = currentUser?.isMember || ['member', 'vip', 'operator', 'moderator', 'admin', 'super_admin', 'superadmin', 'owner', 'godmaster'].includes(currentUser?.role?.toLowerCase() || '');
    const isGodMasterRole = currentUser?.role?.toLowerCase() === 'godmaster';
    const [showGodMasterModal, setShowGodMasterModal] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => onClose(), 350);
    };

    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            overflowY: 'auto', padding: '12px',
            animation: isClosing
                ? 'profileBlurOut 0.4s cubic-bezier(0.4, 0, 1, 1) both'
                : 'profileSlideIn 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both',
        }}>
            <style>{`
                @keyframes profileSlideIn {
                    0% { opacity: 0; transform: translateY(30px) scale(0.97); filter: blur(8px); }
                    100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
                }
                @keyframes profileBlurOut {
                    0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
                    100% { opacity: 0; transform: translateY(20px) scale(0.95); filter: blur(12px); }
                }
                .profile-glossy {
                    background:
                        radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%),
                        linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%),
                        linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.55) 100%);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-top: 1px solid rgba(255,255,255,0.35);
                    border-left: 1px solid rgba(255,255,255,0.2);
                    box-shadow:
                        0 4px 16px rgba(0,0,0,0.15),
                        inset 0 1px 0 rgba(255,255,255,0.06);
                    border-radius: 22px;
                    overflow: visible;
                }
                .profile-glossy .profile-input-inset {
                    background: rgba(0,0,0,0.2);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-top: 1px solid rgba(0,0,0,0.4);
                    box-shadow: inset 0 3px 6px rgba(0,0,0,0.3);
                    border-radius: 10px;
                    color: #fff;
                    transition: all 0.2s ease;
                    font-family: inherit;
                    outline: none;
                }
                .profile-glossy .profile-input-inset:focus {
                    background: rgba(0,0,0,0.3);
                    border-color: #38bdf8;
                    box-shadow: inset 0 3px 6px rgba(0,0,0,0.4), 0 0 10px rgba(56,189,248,0.2);
                }
                .profile-glossy .profile-input-inset::placeholder {
                    color: rgba(255,255,255,0.3);
                }
                .profile-glossy .profile-action-btn {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    outline: none;
                    cursor: pointer;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    transition: all 0.3s ease;
                    overflow: hidden;
                    font-family: inherit;
                    background: linear-gradient(180deg, rgba(56,189,248,0.25) 0%, rgba(2,132,199,0.35) 100%);
                    color: #bae6fd;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05);
                }
                .profile-glossy .profile-action-btn:hover {
                    background: linear-gradient(180deg, rgba(56,189,248,0.35) 0%, rgba(2,132,199,0.45) 100%);
                    box-shadow: 0 6px 24px rgba(56,189,248,0.2), inset 0 1px 0 rgba(255,255,255,0.2);
                    transform: translateY(-1px);
                }
                .profile-glossy .profile-action-btn:active {
                    transform: translateY(1px);
                }
            `}</style>

            {/* profile-glossy wrapper — HomePage hesap paneli kartı */}
            <div className="profile-glossy" style={{
                padding: '12px 14px', position: 'relative', zIndex: 10,
                display: 'flex', flexDirection: 'column', flex: 1,
            }}>
                {/* Başlık */}
                <h3 style={{
                    fontSize: 11, fontWeight: 900, color: '#fff', textTransform: 'uppercase',
                    letterSpacing: 2, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8,
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                }}>
                    <button onClick={handleClose} style={{
                        width: 26, height: 26, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(0,0,0,0.25)', color: '#94a3b8', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                        transition: 'all 0.2s',
                    }}>←</button>
                    <span style={{ color: '#fbbf24', fontSize: 16 }}>👤</span> Hesap Paneli
                </h3>

                {/* Avatar Kartı — HomePage tarzı */}
                <div style={{
                    textAlign: 'center', marginBottom: 12, padding: '14px 0',
                }}>
                    <div style={{
                        width: 66, height: 66, borderRadius: '50%', margin: '0 auto 8px',
                        border: '2px solid rgba(56,189,248,0.4)',
                        boxShadow: '0 0 14px rgba(56,189,248,0.15), 0 8px 20px rgba(0,0,0,0.4)',
                        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                    }}>
                        <img
                            src={(() => {
                            const av = selectedAvatar || currentUser?.avatar || '/avatars/neutral_1.png';
                            return av.startsWith('animated:') || av.startsWith('gifnick::') ? '/avatars/neutral_1.png' : av;
                        })()}
                            alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                        />
                    </div>
                    <h4 style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: '0 0 4px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        {currentUser?.displayName || currentUser?.username || 'Kullanıcı'}
                    </h4>
                    <p style={{
                        fontSize: 11, fontWeight: 700,
                        color: isMember ? '#fbbf24' : '#38bdf8',
                        textTransform: 'uppercase', letterSpacing: 2, margin: 0,
                    }}>
                        {isMember ? (currentUser?.role === 'owner' ? '👑 Owner' : currentUser?.role === 'admin' ? '🛡️ Admin' : '✦ Üye') : '👤 Misafir'}
                    </p>
                </div>

                {/* Sekmeler — HomePage tarzı (pill container) */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 14, padding: '3px', background: 'rgba(0,0,0,0.25)', borderRadius: 10 }}>
                    {([['profil', '👤 Profil'], ['ayarlar', '⚙️ Ayarlar']] as const).map(([tab, label]) => (
                        <button key={tab} onClick={() => { setActiveTab(tab); setError(''); setSuccess(''); }}
                            style={{
                                flex: 1, padding: '6px 0', fontSize: 9, fontWeight: 700, border: 'none',
                                borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase',
                                letterSpacing: 1, transition: 'all 0.25s ease',
                                background: activeTab === tab ? 'rgba(56,189,248,0.2)' : 'transparent',
                                color: activeTab === tab ? '#7dd3fc' : 'rgba(255,255,255,0.4)',
                            }}
                        >{label}</button>
                    ))}
                </div>

                {/* Mesajlar */}
                {success && <p style={{ fontSize: 12, color: '#34d399', fontWeight: 600, textAlign: 'center', marginBottom: 8 }}>✅ {success}</p>}
                {error && <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, textAlign: 'center', marginBottom: 8 }}>⚠ {error}</p>}

                {/* ═══ PROFİL TAB ═══ */}
                {activeTab === 'profil' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>



                        {/* Avatar Değiştir */}
                        <button type="button" onClick={() => setShowAvatarPicker(!showAvatarPicker)} style={{
                            width: '100%', padding: '8px 0', fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                            textTransform: 'uppercase', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8,
                            cursor: 'pointer',
                            background: showAvatarPicker ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.2)',
                            color: showAvatarPicker ? '#c4b5fd' : 'rgba(255,255,255,0.4)',
                            transition: 'all 0.3s ease',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                            🎨 {showAvatarPicker ? 'Kapat' : 'Avatar Değiştir'}
                        </button>

                        {/* Avatar Grid — animasyonlu açılır */}
                        <div style={{
                            maxHeight: showAvatarPicker ? 220 : 0, opacity: showAvatarPicker ? 1 : 0,
                            overflow: 'hidden', transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}>
                            <style>{`
                                .profile-avatar-scroll::-webkit-scrollbar { width: 3px; }
                                .profile-avatar-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 3px; }
                                .profile-avatar-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.25); border-radius: 3px; }
                                .profile-avatar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.4); }
                                .profile-avatar-scroll { scrollbar-width: thin; scrollbar-color: rgba(148,163,184,0.25) transparent; }
                            `}</style>
                            <div className="profile-avatar-scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8, maxHeight: 160, overflowY: 'auto', paddingRight: 4 }}>
                                {ALL_AVATARS.map((av) => (
                                    <button key={av} type="button" onClick={() => setSelectedAvatar(av)} style={{
                                        padding: 2, border: 'none', borderRadius: '50%', cursor: 'pointer',
                                        background: 'transparent', transition: 'all 0.25s ease',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transform: (selectedAvatar || currentUser?.avatar) === av ? 'scale(1.1)' : 'scale(1)',
                                        opacity: (selectedAvatar || currentUser?.avatar) !== av ? 0.5 : 1,
                                        boxShadow: selectedAvatar === av ? '0 0 0 2px #38bdf8' : 'none',
                                    }}>
                                        <img src={av} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                                    </button>
                                ))}
                            </div>
                            {selectedAvatar && selectedAvatar !== currentUser?.avatar && (
                                <button className="profile-action-btn" onClick={() => {
                                    onChangeAvatar?.(selectedAvatar);
                                    setSuccess('Avatar güncellendi!');
                                    setSelectedAvatar(null);
                                    setTimeout(() => setSuccess(''), 2000);
                                }} style={{ width: '100%', padding: '6px 0', fontSize: 10, gap: 4 }}>
                                    💾 Avatarı Kaydet
                                </button>
                            )}
                        </div>

                        {/* İsim Değiştir */}
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 6, marginLeft: 2 }}>
                                İsim Değiştir
                            </label>
                            <input
                                value={newName}
                                onChange={(e) => { setNewName(e.target.value); setError(''); }}
                                maxLength={20}
                                placeholder="Yeni isminizi yazın..."
                                style={{
                                    width: '100%', padding: '12px 14px', fontSize: 13, boxSizing: 'border-box',
                                    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderTop: '1px solid rgba(0,0,0,0.4)',
                                    boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.3)',
                                    borderRadius: 10, color: '#fff', outline: 'none', fontFamily: 'inherit',
                                }}
                            />
                            <button onClick={() => {
                                if (!newName.trim() || newName.trim().length < 2) { setError('En az 2 karakter gerekli'); return; }
                                onChangeName?.(newName.trim());
                                setSuccess('İsim güncellendi!');
                                setTimeout(() => setSuccess(''), 2000);
                            }} className="profile-action-btn" style={{ width: '100%', padding: '6px 0', fontSize: 10, gap: 4, marginTop: 6 }}>
                                ✏️ İsmi Kaydet
                            </button>
                        </div>

                        {/* Renk Değiştir */}
                        {isMember && (
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 6, marginLeft: 2 }}>
                                    İsim Rengi
                                </label>
                                <div style={{
                                    textAlign: 'center', padding: '10px 0', marginBottom: 8, borderRadius: 8,
                                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <span style={{ fontSize: 16, fontWeight: 800, color: selectedColor }}>
                                        {currentUser?.username || 'Kullanıcı'}
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, justifyItems: 'center', marginBottom: 8 }}>
                                    {NAME_COLORS.map(c => (
                                        <button key={c} onClick={() => setSelectedColor(c)} style={{
                                            width: 22, height: 22, borderRadius: '50%', cursor: 'pointer',
                                            background: c, border: 'none',
                                            transform: selectedColor === c ? 'scale(1.2)' : 'scale(1)',
                                            boxShadow: selectedColor === c ? `0 0 12px ${c}, 0 0 4px ${c}` : 'none',
                                            transition: 'all 0.2s ease',
                                            opacity: selectedColor && selectedColor !== c ? 0.5 : 1,
                                        }} />
                                    ))}
                                </div>
                                <button onClick={() => {
                                    onChangeNameColor?.(selectedColor);
                                    setSuccess('Renk güncellendi!');
                                    setTimeout(() => setSuccess(''), 2000);
                                }} className="profile-action-btn" style={{ width: '100%', padding: '6px 0', fontSize: 10, gap: 4 }}>
                                    🎨 Rengi Kaydet
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ AYARLAR TAB ═══ */}
                {activeTab === 'ayarlar' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 0, marginLeft: 2 }}>
                            Şifre Değiştir
                        </label>
                        {[
                            { label: 'Mevcut Şifre', value: oldPass, set: setOldPass },
                            { label: 'Yeni Şifre', value: newPass, set: setNewPass },
                            { label: 'Şifre Tekrar', value: confirmPass, set: setConfirmPass },
                        ].map((f, i) => (
                            <div key={i}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 6, marginLeft: 2 }}>
                                    {f.label}
                                </label>
                                <input
                                    type="password"
                                    value={f.value}
                                    onChange={(e) => f.set(e.target.value)}
                                    autoComplete="one-time-code"
                                    style={{
                                        width: '100%', padding: '12px 14px', fontSize: 13, boxSizing: 'border-box',
                                        background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)',
                                        borderTop: '1px solid rgba(0,0,0,0.4)',
                                        boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.3)',
                                        borderRadius: 10, color: '#fff', outline: 'none', fontFamily: 'inherit',
                                    }}
                                />
                            </div>
                        ))}
                        <button onClick={() => {
                            if (!oldPass || !newPass) { setError('Tüm alanları doldurun'); return; }
                            if (newPass.length < 4) { setError('Şifre en az 4 karakter'); return; }
                            if (newPass !== confirmPass) { setError('Şifreler eşleşmiyor'); return; }
                            onChangePassword?.(oldPass, newPass);
                            setSuccess('Şifre güncellendi!');
                            setOldPass(''); setNewPass(''); setConfirmPass('');
                            setTimeout(() => setSuccess(''), 2000);
                        }} className="profile-action-btn" style={{ width: '100%', padding: '10px 0', fontSize: 11, gap: 6 }}>
                            🔒 Şifreyi Değiştir
                        </button>
                    </div>
                )}

                <button onClick={handleClose} style={{
                    width: '100%', padding: '8px 0', marginTop: 'auto', paddingTop: 12,
                    fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(0,0,0,0.2)', color: 'rgba(255,255,255,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all 0.2s ease',
                }}>← Kullanıcı Listesine Dön</button>
            </div>


        </div>
    );
}

