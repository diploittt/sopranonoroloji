'use client';
import React, { useState, useEffect } from 'react';
import { Activity, Users, ShoppingBag, TrendingUp, Inbox, Server, Zap } from 'lucide-react';
import { API_URL } from '@/lib/api';

interface Props { token: string; onNavigate: (view: any) => void; }

export default function DashboardView({ token, onNavigate }: Props) {
    const [stats, setStats] = useState<any>({ onlineUsers: 0, paymentDue: 0, activeSpeakers: 0, activeRooms: 0 });
    const [recentOrders, setRecentOrders] = useState<any[]>([]);
    const [recentMessages, setRecentMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const headers = { Authorization: `Bearer ${token}` };
        Promise.all([
            fetch(`${API_URL}/admin/stats`, { headers }).then(r => r.ok ? r.json() : {}),
            fetch(`${API_URL}/admin/orders?limit=5`, { headers }).then(r => r.ok ? r.json() : []),
            fetch(`${API_URL}/admin/contact-messages?limit=5`, { headers }).then(r => r.ok ? r.json() : { messages: [] }),
        ]).then(([s, o, m]) => {
            setStats(s);
            setRecentOrders(Array.isArray(o) ? o.slice(0, 5) : (o.orders || []).slice(0, 5));
            setRecentMessages(m.messages || []);
        }).catch(() => {}).finally(() => setLoading(false));
    }, [token]);

    const statCards = [
        { label: 'Çevrimiçi', value: stats.onlineUsers || 0, icon: Users, color: '#38bdf8', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.15)' },
        { label: 'Aktif Odalar', value: stats.activeRooms || 0, icon: Activity, color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.15)' },
        { label: 'Bekleyen Sipariş', value: recentOrders.filter((o: any) => o.status === 'pending').length, icon: ShoppingBag, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.15)' },
        { label: 'Aktif Konuşmacı', value: stats.activeSpeakers || 0, icon: Zap, color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.15)' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(244,63,94,0.15), rgba(244,63,94,0.05))',
                    border: '1px solid rgba(244,63,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <TrendingUp style={{ width: 18, height: 18, color: '#fb7185' }} />
                </div>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>Genel Bakış</h1>
                    <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Canlı istatistikler ve son aktiviteler</p>
                </div>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                {statCards.map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <div key={i} className="glossy-panel" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden', border: `1px solid ${card.border}` }}>
                            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: `radial-gradient(circle, ${card.bg}, transparent 70%)`, pointerEvents: 'none' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <Icon style={{ width: 16, height: 16, color: card.color }} />
                                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 1 }}>{card.label}</span>
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 900, color: card.color, textShadow: `0 0 20px ${card.bg}` }}>{loading ? '...' : card.value}</div>
                        </div>
                    );
                })}
            </div>

            {/* System Info */}
            {stats.system && (
                <div className="glossy-panel" style={{ padding: '16px 20px', display: 'flex', gap: 24, alignItems: 'center' }}>
                    <Server style={{ width: 16, height: 16, color: '#64748b' }} />
                    <div style={{ display: 'flex', gap: 24 }}>
                        <div><span style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' as const }}>Uptime</span><div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{Math.floor((stats.system.uptimeSeconds || 0) / 3600)}s</div></div>
                        <div><span style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' as const }}>RAM</span><div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{Math.round(stats.system.memoryMB || 0)} MB</div></div>
                        <div><span style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' as const }}>Heap</span><div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{Math.round(stats.system.heapUsedMB || 0)} / {Math.round(stats.system.heapTotalMB || 0)} MB</div></div>
                    </div>
                </div>
            )}

            {/* Two-column grid: Recent Orders + Recent Messages */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                {/* Recent Orders */}
                <div className="glossy-panel" style={{ padding: '20px 22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ShoppingBag style={{ width: 14, height: 14, color: '#fbbf24' }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Son Siparişler</span>
                        </div>
                        <button onClick={() => onNavigate('orders')} style={{ fontSize: 10, color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Tümünü Gör →</button>
                    </div>
                    {recentOrders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 20, color: '#475569', fontSize: 11 }}>Henüz sipariş yok</div>
                    ) : recentOrders.map((o, i) => (
                        <div key={o.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < recentOrders.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{o.firstName} {o.lastName}</div>
                                <div style={{ fontSize: 10, color: '#64748b' }}>{o.packageName || 'Paket'} • {o.paymentCode}</div>
                            </div>
                            <span style={{
                                fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                                background: o.status === 'pending' ? 'rgba(251,191,36,0.1)' : o.status === 'approved' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                                color: o.status === 'pending' ? '#fbbf24' : o.status === 'approved' ? '#34d399' : '#ef4444',
                                border: `1px solid ${o.status === 'pending' ? 'rgba(251,191,36,0.2)' : o.status === 'approved' ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                textTransform: 'uppercase' as const,
                            }}>{o.status === 'pending' ? 'Bekliyor' : o.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}</span>
                        </div>
                    ))}
                </div>

                {/* Recent Messages */}
                <div className="glossy-panel" style={{ padding: '20px 22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Inbox style={{ width: 14, height: 14, color: '#a78bfa' }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Son Mesajlar</span>
                        </div>
                        <button onClick={() => onNavigate('messages')} style={{ fontSize: 10, color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Tümünü Gör →</button>
                    </div>
                    {recentMessages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 20, color: '#475569', fontSize: 11 }}>Henüz mesaj yok</div>
                    ) : recentMessages.map((m, i) => (
                        <div key={m.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < recentMessages.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{m.name || 'Anonim'}</div>
                                <div style={{ fontSize: 10, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{m.message || m.text || ''}</div>
                            </div>
                            {!m.isRead && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#38bdf8', marginLeft: 10, flexShrink: 0 }} />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
