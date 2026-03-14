'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Play, Square, ArrowLeft, RotateCcw, Pause } from 'lucide-react';

interface AudioTestPanelProps {
    onClose: () => void;
}

type Phase = 'idle' | 'recording' | 'recorded' | 'playing';

export function AudioTestPanel({ onClose }: AudioTestPanelProps) {
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedMic, setSelectedMic] = useState('');
    const [phase, setPhase] = useState<Phase>('idle');
    const [bars, setBars] = useState<number[]>(new Array(28).fill(0));
    const [recordingTime, setRecordingTime] = useState(0);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(0);

    const streamRef = useRef<MediaStream | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number>(0);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const audioUrlRef = useRef<string | null>(null);
    const audioElRef = useRef<HTMLAudioElement | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const playTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(devices => {
            setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
        }).catch(() => { });
        return () => cleanup();
    }, []);

    const cleanup = useCallback(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        if (playTimerRef.current) clearInterval(playTimerRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close().catch(() => { });
            audioCtxRef.current = null;
        }
        if (audioElRef.current) {
            audioElRef.current.pause();
            audioElRef.current = null;
        }
        if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
        }
        analyserRef.current = null;
        recorderRef.current = null;
        chunksRef.current = [];
    }, []);

    const startRecording = useCallback(async () => {
        try {
            cleanup();
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
            analyser.smoothingTimeConstant = 0.7;
            source.connect(analyser);
            analyserRef.current = analyser;

            // MediaRecorder for recording
            const recorder = new MediaRecorder(stream);
            recorderRef.current = recorder;
            chunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
                audioUrlRef.current = URL.createObjectURL(blob);
                setPhase('recorded');
            };
            recorder.start();

            setPhase('recording');
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 0.1);
            }, 100);

            // Visualizer
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateBars = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                const barCount = 28;
                const step = Math.max(1, Math.floor(dataArray.length / barCount));
                const newBars: number[] = [];
                for (let i = 0; i < barCount; i++) {
                    const val = dataArray[i * step] || 0;
                    newBars.push(Math.min(100, (val / 255) * 100));
                }
                setBars(newBars);
                animFrameRef.current = requestAnimationFrame(updateBars);
            };
            updateBars();
        } catch (err) {
            console.error('Mikrofon erişimi başarısız:', err);
        }
    }, [selectedMic, cleanup]);

    const stopRecording = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; }
        if (recorderRef.current && recorderRef.current.state === 'recording') {
            recorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close().catch(() => { });
            audioCtxRef.current = null;
        }
        setBars(new Array(28).fill(0));
    }, []);

    const playRecording = useCallback(() => {
        if (!audioUrlRef.current) return;
        const audio = new Audio(audioUrlRef.current);
        audioElRef.current = audio;
        setPlaybackTime(0);
        setPhase('playing');

        audio.onloadedmetadata = () => {
            setPlaybackDuration(audio.duration);
        };
        audio.onended = () => {
            setPhase('recorded');
            setPlaybackTime(0);
            if (playTimerRef.current) { clearInterval(playTimerRef.current); playTimerRef.current = null; }
        };

        playTimerRef.current = setInterval(() => {
            if (audioElRef.current) {
                setPlaybackTime(audioElRef.current.currentTime);
            }
        }, 50);

        audio.play().catch(() => { });
    }, []);

    const stopPlayback = useCallback(() => {
        if (audioElRef.current) {
            audioElRef.current.pause();
            audioElRef.current = null;
        }
        if (playTimerRef.current) { clearInterval(playTimerRef.current); playTimerRef.current = null; }
        setPhase('recorded');
        setPlaybackTime(0);
    }, []);

    const resetRecording = useCallback(() => {
        stopPlayback();
        if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
        }
        chunksRef.current = [];
        setRecordingTime(0);
        setPlaybackTime(0);
        setPhase('idle');
    }, [stopPlayback]);

    const handleClose = useCallback(() => {
        cleanup();
        onClose();
    }, [cleanup, onClose]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        const ms = Math.floor((s % 1) * 10);
        return `${m}:${sec.toString().padStart(2, '0')}.${ms}`;
    };

    const progress = playbackDuration > 0 ? (playbackTime / playbackDuration) * 100 : 0;

    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            animation: 'fadeIn 0.35s ease',
        }}>
            {/* ── Header ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(59,130,246,0.06))',
                borderBottom: '1px solid rgba(139,92,246,0.12)',
            }}>
                <button
                    onClick={handleClose}
                    style={{
                        width: 26, height: 26, borderRadius: 8,
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#94a3b8', transition: 'all 0.2s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.2)'; e.currentTarget.style.color = '#c4b5fd'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
                >
                    <ArrowLeft style={{ width: 13, height: 13 }} />
                </button>
                <div style={{ flex: 1, fontSize: 12, fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.02em' }}>
                    🎙️ Ses Kaydı Testi
                </div>
                {phase === 'recording' && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '3px 10px', borderRadius: 12,
                        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)',
                    }}>
                        <div style={{
                            width: 6, height: 6, borderRadius: '50%', background: '#ef4444',
                            boxShadow: '0 0 8px rgba(239,68,68,0.6)',
                            animation: 'pulse 1.2s ease-in-out infinite',
                        }} />
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#f87171', letterSpacing: 0.5 }}>
                            KAYIT
                        </span>
                    </div>
                )}
            </div>

            {/* ── Content ── */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '14px 14px 10px', gap: 10, justifyContent: 'center',
            }}>

                {/* ── Central Orb ── */}
                <div style={{ position: 'relative', marginBottom: 4 }}>
                    {/* Pulse rings during recording */}
                    {phase === 'recording' && [0, 1, 2].map(i => (
                        <div key={i} style={{
                            position: 'absolute', inset: -8 - i * 12,
                            borderRadius: '50%',
                            border: `1.5px solid rgba(139,92,246,${0.15 - i * 0.04})`,
                            animation: `pulseRing 2s ease-out infinite ${i * 0.5}s`,
                            pointerEvents: 'none',
                        }} />
                    ))}
                    <button
                        onClick={() => {
                            if (phase === 'idle') startRecording();
                            else if (phase === 'recording') stopRecording();
                            else if (phase === 'recorded') playRecording();
                            else if (phase === 'playing') stopPlayback();
                        }}
                        style={{
                            width: 80, height: 80, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', border: 'none', position: 'relative',
                            background: phase === 'recording'
                                ? 'linear-gradient(145deg, #ef4444, #dc2626)'
                                : phase === 'playing'
                                    ? 'linear-gradient(145deg, #22d3ee, #06b6d4)'
                                    : phase === 'recorded'
                                        ? 'linear-gradient(145deg, #34d399, #10b981)'
                                        : 'linear-gradient(145deg, #8b5cf6, #7c3aed)',
                            boxShadow: phase === 'recording'
                                ? '0 0 30px rgba(239,68,68,0.4), 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'
                                : phase === 'playing'
                                    ? '0 0 30px rgba(34,211,238,0.3), 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'
                                    : phase === 'recorded'
                                        ? '0 0 30px rgba(52,211,153,0.3), 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'
                                        : '0 0 30px rgba(139,92,246,0.3), 0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                            transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: phase === 'recording' ? 'scale(1.05)' : 'scale(1)',
                        }}
                        onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                        onMouseOut={e => { e.currentTarget.style.transform = phase === 'recording' ? 'scale(1.05)' : 'scale(1)'; }}
                    >
                        {phase === 'idle' && <Mic style={{ width: 28, height: 28, color: '#fff', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />}
                        {phase === 'recording' && <Square style={{ width: 22, height: 22, color: '#fff', fill: '#fff', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />}
                        {phase === 'recorded' && <Play style={{ width: 28, height: 28, color: '#fff', fill: '#fff', marginLeft: 3, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />}
                        {phase === 'playing' && <Pause style={{ width: 24, height: 24, color: '#fff', fill: '#fff', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />}
                    </button>
                </div>

                {/* ── Phase Label ── */}
                <div style={{ textAlign: 'center', minHeight: 32 }}>
                    {phase === 'idle' && (
                        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>
                            Kaydetmek için dokunun
                        </div>
                    )}
                    {phase === 'recording' && (
                        <div style={{ fontSize: 18, color: '#f87171', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                            {formatTime(recordingTime)}
                        </div>
                    )}
                    {phase === 'recorded' && (
                        <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>
                            Kayıt tamamlandı — dinlemek için ▶ basın
                        </div>
                    )}
                    {phase === 'playing' && (
                        <div style={{ fontSize: 14, color: '#22d3ee', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                            {formatTime(playbackTime)} / {formatTime(playbackDuration)}
                        </div>
                    )}
                </div>

                {/* ── Frequency Bars (recording) ── */}
                {phase === 'recording' && (
                    <div style={{
                        width: '100%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 2, height: 44,
                        padding: '6px 8px', borderRadius: 10,
                        background: 'linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.35))',
                        border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                        {bars.map((val, i) => (
                            <div key={i} style={{
                                width: 3, borderRadius: 2,
                                height: `${Math.max(12, val)}%`,
                                background: `linear-gradient(to top, rgba(239,68,68,0.6), rgba(251,146,60,0.8))`,
                                boxShadow: val > 20 ? `0 0 4px rgba(239,68,68,${val / 200})` : 'none',
                                transition: 'height 0.06s ease-out',
                            }} />
                        ))}
                    </div>
                )}

                {/* ── Playback Progress Bar ── */}
                {(phase === 'playing' || phase === 'recorded') && (
                    <div style={{
                        width: '100%', height: 6, borderRadius: 3,
                        background: 'rgba(255,255,255,0.06)',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${progress}%`,
                            background: phase === 'playing'
                                ? 'linear-gradient(90deg, #22d3ee, #06b6d4)'
                                : 'linear-gradient(90deg, #34d399, #10b981)',
                            boxShadow: phase === 'playing' ? '0 0 8px rgba(34,211,238,0.4)' : 'none',
                            transition: 'width 0.1s linear',
                        }} />
                    </div>
                )}

                {/* ── Action Buttons (recorded/playing) ── */}
                {(phase === 'recorded' || phase === 'playing') && (
                    <button
                        onClick={resetRecording}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                            padding: '7px 18px', fontSize: 10, fontWeight: 700, borderRadius: 8,
                            background: 'rgba(255,255,255,0.05)',
                            color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)',
                            cursor: 'pointer', transition: 'all 0.2s',
                            letterSpacing: '0.03em',
                        }}
                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.15)'; e.currentTarget.style.color = '#c4b5fd'; }}
                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
                    >
                        <RotateCcw style={{ width: 11, height: 11 }} />
                        Yeniden Kaydet
                    </button>
                )}

                {/* ── Mic Selector ── */}
                <div style={{ width: '100%', marginTop: phase === 'idle' ? 4 : 0 }}>
                    <div style={{
                        fontSize: 8, color: '#64748b', fontWeight: 700,
                        textTransform: 'uppercase' as const, letterSpacing: 1.5, marginBottom: 4,
                    }}>
                        Mikrofon
                    </div>
                    <select
                        value={selectedMic}
                        onChange={(e) => { setSelectedMic(e.target.value); if (phase !== 'idle') resetRecording(); }}
                        disabled={phase === 'recording'}
                        style={{
                            width: '100%', fontSize: 10, color: '#e2e8f0', fontWeight: 600,
                            borderRadius: 8, padding: '7px 10px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(139,92,246,0.12)',
                            outline: 'none', cursor: phase === 'recording' ? 'not-allowed' : 'pointer',
                            appearance: 'none' as const,
                            opacity: phase === 'recording' ? 0.4 : 1,
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

                {/* ── Hint ── */}
                <p style={{
                    fontSize: 8, color: '#475569', textAlign: 'center', lineHeight: 1.5,
                    fontStyle: 'italic', margin: 0, maxWidth: '90%',
                }}>
                    {phase === 'idle' && '🎤 Sesinizi kaydedin, sonra nasıl duyulduğunuzu dinleyin'}
                    {phase === 'recording' && '🔴 Konuşun... Durdurmak için kırmızı düğmeye basın'}
                    {phase === 'recorded' && '✅ Kaydınız hazır — yeşil düğmeyle dinleyin'}
                    {phase === 'playing' && '🎧 Kendinizi dinliyorsunuz...'}
                </p>
            </div>

            {/* ── Keyframe animations ── */}
            <style>{`
                @keyframes pulseRing {
                    0% { transform: scale(0.95); opacity: 1; }
                    100% { transform: scale(1.4); opacity: 0; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
