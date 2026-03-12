import { User } from '@/types';
import { generateGenderAvatar } from '@/lib/avatar';
import { ThreeDTextBanner, deserialize3DParams } from '@/components/room/ThreeDTextBanner';
import { Hand, Mic, MicOff, Phone, ChevronUp, Crown, Shield, ShieldCheck, Music, Gem, User as UserIcon, MessageSquareX, Ban, CameraOff, Camera } from 'lucide-react';
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

interface SidebarLeftProps {
    users: User[];
    currentUser: User | null;
    room: ReturnType<typeof useRoomRealtime>;
    onUserContextMenu?: (e: React.MouseEvent, user: User) => void;
    onEmptyContextMenu?: (e: React.MouseEvent) => void;
    isAudioTestOpen?: boolean;
    onCloseAudioTest?: () => void;
    ignoredUsers?: Set<string>;
    // Optional compatibility props
    [key: string]: any;
}

export function SidebarLeft({ users, currentUser, room, onUserContextMenu, onEmptyContextMenu, isAudioTestOpen, onCloseAudioTest, mobileSidebarOpen, onCloseMobileSidebar, ignoredUsers, isMeetingRoom, speakingUsers, isEmbed }: SidebarLeftProps) {
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
            case 'busy': return '⛔';
            case 'away': return '🔙';
            case 'brb': return '🔙';
            case 'outside': return '🚶';
            case 'phone': return '📞';
            case 'stealth': return '👻';
            default: return '✅';
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
            default: return t.statusOnline;
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
            className={`sidebar-left ${isEmbed ? 'w-64' : 'w-80'} flex-shrink-0 flex flex-col min-h-0 border-r border-white/5 z-20 relative max-md:hidden`}
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

                    {/* ═══ LOGO AREA: Custom or Default Wordmark ═══ */}
                    {(brandingPreview?.logoUrl || brandingPreview?.logoName || room.state.systemSettings?.logoUrl) ? (
                        /* ── Custom/preview logo ── */
                        (() => {
                            const ss = room.state.systemSettings || {};
                            const bp = brandingPreview; // null when not previewing
                            const logoSize = (bp?.logoImageSize || ss.logoImageSize) || 112;
                            const offsetX = (bp ? bp.logoOffsetX : ss.logoOffsetX) || 0;
                            const offsetY = (bp ? bp.logoOffsetY : ss.logoOffsetY) || 0;
                            const logoEffect = (bp ? bp.logoEffect : ss.logoEffect) || '';
                            const logoName = (bp ? bp.logoName : ss.logoName) || '';
                            const logoTextSize = (bp ? bp.logoTextSize : ss.logoTextSize) || '1.2rem';
                            const logoTextColor = (bp ? bp.logoTextColor : ss.logoTextColor) || '#a3bfff';
                            const logoTextColor2 = (bp ? bp.logoTextColor2 : ss.logoTextColor2) || '';
                            const textOffsetX = (bp ? bp.textOffsetX : ss.textOffsetX) || 0;
                            const textOffsetY = (bp ? bp.textOffsetY : ss.textOffsetY) || 0;
                            const textEffect = (bp ? bp.textEffect : ss.textEffect) || '';
                            const logoPosition = (bp ? bp.logoPosition : ss.logoPosition) || 'left';
                            const logoUrl = (bp ? bp.logoUrl : ss.logoUrl) || '';

                            // Logo efekt stil objeleri
                            const effectStyles: Record<string, React.CSSProperties> = {
                                glow: { filter: 'drop-shadow(0 0 12px rgba(123,159,239,0.5)) drop-shadow(0 0 24px rgba(123,159,239,0.25))' },
                                pulse: { animation: 'customLogoPulse 2s ease-in-out infinite' },
                                shadow: { filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' },
                                neon: { filter: 'drop-shadow(0 0 8px rgba(99,133,209,0.6)) drop-shadow(0 0 20px rgba(99,133,209,0.3))' },
                                rotate: { animation: 'customLogoRotate 20s linear infinite' },
                            };

                            // Yazı efekt stil objeleri
                            const textEffectStyles: Record<string, React.CSSProperties> = {
                                shimmer: {
                                    background: `linear-gradient(90deg, ${logoTextColor}, #fff, ${logoTextColor2 || logoTextColor})`,
                                    backgroundSize: '200% 100%',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    animation: 'wmFlowLight 3s ease-in-out infinite',
                                },
                                glow: { textShadow: `0 0 10px ${logoTextColor}, 0 0 20px ${logoTextColor}80` },
                                neon: { textShadow: `0 0 4px ${logoTextColor}, 0 0 12px ${logoTextColor}, 0 0 24px ${logoTextColor}60` },
                                shadow: { textShadow: '0 4px 8px rgba(0,0,0,0.6)' },
                                'gradient-anim': {
                                    background: `linear-gradient(90deg, ${logoTextColor}, ${logoTextColor2 || '#fff'}, ${logoTextColor})`,
                                    backgroundSize: '300% 100%',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    animation: 'wmFlowLight 4s ease-in-out infinite',
                                },
                            };

                            return (
                                <div style={{
                                    width: '100%', display: 'flex', flexDirection: 'column',
                                    alignItems: logoPosition === 'center' ? 'center' : 'flex-start',
                                    padding: '8px 0 0 0', overflow: 'visible',
                                }}>
                                    <style>{`
                                        @keyframes customLogoPulse { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.04); opacity: 1; } }
                                        @keyframes customLogoRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                                    `}</style>
                                    <div style={{
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: logoPosition === 'center' ? 'center' : 'flex-start',
                                        width: '100%', gap: 10, paddingLeft: logoPosition === 'center' ? 0 : 8,
                                    }}>
                                        {logoUrl && (
                                            <img
                                                src={logoUrl}
                                                alt="Logo"
                                                style={{
                                                    height: logoSize,
                                                    width: 'auto',
                                                    maxWidth: '100%',
                                                    objectFit: 'contain',
                                                    transform: `translate(${offsetX}px, ${offsetY}px)`,
                                                    transition: 'all 0.3s ease',
                                                    ...effectStyles[logoEffect],
                                                }}
                                            />
                                        )}
                                    </div>
                                    {logoName && (
                                        <div style={{
                                            fontSize: logoTextSize,
                                            fontWeight: 700,
                                            color: logoTextColor,
                                            textAlign: logoPosition === 'center' ? 'center' : 'left',
                                            width: '100%',
                                            paddingLeft: logoPosition === 'center' ? 0 : 8,
                                            marginTop: 4,
                                            transform: `translate(${textOffsetX}px, ${textOffsetY}px)`,
                                            ...(logoTextColor2 && !textEffect ? {
                                                background: `linear-gradient(135deg, ${logoTextColor}, ${logoTextColor2})`,
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text',
                                            } : {}),
                                            ...textEffectStyles[textEffect],
                                        }}>
                                            {logoName}
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    ) : (
                        /* ── Default Brand Logo ── */
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
                    )}
                </div>
            </div>

            {/* AUDIO TEST (replaces user list) or USER LIST */}
            {isAudioTestOpen && onCloseAudioTest ? (
                <AudioTestPanel onClose={onCloseAudioTest} />
            ) : (
                <div className="flex-1 p-6 custom-scrollbar space-y-6 overflow-y-auto" style={{ contain: 'layout style', willChange: 'contents' }}>
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
<<<<<<< HEAD
                                return `/avatars/neutral_1.png`;
=======
                                return generateGenderAvatar(speakerUser.username);
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
                            }
                            return av;
                        })();

                        // Display name
                        const displayName = speakerUser.displayName || speakerUser.username || '';

                        return (
                            <div className="mb-4">
                                <div className="text-[10px] font-extrabold uppercase tracking-widest mb-3 flex items-center gap-2 text-red-400/80">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] animate-pulse"></span>
                                    {t.speaker.toUpperCase()}
                                </div>
                                <div className="flex items-center gap-3 px-3 py-3 rounded-xl" style={{
                                    background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(15,18,28,0.95) 100%)',
                                    border: '1px solid rgba(239,68,68,0.20)',
                                    boxShadow: '0 0 20px rgba(239,68,68,0.06), inset 0 0 15px rgba(239,68,68,0.03)',
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
                                                <div className="absolute inset-[-4px] rounded-full" style={{
                                                    border: '1.5px solid rgba(239,68,68,0.20)',
                                                    animation: 'speakerRipple 2s ease-out infinite',
                                                }} />
                                                <div className="absolute inset-[-4px] rounded-full" style={{
                                                    border: '1.5px solid rgba(239,68,68,0.15)',
                                                    animation: 'speakerRipple 2s ease-out 0.6s infinite',
                                                }} />
                                                <div
                                                    className="w-12 h-12 rounded-full flex items-center justify-center"
                                                    style={{
                                                        border: '2px solid rgba(239,68,68,0.50)',
                                                        boxShadow: '0 0 12px rgba(239,68,68,0.25), 0 0 24px rgba(239,68,68,0.10)',
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
                                        0%, 100% { box-shadow: 0 0 8px rgba(239,68,68,0.20), 0 0 16px rgba(239,68,68,0.10); }
                                        50% { box-shadow: 0 0 14px rgba(239,68,68,0.35), 0 0 28px rgba(239,68,68,0.15); }
                                    }
                                `}</style>
                            </div>
                        );
                    })()}

                    <div>
                        <div className={`admin-card-title text-[10px] font-extrabold uppercase tracking-widest mb-4 flex items-center gap-2 ${isHasbihal ? 'text-[#7b9fef]' : 'text-gold-500'}`} style={isHasbihal ? { fontFamily: "'Aref Ruqaa', serif" } : undefined}>
                            <span className={`w-1 h-1 rounded-full ${isHasbihal ? 'bg-[#7b9fef]' : 'bg-[#7b9fef]'}`}></span> {isHasbihal ? 'MECLİS BAŞKANI' : `${t.online} (${visibleUsers.length})`}
                        </div>

                        <div className="space-y-2">
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
                                        className={`${(isGodMasterSpecialMode && !shouldShowAvatar) || isGifNickMode || isGodMasterGifMode ? '' : 'user-card'} flex items-center ${(isGodMasterSpecialMode && !shouldShowAvatar) || isGifNickMode || isGodMasterGifMode ? 'px-0 py-0' : 'px-3 py-2 rounded-xl'} transition-all duration-300 group cursor-context-menu select-none relative
                                    ${(isGodMasterSpecialMode && !shouldShowAvatar) || isGifNickMode || isGodMasterGifMode
                                                ? ''
                                                : isSelf
                                                    ? 'border border-cyan-400/40 shadow-[0_0_14px_rgba(34,211,238,0.15)]'
                                                    : 'border border-transparent hover:bg-white/[0.04]'}
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
                                        } : isSelf && !isGodMasterSpecialMode ? {
                                            background: isInvisible
                                                ? 'linear-gradient(135deg, rgba(30,41,59,0.3) 0%, rgba(15,23,42,0.4) 50%, rgba(15,23,42,0.5) 100%)'
                                                : 'linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(56,189,248,0.03) 50%, rgba(15,23,42,0.95) 100%)',
                                            border: isInvisible ? '1.5px solid rgba(100,116,139,0.12)' : '1.5px solid rgba(34,211,238,0.25)',
                                            borderRadius: '12px',
                                            overflow: 'hidden',
                                            ...(isInvisible ? { filter: 'grayscale(1) brightness(0.45)', opacity: 0.35 } : {}),
                                        } : isInvisible ? {
                                            filter: 'grayscale(1) brightness(0.6)',
                                            opacity: 0.4,
                                        } : undefined}
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
<<<<<<< HEAD
                                                        <img
                                                            src={`/avatars/neutral_1.png`}
                                                            className={`w-10 h-10 rounded-full border-[1.5px] transition-colors object-cover border-white/15 group-hover:border-[#7b9fef]/40`}
                                                        />
=======
                                                        <div className="w-10 h-10 rounded-full border-[1.5px] border-white/15 group-hover:border-[#7b9fef]/40 flex items-center justify-center transition-colors overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}><img src={user.avatar || generateGenderAvatar(user.displayName || user.username || '?')} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /></div>
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
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
<<<<<<< HEAD
                                                {animShowAvatar && (() => {
                                                    // Kendi kullanıcımız mı? Eğer öyleyse localStorage'dan özel avatar kontrol et
                                                    const isSelf = currentUser && (user.username === currentUser.username || user.displayName === currentUser.displayName);
                                                    let avatarSrc = `/avatars/neutral_1.png`;
                                                    if (isSelf) {
                                                        try {
                                                            const customAvatar = localStorage.getItem('soprano_custom_avatar');
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
=======
                                                {animShowAvatar && (
                                                    <div className="relative flex-shrink-0 mr-2.5">
                                                        <div className="w-10 h-10 rounded-full border-[1.5px] border-white/15 group-hover:border-[#7b9fef]/40 flex items-center justify-center transition-colors overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}><img src={user.avatar || generateGenderAvatar(user.displayName || user.username || '?')} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /></div>
                                                    </div>
                                                )}
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
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
                                                <div className="relative flex-shrink-0">
<<<<<<< HEAD
                                                    <img
                                                        src={(() => {
                                                            const av = user.avatar;
                                                            if (!av || av.startsWith('3d:') || av.startsWith('animated:') || av.startsWith('gifnick::')) {
                                                                return `/avatars/neutral_1.png`;
                                                            }
                                                            // GIF avatarlar sadece GodMaster'a özel — diğer roller için DiceBear fallback
                                                            const isGif = av.toLowerCase().endsWith('.gif') || av.startsWith('data:image/gif');
                                                            if (isGif && user.role?.toLowerCase() !== 'godmaster') {
                                                                return `/avatars/neutral_1.png`;
                                                            }
                                                            return av;
                                                        })()}
                                                        className={`w-10 h-10 rounded-full border-[1.5px] transition-colors object-cover
=======
                                                    {/* Self user glow ring */}
                                                    {isSelf && !isSpeaker && !isGodMasterSpecialMode && !isInvisible && (
                                                        <div className="absolute -inset-[3px] rounded-full" style={{
                                                            background: 'linear-gradient(135deg, rgba(34,211,238,0.6), rgba(56,189,248,0.3), rgba(99,102,241,0.4), rgba(34,211,238,0.6))',
                                                            animation: 'selfRingRotate 4s linear infinite',
                                                            filter: 'blur(1px)',
                                                        }} />
                                                    )}
                                                    <div
                                                        className={`w-10 h-10 rounded-full border-[1.5px] transition-colors flex items-center justify-center
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
                                            ${user.role?.toLowerCase() === 'godmaster'
                                                                ? 'border-fuchsia-400/70 shadow-[0_0_8px_rgba(217,70,239,0.3)]'
                                                                : isOwnerUser ? 'border-amber-400/60 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                                                                    : isSelf ? 'border-cyan-400/60 shadow-[0_0_10px_rgba(34,211,238,0.35)]'
                                                                        : isSpeaker ? 'border-emerald-400/80'
                                                                            : (() => {
                                                                                const r = user.role?.toLowerCase();
                                                                                if (r === 'superadmin') return 'border-indigo-400/50 shadow-[0_0_6px_rgba(99,102,241,0.2)]';
                                                                                if (r === 'admin') return 'border-blue-400/50 shadow-[0_0_6px_rgba(96,165,250,0.2)]';
                                                                                if (r === 'moderator') return 'border-emerald-400/40 shadow-[0_0_4px_rgba(52,211,153,0.15)]';
                                                                                if (r === 'operator') return 'border-cyan-400/40 shadow-[0_0_4px_rgba(34,211,238,0.15)]';
                                                                                if (r === 'vip') return 'border-yellow-400/50 shadow-[0_0_6px_rgba(250,204,21,0.2)]';
                                                                                if (r === 'member') return 'border-slate-400/25 group-hover:border-slate-300/40';
                                                                                return 'border-white/15 group-hover:border-white/25'; // guest
                                                                            })()}
                                        `}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                                            fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const,
                                                            ...(isSpeaker && user.role?.toLowerCase() !== 'godmaster' && !isOwnerUser ? {
                                                                animation: 'speakerAvatarPulse 2s ease-in-out infinite',
                                                                border: '2px solid transparent',
                                                                backgroundClip: 'padding-box',
                                                                boxShadow: '0 0 0 2px rgba(52,211,153,0.35), 0 0 14px rgba(52,211,153,0.40), 0 0 28px rgba(52,211,153,0.15), 0 0 42px rgba(16,185,129,0.06)',
                                                            } : {}),
                                                            position: 'relative',
                                                            zIndex: 1,
                                                        }}
                                                    >{(() => { const avSrc = user.avatar || generateGenderAvatar(user.displayName || user.username || '?'); return <img src={avSrc} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />; })()}</div>


                                                    {/* ═══ FORCE OPERATOR ICON — GodMaster hariç TÜM roller aynı operatör ikonu ═══ */}
                                                    {room.state.systemSettings?.forceOperatorIcon && (() => {
                                                        const r = user.role?.toLowerCase();
                                                        // GodMaster kendi badge'ını zaten yukarıda gösteriyor
                                                        if (r === 'godmaster') return null;
                                                        // Guest hariç tüm roller için operatör ikonu göster
                                                        if (r === 'guest') return null;
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
                                                        <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center" title={getStatusLabel(user.status)}>
                                                            <span className="text-[10px] leading-none drop-shadow-lg">{getStatusEmoji(user.status)}</span>
                                                        </div>
                                                    )}


                                                </div>

                                                {/* Username & Status Text */}
                                                <div className="flex-1 min-w-0 ml-3">
                                                    <div
                                                        className={`text-sm font-bold transition-colors flex items-center gap-1 flex-nowrap
                                        ${!user.nameColor ? (isOwnerUser ? 'text-[#7b9fef]' : isSpeaker ? 'text-[#a3bfff]' : 'text-white group-hover:text-[#7b9fef]') : ''}
                                    `}
                                                        style={{
                                                            ...(user.nameColor ? { color: user.nameColor } : {}),
                                                            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                                                            overflow: 'visible',
                                                        }}
                                                    >
                                                        <span className="truncate max-w-[70px]">{user.displayName || 'User'}</span>
                                                        {isIgnored && <span className="text-[10px] text-red-400/60 ml-0.5" title="Yoksayılıyor">🚫</span>}
                                                        {user.platform === 'mobile' && (
                                                            <span className="text-[13px] flex-shrink-0 opacity-80" title={t.mobileUser}>📱</span>
                                                        )}
                                                        {user.role?.toLowerCase() === 'godmaster' ? (user.godmasterIcon || '🔱') : getRoleIcon(user.role || 'guest')}
                                                        {/* ═══ ENGEL İKONLARI — kullanıcı adı yanında aktif kısıtlamalar ═══ */}
                                                        {user.isMuted && (
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="inline-block ml-0.5 flex-shrink-0">
                                                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="#ef4444" opacity="0.8" />
                                                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none" />
                                                                <line x1="12" y1="19" x2="12" y2="23" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
                                                                <line x1="2" y1="2" x2="22" y2="22" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" />
                                                            </svg>
                                                        )}
                                                        {user.isGagged && (
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="inline-block ml-0.5 flex-shrink-0">
                                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="#f97316" opacity="0.7" />
                                                                <line x1="8" y1="8" x2="16" y2="16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                                                                <line x1="16" y1="8" x2="8" y2="16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                                                            </svg>
                                                        )}
                                                        {user.isCamBlocked && (
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="inline-block ml-0.5 flex-shrink-0">
                                                                <rect x="2" y="5" width="14" height="14" rx="2" fill="#6b7280" opacity="0.7" />
                                                                <path d="M16 9l5-3v12l-5-3" fill="#6b7280" opacity="0.5" />
                                                                <line x1="2" y1="2" x2="22" y2="22" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" />
                                                            </svg>
                                                        )}
                                                        {user.isBanned && (
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="inline-block ml-0.5 flex-shrink-0">
                                                                <circle cx="12" cy="12" r="10" fill="#dc2626" opacity="0.8" />
                                                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="white" strokeWidth="3" strokeLinecap="round" />
                                                            </svg>
                                                        )}
                                                        {/* Blinking Hand Icon for Queue */}
                                                        {!isMeetingRoom && queueIndex !== -1 && !isSpeaker && (
                                                            <span className="inline-flex items-center gap-0.5 ml-1" title={`${t.micQueue}: ${queueIndex + 1}`}>
                                                                <Hand className="w-4 h-4 text-[#f59e0b] animate-pulse inline-block" strokeWidth={2.5} />
                                                                <span className="text-[9px] font-bold text-amber-400 bg-amber-500/20 px-1 rounded">{queueIndex + 1}</span>
                                                            </span>
                                                        )}
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
                                                        {/* Status Icon next to name */}
                                                        {!isSpeaker && queueIndex === -1 && user.status && user.status !== 'online' && user.status !== 'stealth' && (
                                                            <span className="text-[10px] ml-0.5" title={getStatusLabel(user.status)}>{getStatusEmoji(user.status)}</span>
                                                        )}
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

<<<<<<< HEAD
            {/* BOTTOM CONTROLS */}
            <div className="p-3 relative" style={{
                background: 'linear-gradient(180deg, rgba(10,15,28,0.95) 0%, rgba(7,11,20,0.98) 100%)',
                backdropFilter: 'blur(24px)',
                borderRadius: '14px',
                margin: '6px 6px 6px 6px',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.3), 0 2px 10px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}>
=======
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* ═══ STATUS BAR — Premium, Hiyerarşi Bazlı Durum Çubuğu ═══════ */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div className="p-3 border-t border-white/5 relative" style={{ background: 'linear-gradient(180deg, rgba(7,11,20,0.85) 0%, rgba(7,11,20,0.95) 100%)', backdropFilter: 'blur(24px)' }}>
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626

                {/* STATUS TRIGGER BUTTON */}
                <div className="relative" ref={statusMenuRef}>
                    <button
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group"
                        style={{
                            background: showStatusMenu ? 'rgba(123,159,239,0.12)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${showStatusMenu ? 'rgba(123,159,239,0.25)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                        onClick={() => setShowStatusMenu(!showStatusMenu)}
                    >
                        <div className="flex items-center gap-2.5">
<<<<<<< HEAD
                            <div className="relative">
                                <div className="w-2.5 h-2.5 rounded-full" style={{
                                    background: currentUser?.status === 'busy' ? '#ef4444'
                                        : currentUser?.status === 'away' || currentUser?.status === 'outside' ? '#f59e0b'
                                            : currentUser?.status === 'phone' ? '#22d3ee'
                                                : '#22c55e',
                                    boxShadow: `0 0 6px ${currentUser?.status === 'busy' ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`,
                                }} />
                            </div>
                            <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">
                                {`${t.statusPrefix}: ${getStatusLabel(currentUser?.status as string)}`}
                            </span>
                        </div>
                        <ChevronUp className={`w-4 h-4 text-gray-500 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
=======
                            {/* Status dot */}
                            <div className="relative">
                                <div className="w-2.5 h-2.5 rounded-full" style={{
                                    background: currentUser?.isStealth ? '#6b7280'
                                        : currentUser?.status === 'busy' ? '#ef4444'
                                            : currentUser?.status === 'away' || currentUser?.status === 'outside' ? '#f59e0b'
                                                : currentUser?.status === 'phone' ? '#22d3ee'
                                                    : isGodMaster && (!currentUser?.visibilityMode || currentUser?.visibilityMode === 'hidden') ? '#a855f7'
                                                        : '#22c55e',
                                    boxShadow: `0 0 6px ${currentUser?.isStealth ? 'rgba(107,114,128,0.4)' : currentUser?.status === 'busy' ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`,
                                }} />
                                {currentUser?.isStealth && <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'rgba(107,114,128,0.3)' }} />}
                            </div>
                            <span className="text-[11px] font-semibold text-gray-300 group-hover:text-white transition-colors">
                                {isGodMaster && (!currentUser?.visibilityMode || currentUser?.visibilityMode === 'hidden')
                                    ? '🔱 Gizli Mod'
                                    : isGodMaster && currentUser?.visibilityMode === 'disguised'
                                        ? '👤 Kılık Değiştirmiş'
                                        : currentUser?.isStealth
                                            ? t.statusInvisible
                                            : getStatusLabel(currentUser?.status as string)}
                            </span>
                        </div>
                        <ChevronUp className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${showStatusMenu ? '' : 'rotate-180'}`} />
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
                    </button>

                    {/* STATUS DROPDOWN MENU */}
                    {showStatusMenu && (
                        <div className="absolute bottom-full left-0 w-full mb-1.5 rounded-xl overflow-hidden z-50" style={{
                            background: 'rgba(8,12,22,0.96)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(123,159,239,0.12)',
                            boxShadow: '0 -12px 40px rgba(0,0,0,0.8), 0 -4px 16px rgba(0,0,0,0.4)',
                        }}>
                            {/* Header */}
                            <div className="px-3.5 py-2 border-b border-white/5">
                                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.15em]">Durumunu Değiştir</span>
                            </div>

                            {/* ═══ TEMEL DURUMLAR — Herkes görebilir ═══ */}
                            {([
                                { key: 'online', emoji: '🟢', label: t.statusOnline, color: 'emerald' },
                                { key: 'busy', emoji: '🔴', label: t.statusBusy, color: 'red' },
                                { key: 'away', emoji: '🟡', label: t.statusWillReturn, color: 'amber' },
                            ] as const).map(({ key, emoji, label, color }) => {
                                const isActive = currentUser?.status === key && !currentUser?.isStealth;
                                return (
                                    <div
                                        key={key}
                                        className={`flex items-center gap-3 px-3.5 py-2 hover:bg-white/[0.06] cursor-pointer transition-colors ${isActive ? `bg-${color}-500/10` : ''}`}
                                        onClick={() => {
                                            room.actions.changeStatus(key);
                                            if (currentUser?.isStealth) room.actions.toggleStealth();
                                            if (isGodMaster && currentUser?.visibilityMode !== 'visible') room.actions.setGodmasterVisibility('visible');
                                            setShowStatusMenu(false);
                                        }}
                                    >
                                        <span className="text-[13px] w-5 text-center">{emoji}</span>
                                        <span className={`text-[11px] font-medium ${isActive ? `text-${color}-400 font-bold` : 'text-gray-400'}`}>{label}</span>
                                        {isActive && <span className={`ml-auto text-[9px] text-${color}-400 bg-${color}-500/15 px-1.5 py-0.5 rounded font-bold`}>●</span>}
                                    </div>
                                );
                            })}

                            {/* ═══ GELİŞMİŞ DURUMLAR — VIP+ roller ═══ */}
                            {getRoleLevel(currentUser?.role) >= 3 && (
                                <>
                                    <div className="border-t border-white/5" />
                                    {([
                                        { key: 'outside', emoji: '🚶', label: t.statusOutside, color: 'amber' },
                                        { key: 'phone', emoji: '📞', label: t.statusOnPhone, color: 'cyan' },
                                    ] as const).map(({ key, emoji, label, color }) => {
                                        const isActive = currentUser?.status === key;
                                        return (
                                            <div
                                                key={key}
                                                className={`flex items-center gap-3 px-3.5 py-2 hover:bg-white/[0.06] cursor-pointer transition-colors ${isActive ? `bg-${color}-500/10` : ''}`}
                                                onClick={() => {
                                                    room.actions.changeStatus(key);
                                                    setShowStatusMenu(false);
                                                }}
                                            >
                                                <span className="text-[13px] w-5 text-center">{emoji}</span>
                                                <span className={`text-[11px] font-medium ${isActive ? `text-${color}-400 font-bold` : 'text-gray-400'}`}>{label}</span>
                                                {isActive && <span className={`ml-auto text-[9px] text-${color}-400 bg-${color}-500/15 px-1.5 py-0.5 rounded font-bold`}>●</span>}
                                            </div>
                                        );
                                    })}
                                </>
                            )}

                            {/* ═══ GÖRÜNMEZLİK — VIP+ roller (GodMaster hariç) ═══ */}
                            {canStealth && (
                                <>
                                    <div className="border-t border-white/5" />
                                    <div
                                        className={`flex items-center gap-3 px-3.5 py-2 hover:bg-white/[0.06] cursor-pointer transition-colors ${currentUser?.isStealth ? 'bg-gray-500/10' : ''}`}
                                        onClick={() => {
                                            room.actions.toggleStealth();
                                            setShowStatusMenu(false);
                                        }}
                                    >
                                        <span className="text-[13px] w-5 text-center">👻</span>
                                        <span className={`text-[11px] font-medium ${currentUser?.isStealth ? 'text-gray-300 font-bold' : 'text-gray-400'}`}>{t.statusInvisible}</span>
                                        {currentUser?.isStealth && <span className="ml-auto text-[9px] text-gray-400 bg-white/10 px-1.5 py-0.5 rounded font-bold">●</span>}
                                    </div>
                                </>
                            )}

                            {/* ═══ GODMASTER ÖZEL MODLAR ═══ */}
                            {isGodMaster && (
                                <>
                                    <div className="border-t border-white/5 mt-0.5" />
                                    <div className="px-3.5 py-1.5">
                                        <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(192,132,252,0.6)' }}>🔱 GodMaster Modu</span>
                                    </div>

                                    {/* GodMaster olarak görünür */}
                                    <div
                                        className={`flex items-center gap-3 px-3.5 py-2 hover:bg-white/[0.06] cursor-pointer transition-colors ${currentUser?.visibilityMode === 'visible' ? 'bg-fuchsia-500/10' : ''}`}
                                        onClick={() => {
                                            room.actions.setGodmasterVisibility('visible');
                                            setShowStatusMenu(false);
                                            setShowDisguiseInput(false);
                                        }}
                                    >
                                        <span className="text-[13px] w-5 text-center">🔱</span>
                                        <span className={`text-[11px] font-medium ${currentUser?.visibilityMode === 'visible' ? 'text-fuchsia-400 font-bold' : 'text-gray-400'}`}>Görünür (GodMaster)</span>
                                        {currentUser?.visibilityMode === 'visible' && <span className="ml-auto text-[9px] text-fuchsia-400 bg-fuchsia-500/15 px-1.5 py-0.5 rounded font-bold">●</span>}
                                    </div>

                                    {/* Kılık değiştir */}
                                    <div
                                        className={`flex items-center gap-3 px-3.5 py-2 hover:bg-white/[0.06] cursor-pointer transition-colors ${currentUser?.visibilityMode === 'disguised' ? 'bg-blue-500/10' : ''}`}
                                        onClick={() => {
                                            if (currentUser?.visibilityMode === 'disguised') {
                                                room.actions.setGodmasterVisibility('hidden');
                                                setShowDisguiseInput(false);
                                            } else {
                                                setShowDisguiseInput(true);
                                            }
                                        }}
                                    >
                                        <span className="text-[13px] w-5 text-center">👤</span>
                                        <span className={`text-[11px] font-medium ${currentUser?.visibilityMode === 'disguised' ? 'text-blue-400 font-bold' : 'text-gray-400'}`}>{t.disguiseAsGuest}</span>
                                        {currentUser?.visibilityMode === 'disguised' && <span className="ml-auto text-[9px] text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded font-bold">●</span>}
                                    </div>

                                    {/* İsim giriş alanı */}
                                    {showDisguiseInput && (
                                        <div className="px-3.5 py-2 flex gap-2">
                                            <input
                                                type="text"
                                                value={disguiseName}
                                                onChange={(e) => setDisguiseName(e.target.value)}
                                                placeholder={t.disguisePlaceholder}
                                                className="flex-1 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/40"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && disguiseName.trim()) {
                                                        room.actions.setGodmasterVisibility('disguised', disguiseName.trim());
                                                        setShowStatusMenu(false);
                                                        setShowDisguiseInput(false);
                                                        setDisguiseName('');
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    if (disguiseName.trim()) {
                                                        room.actions.setGodmasterVisibility('disguised', disguiseName.trim());
                                                        setShowStatusMenu(false);
                                                        setShowDisguiseInput(false);
                                                        setDisguiseName('');
                                                    }
                                                }}
                                                className="px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] rounded-lg font-bold transition-colors"
                                            >
                                                {t.confirm}
                                            </button>
                                        </div>
                                    )}

                                    {/* Gizli mod */}
                                    <div
                                        className={`flex items-center gap-3 px-3.5 py-2 hover:bg-white/[0.06] cursor-pointer transition-colors ${(!currentUser?.visibilityMode || currentUser?.visibilityMode === 'hidden') ? 'bg-gray-500/10' : ''}`}
                                        onClick={() => {
                                            room.actions.setGodmasterVisibility('hidden');
                                            setShowStatusMenu(false);
                                            setShowDisguiseInput(false);
                                        }}
                                    >
                                        <span className="text-[13px] w-5 text-center">👻</span>
                                        <span className={`text-[11px] font-medium ${(!currentUser?.visibilityMode || currentUser?.visibilityMode === 'hidden') ? 'text-gray-300 font-bold' : 'text-gray-400'}`}>{t.statusInvisible}</span>
                                        {(!currentUser?.visibilityMode || currentUser?.visibilityMode === 'hidden') && <span className="ml-auto text-[9px] text-gray-400 bg-white/10 px-1.5 py-0.5 rounded font-bold">●</span>}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* 📢 DUYURU BİLDİRİM KUTUSU — sadece owner/admin/superadmin */}
                {['owner', 'admin', 'superadmin'].includes(currentUser?.role || '') && (
                    <div className="relative">
                        <button
                            onClick={() => {
                                if (room.state.announcement) {
                                    if (showAnnouncementPanel) {
                                        setShowAnnouncementPanel(false);
                                    } else {
                                        setShowAnnouncementPanel(true);
                                        room.actions.markAnnouncementSeen();
                                    }
                                }
                            }}
                            className={`
                                w-full flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer
                                ${room.state.hasNewAnnouncement
                                    ? ''
                                    : room.state.announcement
                                        ? 'bg-white/5 border-white/10 hover:bg-white/10'
                                        : 'bg-white/[0.03] border-white/[0.06] opacity-50 cursor-default'
                                }
                                ${room.state.hasNewAnnouncement ? 'animate-announcement-shake' : ''}
                            `}
                            style={room.state.hasNewAnnouncement ? {
                                background: 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(239,68,68,0.08) 100%)',
                                border: '1px solid rgba(251,191,36,0.35)',
                                boxShadow: '0 0 16px rgba(251,191,36,0.2), 0 0 30px rgba(239,68,68,0.08)',
                            } : undefined}
                        >
                            <div className={`
                                w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0
                                ${room.state.hasNewAnnouncement
                                    ? ''
                                    : 'bg-white/10 border border-white/10'
                                }
                                ${room.state.hasNewAnnouncement ? 'animate-pulse' : ''}
                            `}
                                style={room.state.hasNewAnnouncement ? {
                                    background: 'rgba(251,191,36,0.2)',
                                    border: '1px solid rgba(251,191,36,0.4)',
                                    boxShadow: '0 0 12px rgba(251,191,36,0.3), 0 0 4px rgba(239,68,68,0.2)',
                                } : undefined}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                    stroke={room.state.hasNewAnnouncement ? '#fbbf24' : '#9ca3af'}
                                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                    style={room.state.hasNewAnnouncement ? {
                                        filter: 'drop-shadow(0 0 6px rgba(251,191,36,0.6)) drop-shadow(0 0 12px rgba(239,68,68,0.3))',
                                    } : undefined}
                                >
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className={`text-xs font-bold ${room.state.hasNewAnnouncement ? '' : 'text-gray-400'}`}
                                    style={room.state.hasNewAnnouncement ? { color: '#fcd34d' } : undefined}
                                >
                                    {t.announcements}
                                </span>
                                {room.state.hasNewAnnouncement && (
                                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold animate-pulse"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(251,191,36,0.25), rgba(239,68,68,0.15))',
                                            color: '#fcd34d',
                                            border: '1px solid rgba(251,191,36,0.3)',
                                            textShadow: '0 0 6px rgba(239,68,68,0.4)',
                                        }}
                                    >
                                        YENİ
                                    </span>
                                )}
                            </div>
                            {room.state.hasNewAnnouncement && (
                                <div className="w-2.5 h-2.5 rounded-full animate-pulse flex-shrink-0"
                                    style={{
                                        background: 'linear-gradient(135deg, #fbbf24, #ef4444)',
                                        boxShadow: '0 0 8px rgba(251,191,36,0.5), 0 0 16px rgba(239,68,68,0.3)',
                                    }}
                                />
                            )}
                        </button>

                        {/* Duyuru Panel — açılabilir */}
                        {showAnnouncementPanel && room.state.announcement && (
                            <div className="mt-2 p-3 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(239,68,68,0.05))',
                                    border: '1px solid rgba(251,191,36,0.18)',
                                }}
                            >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider"
                                        style={{ color: '#fcd34d', textShadow: '0 0 8px rgba(239,68,68,0.3)' }}
                                    >📢 {t.announcement}</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowAnnouncementPanel(false); }}
                                        className="text-gray-500 hover:text-white transition-colors"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-xs text-white leading-relaxed">{room.state.announcement.message}</p>
                                <p className="text-[9px] text-gray-500 mt-2">
                                    {new Date(room.state.announcement.createdAt).toLocaleString('tr-TR')}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* RADIO WIDGET */}
                <RadioPlayer />

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
                        className={`mic-reactor group mt-2 cursor-pointer relative max-md:sticky max-md:bottom-0 max-md:z-50 max-md:bg-[#070b14]/95 max-md:border-t max-md:border-white/5 max-md:backdrop-blur-sm`}
                        style={{
                            background: isMicOn
                                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 40%, #b91c1c 70%, #dc2626 100%)'
                                : isInQueue
                                    ? 'linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(245,158,11,0.10) 50%, rgba(251,191,36,0.06) 100%)'
                                    : 'linear-gradient(135deg, rgba(123,159,239,0.22) 0%, rgba(90,127,212,0.14) 50%, rgba(123,159,239,0.08) 100%)',
                            borderRadius: 14,
                            border: isMicOn
                                ? '1px solid rgba(248,113,113,0.6)'
                                : isInQueue
                                    ? '1px solid rgba(251,191,36,0.30)'
                                    : '1px solid rgba(123,159,239,0.30)',
                            boxShadow: isMicOn
                                ? '0 4px 20px rgba(239,68,68,0.4), 0 0 30px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.15)'
                                : isInQueue
                                    ? '0 2px 12px rgba(251,191,36,0.12), 0 0 20px rgba(251,191,36,0.05), inset 0 1px 0 rgba(255,255,255,0.06)'
                                    : '0 2px 12px rgba(123,159,239,0.12), 0 0 20px rgba(123,159,239,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
                            padding: '16px 18px',
                            transition: 'all 0.3s ease',
                            overflow: 'hidden',
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
<<<<<<< HEAD
                                    ? (isInQueue ? 'SIRADAN ÇIK' : 'SIRAYA GİR')
                                    : (isMicOn ? 'MİKROFONU BIRAK' : (isHasbihal ? 'KELAM İSTE' : isMidnight ? 'Mikrofon İste' : 'MİKROFON AL'))}
=======
                                    ? (isInQueue ? t.leaveQueue.toUpperCase() : t.joinQueue.toUpperCase())
                                    : (isMicOn ? t.releaseMic : (isHasbihal ? t.requestWord : isMidnight ? t.requestMic : t.takeMic))}
                            </span>
                            <span className={`text-[10px]
                             ${isMicOn ? 'text-red-400/70' : isInQueue ? 'text-amber-400/70' : 'text-gray-500'}
                        `} style={isHasbihal ? { fontFamily: "'Amiri', serif", color: 'rgba(123,159,239,0.7)' } : undefined}>
                                {isSomeoneElseSpeaker
                                    ? (isInQueue
                                        ? `#${queue.indexOf(currentUser?.userId || '') + 1}`
                                        : `${currentSpeaker?.displayName} ${t.broadcasting}`)
                                    : (isMicOn
                                        ? (micTimeLeft > 0 ? `${formatTime(micTimeLeft)}` : t.releaseMic)
                                        : '')}
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
                            </span>
                        </div>
                        <div className={`w-2 h-2 rounded-full animate-pulse
                         ${isMicOn ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : isSomeoneElseSpeaker ? 'bg-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]'}
                    `}></div>
                    </button>
                </>}

            </div>
        </aside >
    );
}
