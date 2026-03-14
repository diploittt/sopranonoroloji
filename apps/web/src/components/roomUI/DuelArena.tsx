"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import type { Socket } from 'socket.io-client';

// ─── Types ─────────────────────────────────────────────────
interface DuelData {
    duelId: string;
    challengerId: string;
    challengerName: string;
    challengerAvatar?: string;
    opponentId: string;
    opponentName: string;
    opponentAvatar?: string;
    duration: number; // seconds
}

interface DuelReactions {
    [userId: string]: { fallacy: number; logical: number; derailed: number };
}

interface DuelResultData {
    duelId: string;
    result: 'CHALLENGER_WIN' | 'OPPONENT_WIN' | 'DRAW';
    winnerId: string | null;
    winnerName: string | null;
    loserId?: string | null;
    loserName?: string | null;
    challengerId: string;
    challengerName: string;
    challengerVotes: number;
    opponentId: string;
    opponentName: string;
    opponentVotes: number;
    reactions: DuelReactions;
    totalReactions: number;
    forfeit?: boolean;
    forfeitReason?: string;
}

type DuelPhase = 'idle' | 'challenge-pending' | 'challenge-sent' | 'active' | 'voting' | 'result';

interface Props {
    socket: Socket | null;
    currentUserId: string;
    roomSlug?: string;
}

// ─── Helpers ─────────────────────────────────────────────────
function generateSparkles(count: number) {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
        size: 2 + Math.random() * 3,
        delay: Math.random() * 3,
        dur: 1.5 + Math.random() * 2,
        color: ['#c8962e', '#e8b84a', '#7b9fef', '#38bdf8', '#fff'][Math.floor(Math.random() * 5)],
    }));
}

// ─── Component ──────────────────────────────────────────────
export default function DuelArena({ socket, currentUserId, roomSlug }: Props) {
    const [phase, setPhase] = useState<DuelPhase>('idle');
    const [duelData, setDuelData] = useState<DuelData | null>(null);
    const [remaining, setRemaining] = useState(0);
    const [reactions, setReactions] = useState<DuelReactions>({});
    const [challengerVotes, setChallengerVotes] = useState(0);
    const [opponentVotes, setOpponentVotes] = useState(0);
    const [hasVoted, setHasVoted] = useState(false);
    const [result, setResult] = useState<DuelResultData | null>(null);
    const [votingRemaining, setVotingRemaining] = useState(15);
    const [challengeFrom, setChallengeFrom] = useState<{ duelId: string; challengerName: string; challengerAvatar?: string } | null>(null);
    const votingTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
    const sparkles = useMemo(() => generateSparkles(8), []);

    // ─── Socket listeners ───
    useEffect(() => {
        if (!socket) return;

        setPhase('idle');
        setDuelData(null);
        setRemaining(0);
        setReactions({});
        setChallengerVotes(0);
        setOpponentVotes(0);
        setHasVoted(false);
        setResult(null);
        setChallengeFrom(null);
        setVotingRemaining(15);
        if (votingTimerRef.current) clearInterval(votingTimerRef.current);

        const onChallengeReceived = (data: { duelId: string; challengerId: string; challengerName: string; challengerAvatar?: string }) => {
            setChallengeFrom({ duelId: data.duelId, challengerName: data.challengerName, challengerAvatar: data.challengerAvatar });
            setPhase('challenge-pending');
        };

        const onStarted = (data: DuelData) => {
            setDuelData(data);
            setRemaining(data.duration);
            setReactions({
                [data.challengerId]: { fallacy: 0, logical: 0, derailed: 0 },
                [data.opponentId]: { fallacy: 0, logical: 0, derailed: 0 },
            });
            setChallengerVotes(0);
            setOpponentVotes(0);
            setHasVoted(false);
            setResult(null);
            setChallengeFrom(null);
            setPhase('active');
        };

        const onTick = (data: { remaining: number }) => setRemaining(data.remaining);
        const onReactionUpdate = (data: { reactions: DuelReactions }) => setReactions(data.reactions);

        const onVotingPhase = (data: any) => {
            setPhase('voting');
            setReactions(data.reactions);
            setVotingRemaining(data.votingDuration || 15);
            if (votingTimerRef.current) clearInterval(votingTimerRef.current);
            let vr = data.votingDuration || 15;
            votingTimerRef.current = setInterval(() => {
                vr--;
                setVotingRemaining(vr);
                if (vr <= 0 && votingTimerRef.current) clearInterval(votingTimerRef.current);
            }, 1000);
        };

        const onVoteUpdate = (data: { challengerVotes: number; opponentVotes: number }) => {
            setChallengerVotes(data.challengerVotes);
            setOpponentVotes(data.opponentVotes);
        };

        const onResult = (data: DuelResultData) => {
            setResult(data);
            setChallengerVotes(data.challengerVotes);
            setOpponentVotes(data.opponentVotes);
            setPhase('result');
            if (votingTimerRef.current) clearInterval(votingTimerRef.current);
            setTimeout(() => {
                setPhase('idle');
                setDuelData(null);
                setResult(null);
            }, 10_000);
        };

        const onRejected = (data?: { opponentName?: string }) => {
            setChallengeFrom(null);
            setPhase('idle');
            try {
                const rejName = data?.opponentName || 'Rakip';
                window.dispatchEvent(new CustomEvent('soprano:duel-rejected', { detail: { opponentName: rejName } }));
            } catch { }
        };

        const onCancelled = () => { setPhase('idle'); setDuelData(null); setChallengeFrom(null); };
        const onExpired = () => { setChallengeFrom(null); setPhase('idle'); };

        socket.on('duel:challenge-received', onChallengeReceived);
        socket.on('duel:started', onStarted);
        socket.on('duel:tick', onTick);
        socket.on('duel:reaction-update', onReactionUpdate);
        socket.on('duel:voting-phase', onVotingPhase);
        socket.on('duel:vote-update', onVoteUpdate);
        socket.on('duel:result', onResult);
        socket.on('duel:cancelled', onCancelled);
        socket.on('duel:challenge-expired', onExpired);
        socket.on('duel:challenge-rejected', onRejected);
        socket.on('duel:rejected', onRejected);

        return () => {
            socket.off('duel:challenge-received', onChallengeReceived);
            socket.off('duel:started', onStarted);
            socket.off('duel:tick', onTick);
            socket.off('duel:reaction-update', onReactionUpdate);
            socket.off('duel:voting-phase', onVotingPhase);
            socket.off('duel:vote-update', onVoteUpdate);
            socket.off('duel:result', onResult);
            socket.off('duel:cancelled', onCancelled);
            socket.off('duel:challenge-expired', onExpired);
            socket.off('duel:challenge-rejected', onRejected);
            socket.off('duel:rejected', onRejected);
            if (votingTimerRef.current) clearInterval(votingTimerRef.current);
        };
    }, [socket, roomSlug]);

    // ─── Helpers ───
    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const isParticipant = duelData && (currentUserId === duelData.challengerId || currentUserId === duelData.opponentId);

    const sendReaction = (type: 'fallacy' | 'logical' | 'derailed', targetId: string) => {
        socket?.emit('duel:reaction', { type, targetId });
    };

    const sendVote = (candidateId: string) => {
        if (hasVoted) return;
        socket?.emit('duel:vote', { candidateId });
        setHasVoted(true);
    };

    // ═══════════════════════════════════════════════════════════════
    // ─── CHALLENGE MODAL ───
    // ═══════════════════════════════════════════════════════════════
    if (phase === 'challenge-pending' && challengeFrom) {
        return (
            <>
                <style>{KEYFRAMES}</style>
                {/* Backdrop */}
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.65)', zIndex: 9998,
                        animation: 'duelFadeIn 0.3s ease',
                    }}
                    onClick={() => { socket?.emit('duel:reject'); setChallengeFrom(null); setPhase('idle'); }}
                />
                {/* Modal */}
                <div style={{
                    position: 'fixed', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(8, 12, 21, 0.92)',
                    border: '1px solid rgba(200,150,46,0.3)',
                    borderRadius: 16,
                    padding: '24px 28px',
                    zIndex: 9999,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(200,150,46,0.1)',
                    textAlign: 'center',
                    minWidth: 300,
                    maxWidth: 360,
                    animation: 'duelModalEnter 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                    {/* Gold glow top */}
                    <div style={{
                        position: 'absolute', top: -1, left: '10%', right: '10%', height: 1,
                        background: 'linear-gradient(90deg, transparent, rgba(200,150,46,0.6), transparent)',
                    }} />

                    <div style={{ fontSize: 40, marginBottom: 10, filter: 'drop-shadow(0 0 16px rgba(200,150,46,0.4))' }}>⚔️</div>
                    <h3 style={{ color: '#e8b84a', fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: '0.05em' }}>
                        DÜELLO DAVETİ
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
                        <strong style={{ color: '#7b9fef' }}>{challengeFrom.challengerName}</strong> seni düelloya davet ediyor!
                    </p>

                    {/* Rules box */}
                    <div style={{
                        background: 'rgba(200,150,46,0.06)', border: '1px solid rgba(200,150,46,0.12)',
                        borderRadius: 10, padding: '10px 12px', marginBottom: 16, textAlign: 'left',
                    }}>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0, lineHeight: 1.7 }}>
                            ⚔️ <strong style={{ color: '#e2e8f0' }}>Nasıl Çalışır:</strong><br />
                            • <strong>3 dakika</strong> düello arenası açılır<br />
                            • Mikrofon <strong>kilitlenir</strong><br />
                            • Dinleyiciler reaksiyon + oy kullanır<br />
                            • Kazanan <strong style={{ color: '#e8b84a' }}>+10</strong>, kaybeden <strong style={{ color: '#ef4444' }}>-10</strong> puan
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            onClick={() => socket?.emit('duel:accept')}
                            style={{
                                flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff',
                                fontWeight: 700, fontSize: 13, transition: 'transform 0.2s',
                                boxShadow: '0 4px 16px rgba(34,197,94,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                            }}
                        >
                            ✅ Kabul Et
                        </button>
                        <button
                            onClick={() => { socket?.emit('duel:reject'); setChallengeFrom(null); setPhase('idle'); }}
                            style={{
                                flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
                                fontWeight: 700, fontSize: 13, transition: 'transform 0.2s',
                                boxShadow: '0 4px 16px rgba(239,68,68,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                            }}
                        >
                            ❌ Reddet
                        </button>
                    </div>
                </div>
            </>
        );
    }

    // ─── Nothing to show ───
    if (phase === 'idle' || !duelData) return null;

    const progressPercent = duelData.duration > 0 ? (remaining / duelData.duration) * 100 : 0;
    const totalVotes = challengerVotes + opponentVotes;
    const cPct = totalVotes > 0 ? (challengerVotes / totalVotes) * 100 : 50;
    const oPct = 100 - cPct;

    // ═══════════════════════════════════════════════════════════════
    // ─── MAIN ARENA CARD ───
    // ═══════════════════════════════════════════════════════════════
    return (
        <>
            <style>{KEYFRAMES}</style>
            <div style={{
                position: 'relative',
                background: 'rgba(8, 12, 21, 0.75)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                padding: '0',
                marginBottom: 8,
                overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                animation: 'duelFadeIn 0.4s ease',
            }}>

                {/* ─── Gold accent line top ─── */}
                <div style={{
                    height: 2,
                    background: 'linear-gradient(90deg, transparent, #c8962e, #e8b84a, #c8962e, transparent)',
                    animation: 'duelGoldShimmer 3s ease-in-out infinite',
                }} />

                {/* ─── Sparkle particles ─── */}
                {sparkles.map(s => (
                    <div key={s.id} style={{
                        position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
                        width: s.size, height: s.size, borderRadius: '50%',
                        background: s.color, boxShadow: `0 0 ${s.size * 3}px ${s.color}`,
                        animation: `duelSparkle ${s.dur}s ${s.delay}s ease-in-out infinite`,
                        pointerEvents: 'none', zIndex: 0,
                    }} />
                ))}

                {/* ─── Header ─── */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 14px',
                    background: 'linear-gradient(135deg, rgba(200,150,46,0.06), rgba(123,159,239,0.04))',
                    borderBottom: '1px solid rgba(200,150,46,0.08)',
                    position: 'relative', zIndex: 1,
                }}>
                    <span style={{
                        fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        background: 'linear-gradient(90deg, #c8962e, #e8b84a)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        ⚔️ Eristik Düello
                    </span>
                    {phase === 'active' && (
                        <span style={{
                            fontSize: 16, fontWeight: 900, fontFamily: 'monospace',
                            textShadow: remaining <= 30 ? '0 0 12px rgba(239,68,68,0.6)' : '0 0 8px rgba(200,150,46,0.4)',
                            animation: remaining <= 10 ? 'duelTimerPulse 0.5s ease-in-out infinite' : 'none',
                            color: remaining <= 30 ? '#f87171' : '#fff',
                        }}>
                            {formatTime(remaining)}
                        </span>
                    )}
                    {phase === 'voting' && (
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#e8b84a', letterSpacing: '0.05em' }}>
                            🗳️ OYLAMA ({votingRemaining}s)
                        </span>
                    )}
                    {phase === 'result' && (
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#22c55e', letterSpacing: '0.05em' }}>
                            ✨ SONUÇ
                        </span>
                    )}
                </div>

                {/* ─── VS Display (Participants) ─── */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 0, padding: '12px 8px 8px', position: 'relative', zIndex: 1,
                }}>
                    {/* Challenger */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: '50%',
                            border: '2px solid rgba(123,159,239,0.5)',
                            overflow: 'hidden', position: 'relative',
                            boxShadow: '0 0 16px rgba(123,159,239,0.2), inset 0 0 8px rgba(123,159,239,0.1)',
                            animation: phase === 'active' ? 'duelAvatarGlow 2s ease-in-out infinite' : 'none',
                        }}>
                            <img src={duelData.challengerAvatar || `/avatars/neutral_1.png`} alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{
                            fontSize: 11, fontWeight: 700, color: '#7b9fef',
                            maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            textShadow: '0 0 8px rgba(123,159,239,0.3)',
                        }}>
                            {duelData.challengerName}
                        </span>
                        {(phase === 'voting' || phase === 'result') && (
                            <div style={{
                                fontSize: 18, fontWeight: 900, color: '#7b9fef',
                                textShadow: '0 0 12px rgba(123,159,239,0.5)',
                                animation: 'duelScoreIn 0.4s ease-out',
                            }}>
                                {challengerVotes}
                            </div>
                        )}
                    </div>

                    {/* VS Badge */}
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(200,150,46,0.15), rgba(200,150,46,0.05))',
                        border: '1px solid rgba(200,150,46,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(200,150,46,0.15)',
                        animation: 'duelVsPulse 2s ease-in-out infinite',
                        flexShrink: 0,
                    }}>
                        <span style={{ fontSize: 14, filter: 'drop-shadow(0 0 6px rgba(200,150,46,0.5))' }}>⚔️</span>
                    </div>

                    {/* Opponent */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: '50%',
                            border: '2px solid rgba(200,150,46,0.5)',
                            overflow: 'hidden', position: 'relative',
                            boxShadow: '0 0 16px rgba(200,150,46,0.2), inset 0 0 8px rgba(200,150,46,0.1)',
                            animation: phase === 'active' ? 'duelAvatarGlow2 2s ease-in-out infinite' : 'none',
                        }}>
                            <img src={duelData.opponentAvatar || `/avatars/neutral_1.png`} alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{
                            fontSize: 11, fontWeight: 700, color: '#e8b84a',
                            maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            textShadow: '0 0 8px rgba(200,150,46,0.3)',
                        }}>
                            {duelData.opponentName}
                        </span>
                        {(phase === 'voting' || phase === 'result') && (
                            <div style={{
                                fontSize: 18, fontWeight: 900, color: '#e8b84a',
                                textShadow: '0 0 12px rgba(200,150,46,0.5)',
                                animation: 'duelScoreIn 0.4s ease-out',
                            }}>
                                {opponentVotes}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── Progress Bar (active) ─── */}
                {phase === 'active' && (
                    <div style={{
                        margin: '0 14px 6px', height: 3, borderRadius: 4,
                        background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                        position: 'relative', zIndex: 1,
                    }}>
                        <div style={{
                            height: '100%', borderRadius: 4,
                            width: `${progressPercent}%`,
                            background: remaining <= 30
                                ? 'linear-gradient(90deg, #ef4444, #f97316)'
                                : 'linear-gradient(90deg, #7b9fef, #38bdf8, #c8962e)',
                            boxShadow: remaining <= 30
                                ? '0 0 8px rgba(239,68,68,0.5)'
                                : '0 0 6px rgba(200,150,46,0.3)',
                            transition: 'width 1s linear',
                        }} />
                    </div>
                )}

                {/* ─── Vote Bar (voting/result) ─── */}
                {(phase === 'voting' || phase === 'result') && totalVotes > 0 && (
                    <div style={{
                        margin: '0 14px 6px', height: 4, borderRadius: 4,
                        background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                        display: 'flex', position: 'relative', zIndex: 1,
                    }}>
                        <div style={{
                            height: '100%', width: `${cPct}%`,
                            background: 'linear-gradient(90deg, #3b82f6, #7b9fef)',
                            boxShadow: '0 0 6px rgba(59,130,246,0.4)',
                            transition: 'width 0.5s ease',
                        }} />
                        <div style={{
                            height: '100%', width: `${oPct}%`,
                            background: 'linear-gradient(90deg, #c8962e, #e8b84a)',
                            boxShadow: '0 0 6px rgba(200,150,46,0.4)',
                            transition: 'width 0.5s ease',
                        }} />
                    </div>
                )}

                {/* ─── Info / Interaction Zone ─── */}
                <div style={{ padding: '4px 14px 10px', position: 'relative', zIndex: 1 }}>

                    {/* Active: Info + Pes Et / Reactions */}
                    {phase === 'active' && isParticipant && (
                        <div style={{
                            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)',
                            borderRadius: 8, padding: '6px 10px', marginBottom: 6,
                        }}>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                                ⚔️ <strong style={{ color: '#22c55e' }}>Düello devam ediyor!</strong> Mikrofon kilitli.
                            </p>
                            <button
                                onClick={() => socket?.emit('duel:forfeit')}
                                style={{
                                    marginTop: 6, padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
                                    fontWeight: 700, fontSize: 11, opacity: 0.85, transition: 'opacity 0.2s',
                                    boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                onMouseLeave={e => (e.currentTarget.style.opacity = '0.85')}
                            >
                                🏳️ Pes Et
                            </button>
                        </div>
                    )}

                    {phase === 'active' && !isParticipant && (
                        <>
                            <div style={{
                                background: 'rgba(123,159,239,0.06)', border: '1px solid rgba(123,159,239,0.1)',
                                borderRadius: 8, padding: '5px 10px', marginBottom: 6,
                            }}>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                                    👂 <strong style={{ color: '#7b9fef' }}>Dinleyicisin</strong> — reaksiyon gönder, sonra oy kullan
                                </p>
                            </div>
                            {/* Reactions */}
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                {[duelData.challengerId, duelData.opponentId].map(targetId => {
                                    const tName = targetId === duelData.challengerId ? duelData.challengerName : duelData.opponentName;
                                    const tReact = reactions[targetId] || { fallacy: 0, logical: 0, derailed: 0 };
                                    const tColor = targetId === duelData.challengerId ? '#7b9fef' : '#e8b84a';
                                    return (
                                        <div key={targetId} style={{ flex: 1 }}>
                                            <div style={{
                                                fontSize: 9, color: tColor, textAlign: 'center',
                                                marginBottom: 3, fontWeight: 700, opacity: 0.7,
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>{tName}</div>
                                            <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                                                {[
                                                    { type: 'fallacy' as const, emoji: '🎭', color: '#ef4444' },
                                                    { type: 'logical' as const, emoji: '🧠', color: '#22c55e' },
                                                    { type: 'derailed' as const, emoji: '🔀', color: '#f59e0b' },
                                                ].map(btn => (
                                                    <button
                                                        key={btn.type}
                                                        onClick={() => sendReaction(btn.type, targetId)}
                                                        style={{
                                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                            gap: 1, padding: '4px 6px', borderRadius: 8,
                                                            border: `1px solid ${btn.color}20`,
                                                            background: 'rgba(255,255,255,0.02)',
                                                            cursor: 'pointer', transition: 'all 0.15s',
                                                            fontSize: 10, fontWeight: 600, color: '#e2e8f0', minWidth: 40,
                                                        }}
                                                        onMouseOver={e => { e.currentTarget.style.background = `${btn.color}15`; }}
                                                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                                                    >
                                                        <span style={{ fontSize: 14 }}>{btn.emoji}</span>
                                                        <span style={{ fontSize: 9, opacity: 0.5 }}>{tReact[btn.type]}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* Voting */}
                    {phase === 'voting' && (
                        <>
                            {isParticipant ? (
                                <div style={{ textAlign: 'center', padding: '6px 0' }}>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Dinleyiciler oy kullanıyor...</p>
                                </div>
                            ) : hasVoted ? (
                                <div style={{ textAlign: 'center', padding: '6px 0' }}>
                                    <p style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>✅ Oyunuz kaydedildi!</p>
                                </div>
                            ) : (
                                <div>
                                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 6, fontWeight: 600 }}>
                                        🗳️ Kimin daha iyi tartıştığını oyla!
                                    </p>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={() => sendVote(duelData.challengerId)}
                                            style={{
                                                flex: 1, padding: '8px 10px', borderRadius: 10, border: 'none',
                                                cursor: 'pointer', fontWeight: 700, fontSize: 11, color: '#fff',
                                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                boxShadow: '0 4px 12px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                                                transition: 'transform 0.15s',
                                            }}
                                            onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                                            onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                        >
                                            {duelData.challengerName}
                                        </button>
                                        <button
                                            onClick={() => sendVote(duelData.opponentId)}
                                            style={{
                                                flex: 1, padding: '8px 10px', borderRadius: 10, border: 'none',
                                                cursor: 'pointer', fontWeight: 700, fontSize: 11, color: '#fff',
                                                background: 'linear-gradient(135deg, #c8962e, #a67b1e)',
                                                boxShadow: '0 4px 12px rgba(200,150,46,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                                                transition: 'transform 0.15s',
                                            }}
                                            onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
                                            onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                                        >
                                            {duelData.opponentName}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Result */}
                    {phase === 'result' && result && (
                        <div style={{ textAlign: 'center', padding: '4px 0', animation: 'duelResultIn 0.5s ease-out' }}>
                            {/* Confetti */}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                                {['🎉', '🏆', '⚔️', '🎊', '✨', '🔥'].map((c, i) => (
                                    <span key={i} style={{
                                        fontSize: 18,
                                        animation: `duelConfetti 2s ease-out ${i * 0.12}s infinite`,
                                    }}>{c}</span>
                                ))}
                            </div>

                            {result.result === 'DRAW' ? (
                                <>
                                    <div style={{
                                        fontSize: 22, fontWeight: 900, color: '#e8b84a', marginBottom: 2,
                                        textShadow: '0 0 16px rgba(200,150,46,0.5)',
                                    }}>
                                        🤝 BERABERE
                                    </div>
                                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                                        {result.challengerVotes} — {result.opponentVotes}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div style={{
                                        fontSize: 20, fontWeight: 900, color: '#22c55e', marginBottom: 2,
                                        textShadow: '0 0 16px rgba(34,197,94,0.5)',
                                    }}>
                                        🏆 {result.winnerName} KAZANDI!
                                    </div>
                                    {result.forfeit ? (
                                        <p style={{ color: '#f87171', fontSize: 11, fontWeight: 600 }}>
                                            🏳️ {result.forfeitReason || 'Rakip pes etti'}
                                        </p>
                                    ) : (
                                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                                            {result.challengerName} {result.challengerVotes} — {result.opponentVotes} {result.opponentName}
                                        </p>
                                    )}
                                    <p style={{ color: '#e8b84a', fontSize: 10, marginTop: 2 }}>🏆 +10 puan | 💀 -10 puan</p>
                                </>
                            )}
                        </div>
                    )}

                </div>

                {/* ─── Gold accent line bottom ─── */}
                <div style={{
                    height: 1,
                    background: 'linear-gradient(90deg, transparent, rgba(200,150,46,0.2), transparent)',
                }} />
            </div>
        </>
    );
}

// ═══════════════════════════════════════════════════════════════
const KEYFRAMES = `
@keyframes duelFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes duelModalEnter {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
@keyframes duelGoldShimmer {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@keyframes duelSparkle {
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 0.8; transform: scale(1.5); }
}
@keyframes duelVsPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(200,150,46,0.15); }
  50% { transform: scale(1.08); box-shadow: 0 0 28px rgba(200,150,46,0.25); }
}
@keyframes duelAvatarGlow {
  0%, 100% { box-shadow: 0 0 16px rgba(123,159,239,0.2), inset 0 0 8px rgba(123,159,239,0.1); }
  50% { box-shadow: 0 0 24px rgba(123,159,239,0.35), inset 0 0 12px rgba(123,159,239,0.15); }
}
@keyframes duelAvatarGlow2 {
  0%, 100% { box-shadow: 0 0 16px rgba(200,150,46,0.2), inset 0 0 8px rgba(200,150,46,0.1); }
  50% { box-shadow: 0 0 24px rgba(200,150,46,0.35), inset 0 0 12px rgba(200,150,46,0.15); }
}
@keyframes duelTimerPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes duelScoreIn {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes duelConfetti {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-20px) rotate(360deg); opacity: 0; }
}
@keyframes duelResultIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
`;
