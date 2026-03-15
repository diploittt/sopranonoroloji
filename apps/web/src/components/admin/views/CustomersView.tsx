'use client';
import React, { useState, useEffect } from 'react';
import { Users, Search, ExternalLink, ChevronDown, ChevronUp, Lock, Unlock, Trash2, Crown, Globe, KeyRound, Eye, X, PlusCircle } from 'lucide-react';
import { API_URL } from '@/lib/api';

interface Props { token: string; adminUser: any; }

export default function CustomersView({ token, adminUser }: Props) {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PASSIVE'>('ALL');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [tenantRooms, setTenantRooms] = useState<any[]>([]);
    const [tenantMembers, setTenantMembers] = useState<any[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [systemTenantId, setSystemTenantId] = useState<string | null>(null);
    const [showNewCustomer, setShowNewCustomer] = useState(false);

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/admin/users?limit=100`, { headers });
            if (res.ok) {
                const data = await res.json();
                setCustomers(data.users || data || []);
            }
        } catch { }
        setLoading(false);
    };

    useEffect(() => { loadCustomers(); }, [token]);

    // System tenant
    useEffect(() => {
        fetch(`${API_URL}/admin/customers/system-tenant`, { headers })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d?.tenantId) setSystemTenantId(d.tenantId); })
            .catch(() => {});
    }, [token]);

    const loadTenantDetails = async (tenantId: string) => {
        if (expandedId === tenantId) { setExpandedId(null); return; }
        setExpandedId(tenantId);
        setDetailLoading(true);
        try {
            const [rRes, mRes] = await Promise.all([
                fetch(`${API_URL}/admin/customers/${tenantId}/rooms`, { headers }),
                fetch(`${API_URL}/admin/customers/${tenantId}/members`, { headers }),
            ]);
            if (rRes.ok) setTenantRooms(await rRes.json());
            if (mRes.ok) setTenantMembers(await mRes.json());
        } catch { }
        setDetailLoading(false);
    };

    const getGodMasterToken = async (tenantId: string) => {
        try {
            const res = await fetch(`${API_URL}/admin/customers/${tenantId}/godmaster-token`, { method: 'POST', headers });
            if (res.ok) {
                const data = await res.json();
                if (data.token) {
                    localStorage.setItem('soprano_token', data.token);
                    localStorage.setItem('soprano_user', JSON.stringify(data.user));
                    window.open(`/room/${data.defaultRoom || 'genel-sohbet'}`, '_blank');
                }
            }
        } catch { }
    };

    const toggleStatus = async (userId: string, currentStatus: boolean) => {
        try {
            await fetch(`${API_URL}/admin/users/${userId}`, {
                method: 'PATCH', headers, body: JSON.stringify({ isActive: !currentStatus }),
            });
            loadCustomers();
        } catch { }
    };

    const deleteTenant = async (userId: string) => {
        try {
            await fetch(`${API_URL}/admin/users/${userId}`, { method: 'DELETE', headers });
            setDeleteConfirmId(null);
            loadCustomers();
        } catch { }
    };

    const filtered = customers.filter(c => {
        if (statusFilter === 'ACTIVE' && !c.isActive) return false;
        if (statusFilter === 'PASSIVE' && c.isActive) return false;
        if (search) {
            const q = search.toLowerCase();
            return (c.displayName || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.domain || '').toLowerCase().includes(q);
        }
        return true;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(123,159,239,0.15), rgba(123,159,239,0.05))',
                        border: '1px solid rgba(123,159,239,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><Users style={{ width: 18, height: 18, color: '#7b9fef' }} /></div>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>Müşteriler</h1>
                        <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Tenant ve oda yönetimi</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {/* Search */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 12px' }}>
                        <Search style={{ width: 13, height: 13, color: '#475569' }} />
                        <input type="text" placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)}
                            style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 12, width: 140 }} />
                    </div>
                    {/* Filter */}
                    {(['ALL', 'ACTIVE', 'PASSIVE'] as const).map(f => (
                        <button key={f} onClick={() => setStatusFilter(f)} style={{
                            padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: statusFilter === f ? 'rgba(255,255,255,0.08)' : 'transparent',
                            color: statusFilter === f ? '#fff' : '#64748b',
                        }}>{f === 'ALL' ? 'Tümü' : f === 'ACTIVE' ? 'Aktif' : 'Pasif'}</button>
                    ))}
                </div>
            </div>

            {/* Customer Cards */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#475569', fontSize: 12 }}>Yükleniyor...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#475569', fontSize: 12 }}>Müşteri bulunamadı</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filtered.map((c, i) => {
                        const isExpanded = expandedId === c.id;
                        const isSystem = c.id === systemTenantId;
                        return (
                            <div key={c.id || i} className="glossy-panel" style={{ padding: 0, overflow: 'hidden', border: isSystem ? '1px solid rgba(251,191,36,0.15)' : undefined }}>
                                {/* Card header */}
                                <div style={{
                                    padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    cursor: 'pointer', transition: 'background 0.2s',
                                }} onClick={() => loadTenantDetails(c.id)}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 36, height: 36, borderRadius: 10,
                                            background: c.isActive ? 'linear-gradient(135deg, rgba(52,211,153,0.1), rgba(52,211,153,0.03))' : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${c.isActive ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                                        }}>{isSystem ? '👑' : '🏢'}</div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{c.displayName || c.name || 'İsimsiz'}</span>
                                                {isSystem && <span style={{ fontSize: 8, fontWeight: 800, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(251,191,36,0.2)' }}>SİSTEM</span>}
                                                <span style={{
                                                    fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                                                    background: c.isActive ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                                                    color: c.isActive ? '#34d399' : '#ef4444',
                                                    border: `1px solid ${c.isActive ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                                }}>{c.isActive ? 'AKTİF' : 'PASİF'}</span>
                                            </div>
                                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                                {c.email && <span>📧 {c.email}</span>}
                                                {c.domain && <span style={{ marginLeft: 10 }}>🌐 {c.domain}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <button onClick={e => { e.stopPropagation(); toggleStatus(c.id, c.isActive); }} title={c.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 6 }}>
                                            {c.isActive ? <Lock style={{ width: 14, height: 14 }} /> : <Unlock style={{ width: 14, height: 14 }} />}
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); getGodMasterToken(c.id); }} title="GodMaster Giriş"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fbbf24', padding: 6 }}>
                                            <KeyRound style={{ width: 14, height: 14 }} />
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); setDeleteConfirmId(c.id); }} title="Sil"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 6 }}>
                                            <Trash2 style={{ width: 14, height: 14 }} />
                                        </button>
                                        {isExpanded ? <ChevronUp style={{ width: 14, height: 14, color: '#64748b' }} /> : <ChevronDown style={{ width: 14, height: 14, color: '#64748b' }} />}
                                    </div>
                                </div>
                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div style={{ padding: '0 18px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                        {detailLoading ? (
                                            <div style={{ textAlign: 'center', padding: 16, color: '#475569', fontSize: 11 }}>Yükleniyor...</div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 12 }}>
                                                {/* Rooms */}
                                                <div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>🏠 Odalar ({tenantRooms.length})</div>
                                                    {tenantRooms.length === 0 ? (
                                                        <div style={{ fontSize: 10, color: '#475569' }}>Oda yok</div>
                                                    ) : tenantRooms.map((r, ri) => (
                                                        <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{r.name || r.slug}</span>
                                                            <span style={{ fontSize: 9, color: '#64748b' }}>{r.slug}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Members */}
                                                <div>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8 }}>👥 Üyeler ({tenantMembers.length})</div>
                                                    {tenantMembers.length === 0 ? (
                                                        <div style={{ fontSize: 10, color: '#475569' }}>Üye yok</div>
                                                    ) : tenantMembers.slice(0, 10).map((m, mi) => (
                                                        <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                            <span style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>{m.displayName || m.username}</span>
                                                            <span style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' as const }}>{m.role}</span>
                                                        </div>
                                                    ))}
                                                    {tenantMembers.length > 10 && <div style={{ fontSize: 9, color: '#475569', marginTop: 6 }}>+{tenantMembers.length - 10} daha...</div>}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirmId && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setDeleteConfirmId(null)}>
                    <div onClick={e => e.stopPropagation()} className="glossy-panel" style={{ padding: '24px 28px', maxWidth: 380, borderRadius: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#ef4444', marginBottom: 12 }}>⚠️ Müşteriyi Sil</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>Bu işlem geri alınamaz. Tüm odaları ve üyeleri silinecek.</div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => deleteTenant(deleteConfirmId!)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #dc2626, #ef4444)', color: '#fff', fontSize: 12, fontWeight: 800 }}>Sil</button>
                            <button onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', background: 'transparent', color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>İptal</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
