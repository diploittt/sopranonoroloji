'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

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

    return createPortal(
        <div
            style={{
                position: 'fixed',
                bottom: 80,
                right: 20,
                width: 300,
                maxHeight: 360,
                borderRadius: 16,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(165deg, rgba(226,232,240,0.97) 0%, rgba(218,225,235,0.96) 50%, rgba(210,218,230,0.95) 100%)',
                backdropFilter: 'blur(28px) saturate(130%)',
                WebkitBackdropFilter: 'blur(28px) saturate(130%)',
                border: '1px solid rgba(255,255,255,0.65)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.20), 0 8px 20px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
                zIndex: 9990,
                animation: 'giftPopIn 0.2s ease-out',
            }}
            onClick={e => e.stopPropagation()}
        >
            {/* Compact Header */}
            <div style={{
                padding: '8px 14px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🎁</span>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>Hediye Gönder</div>
                        {targetUserName && (
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                                → {targetUserName}
                            </div>
                        )}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(255,255,255,0.12)', border: 'none',
                        borderRadius: 6, width: 22, height: 22,
                        color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                >
                    <X size={11} />
                </button>
            </div>

            {/* Balance + Categories */}
            <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
                {/* Balance */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 10px', borderRadius: 8,
                    background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.1)',
                    marginBottom: 6,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11 }}>🪙</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>{balance.toLocaleString()}</span>
                    </div>
                    <div style={{ width: 1, height: 12, background: 'rgba(148,163,184,0.15)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11 }}>⭐</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed' }}>{points.toLocaleString()}</span>
                    </div>
                    {onOpenShop && (
                        <>
                            <div style={{ flex: 1 }} />
                            <button
                                onClick={() => { onClose(); onOpenShop(); }}
                                style={{
                                    padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700,
                                    background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.15)',
                                    color: '#2563eb', cursor: 'pointer',
                                }}
                            >
                                🏪 Mağaza
                            </button>
                        </>
                    )}
                </div>

                {/* Category Tabs */}
                <div style={{ display: 'flex', gap: 4 }}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            style={{
                                padding: '3px 8px',
                                borderRadius: 6,
                                border: 'none',
                                fontSize: 9,
                                fontWeight: 700,
                                cursor: 'pointer',
                                background: activeCategory === cat ? 'rgba(37,99,235,0.12)' : 'rgba(148,163,184,0.08)',
                                color: activeCategory === cat ? '#2563eb' : '#64748b',
                                transition: 'all 0.15s',
                            }}
                        >
                            {cat === 'all' ? 'Tümü' : CATEGORY_LABELS[cat]?.label || cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Gift Grid — compact */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 8, scrollbarWidth: 'thin' }}>
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
                }}>
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
                                    gap: 2,
                                    padding: '8px 4px 6px',
                                    borderRadius: 10,
                                    border: `1px solid ${canAfford ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.06)'}`,
                                    background: isSending
                                        ? 'rgba(37,99,235,0.12)'
                                        : canAfford
                                            ? 'rgba(255,255,255,0.5)'
                                            : 'rgba(148,163,184,0.04)',
                                    cursor: canAfford ? 'pointer' : 'not-allowed',
                                    opacity: canAfford ? 1 : 0.4,
                                    transition: 'all 0.15s',
                                    transform: isSending ? 'scale(0.92)' : 'scale(1)',
                                }}
                                onMouseEnter={e => {
                                    if (canAfford) (e.currentTarget.style.background = 'rgba(37,99,235,0.08)');
                                }}
                                onMouseLeave={e => {
                                    if (canAfford) (e.currentTarget.style.background = 'rgba(255,255,255,0.5)');
                                }}
                            >
                                <span style={{ fontSize: 22, lineHeight: 1 }}>{gift.emoji}</span>
                                <span style={{ fontSize: 8, fontWeight: 700, color: '#334155', textAlign: 'center', lineHeight: 1.2 }}>{gift.name}</span>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 2,
                                    padding: '1px 5px', borderRadius: 4,
                                    background: 'rgba(37,99,235,0.06)',
                                }}>
                                    <span style={{ fontSize: 7 }}>🪙</span>
                                    <span style={{ fontSize: 9, fontWeight: 700, color: catColor }}>{gift.price}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Yetersiz bakiye uyarısı */}
                {balance <= 0 && (
                    <div style={{
                        marginTop: 8, padding: '6px 10px', borderRadius: 8,
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.15)',
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <span style={{ fontSize: 12 }}>⚠️</span>
                        <span style={{ fontSize: 9, color: '#92400e', fontWeight: 600 }}>
                            Jeton bakiyeniz yetersiz.
                        </span>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes giftPopIn {
                    from { opacity: 0; transform: translateY(8px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>,
        document.body
    );
}
