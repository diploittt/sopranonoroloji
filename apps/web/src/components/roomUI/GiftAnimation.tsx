'use client';

import { useEffect, useState, useCallback } from 'react';

interface GiftAnimationData {
    senderName: string;
    receiverName: string;
    gift: {
        name: string;
        emoji: string;
        animationType: string;
        category: string;
        price: number;
    };
    quantity: number;
}

// ─── Category-based visual configs ──────────────────────────────────
const CATEGORY_STYLES: Record<string, {
    gradient: string;
    particleColors: string[];
    glowColor: string;
    bannerBg: string;
    borderColor: string;
    textColor: string;
    particleCount: number;
    duration: number;
    shakeIntensity: number;
}> = {
    basic: {
        gradient: 'radial-gradient(ellipse at center, rgba(34,197,94,0.15) 0%, transparent 70%)',
        particleColors: ['#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#34d399'],
        glowColor: 'rgba(34,197,94,0.4)',
        bannerBg: 'linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(16,185,129,0.15) 100%)',
        borderColor: 'rgba(34,197,94,0.4)',
        textColor: '#4ade80',
        particleCount: 20,
        duration: 3000,
        shakeIntensity: 0,
    },
    premium: {
        gradient: 'radial-gradient(ellipse at center, rgba(168,85,247,0.2) 0%, transparent 70%)',
        particleColors: ['#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#7c3aed'],
        glowColor: 'rgba(168,85,247,0.5)',
        bannerBg: 'linear-gradient(135deg, rgba(168,85,247,0.25) 0%, rgba(124,58,237,0.2) 100%)',
        borderColor: 'rgba(168,85,247,0.5)',
        textColor: '#c084fc',
        particleCount: 40,
        duration: 4500,
        shakeIntensity: 2,
    },
    legendary: {
        gradient: 'radial-gradient(ellipse at center, rgba(245,158,11,0.25) 0%, rgba(234,88,12,0.1) 50%, transparent 70%)',
        particleColors: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#d97706', '#ef4444', '#f97316'],
        glowColor: 'rgba(245,158,11,0.6)',
        bannerBg: 'linear-gradient(135deg, rgba(245,158,11,0.3) 0%, rgba(234,88,12,0.2) 50%, rgba(220,38,38,0.15) 100%)',
        borderColor: 'rgba(245,158,11,0.6)',
        textColor: '#fbbf24',
        particleCount: 80,
        duration: 6000,
        shakeIntensity: 4,
    },
};

// ─── Particle shapes for CSS animation ──────────────────────────────
function generateParticles(count: number, colors: string[]) {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 4 + Math.random() * 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 1.5,
        duration: 1.5 + Math.random() * 2,
        type: Math.random() > 0.6 ? 'circle' : Math.random() > 0.5 ? 'star' : 'diamond',
        angle: Math.random() * 360,
        distance: 30 + Math.random() * 70,
    }));
}

export function GiftAnimation({ animationData, onComplete }: {
    animationData: GiftAnimationData | null;
    onComplete: () => void;
}) {
    const [show, setShow] = useState(false);
    const [phase, setPhase] = useState<'enter' | 'display' | 'exit'>('enter');

    const config = animationData
        ? CATEGORY_STYLES[animationData.gift.category] || CATEGORY_STYLES.basic
        : CATEGORY_STYLES.basic;

    useEffect(() => {
        if (!animationData) return;

        setShow(true);
        setPhase('enter');

        // ★ Play category-based sound effect via Web Audio API
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const category = animationData.gift.category || 'basic';

            if (category === 'legendary') {
                // Epik crescendo — ascending chord
                [261.6, 329.6, 392, 523.2].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
                    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.15 + 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 1.2);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(ctx.currentTime + i * 0.15);
                    osc.stop(ctx.currentTime + i * 0.15 + 1.3);
                });
                // Shimmer overlay
                const shimmer = ctx.createOscillator();
                const shimmerGain = ctx.createGain();
                shimmer.type = 'triangle';
                shimmer.frequency.value = 1046.5;
                shimmerGain.gain.setValueAtTime(0, ctx.currentTime + 0.5);
                shimmerGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.7);
                shimmerGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
                shimmer.connect(shimmerGain).connect(ctx.destination);
                shimmer.start(ctx.currentTime + 0.5);
                shimmer.stop(ctx.currentTime + 2.1);
            } else if (category === 'premium') {
                // Rich chime — two-note chord
                [523.2, 659.2].forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.12, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
                    osc.connect(gain).connect(ctx.destination);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.9);
                });
            } else {
                // Soft ding
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.value = 880;
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                osc.connect(gain).connect(ctx.destination);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.6);
            }
        } catch (e) {
            console.warn('[GiftAnimation] Sound failed:', e);
        }

        const enterTimer = setTimeout(() => setPhase('display'), 400);
        const exitTimer = setTimeout(() => setPhase('exit'), config.duration - 600);
        const doneTimer = setTimeout(() => {
            setShow(false);
            onComplete();
        }, config.duration);

        return () => {
            clearTimeout(enterTimer);
            clearTimeout(exitTimer);
            clearTimeout(doneTimer);
        };
    }, [animationData]);

    if (!animationData || !show) return null;

    const particles = generateParticles(config.particleCount, config.particleColors);
    const isLegendary = animationData.gift.category === 'legendary';
    const isPremium = animationData.gift.category === 'premium';

    return (
        <div
            className="fixed inset-0 pointer-events-none overflow-hidden"
            style={{ zIndex: 9999 }}
        >
            {/* Full-screen background pulse */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: config.gradient,
                    animation: `giftBgPulse ${config.duration}ms ease-in-out`,
                    opacity: phase === 'exit' ? 0 : 1,
                    transition: 'opacity 0.6s ease-out',
                }}
            />

            {/* Screen shake for premium/legendary */}
            {config.shakeIntensity > 0 && phase === 'enter' && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        animation: `giftShake 0.4s ease-out`,
                    }}
                />
            )}

            {/* Particle explosion layer */}
            <div style={{ position: 'absolute', inset: 0 }}>
                {particles.map(p => (
                    <div
                        key={p.id}
                        style={{
                            position: 'absolute',
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                            width: p.size,
                            height: p.size,
                            background: p.color,
                            borderRadius: p.type === 'circle' ? '50%' : p.type === 'diamond' ? '2px' : '0',
                            transform: p.type === 'diamond' ? 'rotate(45deg)' : p.type === 'star' ? 'rotate(0deg)' : 'none',
                            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                            animation: `giftParticle${p.id % 4} ${p.duration}s ${p.delay}s ease-out forwards`,
                            opacity: 0,
                            clipPath: p.type === 'star'
                                ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                                : undefined,
                        }}
                    />
                ))}
            </div>

            {/* Legendary: Golden ring burst */}
            {isLegendary && (
                <>
                    <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 0,
                        height: 0,
                        borderRadius: '50%',
                        border: '3px solid rgba(245,158,11,0.6)',
                        boxShadow: '0 0 40px rgba(245,158,11,0.4), inset 0 0 40px rgba(245,158,11,0.2)',
                        animation: 'giftRingBurst 1.5s 0.2s ease-out forwards',
                    }} />
                    <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 0,
                        height: 0,
                        borderRadius: '50%',
                        border: '2px solid rgba(234,88,12,0.4)',
                        animation: 'giftRingBurst 1.8s 0.5s ease-out forwards',
                    }} />
                </>
            )}

            {/* Premium: Purple aurora */}
            {isPremium && (
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 300,
                    height: 300,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, rgba(124,58,237,0.1) 50%, transparent 70%)',
                    animation: 'giftAuroraPulse 2s ease-in-out infinite',
                    filter: 'blur(20px)',
                }} />
            )}

            {/* Central gift display banner */}
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: isLegendary ? 16 : 10,
                    animation: phase === 'enter'
                        ? 'giftBannerEnter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                        : phase === 'exit'
                            ? 'giftBannerExit 0.6s ease-in forwards'
                            : 'giftBannerFloat 2s ease-in-out infinite',
                    opacity: phase === 'enter' ? 0 : 1,
                }}
            >
                {/* Gift emoji with glow */}
                <div style={{
                    fontSize: isLegendary ? 80 : isPremium ? 64 : 48,
                    lineHeight: 1,
                    filter: `drop-shadow(0 0 ${isLegendary ? 30 : isPremium ? 20 : 10}px ${config.glowColor})`,
                    animation: `giftEmojiPulse ${isLegendary ? '0.8' : '1.2'}s ease-in-out infinite alternate`,
                }}>
                    {animationData.gift.emoji}
                </div>

                {/* Banner card */}
                <div style={{
                    background: config.bannerBg,
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${config.borderColor}`,
                    borderRadius: 16,
                    padding: isLegendary ? '16px 32px' : '12px 24px',
                    textAlign: 'center',
                    boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 20px ${config.glowColor}`,
                    minWidth: isLegendary ? 280 : 220,
                }}>
                    {/* Sender → Receiver */}
                    <div style={{
                        fontSize: isLegendary ? 16 : 13,
                        fontWeight: 700,
                        color: config.textColor,
                        marginBottom: 6,
                        letterSpacing: '0.5px',
                        textShadow: `0 0 10px ${config.glowColor}`,
                    }}>
                        {animationData.senderName}
                        <span style={{ color: 'rgba(255,255,255,0.5)', margin: '0 6px', fontSize: 11 }}>→</span>
                        {animationData.receiverName}
                    </div>

                    {/* Gift name */}
                    <div style={{
                        fontSize: isLegendary ? 22 : isPremium ? 18 : 15,
                        fontWeight: 800,
                        color: '#fff',
                        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                        letterSpacing: '0.3px',
                    }}>
                        {animationData.gift.name}
                        {animationData.quantity > 1 && (
                            <span style={{ color: config.textColor, fontSize: '0.7em', marginLeft: 6 }}>
                                x{animationData.quantity}
                            </span>
                        )}
                    </div>

                    {/* Price tag */}
                    <div style={{
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.5)',
                        marginTop: 4,
                    }}>
                        🪙 {animationData.gift.price * (animationData.quantity || 1)} jeton
                    </div>
                </div>
            </div>

            {/* Legendary edge glow beams */}
            {isLegendary && (
                <>
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 2,
                        height: '100%',
                        background: 'linear-gradient(180deg, rgba(245,158,11,0) 0%, rgba(245,158,11,0.5) 50%, rgba(245,158,11,0) 100%)',
                        animation: 'giftBeamVertical 2s ease-in-out infinite',
                        filter: 'blur(4px)',
                    }} />
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: 2,
                        width: '100%',
                        background: 'linear-gradient(90deg, rgba(245,158,11,0) 0%, rgba(245,158,11,0.5) 50%, rgba(245,158,11,0) 100%)',
                        animation: 'giftBeamHorizontal 2s 0.5s ease-in-out infinite',
                        filter: 'blur(4px)',
                    }} />
                </>
            )}

            {/* Sparkle trail particles (continuous) */}
            {(isPremium || isLegendary) && Array.from({ length: isLegendary ? 12 : 6 }).map((_, i) => (
                <div key={`sparkle-${i}`} style={{
                    position: 'absolute',
                    left: `${20 + Math.random() * 60}%`,
                    top: `${20 + Math.random() * 60}%`,
                    width: 3,
                    height: 3,
                    borderRadius: '50%',
                    background: '#fff',
                    boxShadow: `0 0 8px ${config.particleColors[i % config.particleColors.length]}`,
                    animation: `giftSparkle 1.5s ${i * 0.2}s ease-in-out infinite`,
                }} />
            ))}

            {/* CSS Keyframes */}
            <style jsx global>{`
                @keyframes giftBgPulse {
                    0% { opacity: 0; }
                    10% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { opacity: 0; }
                }
                @keyframes giftShake {
                    0%, 100% { transform: translateX(0); }
                    10% { transform: translateX(-${config.shakeIntensity}px); }
                    20% { transform: translateX(${config.shakeIntensity}px); }
                    30% { transform: translateX(-${config.shakeIntensity}px); }
                    40% { transform: translateX(${config.shakeIntensity}px); }
                    50% { transform: translateX(-${config.shakeIntensity * 0.5}px); }
                    60% { transform: translateX(${config.shakeIntensity * 0.5}px); }
                }
                @keyframes giftBannerEnter {
                    from { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
                    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
                @keyframes giftBannerExit {
                    from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    to { opacity: 0; transform: translate(-50%, -50%) scale(1.3); filter: blur(8px); }
                }
                @keyframes giftBannerFloat {
                    0%, 100% { transform: translate(-50%, -50%) translateY(0); }
                    50% { transform: translate(-50%, -50%) translateY(-6px); }
                }
                @keyframes giftEmojiPulse {
                    from { transform: scale(1); }
                    to { transform: scale(1.15); }
                }
                @keyframes giftRingBurst {
                    from { width: 0; height: 0; opacity: 1; }
                    to { width: 600px; height: 600px; opacity: 0; }
                }
                @keyframes giftAuroraPulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
                    50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.3; }
                }
                @keyframes giftSparkle {
                    0%, 100% { opacity: 0; transform: scale(0); }
                    50% { opacity: 1; transform: scale(2); }
                }
                @keyframes giftBeamVertical {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 0.8; }
                }
                @keyframes giftBeamHorizontal {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 0.8; }
                }
                ${particles.map((p, i) => `
                    @keyframes giftParticle${i % 4} {
                        0% { opacity: 0; transform: translate(0, 0) scale(0); }
                        15% { opacity: 1; transform: translate(0, 0) scale(1.5); }
                        100% {
                            opacity: 0;
                            transform: translate(
                                ${(Math.random() - 0.5) * 400}px,
                                ${(Math.random() - 0.5) * 400}px
                            ) scale(0) rotate(${Math.random() * 720}deg);
                        }
                    }
                `).join('')}
            `}</style>
        </div>
    );
}
