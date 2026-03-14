'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { adminApi } from '@/lib/admin/api';
import './UserHistoryModal.css';

// ─── Sabitler (LogsTab ile uyumlu) ─────────────────────────────────

interface LogEntry {
    id: string;
    event: string;
    adminId?: string;
    targetUserId?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    admin?: { id: string; displayName: string };
    targetUser?: { id: string; displayName: string };
}

const EVENT_COLORS: Record<string, string> = {
    'user.login': '#22c55e',
    'user.logout': '#6b7280',
    'user.register': '#3b82f6',
    'user.update': '#8b5cf6',
    'user.delete': '#ef4444',
    'user.ban': '#ef4444',
    'user.unban': '#22c55e',
    'user.gag': '#f97316',
    'user.kick': '#ef4444',
    'room.create': '#22c55e',
    'room.delete': '#ef4444',
    'room.update': '#f59e0b',
    'room.close': '#ef4444',
    'ban.create': '#ef4444',
    'ban.remove': '#22c55e',
    'settings.update': '#f59e0b',
    'ip.ban': '#ef4444',
    'ip.unban': '#22c55e',
    'wordfilter.add': '#f59e0b',
    'wordfilter.remove': '#6b7280',
};

const EVENT_LABELS: Record<string, string> = {
    'user.login': 'Giriş Yapıldı',
    'user.logout': 'Çıkış Yapıldı',
    'user.register': 'Kayıt Olundu',
    'user.update': 'Bilgi Güncellendi',
    'user.delete': 'Hesap Silindi',
    'user.ban': 'Ban Uygulandı',
    'user.unban': 'Ban Kaldırıldı',
    'user.gag': 'Yazı Yasağı',
    'user.kick': 'Atıldı',
    'room.create': 'Oda Oluşturuldu',
    'room.delete': 'Oda Silindi',
    'room.update': 'Oda Güncellendi',
    'room.close': 'Oda Kapatıldı',
    'ban.create': 'Ban Uygulandı',
    'ban.remove': 'Ban Kaldırıldı',
    'settings.update': 'Ayarlar Güncellendi',
    'ip.ban': 'IP Yasaklandı',
    'ip.unban': 'IP Yasağı Kaldırıldı',
    'wordfilter.add': 'Kelime Filtresi Eklendi',
    'wordfilter.remove': 'Kelime Filtresi Kaldırıldı',
};

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

const HIDDEN_KEYS = ['password', 'token', 'secret', 'hash', 'salt', 'refreshToken', 'accessToken'];

// ─── Helpers ───────────────────────────────────────────────────────

function maskDisplayName(name?: string): string {
    if (!name) return '—';
    const lower = name.toLowerCase();
    if (lower === 'godmaster' || lower === 'god_master') return 'Sistem Yönetici';
    return name;
}

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

function fmtDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
}

function getMetadataEntries(metadata?: Record<string, any>) {
    if (!metadata) return [];
    return Object.entries(metadata)
        .filter(([key]) => !HIDDEN_KEYS.includes(key))
        .map(([key, value]) => ({
            key,
            label: METADATA_LABELS[key] || key,
            value: formatMetadataValue(value),
        }));
}

// ─── Component ─────────────────────────────────────────────────────

interface UserHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    displayName: string;
}

export function UserHistoryModal({ isOpen, onClose, userId, displayName }: UserHistoryModalProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [eventFilter, setEventFilter] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const perPage = 30;

    // ─── Drag Support ──────────────────────────────────────────
    const modalRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef({ dragging: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 });
    const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

    const onDragStart = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, input')) return;
        e.preventDefault();
        const rect = modalRef.current?.getBoundingClientRect();
        if (!rect) return;
        dragRef.current = {
            dragging: true,
            startX: e.clientX,
            startY: e.clientY,
            offsetX: rect.left,
            offsetY: rect.top,
        };
    }, []);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragRef.current.dragging) return;
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            setDragPos({ x: dragRef.current.offsetX + dx, y: dragRef.current.offsetY + dy });
        };
        const onUp = () => { dragRef.current.dragging = false; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    // Reset drag position when modal opens
    useEffect(() => {
        if (isOpen) setDragPos(null);
    }, [isOpen]);

    const loadLogs = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const data = await adminApi.getAuditLogs({
                userId,
                page,
                limit: perPage,
                event: eventFilter || undefined,
            });
            if (Array.isArray(data)) {
                setLogs(data);
                setTotal(data.length);
            } else {
                setLogs(data.logs || []);
                setTotal(data.total || 0);
            }
        } catch {
            setLogs([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [userId, page, eventFilter]);

    useEffect(() => {
        if (isOpen) {
            setPage(1);
            setSelectedId(null);
            setEventFilter('');
        }
    }, [isOpen, userId]);

    useEffect(() => {
        if (isOpen) loadLogs();
    }, [isOpen, loadLogs]);

    // ESC ile kapat
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const totalPages = Math.max(1, Math.ceil(total / perPage));

    return createPortal(
        <div className="user-history-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div
                ref={modalRef}
                className="user-history-modal"
                style={dragPos ? {
                    position: 'fixed',
                    left: dragPos.x,
                    top: dragPos.y,
                    margin: 0,
                    transform: 'none',
                } : undefined}
            >
                {/* Header — draggable */}
                <div className="uhm-header" onMouseDown={onDragStart} style={{ cursor: 'move', userSelect: 'none' }}>
                    <span className="uhm-header-icon">📜</span>
                    <div className="uhm-header-info">
                        <h3 className="uhm-header-title">{displayName} — Geçmiş</h3>
                        <div className="uhm-header-sub">Kullanıcıya ait tüm işlem kayıtları</div>
                    </div>
                    <button className="uhm-close-btn" onClick={onClose}>✕</button>
                </div>

                {/* Toolbar */}
                <div className="uhm-toolbar">
                    <input
                        type="text"
                        className="uhm-filter-input"
                        placeholder="Filtre (event tipi)..."
                        value={eventFilter}
                        onChange={(e) => { setEventFilter(e.target.value); setPage(1); }}
                    />
                    <button className="uhm-refresh-btn" onClick={loadLogs} title="Yenile">
                        <span className={loading ? 'uhm-spinning' : ''} style={{ display: 'inline-flex' }}>↻</span>
                    </button>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="uhm-loading">
                        <div className="uhm-spinner" />
                        Yükleniyor...
                    </div>
                ) : logs.length === 0 ? (
                    <div className="uhm-empty">
                        <div className="uhm-empty-icon">📋</div>
                        <div className="uhm-empty-text">Kayıt Bulunamadı</div>
                        <div className="uhm-empty-sub">Bu kullanıcı için henüz log kaydı yok</div>
                    </div>
                ) : (
                    <div className="uhm-log-list">
                        {logs.map((log) => {
                            const color = EVENT_COLORS[log.event] || '#6b7280';
                            const label = EVENT_LABELS[log.event] || log.event;
                            const isSelected = selectedId === log.id;
                            const metaEntries = getMetadataEntries(log.metadata);

                            return (
                                <React.Fragment key={log.id}>
                                    <div
                                        className={`uhm-log-row ${isSelected ? 'selected' : ''}`}
                                        onClick={() => setSelectedId(isSelected ? null : log.id)}
                                    >
                                        <span
                                            className="uhm-event-badge"
                                            style={{
                                                background: `${color}15`,
                                                color: color,
                                                border: `1px solid ${color}25`,
                                            }}
                                        >
                                            {log.event}
                                        </span>
                                        <div className="uhm-log-details">
                                            <div className="uhm-log-label">{label}</div>
                                            <div className="uhm-log-meta">
                                                <span>🕐 {fmtDate(log.createdAt)}</span>
                                                {log.admin && <span>👤 {maskDisplayName(log.admin.displayName)}</span>}
                                                {log.targetUser && <span>🎯 {maskDisplayName(log.targetUser.displayName)}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detail panel */}
                                    {isSelected && (
                                        <div className="uhm-detail-panel">
                                            <div className="uhm-detail-grid">
                                                <div>
                                                    <div className="uhm-detail-label">Event</div>
                                                    <div className="uhm-detail-value">{label}</div>
                                                </div>
                                                <div>
                                                    <div className="uhm-detail-label">Tarih</div>
                                                    <div className="uhm-detail-value">{fmtDate(log.createdAt)}</div>
                                                </div>
                                                <div>
                                                    <div className="uhm-detail-label">İşlemi Yapan</div>
                                                    <div className="uhm-detail-value">{maskDisplayName(log.admin?.displayName) || '—'}</div>
                                                </div>
                                                <div>
                                                    <div className="uhm-detail-label">Hedef</div>
                                                    <div className="uhm-detail-value">{maskDisplayName(log.targetUser?.displayName) || '—'}</div>
                                                </div>
                                            </div>

                                            {metaEntries.length > 0 && (
                                                <div className="uhm-meta-section">
                                                    <h5>Detay Bilgileri</h5>
                                                    {metaEntries.map((entry) => (
                                                        <div key={entry.key} className="uhm-meta-row">
                                                            <span className="uhm-meta-key">{entry.label}</span>
                                                            <span className="uhm-meta-val">{entry.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}

                {/* Footer */}
                <div className="uhm-footer">
                    <span>Toplam: {total} kayıt</span>
                    <div className="uhm-pagination">
                        <button
                            className="uhm-page-btn"
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page <= 1}
                        >
                            ‹
                        </button>
                        <span>{page} / {totalPages}</span>
                        <button
                            className="uhm-page-btn"
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page >= totalPages}
                        >
                            ›
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
