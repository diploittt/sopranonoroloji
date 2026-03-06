'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface TokenPackage {
    id: string;
    name: string;
    tokenAmount: number;
    price: number;
    currency: string;
    emoji: string;
    description?: string;
}

interface PendingOrder {
    id: string;
    packageName: string;
    packageEmoji: string;
    tokenAmount: number;
    price: number;
    status: string;
    createdAt: string;
}

interface TokenShopProps {
    isOpen: boolean;
    onClose: () => void;
    socket: any;
}

export function TokenShop({ isOpen, onClose, socket }: TokenShopProps) {
    const [packages, setPackages] = useState<TokenPackage[]>([]);
    const [balance, setBalance] = useState(0);
    const [points, setPoints] = useState(0);
    const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
    const [buying, setBuying] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!socket || !isOpen) return;

        socket.emit('token:packages');

        const onResponse = (data: any) => {
            setPackages(data.packages || []);
            setBalance(data.balance || 0);
            setPoints(data.points || 0);
            setPendingOrders(data.pendingOrders || []);
        };

        const onBalanceUpdate = (data: { balance: number; points: number }) => {
            setBalance(data.balance || 0);
            setPoints(data.points || 0);
        };

        socket.on('token:packagesResponse', onResponse);
        socket.on('gift:balance', onBalanceUpdate);

        return () => {
            socket.off('token:packagesResponse', onResponse);
            socket.off('gift:balance', onBalanceUpdate);
        };
    }, [socket, isOpen]);

    if (!isOpen) return null;

    const handleBuy = async (packageId: string) => {
        setBuying(packageId);
        setSuccessMsg(null);
        try {
            const result = await new Promise<any>((resolve) => {
                socket.emit('token:buy', { packageId }, (res: any) => resolve(res));
                // Fallback timeout
                setTimeout(() => resolve({ error: 'Zaman aşımı' }), 5000);
            });

            if (result?.success) {
                setSuccessMsg(result.message);
                // Listeyi yenile
                socket.emit('token:packages');
            } else {
                setSuccessMsg(`❌ ${result?.error || 'Sipariş oluşturulamadı'}`);
            }
        } catch {
            setSuccessMsg('❌ Bir hata oluştu');
        } finally {
            setBuying(null);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={onClose}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div
                className="relative w-[420px] max-h-[560px] rounded-2xl overflow-hidden flex flex-col"
                style={{
                    background: 'linear-gradient(180deg, #0f1628 0%, #0a0e1a 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(99, 102, 241, 0.1)',
                    animation: 'giftPanelIn 0.25s ease-out',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span style={{ fontSize: 22 }}>🏪</span>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Jeton Mağazası</h3>
                                <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, marginTop: 2 }}>Jeton paketleri satın al</p>
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#94a3b8', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>

                    {/* Balance */}
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
                </div>

                {/* Success / Error Message */}
                {successMsg && (
                    <div style={{ margin: '8px 16px 0', padding: '8px 12px', borderRadius: 8, background: successMsg.startsWith('❌') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${successMsg.startsWith('❌') ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}`, fontSize: 12, color: successMsg.startsWith('❌') ? '#f87171' : '#4ade80' }}>
                        {successMsg}
                    </div>
                )}

                {/* Packages */}
                <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'none' }}>
                    {packages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: 13 }}>
                            <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>📦</span>
                            Henüz jeton paketi tanımlanmamış.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {packages.map(pkg => (
                                <button
                                    key={pkg.id}
                                    onClick={() => handleBuy(pkg.id)}
                                    disabled={buying === pkg.id}
                                    className="group relative overflow-hidden rounded-xl text-left transition-all duration-200 hover:scale-[1.02]"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(168,85,247,0.05) 100%)',
                                        border: '1px solid rgba(99,102,241,0.15)',
                                        padding: '16px 14px',
                                        cursor: buying === pkg.id ? 'wait' : 'pointer',
                                    }}
                                >
                                    <div style={{ fontSize: 28, marginBottom: 8 }}>{pkg.emoji || '💎'}</div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{pkg.name}</div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24', marginBottom: 4 }}>
                                        {pkg.tokenAmount.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>jeton</span>
                                    </div>
                                    {pkg.description && (
                                        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>{pkg.description}</div>
                                    )}
                                    <div style={{
                                        display: 'inline-block',
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        background: 'rgba(99,102,241,0.2)',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: '#818cf8',
                                    }}>
                                        {pkg.price} {pkg.currency}
                                    </div>
                                    {buying === pkg.id && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                                            <span style={{ fontSize: 12, color: '#fff' }}>İşleniyor...</span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Pending Orders */}
                    {pendingOrders.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 8 }}>⏳ Bekleyen Siparişler</div>
                            {pendingOrders.map(order => (
                                <div key={order.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    background: 'rgba(245,158,11,0.05)',
                                    border: '1px solid rgba(245,158,11,0.1)',
                                    marginBottom: 6,
                                }}>
                                    <div className="flex items-center gap-2">
                                        <span style={{ fontSize: 16 }}>{order.packageEmoji}</span>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: '#fbbf24' }}>{order.packageName}</div>
                                            <div style={{ fontSize: 10, color: '#64748b' }}>{order.tokenAmount.toLocaleString()} jeton • {order.price} TL</div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.2)', color: '#fbbf24', fontWeight: 600 }}>Bekliyor</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Info Footer */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: '#64748b', margin: 0 }}>
                        💡 Sipariş verdikten sonra admin onayı ile jetonlarınız otomatik yüklenir.
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
}
