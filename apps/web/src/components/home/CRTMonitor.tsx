'use client';
import React, { useEffect, useRef, useCallback } from 'react';

interface CRTMonitorProps {
    children?: React.ReactNode;
    isPowerOn?: boolean;
    onPowerToggle?: () => void;
}

export default function CRTMonitor({ children, isPowerOn = true, onPowerToggle }: CRTMonitorProps) {
    const monitorRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number>(0);
    const rotRef = useRef({ cx: 5, cy: -15, tx: 5, ty: -15 });

    // ─── Fare takibi: pasif rotasyon ────────────────────────────
    const handleMouseMove = useCallback((e: MouseEvent) => {
        const x = (e.clientX / window.innerWidth) - 0.5;
        const y = (e.clientY / window.innerHeight) - 0.5;
        rotRef.current.tx = -(y * 20);
        rotRef.current.ty = x * 70;
    }, []);

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        return () => document.removeEventListener('mousemove', handleMouseMove);
    }, [handleMouseMove]);

    // ─── Lerp animasyon döngüsü (20kg monitör hissi) ───────────
    useEffect(() => {
        function animate() {
            const r = rotRef.current;
            r.cx += (r.tx - r.cx) * 0.03;
            r.cy += (r.ty - r.cy) * 0.03;
            if (monitorRef.current) {
                monitorRef.current.style.transform = `rotateX(${r.cx}deg) rotateY(${r.cy}deg)`;
            }
            rafRef.current = requestAnimationFrame(animate);
        }
        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    return (
        <div className="crt-scene-container" style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            perspective: 1500,
            minHeight: 500,
        }}>
            <div
                ref={monitorRef}
                className="crt-monitor-core"
                style={{
                    position: 'relative',
                    width: 0,
                    height: 0,
                    transformStyle: 'preserve-3d',
                    transformOrigin: 'center center -150px',
                }}
            >
                {/* ========================================== */}
                {/* 3. KUTU: TÜP — En Arka Bombe              */}
                {/* ========================================== */}
                <div className="crt-face crt-t-back" />
                <div className="crt-face crt-t-left" />
                <div className="crt-face crt-t-right" />
                <div className="crt-face crt-t-top" />
                <div className="crt-face crt-t-bottom" />

                {/* ========================================== */}
                {/* 2. KUTU: ORTA GEÇİŞ — Ana Gövde           */}
                {/* ========================================== */}
                <div className="crt-face crt-m-back" />
                <div className="crt-face crt-m-left" />
                <div className="crt-face crt-m-right" />
                <div className="crt-face crt-m-top" />
                <div className="crt-face crt-m-bottom" />

                {/* ========================================== */}
                {/* 1. KUTU: ANA KASA — Ön Çerçeve             */}
                {/* ========================================== */}
                <div className="crt-face crt-b-back" />
                <div className="crt-face crt-b-left" />
                <div className="crt-face crt-b-right" />
                <div className="crt-face crt-b-top" />
                <div className="crt-face crt-b-bottom" />

                {/* Ön Yüz — Ekran + Butonlar */}
                <div className="crt-face crt-b-front">
                    <div className="crt-bezel">
                        {/* Ekran Camı */}
                        <div
                            className={`crt-glass ${isPowerOn ? 'crt-on' : 'crt-off'}`}
                        >
                            {/* CRT Efektleri — scanlines + RGB */}
                            {isPowerOn && <div className="crt-effects" />}
                            {isPowerOn && <div className="crt-glare" />}

                            {/* İçerik — DemoChatRoom buraya gelecek */}
                            {isPowerOn && (
                                <div
                                    className="crt-screen-content"
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: 1600,
                                        height: 1150,
                                        transformOrigin: 'top left',
                                        transform: 'scale(0.375)',
                                    }}
                                >
                                    {children}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Kasa Alt: IBM Logo + Power */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 6,
                        padding: '0 20px',
                        position: 'relative',
                        zIndex: 50,
                    }}>
                        <div style={{
                            color: '#8c8a7b',
                            fontSize: 12,
                            fontWeight: 900,
                            letterSpacing: '0.3em',
                            textTransform: 'uppercase' as const,
                            fontFamily: 'sans-serif',
                        }}>
                            SopranoChat
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {/* Ayar düğmeleri */}
                            <div className="crt-btn-physical" style={{ width: 18, height: 6, background: '#b8b4ab', borderRadius: 2 }} />
                            <div className="crt-btn-physical" style={{ width: 18, height: 6, background: '#b8b4ab', borderRadius: 2 }} />

                            {/* Power */}
                            <div
                                onClick={onPowerToggle}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    marginLeft: 8,
                                    cursor: 'pointer',
                                }}
                            >
                                <span style={{
                                    color: '#8c8a7b',
                                    fontSize: 9,
                                    fontWeight: 700,
                                    letterSpacing: '0.2em',
                                    textTransform: 'uppercase' as const,
                                    fontFamily: 'sans-serif',
                                }}>
                                    POWER
                                </span>
                                <div style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    background: isPowerOn ? '#22c55e' : '#ef4444',
                                    boxShadow: isPowerOn
                                        ? '0 0 12px #22c55e, inset 1px 1px 2px rgba(255,255,255,0.7)'
                                        : '0 0 8px #ef4444, inset 1px 1px 2px rgba(255,255,255,0.7)',
                                    border: isPowerOn ? '1px solid #166534' : '1px solid #991b1b',
                                    transition: 'all 0.3s ease',
                                }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
