'use client';
import React, { useState, useEffect } from 'react';
import { ScrollText, Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { API_URL } from '@/lib/api';

interface Props { token: string; }

export default function LogsView({ token }: Props) {
    const [logs, setLogs] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const limit = 30;

    const headers = { Authorization: `Bearer ${token}` };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: String(limit) });
            if (filter) params.set('level', filter);
            const res = await fetch(`${API_URL}/admin/system-logs?${params}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || data || []);
                setTotal(data.total || 0);
            }
        } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchLogs(); }, [token, page, filter]);

    const totalPages = Math.ceil(total / limit);
    const levelColors: Record<string, string> = { error: '#ef4444', warn: '#fbbf24', info: '#38bdf8', debug: '#94a3b8' };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: 'linear-gradient(135deg, rgba(250,204,21,0.15), rgba(250,204,21,0.05))',
                        border: '1px solid rgba(250,204,21,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><ScrollText style={{ width: 18, height: 18, color: '#facc15' }} /></div>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>Sistem Logları</h1>
                        <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Sunucu kayıtları — {total} kayıt</p>
                    </div>
                </div>
                {/* Filter */}
                <div style={{ display: 'flex', gap: 6 }}>
                    {['', 'error', 'warn', 'info'].map(f => (
                        <button key={f} onClick={() => { setFilter(f); setPage(1); }} style={{
                            padding: '5px 12px', borderRadius: 8, fontSize: 10, fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: filter === f ? 'rgba(255,255,255,0.08)' : 'transparent',
                            color: filter === f ? '#fff' : '#64748b',
                        }}>{f === '' ? 'Tümü' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
                    ))}
                </div>
            </div>

            {/* Log table */}
            <div className="glossy-panel" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#475569', fontSize: 12 }}>Yükleniyor...</div>
                ) : logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#475569', fontSize: 12 }}>Log bulunamadı</div>
                ) : (
                    <div>
                        {logs.map((log, i) => (
                            <div key={log.id || i} style={{
                                padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                                display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 11,
                            }}>
                                <span style={{
                                    fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                                    background: `${levelColors[log.level] || '#94a3b8'}15`,
                                    color: levelColors[log.level] || '#94a3b8',
                                    border: `1px solid ${levelColors[log.level] || '#94a3b8'}30`,
                                    textTransform: 'uppercase' as const, minWidth: 42, textAlign: 'center' as const, flexShrink: 0,
                                }}>{log.level}</span>
                                <span style={{ fontSize: 9, color: '#475569', flexShrink: 0, fontFamily: 'monospace', minWidth: 130 }}>
                                    {log.createdAt || log.timestamp ? new Date(log.createdAt || log.timestamp).toLocaleString('tr-TR') : ''}
                                </span>
                                <span style={{ color: '#cbd5e1', wordBreak: 'break-all' as const, lineHeight: 1.5 }}>{log.message || JSON.stringify(log.data || '')}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 10px', cursor: page <= 1 ? 'default' : 'pointer', color: '#94a3b8', opacity: page <= 1 ? 0.3 : 1 }}>
                        <ChevronLeft style={{ width: 14, height: 14 }} />
                    </button>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{page} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '6px 10px', cursor: page >= totalPages ? 'default' : 'pointer', color: '#94a3b8', opacity: page >= totalPages ? 0.3 : 1 }}>
                        <ChevronRight style={{ width: 14, height: 14 }} />
                    </button>
                </div>
            )}
        </div>
    );
}
