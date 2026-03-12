import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Socket } from 'socket.io-client';
import { Ban, Trash2, RefreshCw, Shield } from 'lucide-react';
import { adminApi } from '@/lib/admin/api';
import '@/components/admin/AdminPanel.css';

interface BansTabProps {
    socket: Socket | null;
}

interface BanEntry {
    id: string;
    userId: string;
    adminId: string;
    type: string;
    duration: string;
    reason?: string;
    ip?: string;
    isActive: boolean;
    createdAt: string;
    expiresAt?: string;
    liftedAt?: string;
    user?: { displayName: string };
    admin?: { displayName: string };
}

const DURATION_LABELS: Record<string, string> = {
    PERMANENT: 'Süresiz',
    ONE_DAY: '1 Gün',
    ONE_WEEK: '1 Hafta',
    ONE_MONTH: '1 Ay',
};

function ToastPortal({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
    if (!msg) return null;
    return createPortal(
        <div className="admin-toast-container">
            <div className={`admin-toast ${msg.type}`}>{msg.text}</div>
        </div>,
        document.body
    );
}

export function BansTab({ socket }: BansTabProps) {
    const [bans, setBans] = useState<BanEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<'all' | 'active' | 'lifted'>('all');
    const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [confirmUnban, setConfirmUnban] = useState<string | null>(null);

    const loadBans = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filter === 'active') params.active = true;
            if (filter === 'lifted') params.active = false;
            const data = await adminApi.getBans(params);
            setBans(Array.isArray(data) ? data : data.bans || []);
        } catch (e: any) {
            showStatus('error', e.message);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { loadBans(); }, [loadBans]);

    const handleUnban = async (banId: string) => {
        try {
            await adminApi.removeBan(banId);
            showStatus('success', 'Yasak kaldırıldı.');
            setConfirmUnban(null);
            loadBans();
        } catch (e: any) {
            showStatus('error', e.message);
        }
    };

    const showStatus = (type: 'success' | 'error', text: string) => {
        setToastMsg({ type, text });
        setTimeout(() => setToastMsg(null), 3000);
    };

    const fmtDate = (d?: string) => {
        if (!d) return '—';
        return new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const selectedBan = bans.find(b => b.id === selectedId);

    return (
        <div className="admin-split" style={{ position: 'relative' }}>
            <ToastPortal msg={toastMsg} />

            {/* ─── Sol Panel: Ban Listesi ─── */}
            <div className="admin-split-left">
                <div className="admin-toolbar">
                    <Shield style={{ width: 13, height: 13, color: '#ef4444' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Ban/Gag Listesi</span>
                    <div style={{ flex: 1 }} />
                    {(['all', 'active', 'lifted'] as const).map(f => (
                        <button
                            key={f}
                            className={`admin-btn admin-btn-sm ${filter === f ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? 'Tümü' : f === 'active' ? 'Aktif' : 'Kalkmış'}
                        </button>
                    ))}
                    <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={loadBans} title="Yenile">
                        <RefreshCw style={{ width: 12, height: 12, ...(loading ? { animation: 'adminSpin 0.6s linear infinite' } : {}) }} />
                    </button>
                </div>

                {loading ? (
                    <div className="admin-loading"><div className="admin-spinner" /> Yükleniyor...</div>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Kullanıcı</th>
                                    <th>Tür</th>
                                    <th>Süre</th>
                                    <th>Tarih</th>
                                    <th>Durum</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bans.map(ban => (
                                    <tr key={ban.id} className={selectedId === ban.id ? 'selected' : ''} onClick={() => setSelectedId(ban.id)}>
                                        <td style={{ fontWeight: 600 }}>{ban.user?.displayName || ban.userId?.slice(0, 8)}</td>
                                        <td>
                                            <span style={{
                                                padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                                                background: ban.type === 'BAN' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                                                color: ban.type === 'BAN' ? '#fca5a5' : '#fcd34d',
                                                border: `1px solid ${ban.type === 'BAN' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                                            }}>
                                                {ban.type === 'BAN' ? '🚫 Ban' : '🤐 Gag'}
                                            </span>
                                        </td>
                                        <td style={{ color: '#334155', fontSize: 10 }}>{DURATION_LABELS[ban.duration] || ban.duration}</td>
                                        <td style={{ color: '#334155', fontSize: 10 }}>{fmtDate(ban.createdAt)}</td>
                                        <td>
                                            <span style={{
                                                padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                                                background: ban.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                                                color: ban.isActive ? '#fca5a5' : '#86efac',
                                            }}>
                                                {ban.isActive ? 'Aktif' : 'Kalktı'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {bans.length === 0 && (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#1e293b' }}>Yasaklı kullanıcı yok</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(37,99,235,0.08)', fontSize: 12, color: '#1e293b', flexShrink: 0, background: 'rgba(241,245,249,0.3)' }}>
                    Toplam: <span className="admin-count">{bans.length}</span> kayıt
                </div>
            </div>

            {/* ─── Sağ Panel: Ban Detayı ─── */}
            <div className="admin-split-right">
                {!selectedBan ? (
                    <div className="admin-empty">
                        <div className="admin-empty-icon">🚫</div>
                        <div className="admin-empty-text">Yasak Seçin</div>
                        <div className="admin-empty-sub">Detayları görüntülemek için sol listeden bir kayıt seçin</div>
                    </div>
                ) : (
                    <>
                        <div className="admin-user-profile-header">
                            <div style={{
                                width: 42, height: 42, borderRadius: 12,
                                background: selectedBan.type === 'BAN' ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(200,50,50,0.08))' : 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(200,130,20,0.08))',
                                border: selectedBan.type === 'BAN' ? '2px solid rgba(239,68,68,0.2)' : '2px solid rgba(245,158,11,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', fontSize: 18,
                            }}>
                                {selectedBan.type === 'BAN' ? '🚫' : '🤐'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{selectedBan.user?.displayName || selectedBan.userId}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#334155' }}>
                                    <span style={{
                                        padding: '1px 6px', borderRadius: 4, fontSize: 8, fontWeight: 700,
                                        background: selectedBan.type === 'BAN' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                                        color: selectedBan.type === 'BAN' ? '#fca5a5' : '#fcd34d',
                                    }}>
                                        {selectedBan.type === 'BAN' ? 'BAN' : 'GAG'}
                                    </span>
                                    <span style={{ fontSize: 10 }}>{selectedBan.isActive ? 'Aktif' : 'Kalktı'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="admin-info-card">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <div style={{ fontSize: 12, color: '#334155', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Kullanıcı</div>
                                    <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 600 }}>{selectedBan.user?.displayName || selectedBan.userId}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#334155', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Admin</div>
                                    <div style={{ fontSize: 13, color: '#0f172a' }}>{selectedBan.admin?.displayName || selectedBan.adminId?.slice(0, 8)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#334155', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Tür</div>
                                    <div style={{ fontSize: 13, color: '#0f172a' }}>{selectedBan.type === 'BAN' ? 'Ban (Yasaklama)' : 'Gag (Yazı Yasağı)'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#334155', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Süre</div>
                                    <div style={{ fontSize: 13, color: '#0f172a' }}>{DURATION_LABELS[selectedBan.duration] || selectedBan.duration}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#334155', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Tarih</div>
                                    <div style={{ fontSize: 13, color: '#0f172a' }}>{fmtDate(selectedBan.createdAt)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#334155', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Bitiş</div>
                                    <div style={{ fontSize: 13, color: '#0f172a' }}>{selectedBan.expiresAt ? fmtDate(selectedBan.expiresAt) : 'Süresiz'}</div>
                                </div>
                                {selectedBan.ip && (
                                    <div>
                                        <div style={{ fontSize: 12, color: '#334155', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>IP Adresi</div>
                                        <div style={{ fontSize: 13, color: '#0f172a', fontFamily: 'monospace' }}>{selectedBan.ip}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedBan.reason && (
                            <div className="admin-info-card"><h4>Sebep</h4><p>{selectedBan.reason}</p></div>
                        )}

                        <div className="admin-divider" />

                        {selectedBan.isActive && (
                            <>
                                {confirmUnban === selectedBan.id ? (
                                    <div className="admin-inline-confirm">
                                        <span>Bu yasağı kaldırmak istediğinize emin misiniz?</span>
                                        <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => handleUnban(selectedBan.id)}>Evet</button>
                                        <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setConfirmUnban(null)}>İptal</button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                        <button className="admin-btn admin-btn-danger" onClick={() => setConfirmUnban(selectedBan.id)}>
                                            <Trash2 style={{ width: 13, height: 13 }} />
                                            Yasağı Kaldır
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
