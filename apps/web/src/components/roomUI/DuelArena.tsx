"use client";

import { useState, useEffect, useRef } from 'react';
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
    roomSlug?: string; // Used to reset duel state on room switch
}

// ─── Styles (Premium Blue/Gold Theme) ───────────────────────────────
const ARENA_STYLES = {
    container: {
        position: 'relative' as const,
        background: 'linear-gradient(135deg, rgba(10,15,30,0.97), rgba(15,22,40,0.97))',
        border: '1px solid rgba(200,150,46,0.18)',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 8,
        overflow: 'hidden' as const,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04), 0 0 20px rgba(200,150,46,0.06)',
    },
    glowOverlay: {
        position: 'absolute' as const,
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(200,150,46,0.08) 0%, transparent 70%)',
        pointerEvents: 'none' as const,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        position: 'relative' as const,
        zIndex: 1,
    },
    title: {
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
        background: 'linear-gradient(90deg, #c8962e, #e8b84a)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    timer: {
        fontSize: 18,
        fontWeight: 900,
        fontFamily: 'monospace',
        color: '#fff',
        textShadow: '0 0 12px rgba(200,150,46,0.5)',
    },
    vsContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: '6px 0',
        position: 'relative' as const,
        zIndex: 1,
    },
    participant: {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: 5,
        flex: 1,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: '50%',
        border: '2px solid rgba(123,159,239,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
        background: 'linear-gradient(135deg, rgba(123,159,239,0.12), rgba(56,189,248,0.08))',
        boxShadow: '0 0 12px rgba(123,159,239,0.15)',
    },
    name: {
        fontSize: 12,
        fontWeight: 700,
        color: '#e2e8f0',
        textAlign: 'center' as const,
        maxWidth: 90,
        overflow: 'hidden' as const,
        textOverflow: 'ellipsis' as const,
        whiteSpace: 'nowrap' as const,
    },
    vs: {
        fontSize: 20,
        fontWeight: 900,
        color: '#c8962e',
        textShadow: '0 0 16px rgba(200,150,46,0.4)',
        animation: 'duelPulse 1.5s ease-in-out infinite',
    },
    progressBar: {
        width: '100%',
        height: 3,
        borderRadius: 4,
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden' as const,
        margin: '6px 0',
        position: 'relative' as const,
        zIndex: 1,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
        transition: 'width 1s linear',
        background: 'linear-gradient(90deg, #7b9fef, #38bdf8, #c8962e)',
    },
    reactionsContainer: {
        display: 'flex',
        gap: 6,
        justifyContent: 'center',
        marginTop: 6,
        position: 'relative' as const,
        zIndex: 1,
    },
    reactionBtn: (color: string, active: boolean) => ({
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: 2,
        padding: '6px 10px',
        borderRadius: 10,
        border: `1px solid ${color}30`,
        background: active ? `${color}15` : 'rgba(255,255,255,0.03)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontSize: 11,
        fontWeight: 600,
        color: '#e2e8f0',
        minWidth: 64,
    }),
    reactionEmoji: {
        fontSize: 16,
    },
    reactionCount: {
        fontSize: 10,
        opacity: 0.5,
    },
    voteBtn: (color: string) => ({
        flex: 1,
        padding: '10px 14px',
        borderRadius: 10,
        border: 'none',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 12,
        color: '#fff',
        background: `linear-gradient(135deg, ${color}, ${color}99)`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: `0 4px 16px ${color}30, inset 0 1px 0 rgba(255,255,255,0.1)`,
        textAlign: 'center' as const,
    }),
    resultBanner: (isWin: boolean) => ({
        textAlign: 'center' as const,
        padding: '12px 0',
        position: 'relative' as const,
        zIndex: 1,
    }),
    challengeModal: {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'linear-gradient(135deg, rgba(10,15,30,0.98), rgba(15,22,40,0.98))',
        border: '1px solid rgba(200,150,46,0.25)',
        borderRadius: 18,
        padding: 28,
        zIndex: 9999,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 30px rgba(200,150,46,0.08)',
        textAlign: 'center' as const,
        minWidth: 320,
    },
    backdrop: {
        position: 'fixed' as const,
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 9998,
    },
};

const CSS_ANIMATIONS = `
@keyframes duelPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.85; }
}
@keyframes confettiDrop {
  0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(40px) rotate(360deg); opacity: 0; }
}
@keyframes slideInUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
`;

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

    // ─── Socket listeners ───
    useEffect(() => {
        if (!socket) return;

        // Reset all duel state when socket or roomSlug changes (room switch)
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

        // Meydan okuma alındı (hedef kullanıcıya)
        const onChallengeReceived = (data: { duelId: string; challengerId: string; challengerName: string; challengerAvatar?: string }) => {
            setChallengeFrom({ duelId: data.duelId, challengerName: data.challengerName, challengerAvatar: data.challengerAvatar });
            setPhase('challenge-pending');
        };

        // Düello başladı (odadaki herkese)
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

        // Geri sayım tick
        const onTick = (data: { remaining: number }) => {
            setRemaining(data.remaining);
        };

        // Reaksiyon güncelleme
        const onReactionUpdate = (data: { reactions: DuelReactions }) => {
            setReactions(data.reactions);
        };

        // Oylama fazı
        const onVotingPhase = (data: any) => {
            setPhase('voting');
            setReactions(data.reactions);
            setVotingRemaining(data.votingDuration || 15);
            // Oylama geri sayımı
            if (votingTimerRef.current) clearInterval(votingTimerRef.current);
            let vr = data.votingDuration || 15;
            votingTimerRef.current = setInterval(() => {
                vr--;
                setVotingRemaining(vr);
                if (vr <= 0 && votingTimerRef.current) clearInterval(votingTimerRef.current);
            }, 1000);
        };

        // Oy güncelleme
        const onVoteUpdate = (data: { challengerVotes: number; opponentVotes: number }) => {
            setChallengerVotes(data.challengerVotes);
            setOpponentVotes(data.opponentVotes);
        };

        // Sonuç
        const onResult = (data: DuelResultData) => {
            setResult(data);
            setChallengerVotes(data.challengerVotes);
            setOpponentVotes(data.opponentVotes);
            setPhase('result');
            if (votingTimerRef.current) clearInterval(votingTimerRef.current);
            // 10 saniye sonra temizle
            setTimeout(() => {
                setPhase('idle');
                setDuelData(null);
                setResult(null);
            }, 10_000);
        };

        // Düello reddedildi — challenger'a bildirim
        const onRejected = (data?: { opponentName?: string }) => {
            console.log('[DUEL] Challenge rejected by opponent:', data?.opponentName);
            setChallengeFrom(null);
            setPhase('idle');
            // Browser notification
            try {
                const rejName = data?.opponentName || 'Rakip';
                // Dispatch a custom event so the room page can show a toast
                window.dispatchEvent(new CustomEvent('soprano:duel-rejected', { detail: { opponentName: rejName } }));
            } catch { }
        };

        // İptal / Timeout
        const onCancelled = () => {
            setPhase('idle');
            setDuelData(null);
            setChallengeFrom(null);
        };
        const onExpired = () => {
            setChallengeFrom(null);
            setPhase('idle');
        };

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
        socket.on('duel:rejected', onRejected); // fallback event name

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // ─── Challenge Modal ───
    if (phase === 'challenge-pending' && challengeFrom) {
        return (
            <>
                <style>{CSS_ANIMATIONS}</style>
                <div style={ARENA_STYLES.backdrop} onClick={() => { socket?.emit('duel:reject'); setChallengeFrom(null); setPhase('idle'); }} />
                <div style={ARENA_STYLES.challengeModal}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>⚔️</div>
                    <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Düello Daveti!</h3>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 12, lineHeight: 1.6 }}>
                    <strong style={{ color: '#c8962e' }}>{challengeFrom.challengerName}</strong> seni düelloya davet ediyor!
                    </p>
                    <div style={{
                        background: 'rgba(200,150,46,0.08)', border: '1px solid rgba(200,150,46,0.15)',
                        borderRadius: 10, padding: '10px 14px', marginBottom: 16, textAlign: 'left' as const,
                    }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, margin: 0, lineHeight: 1.7 }}>
                            ⚔️ <strong style={{ color: '#fff' }}>Nasıl Çalışır:</strong><br />
                            • Kabul edersen <strong>3 dakika boyunca</strong> düello arenası açılır<br />
                            • Düello süresince <strong>mikrofon kilitlenir</strong> (kimse kullanamaz)<br />
                            • Dinleyiciler reaksiyon gönderir ve oy kullanır<br />
                            • Kazanan <strong>+10 puan</strong> alır 🏆
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button
                            onClick={() => socket?.emit('duel:accept')}
                            style={{
                                flex: 1, padding: '12px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff',
                                fontWeight: 700, fontSize: 14, transition: 'transform 0.2s',
                            }}
                        >
                            ✅ Kabul Et
                        </button>
                        <button
                            onClick={() => { socket?.emit('duel:reject'); setChallengeFrom(null); setPhase('idle'); }}
                            style={{
                                flex: 1, padding: '12px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
                                fontWeight: 700, fontSize: 14, transition: 'transform 0.2s',
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

    // Info mesajı — katılımcılar ve izleyiciler için
    const renderInfoBanner = () => {
        if (phase !== 'active') return null;
        if (isParticipant) {
            return (
                <div style={{
                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
                    borderRadius: 8, padding: '6px 10px', margin: '6px 0',
                    position: 'relative' as const, zIndex: 1,
                }}>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                        ⚔️ <strong style={{ color: '#22c55e' }}>Düello devam ediyor!</strong> Mikrofon düello süresince kilitli. Dinleyiciler seni değerlendirecek ve oylama yapacak.
                    </p>
                    <button
                        onClick={() => {
                            console.log('[DUEL] Forfeit button clicked');
                            socket?.emit('duel:forfeit');
                        }}
                        style={{
                            marginTop: 8, padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff',
                            fontWeight: 700, fontSize: 12, transition: 'opacity 0.2s', opacity: 0.9,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.9')}
                    >
                        🏳️ Pes Et
                    </button>
                </div>
            );
        }
        return (
            <div style={{
                background: 'rgba(123,159,239,0.08)', border: '1px solid rgba(123,159,239,0.15)',
                borderRadius: 8, padding: '6px 10px', margin: '6px 0',
                position: 'relative' as const, zIndex: 1,
            }}>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
                    👂 <strong style={{ color: '#7b9fef' }}>Düello dinleyicisisin!</strong> Aşağıdaki butonlarla reaksiyon gönder (3sn bekleme süresi). Tartışma bitince oy kullanacaksın.
                </p>
            </div>
        );
    };

    // ─── Reaction buttons (for spectators during active phase) ───
    const renderReactionButtons = () => {
        if (isParticipant) return null;

        const buttons = [
            { type: 'fallacy' as const, emoji: '🎭', label: 'Safsata', color: '#ef4444' },
            { type: 'logical' as const, emoji: '🧠', label: 'Mantıklı', color: '#22c55e' },
            { type: 'derailed' as const, emoji: '🔀', label: 'Saptırdı', color: '#f59e0b' },
        ];

        return (
            <div style={ARENA_STYLES.reactionsContainer}>
                {[duelData.challengerId, duelData.opponentId].map(targetId => {
                    const targetName = targetId === duelData.challengerId ? duelData.challengerName : duelData.opponentName;
                    const targetReactions = reactions[targetId] || { fallacy: 0, logical: 0, derailed: 0 };
                    return (
                        <div key={targetId} style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 4, fontWeight: 600 }}>
                                {targetName}
                            </div>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                {buttons.map(btn => (
                                    <button
                                        key={btn.type}
                                        onClick={() => sendReaction(btn.type, targetId)}
                                        style={{
                                            ...ARENA_STYLES.reactionBtn(btn.color, false),
                                            padding: '6px 8px',
                                            minWidth: 56,
                                        }}
                                    >
                                        <span style={ARENA_STYLES.reactionEmoji}>{btn.emoji}</span>
                                        <span style={ARENA_STYLES.reactionCount}>{targetReactions[btn.type]}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ─── Voting UI ───
    const renderVoting = () => {
        if (isParticipant) {
            return (
                <div style={{ textAlign: 'center', padding: '16px 0', position: 'relative', zIndex: 1 }}>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Dinleyiciler oy kullanıyor...</p>
                    <p style={{ color: '#7b9fef', fontWeight: 700, fontSize: 18, marginTop: 8 }}>
                        {challengerVotes} — {opponentVotes}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>
                        ⏱ {votingRemaining}s
                    </p>
                </div>
            );
        }

        if (hasVoted) {
            return (
                <div style={{ textAlign: 'center', padding: '16px 0', position: 'relative', zIndex: 1 }}>
                    <p style={{ color: '#22c55e', fontSize: 14, fontWeight: 600 }}>✅ Oyunuz kaydedildi!</p>
                    <p style={{ color: '#7b9fef', fontWeight: 700, fontSize: 18, marginTop: 8 }}>
                        {challengerVotes} — {opponentVotes}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>
                        ⏱ {votingRemaining}s
                    </p>
                </div>
            );
        }

        return (
            <div style={{ position: 'relative', zIndex: 1 }}>
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 10, fontWeight: 600 }}>
                    🗳️ Kimin daha iyi tartıştığını oyla! ({votingRemaining}s)
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button onClick={() => sendVote(duelData.challengerId)} style={ARENA_STYLES.voteBtn('#3b82f6')}>
                        {duelData.challengerName}
                    </button>
                    <button onClick={() => sendVote(duelData.opponentId)} style={ARENA_STYLES.voteBtn('#c8962e')}>
                        {duelData.opponentName}
                    </button>
                </div>
            </div>
        );
    };

    // ─── Result UI ───
    const renderResult = () => {
        if (!result) return null;
        const confetti = ['🎉', '🏆', '⚔️', '🎊', '✨', '🔥'];
        return (
            <div style={{ ...ARENA_STYLES.resultBanner(true), animation: 'slideInUp 0.5s ease-out' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                    {confetti.map((c, i) => (
                        <span key={i} style={{ fontSize: 22, animation: `confettiDrop 2s ease-out ${i * 0.15}s infinite` }}>{c}</span>
                    ))}
                </div>
                {result.result === 'DRAW' ? (
                    <>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#f59e0b', marginBottom: 4 }}>🤝 BERABERE</div>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                            {result.challengerVotes} — {result.opponentVotes}
                        </p>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#22c55e', marginBottom: 4 }}>
                            🏆 {result.winnerName} KAZANDI!
                        </div>
                        {result.forfeit ? (
                            <>
                                <p style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
                                    🏳️ {result.loserName || result.forfeitReason || 'Rakip'} kaybetti! ({result.forfeitReason || 'pes etti'})
                                </p>
                            </>
                        ) : (
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                                {result.challengerName} {result.challengerVotes} — {result.opponentVotes} {result.opponentName}
                            </p>
                        )}
                        <p style={{ color: '#c8962e', fontSize: 12, marginTop: 4 }}>🏆 +10 puan | 💀 -10 puan</p>
                    </>
                )}
            </div>
        );
    };

    return (
        <>
            <style>{CSS_ANIMATIONS}</style>
            <div style={ARENA_STYLES.container}>
                <div style={ARENA_STYLES.glowOverlay} />

                {/* Header */}
                <div style={ARENA_STYLES.header}>
                    <span style={ARENA_STYLES.title}>⚔️ Eristik Düello</span>
                    {phase === 'active' && <span style={ARENA_STYLES.timer}>{formatTime(remaining)}</span>}
                    {phase === 'voting' && <span style={{ ...ARENA_STYLES.timer, color: '#c8962e' }}>🗳️ Oylama</span>}
                    {phase === 'result' && <span style={{ ...ARENA_STYLES.timer, color: '#22c55e' }}>Sonuç</span>}
                </div>

                {/* VS Display */}
                <div style={ARENA_STYLES.vsContainer}>
                    <div style={ARENA_STYLES.participant}>
                        <div style={ARENA_STYLES.avatar}>
                            <img src={duelData.challengerAvatar || `/avatars/neutral_1.png`} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        </div>
                        <span style={ARENA_STYLES.name}>{duelData.challengerName}</span>
                        {(phase === 'voting' || phase === 'result') && (
                            <span style={{ fontSize: 16, fontWeight: 900, color: '#3b82f6' }}>{challengerVotes}</span>
                        )}
                    </div>
                    <span style={ARENA_STYLES.vs}>⚔️</span>
                    <div style={ARENA_STYLES.participant}>
                        <div style={{ ...ARENA_STYLES.avatar, borderColor: 'rgba(200,150,46,0.4)' }}>
                            <img src={duelData.opponentAvatar || `/avatars/neutral_1.png`} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        </div>
                        <span style={ARENA_STYLES.name}>{duelData.opponentName}</span>
                        {(phase === 'voting' || phase === 'result') && (
                            <span style={{ fontSize: 16, fontWeight: 900, color: '#c8962e' }}>{opponentVotes}</span>
                        )}
                    </div>
                </div>

                {/* Info Banner */}
                {renderInfoBanner()}

                {/* Progress Bar (active phase) */}
                {phase === 'active' && (
                    <div style={ARENA_STYLES.progressBar}>
                        <div style={{ ...ARENA_STYLES.progressFill, width: `${progressPercent}%` }} />
                    </div>
                )}

                {/* Reactions (active phase, spectators only) */}
                {phase === 'active' && renderReactionButtons()}

                {/* Voting (voting phase) */}
                {phase === 'voting' && renderVoting()}

                {/* Result */}
                {phase === 'result' && renderResult()}
            </div>
        </>
    );
}
