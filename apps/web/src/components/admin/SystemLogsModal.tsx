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
                const token = sessionStorage.getItem('soprano_admin_token');
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
            <div className="absolute inset-0 bg-black/15" onClick={onClose} />
            <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col animate-in zoom-in-95 fade-in duration-300" style={{
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                overflow: 'hidden',
            }}>


                {/* Header */}
                <div className="px-4 py-2.5 bg-[#1e293b] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ScrollText className="w-4 h-4 text-white" />
                        <h2 className="text-xs font-bold text-white">Sistem Logları</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-all">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Filter bar */}
                <div style={{ padding: '12px 16px 0' }}>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={logFilter}
                            onChange={(e) => { setLogFilter(e.target.value); setLogPage(1); }}
                            placeholder="Filtre (event)..."
                            className="flex-1 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-3 py-1.5 text-slate-800 text-xs outline-none focus:border-blue-500 transition placeholder:text-slate-400"
                        />
                        <button onClick={() => { setLogFilter(''); setLogPage(1); }} className="px-2.5 py-1.5 bg-[#f8fafc] hover:bg-slate-100 rounded-lg text-xs text-slate-500 hover:text-slate-700 transition border border-[#e2e8f0]">
                            <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Log entries */}
                <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: '12px 16px 16px' }}>
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
                                <div key={log.id || idx} className="flex items-center gap-4 p-3 rounded-lg border border-[#e2e8f0] hover:border-slate-300 transition" style={{ background: '#f8fafc' }}>
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
                <div style={{ padding: '0 16px 12px' }}>
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
