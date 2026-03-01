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
        <div className="relative group overflow-visible rounded-2xl border border-white/10 bg-[#0f1016]">
            {/* Gradient arka plan */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>

            {/* Üst kısım — İstasyon bilgisi */}
            <div className="relative p-3 pb-2 flex items-center gap-3">
                {/* Müzik animasyonu / Play butonu */}
                <button
                    onClick={togglePlay}
                    className="relative w-12 h-12 rounded-xl bg-black/60 flex items-center justify-center border border-white/10 shadow-lg overflow-hidden shrink-0 hover:bg-black/40 transition-colors cursor-pointer group/play"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                    ) : isPlaying ? (
                        <>
                            {/* Müzik çubukları */}
                            <div className="flex items-end gap-0.5 h-6 group-hover/play:opacity-0 transition-opacity">
                                <span className="w-1 bg-gradient-to-t from-violet-500 to-fuchsia-500 rounded-t-sm animate-music-bar" style={{ height: '12px' }}></span>
                                <span className="w-1 bg-gradient-to-t from-violet-500 to-fuchsia-500 rounded-t-sm animate-music-bar" style={{ height: '20px', animationDelay: '0.1s' }}></span>
                                <span className="w-1 bg-gradient-to-t from-violet-500 to-fuchsia-500 rounded-t-sm animate-music-bar" style={{ height: '16px', animationDelay: '0.2s' }}></span>
                                <span className="w-1 bg-gradient-to-t from-violet-500 to-fuchsia-500 rounded-t-sm animate-music-bar" style={{ height: '8px', animationDelay: '0.3s' }}></span>
                            </div>
                            {/* Hover'da pause ikonu */}
                            <Pause className="w-5 h-5 text-white fill-white absolute opacity-0 group-hover/play:opacity-100 transition-opacity" />
                        </>
                    ) : (
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    )}
                </button>

                {/* İstasyon bilgisi */}
                <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold tracking-wide text-white truncate">
                            {currentStation.icon} {currentStation.name}
                        </span>
                        {isPlaying && (
                            <span className="text-[8px] font-bold text-white px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse bg-red-600 shadow-[0_0_8px_#dc2626] shrink-0 ml-2">
                                LIVE
                            </span>
                        )}
                    </div>
                    <div className="w-full overflow-hidden relative h-4">
                        <div className="absolute whitespace-nowrap text-[10px] text-gray-400 font-medium animate-marquee">
                            {currentStation.genre} • {currentStation.name} Canlı Yayın • SopranoChat Radio
                        </div>
                    </div>
                </div>
            </div>

            {/* Alt kontroller */}
            <div className="relative px-3 pb-3 pt-1 flex items-center gap-2 border-t border-white/5 mt-1">
                {/* İstasyon Listesi toggle */}
                <div className="relative flex-1" ref={stationListRef}>
                    <button
                        onClick={() => { setShowStationList(!showStationList); setShowVolumeSlider(false); }}
                        className="w-full h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center gap-1.5 text-gray-300 hover:text-white transition-colors border border-white/5 text-[11px] font-medium cursor-pointer"
                    >
                        <Radio className="w-3 h-3" />
                        Kanallar
                        {showStationList ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                    </button>

                    {/* İstasyon Listesi Dropdown */}
                    {showStationList && (
                        <div className="absolute bottom-full left-0 w-72 mb-2 bg-[#12131a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-bottom-2"
                            style={{ maxHeight: '320px' }}
                        >
                            <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
                                <Radio className="w-3.5 h-3.5 text-violet-400" />
                                <span className="text-[11px] font-bold text-violet-300 uppercase tracking-wider">Radyo Kanalları</span>
                                <span className="ml-auto text-[9px] text-gray-500">{RADIO_STATIONS.length} kanal</span>
                            </div>
                            <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: '270px' }}>
                                {RADIO_STATIONS.map((station) => (
                                    <button
                                        key={station.id}
                                        onClick={() => handleStationSelect(station)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/10 transition-colors text-left cursor-pointer border-b border-white/[0.03] last:border-b-0
                                            ${currentStation.id === station.id ? 'bg-violet-500/15 border-l-2 border-l-violet-500' : ''}
                                        `}
                                    >
                                        <span className="text-base w-6 text-center shrink-0">{station.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-xs font-semibold truncate ${currentStation.id === station.id ? 'text-violet-300' : 'text-white'}`}>
                                                {station.name}
                                            </div>
                                            <div className="text-[9px] text-gray-500 truncate">{station.genre}</div>
                                        </div>
                                        {currentStation.id === station.id && isPlaying && (
                                            <div className="flex items-end gap-0.5 h-3 shrink-0">
                                                <span className="w-0.5 bg-violet-400 rounded-t-sm animate-music-bar" style={{ height: '6px' }}></span>
                                                <span className="w-0.5 bg-violet-400 rounded-t-sm animate-music-bar" style={{ height: '10px', animationDelay: '0.15s' }}></span>
                                                <span className="w-0.5 bg-violet-400 rounded-t-sm animate-music-bar" style={{ height: '8px', animationDelay: '0.3s' }}></span>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Ses Kontrolü */}
                <div className="relative" ref={volumeRef}>
                    <button
                        onClick={() => { setShowVolumeSlider(!showVolumeSlider); setShowStationList(false); }}
                        onDoubleClick={toggleMute}
                        className="h-8 w-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-colors border border-white/5 cursor-pointer"
                        title="Ses (çift tıklayarak sessize al)"
                    >
                        {isMuted || volume === 0 ? (
                            <VolumeX className="w-3.5 h-3.5 text-red-400" />
                        ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                        )}
                    </button>

                    {/* Volume Slider */}
                    {showVolumeSlider && (
                        <div className="absolute bottom-full right-0 mb-2 bg-[#12131a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] px-3 py-3 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-3">
                                <VolumeX className="w-3 h-3 text-gray-500 shrink-0 cursor-pointer" onClick={toggleMute} />
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={isMuted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    className="w-24 h-1.5 appearance-none bg-white/10 rounded-full outline-none cursor-pointer
                                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(139,92,246,0.5)]
                                        [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:bg-violet-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none"
                                />
                                <Volume2 className="w-3 h-3 text-gray-500 shrink-0" />
                            </div>
                            <div className="text-center mt-1.5">
                                <span className="text-[9px] text-gray-500 font-mono">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
