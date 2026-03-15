'use client';
import React, { useState, useEffect } from 'react';
import { Inbox, Eye, Trash2, X, MailOpen } from 'lucide-react';
import { API_URL } from '@/lib/api';

interface Props { token: string; onUnreadChange: (count: number) => void; }

export default function MessagesView({ token, onUnreadChange }: Props) {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<any>(null);

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/admin/contact-messages`, { headers });
            if (res.ok) {
                const data = await res.json();
                const msgs = data.messages || data || [];
                setMessages(Array.isArray(msgs) ? msgs : []);
                onUnreadChange(Array.isArray(msgs) ? msgs.filter((m: any) => !m.isRead).length : 0);
            }
        } catch { }
        setLoading(false);
    };

    useEffect(() => { load(); }, [token]);

    const markRead = async (id: string) => {
        try {
            await fetch(`${API_URL}/admin/contact-messages/${id}/read`, { method: 'PATCH', headers });
            load();
        } catch { }
    };

    const deleteMsg = async (id: string) => {
        try {
            await fetch(`${API_URL}/admin/contact-messages/${id}`, { method: 'DELETE', headers });
            setSelected(null);
            load();
        } catch { }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(167,139,250,0.05))',
                    border: '1px solid rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}><Inbox style={{ width: 18, height: 18, color: '#a78bfa' }} /></div>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 900, color: '#fff', margin: 0 }}>İletişim Mesajları</h1>
                    <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Ana sayfadan gelen destek ve iletişim mesajları</p>
                </div>
            </div>

            {/* Two-panel: list + detail */}
            <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
                {/* Message list */}
                <div className="glossy-panel" style={{ padding: 0, overflow: 'hidden', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#475569', fontSize: 12 }}>Yükleniyor...</div>
                    ) : messages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#475569', fontSize: 12 }}>Henüz mesaj yok</div>
                    ) : messages.map((m, i) => (
                        <div key={m.id || i} onClick={() => { setSelected(m); if (!m.isRead) markRead(m.id); }}
                            style={{
                                padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                                cursor: 'pointer', transition: 'background 0.2s',
                                background: selected?.id === m.id ? 'rgba(167,139,250,0.06)' : 'transparent',
                                borderLeft: !m.isRead ? '3px solid #a78bfa' : '3px solid transparent',
                            }}
                            onMouseEnter={e => { if (selected?.id !== m.id) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                            onMouseLeave={e => { if (selected?.id !== m.id) e.currentTarget.style.background = 'transparent'; }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, fontWeight: m.isRead ? 500 : 700, color: m.isRead ? '#94a3b8' : '#fff' }}>{m.name || 'Anonim'}</span>
                                <span style={{ fontSize: 9, color: '#475569' }}>{m.createdAt ? new Date(m.createdAt).toLocaleDateString('tr-TR') : ''}</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{m.email || ''}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{m.message || m.text || ''}</div>
                        </div>
                    ))}
                </div>

                {/* Detail panel */}
                {selected && (
                    <div className="glossy-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
                                <MailOpen style={{ width: 14, height: 14, display: 'inline', marginRight: 8, color: '#a78bfa' }} />
                                {selected.name || 'Anonim'}
                            </span>
                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X style={{ width: 14, height: 14 }} />
                            </button>
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                            {selected.email && <span>📧 {selected.email}</span>}
                            {selected.phone && <span style={{ marginLeft: 14 }}>📱 {selected.phone}</span>}
                        </div>
                        <div style={{ fontSize: 9, color: '#475569' }}>{selected.createdAt ? new Date(selected.createdAt).toLocaleString('tr-TR') : ''}</div>
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
                        <div style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap' as const }}>{selected.message || selected.text || ''}</div>
                        <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                            <button onClick={() => deleteMsg(selected.id)} style={{
                                padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)',
                                background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer',
                                fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                            }}><Trash2 style={{ width: 12, height: 12 }} /> Sil</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
