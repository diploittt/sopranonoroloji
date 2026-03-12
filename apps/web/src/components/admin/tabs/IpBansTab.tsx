import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Socket } from 'socket.io-client';
import { Globe, Trash2, RefreshCw, Plus, X } from 'lucide-react';
import { adminApi } from '@/lib/admin/api';
import '@/components/admin/AdminPanel.css';

interface IpBansTabProps {
    socket: Socket | null;
}

interface IpBanEntry {
    id: string;
    ip: string;
    reason?: string;
    createdAt: string;
    admin?: { displayName: string };
    adminId?: string;
}

function ToastPortal({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
    if (!msg) return null;
    return createPortal(
        <div className="admin-toast-container">
            <div className={`admin-toast ${msg.type}`}>{msg.text}</div>
        </div>,
        document.body
    );
}

export function IpBansTab({ socket }: IpBansTabProps) {
    const [ipBans, setIpBans] = useState<IpBanEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

    const [newIp, setNewIp] = useState('');
    const [newReason, setNewReason] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    const loadIpBans = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminApi.getIpBans();
            setIpBans(Array.isArray(data) ? data : data.ipBans || []);
        } catch (e: any) {
            showStatus('error', e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadIpBans(); }, [loadIpBans]);

    const handleAdd = async () => {
        if (!newIp.trim()) return;
        try {
            await adminApi.createIpBan({ ip: newIp.trim(), reason: newReason.trim() || undefined });
            showStatus('success', 'IP ban eklendi.');
            setNewIp(''); setNewReason(''); setShowAddForm(false);
            loadIpBans();
        } catch (e: any) {
            showStatus('error', e.message);
        }
    };

    const handleRemove = async (id: string) => {
        try {
            await adminApi.removeIpBan(id);
            showStatus('success', 'IP yasağı kaldırıldı.');
            if (selectedId === id) setSelectedId(null);
            setConfirmRemove(null);
            loadIpBans();
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

    const selectedBan = ipBans.find(b => b.id === selectedId);

    return (
        <div className="admin-split" style={{ position: 'relative' }}>
            <ToastPortal msg={toastMsg} />

            <div className="admin-split-left">
                <div className="admin-toolbar">
                    <Globe style={{ width: 13, height: 13, color: '#f59e0b' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>IP Ban Listesi</span>
                    <div style={{ flex: 1 }} />
                    <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
                        <Plus style={{ width: 12, height: 12 }} /> Ekle
                    </button>
                    <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={loadIpBans} title="Yenile">
                        <RefreshCw style={{ width: 12, height: 12, ...(loading ? { animation: 'adminSpin 0.6s linear infinite' } : {}) }} />
                    </button>
                </div>

                {showAddForm && (
                    <div style={{ padding: 12, borderBottom: '1px solid rgba(37,99,235,0.08)', background: 'linear-gradient(180deg, rgba(226,232,240,0.4) 0%, transparent 100%)' }}>
                        <div className="admin-form-group" style={{ marginBottom: 8 }}>
                            <label>IP Adresi</label>
                            <input type="text" value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="192.168.1.1" />
                        </div>
                        <div className="admin-form-group" style={{ marginBottom: 8 }}>
                            <label>Sebep</label>
                            <input type="text" value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="Opsiyonel..." />
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button className="admin-btn admin-btn-success admin-btn-sm" onClick={handleAdd}>Ekle</button>
                            <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setShowAddForm(false)}>İptal</button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="admin-loading"><div className="admin-spinner" /> Yükleniyor...</div>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead><tr><th>IP Adresi</th><th>Sebep</th><th>Tarih</th><th style={{ width: 40 }}></th></tr></thead>
                            <tbody>
                                {ipBans.map(ban => (
                                    <tr key={ban.id} className={selectedId === ban.id ? 'selected' : ''} onClick={() => setSelectedId(ban.id)}>
                                        <td style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 11 }}>{ban.ip}</td>
                                        <td style={{ color: '#334155', fontSize: 10 }}>{ban.reason ? (ban.reason.length > 25 ? ban.reason.slice(0, 25) + '...' : ban.reason) : '—'}</td>
                                        <td style={{ color: '#334155', fontSize: 10 }}>{fmtDate(ban.createdAt)}</td>
                                        <td>
                                            <button className="admin-btn admin-btn-danger admin-btn-icon admin-btn-sm" onClick={(e) => { e.stopPropagation(); setConfirmRemove(ban.id); setSelectedId(ban.id); }} title="Kaldır">
                                                <Trash2 style={{ width: 11, height: 11 }} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {ipBans.length === 0 && (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: '#1e293b' }}>IP yasağı yok</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(37,99,235,0.08)', fontSize: 12, color: '#1e293b', flexShrink: 0, background: 'rgba(241,245,249,0.3)' }}>
                    Toplam: <span className="admin-count">{ipBans.length}</span> IP yasağı
                </div>
            </div>

            <div className="admin-split-right">
                {!selectedBan ? (
                    <div className="admin-empty">
                        <div className="admin-empty-icon">🌐</div>
                        <div className="admin-empty-text">IP Yasağı Seçin</div>
                        <div className="admin-empty-sub">Detayları görüntülemek için sol listeden bir kayıt seçin</div>
                    </div>
                ) : (
                    <>
                        <div className="admin-user-profile-header">
                            <div style={{
                                width: 42, height: 42, borderRadius: 12,
                                background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(37,99,235,0.06))',
                                border: '2px solid rgba(37,99,235,0.18)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', fontSize: 18,
                            }}>
                                🌐
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 800, color: '#1e293b', fontFamily: 'monospace' }}>{selectedBan.ip}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#334155' }}>
                                    <span style={{ fontSize: 10 }}>IP Yasağı</span>
                                    <span style={{ fontSize: 11, color: '#1e3a5f' }}>{fmtDate(selectedBan.createdAt)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="admin-info-card">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <div style={{ fontSize: 12, color: '#334155', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>IP Adresi</div>
                                    <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 600, fontFamily: 'monospace' }}>{selectedBan.ip}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#334155', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Ekleyen</div>
                                    <div style={{ fontSize: 13, color: '#0f172a' }}>{selectedBan.admin?.displayName || selectedBan.adminId?.slice(0, 8) || '—'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: '#334155', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Tarih</div>
                                    <div style={{ fontSize: 13, color: '#0f172a' }}>{fmtDate(selectedBan.createdAt)}</div>
                                </div>
                            </div>
                        </div>

                        {selectedBan.reason && (
                            <div className="admin-info-card"><h4>Sebep</h4><p>{selectedBan.reason}</p></div>
                        )}

                        <div className="admin-divider" />

                        {confirmRemove === selectedBan.id ? (
                            <div className="admin-inline-confirm">
                                <span>Bu IP yasağını kaldırmak istediğinize emin misiniz?</span>
                                <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => handleRemove(selectedBan.id)}>Evet</button>
                                <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setConfirmRemove(null)}>İptal</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button className="admin-btn admin-btn-danger" onClick={() => setConfirmRemove(selectedBan.id)}>
                                    <Trash2 style={{ width: 13, height: 13 }} />
                                    Yasağı Kaldır
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
