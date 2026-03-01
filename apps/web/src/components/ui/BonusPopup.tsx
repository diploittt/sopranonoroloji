"use client";

import { useEffect, useState, useRef, useCallback } from 'react';

export interface BonusData {
    amount: number;
    type: string; // 'daily' | 'vipWeekly' | other
    message: string;
}

interface BonusPopupProps {
    bonus: BonusData | null;
    onClose: () => void;
}

export function BonusPopup({ bonus, onClose }: BonusPopupProps) {
    const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');
    const [counter, setCounter] = useState(0);
    const rafRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);

    const isVip = bonus?.type === 'vipWeekly';
    const targetAmount = bonus?.amount || 0;

    // Counter animation
    useEffect(() => {
        if (!bonus) return;
        setCounter(0);
        setPhase('enter');

        const enterTimer = setTimeout(() => setPhase('visible'), 50);

        // Animate counter from 0 to targetAmount over 1.2s
        startTimeRef.current = performance.now();
        const duration = 1200;

        const animate = (now: number) => {
            const elapsed = now - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCounter(Math.round(eased * targetAmount));
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };
        // Start counter after a small delay for enter animation
        const counterDelay = setTimeout(() => {
            rafRef.current = requestAnimationFrame(animate);
        }, 400);

        // Auto-close after 4.5s
        const autoClose = setTimeout(() => {
            setPhase('exit');
            setTimeout(onClose, 400);
        }, 4500);

        return () => {
            clearTimeout(enterTimer);
            clearTimeout(counterDelay);
            clearTimeout(autoClose);
            cancelAnimationFrame(rafRef.current);
        };
    }, [bonus, targetAmount, onClose]);

    const handleClick = useCallback(() => {
        setPhase('exit');
        setTimeout(onClose, 400);
    }, [onClose]);

    if (!bonus) return null;

    const isEntering = phase === 'enter';
    const isExiting = phase === 'exit';

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center cursor-pointer"
            onClick={handleClick}
            style={{
                backgroundColor: isEntering || isExiting ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.55)',
                transition: 'background-color 0.4s ease',
            }}
        >
            {/* Popup Card */}
            <div
                className="relative w-[340px] rounded-2xl overflow-hidden select-none"
                style={{
                    transform: isEntering ? 'scale(0.6) translateY(30px)' : isExiting ? 'scale(0.8) translateY(-20px)' : 'scale(1) translateY(0)',
                    opacity: isEntering || isExiting ? 0 : 1,
                    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Background with gradient */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: isVip
                            ? 'linear-gradient(145deg, #1a1500 0%, #2a1f00 30%, #1a1200 100%)'
                            : 'linear-gradient(145deg, #001a10 0%, #002a1a 30%, #001210 100%)',
                    }}
                />

                {/* Animated glow border */}
                <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                        border: isVip
                            ? '2px solid rgba(255, 195, 0, 0.5)'
                            : '2px solid rgba(52, 211, 153, 0.5)',
                        boxShadow: isVip
                            ? '0 0 30px rgba(255, 195, 0, 0.2), inset 0 0 30px rgba(255, 195, 0, 0.05)'
                            : '0 0 30px rgba(52, 211, 153, 0.2), inset 0 0 30px rgba(52, 211, 153, 0.05)',
                        animation: 'bonusGlow 2s ease-in-out infinite alternate',
                    }}
                />

                {/* Sparkle particles */}
                <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full"
                            style={{
                                width: `${3 + Math.random() * 4}px`,
                                height: `${3 + Math.random() * 4}px`,
                                left: `${10 + Math.random() * 80}%`,
                                top: `${10 + Math.random() * 80}%`,
                                background: isVip
                                    ? `rgba(255, 195, 0, ${0.4 + Math.random() * 0.5})`
                                    : `rgba(52, 211, 153, ${0.4 + Math.random() * 0.5})`,
                                animation: `bonusSparkle ${1.5 + Math.random() * 2}s ease-in-out infinite`,
                                animationDelay: `${Math.random() * 2}s`,
                            }}
                        />
                    ))}
                </div>

                {/* Content */}
                <div className="relative z-10 px-6 py-8 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                        style={{
                            background: isVip
                                ? 'linear-gradient(135deg, rgba(255,195,0,0.2), rgba(255,195,0,0.05))'
                                : 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(52,211,153,0.05))',
                            border: isVip
                                ? '2px solid rgba(255,195,0,0.3)'
                                : '2px solid rgba(52,211,153,0.3)',
                            animation: 'bonusPulse 2s ease-in-out infinite',
                        }}
                    >
                        <span className="text-4xl" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' }}>
                            {isVip ? '⭐' : '🎁'}
                        </span>
                    </div>

                    {/* Title */}
                    <h2
                        className="text-lg font-bold mb-1 tracking-wide"
                        style={{
                            color: isVip ? '#ffc300' : '#34d399',
                            textShadow: isVip
                                ? '0 0 20px rgba(255,195,0,0.4)'
                                : '0 0 20px rgba(52,211,153,0.4)',
                        }}
                    >
                        {isVip ? 'VIP Haftalık Bonus' : 'Günlük Bonus'}
                    </h2>

                    {/* Subtitle */}
                    <p className="text-xs text-gray-400 mb-5">
                        {isVip ? 'VIP üyeliğiniz için haftalık ödülünüz!' : 'Bugünkü giriş ödülünüz hazır!'}
                    </p>

                    {/* Amount - Big Counter */}
                    <div className="flex items-center gap-3 mb-2">
                        <span
                            className="text-5xl font-black tabular-nums"
                            style={{
                                color: isVip ? '#ffc300' : '#34d399',
                                textShadow: isVip
                                    ? '0 0 30px rgba(255,195,0,0.5), 0 2px 10px rgba(0,0,0,0.5)'
                                    : '0 0 30px rgba(52,211,153,0.5), 0 2px 10px rgba(0,0,0,0.5)',
                                letterSpacing: '-1px',
                            }}
                        >
                            +{counter}
                        </span>
                    </div>

                    <span
                        className="text-sm font-semibold tracking-widest uppercase mb-5"
                        style={{ color: isVip ? 'rgba(255,195,0,0.7)' : 'rgba(52,211,153,0.7)' }}
                    >
                        JETON
                    </span>

                    {/* Tap to dismiss */}
                    <p className="text-[10px] text-gray-600 animate-pulse">
                        kapatmak için dokun
                    </p>
                </div>
            </div>

            {/* CSS Animations */}
            <style jsx global>{`
                @keyframes bonusGlow {
                    0% { opacity: 0.7; }
                    100% { opacity: 1; }
                }
                @keyframes bonusSparkle {
                    0%, 100% { opacity: 0; transform: scale(0) translateY(0); }
                    50% { opacity: 1; transform: scale(1) translateY(-15px); }
                }
                @keyframes bonusPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.08); }
                }
            `}</style>
        </div>
    );
}

// Queue hook — handles multiple bonuses sequentially
export function useBonusQueue() {
    const [queue, setQueue] = useState<BonusData[]>([]);
    const [current, setCurrent] = useState<BonusData | null>(null);

    const enqueue = useCallback((bonus: BonusData) => {
        setQueue(prev => [...prev, bonus]);
    }, []);

    // Show next bonus from queue
    useEffect(() => {
        if (!current && queue.length > 0) {
            setCurrent(queue[0]);
            setQueue(prev => prev.slice(1));
        }
    }, [current, queue]);

    const dismiss = useCallback(() => {
        setCurrent(null);
    }, []);

    return { current, enqueue, dismiss };
}
