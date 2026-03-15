'use client';
import React, { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle, X, Clock, Eye, Trash2, ExternalLink } from 'lucide-react';
import { API_URL } from '@/lib/api';

interface Props { token: string; }

export default function OrdersView({ token }: Props) {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [confirm, setConfirm] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/admin/orders`, { headers });
            if (res.ok) {
                const data = await res.json();
                setOrders(Array.isArray(data) ? data : data.orders || []);
            }
        } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchOrders(); }, [token]);

    const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
        try {
            await fetch(`${API_URL}/admin/orders/${id}/status`, {
                method: 'PATCH', headers, body: JSON.stringify({ status }),
            });
            fetchOrders();
            setSelectedOrder(null);
        } catch { }
    };

    const deleteOrder = async (id: string) => {
        try {
            await fetch(`${API_URL}/admin/orders/${id}`, { method: 'DELETE', headers });
            fetchOrders();
            setSelectedOrder(null);
        } catch { }
    };

    const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);

    const statusBadge = (status: string) => {
        const cfg = status === 'pending' ? { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: 'rgba(251,191,36,0.2)', label: '⏳ Bekliyor' }
            : status === 'approved' ? { bg: 'rgba(52,211,153,0.1)', color: '#34d399', border: 'rgba(52,211,153,0.2)', label: '✅ Onaylandı' }
            : { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'rgba(239,68,68,0.2)', label: '❌ Reddedildi' };
        return <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))',
                        border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><ShoppingBag style={{ width: 18, height: 18, color: '#fbbf24' }} /></div>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>Siparişler</h1>
                        <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Ana sayfadan gelen tüm siparişler</p>
                    </div>
                </div>
                {/* Filter */}
                <div style={{ display: 'flex', gap: 6 }}>
                    {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
                        <button key={f} onClick={() => setStatusFilter(f)} style={{
                            padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: statusFilter === f ? 'rgba(255,255,255,0.08)' : 'transparent',
                            color: statusFilter === f ? '#fff' : '#64748b', transition: 'all 0.2s',
                        }}>{f === 'all' ? 'Tümü' : f === 'pending' ? 'Bekleyen' : f === 'approved' ? 'Onaylandı' : 'Reddedildi'}{f === 'pending' ? ` (${orders.filter(o => o.status === 'pending').length})` : ''}</button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="glossy-panel" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#475569', fontSize: 12 }}>Yükleniyor...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#475569', fontSize: 12 }}>Sipariş bulunamadı</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {['Müşteri', 'Paket', 'Tutar', 'Ödeme Kodu', 'Hosting', 'Durum', 'Tarih', ''].map((h, i) => (
                                    <th key={i} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 1 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((o, i) => (
                                <tr key={o.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'background 0.2s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    onClick={() => setSelectedOrder(o)}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{o.firstName} {o.lastName}</div>
                                        <div style={{ fontSize: 10, color: '#64748b' }}>{o.email}</div>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>{o.packageName || '-'}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 800, color: '#fbbf24' }}>{o.amount ? `${Number(o.amount).toLocaleString('tr-TR')} ₺` : '-'}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 11, fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>{o.paymentCode || '-'}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 11, color: '#94a3b8' }}>{o.hostingType === 'own_domain' ? `🌐 ${o.customDomain || 'Kendi Domain'}` : '🎙️ SopranoChat'}</td>
                                    <td style={{ padding: '12px 16px' }}>{statusBadge(o.status)}</td>
                                    <td style={{ padding: '12px 16px', fontSize: 10, color: '#475569' }}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString('tr-TR') : '-'}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <Eye style={{ width: 14, height: 14, color: '#64748b' }} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={e => { if (e.target === e.currentTarget) setSelectedOrder(null); }}>
                    <div className="glossy-panel" style={{ width: '100%', maxWidth: 520, padding: 0, borderRadius: 18, boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <div>
                                <div style={{ fontSize: 8, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase' as const, letterSpacing: 2 }}>📋 Sipariş Detayı</div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginTop: 4 }}>{selectedOrder.firstName} {selectedOrder.lastName}</div>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', cursor: 'pointer' }}>
                                <X style={{ width: 14, height: 14 }} />
                            </button>
                        </div>
                        {/* Modal Body */}
                        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[
                                { label: 'Paket', value: selectedOrder.packageName || '-' },
                                { label: 'Tutar', value: selectedOrder.amount ? `${Number(selectedOrder.amount).toLocaleString('tr-TR')} ₺` : '-' },
                                { label: 'Ödeme Kodu', value: selectedOrder.paymentCode || '-' },
                                { label: 'E-posta', value: selectedOrder.email || '-' },
                                { label: 'Telefon', value: selectedOrder.phone || '-' },
                                { label: 'Hosting', value: selectedOrder.hostingType === 'own_domain' ? `Kendi Domain: ${selectedOrder.customDomain}` : `SopranoChat: ${selectedOrder.roomName || '-'}` },
                                { label: 'Periyot', value: selectedOrder.details?.billing === 'yearly' ? 'Yıllık' : 'Aylık' },
                                { label: 'Durum', value: selectedOrder.status },
                                { label: 'Tarih', value: selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('tr-TR') : '-' },
                            ].map((row, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{row.label}</span>
                                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>{row.value}</span>
                                </div>
                            ))}
                        </div>
                        {/* Modal Actions */}
                        {selectedOrder.status === 'pending' && (
                            <div style={{ padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 10 }}>
                                <button onClick={() => updateStatus(selectedOrder.id, 'approved')} style={{
                                    flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #059669, #34d399)', color: '#fff',
                                    fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                }}><CheckCircle style={{ width: 14, height: 14 }} /> Onayla</button>
                                <button onClick={() => updateStatus(selectedOrder.id, 'rejected')} style={{
                                    flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff',
                                    fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                }}><X style={{ width: 14, height: 14 }} /> Reddet</button>
                                <button onClick={() => deleteOrder(selectedOrder.id)} style={{
                                    padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                                    background: 'rgba(255,255,255,0.03)', color: '#ef4444', fontSize: 12, fontWeight: 700,
                                }}><Trash2 style={{ width: 14, height: 14 }} /></button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
