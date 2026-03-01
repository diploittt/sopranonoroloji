"use client";

import React, { useState, useEffect } from 'react';
import { X, ScrollText, RefreshCw } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface SystemLogsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SystemLogsModal({ isOpen, onClose }: SystemLogsModalProps) {
    const [systemLogs, setSystemLogs] = useState<any[]>([]);
    const [logTotal, setLogTotal] = useState(0);
    const [logPage, setLogPage] = useState(1);
    const [logFilter, setLogFilter] = useState('');
    const [logLoading, setLogLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const fetchLogs = async () => {
            setLogLoading(true);
            try {
                const token = localStorage.getItem('soprano_admin_token');
                const params = new URLSearchParams();
                params.set('page', String(logPage));
                params.set('limit', '25');
                if (logFilter) params.set('event', logFilter);
                const res = await fetch(`${API_URL}/admin/system-logs?${params}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setSystemLogs(data.logs || []);
                    setLogTotal(data.total || 0);
                }
            } catch { /* ignore */ }
            setLogLoading(false);
        };
        fetchLogs();
    }, [isOpen, logPage, logFilter]);

    if (!isOpen) return null;

    const totalPages = Math.ceil(logTotal / 25);

    const eventColors: Record<string, string> = {
        'tenant.update': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        'tenant.admin_password_reset': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        'tenant.create': 'bg-green-500/20 text-green-400 border-green-500/30',
        'tenant.delete': 'bg-red-500/20 text-red-400 border-red-500/30',
        'tenant.status_change': 'bg-amber-700/20 text-[#7b9fef] border-amber-700/30',
        'tenant.godmaster_password_reset': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col animate-in zoom-in-95 fade-in duration-300" style={{
                background: 'linear-gradient(145deg, rgba(15,17,30,0.97) 0%, rgba(20,15,40,0.97) 100%)',
                borderRadius: 20,
                border: '1px solid rgba(99,102,241,0.2)',
                boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 25px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                overflow: 'hidden',
            }}>
                {/* Neon glow line */}
                <div style={{
                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                    width: '70%', height: 1,
                    background: 'linear-gradient(90deg, transparent, rgba(234,179,8,0.6), transparent)',
                }} />

                {/* Header */}
                <div style={{ padding: '24px 28px 0' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div style={{
                                width: 44, height: 44, borderRadius: 14,
                                background: 'linear-gradient(135deg, rgba(234,179,8,0.2), rgba(245,158,11,0.2))',
                                border: '1px solid rgba(234,179,8,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 20px rgba(234,179,8,0.2)',
                            }}>
                                <ScrollText className="w-5 h-5 text-yellow-400" style={{ filter: 'drop-shadow(0 0 6px rgba(234,179,8,0.5))' }} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white" style={{ letterSpacing: '-0.01em' }}>Sistem Logları</h2>
                                <p className="text-[11px] text-gray-500">Owner panel işlem geçmişi</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Filter bar */}
                <div style={{ padding: '16px 28px 0' }}>
                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={logFilter}
                            onChange={(e) => { setLogFilter(e.target.value); setLogPage(1); }}
                            placeholder="Filtre (event)..."
                            className="flex-1 bg-black/30 border border-yellow-500/15 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-yellow-500/40 transition placeholder:text-gray-600"
                        />
                        <button onClick={() => { setLogFilter(''); setLogPage(1); }} className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-gray-400 hover:text-white transition border border-white/5">
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Log entries */}
                <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: '16px 28px 20px' }}>
                    {logLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin"></div>
                        </div>
                    ) : systemLogs.length === 0 ? (
                        <div className="text-center py-12">
                            <ScrollText className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">Henüz sistem logu yok</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {systemLogs.map((log: any, idx: number) => (
                                <div key={log.id || idx} className="flex items-center gap-4 p-3 rounded-xl border border-white/5 hover:border-white/10 transition" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex-shrink-0 ${eventColors[log.event] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                                        {log.event}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs text-gray-400 truncate block">
                                            {log.targetUser?.displayName || '—'}
                                        </span>
                                    </div>
                                    <span className="text-xs text-[#7b9fef] font-medium flex-shrink-0">
                                        {log.admin?.displayName || '—'}
                                    </span>
                                    <span className="text-[10px] text-gray-600 flex-shrink-0 tabular-nums">
                                        {new Date(log.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                <div style={{ padding: '0 28px 20px' }}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-600">Toplam: {logTotal} kayıt</span>
                        <div className="flex items-center gap-2">
                            <button disabled={logPage <= 1} onClick={() => setLogPage(p => p - 1)} className="px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed">â€</button>
                            <span className="text-xs text-gray-400">{logPage} / {totalPages || 1}</span>
                            <button disabled={logPage >= totalPages} onClick={() => setLogPage(p => p + 1)} className="px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed">›</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
