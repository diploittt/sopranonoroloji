'use client';
import React, { useState, useEffect } from 'react';

interface MeetingRoomBannerProps {
    participantCount: number;
    currentUserName?: string;
}

export function MeetingRoomBanner({ participantCount, currentUserName }: MeetingRoomBannerProps) {
    const [elapsed, setElapsed] = useState(0);
    const [joinTime] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => {
            setElapsed(Math.floor((Date.now() - joinTime) / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, [joinTime]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return h > 0
            ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '44px',
            background: 'linear-gradient(90deg, #0f0a1e 0%, #1a0e30 30%, #1e1040 50%, #1a0e30 70%, #0f0a1e 100%)',
            borderBottom: '1px solid rgba(139, 92, 246, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            zIndex: 9999,
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        }}>
            {/* Animated glow line at bottom */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '1px',
                background: 'linear-gradient(90deg, transparent 0%, #7c3aed 20%, #a78bfa 50%, #7c3aed 80%, transparent 100%)',
                opacity: 0.8,
            }} />

            {/* Left — Icon + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    boxShadow: '0 0 12px rgba(139, 92, 246, 0.35)',
                    flexShrink: 0,
                }}>
                    🔒
                </div>
                <div style={{ lineHeight: 1.2 }}>
                    <div style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#e2e0ff',
                        letterSpacing: '1.5px',
                        textTransform: 'uppercase' as const,
                    }}>
                        Toplantı Odası
                    </div>
                    <div style={{
                        fontSize: '10px',
                        color: 'rgba(167, 139, 250, 0.6)',
                        fontWeight: 500,
                    }}>
                        Yetkili personel
                    </div>
                </div>
            </div>

            {/* Center — Live indicator + Timer */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(139, 92, 246, 0.12)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '16px',
                    padding: '4px 12px',
                }}>
                    <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#22c55e',
                        boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)',
                        animation: 'mtgPulse 2s ease-in-out infinite',
                    }} />
                    <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#a78bfa',
                        letterSpacing: '0.5px',
                    }}>
                        {formatTime(elapsed)}
                    </span>
                </div>
            </div>

            {/* Right — Participants */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.5)',
            }}>
                <span style={{ fontSize: '13px' }}>👥</span>
                <span style={{ fontWeight: 700, color: '#a78bfa' }}>{participantCount}</span>
                <span>katılımcı</span>
            </div>

            {/* CSS Animations */}
            <style>{`
        @keyframes mtgPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
        </div>
    );
}
