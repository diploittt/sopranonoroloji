"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, ChevronDown, ChevronUp, Volume2, VolumeX, Radio, Music, Loader2 } from 'lucide-react';

// ═══════════════════════════════════════
//  RADYO İSTASYONLARI
// ═══════════════════════════════════════

interface RadioStation {
    id: string;
    name: string;
    genre: string;
    url: string;
    icon: string;
}

const RADIO_STATIONS: RadioStation[] = [
    { id: 'powerfm', name: 'Power FM', genre: 'Pop / Dance', url: 'https://listen.powerapp.com.tr/powerfm/mpeg/icecast.audio', icon: '⚡' },
    { id: 'powerturk', name: 'Power Türk', genre: 'Türkçe Pop', url: 'https://listen.powerapp.com.tr/powerturk/mpeg/icecast.audio', icon: '🎤' },
    { id: 'kralpop', name: 'Kral Pop', genre: 'Türkçe Pop', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KRAL_POP.mp3', icon: '👑' },
    { id: 'kralfm', name: 'Kral FM', genre: 'Arabesk', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KRAL_FM.mp3', icon: '🎵' },
    { id: 'slowturk', name: 'SlowTürk', genre: 'Slow / Romantik', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/SLOW_TURK.mp3', icon: '💜' },
    { id: 'fenomen', name: 'Radyo Fenomen', genre: 'Pop / Dans', url: 'https://listen.radyofenomen.com/fenomen/128/icecast.audio', icon: '🔥' },
    { id: 'virginfm', name: 'Virgin Radio', genre: 'Pop / Rock', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/VIRGIN_RADIO.mp3', icon: '🎸' },
    { id: 'metrofm', name: 'Metro FM', genre: 'Pop / Hit', url: 'https://listen.powerapp.com.tr/metrofm/mpeg/icecast.audio', icon: '🌆' },
    { id: 'joyfm', name: 'Joy FM', genre: 'Pop / Hit', url: 'https://listen.powerapp.com.tr/joyfm/mpeg/icecast.audio', icon: '😊' },
    { id: 'superfm', name: 'Süper FM', genre: 'Türkçe Pop', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/SUPER_FM.mp3', icon: '🌟' },
    { id: 'bestfm', name: 'Best FM', genre: 'Türkçe Pop', url: 'https://listen.powerapp.com.tr/bestfm/mpeg/icecast.audio', icon: '🏆' },
    { id: 'radyo45lik', name: 'Radyo 45lik', genre: 'Nostalji / Retro', url: 'https://stream.radyo45lik.com:4545/stream', icon: '💿' },
    { id: 'powerfmxl', name: 'Power XL', genre: 'Retro / 90\'lar', url: 'https://listen.powerapp.com.tr/powerfmxl/mpeg/icecast.audio', icon: '🎶' },
    { id: 'joyturk', name: 'JoyTürk', genre: 'Türkçe Rock', url: 'https://listen.powerapp.com.tr/joyturk/mpeg/icecast.audio', icon: '🎧' },
    { id: 'ntv', name: 'NTV Radyo', genre: 'Haber / Aktüel', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/NTV_RADYO.mp3', icon: '📰' },
    { id: 'alemfm', name: 'Alem FM', genre: 'Pop / Eğlence', url: 'https://listen.powerapp.com.tr/alemfm/mpeg/icecast.audio', icon: '🎪' },
];

// ═══════════════════════════════════════
//  RADIO PLAYER COMPONENT
// ═══════════════════════════════════════

export function RadioPlayer() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentStation, setCurrentStation] = useState<RadioStation>(RADIO_STATIONS[0]);
    const [volume, setVolume] = useState(0.5);
    const [isMuted, setIsMuted] = useState(false);
    const [showStationList, setShowStationList] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const stationListRef = useRef<HTMLDivElement>(null);
    const volumeRef = useRef<HTMLDivElement>(null);
    const prevVolumeRef = useRef(0.5);

    // localStorage'dan kayıtlı ayarları yükle
    useEffect(() => {
        const savedStationId = localStorage.getItem('soprano_radio_station');
        const savedVolume = localStorage.getItem('soprano_radio_volume');

        if (savedStationId) {
            const station = RADIO_STATIONS.find(s => s.id === savedStationId);
            if (station) setCurrentStation(station);
        }
        if (savedVolume) {
            let vol = parseFloat(savedVolume);
            if (!isNaN(vol)) {
                // Eski 0-100 formatından gelen değerleri 0-1'e normalize et
                if (vol > 1) vol = vol / 100;
                vol = Math.max(0, Math.min(1, vol));
                setVolume(vol);
            }
        }
    }, []);

    // Audio element oluştur
    useEffect(() => {
        const audio = new Audio();
        // NOT: crossOrigin ayarlanMIYOR — çoğu radyo stream sunucusu CORS header'ı göndermez
        // crossOrigin='anonymous' ayarlandığında browser CORS policy nedeniyle stream'i reddeder
        audio.preload = 'none';
        audioRef.current = audio;

        audio.addEventListener('playing', () => {
            setIsLoading(false);
            setIsPlaying(true);
        });
        audio.addEventListener('waiting', () => setIsLoading(true));
        audio.addEventListener('error', () => {
            setIsLoading(false);
            setIsPlaying(false);
        });
        audio.addEventListener('pause', () => {
            setIsPlaying(false);
            setIsLoading(false);
        });

        return () => {
            audio.pause();
            audio.src = '';
            audio.load();
        };
    }, []);

    // Volume değişikliklerini uygula
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
        }
    }, [volume, isMuted]);

    // Click outside kapatma
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (stationListRef.current && !stationListRef.current.contains(e.target as Node)) {
                setShowStationList(false);
            }
            if (volumeRef.current && !volumeRef.current.contains(e.target as Node)) {
                setShowVolumeSlider(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const playStation = useCallback((station: RadioStation) => {
        const audio = audioRef.current;
        if (!audio) return;

        setIsLoading(true);
        setCurrentStation(station);
        localStorage.setItem('soprano_radio_station', station.id);

        audio.pause();
        audio.src = station.url;
        audio.volume = isMuted ? 0 : volume;
        audio.play().catch(() => {
            setIsLoading(false);
            setIsPlaying(false);
        });
    }, [volume, isMuted]);

    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
            audio.src = '';
            audio.load();
        } else {
            playStation(currentStation);
        }
    }, [isPlaying, currentStation, playStation]);

    const handleStationSelect = useCallback((station: RadioStation) => {
        playStation(station);
        setShowStationList(false);
    }, [playStation]);

    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        setIsMuted(val === 0);
        localStorage.setItem('soprano_radio_volume', val.toString());
    }, []);

    const toggleMute = useCallback(() => {
        if (isMuted) {
            setIsMuted(false);
            setVolume(prevVolumeRef.current || 0.5);
        } else {
            prevVolumeRef.current = volume;
            setIsMuted(true);
        }
    }, [isMuted, volume]);

    return (
        <div style={{
            position: 'relative', overflow: 'visible', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(180deg, rgba(30,41,59,0.6) 0%, rgba(15,23,42,0.8) 100%)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
            {/* Üst kısım — İstasyon bilgisi */}
            <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Play/Pause butonu */}
                <button
                    onClick={togglePlay}
                    className="radio-play-btn"
                    style={{
                        width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(180deg, #5a6070 0%, #3d4250 15%, #1e222e 50%, #282c3a 75%, #3a3f50 100%)',
                        borderTop: '1px solid rgba(120,130,150,0.35)',
                        borderBottom: '1px solid rgba(0,0,0,0.3)',
                        boxShadow: '0 3px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.2s',
                    }}
                >
                    {isLoading ? (
                        <Loader2 style={{ width: 18, height: 18, color: '#94a3b8', animation: 'spin 1s linear infinite' }} />
                    ) : isPlaying ? (
                        <Pause style={{ width: 18, height: 18, color: '#cbd5e1', fill: '#cbd5e1' }} />
                    ) : (
                        <Play style={{ width: 18, height: 18, color: '#cbd5e1', fill: '#cbd5e1', marginLeft: 2 }} />
                    )}
                </button>

                {/* İstasyon bilgisi */}
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.3, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {currentStation.icon} {currentStation.name}
                        </span>
                        {isPlaying && (
                            <span style={{
                                fontSize: 7, fontWeight: 800, color: '#fff', padding: '2px 6px', borderRadius: 4,
                                textTransform: 'uppercase', letterSpacing: 1.5, animation: 'pulse 2s ease-in-out infinite',
                                background: '#dc2626', boxShadow: '0 0 8px rgba(220,38,38,0.5)',
                                flexShrink: 0, marginLeft: 6,
                            }}>
                                CANLI
                            </span>
                        )}
                    </div>
                    <div style={{ width: '100%', overflow: 'hidden', position: 'relative', height: 14 }}>
                        <div style={{
                            position: 'absolute', whiteSpace: 'nowrap', fontSize: 10, color: '#64748b', fontWeight: 500,
                            animation: isPlaying ? 'marquee 15s linear infinite' : 'none',
                        }}>
                            {currentStation.genre} • {currentStation.name} Canlı Yayın
                        </div>
                    </div>
                </div>
            </div>

            {/* Alt kontroller */}
            <div style={{
                padding: '6px 14px 12px', display: 'flex', alignItems: 'center', gap: 8,
                borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 2,
            }}>
                {/* İstasyon Listesi toggle */}
                <div style={{ position: 'relative', flex: 1 }} ref={stationListRef}>
                    <button
                        onClick={() => { setShowStationList(!showStationList); setShowVolumeSlider(false); }}
                        style={{
                            width: '100%', height: 32, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 6, color: '#94a3b8', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <Radio style={{ width: 12, height: 12 }} />
                        Kanallar
                        {showStationList
                            ? <ChevronDown style={{ width: 12, height: 12 }} />
                            : <ChevronUp style={{ width: 12, height: 12 }} />}
                    </button>

                    {/* İstasyon Listesi Dropdown */}
                    {showStationList && (
                        <div style={{
                            position: 'absolute', bottom: '100%', left: 0, width: 220, marginBottom: 8, zIndex: 100,
                            background: 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.95) 100%)',
                            backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
                            boxShadow: '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                            overflow: 'hidden', animation: 'contentFadeIn 0.2s ease both',
                        }}>
                            <div style={{
                                padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <Radio style={{ width: 11, height: 11, color: '#94a3b8' }} />
                                <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5 }}>Radyo Kanalları</span>
                                <span style={{ marginLeft: 'auto', fontSize: 8, color: '#475569' }}>{RADIO_STATIONS.length} kanal</span>
                            </div>
                            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                {RADIO_STATIONS.map((station) => (
                                    <button
                                        key={station.id}
                                        onClick={() => handleStationSelect(station)}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '7px 10px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                            background: currentStation.id === station.id ? 'rgba(148,163,184,0.08)' : 'transparent',
                                            borderBottom: '1px solid rgba(255,255,255,0.02)',
                                            borderLeft: currentStation.id === station.id ? '2px solid #94a3b8' : '2px solid transparent',
                                            transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={e => { if (currentStation.id !== station.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                        onMouseLeave={e => { if (currentStation.id !== station.id) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <span style={{ fontSize: 13, width: 18, textAlign: 'center', flexShrink: 0 }}>{station.icon}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                color: currentStation.id === station.id ? '#e2e8f0' : '#cbd5e1',
                                            }}>
                                                {station.name}
                                            </div>
                                            <div style={{ fontSize: 9, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {station.genre}
                                            </div>
                                        </div>
                                        {currentStation.id === station.id && isPlaying && (
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12, flexShrink: 0 }}>
                                                {[5, 10, 7].map((h, i) => (
                                                    <span key={i} style={{
                                                        width: 2, height: h, borderRadius: 1,
                                                        background: '#94a3b8',
                                                        animation: `musicBar 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                                                    }} />
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Ses Kontrolü */}
                <div style={{ position: 'relative' }} ref={volumeRef}>
                    <button
                        onClick={() => { setShowVolumeSlider(!showVolumeSlider); setShowStationList(false); }}
                        onDoubleClick={toggleMute}
                        style={{
                            height: 32, width: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isMuted || volume === 0 ? '#ef4444' : '#94a3b8', cursor: 'pointer', transition: 'all 0.2s',
                        }}
                        title="Ses (çift tıklayarak sessize al)"
                    >
                        {isMuted || volume === 0
                            ? <VolumeX style={{ width: 14, height: 14 }} />
                            : <Volume2 style={{ width: 14, height: 14 }} />}
                    </button>

                    {/* Volume Slider */}
                    {showVolumeSlider && (
                        <div style={{
                            position: 'absolute', bottom: '100%', right: 0, marginBottom: 8, zIndex: 100,
                            background: 'linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.95) 100%)',
                            backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14,
                            boxShadow: '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                            padding: '14px 16px', animation: 'contentFadeIn 0.2s ease both',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <VolumeX
                                    style={{ width: 12, height: 12, color: '#475569', flexShrink: 0, cursor: 'pointer' }}
                                    onClick={toggleMute}
                                />
                                <input
                                    type="range" min="0" max="1" step="0.01"
                                    value={isMuted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    style={{ width: 96, height: 6, cursor: 'pointer', accentColor: '#94a3b8' }}
                                />
                                <Volume2 style={{ width: 12, height: 12, color: '#475569', flexShrink: 0 }} />
                            </div>
                            <div style={{ textAlign: 'center', marginTop: 6 }}>
                                <span style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace' }}>
                                    {Math.round((isMuted ? 0 : volume) * 100)}%
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Keyframe: musicBar animation */}
            <style>{`
                @keyframes musicBar {
                    0% { height: 3px; }
                    100% { height: 12px; }
                }
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
}
