'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface AudioTestModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AudioTestModal({ isOpen, onClose }: AudioTestModalProps) {
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedMic, setSelectedMic] = useState('');
    const [micLevel, setMicLevel] = useState(0);
    const [isTesting, setIsTesting] = useState(false);
    const [isPlayingTest, setIsPlayingTest] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number>(0);

    // Draggable
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [centered, setCentered] = useState(true);
    const dragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setCentered(true);
            navigator.mediaDevices.enumerateDevices().then(devices => {
                setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
            }).catch(() => { });
        }
        return () => stopMicTest();
    }, [isOpen]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!modalRef.current) return;
        if (centered) {
            const rect = modalRef.current.getBoundingClientRect();
            setPosition({ x: rect.left, y: rect.top });
            dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            setCentered(false);
        } else {
            dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        }
        dragging.current = true;
        e.preventDefault();
    }, [centered, position]);

    useEffect(() => {
        const move = (e: MouseEvent) => {
            if (!dragging.current) return;
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x)),
                y: Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.current.y)),
            });
        };
        const up = () => { dragging.current = false; };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { stopMicTest(); onClose(); } };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    const startMicTest = async () => {
        try {
            const constraints: MediaStreamConstraints = {
                audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;

            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            setIsTesting(true);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateLevel = () => {
                analyser.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                setMicLevel(Math.min(100, (avg / 128) * 100));
                animFrameRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();
        } catch (err) {
            console.error('Mikrofon erişimi başarısız:', err);
        }
    };

    const stopMicTest = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        analyserRef.current = null;
        setIsTesting(false);
        setMicLevel(0);
    };

    const playTestSound = () => {
        setIsPlayingTest(true);
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 440;
        gainNode.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
            audioCtx.close();
            setIsPlayingTest(false);
        }, 1000);
    };

    if (!isOpen) return null;

    const modalStyle: React.CSSProperties = centered
        ? {}
        : { position: 'fixed', left: position.x, top: position.y, margin: 0, transform: 'none' };

    const content = (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={() => { stopMicTest(); onClose(); }} style={centered ? {} : { display: 'block' }}>
            <div className="absolute inset-0 bg-black/40" />

            <div
                ref={modalRef}
                className="relative w-full max-w-md animate-pure-fade"
                onClick={(e) => e.stopPropagation()}
                style={{
                    ...modalStyle,
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%), linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.92) 100%)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderTop: '1px solid rgba(255,255,255,0.30)',
                    borderRadius: '18px',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
            >
                <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #6366f1, #a855f7, transparent)', opacity: 0.7 }} />

                <div
                    className="flex items-center justify-between p-5 pb-3"
                    onMouseDown={handleMouseDown}
                    style={{ cursor: 'move', userSelect: 'none' }}
                >
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>🎤</span> Ses Testi
                    </h2>
                    <button onClick={() => { stopMicTest(); onClose(); }} className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">✕</button>
                </div>

                <div className="px-5 pb-5 space-y-4">
                    {/* Mic select */}
                    <div>
                        <label className="text-xs text-gray-400 mb-2 block">Mikrofon</label>
                        <select
                            value={selectedMic}
                            onChange={(e) => { setSelectedMic(e.target.value); if (isTesting) { stopMicTest(); } }}
                            className="w-full text-sm text-white rounded-xl px-4 py-3 border border-white/10 focus:border-amber-600/40 focus:outline-none appearance-none"
                            style={{ background: 'rgba(15,23,42,0.6)' }}
                        >
                            <option value="">Varsayılan Mikrofon</option>
                            {audioDevices.map(d => (
                                <option key={d.deviceId} value={d.deviceId}>{d.label || `Mikrofon ${d.deviceId.slice(0, 8)}`}</option>
                            ))}
                        </select>
                    </div>

                    {/* VU Meter */}
                    <div>
                        <label className="text-xs text-gray-400 mb-2 block">Mikrofon Seviyesi</label>
                        <div className="h-6 rounded-lg overflow-hidden" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div
                                className="h-full transition-all duration-75 rounded-lg"
                                style={{
                                    width: `${micLevel}%`,
                                    background: micLevel > 80 ? 'linear-gradient(90deg, #22c55e, #ef4444)' :
                                        micLevel > 40 ? 'linear-gradient(90deg, #22c55e, #eab308)' :
                                            'linear-gradient(90deg, #22c55e, #4ade80)',
                                    boxShadow: micLevel > 10 ? `0 0 8px rgba(34, 197, 94, 0.3)` : 'none',
                                }}
                            />
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={isTesting ? stopMicTest : startMicTest}
                            className="flex-1 py-3 text-sm font-bold rounded-xl transition-all"
                            style={{
                                background: isTesting
                                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                    : 'linear-gradient(135deg, #22c55e, #16a34a)',
                                color: 'white',
                            }}
                        >
                            {isTesting ? 'â Durdur' : '🎤 Mikrofon Test'}
                        </button>
                        <button
                            onClick={playTestSound}
                            disabled={isPlayingTest}
                            className="flex-1 py-3 text-sm font-bold rounded-xl transition-all disabled:opacity-50"
                            style={{
                                background: isPlayingTest
                                    ? 'rgba(99,102,241,0.3)'
                                    : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                color: 'white',
                            }}
                        >
                            {isPlayingTest ? '🔊 Çalıyor...' : '🔊 Hoparlör Test'}
                        </button>
                    </div>

                    <p className="text-[11px] text-gray-500 text-center">Mikrofon testinde sesinizi duyamazsanız, tarayıcı izinlerini kontrol edin.</p>
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
