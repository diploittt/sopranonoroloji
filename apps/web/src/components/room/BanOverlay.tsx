'use client';

import { useEffect, useState } from 'react';

interface BanOverlayProps {
    reason: string;
    expiresAt?: string | null;
}

export function BanOverlay({ reason, expiresAt }: BanOverlayProps) {
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    window.location.href = '/';
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const expiresText = expiresAt
        ? `Bitiş: ${new Date(expiresAt).toLocaleString('tr-TR')}`
        : 'Kalıcı yasak';

    return (
        <div className="ban-overlay">
            {/* Flashing background layers */}
            <div className="ban-overlay__flash" />
            <div className="ban-overlay__flash ban-overlay__flash--delayed" />

            {/* Content */}
            <div className="ban-overlay__content">
                <div className="ban-overlay__icon">🚫</div>
                <h1 className="ban-overlay__title">YASAKLANDINIZ</h1>
                <div className="ban-overlay__divider" />
                <p className="ban-overlay__reason">{reason}</p>
                <p className="ban-overlay__expires">{expiresText}</p>
                <div className="ban-overlay__countdown">
                    <span>{countdown}</span> saniye içinde yönlendirileceksiniz...
                </div>
            </div>

            <style jsx>{`
                .ban-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(10, 0, 0, 0.97);
                    backdrop-filter: blur(20px);
                }

                .ban-overlay__flash {
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(ellipse at center, rgba(220, 38, 38, 0.15) 0%, transparent 70%);
                    animation: banFlash 1.5s ease-in-out infinite;
                }
                .ban-overlay__flash--delayed {
                    animation-delay: 0.75s;
                    background: radial-gradient(ellipse at center, rgba(239, 68, 68, 0.10) 0%, transparent 60%);
                }

                @keyframes banFlash {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                }

                .ban-overlay__content {
                    position: relative;
                    z-index: 1;
                    text-align: center;
                    padding: 3rem;
                    animation: banSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes banSlideIn {
                    from { opacity: 0; transform: scale(0.8) translateY(30px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }

                .ban-overlay__icon {
                    font-size: 6rem;
                    margin-bottom: 1rem;
                    animation: banPulse 1s ease-in-out infinite;
                    filter: drop-shadow(0 0 40px rgba(220, 38, 38, 0.6));
                }

                @keyframes banPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                }

                .ban-overlay__title {
                    font-size: 4rem;
                    font-weight: 900;
                    color: #ef4444;
                    letter-spacing: 0.15em;
                    text-shadow:
                        0 0 20px rgba(239, 68, 68, 0.8),
                        0 0 60px rgba(239, 68, 68, 0.4),
                        0 0 100px rgba(239, 68, 68, 0.2);
                    animation: banTextGlow 2s ease-in-out infinite;
                    margin: 0.5rem 0;
                }

                @keyframes banTextGlow {
                    0%, 100% { text-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 0 60px rgba(239, 68, 68, 0.4); }
                    50% { text-shadow: 0 0 40px rgba(239, 68, 68, 1), 0 0 100px rgba(239, 68, 68, 0.7), 0 0 140px rgba(239, 68, 68, 0.3); }
                }

                .ban-overlay__divider {
                    width: 120px;
                    height: 3px;
                    background: linear-gradient(90deg, transparent, #ef4444, transparent);
                    margin: 1.5rem auto;
                    border-radius: 2px;
                }

                .ban-overlay__reason {
                    font-size: 1.1rem;
                    color: rgba(255, 255, 255, 0.7);
                    margin: 0.5rem 0;
                    font-weight: 500;
                }

                .ban-overlay__expires {
                    font-size: 0.9rem;
                    color: rgba(239, 68, 68, 0.7);
                    margin: 0.25rem 0 1.5rem;
                    font-weight: 600;
                }

                .ban-overlay__countdown {
                    font-size: 0.85rem;
                    color: rgba(255, 255, 255, 0.35);
                }
                .ban-overlay__countdown span {
                    color: #ef4444;
                    font-weight: 700;
                    font-size: 1.1rem;
                }
            `}</style>
        </div>
    );
}
