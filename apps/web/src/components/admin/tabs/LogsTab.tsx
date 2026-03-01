import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Socket } from 'socket.io-client';
import { FileText, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminApi } from '@/lib/admin/api';
import '@/components/admin/AdminPanel.css';

interface LogsTabProps {
    socket: Socket | null;
}

interface LogEntry {
    id: string;
    event: string;
    userId?: string;
    adminId?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    user?: { displayName: string };
    admin?: { displayName: string };
}

const EVENT_COLORS: Record<string, string> = {
    'user.login': '#22c55e',
    'user.logout': '#6b7280',
    'user.register': '#3b82f6',
    'user.update': '#8b5cf6',
    'user.delete': '#ef4444',
    'room.create': '#22c55e',
    'room.delete': '#ef4444',
    'room.update': '#f59e0b',
    'ban.create': '#ef4444',
    'ban.remove': '#22c55e',
    'settings.update': '#f59e0b',
};

const EVENT_LABELS: Record<string, string> = {
    'user.login': 'Giriş Yapıldı',
    'user.logout': 'Çıkış Yapıldı',
    'user.register': 'Kayıt Olundu',
    'user.update': 'Kullanıcı Güncellendi',
    'user.delete': 'Kullanıcı Silindi',
    'room.create': 'Oda Oluşturuldu',
    'room.delete': 'Oda Silindi',
    'room.update': 'Oda Güncellendi',
    'ban.create': 'Ban Uygulandı',
    'ban.remove': 'Ban Kaldırıldı',
    'settings.update': 'Ayarlar Güncellendi',
};

// GodMaster ve hassas rolleri maskele
function maskDisplayName(name?: string): string {
    if (!name) return '—';
    const lower = name.toLowerCase();
    if (lower === 'godmaster' || lower === 'god_master') return 'Sistem Yönetici';
    return name;
}

// Metadata'yı okunabilir key-value çiftlerine dönüştür
function formatMetadataValue(value: any): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır';
    if (typeof value === 'object') {
        if (Array.isArray(value)) return value.join(', ');
        return Object.entries(value)
            .map(([k, v]) => `${k}: ${formatMetadataValue(v)}`)
            .join(', ');
    }
    return String(value);
}

const METADATA_LABELS: Record<string, string> = {
    ip: 'IP Adresi',
    userAgent: 'Tarayıcı',
    browser: 'Tarayıcı',
    reason: 'Sebep',
    duration: 'Süre',
    roomName: 'Oda Adı',
    roomSlug: 'Oda Slug',
    oldName: 'Eski İsim',
    newName: 'Yeni İsim',
    role: 'Rol',
    oldRole: 'Eski Rol',
    newRole: 'Yeni Rol',
    displayName: 'Kullanıcı Adı',
    email: 'E-posta',
    action: 'İşlem',
    targetUserId: 'Hedef ID',
    targetDisplayName: 'Hedef Kullanıcı',
};

// Gizlenmesi gereken metadata anahtarları
const HIDDEN_KEYS = ['password', 'token', 'secret', 'hash', 'salt', 'refreshToken', 'accessToken'];

function ToastPortal({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
    if (!msg) return null;
    return createPortal(
        <div className="admin-toast-container">
            <div className={`admin-toast ${msg.type}`}>{msg.text}</div>
        </div>,
        document.body
    );
}

export function LogsTab({ socket }: LogsTabProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [eventFilter, setEventFilter] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const perPage = 50;

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminApi.getAuditLogs({ page, limit: perPage, event: eventFilter || undefined });
            if (Array.isArray(data)) {
                setLogs(data);
                setTotal(data.length);
            } else {
                setLogs(data.logs || []);
                setTotal(data.total || 0);
            }
        } catch (e: any) {
            showStatus('error', e.message);
        } finally {
            setLoading(false);
        }
    }, [page, eventFilter]);

    useEffect(() => { loadLogs(); }, [loadLogs]);

    const showStatus = (type: 'success' | 'error', text: string) => {
        setToastMsg({ type, text });
        setTimeout(() => setToastMsg(null), 3000);
    };

    const fmtDate = (d?: string) => {
        if (!d) return '—';
        return new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const selectedLog = logs.find(l => l.id === selectedId);

    // Metadata'yı filtrelenmiş key-value çiftlerine dönüştür
    const getMetadataEntries = (metadata?: Record<string, any>): Array<{ key: string; label: string; value: string }> => {
        if (!metadata) return [];
        return Object.entries(metadata)
            .filter(([key]) => !HIDDEN_KEYS.includes(key))
            .map(([key, value]) => ({
                key,
                label: METADATA_LABELS[key] || key,
                value: formatMetadataValue(value),
            }));
    };

    return (
        <div className="admin-split" style={{ position: 'relative' }}>
            <ToastPortal msg={toastMsg} />

            <div className="admin-split-left">
                <div className="admin-toolbar">
                    <FileText style={{ width: 13, height: 13, color: '#8b5cf6' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Audit Log</span>
                    <div style={{ flex: 1 }} />
                    <input
                        type="text"
                        placeholder="Filtre (event)..."
                        value={eventFilter}
                        onChange={e => { setEventFilter(e.target.value); setPage(1); }}
                        style={{ width: 120, fontSize: 10, padding: '4px 8px' }}
                    />
                    <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={loadLogs} title="Yenile">
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
                                    <th>Event</th>
                                    <th>Kullanıcı</th>
                                    <th>Admin</th>
                                    <th>Tarih</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} className={selectedId === log.id ? 'selected' : ''} onClick={() => setSelectedId(log.id)}>
                                        <td>
                                            <span style={{
                                                display: 'inline-block', padding: '2px 6px', borderRadius: 4,
                                                fontSize: 9, fontWeight: 700, fontFamily: 'monospace',
                                                background: `${EVENT_COLORS[log.event] || '#6b7280'}15`,
                                                color: EVENT_COLORS[log.event] || '#9ca3af',
                                                border: `1px solid ${EVENT_COLORS[log.event] || '#6b7280'}25`,
                                            }}>
                                                {log.event}
                                            </span>
                                        </td>
                                        <td style={{ color: '#d1d5db', fontSize: 11 }}>{maskDisplayName(log.user?.displayName) || log.userId?.slice(0, 8) || '—'}</td>
                                        <td style={{ color: '#6b7280', fontSize: 11 }}>{maskDisplayName(log.admin?.displayName) || log.adminId?.slice(0, 8) || '—'}</td>
                                        <td style={{ color: '#6b7280', fontSize: 10 }}>{fmtDate(log.createdAt)}</td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: '#4b5563' }}>Log kaydı yok</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <div style={{
                    padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 10, color: '#4b5563', flexShrink: 0,
                }}>
                    <span>Toplam: {total} kayıt</span>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
                            <ChevronLeft style={{ width: 11, height: 11 }} />
                        </button>
                        <span>{page} / {totalPages}</span>
                        <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                            <ChevronRight style={{ width: 11, height: 11 }} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="admin-split-right">
                {!selectedLog ? (
                    <div className="admin-empty">
                        <div className="admin-empty-icon">📋</div>
                        <div className="admin-empty-text">Log Seçin</div>
                        <div className="admin-empty-sub">Detayları görüntülemek için sol listeden bir kayıt seçin</div>
                    </div>
                ) : (
                    <>
                        <div className="admin-detail-header">
                            <div className="header-accent" />
                            Log Detayı
                        </div>

                        <div className="admin-info-card">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Event</div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                                        <span style={{
                                            display: 'inline-block', padding: '3px 8px', borderRadius: 6,
                                            fontSize: 11, fontWeight: 700,
                                            background: `${EVENT_COLORS[selectedLog.event] || '#6b7280'}15`,
                                            color: EVENT_COLORS[selectedLog.event] || '#9ca3af',
                                            border: `1px solid ${EVENT_COLORS[selectedLog.event] || '#6b7280'}25`,
                                        }}>
                                            {EVENT_LABELS[selectedLog.event] || selectedLog.event}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Tarih</div>
                                    <div style={{ fontSize: 13, color: '#e0e0e0' }}>{fmtDate(selectedLog.createdAt)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Kullanıcı</div>
                                    <div style={{ fontSize: 13, color: '#e0e0e0' }}>{maskDisplayName(selectedLog.user?.displayName) || selectedLog.userId || '—'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Admin</div>
                                    <div style={{ fontSize: 13, color: '#e0e0e0' }}>{maskDisplayName(selectedLog.admin?.displayName) || selectedLog.adminId || '—'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Metadata — okunabilir key-value format */}
                        {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                            <div className="admin-info-card">
                                <h4 style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Detay Bilgileri
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {getMetadataEntries(selectedLog.metadata).map(entry => (
                                        <div key={entry.key} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '6px 0',
                                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                                        }}>
                                            <span style={{
                                                fontSize: 11, color: '#6b7280', fontWeight: 600,
                                            }}>{entry.label}</span>
                                            <span style={{
                                                fontSize: 11, color: '#d1d5db', fontWeight: 500,
                                                maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                textAlign: 'right',
                                            }}>{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
