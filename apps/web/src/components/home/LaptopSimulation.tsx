'use client';
import React, { useEffect, useRef, useCallback, useState } from 'react';
import CRTDemoSimulation from './CRTDemoSimulation';

export default function LaptopSimulation() {
    // 'closed' -> 'opening' -> 'splash' -> 'ready'
    const [appState, setAppState] = useState<'closed' | 'opening' | 'splash' | 'ready'>('closed');
    const lidRef = useRef<HTMLDivElement>(null);

    // ─── Animasyon sekansı ─────────────────────────────
    useEffect(() => {
        const t1 = setTimeout(() => setAppState('opening'), 400);
        const t2 = setTimeout(() => setAppState('splash'), 2200);
        const t3 = setTimeout(() => setAppState('ready'), 4500);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, []);

    return (
        <div className="laptop-wrapper">
            {/* Zemin gölgeleri */}
            <div className="laptop-ground-shadow" />
            <div className="laptop-ground-shadow-inner" />

            {/* 3D Perspektif alanı */}
            <div className="laptop-perspective">

                {/* EKRAN KAPAĞ (LID) */}
                <div
                    ref={lidRef}
                    className="laptop-lid-shell"
                    style={{
                        transform: appState === 'closed'
                            ? 'rotateX(-85deg) scale(0.95) translateY(20px)'
                            : 'rotateX(0deg) scale(1) translateY(0px)',
                        opacity: appState === 'closed' ? 0.7 : 1,
                    }}
                >
                    {/* Kamera */}
                    <div className="laptop-camera">
                        <div className={`laptop-camera-dot ${appState === 'ready' ? 'active' : ''}`} />
                    </div>

                    {/* İç Ekran */}
                    <div className="laptop-inner-screen">
                        {/* Cam yansıması */}
                        <div className="laptop-glare" />

                        {/* 1. KAPALI EKRAN */}
                        <div className={`laptop-state-layer laptop-screen-black ${appState === 'closed' || appState === 'opening' ? 'visible' : ''
                            }`} />

                        {/* 2. SPLASH EKRANI */}
                        <div className={`laptop-state-layer laptop-splash ${appState === 'splash' ? 'visible' : ''
                            }`}>
                            <h1 className="laptop-splash-title">SopranoChat</h1>
                            <p className="laptop-splash-sub">Senin Sesin</p>
                            <div className="laptop-splash-spinner" />
                        </div>

                        {/* 3. ANA ARAYÜZ — CRTDemoSimulation */}
                        <div className={`laptop-state-layer laptop-app-ui ${appState === 'ready' ? 'visible' : ''
                            }`}>
                            <div className="laptop-app-content">
                                <CRTDemoSimulation />
                            </div>
                        </div>
                    </div>

                    {/* SopranoChat Logo — Retro 3D SVG */}
                    <div className="laptop-bezel-logo">
                        <span style={{
                            fontFamily: "'Cooper Black', 'Arial Rounded MT Bold', sans-serif",
                            fontSize: 10,
                            fontWeight: 900,
                            letterSpacing: '0.5px',
                            color: 'transparent',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.12) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: 'none',
                        }}>SopranoChat</span>
                    </div>
                </div>

                {/* LAPTOP BASE (Gümüş Alt Kasa) */}
                <div className="laptop-base-lip">
                    {/* Üst yansıma çizgisi */}
                    <div className="laptop-base-highlight" />
                    {/* Sol-sağ kenar gölgeleri */}
                    <div className="laptop-base-edge-left" />
                    <div className="laptop-base-edge-right" />
                    {/* Trackpad çentiği */}
                    <div className="laptop-trackpad-notch" />
                </div>

            </div>
        </div>
    );
}
