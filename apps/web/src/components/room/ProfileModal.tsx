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

const NAME_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
    '#ffffff', '#94a3b8', '#64748b', '#fbbf24', '#34d399', '#60a5fa',
];

// ── Admin panel renk sistemi ──
const MODAL_BG = 'linear-gradient(165deg, rgba(226,232,240,0.96) 0%, rgba(218,225,235,0.95) 50%, rgba(210,218,230,0.94) 100%)';
const MODAL_BORDER = '1px solid rgba(255,255,255,0.65)';
const MODAL_SHADOW = '0 20px 50px rgba(0,0,0,0.18), 0 6px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)';
const TEXT_PRIMARY = '#1e293b';
const TEXT_SECONDARY = '#475569';
const TEXT_MUTED = '#94a3b8';
const INPUT_BG = 'rgba(255,255,255,0.6)';
const INPUT_BORDER = '1px solid rgba(100,116,139,0.2)';
const TAB_ACTIVE_BG = 'rgba(30,58,95,0.1)';
const TAB_ACTIVE_COLOR = '#0f172a';
const TAB_ACTIVE_BORDER = '1px solid rgba(15,23,42,0.2)';
const BTN_BG = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';

export function ProfileModal({
    isOpen, onClose, currentUser, onChangeName, onChangeAvatar, onChangeNameColor, onChangePassword
}: ProfileModalProps) {
    const [activeTab, setActiveTab] = useState('avatar');
    const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('');
    const [newName, setNewName] = useState('');
    const [selectedColor, setSelectedColor] = useState('#ffffff');
    const [oldPass, setOldPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [error, setError] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['ERKEK', 'KADIN']));

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

    // ── Cinsiyet bazlı avatar filtreleme ──
    const userGender = (currentUser?.gender || '').toLowerCase();
    const avatarCategories = useMemo(() => {
        const male = { label: '👨 Erkek', avatars: ['/avatars/male_1.png', '/avatars/male_2.png', '/avatars/male_3.png', '/avatars/male_4.png'] };
        const female = { label: '👩 Kadın', avatars: ['/avatars/female_1.png', '/avatars/female_2.png', '/avatars/female_3.png', '/avatars/female_4.png'] };
        const neutral = { label: '🌟 Nötr', avatars: ['/avatars/neutral_1.png', '/avatars/neutral_2.png', '/avatars/neutral_3.png', '/avatars/neutral_4.png'] };
        if (userGender === 'erkek' || userGender === 'male') return [male, neutral];
        if (userGender === 'kadın' || userGender === 'kadin' || userGender === 'female') return [female, neutral];
        return [male, female, neutral];
    }, [userGender]);

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
            setSelectedAvatarUrl('');
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

    const avatarUrl = generateGenderAvatar(currentUser?.username || 'user');
    const modalStyle: React.CSSProperties = centered ? {} : { position: 'fixed', left: position.x, top: position.y, margin: 0, transform: 'none' };

    const inputStyle: React.CSSProperties = {
        width: '100%', fontSize: 12, color: TEXT_PRIMARY, borderRadius: 10,
        padding: '8px 12px', border: INPUT_BORDER, background: INPUT_BG, outline: 'none',
    };
    const btnStyle: React.CSSProperties = {
        width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 700, color: '#fff',
        borderRadius: 10, border: 'none', cursor: 'pointer', background: BTN_BG,
        boxShadow: '0 2px 12px rgba(30,58,95,0.2)',
    };

    const content = (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center p-4" onClick={onClose} style={centered ? { paddingTop: '15vh' } : { display: 'block' }}>
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.25)' }} />
            <div
                ref={modalRef}
                className="relative w-full max-w-sm animate-pure-fade"
                onClick={(e) => e.stopPropagation()}
                style={{
                    ...modalStyle,
                    background: MODAL_BG,
                    backdropFilter: 'blur(28px) saturate(130%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(130%)',
                    border: MODAL_BORDER, borderRadius: 14, boxShadow: MODAL_SHADOW, overflow: 'hidden',
                }}
            >
                {/* Header — koyu tema */}
                <div className="flex items-center justify-between px-4 py-2"
                    onMouseDown={handleMouseDown}
                    style={{ cursor: 'move', userSelect: 'none', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
                >
                    <h2 style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 6, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                        <span style={{ fontSize: 13 }}>👤</span> Profil Ayarları
                    </h2>
                    <button onClick={onClose} style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, transition: 'all 0.2s' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                    >✕</button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 2, padding: '6px 14px 4px' }}>
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => { setActiveTab(tab.id); setError(''); }}
                            style={{
                                flex: 1, padding: '4px 0', fontSize: 9, fontWeight: 600, borderRadius: 6, transition: 'all 0.2s', cursor: 'pointer',
                                background: activeTab === tab.id ? TAB_ACTIVE_BG : 'transparent',
                                color: activeTab === tab.id ? TAB_ACTIVE_COLOR : TEXT_MUTED,
                                border: activeTab === tab.id ? TAB_ACTIVE_BORDER : '1px solid transparent',
                            }}
                        >{tab.icon} {tab.label}</button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ padding: '8px 14px 12px', minHeight: 180 }}>
                    {activeTab === 'look' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <p style={{ fontSize: 10, color: TEXT_SECONDARY, textAlign: 'center', margin: 0 }}>Yönetici tarafından size hareketli bir nick atanmış.</p>
                            {(() => {
                                const animNick = (hasAnimatedNick ? currentAvatar : savedAnimatedNick) || '';
                                const isAnimType = animNick.startsWith('animated:');
                                const isGifType = animNick.startsWith('gifnick::');
                                if (isAnimType) {
                                    const parts = animNick.split(':'); const cls = parts[1] || 'shimmer-gold'; const fontSize = parseInt(parts[2]) || 13;
                                    const text = parts.slice(4).join(':') || currentUser?.username || 'Kullanıcı';
                                    return (<div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', borderRadius: 10, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(100,116,139,0.1)' }}><span className={`animated-nick ${cls}`} style={{ fontSize }}>{text}</span></div>);
                                } else if (isGifType) {
                                    const parts = animNick.split('::'); const gifUrl = parts[1] || '';
                                    if (!gifUrl) return null;
                                    return (<div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', borderRadius: 10, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(100,116,139,0.1)' }}><img src={gifUrl} alt="GIF Nick" style={{ maxHeight: 36, objectFit: 'contain' }} /></div>);
                                }
                                return null;
                            })()}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {[{ on: true, label: '✨ Hareketli Nick' }, { on: false, label: '👤 Normal İsim' }].map(opt => (
                                    <button key={opt.label} onClick={() => setUseAnimatedNick(opt.on)}
                                        style={{
                                            padding: '10px 0', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                            background: useAnimatedNick === opt.on ? TAB_ACTIVE_BG : 'rgba(255,255,255,0.4)',
                                            border: useAnimatedNick === opt.on ? '1.5px solid rgba(30,58,95,0.3)' : '1.5px solid rgba(100,116,139,0.15)',
                                            color: useAnimatedNick === opt.on ? TAB_ACTIVE_COLOR : TEXT_MUTED,
                                        }}
                                    >{opt.label}</button>
                                ))}
                            </div>
                            <button onClick={() => {
                                const animNick = currentAvatar?.startsWith('animated:') || currentAvatar?.startsWith('gifnick::') ? currentAvatar : (savedAnimatedNick || '');
                                if (useAnimatedNick && animNick) { onChangeAvatar(animNick); try { localStorage.setItem('soprano_animated_nick', animNick); } catch (e) { } }
                                else { if (animNick) { try { localStorage.setItem('soprano_animated_nick', animNick); } catch (e) { } } onChangeAvatar(generateGenderAvatar(currentUser?.username || 'user')); }
                                onClose();
                            }} style={btnStyle}>Görünümü Kaydet</button>
                        </div>
                    )}

                    {activeTab === 'avatar' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {/* Seçili avatar önizleme */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '8px 10px', borderRadius: 10,
                                background: 'linear-gradient(135deg, rgba(15,23,42,0.06) 0%, rgba(30,41,59,0.04) 100%)',
                                border: '1px solid rgba(15,23,42,0.08)',
                            }}>
                                <div style={{
                                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                                    background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                                    padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                }}>
                                    <img src={selectedAvatarUrl || currentUser?.avatar || avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: 10, objectFit: 'cover' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 800, color: TEXT_PRIMARY, margin: 0, letterSpacing: '0.01em' }}>Avatar Seç</p>
                                    <p style={{ fontSize: 10, color: TEXT_MUTED, margin: '2px 0 0', fontWeight: 500 }}>Cinsiyetinize uygun avatarlar</p>
                                </div>
                            </div>
                            {avatarCategories.map(cat => {
                                const isExpanded = expandedCategories.has(cat.label);
                                return (
                                    <div key={cat.label}>
                                        <button
                                            onClick={() => setExpandedCategories(prev => {
                                                const next = new Set(prev);
                                                if (next.has(cat.label)) next.delete(cat.label);
                                                else next.add(cat.label);
                                                return next;
                                            })}
                                            style={{
                                                fontSize: 11, color: TEXT_SECONDARY, fontWeight: 700, textTransform: 'uppercase',
                                                letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5,
                                                marginBottom: isExpanded ? 5 : 0, cursor: 'pointer',
                                                background: 'none', border: 'none', padding: '4px 0', width: '100%', textAlign: 'left',
                                            }}
                                        >
                                            <span style={{
                                                fontSize: 9, transition: 'transform 0.2s',
                                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                display: 'inline-block',
                                            }}>▶</span>
                                            {cat.label}
                                            <span style={{ fontSize: 9, color: TEXT_MUTED, fontWeight: 500, marginLeft: 2 }}>({cat.avatars.length})</span>
                                        </button>
                                        {isExpanded && (
                                            <div style={{
                                                display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6,
                                                padding: '6px', borderRadius: 10,
                                                background: 'rgba(255,255,255,0.4)',
                                                border: '1px solid rgba(100,116,139,0.1)',
                                            }}>
                                                {cat.avatars.map(av => {
                                                    const isSelected = (selectedAvatarUrl || currentUser?.avatar) === av;
                                                    return (
                                                        <button key={av} onClick={() => setSelectedAvatarUrl(av)}
                                                            style={{
                                                                border: isSelected ? '2.5px solid #0f172a' : '2px solid rgba(100,116,139,0.12)',
                                                                boxShadow: isSelected ? '0 0 0 2px rgba(15,23,42,0.15), 0 2px 8px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.06)',
                                                                background: 'rgba(255,255,255,0.7)', padding: 2, width: 48, height: 48,
                                                                borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s',
                                                                transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                                                            }}
                                                            onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.transform = 'scale(1.05)'; }}
                                                            onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.transform = 'scale(1)'; }}
                                                        ><img src={av} alt="" style={{ width: '100%', height: '100%', borderRadius: 10, objectFit: 'cover' }} /></button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <button onClick={() => {
                                const currentAv = currentUser?.avatar || '';
                                const isCurrentlyAnimated = currentAv.startsWith('animated:') || currentAv.startsWith('gifnick::');
                                const newAvatar = selectedAvatarUrl || avatarUrl;
                                if (isCurrentlyAnimated) { try { localStorage.setItem('soprano_custom_avatar', newAvatar); } catch (e) { } onClose(); }
                                else { onChangeAvatar(newAvatar); onClose(); }
                            }} style={btnStyle}>Avatarı Kaydet</button>
                        </div>
                    )}

                    {activeTab === 'name' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div>
                                <label style={{ fontSize: 10, color: TEXT_MUTED, display: 'block', marginBottom: 4 }}>Mevcut İsim</label>
                                <div style={{ fontSize: 12, color: TEXT_SECONDARY, background: 'rgba(255,255,255,0.4)', borderRadius: 10, padding: '8px 12px', border: '1px solid rgba(100,116,139,0.1)' }}>{currentUser?.username || '—'}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: 10, color: TEXT_MUTED, display: 'block', marginBottom: 4 }}>Yeni İsim</label>
                                <input value={newName} onChange={(e) => { setNewName(e.target.value); setError(''); }} maxLength={20} placeholder="Yeni isminizi yazın..." style={inputStyle} />
                                {error && <span style={{ fontSize: 10, color: '#ef4444', display: 'block', marginTop: 2 }}>{error}</span>}
                            </div>
                            <button onClick={() => {
                                if (!newName.trim() || newName.trim().length < 2) { setError('En az 2 karakter'); return; }
                                onChangeName(newName.trim()); onClose();
                            }} style={btnStyle}>İsmi Değiştir</button>
                        </div>
                    )}

                    {activeTab === 'color' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: selectedColor, textShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>{currentUser?.username || 'Kullanıcı'}</span>
                                <p style={{ fontSize: 9, color: TEXT_MUTED, margin: '2px 0 0' }}>Önizleme</p>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, justifyItems: 'center' }}>
                                {NAME_COLORS.map(c => (
                                    <button key={c} onClick={() => setSelectedColor(c)} style={{
                                        width: 28, height: 28, borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s',
                                        background: c, border: selectedColor === c ? '2px solid #1e293b' : '2px solid rgba(100,116,139,0.15)',
                                        boxShadow: selectedColor === c ? `0 0 10px ${c}40` : 'none',
                                        transform: selectedColor === c ? 'scale(1.15)' : 'scale(1)',
                                    }} />
                                ))}
                            </div>
                            <button onClick={() => { onChangeNameColor(selectedColor); onClose(); }} style={btnStyle}>Rengi Kaydet</button>
                        </div>
                    )}

                    {activeTab === 'password' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div>
                                <label style={{ fontSize: 10, color: TEXT_MUTED, display: 'block', marginBottom: 4 }}>Mevcut Şifre</label>
                                <input type="password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} autoComplete="one-time-code" name="otp1" style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: 10, color: TEXT_MUTED, display: 'block', marginBottom: 4 }}>Yeni Şifre</label>
                                <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} autoComplete="one-time-code" name="otp2" style={inputStyle} />
                            </div>
                            <div>
                                <label style={{ fontSize: 10, color: TEXT_MUTED, display: 'block', marginBottom: 4 }}>Şifre Tekrar</label>
                                <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} autoComplete="one-time-code" name="otp3" style={inputStyle} />
                            </div>
                            {error && <span style={{ fontSize: 10, color: '#ef4444' }}>{error}</span>}
                            <button onClick={() => {
                                if (!oldPass || !newPass) { setError('Tüm alanları doldurun'); return; }
                                if (newPass.length < 4) { setError('Şifre en az 4 karakter'); return; }
                                if (newPass !== confirmPass) { setError('Şifreler eşleşmiyor'); return; }
                                onChangePassword(oldPass, newPass); onClose();
                            }} style={btnStyle}>Şifreyi Değiştir</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
