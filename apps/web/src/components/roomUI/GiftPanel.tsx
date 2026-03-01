'use client';

import { useEffect, useState } from 'react';

interface GiftItem {
    id: string;
    name: string;
    emoji: string;
    price: number;
    animationType: string;
    category: string;
}

interface GiftPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSendGift: (giftId: string) => void;
    socket: any;
    targetUserName?: string;
    onOpenShop?: () => void;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
    basic: { label: 'Temel', color: '#22c55e' },
    premium: { label: 'Premium', color: '#a855f7' },
    legendary: { label: 'Efsanevi', color: '#f59e0b' },
};

export function GiftPanel({ isOpen, onClose, onSendGift, socket, targetUserName, onOpenShop }: GiftPanelProps) {
    const [gifts, setGifts] = useState<GiftItem[]>([]);
    const [balance, setBalance] = useState(0);
    const [points, setPoints] = useState(0);
    const [activeCategory, setActiveCategory] = useState('all');
    const [sending, setSending] = useState<string | null>(null);

    useEffect(() => {
        if (!socket || !isOpen) return;

        socket.emit('gift:list');

        const onListResponse = (data: { gifts: GiftItem[]; balance: number; points: number }) => {
            setGifts(data.gifts || []);
            setBalance(data.balance || 0);
            setPoints(data.points || 0);
        };

        const onBalanceUpdate = (data: { balance: number; points: number }) => {
            setBalance(data.balance || 0);
            setPoints(data.points || 0);
        };

        socket.on('gift:listResponse', onListResponse);
        socket.on('gift:balance', onBalanceUpdate);

        return () => {
            socket.off('gift:listResponse', onListResponse);
            socket.off('gift:balance', onBalanceUpdate);
        };
    }, [socket, isOpen]);

    if (!isOpen) return null;

    const filteredGifts = activeCategory === 'all' ? gifts : gifts.filter(g => g.category === activeCategory);
    const categories = ['all', ...Array.from(new Set(gifts.map(g => g.category)))];

    const handleSend = (giftId: string, price: number) => {
        if (balance < price) return;
        setSending(giftId);
        onSendGift(giftId);
        setTimeout(() => setSending(null), 800);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative w-[360px] max-h-[480px] rounded-2xl overflow-hidden flex flex-col"
                style={{
                    background: 'linear-gradient(180deg, #1a1025 0%, #0f0a18 100%)',
                    border: '1px solid rgba(168, 85, 247, 0.2)',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(168, 85, 247, 0.1)',
                    animation: 'giftPanelIn 0.25s ease-out',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span style={{ fontSize: 22 }}>🎁</span>
                            <div>
                                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.2 }}>Hediye Gönder</h3>
                                {targetUserName && (
                                    <p style={{ fontSize: 11, color: '#a78bfa', margin: 0, marginTop: 2 }}>
                                        → {targetUserName}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                borderRadius: 8,
                                width: 30,
                                height: 30,
                                color: '#94a3b8',
                                fontSize: 16,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >✕</button>
                    </div>

                    {/* Balance bar */}
                    <div className="flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 12px' }}>
                        <div className="flex items-center gap-1.5">
                            <span style={{ fontSize: 14 }}>🪙</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>{balance.toLocaleString()}</span>
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>jeton</span>
                        </div>
                        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
                        <div className="flex items-center gap-1.5">
                            <span style={{ fontSize: 14 }}>⭐</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#a855f7' }}>{points.toLocaleString()}</span>
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>puan</span>
                        </div>
                    </div>
                    {onOpenShop && (
                        <button onClick={() => { onClose(); onOpenShop(); }} style={{
                            marginTop: 8, width: '100%', padding: '8px 0', borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.1))',
                            border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8',
                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                            🏪 Jeton Mağazası
                        </button>
                    )}

                    {/* Yetersiz bakiye uyarısı */}
                    {balance <= 0 && (
                        <div style={{
                            marginTop: 8,
                            padding: '8px 12px',
                            borderRadius: 10,
                            background: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}>
                            <span style={{ fontSize: 14 }}>⚠️</span>
                            <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600 }}>
                                Jeton bakiyeniz yetersiz. Hediye göndermek için jeton gereklidir.
                            </span>
                        </div>
                    )}

                    {/* Category Tabs */}
                    <div className="flex gap-1.5 mt-3">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 8,
                                    border: 'none',
                                    fontSize: 10,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    background: activeCategory === cat ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.04)',
                                    color: activeCategory === cat ? '#c084fc' : '#64748b',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {cat === 'all' ? 'Tümü' : CATEGORY_LABELS[cat]?.label || cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Gift Grid */}
                <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin' }}>
                    <div className="grid grid-cols-3 gap-2">
                        {filteredGifts.map(gift => {
                            const canAfford = balance >= gift.price;
                            const isSending = sending === gift.id;
                            const catColor = CATEGORY_LABELS[gift.category]?.color || '#6b7280';

                            return (
                                <button
                                    key={gift.id}
                                    onClick={() => canAfford && handleSend(gift.id, gift.price)}
                                    disabled={!canAfford || !!sending}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '12px 6px 10px',
                                        borderRadius: 14,
                                        border: `1px solid ${canAfford ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)'}`,
                                        background: isSending
                                            ? 'rgba(168,85,247,0.2)'
                                            : canAfford
                                                ? 'rgba(255,255,255,0.03)'
                                                : 'rgba(255,255,255,0.01)',
                                        cursor: canAfford ? 'pointer' : 'not-allowed',
                                        opacity: canAfford ? 1 : 0.4,
                                        transition: 'all 0.15s',
                                        transform: isSending ? 'scale(0.9)' : 'scale(1)',
                                    }}
                                    onMouseEnter={e => {
                                        if (canAfford) (e.currentTarget.style.background = 'rgba(168,85,247,0.12)');
                                    }}
                                    onMouseLeave={e => {
                                        if (canAfford) (e.currentTarget.style.background = 'rgba(255,255,255,0.03)');
                                    }}
                                >
                                    <span style={{ fontSize: 30, lineHeight: 1 }}>{gift.emoji}</span>
                                    <span style={{ fontSize: 10, fontWeight: 600, color: '#e2e8f0' }}>{gift.name}</span>
                                    <div className="flex items-center gap-1" style={{
                                        background: `${catColor}15`,
                                        padding: '2px 8px',
                                        borderRadius: 6,
                                    }}>
                                        <span style={{ fontSize: 9 }}>🪙</span>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: catColor }}>{gift.price}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes giftPanelIn {
                    from { opacity: 0; transform: scale(0.92) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}
