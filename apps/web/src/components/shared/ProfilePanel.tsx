'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { API_URL } from '@/lib/api';
import { getAuthUser, setAuthUser, AuthUser } from '@/lib/auth';

const AUTH_TOKEN_KEY = 'soprano_auth_token';

const ALL_AVATARS = [
    '/avatars/male_1.png', '/avatars/male_2.png', '/avatars/male_3.png', '/avatars/male_4.png',
    '/avatars/female_1.png', '/avatars/female_2.png', '/avatars/female_3.png', '/avatars/female_4.png',
    '/avatars/neutral_1.png', '/avatars/neutral_2.png', '/avatars/neutral_3.png', '/avatars/neutral_4.png',
];

const NAME_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
    '#ffffff', '#94a3b8', '#64748b', '#fbbf24', '#34d399', '#60a5fa',
];

const ROLE_LEVELS: Record<string, number> = { guest: 0, member: 1, vip: 2, operator: 3, moderator: 4, admin: 5, super_admin: 6, owner: 7, godmaster: 8 };

const ALL_TABS = [
    { id: 'avatar', label: 'Avatar', icon: '🖼️' },
    { id: 'name', label: 'İsim', icon: '✏️' },
    { id: 'color', label: 'Renk', icon: '🎨' },
    { id: 'password', label: 'Şifre', icon: '🔒' },
];

interface ProfilePanelProps {
    isOpen: boolean;
    onClose: () => void;
    /** If provided, emits user:profileUpdate after REST API update */
    socket?: any;
}

/**
 * ★ PAYLAŞILAN PROFİL PANELİ — Tek doğru kaynak (REST API)
 * Hem HomePage hesap paneli hem de chat odası profil ayarları için kullanılır.
 * Tüm profil değişiklikleri REST API `/auth/update-profile` üzerinden yapılır.
 * Senkronizasyon sorunları kökten ortadan kalkar.
 */
export function ProfilePanel({ isOpen, onClose, socket }: ProfilePanelProps) {
    const [activeTab, setActiveTab] = useState('avatar');
    const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('');
    const [newName, setNewName] = useState('');
    const [selectedColor, setSelectedColor] = useState('#ffffff');
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Current user from sessionStorage
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        if (isOpen) {
            const u = getAuthUser();
            setUser(u);
            setSelectedAvatarUrl(u?.avatar || '/avatars/neutral_1.png');
            setNewName(u?.displayName || u?.username || '');
            setSelectedColor((u as any)?.nameColor || '#ffffff');
            setOldPass(''); setNewPass(''); setConfirmPass('');
            setError(''); setSuccessMsg('');
            setActiveTab('avatar');
        }
    }, [isOpen]);

    const userLevel = ROLE_LEVELS[(user?.role || 'guest').toLowerCase()] || 0;
    const isMember = user?.isMember || userLevel >= 1;

    const TABS = useMemo(() =>
        ALL_TABS.filter(tab =>
            (tab.id !== 'color' || userLevel >= 2) &&
            (tab.id !== 'password' || isMember)
        ), [userLevel, isMember]
    );

    // ★ TEK GÜNCELLEME YOLU — REST API
    const handleUpdate = async (field: 'displayName' | 'avatar' | 'nameColor', value: string) => {
        setSaving(true); setError(''); setSuccessMsg('');
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) ||
                           sessionStorage.getItem('soprano_tenant_token');
            const res = await fetch(`${API_URL}/auth/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ [field === 'nameColor' ? 'nameColor' : field]: value }),
            });
            if (res.ok) {
                const result = await res.json();
                // Yeni JWT token kaydet
                if (result.access_token) {
                    const isTenant = typeof window !== 'undefined' && window.location.pathname.startsWith('/t/');
                    sessionStorage.setItem(isTenant ? 'soprano_tenant_token' : AUTH_TOKEN_KEY, result.access_token);
                }
                // Backend'den dönen user ile state güncelle
                if (result.user && user) {
                    const u = { ...user, ...result.user };
                    setAuthUser(u);
                    setUser(u);
                    // Her iki sessionStorage key'ini de güncelle
                    for (const key of ['soprano_auth_user', 'soprano_tenant_user']) {
                        const raw = sessionStorage.getItem(key);
                        if (raw) {
                            const stored = JSON.parse(raw);
                            if (field === 'avatar') stored.avatar = value;
                            if (field === 'displayName') { stored.displayName = value; stored.username = value; }
                            if (field === 'nameColor') stored.nameColor = value;
                            sessionStorage.setItem(key, JSON.stringify(stored));
                        }
                    }
                    // Tüm bileşenlere bildir
                    window.dispatchEvent(new Event('auth-change'));
                    // Socket varsa backend participant'ı da güncelle
                    if (socket?.connected) {
                        socket.emit('user:profileUpdate', {
                            displayName: u.displayName || u.username,
                            avatar: u.avatar,
                            nameColor: (u as any).nameColor,
                        });
                    }
                }
                setSuccessMsg('✅ Güncellendi!');
                setTimeout(() => setSuccessMsg(''), 2000);
            } else {
                setError('❌ Güncelleme başarısız.');
            }
        } catch { setError('❌ Bağlantı hatası.'); } finally { setSaving(false); }
    };

    const handlePasswordChange = async () => {
        if (!oldPass || !newPass) { setError('Tüm alanları doldurun'); return; }
        if (newPass.length < 4) { setError('Şifre en az 4 karakter'); return; }
        if (newPass !== confirmPass) { setError('Şifreler eşleşmiyor'); return; }
        setSaving(true); setError(''); setSuccessMsg('');
        try {
            const token = sessionStorage.getItem(AUTH_TOKEN_KEY) ||
                           sessionStorage.getItem('soprano_tenant_token');
            const res = await fetch(`${API_URL}/auth/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ password: newPass }),
            });
            if (res.ok) {
                setSuccessMsg('✅ Şifre değiştirildi!');
                setOldPass(''); setNewPass(''); setConfirmPass('');
                setTimeout(() => setSuccessMsg(''), 2000);
            } else {
                const data = await res.json().catch(() => ({}));
                setError(data.message || '❌ Şifre değiştirme başarısız.');
            }
        } catch { setError('❌ Bağlantı hatası.'); } finally { setSaving(false); }
    };

    if (!isOpen) return null;

    const content = (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{
                width: 340, maxHeight: '80vh', overflow: 'auto',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: 16, border: '1px solid rgba(56,189,248,0.15)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(56,189,248,0.08)',
                padding: 16,
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            border: '2px solid rgba(56,189,248,0.3)',
                            overflow: 'hidden', flexShrink: 0,
                        }}>
                            <img src={user?.avatar || '/avatars/neutral_1.png'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{user?.displayName || user?.username || '—'}</div>
                            <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                                {user?.isMember ? '👑 ÜYE' : '👤 MİSAFİR'} • {user?.role || 'guest'}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, width: 28, height: 28, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#94a3b8', fontSize: 14, fontWeight: 700,
                    }}>✕</button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => { setActiveTab(tab.id); setError(''); setSuccessMsg(''); }}
                            style={{
                                flex: 1, padding: '5px 0', fontSize: 9, fontWeight: 700,
                                border: 'none', borderRadius: 6, cursor: 'pointer',
                                transition: 'all 0.2s',
                                background: activeTab === tab.id ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                                color: activeTab === tab.id ? '#60a5fa' : '#64748b',
                                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                            }}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Status */}
                {(error || successMsg) && (
                    <div style={{
                        fontSize: 10, padding: '4px 8px', borderRadius: 6, marginBottom: 8,
                        background: error ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                        color: error ? '#ef4444' : '#22c55e', fontWeight: 600,
                    }}>{error || successMsg}</div>
                )}

                {/* ═══ AVATAR TAB ═══ */}
                {activeTab === 'avatar' && (
                    <div>
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
                            padding: 4, borderRadius: 8,
                            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                        }}>
                            {ALL_AVATARS.map(av => {
                                const isSelected = selectedAvatarUrl === av;
                                return (
                                    <button key={av} onClick={() => setSelectedAvatarUrl(av)}
                                        style={{
                                            padding: 2, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                                            background: isSelected ? 'rgba(59,130,246,0.15)' : 'transparent',
                                            border: isSelected ? '1.5px solid rgba(59,130,246,0.5)' : '1.5px solid transparent',
                                            transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                                        }}>
                                        <img src={av} alt="" style={{ width: '100%', aspectRatio: '1', borderRadius: 6, objectFit: 'cover' }} />
                                    </button>
                                );
                            })}
                        </div>
                        <button disabled={saving} onClick={() => handleUpdate('avatar', selectedAvatarUrl)}
                            style={{
                                width: '100%', padding: '7px 0', fontSize: 10, fontWeight: 700, marginTop: 8,
                                color: '#fff', borderRadius: 8, border: 'none', cursor: saving ? 'wait' : 'pointer',
                                background: saving ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                boxShadow: '0 2px 10px rgba(59,130,246,0.3)',
                            }}>{saving ? '⏳ Kaydediliyor...' : 'Avatarı Kaydet'}</button>
                    </div>
                )}

                {/* ═══ NAME TAB ═══ */}
                {activeTab === 'name' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                            <label style={{ fontSize: 9, color: '#64748b', display: 'block', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mevcut İsim</label>
                            <div style={{
                                fontSize: 12, color: '#e2e8f0', fontWeight: 600,
                                background: 'rgba(255,255,255,0.04)', borderRadius: 8,
                                padding: '6px 10px', border: '1px solid rgba(255,255,255,0.08)',
                            }}>{user?.displayName || user?.username || '—'}</div>
                        </div>
                        <div>
                            <label style={{ fontSize: 9, color: '#64748b', display: 'block', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Yeni İsim</label>
                            <input value={newName} onChange={(e) => { setNewName(e.target.value); setError(''); }}
                                maxLength={20} placeholder="Yeni isminizi yazın..."
                                style={{
                                    width: '100%', fontSize: 11, color: '#e2e8f0', borderRadius: 8,
                                    padding: '6px 10px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.04)', outline: 'none',
                                }}
                            />
                        </div>
                        <button disabled={saving} onClick={() => {
                            if (!newName.trim() || newName.trim().length < 2) { setError('En az 2 karakter'); return; }
                            handleUpdate('displayName', newName.trim());
                        }} style={{
                            width: '100%', padding: '7px 0', fontSize: 10, fontWeight: 700,
                            color: '#fff', borderRadius: 8, border: 'none', cursor: saving ? 'wait' : 'pointer',
                            background: saving ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            boxShadow: '0 2px 10px rgba(59,130,246,0.3)',
                        }}>{saving ? '⏳ Kaydediliyor...' : 'İsmi Değiştir'}</button>
                    </div>
                )}

                {/* ═══ COLOR TAB ═══ */}
                {activeTab === 'color' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{
                            textAlign: 'center', padding: '8px 0',
                            borderRadius: 8, background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color: selectedColor, textShadow: `0 0 12px ${selectedColor}40` }}>
                                {user?.displayName || user?.username || 'Kullanıcı'}
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5, justifyItems: 'center' }}>
                            {NAME_COLORS.map(c => (
                                <button key={c} onClick={() => setSelectedColor(c)} style={{
                                    width: 26, height: 26, borderRadius: 7, cursor: 'pointer', transition: 'all 0.2s',
                                    background: c,
                                    border: selectedColor === c ? '2px solid #fff' : '2px solid rgba(255,255,255,0.1)',
                                    boxShadow: selectedColor === c ? `0 0 12px ${c}60, 0 0 4px rgba(255,255,255,0.3)` : 'none',
                                    transform: selectedColor === c ? 'scale(1.15)' : 'scale(1)',
                                }} />
                            ))}
                        </div>
                        <button disabled={saving} onClick={() => handleUpdate('nameColor', selectedColor)} style={{
                            width: '100%', padding: '7px 0', fontSize: 10, fontWeight: 700,
                            color: '#fff', borderRadius: 8, border: 'none', cursor: saving ? 'wait' : 'pointer',
                            background: saving ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            boxShadow: '0 2px 10px rgba(59,130,246,0.3)',
                        }}>{saving ? '⏳ Kaydediliyor...' : 'Rengi Kaydet'}</button>
                    </div>
                )}

                {/* ═══ PASSWORD TAB ═══ */}
                {activeTab === 'password' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[
                            { label: 'Mevcut Şifre', value: oldPass, set: setOldPass, name: 'otp1' },
                            { label: 'Yeni Şifre', value: newPass, set: setNewPass, name: 'otp2' },
                            { label: 'Şifre Tekrar', value: confirmPass, set: setConfirmPass, name: 'otp3' },
                        ].map(f => (
                            <div key={f.name}>
                                <label style={{ fontSize: 9, color: '#64748b', display: 'block', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</label>
                                <input type="password" value={f.value} onChange={(e) => f.set(e.target.value)}
                                    autoComplete="one-time-code" name={f.name}
                                    style={{
                                        width: '100%', fontSize: 11, color: '#e2e8f0', borderRadius: 8,
                                        padding: '6px 10px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        background: 'rgba(255,255,255,0.04)', outline: 'none',
                                    }}
                                />
                            </div>
                        ))}
                        <button disabled={saving} onClick={handlePasswordChange} style={{
                            width: '100%', padding: '7px 0', fontSize: 10, fontWeight: 700,
                            color: '#fff', borderRadius: 8, border: 'none', cursor: saving ? 'wait' : 'pointer',
                            background: saving ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            boxShadow: '0 2px 10px rgba(59,130,246,0.3)',
                        }}>{saving ? '⏳ Kaydediliyor...' : 'Şifreyi Değiştir'}</button>
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
