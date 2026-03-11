'use client';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/i18n/LanguageProvider';

/* ───── Types ───── */
interface One2OneRoomProps {
    currentUser: { userId: string; displayName: string; avatar?: string; role?: string } | null;
    otherUser: { otherDisplayName: string; otherAvatar: string; otherRole: string; otherUserId: string } | null;
    participants: any[];
    messages: any[];
    remoteStreams: { peerId: string; stream: MediaStream; username: string; kind: string }[];
    localStream: MediaStream | null;
    isCameraOn: boolean;
    isMicOn: boolean;
    onToggleCamera: () => void;
    onStartMic: () => void;
    onStopMic: () => void;
    onSendMessage: (text: string) => void;
    onHangUp: () => void;
}

export function One2OneRoomView({
    currentUser,
    otherUser,
    participants,
    messages,
    remoteStreams,
    localStream,
    isCameraOn,
    isMicOn,
    onToggleCamera,
    onStartMic,
    onStopMic,
    onSendMessage,
    onHangUp,
}: One2OneRoomProps) {
    const [msgInput, setMsgInput] = useState('');
    const [callDuration, setCallDuration] = useState(0);
    const { t } = useTranslation();
    const chatEndRef = useRef<HTMLDivElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // Detect other user from participants if otherUser is null
    const other = otherUser || (() => {
        const p = participants.find(u => u.userId !== currentUser?.userId);
        return p ? {
            otherDisplayName: p.displayName || t.user,
            otherAvatar: p.avatar || '',
            otherRole: p.role || 'guest',
            otherUserId: p.userId || '',
        } : null;
    })();

    // Timer
    useEffect(() => {
        const iv = setInterval(() => setCallDuration(s => s + 1), 1000);
        return () => clearInterval(iv);
    }, []);

    // Scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    // Local video
    useEffect(() => {
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
    }, [localStream]);

    // Remote video
    const remoteVideo = remoteStreams.find(
        s => s.peerId === other?.otherUserId && s.kind === 'video'
    );
    useEffect(() => {
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteVideo?.stream || null;
        }
    }, [remoteVideo]);

    const handleSend = useCallback(() => {
        const text = msgInput.trim();
        if (!text) return;
        onSendMessage(text);
        setMsgInput('');
    }, [msgInput, onSendMessage]);

    const handleMicToggle = useCallback(() => {
        if (isMicOn) onStopMic();
        else onStartMic();
    }, [isMicOn, onStartMic, onStopMic]);

    const fmt = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const myName = currentUser?.displayName || t.user;
    const myAvatar = currentUser?.avatar || '';
    const otherName = other?.otherDisplayName || t.loading;
    const otherAvatarUrl = other?.otherAvatar || '';
    const hasRemoteVideo = !!remoteVideo;

    return (
        <div style={{
            width: '100%', height: '100vh',
            background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 30%, #0d1b2a 60%, #0a0a1a 100%)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden', position: 'relative',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}>
            <style>{`
                @keyframes o2o-glow-blue { 0%,100%{box-shadow:0 0 30px rgba(79,172,254,0.3),0 0 60px rgba(79,172,254,0.1)} 50%{box-shadow:0 0 50px rgba(79,172,254,0.5),0 0 100px rgba(79,172,254,0.2)} }
                @keyframes o2o-glow-red { 0%,100%{box-shadow:0 0 30px rgba(254,79,107,0.3),0 0 60px rgba(254,79,107,0.1)} 50%{box-shadow:0 0 50px rgba(254,79,107,0.5),0 0 100px rgba(254,79,107,0.2)} }
                @keyframes o2o-vs-pulse { 0%,100%{transform:scale(1);opacity:0.8} 50%{transform:scale(1.15);opacity:1} }
                @keyframes o2o-ring-outer { 0%,100%{transform:scale(1);opacity:0.3} 50%{transform:scale(1.08);opacity:0.1} }
                @keyframes o2o-slide-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
                @keyframes o2o-spark { 0%{opacity:0;transform:scaleX(0.5)} 50%{opacity:1;transform:scaleX(1)} 100%{opacity:0;transform:scaleX(0.5)} }
                .o2o-msg:hover { background: rgba(255,255,255,0.06) !important; }
                .o2o-btn:hover { transform: scale(1.12) !important; filter: brightness(1.2) !important; }
                .o2o-btn:active { transform: scale(0.95) !important; }
                .o2o-input:focus { border-color: rgba(79,172,254,0.4) !important; background: rgba(255,255,255,0.08) !important; }
            `}</style>

            {/* ═══ TOP BAR ═══ */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 24px',
                background: 'rgba(0,0,0,0.5)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                zIndex: 10,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: '#00b894', boxShadow: '0 0 10px #00b894',
                    }} />
                    <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px' }}>
                        ⚡ Bire Bir Görüşme
                    </span>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '14px' }}>
                    {fmt(callDuration)}
                </span>
            </div>

            {/* ═══ MAIN AREA — VS Screen ═══ */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                position: 'relative', minHeight: 0,
                padding: '20px',
            }}>
                {/* Fighters VS area */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '60px',
                    animation: 'o2o-slide-up 0.6s ease',
                }}>
                    {/* LEFT FIGHTER — Current user (blue) */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                        <div style={{ position: 'relative' }}>
                            {/* Outer pulsing ring */}
                            <div style={{
                                position: 'absolute', inset: '-14px', borderRadius: '50%',
                                border: '2px solid rgba(79,172,254,0.2)',
                                animation: 'o2o-ring-outer 3s ease-in-out infinite',
                            }} />
                            {/* Avatar / Video circle */}
                            <div style={{
                                width: '200px', height: '200px',
                                borderRadius: '50%', overflow: 'hidden',
                                border: '3px solid rgba(79,172,254,0.6)',
                                animation: 'o2o-glow-blue 3s ease-in-out infinite',
                                background: 'linear-gradient(135deg, #1a1a3e, #0d1b2a)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {isCameraOn && localStream ? (
                                    <video ref={localVideoRef} autoPlay playsInline muted
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                                ) : myAvatar ? (
                                    <img src={myAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: '80px', fontWeight: 700, color: '#4facfe' }}>
                                        {myName.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>
                        <span style={{
                            color: '#4facfe', fontSize: '17px', fontWeight: 700,
                            textShadow: '0 0 20px rgba(79,172,254,0.4)',
                            letterSpacing: '0.5px',
                        }}>{myName}</span>
                    </div>

                    {/* VS Badge */}
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                    }}>
                        <span style={{
                            fontSize: '42px', fontWeight: 900,
                            background: 'linear-gradient(135deg, #4facfe, #f857a6)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            animation: 'o2o-vs-pulse 2s ease-in-out infinite',
                            letterSpacing: '6px',
                        }}>VS</span>
                        {/* Spark line */}
                        <div style={{
                            width: '50px', height: '3px',
                            background: 'linear-gradient(90deg, transparent, #4facfe, #f857a6, transparent)',
                            borderRadius: '2px',
                            animation: 'o2o-spark 2s ease-in-out infinite',
                        }} />
                    </div>

                    {/* RIGHT FIGHTER — Other user (red) */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                position: 'absolute', inset: '-14px', borderRadius: '50%',
                                border: '2px solid rgba(254,79,107,0.2)',
                                animation: 'o2o-ring-outer 3s ease-in-out infinite 0.5s',
                            }} />
                            <div style={{
                                width: '200px', height: '200px',
                                borderRadius: '50%', overflow: 'hidden',
                                border: '3px solid rgba(254,79,107,0.6)',
                                animation: 'o2o-glow-red 3s ease-in-out infinite',
                                background: 'linear-gradient(135deg, #2e1a1a, #2a0d1b)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {hasRemoteVideo ? (
                                    <video ref={remoteVideoRef} autoPlay playsInline
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : otherAvatarUrl ? (
                                    <img src={otherAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ fontSize: '80px', fontWeight: 700, color: '#f857a6' }}>
                                        {otherName.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>
                        <span style={{
                            color: '#f857a6', fontSize: '17px', fontWeight: 700,
                            textShadow: '0 0 20px rgba(254,79,107,0.4)',
                            letterSpacing: '0.5px',
                        }}>{otherName}</span>
                    </div>
                </div>

                {/* Controls bar */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '20px', marginTop: '32px',
                    animation: 'o2o-slide-up 0.8s ease',
                }}>
                    {/* Camera toggle */}
                    <button className="o2o-btn" onClick={onToggleCamera} title={isCameraOn ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
                        style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            background: isCameraOn
                                ? 'linear-gradient(135deg, rgba(79,172,254,0.3), rgba(0,242,254,0.2))'
                                : 'rgba(255,255,255,0.06)',
                            color: isCameraOn ? '#4facfe' : 'rgba(255,255,255,0.35)',
                            fontSize: '22px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.25s ease',
                            border: isCameraOn ? '1px solid rgba(79,172,254,0.3)' : '1px solid rgba(255,255,255,0.08)',
                        }}>
                        📷
                    </button>

                    {/* Mic toggle */}
                    <button className="o2o-btn" onClick={handleMicToggle} title={isMicOn ? t.turnOffMic : t.turnOnMic}
                        style={{
                            width: '56px', height: '56px', borderRadius: '50%',
                            background: isMicOn
                                ? 'linear-gradient(135deg, rgba(0,184,148,0.3), rgba(0,206,201,0.2))'
                                : 'rgba(255,255,255,0.06)',
                            color: isMicOn ? '#00b894' : 'rgba(255,255,255,0.35)',
                            fontSize: '22px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.25s ease',
                            border: isMicOn ? '1px solid rgba(0,184,148,0.3)' : '1px solid rgba(255,255,255,0.08)',
                        }}>
                        🎤
                    </button>

                    {/* Hang up */}
                    <button className="o2o-btn" onClick={onHangUp} title="Görüşmeyi Bitir"
                        style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            border: '1px solid rgba(231,76,60,0.3)',
                            background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                            color: '#fff', fontSize: '26px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 25px rgba(231, 76, 60, 0.4)',
                            transition: 'all 0.25s ease',
                        }}>
                        📞
                    </button>
                </div>
            </div>

            {/* ═══ CHAT AREA ═══ */}
            <div style={{
                height: '220px', minHeight: '180px',
                display: 'flex', flexDirection: 'column',
                background: 'rgba(0,0,0,0.6)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
            }}>
                {/* Messages */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '12px 16px',
                    display: 'flex', flexDirection: 'column', gap: '4px',
                }}>
                    {messages.length === 0 && (
                        <div style={{
                            color: 'rgba(255,255,255,0.2)', fontSize: '13px',
                            textAlign: 'center', marginTop: '30px',
                            fontStyle: 'italic',
                        }}>
                            💬 Mesajlaşma başlatıldı...
                        </div>
                    )}
                    {messages.map((msg: any, i: number) => {
                        // Backend sends: sender (userId), senderName, senderAvatar
                        // Also check msg.userId for backward compatibility
                        const isMe = (msg.sender || msg.userId) === currentUser?.userId;
                        return (
                            <div key={i} className="o2o-msg" style={{
                                display: 'flex', alignItems: 'flex-start', gap: '8px',
                                padding: '5px 10px', borderRadius: '6px',
                                transition: 'background 0.15s ease',
                            }}>
                                <span style={{
                                    color: isMe ? '#4facfe' : '#f857a6',
                                    fontSize: '13px', fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    minWidth: 'fit-content',
                                }}>
                                    {msg.senderName || msg.displayName || (isMe ? myName : otherName)}:
                                </span>
                                <span style={{
                                    color: 'rgba(255,255,255,0.85)',
                                    fontSize: '13px', lineHeight: '1.5',
                                    wordBreak: 'break-word',
                                }}>
                                    {msg.text || msg.content}
                                </span>
                            </div>
                        );
                    })}
                    <div ref={chatEndRef} />
                </div>

                {/* Input bar */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 16px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(0,0,0,0.4)',
                }}>
                    <input
                        className="o2o-input"
                        value={msgInput}
                        onChange={e => setMsgInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                        placeholder={t.typeMessage}
                        style={{
                            flex: 1, background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '24px', padding: '11px 18px',
                            color: '#fff', fontSize: '14px', outline: 'none',
                            transition: 'all 0.2s ease',
                        }}
                    />
                    <button onClick={handleSend}
                        className="o2o-btn"
                        style={{
                            width: '42px', height: '42px', borderRadius: '50%', border: 'none',
                            background: 'linear-gradient(135deg, #4facfe, #00f2fe)',
                            color: '#fff', fontSize: '16px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.25s ease',
                            boxShadow: '0 2px 12px rgba(79,172,254,0.3)',
                        }}>
                        ➤
                    </button>
                </div>
            </div>
        </div>
    );
}
