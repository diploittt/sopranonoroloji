"use client";

import { Lock, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { RoomInfo } from '@/hooks/useSocket';
import { useState, useRef, useEffect, useCallback } from 'react';

// Convert hex to rgba
function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Role hierarchy for stealth visibility ───
const ROLE_HIERARCHY: Record<string, number> = {
    godmaster: 100,
    owner: 90,
    superadmin: 80,
    admin: 70,
    moderator: 60,
    vip: 50,
    member: 30,
    guest: 10,
};

function getVisibleCount(
    participants: any[],
    viewerRole: string,
): number {
    const viewerLevel = ROLE_HIERARCHY[viewerRole.toLowerCase()] || 0;
    return participants.filter(u => {
        // If user is not stealth, always visible
        if (!u.isStealth) return true;
        // Stealth user: viewer can only see them if viewer outranks them
        const userLevel = ROLE_HIERARCHY[(u.role || 'guest').toLowerCase()] || 0;
        return viewerLevel > userLevel;
    }).length;
}

interface HeaderRoomsProps {
    currentSlug: string;
    totalUsers: number;
    currentSpeaker: any;
    rooms?: RoomInfo[];
    systemSettings?: any;
    onNavigate?: (slug: string) => void;
    currentUserRole?: string;
    activeRoomParticipants?: any[];
    isEmbed?: boolean;
}

export function HeaderRooms({
    currentSlug,
    totalUsers,
    currentSpeaker,
    rooms = [],
    systemSettings,
    onNavigate,
    currentUserRole = 'guest',
    activeRoomParticipants,
    isEmbed = false,
}: HeaderRoomsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const showNames = systemSettings?.showRoomName !== false;
    const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const displayRooms = (rooms.length > 0 ? rooms : [
        { id: 'genel', name: 'GENEL SOHBET', slug: 'genel-sohbet', status: 'ACTIVE', isLocked: false, isVipRoom: false, isMeetingRoom: false, participantCount: totalUsers },
    ]).filter(r => !r.isMeetingRoom);

    const count = displayRooms.length;

    // ─── Adaptive sizing based on room count ───
    const tier: 'normal' | 'compact' | 'mini' = count <= 10 ? 'normal' : count <= 20 ? 'compact' : 'mini';

    // Tenant-aware navigation: if we're at /t/[tenant]/room/..., keep the tenant prefix
    const tenantMatch = pathname.match(/^\/t\/([^/]+)\/room\//);
    const navigate = (slug: string) => {
        if (onNavigate) {
            // Soft navigation — no remount, just state change
            const url = tenantMatch ? `/t/${tenantMatch[1]}/room/${slug}` : `/room/${slug}`;
            window.history.pushState({}, '', url);
            onNavigate(slug);
        } else {
            // Fallback: full Next.js navigation
            if (tenantMatch) {
                router.push(`/t/${tenantMatch[1]}/room/${slug}`);
            } else {
                router.push(`/room/${slug}`);
            }
        }
    };


    // ─── Scroll state detection ───
    const updateScrollState = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 2);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    }, []);

    useEffect(() => {
        updateScrollState();
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener('scroll', updateScrollState, { passive: true });
        const ro = new ResizeObserver(updateScrollState);
        ro.observe(el);
        return () => { el.removeEventListener('scroll', updateScrollState); ro.disconnect(); };
    }, [updateScrollState, displayRooms.length]);

    const scroll = (dir: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const amount = el.clientWidth * 0.6;
        el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    };

    return (
        <header className="chat-header h-24 flex-shrink-0 border-b backdrop-blur-xl flex items-center relative z-30" style={{ paddingLeft: 4, paddingRight: 4, background: 'linear-gradient(180deg, rgba(10, 15, 28, 0.95) 0%, rgba(7, 11, 20, 0.85) 100%)', borderColor: 'rgba(6, 182, 212, 0.25)', boxShadow: 'inset 0 -1px 0 rgba(6, 182, 212, 0.1), 0 4px 20px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(6, 182, 212, 0.08)', ...(isEmbed ? { display: 'none' } : {}) }}>

            {/* ◀ Left scroll arrow */}
            {canScrollLeft && (
                <button
                    onClick={() => scroll('left')}
                    className="flex-shrink-0 flex items-center justify-center rounded-lg transition-all duration-200 hover:bg-white/10 active:scale-90"
                    style={{
                        width: 28, height: 40,
                        background: 'linear-gradient(90deg, rgba(15,22,38,0.95) 0%, rgba(15,22,38,0.3) 100%)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        zIndex: 5,
                        marginRight: -4,
                    }}
                >
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                </button>
            )}

            {/* ─── Scrollable Room Tabs ─── */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-x-auto no-scrollbar"
                style={{
                    scrollBehavior: 'smooth',
                    paddingLeft: 8,
                    paddingRight: 8,
                    maskImage: `linear-gradient(to right, ${canScrollLeft ? 'transparent 0%, black 24px' : 'black 0%'}, ${canScrollRight ? 'black calc(100% - 24px), transparent 100%' : 'black 100%'})`,
                    WebkitMaskImage: `linear-gradient(to right, ${canScrollLeft ? 'transparent 0%, black 24px' : 'black 0%'}, ${canScrollRight ? 'black calc(100% - 24px), transparent 100%' : 'black 100%'})`,
                }}
            >
                <div
                    className="inline-flex items-center w-fit min-w-full justify-center"
                    style={{ gap: tier === 'mini' ? 6 : tier === 'compact' ? 8 : 10 }}
                >
                    {displayRooms.map((room) => {
                        const isActive = currentSlug === room.slug || currentSlug === room.id;
                        const isHovered = hoveredRoom === room.id;
                        const btnColor = room.buttonColor || '#06b6d4';

                        // ★ Stealth-aware participant count: active room uses hierarchy filter
                        const visibleCount = (isActive && activeRoomParticipants)
                            ? getVisibleCount(activeRoomParticipants, currentUserRole)
                            : room.participantCount;

                        // ════════════════════════════════════════
                        // TIER: MINI — lots of rooms (21+)
                        // ════════════════════════════════════════
                        if (tier === 'mini') {
                            return (
                                <div key={room.id} className="relative flex-shrink-0">
                                    <button
                                        onClick={() => navigate(room.slug)}
                                        onMouseEnter={() => setHoveredRoom(room.id)}
                                        onMouseLeave={() => setHoveredRoom(null)}
                                        className={`group relative flex items-center gap-1.5 rounded-lg transition-all duration-300`}
                                        style={{
                                            padding: '6px 10px',
                                            background: isActive
                                                ? `linear-gradient(135deg, ${hexToRgba(btnColor, 0.15)} 0%, ${hexToRgba(btnColor, 0.06)} 100%)`
                                                : isHovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
                                            border: isActive
                                                ? `1px solid ${hexToRgba(btnColor, 0.25)}`
                                                : '1px solid rgba(255,255,255,0.04)',
                                            borderRadius: 10,
                                            boxShadow: isActive ? `0 2px 12px ${hexToRgba(btnColor, 0.1)}` : 'none',
                                            backdropFilter: 'blur(8px)',
                                        }}
                                    >
                                        {showNames && (
                                            <span className="text-[10px] font-semibold truncate max-w-[60px]" style={{ color: isActive ? '#e8ecf4' : '#7c8698', transition: 'color 0.3s' }}>
                                                {room.name}
                                            </span>
                                        )}
                                        <span className="text-[9px] font-bold tabular-nums" style={{ color: isActive ? hexToRgba(btnColor, 0.9) : '#4b5563', transition: 'color 0.3s' }}>
                                            {visibleCount}
                                        </span>
                                        {room.isLocked && <Lock className="w-2.5 h-2.5 flex-shrink-0" style={{ color: hexToRgba(btnColor, 0.7) }} />}
                                        {isActive && (
                                            <div className="absolute -bottom-px left-1/2 -translate-x-1/2 rounded-full" style={{ width: 16, height: 2, background: `linear-gradient(90deg, transparent, ${btnColor}, transparent)` }} />
                                        )}
                                    </button>
                                    {!showNames && (
                                        <div className="absolute left-1/2 pointer-events-none transition-all duration-300 whitespace-nowrap"
                                            style={{
                                                top: 'calc(100% + 6px)', zIndex: 50,
                                                opacity: isHovered ? 1 : 0,
                                                transform: `translateX(-50%) translateY(${isHovered ? '0' : '-4px'})`,
                                                background: 'rgba(15, 22, 38, 0.9)', border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: 8, padding: '4px 10px', backdropFilter: 'blur(12px)',
                                                boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
                                            }}>
                                            <span className="text-[10px] font-semibold text-white/85">{room.name}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // ════════════════════════════════════════
                        // TIER: COMPACT — medium room count (11-20)
                        // ════════════════════════════════════════
                        if (tier === 'compact') {
                            return (
                                <div key={room.id} className="relative flex-shrink-0">
                                    <button
                                        onClick={() => navigate(room.slug)}
                                        onMouseEnter={() => setHoveredRoom(room.id)}
                                        onMouseLeave={() => setHoveredRoom(null)}
                                        className={`group relative flex items-center gap-2 transition-all duration-300`}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: 12,
                                            background: isActive
                                                ? `linear-gradient(135deg, ${hexToRgba(btnColor, 0.14)} 0%, ${hexToRgba(btnColor, 0.05)} 100%)`
                                                : isHovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                                            border: isActive
                                                ? `1px solid ${hexToRgba(btnColor, 0.25)}`
                                                : '1px solid rgba(255,255,255,0.05)',
                                            boxShadow: isActive ? `0 2px 16px ${hexToRgba(btnColor, 0.1)}, inset 0 1px 0 rgba(255,255,255,0.04)` : isHovered ? 'inset 0 1px 0 rgba(255,255,255,0.03)' : 'none',
                                            backdropFilter: 'blur(8px)',
                                        }}
                                    >
                                        {showNames && (
                                            <span className="text-[11px] font-semibold truncate max-w-[80px]" style={{ color: isActive ? '#e8ecf4' : isHovered ? '#b8c0d0' : '#8892a6', transition: 'color 0.3s' }}>
                                                {room.name}
                                            </span>
                                        )}
                                        <div className="flex items-center gap-1" style={{ opacity: isActive ? 1 : 0.7, transition: 'opacity 0.3s' }}>
                                            <Users className="w-3 h-3" style={{ color: isActive ? btnColor : '#4b5563', transition: 'color 0.3s' }} />
                                            <span className="text-[10px] font-bold tabular-nums" style={{ color: isActive ? hexToRgba(btnColor, 0.85) : '#4b5563', transition: 'color 0.3s' }}>
                                                {visibleCount}
                                            </span>
                                        </div>
                                        {room.isLocked && <Lock className="w-3 h-3 flex-shrink-0" style={{ color: hexToRgba(btnColor, 0.6) }} />}
                                        {room.isVipRoom && (
                                            <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-md" style={{ background: hexToRgba(btnColor, 0.12), color: btnColor, border: `1px solid ${hexToRgba(btnColor, 0.2)}` }}>VIP</span>
                                        )}
                                        {isActive && (
                                            <div className="absolute -bottom-px left-1/2 -translate-x-1/2 rounded-full" style={{ width: 20, height: 2, background: `linear-gradient(90deg, transparent, ${btnColor}, transparent)`, boxShadow: `0 2px 8px ${hexToRgba(btnColor, 0.35)}` }} />
                                        )}
                                    </button>
                                    {!showNames && (
                                        <div className="absolute left-1/2 pointer-events-none transition-all duration-300 whitespace-nowrap"
                                            style={{
                                                top: 'calc(100% + 6px)', zIndex: 50,
                                                opacity: isHovered ? 1 : 0,
                                                transform: `translateX(-50%) translateY(${isHovered ? '0' : '-4px'})`,
                                                background: 'rgba(15, 22, 38, 0.9)', border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: 8, padding: '5px 12px', backdropFilter: 'blur(12px)',
                                                boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
                                            }}>
                                            <span className="text-[10px] font-semibold text-white/85">{room.name}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        // ════════════════════════════════════════
                        // TIER: NORMAL — few rooms (1-10)
                        // ════════════════════════════════════════
                        if (showNames) {
                            return (
                                <button
                                    key={room.id}
                                    onClick={() => navigate(room.slug)}
                                    onMouseEnter={() => setHoveredRoom(room.id)}
                                    onMouseLeave={() => setHoveredRoom(null)}
                                    className={`flex-shrink-0 h-[52px] flex items-center justify-center gap-3 group relative transition-all duration-300`}
                                    style={{
                                        minWidth: 130,
                                        maxWidth: 240,
                                        padding: '0 24px',
                                        borderRadius: 16,
                                        background: isActive
                                            ? 'linear-gradient(160deg, rgba(147,141,210,0.35) 0%, rgba(178,175,220,0.2) 50%, rgba(200,198,235,0.12) 100%)'
                                            : isHovered
                                                ? 'linear-gradient(160deg, rgba(147,141,210,0.12) 0%, rgba(178,175,220,0.06) 100%)'
                                                : 'linear-gradient(160deg, rgba(147,141,210,0.06) 0%, rgba(178,175,220,0.03) 100%)',
                                        border: isActive
                                            ? '1px solid rgba(165,160,220,0.35)'
                                            : `1px solid ${isHovered ? 'rgba(165,160,220,0.18)' : 'rgba(165,160,220,0.08)'}`,
                                        boxShadow: isActive
                                            ? '0 4px 24px rgba(147,141,210,0.15), inset 0 1px 0 rgba(255,255,255,0.08)'
                                            : isHovered ? 'inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
                                        backdropFilter: 'blur(12px)',
                                    }}
                                >
                                    <div className="flex flex-col items-start min-w-0">
                                        <span className="text-[13px] font-bold tracking-wide truncate max-w-full" style={{ color: isActive ? '#e8e6f4' : isHovered ? '#c8c5e0' : '#a09cb8', transition: 'color 0.3s' }}>
                                            {room.name}
                                        </span>
                                        <span className="text-[10px] flex items-center gap-1 font-medium" style={{ color: isActive ? 'rgba(190,185,230,0.9)' : '#6b6890', transition: 'color 0.3s' }}>
                                            {room.isLocked && <Lock className="w-2.5 h-2.5" />}
                                            {room.isVipRoom ? 'VIP' : `${visibleCount} Kişi`}
                                        </span>
                                    </div>
                                    {isActive && (
                                        <div className="absolute -bottom-px left-1/2 -translate-x-1/2 rounded-full" style={{ width: 28, height: 2.5, background: 'linear-gradient(90deg, transparent, rgba(165,160,220,0.8), transparent)', boxShadow: '0 2px 12px rgba(165,160,220,0.4)' }} />
                                    )}
                                </button>
                            );
                        }

                        // Normal tier, hidden names
                        return (
                            <div key={room.id} className="relative flex-shrink-0">
                                <button
                                    onClick={() => navigate(room.slug)}
                                    onMouseEnter={() => setHoveredRoom(room.id)}
                                    onMouseLeave={() => setHoveredRoom(null)}
                                    className={`group relative flex items-center gap-2 transition-all duration-300`}
                                    style={{
                                        padding: isActive ? '10px 20px' : '10px 16px',
                                        borderRadius: 14,
                                        background: isActive
                                            ? `linear-gradient(135deg, ${hexToRgba(btnColor, 0.14)} 0%, ${hexToRgba(btnColor, 0.05)} 100%)`
                                            : isHovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                                        border: isActive
                                            ? `1px solid ${hexToRgba(btnColor, 0.25)}`
                                            : `1px solid ${isHovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
                                        boxShadow: isActive
                                            ? `0 4px 20px ${hexToRgba(btnColor, 0.12)}, inset 0 1px 0 rgba(255,255,255,0.05)`
                                            : isHovered ? 'inset 0 1px 0 rgba(255,255,255,0.03)' : 'none',
                                        backdropFilter: 'blur(12px)',
                                    }}
                                >
                                    <div className="flex items-center gap-1" style={{ opacity: isActive ? 1 : isHovered ? 0.85 : 0.65, transition: 'opacity 0.3s' }}>
                                        <Users className="w-3 h-3" style={{ color: isActive ? btnColor : '#4b5563', transition: 'color 0.3s' }} />
                                        <span className="text-[11px] font-bold tabular-nums" style={{ color: isActive ? hexToRgba(btnColor, 0.85) : '#4b5563', transition: 'color 0.3s' }}>
                                            {visibleCount}
                                        </span>
                                    </div>
                                    {room.isLocked && <Lock className="w-3 h-3" style={{ color: hexToRgba(btnColor, 0.6) }} />}
                                    {room.isVipRoom && (
                                        <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-md" style={{ background: hexToRgba(btnColor, 0.12), color: btnColor, border: `1px solid ${hexToRgba(btnColor, 0.2)}` }}>VIP</span>
                                    )}
                                    {isActive && (
                                        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full" style={{ width: 20, height: 2, background: `linear-gradient(90deg, transparent, ${btnColor}, transparent)`, boxShadow: `0 2px 10px ${hexToRgba(btnColor, 0.4)}` }} />
                                    )}
                                </button>
                                {/* Tooltip */}
                                <div className="absolute left-1/2 pointer-events-none transition-all duration-300 whitespace-nowrap"
                                    style={{
                                        top: 'calc(100% + 8px)', zIndex: 50,
                                        opacity: isHovered ? 1 : 0,
                                        transform: `translateX(-50%) translateY(${isHovered ? '0px' : '-6px'})`,
                                        background: 'rgba(15, 22, 38, 0.92)',
                                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                                        padding: '6px 14px', backdropFilter: 'blur(12px)',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                    }}>
                                    <span className="text-[11px] font-semibold text-white/85">{room.name}</span>
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45"
                                        style={{ background: 'rgba(15, 22, 38, 0.92)', borderTop: '1px solid rgba(255,255,255,0.08)', borderLeft: '1px solid rgba(255,255,255,0.08)' }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ▶ Right scroll arrow */}
            {canScrollRight && (
                <button
                    onClick={() => scroll('right')}
                    className="flex-shrink-0 flex items-center justify-center rounded-lg transition-all duration-200 hover:bg-white/10 active:scale-90"
                    style={{
                        width: 28, height: 40,
                        background: 'linear-gradient(270deg, rgba(15,22,38,0.95) 0%, rgba(15,22,38,0.3) 100%)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        zIndex: 5,
                        marginLeft: -4,
                    }}
                >
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
            )}
        </header>
    );
}
