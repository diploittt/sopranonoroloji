'use client';

import React, { useState, useEffect, useRef } from 'react';

interface CallUser {
    id?: string;
    socketId?: string;
    displayName?: string;
    username?: string;
    avatar?: string;
    role?: string;
}

interface OneToOneCallViewProps {
    currentUser: CallUser | null;
    otherUser: {
        otherDisplayName: string;
        otherAvatar?: string;
        otherRole?: string;
        otherUserId?: string;
    };
    onEndCall: () => void;
}

export default function OneToOneCallView({
    currentUser,
    otherUser,
    onEndCall,
}: OneToOneCallViewProps) {
    const [callDuration, setCallDuration] = useState(0);
    const [pulsePhase, setPulsePhase] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Call timer
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
        }, 1000);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Pulse animation
    useEffect(() => {
        const interval = setInterval(() => {
            setPulsePhase((prev) => (prev + 1) % 360);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const getInitial = (name: string) => name?.charAt(0)?.toUpperCase() || '?';
    const displayName = otherUser.otherDisplayName || 'Karşı Taraf';
    const avatar = otherUser.otherAvatar;

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(15, 17, 30, 0.95) 0%, rgba(20, 24, 50, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(102, 126, 234, 0.15)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.4), 0 0 20px rgba(102, 126, 234, 0.08)',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            width: '100%',
            maxWidth: '420px',
            margin: '0 auto',
            position: 'relative',
            overflow: 'hidden',
            animation: 'callSlideIn 0.4s ease-out',
        }}>
            {/* Glow */}
            <div style={{
                position: 'absolute', top: '-50%', left: '20%', width: '60%', height: '100%',
                background: 'radial-gradient(ellipse, rgba(102, 126, 234, 0.06) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Avatar — sadece karşı taraf */}
            <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
                {/* Pulse ring */}
                <div style={{
                    position: 'absolute', inset: '-5px', borderRadius: '50%',
                    border: '2px solid rgba(245, 87, 108, 0.4)',
                    animation: 'pulse-ring 2s ease-out infinite',
                }} />
                <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: avatar ? 'transparent' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', fontWeight: 800, color: '#fff',
                    boxShadow: '0 4px 16px rgba(245, 87, 108, 0.35)',
                    border: '2px solid rgba(245, 87, 108, 0.4)',
                    overflow: 'hidden',
                }}>
                    {avatar ? (
                        <img src={avatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : getInitial(displayName)}
                </div>
                {/* Online dot */}
                <div style={{
                    position: 'absolute', bottom: '0px', right: '0px',
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: '#2ecc71', border: '2px solid #0f1320',
                    boxShadow: '0 0 6px rgba(46, 204, 113, 0.5)',
                }} />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{
                        color: '#fff', fontSize: '14px', fontWeight: 700,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{displayName}</span>
                    <span style={{
                        color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 500,
                    }}>ile görüşme</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Connection waves */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} style={{
                                width: '2px',
                                height: `${6 + Math.sin((pulsePhase + i * 40) * (Math.PI / 180)) * 5}px`,
                                borderRadius: '1px',
                                background: 'linear-gradient(180deg, rgba(46, 204, 113, 0.8), rgba(102, 126, 234, 0.8))',
                                transition: 'height 0.1s ease',
                            }} />
                        ))}
                    </div>
                    {/* Timer */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                    }}>
                        <div style={{
                            width: '5px', height: '5px', borderRadius: '50%',
                            background: '#2ecc71', animation: 'blink 1.5s infinite',
                            boxShadow: '0 0 4px rgba(46, 204, 113, 0.4)',
                        }} />
                        <span style={{
                            color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600,
                            fontFamily: 'monospace', letterSpacing: '0.08em',
                        }}>{formatTime(callDuration)}</span>
                    </div>
                    <span style={{
                        color: 'rgba(255,255,255,0.25)', fontSize: '10px',
                        fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>BİRE BİR</span>
                </div>
            </div>

            {/* End Call button — tek buton */}
            <button
                onClick={onEndCall}
                style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                    border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(231, 76, 60, 0.35)',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                title="Görüşmeyi Sonlandır"
            >
                📞
            </button>

            {/* CSS Animations */}
            <style>{`
                @keyframes pulse-ring {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(1.3); opacity: 0; }
                }
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0.3; }
                }
                @keyframes callSlideIn {
                    from { opacity: 0; transform: translateY(-12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
