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
    { id: 'kralpop', name: 'Kral Pop', genre: 'Türkçe Pop', url: 'https://listen.powerapp.com.tr/kralpop/mpeg/icecast.audio', icon: '👑' },
    { id: 'kralfm', name: 'Kral FM', genre: 'Arabesk', url: 'https://listen.powerapp.com.tr/kralfm/mpeg/icecast.audio', icon: '🎵' },
    { id: 'slowturk', name: 'SlowTürk', genre: 'Slow / Romantik', url: 'https://listen.powerapp.com.tr/slowturk/mpeg/icecast.audio', icon: '💜' },
    { id: 'fenomen', name: 'Radyo Fenomen', genre: 'Pop / Dans', url: 'https://listen.radyofenomen.com/fenomen/128/icecast.audio', icon: '🔥' },
    { id: 'virginfm', name: 'Virgin Radio', genre: 'Pop / Rock', url: 'https://listen.powerapp.com.tr/virginradio/mpeg/icecast.audio', icon: '🎸' },
    { id: 'metrofm', name: 'Metro FM', genre: 'Pop / Hit', url: 'https://listen.powerapp.com.tr/metrofm/mpeg/icecast.audio', icon: '🌆' },
    { id: 'joyfm', name: 'Joy FM', genre: 'Pop / Hit', url: 'https://listen.powerapp.com.tr/joyfm/mpeg/icecast.audio', icon: '😊' },
    { id: 'superfm', name: 'Süper FM', genre: 'Türkçe Pop', url: 'https://listen.powerapp.com.tr/superfm/mpeg/icecast.audio', icon: '🌟' },
    { id: 'bestfm', name: 'Best FM', genre: 'Türkçe Pop', url: 'https://listen.powerapp.com.tr/bestfm/mpeg/icecast.audio', icon: '🏆' },
    { id: 'radyo45lik', name: 'Radyo 45lik', genre: 'Nostalji / Retro', url: 'https://stream.radyo45lik.com:4545/stream', icon: '💿' },
    { id: 'powerfmxl', name: 'Power XL', genre: 'Retro / 90\'lar', url: 'https://listen.powerapp.com.tr/powerfmxl/mpeg/icecast.audio', icon: '🎶' },
    { id: 'joyturk', name: 'JoyTürk', genre: 'Türkçe Rock', url: 'https://listen.powerapp.com.tr/joyturk/mpeg/icecast.audio', icon: '🎧' },
    { id: 'ntv', name: 'NTV Radyo', genre: 'Haber / Aktüel', url: 'https://listen.powerapp.com.tr/ntvradyo/mpeg/icecast.audio', icon: '📰' },
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

    // Sonraki/Önceki istasyon
    const switchStation = useCallback((direction: 1 | -1) => {
        const idx = RADIO_STATIONS.findIndex(s => s.id === currentStation.id);
        const nextIdx = (idx + direction + RADIO_STATIONS.length) % RADIO_STATIONS.length;
        playStation(RADIO_STATIONS[nextIdx]);
    }, [currentStation, playStation]);

    const chatTeal = "#4fb1b3";
    const effectiveVolume = isMuted ? 0 : volume;

    return (
        <div style={{ position: 'relative', overflow: 'visible' }}>
            {/* Compact Radio Card */}
            <div className="slim-radio-card">

                {/* Station Display */}
                <div className="slim-radio-display">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 1 }}>
                        <span style={{ fontSize: 10 }}>{currentStation.icon}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#e2e8f0', letterSpacing: 0.3 }}>
                            {currentStation.name}
                        </span>
                        {isPlaying && (
                            <span style={{
                                fontSize: 5, fontWeight: 800, color: '#fff', padding: '1px 3px', borderRadius: 2,
                                background: chatTeal, marginLeft: 2,
                                animation: 'pulse 2s ease-in-out infinite',
                            }}>CANLI</span>
                        )}
                    </div>
                    <p style={{
                        fontSize: 8, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: 0.5, color: 'rgba(79,177,179,0.7)', margin: 0,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {currentStation.genre}
                    </p>
                </div>

                {/* Controls Row */}
                <div className="slim-radio-controls">
                    <button className="slim-btn-skip" onClick={() => switchStation(-1)}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20 18V6l-8 6 8 6zm-2 0V6H6v12h12zM4 6H2v12h2V6z" /></svg>
                    </button>

                    <button className={`slim-btn-play ${isPlaying ? 'active' : ''}`} onClick={togglePlay}>
                        {isLoading ? (
                            <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                        ) : isPlaying ? (
                            <Pause style={{ width: 14, height: 14, fill: 'currentColor' }} />
                        ) : (
                            <Play style={{ width: 14, height: 14, fill: 'currentColor', marginLeft: 1 }} />
                        )}
                    </button>

                    <button className="slim-btn-skip" onClick={() => switchStation(1)}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18V6l8 6-8 6zm2 0V6h12v12H6zm16-12h-2v12h2V6z" /></svg>
                    </button>
                </div>

                {/* Volume Slider */}
                <div style={{ padding: '0 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                            onClick={toggleMute}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                        >
                            {isMuted || volume === 0 ? (
                                <VolumeX style={{ width: 12, height: 12, color: '#475569' }} />
                            ) : (
                                <Volume2 style={{ width: 12, height: 12, color: 'rgba(79,177,179,0.6)' }} />
                            )}
                        </button>
                        <div
                            className="slim-volume-track"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                                setVolume(x);
                                setIsMuted(x === 0);
                                localStorage.setItem('soprano_radio_volume', x.toString());
                            }}
                        >
                            <div className="slim-volume-fill" style={{ width: `${effectiveVolume * 100}%` }} />
                            <div className="slim-volume-knob" style={{ left: `${effectiveVolume * 100}%` }} />
                        </div>
                    </div>
                </div>

                {/* Channels Button */}
                <div style={{ position: 'relative' }} ref={stationListRef}>
                    <button
                        className="slim-channels-btn"
                        onClick={() => { setShowStationList(!showStationList); setShowVolumeSlider(false); }}
                    >
                        <Radio style={{ width: 10, height: 10 }} />
                        KANALLAR
                    </button>

                    {/* Station List Dropdown */}
                    {showStationList && (
                        <div className="slim-dropdown" style={{
                            position: 'absolute', bottom: '100%', left: 0, width: '100%', marginBottom: 6,
                            animation: 'contentFadeIn 0.2s ease both',
                        }}>
                            <div style={{
                                padding: '8px 12px', borderBottom: '1px solid #e2e8f0',
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                                <Radio style={{ width: 10, height: 10, color: '#3b82f6' }} />
                                <span style={{ fontSize: 8, fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1.5 }}>Radyo Kanalları</span>
                                <span style={{ marginLeft: 'auto', fontSize: 7, color: '#94a3b8' }}>{RADIO_STATIONS.length}</span>
                            </div>
                            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                {RADIO_STATIONS.map((station) => (
                                    <button
                                        key={station.id}
                                        className={`slim-dropdown-item ${currentStation.id === station.id ? 'active' : ''}`}
                                        onClick={() => handleStationSelect(station)}
                                        style={{
                                            textAlign: 'left',
                                            borderLeft: currentStation.id === station.id ? `2px solid ${chatTeal}` : '2px solid transparent',
                                        }}
                                    >
                                        <span style={{ fontSize: 12, width: 16, textAlign: 'center', flexShrink: 0 }}>{station.icon}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                color: currentStation.id === station.id ? '#1e293b' : '#475569',
                                            }}>{station.name}</div>
                                            <div style={{ fontSize: 8, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {station.genre}
                                            </div>
                                        </div>
                                        {currentStation.id === station.id && isPlaying && (
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 10, flexShrink: 0 }}>
                                                {[4, 8, 6].map((h, i) => (
                                                    <span key={i} style={{
                                                        width: 2, height: h, borderRadius: 1,
                                                        background: chatTeal,
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
            </div>

            {/* Keyframe animations */}
            <style>{`
                @keyframes musicBar {
                    0% { height: 3px; }
                    100% { height: 12px; }
                }
                @keyframes contentFadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

