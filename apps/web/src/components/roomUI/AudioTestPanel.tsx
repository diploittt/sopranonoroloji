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
    const [bars, setBars] = useState<number[]>(new Array(24).fill(0));
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

            // Loopback gain node — routes mic audio to speakers (default off)
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = 0;
            source.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            monitorGainRef.current = gainNode;

            setIsTesting(true);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateBars = () => {
                analyser.getByteFrequencyData(dataArray);
                const barCount = 24;
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
        setBars(new Array(24).fill(0));
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

    return (
        <div className="flex-1 flex flex-col animate-in fade-in duration-300 overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center gap-3 px-5 py-4 border-b border-white/5"
                style={{ background: 'rgba(10,12,20,0.6)' }}
            >
                <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all hover:scale-105"
                >
                    <ArrowLeft className="w-4 h-4 text-gray-400" />
                </button>
                <div>
                    <h2 className="text-sm font-bold text-white tracking-wide">Ses Testi</h2>
                    <p className="text-[10px] text-gray-500">Mikrofon & hoparlör kontrolü</p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 overflow-y-auto py-6">

                {/* Circular VU Meter */}
                <div className="relative">
                    <div
                        className="w-36 h-36 rounded-full flex items-center justify-center relative"
                        style={{
                            background: `conic-gradient(
                                ${isTesting && peak > 0
                                    ? `hsl(${140 - peak * 1.4}, 80%, 50%) 0deg, hsl(${140 - peak * 1.4}, 80%, 50%) ${peak * 3.6}deg, rgba(255,255,255,0.03) ${peak * 3.6}deg`
                                    : 'rgba(255,255,255,0.03) 0deg'
                                }, rgba(255,255,255,0.03) 360deg)`,
                            boxShadow: isTesting && peak > 20
                                ? `0 0 ${peak / 2}px hsla(${140 - peak * 1.4}, 80%, 50%, 0.3), inset 0 0 20px rgba(0,0,0,0.4)`
                                : 'inset 0 0 20px rgba(0,0,0,0.4)',
                            border: '2px solid rgba(255,255,255,0.06)',
                            transition: 'box-shadow 0.15s ease',
                        }}
                    >
                        <div
                            className="w-28 h-28 rounded-full flex flex-col items-center justify-center"
                            style={{ background: 'rgba(10,12,20,0.9)', border: '1px solid rgba(255,255,255,0.04)' }}
                        >
                            {isTesting ? (
                                <>
                                    <span className="text-3xl font-black text-white tabular-nums">{peak}</span>
                                    <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Seviye</span>
                                </>
                            ) : (
                                <>
                                    <Mic className="w-8 h-8 text-gray-600 mb-1" />
                                    <span className="text-[9px] text-gray-600 font-bold">HAZIR</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Frequency Bars */}
                <div
                    className="w-full flex items-end gap-[2px] justify-center"
                    style={{
                        height: '56px',
                        padding: '6px 8px',
                        borderRadius: '12px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.04)',
                    }}
                >
                    {bars.map((val, i) => {
                        const hue = val > 70 ? 0 : val > 40 ? 45 : 140;
                        return (
                            <div
                                key={i}
                                className="flex-1 rounded-sm transition-all duration-75"
                                style={{
                                    height: `${Math.max(4, val)}%`,
                                    background: isTesting
                                        ? `linear-gradient(to top, hsl(${hue}, 80%, 45%), hsl(${hue}, 90%, 65%))`
                                        : 'rgba(255,255,255,0.05)',
                                    boxShadow: isTesting && val > 15
                                        ? `0 0 4px hsla(${hue}, 80%, 50%, 0.35)`
                                        : 'none',
                                    minWidth: '3px',
                                }}
                            />
                        );
                    })}
                </div>

                {/* Mic Selector */}
                <div className="w-full">
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1.5 block">
                        Mikrofon Seçimi
                    </label>
                    <select
                        value={selectedMic}
                        onChange={(e) => { setSelectedMic(e.target.value); if (isTesting) stopAll(); }}
                        className="w-full text-[12px] text-white font-medium rounded-xl px-3 py-2.5 border border-white/10 focus:border-amber-600/40 focus:outline-none appearance-none cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                        <option value="" style={{ background: '#1a1d2e', color: '#fff' }}>Varsayılan Mikrofon</option>
                        {audioDevices.map(d => (
                            <option key={d.deviceId} value={d.deviceId} style={{ background: '#1a1d2e', color: '#fff' }}>
                                {d.label || `Mikrofon ${d.deviceId.slice(0, 8)}`}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Mic Start/Stop */}
                <button
                    onClick={isTesting ? stopAll : startMicTest}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition-all"
                    style={{
                        background: isTesting
                            ? 'linear-gradient(135deg, rgba(239,68,68,0.85), rgba(220,38,38,0.85))'
                            : 'linear-gradient(135deg, rgba(34,197,94,0.85), rgba(22,163,74,0.85))',
                        color: 'white',
                        boxShadow: isTesting
                            ? '0 4px 20px rgba(239,68,68,0.25)'
                            : '0 4px 20px rgba(34,197,94,0.25)',
                    }}
                >
                    {isTesting ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {isTesting ? 'Mikrofonu Durdur' : 'Mikrofon Testi Başlat'}
                </button>

                {/* Secondary controls row */}
                <div className="w-full flex gap-2">
                    {/* Loopback — hear yourself */}
                    <button
                        onClick={toggleMonitor}
                        disabled={!isTesting}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold rounded-xl transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                        style={{
                            background: isMonitoring
                                ? 'linear-gradient(135deg, rgba(168,85,247,0.85), rgba(139,92,246,0.85))'
                                : 'rgba(255,255,255,0.05)',
                            color: isMonitoring ? 'white' : '#9ca3af',
                            border: `1px solid ${isMonitoring ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.06)'}`,
                            boxShadow: isMonitoring ? '0 4px 16px rgba(168,85,247,0.25)' : 'none',
                        }}
                        title="Mikrofon sesini kulaklığından dinle"
                    >
                        <Headphones className="w-4 h-4" />
                        {isMonitoring ? 'Dinleniyor' : 'Sesini Duy'}
                    </button>

                    {/* Speaker Test */}
                    <button
                        onClick={playTestSound}
                        disabled={isPlayingTest}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[11px] font-bold rounded-xl transition-all disabled:opacity-40"
                        style={{
                            background: isPlayingTest
                                ? 'rgba(99,102,241,0.25)'
                                : 'rgba(255,255,255,0.05)',
                            color: isPlayingTest ? '#818cf8' : '#9ca3af',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}
                        title="Hoparlör Testi — 440Hz test tonu"
                    >
                        <Volume2 className="w-4 h-4" />
                        {isPlayingTest ? 'Çalıyor...' : 'Hoparlör Test'}
                    </button>
                </div>

                {/* Status hint */}
                <p className="text-[10px] text-gray-600 text-center leading-relaxed">
                    {isTesting
                        ? (isMonitoring
                            ? '🎧 Mikrofon sesiniz kulaklığınızdan geri dönüyor'
                            : '💡 "Sesini Duy" butonuyla kendinizi dinleyebilirsiniz')
                        : '🎤 Mikrofon testini başlatarak ses seviyenizi kontrol edin'}
                </p>
            </div>
        </div>
    );
}
