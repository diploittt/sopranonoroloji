import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Modal,
} from 'react-native';
import { getSocket } from '@/services/socket';

// ─── Types ─────────────────────────────────────────────────
interface DuelData {
    duelId: string;
    challengerId: string;
    challengerName: string;
    challengerAvatar?: string;
    opponentId: string;
    opponentName: string;
    opponentAvatar?: string;
    duration: number;
}

interface DuelReactions {
    [userId: string]: { fallacy: number; logical: number; derailed: number };
}

interface DuelResultData {
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
    forfeit?: boolean;
    forfeitReason?: string;
}

type DuelPhase = 'idle' | 'challenge-pending' | 'active' | 'voting' | 'result';

interface Props {
    currentUserId: string;
    roomSlug?: string;
}

// ─── Reaction button configs ───
const REACTIONS = [
    { type: 'fallacy' as const, emoji: '🎭', label: 'Safsata', color: '#ef4444' },
    { type: 'logical' as const, emoji: '🧠', label: 'Mantıklı', color: '#22c55e' },
    { type: 'derailed' as const, emoji: '🔀', label: 'Saptırdı', color: '#f59e0b' },
];

export default function DuelArena({ currentUserId, roomSlug }: Props) {
    const [phase, setPhase] = useState<DuelPhase>('idle');
    const [duelData, setDuelData] = useState<DuelData | null>(null);
    const [remaining, setRemaining] = useState(0);
    const [reactions, setReactions] = useState<DuelReactions>({});
    const [challengerVotes, setChallengerVotes] = useState(0);
    const [opponentVotes, setOpponentVotes] = useState(0);
    const [hasVoted, setHasVoted] = useState(false);
    const [result, setResult] = useState<DuelResultData | null>(null);
    const [votingRemaining, setVotingRemaining] = useState(15);
    const [challengeFrom, setChallengeFrom] = useState<{
        duelId: string;
        challengerName: string;
        challengerAvatar?: string;
    } | null>(null);
    const votingTimerRef = useRef<ReturnType<typeof setInterval>>();

    // ─── Socket listeners ───
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        // Reset all state on room change
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

        const onChallengeReceived = (data: any) => {
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
            setTimeout(() => { setPhase('idle'); setDuelData(null); setResult(null); }, 10000);
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
            if (votingTimerRef.current) clearInterval(votingTimerRef.current);
        };
    }, [roomSlug]);

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
    const isParticipant = duelData && (currentUserId === duelData.challengerId || currentUserId === duelData.opponentId);

    const sendReaction = (type: string, targetId: string) => {
        const socket = getSocket();
        if (socket) socket.emit('duel:reaction', { type, targetId });
    };
    const sendVote = (candidateId: string) => {
        if (hasVoted) return;
        const socket = getSocket();
        if (socket) socket.emit('duel:vote', { candidateId });
        setHasVoted(true);
    };

    // ─── Challenge Modal ───
    if (phase === 'challenge-pending' && challengeFrom) {
        return (
            <Modal visible transparent animationType="fade">
                <View style={s.challengeOverlay}>
                    <View style={s.challengeCard}>
                        <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>⚔️</Text>
                        <Text style={s.challengeTitle}>Düello Daveti!</Text>
                        <Text style={s.challengeSubtitle}>
                            <Text style={{ color: '#a855f7', fontWeight: '700' }}>{challengeFrom.challengerName}</Text>
                            {' '}seni düelloya davet ediyor!
                        </Text>
                        <View style={s.challengeInfo}>
                            <Text style={s.infoText}>
                                ⚔️ Kabul edersen 3 dakika düello arenası açılır{'\n'}
                                🔒 Mikrofon düello süresince kilitlenir{'\n'}
                                🗳️ Dinleyiciler reaksiyon + oylama yapar{'\n'}
                                🏆 Kazanan +10 puan alır
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={[s.challengeBtn, { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: 'rgba(34,197,94,0.4)' }]}
                                onPress={() => { const socket = getSocket(); if (socket) socket.emit('duel:accept'); }}
                            >
                                <Text style={[s.challengeBtnText, { color: '#22c55e' }]}>✅ Kabul</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.challengeBtn, { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: 'rgba(239,68,68,0.4)' }]}
                                onPress={() => { const socket = getSocket(); if (socket) socket.emit('duel:reject'); setChallengeFrom(null); setPhase('idle'); }}
                            >
                                <Text style={[s.challengeBtnText, { color: '#ef4444' }]}>❌ Reddet</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    // ─── Nothing to show ───
    if (phase === 'idle' || !duelData) return null;

    const progressPercent = duelData.duration > 0 ? (remaining / duelData.duration) * 100 : 0;
    const avatarUri = (name: string, av?: string) => av || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

    return (
        <View style={s.container}>
            {/* Header */}
            <View style={s.header}>
                <Text style={s.title}>⚔️ Eristik Düello</Text>
                {phase === 'active' && <Text style={s.timer}>{formatTime(remaining)}</Text>}
                {phase === 'voting' && <Text style={[s.timer, { color: '#f59e0b' }]}>🗳️ Oylama</Text>}
                {phase === 'result' && <Text style={[s.timer, { color: '#22c55e' }]}>Sonuç</Text>}
            </View>

            {/* VS Display */}
            <View style={s.vsRow}>
                <View style={s.participant}>
                    <Image source={{ uri: avatarUri(duelData.challengerName, duelData.challengerAvatar) }} style={s.avatar} />
                    <Text style={s.name} numberOfLines={1}>{duelData.challengerName}</Text>
                    {(phase === 'voting' || phase === 'result') && (
                        <Text style={[s.voteCount, { color: '#a855f7' }]}>{challengerVotes}</Text>
                    )}
                </View>
                <Text style={s.vs}>⚔️</Text>
                <View style={s.participant}>
                    <Image source={{ uri: avatarUri(duelData.opponentName, duelData.opponentAvatar) }} style={[s.avatar, { borderColor: 'rgba(236,72,153,0.5)' }]} />
                    <Text style={s.name} numberOfLines={1}>{duelData.opponentName}</Text>
                    {(phase === 'voting' || phase === 'result') && (
                        <Text style={[s.voteCount, { color: '#ec4899' }]}>{opponentVotes}</Text>
                    )}
                </View>
            </View>

            {/* Progress Bar */}
            {phase === 'active' && (
                <View style={s.progressBar}>
                    <View style={[s.progressFill, { width: `${progressPercent}%` }]} />
                </View>
            )}

            {/* Info Banner */}
            {phase === 'active' && (
                <View style={[s.infoBanner, isParticipant ? s.infoBannerParticipant : s.infoBannerSpectator]}>
                    <Text style={s.infoText}>
                        {isParticipant
                            ? '⚔️ Düello devam ediyor! Mikrofon kilitli.'
                            : '👂 Düello dinleyicisisin! Reaksiyon gönder ve oy kullan.'}
                    </Text>
                    {isParticipant && (
                        <TouchableOpacity
                            style={s.forfeitBtn}
                            onPress={() => { const socket = getSocket(); if (socket) socket.emit('duel:forfeit'); }}
                        >
                            <Text style={s.forfeitBtnText}>🏳️ Pes Et</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Reactions (spectators, active phase) */}
            {phase === 'active' && !isParticipant && (
                <View style={s.reactionsRow}>
                    {[duelData.challengerId, duelData.opponentId].map(targetId => {
                        const targetName = targetId === duelData.challengerId ? duelData.challengerName : duelData.opponentName;
                        const tr = reactions[targetId] || { fallacy: 0, logical: 0, derailed: 0 };
                        return (
                            <View key={targetId} style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={s.reactionTargetName}>{targetName}</Text>
                                <View style={{ flexDirection: 'row', gap: 4 }}>
                                    {REACTIONS.map(r => (
                                        <TouchableOpacity
                                            key={r.type}
                                            style={[s.reactionBtn, { borderColor: r.color + '40' }]}
                                            onPress={() => sendReaction(r.type, targetId)}
                                        >
                                            <Text style={{ fontSize: 16 }}>{r.emoji}</Text>
                                            <Text style={s.reactionCount}>{tr[r.type]}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Voting */}
            {phase === 'voting' && (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                    {isParticipant ? (
                        <>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Dinleyiciler oy kullanıyor...</Text>
                            <Text style={{ color: '#a855f7', fontWeight: '700', fontSize: 18, marginTop: 6 }}>{challengerVotes} — {opponentVotes}</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>⏱ {votingRemaining}s</Text>
                        </>
                    ) : hasVoted ? (
                        <>
                            <Text style={{ color: '#22c55e', fontSize: 13, fontWeight: '600' }}>✅ Oyunuz kaydedildi!</Text>
                            <Text style={{ color: '#a855f7', fontWeight: '700', fontSize: 18, marginTop: 6 }}>{challengerVotes} — {opponentVotes}</Text>
                        </>
                    ) : (
                        <>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>🗳️ Kimin daha iyi tartıştığını oyla! ({votingRemaining}s)</Text>
                            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                                <TouchableOpacity style={[s.voteBtn, { backgroundColor: 'rgba(168,85,247,0.2)', borderColor: 'rgba(168,85,247,0.4)' }]} onPress={() => sendVote(duelData.challengerId)}>
                                    <Text style={[s.voteBtnText, { color: '#a855f7' }]}>{duelData.challengerName}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[s.voteBtn, { backgroundColor: 'rgba(236,72,153,0.2)', borderColor: 'rgba(236,72,153,0.4)' }]} onPress={() => sendVote(duelData.opponentId)}>
                                    <Text style={[s.voteBtnText, { color: '#ec4899' }]}>{duelData.opponentName}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            )}

            {/* Result */}
            {phase === 'result' && result && (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                    <Text style={{ fontSize: 22, marginBottom: 8 }}>🎉🏆⚔️🎊✨</Text>
                    {result.result === 'DRAW' ? (
                        <>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#f59e0b' }}>🤝 BERABERE</Text>
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>{result.challengerVotes} — {result.opponentVotes}</Text>
                        </>
                    ) : (
                        <>
                            <Text style={{ fontSize: 22, fontWeight: '900', color: '#22c55e' }}>🏆 {result.winnerName} KAZANDI!</Text>
                            {result.forfeit ? (
                                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600', marginTop: 4 }}>🏳️ {result.forfeitReason || 'Pes etti'}</Text>
                            ) : (
                                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>{result.challengerName} {result.challengerVotes} — {result.opponentVotes} {result.opponentName}</Text>
                            )}
                            <Text style={{ color: '#a855f7', fontSize: 11, marginTop: 4 }}>🏆 +10 puan | 💀 -10 puan</Text>
                        </>
                    )}
                </View>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: { backgroundColor: 'rgba(15,12,30,0.97)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', borderRadius: 16, padding: 16, marginBottom: 8 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    title: { fontSize: 13, fontWeight: '800', letterSpacing: 0.8, color: '#a855f7' },
    timer: { fontSize: 20, fontWeight: '900', fontFamily: 'monospace', color: '#fff' },
    vsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 8 },
    participant: { flex: 1, alignItems: 'center', gap: 4 },
    avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: 'rgba(168,85,247,0.5)' },
    name: { fontSize: 13, fontWeight: '700', color: '#fff', maxWidth: 90 },
    vs: { fontSize: 24, fontWeight: '900', color: '#f59e0b' },
    voteCount: { fontSize: 18, fontWeight: '900' },
    progressBar: { width: '100%', height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 8 },
    progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#a855f7' },
    infoBanner: { borderRadius: 10, padding: 10, marginVertical: 6 },
    infoBannerParticipant: { backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
    infoBannerSpectator: { backgroundColor: 'rgba(168,85,247,0.1)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)' },
    infoText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, lineHeight: 18 },
    forfeitBtn: { marginTop: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', alignSelf: 'flex-start' },
    forfeitBtnText: { color: '#ef4444', fontSize: 11, fontWeight: '700' },
    reactionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    reactionTargetName: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: 4 },
    reactionBtn: { alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
    reactionCount: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
    voteBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
    voteBtnText: { fontWeight: '700', fontSize: 13 },
    // Challenge modal
    challengeOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
    challengeCard: { width: '85%', backgroundColor: '#0F0C1E', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)', padding: 24 },
    challengeTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
    challengeSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', marginBottom: 12 },
    challengeInfo: { backgroundColor: 'rgba(168,85,247,0.1)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', borderRadius: 10, padding: 12, marginBottom: 16 },
    challengeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
    challengeBtnText: { fontWeight: '700', fontSize: 14 },
});
