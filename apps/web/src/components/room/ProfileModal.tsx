'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { generateGenderAvatar } from '@/lib/avatar';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: any;
    onChangeName: (name: string) => void;
    onChangeAvatar: (avatar: string) => void;
    onChangeNameColor: (color: string) => void;
    onChangePassword: (oldPass: string, newPass: string) => void;
}

const ALL_TABS = [
    { id: 'look', label: 'Görünüm', icon: '✨' },
    { id: 'avatar', label: 'Avatar', icon: '🖼️' },
    { id: 'name', label: 'İsim', icon: '✏️' },
    { id: 'color', label: 'Renk', icon: '🎨' },
    { id: 'password', label: 'Şifre', icon: '🔒' },
];

const ROLE_LEVELS: Record<string, number> = { guest: 0, member: 1, vip: 2, operator: 3, moderator: 4, admin: 5, super_admin: 6, owner: 7 };

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

export function ProfileModal({
    isOpen, onClose, currentUser, onChangeName, onChangeAvatar, onChangeNameColor, onChangePassword
}: ProfileModalProps) {
    const [activeTab, setActiveTab] = useState('avatar');
    const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('/avatars/neutral_1.png');
    const [newName, setNewName] = useState('');
    const [selectedColor, setSelectedColor] = useState('#ffffff');
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [error, setError] = useState('');

    const currentAvatar = currentUser?.avatar || '';
    const hasAnimatedNick = (() => {
        if (currentAvatar.startsWith('animated:')) return true;
        if (currentAvatar.startsWith('gifnick::')) {
            const parts = currentAvatar.split('::');
            return !!(parts[1] && parts[1].length > 0);
        }
        return false;
    })();
    const savedAnimatedNick = typeof window !== 'undefined' ? localStorage.getItem('soprano_animated_nick') : null;
    const showLookTab = hasAnimatedNick;
    const [useAnimatedNick, setUseAnimatedNick] = useState(hasAnimatedNick);

    const userLevel = ROLE_LEVELS[currentUser?.role || 'guest'] || 0;
    const TABS = useMemo(() =>
        ALL_TABS.filter(tab =>
            (tab.id !== 'color' || userLevel >= 2) &&
            (tab.id !== 'look' || showLookTab)
        ), [userLevel, showLookTab]
    );

    // Draggable
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [centered, setCentered] = useState(true);
    const dragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            const av = currentUser?.avatar || '';
            const isAnimated = av.startsWith('animated:') || av.startsWith('gifnick::');
            setActiveTab(showLookTab ? 'look' : 'avatar');
            setUseAnimatedNick(isAnimated);
            if (isAnimated) { try { localStorage.setItem('soprano_animated_nick', av); } catch (e) { } }
            else { try { localStorage.removeItem('soprano_animated_nick'); } catch (e) { } }
            setNewName(currentUser?.username || '');
            setSelectedColor(currentUser?.nameColor || '#ffffff');
            setSelectedAvatarUrl(currentUser?.avatar || '/avatars/neutral_1.png');
            setOldPass(''); setNewPass(''); setConfirmPass('');
            setError(''); setCentered(true);
        }
    }, [isOpen, currentUser, showLookTab]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!modalRef.current) return;
        if (centered) {
            const rect = modalRef.current.getBoundingClientRect();
            setPosition({ x: rect.left, y: rect.top });
            dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            setCentered(false);
        } else {
            dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        }
        dragging.current = true; e.preventDefault();
    }, [centered, position]);

    useEffect(() => {
        const move = (e: MouseEvent) => {
            if (!dragging.current) return;
            setPosition({ x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x)), y: Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.current.y)) });
        };
        const up = () => { dragging.current = false; };
        window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const modalStyle: React.CSSProperties = centered
        ? { position: 'relative' }
        : { position: 'fixed', left: position.x, top: position.y, zIndex: 10001 };

    const content = (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center" onClick={onClose}
            style={centered ? { paddingTop: '18vh' } : { display: 'block' }}
        >
            {/* Backdrop */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)' }} />

            {/* Modal */}
            <div
                ref={modalRef}
                className="animate-pure-fade"
                onClick={(e) => e.stopPropagation()}
                style={{
                    ...modalStyle,
                    width: 300,
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                }}
            >
                {/* ── Header ── */}
                <div
                    onMouseDown={handleMouseDown}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px',
                        cursor: 'move', userSelect: 'none',
                        background: 'linear-gradient(90deg, rgba(59,130,246,0.15) 0%, rgba(147,51,234,0.1) 100%)',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Current avatar mini */}
                        <img
                            src={currentUser?.avatar?.startsWith('animated:') || currentUser?.avatar?.startsWith('gifnick::')
                                ? '/avatars/neutral_1.png'
                                : (currentUser?.avatar || '/avatars/neutral_1.png')
                            }
                            alt=""
                            style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.2)' }}
                        />
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.03em' }}>
                                {currentUser?.displayName || currentUser?.username || 'Profil'}
                            </div>
                            <div style={{ fontSize: 8, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em' }}>
                                {currentUser?.role || 'guest'}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        width: 22, height: 22, borderRadius: 6,
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                        transition: 'all 0.2s',
                    }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#f87171'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                    >✕</button>
                </div>

                {/* ── Tabs ── */}
                <div style={{
                    display: 'flex', gap: 1, padding: '6px 8px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setError(''); }}
                                style={{
                                    flex: 1, padding: '5px 0 6px', fontSize: 9, fontWeight: 700, cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    color: isActive ? '#60a5fa' : '#64748b',
                                    background: 'transparent',
                                    borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                                    border: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                                    letterSpacing: '0.04em',
                                }}
                            >{tab.icon} {tab.label}</button>
                        );
                    })}
                </div>

                {/* ── Content ── */}
                <div style={{ padding: '10px 12px 12px' }}>

                    {/* ═══ LOOK TAB ═══ */}
                    {activeTab === 'look' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', margin: 0 }}>Yönetici tarafından size hareketli bir nick atanmış.</p>
                            {(() => {
                                const animNick = (hasAnimatedNick ? currentAvatar : savedAnimatedNick) || '';
                                const isAnimType = animNick.startsWith('animated:');
                                const isGifType = animNick.startsWith('gifnick::');
                                if (isAnimType) {
                                    const parts = animNick.split(':'); const cls = parts[1] || 'shimmer-gold'; const fontSize = parseInt(parts[2]) || 13;
                                    const text = parts.slice(4).join(':') || currentUser?.username || 'Kullanıcı';
                                    return (<div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}><span className={`animated-nick ${cls}`} style={{ fontSize }}>{text}</span></div>);
                                } else if (isGifType) {
                                    const parts = animNick.split('::'); const gifUrl = parts[1] || '';
                                    if (!gifUrl) return null;
                                    return (<div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}><img src={gifUrl} alt="GIF Nick" style={{ maxHeight: 32, objectFit: 'contain' }} /></div>);
                                }
                                return null;
                            })()}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                {[{ on: true, label: '✨ Hareketli' }, { on: false, label: '👤 Normal' }].map(opt => (
                                    <button key={opt.label} onClick={() => setUseAnimatedNick(opt.on)}
                                        style={{
                                            padding: '7px 0', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                            background: useAnimatedNick === opt.on ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                                            border: useAnimatedNick === opt.on ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                            color: useAnimatedNick === opt.on ? '#60a5fa' : '#64748b',
                                        }}
                                    >{opt.label}</button>
                                ))}
                            </div>
                            <button
                                onClick={() => {
                                    const animNick = currentAvatar?.startsWith('animated:') || currentAvatar?.startsWith('gifnick::')
                                        ? currentAvatar : (savedAnimatedNick || '');
                                    if (useAnimatedNick && animNick) {
                                        onChangeAvatar(animNick);
                                        try { localStorage.setItem('soprano_animated_nick', animNick); } catch (e) { }
                                    } else {
                                        if (animNick) { try { localStorage.setItem('soprano_animated_nick', animNick); } catch (e) { } }
                                        onChangeAvatar('/avatars/neutral_1.png');
                                    }
                                    onClose();
                                }}
                                style={{
                                    width: '100%', padding: '7px 0', fontSize: 10, fontWeight: 700,
                                    color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                    boxShadow: '0 2px 10px rgba(59,130,246,0.3)',
                                }}
                            >Kaydet</button>
                        </div>
                    )}

                    {/* ═══ AVATAR TAB ═══ */}
                    {activeTab === 'avatar' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {/* Current preview */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <div style={{
                                    width: 52, height: 52, borderRadius: 12, overflow: 'hidden',
                                    border: '2px solid rgba(59,130,246,0.4)',
                                    boxShadow: '0 0 20px rgba(59,130,246,0.15)',
                                }}>
                                    <img src={selectedAvatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            </div>
                            {/* Avatar grid */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4,
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
                                            }}
                                        >
                                            <img src={av} alt="" style={{ width: '100%', aspectRatio: '1', borderRadius: 6, objectFit: 'cover' }} />
                                        </button>
                                    );
                                })}
                            </div>
                            <button onClick={() => {
                                const currentAv = currentUser?.avatar || '';
                                const isCurrentlyAnimated = currentAv.startsWith('animated:') || currentAv.startsWith('gifnick::');
                                if (isCurrentlyAnimated) {
                                    try { sessionStorage.setItem('soprano_custom_avatar', selectedAvatarUrl); } catch (e) { }
                                    onClose();
                                } else {
                                    onChangeAvatar(selectedAvatarUrl);
                                    onClose();
                                }
                            }} style={{
                                width: '100%', padding: '7px 0', fontSize: 10, fontWeight: 700,
                                color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                boxShadow: '0 2px 10px rgba(59,130,246,0.3)',
                            }}>Avatarı Kaydet</button>
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
                                }}>{currentUser?.username || '—'}</div>
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
                                {error && <span style={{ fontSize: 9, color: '#ef4444', display: 'block', marginTop: 3 }}>{error}</span>}
                            </div>
                            <button onClick={() => {
                                if (!newName.trim() || newName.trim().length < 2) { setError('En az 2 karakter'); return; }
                                onChangeName(newName.trim()); onClose();
                            }} style={{
                                width: '100%', padding: '7px 0', fontSize: 10, fontWeight: 700,
                                color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                boxShadow: '0 2px 10px rgba(59,130,246,0.3)',
                            }}>İsmi Değiştir</button>
                        </div>
                    )}

                    {/* ═══ COLOR TAB ═══ */}
                    {activeTab === 'color' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {/* Preview */}
                            <div style={{
                                textAlign: 'center', padding: '8px 0',
                                borderRadius: 8, background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                <span style={{ fontSize: 15, fontWeight: 800, color: selectedColor, textShadow: `0 0 12px ${selectedColor}40` }}>
                                    {currentUser?.username || 'Kullanıcı'}
                                </span>
                            </div>
                            {/* Color grid */}
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
                            <button onClick={() => { onChangeNameColor(selectedColor); onClose(); }} style={{
                                width: '100%', padding: '7px 0', fontSize: 10, fontWeight: 700,
                                color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                boxShadow: '0 2px 10px rgba(59,130,246,0.3)',
                            }}>Rengi Kaydet</button>
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
                            {error && <span style={{ fontSize: 9, color: '#ef4444' }}>{error}</span>}
                            <button onClick={() => {
                                if (!oldPass || !newPass) { setError('Tüm alanları doldurun'); return; }
                                if (newPass.length < 4) { setError('Şifre en az 4 karakter'); return; }
                                if (newPass !== confirmPass) { setError('Şifreler eşleşmiyor'); return; }
                                onChangePassword(oldPass, newPass); onClose();
                            }} style={{
                                width: '100%', padding: '7px 0', fontSize: 10, fontWeight: 700,
                                color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer',
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                boxShadow: '0 2px 10px rgba(59,130,246,0.3)',
                            }}>Şifreyi Değiştir</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
