import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Socket } from 'socket.io-client';
import { Trash2, Lock, Unlock, Save, RefreshCw, Home, Plus, Palette } from 'lucide-react';
import { adminApi } from '@/lib/admin/api';
import { useAdminPanelStore } from '@/stores/useAdminPanelStore';
import '@/components/admin/AdminPanel.css';

import { User } from '@/types';



interface RoomsTabProps {
    socket: Socket | null;
    currentUser: User | null;
    systemSettings?: Record<string, any> | null;
}

// Mevcut temalar
const AVAILABLE_THEMES = [
    { id: '', label: 'Varsayılan (Modern)', emoji: '🌙' },
    { id: 'midnight', label: 'Midnight', emoji: '🌌' },
    { id: 'telegraph-1910', label: 'Telegraph 1910', emoji: '📡' },
    { id: 'hasbihal-islamic', label: 'Hasbihal İslâmî', emoji: '🕌' },
];

interface DBRoom {
    id: string;
    name: string;
    slug: string;
    password?: string;
    announcement?: string;
    themeId?: string;
    status: string;
    isLocked: boolean;
    isPublic: boolean;
    isMeetingRoom: boolean;
    isVipRoom: boolean;
    isCameraAllowed: boolean;
    buttonColor?: string;
    micLimit?: number;
    cameraLimit?: number;
    maxParticipants?: number;
    metadata?: { designId?: string } | null;
    _count?: { participants: number };
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

export function RoomsTab({ socket, currentUser, systemSettings }: RoomsTabProps) {
    const { selectedRoomId, setSelectedRoomId } = useAdminPanelStore();
    const isGodMaster = currentUser?.role?.toLowerCase() === 'godmaster';

    const [rooms, setRooms] = useState<DBRoom[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');

    // Form state
    const [formName, setFormName] = useState('');
    const [formSlug, setFormSlug] = useState('');
    const [formPassword, setFormPassword] = useState('');
    const [formAnnouncement, setFormAnnouncement] = useState('');
    const [formMax, setFormMax] = useState<number | ''>('');
    const [formMicLimit, setFormMicLimit] = useState<number | ''>('');
    const [formCameraLimit, setFormCameraLimit] = useState<number | ''>('');
    const [formLocked, setFormLocked] = useState(false);
    const [formPublic, setFormPublic] = useState(true);
    const [formMeeting, setFormMeeting] = useState(false);
    const [formVip, setFormVip] = useState(false);
    const [formCameraAllowed, setFormCameraAllowed] = useState(true);
    const [formButtonColor, setFormButtonColor] = useState('');
    const [formTheme, setFormTheme] = useState('');


    // Load rooms
    const loadRooms = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminApi.getRooms();
            setRooms(Array.isArray(data) ? data : data.rooms || []);
        } catch (e: any) {
            showStatus('error', e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadRooms(); }, [loadRooms]);

    const selectedRoom = rooms.find(r => r.id === selectedRoomId);

    useEffect(() => {
        if (selectedRoom) {
            setFormName(selectedRoom.name);
            setFormSlug(selectedRoom.slug);
            setFormPassword(selectedRoom.password || '');
            setFormAnnouncement(selectedRoom.announcement || '');
            setFormMax(selectedRoom.maxParticipants ?? '');
            setFormMicLimit(selectedRoom.micLimit ?? '');
            setFormCameraLimit(selectedRoom.cameraLimit ?? '');
            setFormLocked(selectedRoom.isLocked);
            setFormPublic(selectedRoom.isPublic);
            setFormMeeting(selectedRoom.isMeetingRoom);
            setFormVip(selectedRoom.isVipRoom);
            setFormCameraAllowed(selectedRoom.isCameraAllowed);
            setFormButtonColor(selectedRoom.buttonColor || '');
            setFormTheme(selectedRoom.themeId || '');

            setConfirmDelete(null);
        }
    }, [selectedRoomId, selectedRoom?.id]);

    // Save (only update, no create)
    const handleSave = async () => {
        if (!selectedRoomId) return;
        setSaving(true);
        try {
            const data: Record<string, any> = {
                name: formName,
                password: formPassword || null,
                announcement: formAnnouncement || null,
                maxParticipants: formMax ? Number(formMax) : null,
                micLimit: formMicLimit ? Number(formMicLimit) : null,
                cameraLimit: formCameraLimit ? Number(formCameraLimit) : null,
                isLocked: formLocked,
                isPublic: formPublic,
                isMeetingRoom: formMeeting,
                isVipRoom: formVip,
                isCameraAllowed: formCameraAllowed,
                buttonColor: formButtonColor.trim() || null,
                themeId: formTheme || null,
                metadata: null,
            };
            await adminApi.updateRoom(selectedRoomId, data);
            showStatus('success', 'Oda güncellendi.');
            loadRooms();
        } catch (e: any) {
            showStatus('error', e.message);
        } finally {
            setSaving(false);
        }
    };

    // Delete (inline confirm)
    const executeDelete = async () => {
        if (!confirmDelete) return;
        try {
            await adminApi.deleteRoom(confirmDelete);
            showStatus('success', 'Oda silindi.');
            setSelectedRoomId(null);
            setConfirmDelete(null);
            loadRooms();
        } catch (e: any) {
            showStatus('error', e.message);
        }
    };

    const showStatus = (type: 'success' | 'error', text: string) => {
        setToastMsg({ type, text });
        setTimeout(() => setToastMsg(null), 3000);
    };

    // Create new room
    const handleCreate = async () => {
        if (!newRoomName.trim()) return;
        const name = newRoomName.trim();
        const slug = name.toLowerCase().replace(/[^a-z0-9ğüşıöç]+/g, '-').replace(/^-|-$/g, '');
        setSaving(true);
        try {
            const created = await adminApi.createRoom({ name, slug });
            showStatus('success', 'Oda oluşturuldu');
            setNewRoomName('');
            setShowCreateForm(false);
            await loadRooms();
            if (created?.id) setSelectedRoomId(created.id);
        } catch (e: any) {
            showStatus('error', e.message || 'Oda oluşturulamadı');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="admin-split" style={{ position: 'relative' }}>
            <ToastPortal msg={toastMsg} />

            {/* ─── Sol Panel: Oda Listesi ─── */}
            <div className="admin-split-left">
                <div className="admin-toolbar">
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Odalar</span>
                    <div style={{ flex: 1 }} />
                    <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={loadRooms} title="Yenile">
                        <RefreshCw style={{ width: 12, height: 12, ...(loading ? { animation: 'adminSpin 0.6s linear infinite' } : {}) }} />
                    </button>
                    {isGodMaster && (
                        <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => setShowCreateForm(prev => !prev)} disabled={saving} title="Oda Ekle" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                            <Plus style={{ width: 12, height: 12 }} />
                            Oda Ekle
                        </button>
                    )}
                </div>

                {/* Inline Create Form */}
                {showCreateForm && (
                    <div style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid rgba(100,116,139,0.15)',
                        background: 'linear-gradient(180deg, rgba(226,232,240,0.4) 0%, transparent 100%)',
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                    }}>
                        <input
                            type="text"
                            value={newRoomName}
                            onChange={e => setNewRoomName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowCreateForm(false); setNewRoomName(''); } }}
                            placeholder="Oda adı yazın..."
                            autoFocus
                            style={{
                                flex: 1,
                                background: 'rgba(148,163,184,0.15)',
                                border: '1px solid rgba(37,99,235,0.12)',
                                borderRadius: 8,
                                padding: '7px 12px',
                                color: '#0f172a',
                                fontSize: 12,
                                outline: 'none',
                            }}
                        />
                        <button
                            className="admin-btn admin-btn-success admin-btn-sm"
                            onClick={handleCreate}
                            disabled={saving || !newRoomName.trim()}
                            style={{ fontSize: 12, padding: '5px 12px' }}
                        >
                            {saving ? '...' : 'Oluştur'}
                        </button>
                        <button
                            className="admin-btn admin-btn-ghost admin-btn-sm"
                            onClick={() => { setShowCreateForm(false); setNewRoomName(''); }}
                            style={{ fontSize: 12, padding: '5px 8px' }}
                        >
                            İptal
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="admin-loading">
                        <div className="admin-spinner" />
                        Yükleniyor...
                    </div>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>İsim</th>
                                    <th>Slug</th>
                                    <th>Şifre</th>
                                    <th>Durum</th>
                                    <th style={{ textAlign: 'center' }}>Çevrimiçi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rooms.filter(r => !r.isMeetingRoom).map(room => (
                                    <tr
                                        key={room.id}
                                        className={selectedRoomId === room.id ? 'selected' : ''}
                                        onClick={() => setSelectedRoomId(room.id)}
                                    >
                                        <td style={{ fontWeight: 600 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Home style={{ width: 11, height: 11, color: '#334155' }} />
                                                {room.name}
                                            </div>
                                        </td>
                                        <td style={{ color: '#334155', fontSize: 10 }}>{room.slug}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {room.password ? (
                                                <Lock style={{ width: 11, height: 11, color: '#f59e0b' }} />
                                            ) : (
                                                <Unlock style={{ width: 11, height: 11, color: '#1e293b' }} />
                                            )}
                                        </td>
                                        <td>
                                            {(() => {
                                                const online = room._count?.participants ?? 0;
                                                const isClosed = room.status?.toUpperCase() === 'CLOSED';
                                                let statusColor = '#6b7280';
                                                let statusShadow = 'none';
                                                let statusLabel = 'Boş';
                                                if (isClosed) {
                                                    statusLabel = 'Kapalı';
                                                } else if (online > 0) {
                                                    statusColor = '#22c55e';
                                                    statusShadow = '0 0 6px rgba(34,197,94,0.5)';
                                                    statusLabel = 'Aktif';
                                                } else {
                                                    statusColor = '#94a3b8';
                                                    statusLabel = 'Boş';
                                                }
                                                return (
                                                    <>
                                                        <span className="status-dot" style={{ background: statusColor, boxShadow: statusShadow, marginRight: 5 }} />
                                                        <span style={{ fontSize: 12, color: '#475569' }}>{statusLabel}</span>
                                                    </>
                                                );
                                            })()}
                                        </td>
                                        <td style={{ textAlign: 'center', color: '#334155', fontSize: 12, fontWeight: 600 }}>
                                            {(room._count?.participants ?? 0)}{room.maxParticipants ? `/${room.maxParticipants}` : ''}
                                        </td>
                                    </tr>
                                ))}
                                {rooms.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: 30, color: '#1e293b' }}>
                                            Henüz oda yok
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{
                    padding: '10px 16px',
                    borderTop: '1px solid rgba(37,99,235,0.08)',
                    fontSize: 12,
                    color: '#1e293b',
                    flexShrink: 0,
                    background: 'rgba(241,245,249,0.3)',
                }}>
                    Toplam: <span className="admin-count">{rooms.filter(r => !r.isMeetingRoom).length}</span> oda
                </div>
            </div>

            {/* ─── Sağ Panel: Oda Detayı ─── */}
            <div className="admin-split-right">
                {!selectedRoom ? (
                    <div className="admin-empty">
                        <div className="admin-empty-icon">🏠</div>
                        <div className="admin-empty-text">Oda Seçin</div>
                        <div className="admin-empty-sub">Detayları görüntülemek için sol listeden bir oda seçin</div>
                    </div>
                ) : (
                    <>
                        {/* Premium Header */}
                        <div className="admin-user-profile-header">
                            <div style={{
                                width: 42, height: 42, borderRadius: 12,
                                background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(37,99,235,0.06))',
                                border: '2px solid rgba(37,99,235,0.18)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                                fontSize: 18,
                            }}>
                                🏠
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{selectedRoom.name}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#334155' }}>
                                    {(() => {
                                        const online = selectedRoom._count?.participants ?? 0;
                                        const isClosed = selectedRoom.status?.toUpperCase() === 'CLOSED';
                                        let dotColor = '#94a3b8';
                                        let dotShadow = 'none';
                                        let label = 'Boş';
                                        if (isClosed) { label = 'Kapalı'; dotColor = '#6b7280'; }
                                        else if (online > 0) { label = `Aktif (${online} kişi)`; dotColor = '#22c55e'; dotShadow = '0 0 6px rgba(34,197,94,0.5)'; }
                                        return (
                                            <>
                                                <span className="status-dot" style={{ background: dotColor, boxShadow: dotShadow }} />
                                                <span style={{ fontSize: 12 }}>{label}</span>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="admin-form-row">
                            <div className="admin-form-group">
                                <label>İsim</label>
                                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Oda adı" />
                            </div>
                        </div>

                        <div className="admin-form-row">
                            <div className="admin-form-group">
                                <label>Şifre</label>
                                <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="Şifresiz" />
                            </div>
                            {isGodMaster && (
                                <div className="admin-form-group">
                                    <label>Max Katılımcı</label>
                                    <input type="number" value={formMax} onChange={e => setFormMax(e.target.value ? Number(e.target.value) : '')} placeholder="Sınırsız" />
                                </div>
                            )}
                        </div>

                        <div className="admin-form-group">
                            <label>Duyuru / Haberler</label>
                            <textarea
                                value={formAnnouncement}
                                onChange={e => setFormAnnouncement(e.target.value)}
                                placeholder="Oda duyurusu..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    background: 'rgba(148,163,184,0.12)',
                                    border: '1px solid rgba(37,99,235,0.1)',
                                    borderRadius: 8,
                                    padding: '8px 12px',
                                    color: '#0f172a',
                                    fontSize: 12,
                                    outline: 'none',
                                    resize: 'vertical',
                                    transition: 'border-color 0.2s',
                                }}
                            />
                        </div>

                        {isGodMaster && systemSettings?.packageType === 'CAMERA' && (
                            <div className="admin-form-row">
                                <div className="admin-form-group">
                                    <label>Mikrofon Limiti</label>
                                    <input type="number" value={formMicLimit} onChange={e => setFormMicLimit(e.target.value ? Number(e.target.value) : '')} placeholder="Sınırsız" />
                                </div>
                                <div className="admin-form-group">
                                    <label>Kamera Limiti</label>
                                    <input type="number" value={formCameraLimit} onChange={e => setFormCameraLimit(e.target.value ? Number(e.target.value) : '')} placeholder="Sınırsız" />
                                </div>
                            </div>
                        )}

                        <div className="admin-divider" />

                        {/* Oda Ayarları (Checkbox'lar) */}
                        <div className="admin-perms-section">
                            <div className="admin-perms-title">
                                <Home style={{ width: 12, height: 12 }} />
                                Oda Ayarları
                            </div>
                            <div className="admin-perms-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                                <div className="admin-perm-item" onClick={() => setFormLocked(!formLocked)}>
                                    <input type="checkbox" checked={formLocked} onChange={() => setFormLocked(!formLocked)} onClick={e => e.stopPropagation()} />
                                    <label>Kilitli</label>
                                </div>
                                <div className="admin-perm-item" onClick={() => setFormPublic(!formPublic)}>
                                    <input type="checkbox" checked={formPublic} onChange={() => setFormPublic(!formPublic)} onClick={e => e.stopPropagation()} />
                                    <label>Herkese Açık</label>
                                </div>

                                <div className="admin-perm-item" onClick={() => setFormVip(!formVip)}>
                                    <input type="checkbox" checked={formVip} onChange={() => setFormVip(!formVip)} onClick={e => e.stopPropagation()} />
                                    <label>VIP Oda</label>
                                </div>
                                {systemSettings?.packageType === 'CAMERA' && (
                                    <div className="admin-perm-item" onClick={() => setFormCameraAllowed(!formCameraAllowed)}>
                                        <input type="checkbox" checked={formCameraAllowed} onChange={() => setFormCameraAllowed(!formCameraAllowed)} onClick={e => e.stopPropagation()} />
                                        <label>Kameraya İzin Ver</label>
                                    </div>
                                )}
                            </div>

                            {/* Oda Düğme Rengi */}
                            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <label style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>Düğme Rengi</label>
                                <input
                                    type="color"
                                    value={formButtonColor || '#6366f1'}
                                    onChange={e => setFormButtonColor(e.target.value)}
                                    style={{
                                        width: 32, height: 24,
                                        border: '1px solid rgba(100,116,139,0.2)',
                                        borderRadius: 6,
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        padding: 0,
                                    }}
                                />
                                {formButtonColor && (
                                    <button
                                        className="admin-btn admin-btn-ghost admin-btn-sm"
                                        onClick={() => setFormButtonColor('')}
                                        style={{ fontSize: 9, padding: '2px 8px' }}
                                    >
                                        Temizle
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ─── Oda Teması (GodMaster Only) ─── */}
                        {isGodMaster && (
                            <div className="admin-perms-section" style={{ marginTop: 4 }}>
                                <div className="admin-perms-title">
                                    <Palette style={{ width: 12, height: 12 }} />
                                    Oda Teması
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 4 }}>
                                    {AVAILABLE_THEMES.map(t => (
                                        <div
                                            key={t.id}
                                            onClick={() => setFormTheme(t.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '8px 12px',
                                                borderRadius: 8,
                                                cursor: 'pointer',
                                                border: formTheme === t.id
                                                    ? '1.5px solid rgba(37,99,235,0.35)'
                                                    : '1px solid rgba(148,163,184,0.15)',
                                                background: formTheme === t.id
                                                    ? 'rgba(37,99,235,0.1)'
                                                    : 'rgba(226,232,240,0.4)',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <span style={{ fontSize: 16 }}>{t.emoji}</span>
                                            <span style={{
                                                fontSize: 11,
                                                fontWeight: formTheme === t.id ? 700 : 500,
                                                color: formTheme === t.id ? '#a3bfff' : 'rgba(30,41,59,0.6)',
                                            }}>
                                                {t.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}



                        <div className="admin-divider" />

                        {/* Inline Confirm — GodMaster only */}
                        {isGodMaster && confirmDelete === selectedRoom.id ? (
                            <div className="admin-inline-confirm">
                                <span>"{selectedRoom.name}" odası silinecek. Emin misiniz?</span>
                                <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={executeDelete}>Evet, Sil</button>
                                <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setConfirmDelete(null)}>İptal</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                                <button className="admin-btn admin-btn-success" onClick={handleSave} disabled={saving}>
                                    <Save style={{ width: 13, height: 13 }} />
                                    {saving ? 'Kaydediliyor...' : 'Değiştir'}
                                </button>
                                <button
                                    className={`admin-btn ${selectedRoom.status?.toUpperCase() === 'CLOSED' ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
                                    disabled={saving}
                                    onClick={async () => {
                                        setSaving(true);
                                        try {
                                            const isClosed = selectedRoom.status?.toUpperCase() === 'CLOSED';
                                            if (isClosed) {
                                                // Odayı aç — status WAITING, isLocked false
                                                await adminApi.updateRoom(selectedRoom.id, { status: 'WAITING', isLocked: false });
                                                showStatus('success', `"${selectedRoom.name}" odası açıldı.`);
                                            } else {
                                                // Odayı kapat — status CLOSED, isLocked true
                                                await adminApi.updateRoom(selectedRoom.id, { status: 'CLOSED', isLocked: true });
                                                showStatus('success', `"${selectedRoom.name}" odası kapatıldı.`);
                                            }
                                            loadRooms();
                                        } catch (e: any) {
                                            showStatus('error', e.message);
                                        } finally {
                                            setSaving(false);
                                        }
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    {selectedRoom.status?.toUpperCase() === 'CLOSED' ? (
                                        <><Unlock style={{ width: 13, height: 13 }} /> Odayı Aç</>
                                    ) : (
                                        <><Lock style={{ width: 13, height: 13 }} /> Odayı Kapat</>
                                    )}
                                </button>
                                {isGodMaster && (
                                    <button className="admin-btn admin-btn-danger" onClick={() => setConfirmDelete(selectedRoom.id)}>
                                        <Trash2 style={{ width: 13, height: 13 }} />
                                        Sil
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
