'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, Headphones, ArrowLeft } from 'lucide-react';

interface AudioTestPanelProps {
    onClose: () => void;
}

export function AudioTestPanel({ onClose }: AudioTestPanelProps) {
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedMic, setSelectedMic] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [isPlayingTest, setIsPlayingTest] = useState(false);
    const [bars, setBars] = useState<number[]>(new Array(20).fill(0));
    const [peak, setPeak] = useState(0);

    const streamRef = useRef<MediaStream | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const monitorGainRef = useRef<GainNode | null>(null);
    const animFrameRef = useRef<number>(0);

    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(devices => {
            setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
        }).catch(() => { });
        return () => stopAll();
    }, []);

    const startMicTest = useCallback(async () => {
        try {
            const constraints: MediaStreamConstraints = {
                audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            const audioCtx = new AudioContext();
            audioCtxRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            analyser.smoothingTimeConstant = 0.6;
            source.connect(analyser);
            analyserRef.current = analyser;

            const gainNode = audioCtx.createGain();
            gainNode.gain.value = 0;
            source.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            monitorGainRef.current = gainNode;

            setIsTesting(true);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateBars = () => {
                analyser.getByteFrequencyData(dataArray);
                const barCount = 20;
                const step = Math.floor(dataArray.length / barCount);
                const newBars: number[] = [];
                let maxVal = 0;
                for (let i = 0; i < barCount; i++) {
                    const val = dataArray[i * step] || 0;
                    const pct = Math.min(100, (val / 255) * 100);
                    newBars.push(pct);
                    if (pct > maxVal) maxVal = pct;
                }
                setBars(newBars);
                setPeak(Math.round(maxVal));
                animFrameRef.current = requestAnimationFrame(updateBars);
            };
            updateBars();
        } catch (err) {
            console.error('Mikrofon erişimi başarısız:', err);
        }
    }, [selectedMic]);

    const stopAll = useCallback(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close().catch(() => { });
            audioCtxRef.current = null;
        }
        analyserRef.current = null;
        monitorGainRef.current = null;
        setIsTesting(false);
        setIsMonitoring(false);
        setBars(new Array(20).fill(0));
        setPeak(0);
    }, []);

    const toggleMonitor = useCallback(() => {
        if (!monitorGainRef.current) return;
        const next = !isMonitoring;
        monitorGainRef.current.gain.value = next ? 1 : 0;
        setIsMonitoring(next);
    }, [isMonitoring]);

    const playTestSound = useCallback(() => {
        setIsPlayingTest(true);
        const audioCtx = new AudioContext();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 440;
        gain.gain.value = 0.25;
        osc.start();
        setTimeout(() => {
            osc.stop();
            audioCtx.close();
            setIsPlayingTest(false);
        }, 1000);
    }, []);

    const handleClose = useCallback(() => {
        stopAll();
        onClose();
    }, [stopAll, onClose]);

    // Dynamic glow color based on peak
    const glowHue = peak > 70 ? 0 : peak > 40 ? 30 : 150;
    const glowColor = `hsl(${glowHue}, 80%, 55%)`;
    const glowAlpha = Math.min(0.6, peak / 100);

    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            animation: 'fadeIn 0.3s ease',
        }}>
            {/* Premium Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(59,130,246,0.08))',
                borderBottom: '1px solid rgba(139,92,246,0.15)',
            }}>
                <button
                    onClick={handleClose}
                    style={{
                        width: 24, height: 24, borderRadius: 8,
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.2s',
                        color: '#94a3b8',
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.2)'; e.currentTarget.style.color = '#c4b5fd'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
                >
                    <ArrowLeft style={{ width: 12, height: 12 }} />
                </button>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.03em' }}>🎙️ Ses Testi</div>
                </div>
                {/* Live indicator when testing */}
                {isTesting && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 10,
                        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)',
                    }}>
                        <div style={{
                            width: 5, height: 5, borderRadius: '50%', background: '#ef4444',
                            boxShadow: '0 0 6px rgba(239,68,68,0.6)',
                            animation: 'pulse 1.5s ease-in-out infinite',
                        }} />
                        <span style={{ fontSize: 8, fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: 1 }}>Canlı</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '10px 10px 8px', gap: 8,
            }}>

                {/* Premium VU Ring */}
                <div style={{ position: 'relative' }}>
                    {/* Outer glow ring */}
                    <div style={{
                        width: 76, height: 76, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `conic-gradient(
                            ${isTesting && peak > 0
                                ? `${glowColor} 0deg, ${glowColor} ${peak * 3.6}deg, rgba(255,255,255,0.03) ${peak * 3.6}deg`
                                : 'rgba(139,92,246,0.08) 0deg, rgba(59,130,246,0.08) 180deg, rgba(139,92,246,0.08) 360deg'
                            })`,
                        boxShadow: isTesting && peak > 15
                            ? `0 0 ${peak / 3}px rgba(${peak > 70 ? '239,68,68' : peak > 40 ? '251,191,36' : '52,211,153'}, ${glowAlpha}), inset 0 0 8px rgba(0,0,0,0.3)`
                            : '0 0 12px rgba(139,92,246,0.1), inset 0 0 8px rgba(0,0,0,0.3)',
                        border: `1.5px solid ${isTesting ? `rgba(${peak > 70 ? '239,68,68' : peak > 40 ? '251,191,36' : '52,211,153'}, 0.3)` : 'rgba(139,92,246,0.15)'}`,
                        transition: 'box-shadow 0.15s ease, border-color 0.2s ease',
                    }}>
                        {/* Inner circle */}
                        <div style={{
                            width: 58, height: 58, borderRadius: '50%',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            background: 'radial-gradient(circle at 40% 35%, rgba(30,32,48,0.95), rgba(15,17,28,0.98))',
                            border: '1px solid rgba(255,255,255,0.04)',
                        }}>
                            {isTesting ? (
                                <>
                                    <span style={{
                                        fontSize: 20, fontWeight: 900, color: '#fff',
                                        fontVariantNumeric: 'tabular-nums',
                                        textShadow: `0 0 8px rgba(${peak > 70 ? '239,68,68' : peak > 40 ? '251,191,36' : '52,211,153'}, 0.4)`,
                                    }}>{peak}</span>
                                    <span style={{ fontSize: 6, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>dB</span>
                                </>
                            ) : (
                                <>
                                    <Mic style={{ width: 18, height: 18, color: 'rgba(139,92,246,0.5)' }} />
                                    <span style={{ fontSize: 6, color: '#64748b', fontWeight: 700, marginTop: 2, letterSpacing: 1 }}>HAZIR</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Premium Frequency Bars */}
                <div style={{
                    width: '100%', display: 'flex', alignItems: 'flex-end', gap: 1.5, justifyContent: 'center',
                    height: 32, padding: '4px 6px', borderRadius: 8,
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.4))',
                    border: '1px solid rgba(255,255,255,0.04)',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
                }}>
                    {bars.map((val, i) => {
                        const hue = val > 70 ? 0 : val > 40 ? 45 : 150;
                        return (
                            <div
                                key={i}
                                style={{
                                    flex: 1, borderRadius: 2,
                                    height: `${Math.max(8, val)}%`,
                                    background: isTesting
                                        ? `linear-gradient(to top, hsl(${hue}, 75%, 40%), hsl(${hue}, 85%, 60%))`
                                        : 'linear-gradient(to top, rgba(139,92,246,0.08), rgba(139,92,246,0.15))',
                                    boxShadow: isTesting && val > 15
                                        ? `0 0 3px hsla(${hue}, 80%, 50%, 0.3)`
                                        : 'none',
                                    transition: 'height 0.06s ease-out',
                                    minWidth: 2,
                                }}
                            />
                        );
                    })}
                </div>

                {/* Mic Selector — styled */}
                <div style={{ width: '100%' }}>
                    <div style={{ fontSize: 7, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 3 }}>
                        Mikrofon
                    </div>
                    <select
                        value={selectedMic}
                        onChange={(e) => { setSelectedMic(e.target.value); if (isTesting) stopAll(); }}
                        style={{
                            width: '100%', fontSize: 9, color: '#e2e8f0', fontWeight: 600,
                            borderRadius: 6, padding: '5px 8px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(139,92,246,0.12)',
                            outline: 'none', cursor: 'pointer',
                            appearance: 'none' as const,
                        }}
                    >
                        <option value="" style={{ background: '#1a1d2e', color: '#fff' }}>Varsayılan Mikrofon</option>
                        {audioDevices.map(d => (
                            <option key={d.deviceId} value={d.deviceId} style={{ background: '#1a1d2e', color: '#fff' }}>
                                {d.label || `Mikrofon ${d.deviceId.slice(0, 8)}`}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Primary Action Button */}
                <button
                    onClick={isTesting ? stopAll : startMicTest}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        padding: '7px 0', fontSize: 10, fontWeight: 800, borderRadius: 8,
                        background: isTesting
                            ? 'linear-gradient(135deg, rgba(239,68,68,0.8), rgba(220,38,38,0.9))'
                            : 'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(99,102,241,0.9))',
                        color: '#fff', border: 'none', cursor: 'pointer',
                        boxShadow: isTesting
                            ? '0 2px 12px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                            : '0 2px 12px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                        letterSpacing: '0.05em', textTransform: 'uppercase',
                        transition: 'all 0.2s ease',
                    }}
                >
                    {isTesting ? <MicOff style={{ width: 12, height: 12 }} /> : <Mic style={{ width: 12, height: 12 }} />}
                    {isTesting ? 'Testi Durdur' : 'Testi Başlat'}
                </button>

                {/* Secondary Controls — pill style */}
                <div style={{ width: '100%', display: 'flex', gap: 4 }}>
                    <button
                        onClick={toggleMonitor}
                        disabled={!isTesting}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                            padding: '5px 0', fontSize: 8, fontWeight: 700, borderRadius: 6,
                            background: isMonitoring
                                ? 'linear-gradient(135deg, rgba(168,85,247,0.7), rgba(139,92,246,0.8))'
                                : 'rgba(255,255,255,0.03)',
                            color: isMonitoring ? '#fff' : '#64748b',
                            border: `1px solid ${isMonitoring ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.06)'}`,
                            cursor: isTesting ? 'pointer' : 'not-allowed',
                            opacity: isTesting ? 1 : 0.3,
                            transition: 'all 0.2s ease',
                            letterSpacing: '0.03em',
                        }}
                    >
                        <Headphones style={{ width: 10, height: 10 }} />
                        {isMonitoring ? 'Dinleniyor' : 'Sesini Duy'}
                    </button>

                    <button
                        onClick={playTestSound}
                        disabled={isPlayingTest}
                        style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                            padding: '5px 0', fontSize: 8, fontWeight: 700, borderRadius: 6,
                            background: isPlayingTest
                                ? 'rgba(99,102,241,0.2)'
                                : 'rgba(255,255,255,0.03)',
                            color: isPlayingTest ? '#818cf8' : '#64748b',
                            border: '1px solid rgba(255,255,255,0.06)',
                            cursor: isPlayingTest ? 'not-allowed' : 'pointer',
                            opacity: isPlayingTest ? 0.7 : 1,
                            transition: 'all 0.2s ease',
                            letterSpacing: '0.03em',
                        }}
                    >
                        <Volume2 style={{ width: 10, height: 10 }} />
                        {isPlayingTest ? 'Çalıyor...' : 'Hoparlör'}
                    </button>
                </div>

                {/* Premium hint */}
                <p style={{
                    fontSize: 7, color: '#475569', textAlign: 'center', lineHeight: 1.4,
                    fontStyle: 'italic', margin: 0,
                }}>
                    {isTesting
                        ? (isMonitoring ? '🎧 Ses geri dönüyor' : '💡 "Sesini Duy" ile kendinizi dinleyin')
                        : '🎤 Test başlatarak ses seviyenizi kontrol edin'}
                </p>
            </div>
        </div>
    );
}
