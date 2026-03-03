"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { VideoStateProps } from '@/hooks/useVideoState';
import { useTranslation } from '@/i18n/LanguageProvider';
import { useCurrentTheme } from '@/hooks/useCurrentTheme';

// Extract YouTube video ID from various URL formats
function extractYoutubeId(url: string): string | null {
    try {
        const u = new URL(url.trim());
        if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
        if (u.pathname === '/watch') return u.searchParams.get('v');
        if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2] || null;
        if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null;
    } catch { return null; }
    return null;
}

interface RightLivePanelProps {
    speakerStream: MediaStream | null;
    speakerUsername?: string;
    otherStreams: { id: string; stream: MediaStream; username?: string }[];
    remoteVolume: number;
    isSpeakerLocal: boolean;
    onPinStream?: (userId: string) => void;
    tvVideoUrl?: string | null;
    tvVolume?: number;
    userLevel?: number;
    tvBroadcastLevel?: number;
    onSetTvVideo?: (url: string | null) => void;
}

export function RightLivePanel({
    speakerStream,
    speakerUsername,
    otherStreams,
    remoteVolume,
    isSpeakerLocal,
    onPinStream,
    tvVideoUrl,
    tvVolume = 0.7,
    userLevel = 0,
    tvBroadcastLevel = 0,
    onSetTvVideo
}: RightLivePanelProps) {
    const tvVideoRef = useRef<HTMLVideoElement>(null);
    const [collapsed, setCollapsed] = useState(false);
    const [expandedStream, setExpandedStream] = useState<MediaStream | null>(null);
    const [expandedUsername, setExpandedUsername] = useState<string>('');
    const [tvPaused, setTvPaused] = useState(false);
    const [ytInputOpen, setYtInputOpen] = useState(false);
    const [ytInputValue, setYtInputValue] = useState('');
    const { t } = useTranslation();
    const currentTheme = useCurrentTheme();
    const isHasbihal = currentTheme === 'hasbihal-islamic';
    // Detect if URL is YouTube
    const isYoutubeUrl = tvVideoUrl ? !!extractYoutubeId(tvVideoUrl) : false;
    const tvVideoRef2 = useRef<HTMLVideoElement>(null);
    const ytIframeRef = useRef<HTMLIFrameElement>(null);

    // ★ tvVideoUrl değiştiğinde tvPaused'ı sıfırla
    useEffect(() => { setTvPaused(false); }, [tvVideoUrl]);

    // Apply tvVolume to direct video element
    useEffect(() => {
        if (tvVideoRef2.current) {
            let vol = Number.isFinite(tvVolume) ? tvVolume : 0.7;
            if (vol < 0) vol = 0;
            if (vol > 1) vol = 1;
            tvVideoRef2.current.volume = vol;
            tvVideoRef2.current.muted = vol === 0;
        }
    }, [tvVolume]);

    // Apply tvVolume to YouTube iframe via postMessage
    useEffect(() => {
        if (ytIframeRef.current && isYoutubeUrl) {
            const vol = Math.round(Math.max(0, Math.min(1, tvVolume)) * 100);
            try {
                ytIframeRef.current.contentWindow?.postMessage(
                    JSON.stringify({ event: 'command', func: vol === 0 ? 'mute' : 'unMute', args: [] }),
                    '*'
                );
                ytIframeRef.current.contentWindow?.postMessage(
                    JSON.stringify({ event: 'command', func: 'setVolume', args: [vol] }),
                    '*'
                );
            } catch (e) { /* cross-origin safety */ }
        }
    }, [tvVolume, isYoutubeUrl]);

    // TV Stream Effect & Volume Control
    useEffect(() => {
        if (tvVideoRef.current) {
            // Assign stream only if changed to avoid flicker
            if (speakerStream && tvVideoRef.current.srcObject !== speakerStream) {
                tvVideoRef.current.srcObject = speakerStream;
            } else if (!speakerStream) {
                tvVideoRef.current.srcObject = null;
            }

            // Fix: Sanitize and clamp volume ("volume is non-finite" fix)
            let safeVolume = Number.isFinite(remoteVolume) ? remoteVolume : 0.7;
            if (safeVolume < 0) safeVolume = 0;
            if (safeVolume > 1) safeVolume = 1;

            tvVideoRef.current.volume = safeVolume;
            // Mute if local speaker OR volume is effectively 0
            tvVideoRef.current.muted = isSpeakerLocal || safeVolume === 0;
        }
    }, [speakerStream, remoteVolume, isSpeakerLocal]);

    // ESC tuşu ile kapat
    useEffect(() => {
        if (!expandedStream) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { setExpandedStream(null); setExpandedUsername(''); }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [expandedStream]);

    // ═══════════════════════════════════════
    //  COLLAPSED STATE — thin vertical strip
    // ═══════════════════════════════════════
    if (collapsed) {
        return (
            <aside
                className="right-live-panel live-panel-collapsed flex-shrink-0 bg-[#0C101A] border-l border-white/5 flex flex-col items-center z-20 transition-all duration-300"
                style={{ width: 40 }}
            >
                <button
                    onClick={() => setCollapsed(false)}
                    className="mt-4 p-1.5 rounded-lg transition-all duration-200 hover:bg-white/10 group"
                    title={t.openPanel}
                    style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                    }}
                >
                    <PanelRightOpen className="w-4 h-4 text-red-400 group-hover:text-red-300 transition-colors" />
                </button>
                {/* Vertical "CANLI YAYIN" text */}
                <div
                    className="mt-4 text-[8px] font-bold tracking-[0.3em] text-red-400/60"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.2em' }}
                >
                    {t.broadcast}
                </div>
                {/* Small live dot */}
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            </aside>
        );
    }

    // ═══════════════════════════════════════
    //  EXPANDED STATE — full panel
    // ═══════════════════════════════════════
    return (
        <aside className="right-live-panel sidebar-right live-panel w-80 flex-shrink-0 bg-[#0C101A] border-l border-white/5 flex flex-col z-20 items-center pt-8 overflow-y-auto custom-scrollbar pb-4 relative transition-all duration-300 shadow-[-15px_0_50px_rgba(0,0,0,0.8)]">

            {/* --- LIVE BADGE + CLOSE BUTTON --- */}
            <div className="mb-4 flex items-center gap-3 w-full px-6">
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${isHasbihal ? 'bg-[#064e3b] border border-[#7b9fef] shadow-[0_0_15px_rgba(123,159,239,0.3)]' : 'bg-red-500/10 border border-red-500/20'}`}>
                    <span className="relative flex h-2 w-2">
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isHasbihal ? 'bg-[#7b9fef]' : 'bg-red-500'} animate-pulse`}></span>
                    </span>
                    <span className={`live-text text-[10px] font-bold tracking-[0.2em] ${isHasbihal ? 'text-[#a3bfff]' : 'text-red-400'}`} style={isHasbihal ? { fontFamily: "'Aref Ruqaa', serif", letterSpacing: '0.15em', paddingTop: '0.25rem' } : undefined}>{isHasbihal ? 'CANLI SOHBETİ' : t.liveStream}</span>
                </div>
                <div style={{ flex: 1 }} />
                <button
                    onClick={() => setCollapsed(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#6b7280',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; e.currentTarget.style.color = '#d1d5db'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; e.currentTarget.style.color = '#6b7280'; }}
                    title={t.closePanel}
                >
                    <PanelRightClose className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* --- TV SECTION --- */}
            <div className="tv-wrapper relative shrink-0">
                <div className={`tv-monitor ${speakerStream || tvVideoUrl ? 'tv-broadcasting' : ''}`}>
                    <div className="w-full h-full bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden tv-screen">
                        {/* SIGNAL ANIMATION (ALWAYS RENDERED IN BACK) */}
                        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500 ${speakerStream ? 'opacity-0' : 'opacity-100'}`}>
                            {tvVideoUrl && !speakerStream ? (
                                /* Video Yayını — TV boşta iken */
                                isYoutubeUrl ? (
                                    <iframe
                                        ref={ytIframeRef}
                                        src={`https://www.youtube.com/embed/${extractYoutubeId(tvVideoUrl)}?autoplay=1&mute=0&loop=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                                        title="TV Video"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="absolute inset-0 w-full h-full z-[1]"
                                        style={{ border: 'none' }}
                                    />
                                ) : (
                                    <video
                                        ref={tvVideoRef2}
                                        src={tvVideoUrl}
                                        autoPlay
                                        loop
                                        playsInline
                                        className="absolute inset-0 w-full h-full z-[1] object-contain"
                                        style={{ background: '#000' }}
                                    />
                                )
                            ) : (
                                <>
                                    {/* TV Static — GIF tabanlı klasik karıncalanma */}
                                    <div className="absolute inset-0" style={{ background: 'url(https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif) center/cover', opacity: 0.6 }} />
                                    {/* Scanlines + RGB shift overlay */}
                                    <div className="absolute inset-0 pointer-events-none z-[2]" style={{ background: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))', backgroundSize: '100% 2px, 3px 100%' }} />
                                </>
                            )}
                        </div>

                        {/* LIVE VIDEO (OVERLAY) — Tıkla büyüt */}
                        <div
                            className="absolute inset-0 z-10 cursor-pointer"
                            onClick={() => { if (speakerStream) { setExpandedStream(speakerStream); setExpandedUsername(speakerUsername || 'Konuşmacı'); } }}
                            title="Tıkla büyüt"
                        />
                        <video
                            ref={tvVideoRef}
                            autoPlay
                            playsInline
                            className={`tv-video transition-opacity duration-500 ${speakerStream ? 'opacity-100' : 'opacity-0'}`}
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] z-20 pointer-events-none tv-animation-overlay"></div>
                        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                        {/* Label Overlay */}
                        {speakerStream && speakerUsername && (
                            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white font-medium z-30">
                                {speakerUsername}
                            </div>
                        )}

                        {/* BROADCAST BADGE */}
                        {speakerStream && (
                            <div className="absolute top-2 right-2 z-40">
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-600/90 rounded-full shadow-lg border border-red-500/50">
                                    <span className="relative flex h-2 w-2">
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                    </span>
                                    <span className="text-[8px] font-bold text-white tracking-widest drop-shadow-sm">{t.onAir}</span>
                                </div>
                            </div>
                        )}

                        {/* Video Yayını Badge */}
                        {tvVideoUrl && !speakerStream && (
                            <div className="absolute top-2 left-2 z-40">
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-600/90 rounded-full shadow-lg border border-red-500/50">
                                    <span className="text-[8px]">▶</span>
                                    <span className="text-[8px] font-bold text-white tracking-wide">{isYoutubeUrl ? 'YouTube' : 'Video'}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-4 px-8 text-center shrink-0">
                <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                    {speakerStream ? (speakerUsername ? `${speakerUsername} ${t.broadcasting}.` : t.liveConnectionActive) : tvVideoUrl ? (isYoutubeUrl ? 'YouTube yayını devam ediyor.' : 'Video yayını devam ediyor.') : t.waitingStream}
                </p>
            </div>


            {/* --- TV Controls (Admin+) --- */}
            {userLevel >= 5 && (
                <div className="px-3 mt-2 shrink-0">
                    {tvVideoUrl && !speakerStream ? (
                        <div className="flex flex-col gap-1">
                            {/* Duraklat / Devam Et butonu */}
                            <button
                                onClick={() => {
                                    if (isYoutubeUrl && ytIframeRef.current?.contentWindow) {
                                        ytIframeRef.current.contentWindow.postMessage(
                                            JSON.stringify({ event: 'command', func: tvPaused ? 'playVideo' : 'pauseVideo' }),
                                            '*'
                                        );
                                    }
                                    if (!isYoutubeUrl && tvVideoRef2.current) {
                                        tvPaused ? tvVideoRef2.current.play() : tvVideoRef2.current.pause();
                                    }
                                    setTvPaused(!tvPaused);
                                }}
                                className="w-full px-3 py-1.5 rounded-lg text-[10px] font-medium bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-500/20 transition-all"
                            >
                                {tvPaused ? '▶ Devam Et' : '⏸ Duraklat'}
                            </button>
                            {/* Durdur butonu — sadece yayın seviyesi eşit veya düşük olanlar görebilir */}
                            {userLevel >= tvBroadcastLevel && (
                                <button
                                    onClick={() => onSetTvVideo?.(null)}
                                    className="w-full px-3 py-1.5 rounded-lg text-[10px] font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/20 transition-all"
                                >
                                    ■ Yayını Durdur
                                </button>
                            )}
                        </div>
                    ) : !speakerStream ? (
                        ytInputOpen ? (
                            <div className="flex gap-1">
                                <input
                                    type="text"
                                    value={ytInputValue}
                                    onChange={e => setYtInputValue(e.target.value)}
                                    placeholder="YouTube veya Video URL yapıştır..."
                                    className="flex-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-gray-200 outline-none focus:border-red-500/40 placeholder:text-gray-600"
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && ytInputValue.trim()) {
                                            onSetTvVideo?.(ytInputValue.trim());
                                            setYtInputValue('');
                                            setYtInputOpen(false);
                                        }
                                        if (e.key === 'Escape') { setYtInputOpen(false); setYtInputValue(''); }
                                    }}
                                    autoFocus
                                />
                                <button
                                    onClick={() => {
                                        if (ytInputValue.trim()) {
                                            onSetTvVideo?.(ytInputValue.trim());
                                            setYtInputValue('');
                                            setYtInputOpen(false);
                                        }
                                    }}
                                    className="px-2 py-1 rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30 text-[10px] font-medium border border-red-500/20 transition-all"
                                >
                                    ▶
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setYtInputOpen(true)}
                                className="w-full px-3 py-1.5 rounded-lg text-[10px] font-medium bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 border border-white/10 transition-all"
                            >
                                🎬 Video Yayını Başlat
                            </button>
                        )
                    ) : null}
                </div>
            )}

            {/* --- OTHER CAMS GRID (2 Cols) --- */}
            {otherStreams.length > 0 && (
                <div className="w-full px-4 mt-8 grid grid-cols-2 gap-3">
                    {otherStreams.map(item => (
                        <div
                            key={item.id}
                            onClick={() => {
                                setExpandedStream(item.stream);
                                setExpandedUsername(item.username || item.id);
                            }}
                            className="aspect-video bg-black/40 rounded-2xl overflow-hidden border border-white/5 relative group cursor-pointer hover:border-[#7b9fef]/50 hover:shadow-[0_0_15px_rgba(123,159,239,0.15)] transition-all duration-200"
                            title="Tıkla büyüt"
                        >
                            <VideoPlayer stream={item.stream} />
                            <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-white/70 truncate max-w-[90%]">
                                {item.username || item.id}
                            </div>
                            {/* Büyütme ikonu */}
                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Maximize2 className="w-3.5 h-3.5 text-white/70" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Fullscreen Video Modal */}
            {expandedStream && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    onClick={() => { setExpandedStream(null); setExpandedUsername(''); }}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

                    {/* Video Container */}
                    <div
                        className="relative z-10 w-[90vw] max-w-[900px] max-h-[80vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Üst bar */}
                        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 animate-pulse" />
                                </span>
                                <span className="text-xs font-bold text-white/90">{expandedUsername}</span>
                            </div>
                            <button
                                onClick={() => { setExpandedStream(null); setExpandedUsername(''); }}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-200"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Video */}
                        <ExpandedVideoPlayer stream={expandedStream} />
                    </div>
                </div>,
                document.body
            )}

        </aside>
    );
}

function VideoPlayer({ stream }: { stream: MediaStream }) {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (ref.current && stream) ref.current.srcObject = stream;
    }, [stream]);
    return <video ref={ref} autoPlay playsInline muted className="w-full h-full object-cover" />;
}

function ExpandedVideoPlayer({ stream }: { stream: MediaStream }) {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (ref.current && stream) ref.current.srcObject = stream;
    }, [stream]);
    return <video ref={ref} autoPlay playsInline className="w-full h-auto max-h-[80vh] object-contain" />;
}
