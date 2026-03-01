import { User } from '@/types';
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

export function SidebarLeft({ users, currentUser, room, onUserContextMenu, onEmptyContextMenu, isAudioTestOpen, onCloseAudioTest, mobileSidebarOpen, onCloseMobileSidebar, ignoredUsers }: SidebarLeftProps) {
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
            case 'superadmin': return 'Süper Admin';
            case 'admin': return t.roleAdmin; // was Yönetici';
            case 'moderator': return 'Moderatör';
            case 'operator': return 'Operatör';
            case 'vip': return t.roleVip;
            case 'member': return 'Üye';
            case 'guest': return 'Misafir';
            default: return 'Kullanıcı';
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
    const visibleUsers = useMemo(() => {
        const myRole = currentUser?.role || 'guest';
        return users.filter(u => {
            // Check if target is self (Robust check)
            const isSelf = (u.userId && u.userId === currentUser?.userId) ||
                (u.socketId && u.socketId === currentUser?.socketId);

            if (isSelf) return true;

            // GodMaster visibility is handled server-side in getRoomParticipants.
            // The backend only sends visible/disguised GodMasters to non-GodMaster viewers,
            // so no frontend filtering is needed here.

            if (u.isStealth) return canSeeStealthUser(myRole, u.role);
            return true;
        });
    }, [users, currentUser]);

    // SORTING LOGIC
    const sortedUsers = useMemo(() => {
        return [...visibleUsers].sort((a, b) => {
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
            className="sidebar-left w-80 flex-shrink-0 flex flex-col border-r border-white/5 z-20 relative max-md:hidden"
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
                        `}</style>
                        </>
                    )}
                </div>
            </div>

            {/* AUDIO TEST (replaces user list) or USER LIST */}
            {isAudioTestOpen && onCloseAudioTest ? (
                <AudioTestPanel onClose={onCloseAudioTest} />
            ) : (
                <div className="flex-1 p-6 custom-scrollbar space-y-6 overflow-y-auto">
                    {/* ═══ KONUŞMACI BÖLÜMÜ — logo altında, online listesinin üstünde ═══ */}
                    {currentSpeaker && (() => {
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
                                return `https://api.dicebear.com/9.x/avataaars/svg?seed=${speakerUser.username}`;
                            }
                            return av;
                        })();

                        // Display name
                        const displayName = speakerUser.displayName || speakerUser.username || '';

                        return (
                            <div className="mb-4">
                                <div className="text-[10px] font-extrabold uppercase tracking-widest mb-3 flex items-center gap-2 text-red-400/80">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] animate-pulse"></span>
                                    KONUŞMACI
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
                                                <img
                                                    src={speakerAvSrc}
                                                    className="w-12 h-12 rounded-full object-cover"
                                                    style={{
                                                        border: '2px solid rgba(239,68,68,0.50)',
                                                        boxShadow: '0 0 12px rgba(239,68,68,0.25), 0 0 24px rgba(239,68,68,0.10)',
                                                        animation: 'speakerAvatarPulseRed 2s ease-in-out infinite',
                                                    }}
                                                />
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

                                // Use currentUser state for self to ensure immediate UI update
                                const isSelf = user.userId === currentUser?.userId;
                                const isInvisible = isSelf ? currentUser?.isStealth : user.isStealth;

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
                                        key={user.socketId || user.userId}
                                        className={`${(isGodMasterSpecialMode && !shouldShowAvatar) || isGifNickMode || isGodMasterGifMode ? '' : 'user-card'} flex items-center ${(isGodMasterSpecialMode && !shouldShowAvatar) || isGifNickMode || isGodMasterGifMode ? 'px-0 py-0' : 'px-3 py-2 rounded-xl border'} transition-all duration-300 group cursor-context-menu select-none relative
                                    ${(isGodMasterSpecialMode && !shouldShowAvatar) || isGifNickMode || isGodMasterGifMode
                                                ? ''
                                                : isGodMasterUser
                                                    ? 'bg-gradient-to-r from-fuchsia-500/10 via-amber-700/5 to-fuchsia-500/10 border-fuchsia-500/30 shadow-[0_0_12px_rgba(217,70,239,0.12)]'
                                                    : isOwnerUser
                                                        ? 'bg-gradient-to-r from-[#7b9fef]/10 via-[#7b9fef]/5 to-transparent border-[#7b9fef]/20 shadow-[0_0_10px_rgba(123,159,239,0.1)]'
                                                        : isSpeaker
                                                            ? 'bg-[#7b9fef]/8 border-[#7b9fef]/25 shadow-[0_0_8px_rgba(123,159,239,0.1)]'
                                                            : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07] hover:border-white/10'}}
                                    ${isInvisible ? 'opacity-50 grayscale border-dashed !border-gray-600/40' : ''}
                                    ${!isGodMasterSpecialMode && user.isMuted ? '!border-red-500/30 !bg-red-500/[0.04]' : ''}
                                    ${!isGodMasterSpecialMode && user.isGagged ? '!border-orange-500/30 !bg-orange-500/[0.04]' : ''}
                                    ${!isGodMasterSpecialMode && user.isBanned ? '!border-red-600/40 !bg-red-600/[0.06]' : ''}
                                `}
                                        style={(isGodMasterSpecialMode && !shouldShowAvatar) || isGifNickMode || isGodMasterGifMode ? {
                                            background: 'transparent',
                                            border: 'none',
                                            boxShadow: 'none',
                                            outline: 'none',
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
                                                            src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`}
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
                                                    let avatarSrc = `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`;
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
                                                {/* Avatar */}
                                                <div className="relative flex-shrink-0">
                                                    <img
                                                        src={(() => {
                                                            const av = user.avatar;
                                                            if (!av || av.startsWith('3d:') || av.startsWith('animated:') || av.startsWith('gifnick::')) {
                                                                return `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`;
                                                            }
                                                            // GIF avatarlar sadece GodMaster'a özel — diğer roller için DiceBear fallback
                                                            const isGif = av.toLowerCase().endsWith('.gif') || av.startsWith('data:image/gif');
                                                            if (isGif && user.role?.toLowerCase() !== 'godmaster') {
                                                                return `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username}`;
                                                            }
                                                            return av;
                                                        })()}
                                                        className={`w-10 h-10 rounded-full border-[1.5px] transition-colors object-cover
                                            ${user.role?.toLowerCase() === 'godmaster'
                                                                ? 'border-fuchsia-400/70 shadow-[0_0_8px_rgba(217,70,239,0.3)]'
                                                                : isOwnerUser ? 'border-[#7b9fef]/70 shadow-[0_0_8px_rgba(123,159,239,0.3)]'
                                                                    : isSpeaker ? 'border-emerald-400/80' : 'border-white/15 group-hover:border-[#7b9fef]/40'}
                                        `}
                                                        style={isSpeaker && user.role?.toLowerCase() !== 'godmaster' && !isOwnerUser ? {
                                                            animation: 'speakerAvatarPulse 2s ease-in-out infinite',
                                                            border: '2px solid transparent',
                                                            backgroundClip: 'padding-box',
                                                            boxShadow: '0 0 0 2px rgba(52,211,153,0.35), 0 0 14px rgba(52,211,153,0.40), 0 0 28px rgba(52,211,153,0.15), 0 0 42px rgba(16,185,129,0.06)',
                                                        } : undefined}
                                                    />


                                                    {/* ═══ FORCE OPERATOR ICON — GodMaster hariç TÜM roller aynı operatör ikonu ═══ */}
                                                    {room.state.systemSettings?.forceOperatorIcon && (() => {
                                                        const r = user.role?.toLowerCase();
                                                        // GodMaster kendi badge'ını zaten yukarıda gösteriyor
                                                        if (r === 'godmaster') return null;
                                                        // Guest hariç tüm roller için operatör ikonu göster
                                                        if (r === 'guest') return null;
                                                        return (
                                                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-br from-emerald-500 to-green-700 rounded-full flex items-center justify-center shadow-lg border border-emerald-400/50 z-10" title="Operatör">
                                                                <Shield className="w-3 h-3 text-white" />
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* ═══ MODERATION OVERLAY ICONS ═══ */}
                                                    {user.isMuted && (
                                                        <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(239,68,68,0.6)] border border-red-400/50 z-20 animate-pulse" title="Susturuldu">
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
                                                        className={`text-sm font-bold transition-colors truncate flex items-center gap-1.5
                                        ${!user.nameColor ? (isOwnerUser ? 'text-[#7b9fef]' : isSpeaker ? 'text-[#a3bfff]' : 'text-white group-hover:text-[#7b9fef]') : ''}
                                    `}
                                                        style={user.nameColor ? { color: user.nameColor } : undefined}
                                                    >
                                                        {user.username}
                                                        {isIgnored && <span className="text-[10px] text-red-400/60 ml-0.5" title="Yoksayılıyor">🚫</span>}
                                                        {user.platform === 'mobile' && (
                                                            <span className="text-[13px] flex-shrink-0 opacity-80" title="Mobil Kullanıcı">📱</span>
                                                        )}
                                                        {user.role?.toLowerCase() === 'godmaster' ? (user.godmasterIcon || '🔱') : getRoleIcon(user.role || 'guest')}
                                                        {/* Blinking Hand Icon for Queue */}
                                                        {queueIndex !== -1 && !isSpeaker && (
                                                            <Hand className="w-4 h-4 text-[#f59e0b] animate-pulse ml-1 inline-block" strokeWidth={2.5} />
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
                                                </div>
                                            </>
                                        )}

                                        {/* ═══ SPEAKER MIC ICON — kartın sağında yayılma efektli ═══ */}
                                        {isSpeaker && !isGodMasterSpecialMode && (
                                            <div className="flex-shrink-0 ml-auto pl-2 relative flex items-center justify-center" style={{ width: 36, height: 36 }}>
                                                {/* Yayılan dalga halkaları */}
                                                <div className="absolute inset-0 rounded-full" style={{
                                                    border: '1.5px solid rgba(52,211,153,0.25)',
                                                    animation: 'speakerRipple 2s ease-out infinite',
                                                }} />
                                                <div className="absolute inset-0 rounded-full" style={{
                                                    border: '1.5px solid rgba(52,211,153,0.20)',
                                                    animation: 'speakerRipple 2s ease-out 0.5s infinite',
                                                }} />
                                                <div className="absolute inset-0 rounded-full" style={{
                                                    border: '1.5px solid rgba(52,211,153,0.15)',
                                                    animation: 'speakerRipple 2s ease-out 1s infinite',
                                                }} />
                                                {/* Merkez mikrofon ikonu */}
                                                <div className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center" style={{
                                                    background: 'linear-gradient(135deg, #34d399, #10b981, #059669)',
                                                    boxShadow: '0 0 10px rgba(52,211,153,0.50), 0 0 20px rgba(16,185,129,0.20)',
                                                    animation: 'speakerMicGlow 1.5s ease-in-out infinite',
                                                }}>
                                                    <Mic className="w-3 h-3 text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.6)]" />
                                                </div>
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

            {/* BOTTOM CONTROLS */}
            <div className="status-bar p-4 bg-[#070B14]/80 border-t border-white/5 flex flex-col gap-3 relative backdrop-blur-2xl">

                {/* STATUS DROPDOWN */}
                <div className="relative" ref={statusMenuRef}>
                    <div
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                        onClick={() => setShowStatusMenu(!showStatusMenu)}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-sm leading-none">{getStatusEmoji(currentUser?.status as string)}</span>
                            <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">
                                {`${t.statusPrefix}: ${getStatusLabel(currentUser?.status as string)}`}
                            </span>
                        </div>
                        <ChevronUp className={`w-4 h-4 text-gray-500 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
                    </div>

                    {showStatusMenu && (
                        <div className="absolute bottom-full left-0 w-full mb-2 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.9)] overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2" style={{
                            background: 'rgba(10,14,24,0.92)',
                            backdropFilter: 'blur(16px)',
                            border: '1px solid rgba(123,159,239,0.10)',
                        }}>
                            <div
                                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 cursor-pointer border-b border-white/5 ${currentUser?.status === 'online' && !currentUser?.isStealth ? 'bg-emerald-500/10' : ''}`}
                                onClick={() => {
                                    room.actions.changeStatus('online');
                                    if (currentUser?.isStealth) {
                                        room.actions.toggleStealth();
                                    }
                                    if (isGodMaster && currentUser?.visibilityMode !== 'visible') {
                                        room.actions.setGodmasterVisibility('visible');
                                    }
                                    setShowStatusMenu(false);
                                }}
                            >
                                <span className="text-sm leading-none">✅</span>
                                <span className="text-xs font-bold text-white">{t.statusOnline}</span>
                                {currentUser?.status === 'online' && !currentUser?.isStealth && <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">AKTİF</span>}
                            </div>
                            <div
                                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 cursor-pointer border-b border-white/5 ${currentUser?.status === 'busy' ? 'bg-red-500/10' : ''}`}
                                onClick={() => {
                                    room.actions.changeStatus('busy');
                                    setShowStatusMenu(false);
                                }}
                            >
                                <span className="text-sm leading-none">⛔</span>
                                <span className={`text-xs font-medium ${currentUser?.status === 'busy' ? 'text-red-400 font-bold' : 'text-gray-300'}`}>{t.statusBusy}</span>
                                {currentUser?.status === 'busy' && <span className="ml-auto text-[10px] text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded">AKTİF</span>}
                            </div>
                            <div
                                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 cursor-pointer border-b border-white/5 ${currentUser?.status === 'away' ? 'bg-amber-500/10' : ''}`}
                                onClick={() => {
                                    room.actions.changeStatus('away');
                                    setShowStatusMenu(false);
                                }}
                            >
                                <span className="text-sm leading-none">🔙</span>
                                <span className={`text-xs font-medium ${currentUser?.status === 'away' ? 'text-amber-400 font-bold' : 'text-gray-300'}`}>{t.statusWillReturn}</span>
                                {currentUser?.status === 'away' && <span className="ml-auto text-[10px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">AKTİF</span>}
                            </div>
                            <div
                                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 cursor-pointer border-b border-white/5 ${currentUser?.status === 'outside' ? 'bg-amber-500/10' : ''}`}
                                onClick={() => {
                                    room.actions.changeStatus('outside');
                                    setShowStatusMenu(false);
                                }}
                            >
                                <span className="text-sm leading-none">🚶</span>
                                <span className={`text-xs font-medium ${currentUser?.status === 'outside' ? 'text-amber-400 font-bold' : 'text-gray-300'}`}>{t.statusOutside}</span>
                                {currentUser?.status === 'outside' && <span className="ml-auto text-[10px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">AKTİF</span>}
                            </div>
                            <div
                                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 cursor-pointer border-b border-white/5 ${currentUser?.status === 'phone' ? 'bg-cyan-500/10' : ''}`}
                                onClick={() => {
                                    room.actions.changeStatus('phone');
                                    setShowStatusMenu(false);
                                }}
                            >
                                <span className="text-sm leading-none">📞</span>
                                <span className={`text-xs font-medium ${currentUser?.status === 'phone' ? 'text-cyan-400 font-bold' : 'text-gray-300'}`}>{t.statusOnPhone}</span>
                                {currentUser?.status === 'phone' && <span className="ml-auto text-[10px] text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded">AKTİF</span>}
                            </div>

                            {/* ═══ Stealth Toggle (Owner/Admin/VIP+) ═══ */}
                            {canStealth && (
                                <div
                                    className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 cursor-pointer border-b border-white/5 ${currentUser?.isStealth ? 'bg-gray-500/10' : ''}`}
                                    onClick={() => {
                                        room.actions.toggleStealth();
                                        setShowStatusMenu(false);
                                    }}
                                >
                                    <span className="text-sm leading-none">👻</span>
                                    <span className={`text-xs font-medium ${currentUser?.isStealth ? 'text-gray-300 font-bold' : 'text-gray-300'}`}>{t.statusInvisible}</span>
                                    {currentUser?.isStealth && <span className="ml-auto text-[10px] text-gray-400 bg-white/10 px-1.5 py-0.5 rounded">AKTİF</span>}
                                </div>
                            )}

                            {/* ═══ GodMaster Visibility Control ═══ */}
                            {isGodMaster && (
                                <>
                                    <div className="border-t border-white/10 mt-1 pt-1">
                                        <div className="px-4 py-1.5">
                                            <span className="text-[9px] font-bold text-fuchsia-400/70 uppercase tracking-widest">🔱 GodMaster Modu</span>
                                        </div>

                                        {/* Visible as GodMaster */}
                                        <div
                                            className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 cursor-pointer ${currentUser?.visibilityMode === 'visible' ? 'bg-fuchsia-500/10' : ''}`}
                                            onClick={() => {
                                                console.log('[SidebarLeft] GodMaster Visible button clicked! isGodMaster:', isGodMaster, 'room.actions:', !!room.actions, 'setGodmasterVisibility:', !!room.actions?.setGodmasterVisibility);
                                                room.actions.setGodmasterVisibility('visible');
                                                setShowStatusMenu(false);
                                                setShowDisguiseInput(false);
                                            }}
                                        >
                                            <span className="text-sm">🔱</span>
                                            <span className={`text-xs font-medium ${currentUser?.visibilityMode === 'visible' ? 'text-fuchsia-400 font-bold' : 'text-gray-300'}`}>GodMaster Olarak Görün</span>
                                            {currentUser?.visibilityMode === 'visible' && <span className="ml-auto text-[10px] text-fuchsia-400 bg-fuchsia-500/20 px-1.5 py-0.5 rounded">AKTİF</span>}
                                        </div>

                                        {/* Disguised as Guest */}
                                        <div
                                            className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 cursor-pointer ${currentUser?.visibilityMode === 'disguised' ? 'bg-blue-500/10' : ''}`}
                                            onClick={() => {
                                                if (currentUser?.visibilityMode === 'disguised') {
                                                    room.actions.setGodmasterVisibility('hidden');
                                                    setShowDisguiseInput(false);
                                                } else {
                                                    setShowDisguiseInput(true);
                                                }
                                            }}
                                        >
                                            <span className="text-sm">👤</span>
                                            <span className={`text-xs font-medium ${currentUser?.visibilityMode === 'disguised' ? 'text-blue-400 font-bold' : 'text-gray-300'}`}>Misafir Olarak Görün</span>
                                            {currentUser?.visibilityMode === 'disguised' && <span className="ml-auto text-[10px] text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">AKTİF</span>}
                                        </div>

                                        {/* Disguise Name Input */}
                                        {showDisguiseInput && (
                                            <div className="px-4 py-2 flex gap-2">
                                                <input
                                                    type="text"
                                                    value={disguiseName}
                                                    onChange={(e) => setDisguiseName(e.target.value)}
                                                    placeholder="Misafir ismi gir..."
                                                    className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
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
                                                    className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg font-bold transition-colors"
                                                >
                                                    Giriş
                                                </button>
                                            </div>
                                        )}

                                        {/* Hidden (default) */}
                                        <div
                                            className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/10 cursor-pointer ${(!currentUser?.visibilityMode || currentUser?.visibilityMode === 'hidden') ? 'bg-gray-500/10' : ''}`}
                                            onClick={() => {
                                                room.actions.setGodmasterVisibility('hidden');
                                                setShowStatusMenu(false);
                                                setShowDisguiseInput(false);
                                            }}
                                        >
                                            <span className="text-sm">👻</span>
                                            <span className={`text-xs font-medium ${(!currentUser?.visibilityMode || currentUser?.visibilityMode === 'hidden') ? 'text-white font-bold' : 'text-gray-400'}`}>Gizli Kal (Varsayılan)</span>
                                            {(!currentUser?.visibilityMode || currentUser?.visibilityMode === 'hidden') && <span className="ml-auto text-[10px] text-gray-400 bg-white/10 px-1.5 py-0.5 rounded">AKTİF</span>}
                                        </div>
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
                                    Duyurular
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
                                    >📢 Duyuru</span>
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
                            ? 'linear-gradient(135deg, rgba(239,68,68,0.20) 0%, rgba(220,38,38,0.12) 50%, rgba(239,68,68,0.08) 100%)'
                            : isInQueue
                                ? 'linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(245,158,11,0.10) 50%, rgba(251,191,36,0.06) 100%)'
                                : 'linear-gradient(135deg, rgba(123,159,239,0.22) 0%, rgba(90,127,212,0.14) 50%, rgba(123,159,239,0.08) 100%)',
                        borderRadius: 14,
                        border: isMicOn
                            ? '1px solid rgba(239,68,68,0.35)'
                            : isInQueue
                                ? '1px solid rgba(251,191,36,0.30)'
                                : '1px solid rgba(123,159,239,0.30)',
                        boxShadow: isMicOn
                            ? '0 2px 12px rgba(239,68,68,0.15), 0 0 20px rgba(239,68,68,0.06), inset 0 1px 0 rgba(255,255,255,0.06)'
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
                            <MicOff className="w-5 h-5 relative z-20" style={{ color: '#f87171' }} />
                        ) : isInQueue ? (
                            <Hand className="w-5 h-5 relative z-20 animate-pulse" style={{ color: '#fbbf24' }} />
                        ) : (
                            <Mic className="w-5 h-5 relative z-20" style={{ color: '#7b9fef' }} />
                        )}
                    </div>
                    <div className="flex-1 flex flex-col items-start ml-3">
                        <span className={`text-xs font-bold tracking-widest transition-colors
                            ${isMicOn ? 'text-red-300' : isInQueue ? 'text-amber-300' : 'text-white'}
                        `}>
                            {isSomeoneElseSpeaker
                                ? (isInQueue ? 'SIRADAN ÇIK' : 'SIRAYA GİR')
                                : (isMicOn ? 'MİKROFONU BIRAK' : (isHasbihal ? 'KELAM İSTE' : isMidnight ? 'Mikrofon İste' : 'MİKROFONU AL'))}
                        </span>
                        <span className={`text-[10px]
                             ${isMicOn ? 'text-red-400/70' : isInQueue ? 'text-amber-400/70' : 'text-gray-500'}
                        `} style={isHasbihal ? { fontFamily: "'Amiri', serif", color: 'rgba(123,159,239,0.7)' } : undefined}>
                            {isSomeoneElseSpeaker
                                ? (isInQueue
                                    ? `${queue.indexOf(currentUser?.userId || '') + 1}. Sıradasınız`
                                    : `${currentSpeaker?.displayName} konuşuyor`)
                                : (isMicOn
                                    ? (micTimeLeft > 0 ? `Kalan: ${formatTime(micTimeLeft)}` : 'Konuşmayı Bitir')
                                    : (isHasbihal ? 'Söz Hakkı Talep Et' : isMidnight ? 'Söz hakkı talep et' : 'Konuşmak İçin Tıkla'))}
                        </span>
                    </div>
                    <div className={`w-2 h-2 rounded-full animate-pulse
                         ${isMicOn ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : isSomeoneElseSpeaker ? 'bg-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]'}
                    `}></div>
                </button>

            </div>
        </aside >
    );
}
