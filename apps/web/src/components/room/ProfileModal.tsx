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

// VIP+ level hierarchy
const ROLE_LEVELS: Record<string, number> = { guest: 0, member: 1, vip: 2, operator: 3, moderator: 4, admin: 5, super_admin: 6, owner: 7 };


const NAME_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
    '#ffffff', '#94a3b8', '#64748b', '#fbbf24', '#34d399', '#60a5fa',
];

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

    // Detect if user has a VALID animated nick assigned
    const currentAvatar = currentUser?.avatar || '';
    const hasAnimatedNick = (() => {
        if (currentAvatar.startsWith('animated:')) return true;
        if (currentAvatar.startsWith('gifnick::')) {
            // gifnick::URL::showAvatar — URL boşsa geçerli değil
            const parts = currentAvatar.split('::');
            return !!(parts[1] && parts[1].length > 0);
        }
        return false;
    })();
    // Check localStorage for saved animated nick (in case user switched to normal)
    const savedAnimatedNick = typeof window !== 'undefined' ? localStorage.getItem('soprano_animated_nick') : null;
    // Görünüm tab sadece GERÇEKTEN hareketli nick varsa gösterilmeli
    // localStorage'daki eski değer, avatar artık animated değilse temizlenmeli
    const showLookTab = hasAnimatedNick;

    const [useAnimatedNick, setUseAnimatedNick] = useState(hasAnimatedNick);

    // Filter tabs: Renk only for VIP+, Görünüm only if animated nick exists
    const userLevel = ROLE_LEVELS[currentUser?.role || 'guest'] || 0;
    const TABS = useMemo(() =>
        ALL_TABS.filter(tab =>
            (tab.id !== 'color' || userLevel >= 2) &&
            (tab.id !== 'look' || showLookTab)
        ),
        [userLevel, showLookTab]
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
            // Save animated nick to localStorage if user has one
            if (isAnimated) {
                try { localStorage.setItem('soprano_animated_nick', av); } catch (e) { }
            } else {
                // Avatar artık animated değil — localStorage'daki eski değeri temizle
                try { localStorage.removeItem('soprano_animated_nick'); } catch (e) { }
            }
            setNewName(currentUser?.username || '');
            setSelectedColor(currentUser?.nameColor || '#ffffff');
            setSelectedAvatarUrl('');
            setOldPass(''); setNewPass(''); setConfirmPass('');
            setError('');
            setCentered(true);
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
        dragging.current = true;
        e.preventDefault();
    }, [centered, position]);

    useEffect(() => {
        const move = (e: MouseEvent) => {
            if (!dragging.current) return;
            setPosition({
                x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x)),
                y: Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.current.y)),
            });
        };
        const up = () => { dragging.current = false; };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
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

    const modalStyle: React.CSSProperties = centered
        ? {}
        : { position: 'fixed', left: position.x, top: position.y, margin: 0, transform: 'none' };

    const content = (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={onClose} style={centered ? {} : { display: 'block' }}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40" />

            <div
                ref={modalRef}
                className="relative w-full max-w-lg animate-pure-fade"
                onClick={(e) => e.stopPropagation()}
                style={{
                    ...modalStyle,
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%), linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.92) 100%)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderTop: '1px solid rgba(255,255,255,0.30)',
                    borderRadius: '18px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 0 40px rgba(255,255,255,0.02)',
                }}
            >
                {/* Accent */}
                <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.5), rgba(251,191,36,0.3), transparent)', opacity: 0.7 }} />

                {/* Header - Draggable */}
                <div
                    className="flex items-center justify-between p-5 pb-0"
                    onMouseDown={handleMouseDown}
                    style={{ cursor: 'move', userSelect: 'none' }}
                >
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>👤</span> Profil Ayarları
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">✕</button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-5 pt-4 pb-2">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setError(''); }}
                            className="flex-1 py-2 text-xs font-medium rounded-lg transition-all"
                            style={{
                                background: activeTab === tab.id ? 'rgba(56,189,248,0.12)' : 'transparent',
                                color: activeTab === tab.id ? '#7dd3fc' : '#94a3b8',
                                border: activeTab === tab.id ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent',
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-5 pt-3 min-h-[260px]">
                    {activeTab === 'look' && (
                        <div className="space-y-5">
                            <div className="text-center">
                                <p className="text-xs text-gray-400 mb-3">Yönetici tarafından size hareketli bir nick atanmış. Dilediğiniz zaman normal görünümünüze geçebilirsiniz.</p>
                            </div>

                            {/* Animated Nick Preview */}
                            {(() => {
                                const animNick = (hasAnimatedNick ? currentAvatar : savedAnimatedNick) || '';
                                const isAnimType = animNick.startsWith('animated:');
                                const isGifType = animNick.startsWith('gifnick::');
                                if (isAnimType) {
                                    const parts = animNick.split(':');
                                    const cls = parts[1] || 'shimmer-gold';
                                    const fontSize = parseInt(parts[2]) || 13;
                                    const text = parts.slice(4).join(':') || currentUser?.username || 'Kullanıcı';
                                    return (
                                        <div className="flex items-center justify-center py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <span className={`animated-nick ${cls}`} style={{ fontSize }}>{text}</span>
                                        </div>
                                    );
                                } else if (isGifType) {
                                    const parts = animNick.split('::');
                                    const gifUrl = parts[1] || '';
                                    if (!gifUrl) return null;
                                    return (
                                        <div className="flex items-center justify-center py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <img src={gifUrl} alt="GIF Nick" className="max-h-12 object-contain" style={{ filter: 'drop-shadow(0 0 4px rgba(99,102,241,0.3))' }} />
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            {/* Toggle Buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setUseAnimatedNick(true)}
                                    className="py-4 rounded-xl text-sm font-bold transition-all"
                                    style={{
                                        background: useAnimatedNick ? 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(56,189,248,0.08))' : 'rgba(255,255,255,0.03)',
                                        border: useAnimatedNick ? '2px solid rgba(56,189,248,0.4)' : '2px solid rgba(255,255,255,0.08)',
                                        color: useAnimatedNick ? '#7dd3fc' : '#94a3b8',
                                        boxShadow: useAnimatedNick ? '0 0 20px rgba(56,189,248,0.1)' : 'none',
                                    }}
                                >
                                    ✨ Hareketli Nick
                                </button>
                                <button
                                    onClick={() => setUseAnimatedNick(false)}
                                    className="py-4 rounded-xl text-sm font-bold transition-all"
                                    style={{
                                        background: !useAnimatedNick ? 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(56,189,248,0.08))' : 'rgba(255,255,255,0.03)',
                                        border: !useAnimatedNick ? '2px solid rgba(56,189,248,0.4)' : '2px solid rgba(255,255,255,0.08)',
                                        color: !useAnimatedNick ? '#7dd3fc' : '#94a3b8',
                                        boxShadow: !useAnimatedNick ? '0 0 20px rgba(56,189,248,0.1)' : 'none',
                                    }}
                                >
                                    👤 Normal İsim
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    const animNick = currentAvatar?.startsWith('animated:') || currentAvatar?.startsWith('gifnick::')
                                        ? currentAvatar
                                        : (savedAnimatedNick || '');
                                    if (useAnimatedNick && animNick) {
                                        // Switch to animated nick
                                        onChangeAvatar(animNick);
                                        try { localStorage.setItem('soprano_animated_nick', animNick); } catch (e) { }
                                    } else {
                                        // Switch to normal avatar — save animated nick for future use before switching
                                        if (animNick) {
                                            try { localStorage.setItem('soprano_animated_nick', animNick); } catch (e) { }
                                        }
                                        const defaultAvatar = generateGenderAvatar(currentUser?.username || 'user');
                                        onChangeAvatar(defaultAvatar);
                                    }
                                    onClose();
                                }}
                                className="w-full py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 transition-all shadow-lg shadow-sky-600/20"
                            >
                                Görünümü Kaydet
                            </button>
                        </div>
                    )}

                    {activeTab === 'avatar' && (
                        <div className="space-y-4">
                            {/* Current avatar preview */}
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full border-2 border-sky-500/20 flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}>
                                    <img src={selectedAvatarUrl || currentUser?.avatar || avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-medium text-white">Avatar Seç</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Aşağıdaki avatarlardan birini seçin</p>
                                </div>
                            </div>

                            {/* Avatar categories */}
                            {[
                                { label: '👨 Erkek', avatars: ['/avatars/male_1.png', '/avatars/male_2.png', '/avatars/male_3.png', '/avatars/male_4.png'] },
                                { label: '👩 Kadın', avatars: ['/avatars/female_1.png', '/avatars/female_2.png', '/avatars/female_3.png', '/avatars/female_4.png'] },
                                { label: '🌟 Nötr', avatars: ['/avatars/neutral_1.png', '/avatars/neutral_2.png', '/avatars/neutral_3.png', '/avatars/neutral_4.png'] },
                            ].map(cat => (
                                <div key={cat.label}>
                                    <label className="text-[10px] text-gray-400 mb-2 block font-semibold uppercase tracking-wider">{cat.label}</label>
                                    <div className="grid grid-cols-6 gap-1.5">
                                        {cat.avatars.map(av => {
                                            const isSelected = (selectedAvatarUrl || currentUser?.avatar) === av;
                                            return (
                                                <button
                                                    key={av}
                                                    onClick={() => setSelectedAvatarUrl(av)}
                                                    className="rounded-full overflow-hidden transition-all duration-200 hover:scale-110"
                                                    style={{
                                                        border: isSelected ? '2px solid #38bdf8' : '2px solid rgba(255,255,255,0.08)',
                                                        boxShadow: isSelected ? '0 0 12px rgba(56,189,248,0.25)' : 'none',
                                                        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                                                        padding: 2,
                                                        width: 48,
                                                        height: 48,
                                                    }}
                                                >
                                                    <img src={av} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            <button onClick={() => {
                                const currentAv = currentUser?.avatar || '';
                                const isCurrentlyAnimated = currentAv.startsWith('animated:') || currentAv.startsWith('gifnick::');
                                const newAvatar = selectedAvatarUrl || avatarUrl;
                                if (isCurrentlyAnimated) {
                                    try { localStorage.setItem('soprano_custom_avatar', newAvatar); } catch (e) { }
                                    onClose();
                                } else {
                                    onChangeAvatar(newAvatar);
                                    onClose();
                                }
                            }} className="w-full py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 transition-all shadow-lg shadow-sky-600/20">
                                Avatarı Kaydet
                            </button>
                        </div>
                    )}

                    {activeTab === 'name' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-2 block">Mevcut İsim</label>
                                <div className="text-sm text-gray-300 bg-white/5 rounded-xl px-4 py-3 border border-white/5">{currentUser?.username || '—'}</div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-2 block">Yeni İsim</label>
                                <input value={newName} onChange={(e) => { setNewName(e.target.value); setError(''); }} maxLength={20} placeholder="Yeni isminizi yazın..." className="w-full text-sm text-white rounded-xl px-4 py-3 border border-white/10 focus:border-sky-400/40 focus:outline-none" style={{ background: 'rgba(15,23,42,0.6)' }} />
                                {error && <span className="text-xs text-red-400 mt-1 block">{error}</span>}
                            </div>
                            <button onClick={() => {
                                if (!newName.trim() || newName.trim().length < 2) { setError('En az 2 karakter'); return; }
                                onChangeName(newName.trim()); onClose();
                            }} className="w-full py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 transition-all shadow-lg shadow-sky-600/20">
                                İsmi Değiştir
                            </button>
                        </div>
                    )}

                    {activeTab === 'color' && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <span className="text-lg font-bold" style={{ color: selectedColor }}>{currentUser?.username || 'Kullanıcı'}</span>
                                <p className="text-xs text-gray-500 mt-1">Önizleme</p>
                            </div>
                            <div className="grid grid-cols-6 gap-2">
                                {NAME_COLORS.map(c => (
                                    <button key={c} onClick={() => setSelectedColor(c)} className="w-10 h-10 rounded-xl transition-all hover:scale-110 mx-auto" style={{
                                        background: c,
                                        border: selectedColor === c ? '2px solid white' : '2px solid rgba(255,255,255,0.1)',
                                        boxShadow: selectedColor === c ? `0 0 12px ${c}50` : 'none',
                                    }} />
                                ))}
                            </div>
                            <button onClick={() => { onChangeNameColor(selectedColor); onClose(); }} className="w-full py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 transition-all shadow-lg shadow-sky-600/20">
                                Rengi Kaydet
                            </button>
                        </div>
                    )}

                    {activeTab === 'password' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-2 block">Mevcut Şifre</label>
                                <input type="password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} className="w-full text-sm text-white rounded-xl px-4 py-3 border border-white/10 focus:border-sky-400/40 focus:outline-none" style={{ background: 'rgba(15,23,42,0.6)' }} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-2 block">Yeni Şifre</label>
                                <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="w-full text-sm text-white rounded-xl px-4 py-3 border border-white/10 focus:border-amber-600/40 focus:outline-none" style={{ background: '#10121b' }} />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-2 block">Şifre Tekrar</label>
                                <input type="password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} className="w-full text-sm text-white rounded-xl px-4 py-3 border border-white/10 focus:border-amber-600/40 focus:outline-none" style={{ background: '#10121b' }} />
                            </div>
                            {error && <span className="text-xs text-red-400">{error}</span>}
                            <button onClick={() => {
                                if (!oldPass || !newPass) { setError('Tüm alanları doldurun'); return; }
                                if (newPass.length < 4) { setError('Şifre en az 4 karakter'); return; }
                                if (newPass !== confirmPass) { setError('Şifreler eşleşmiyor'); return; }
                                onChangePassword(oldPass, newPass); onClose();
                            }} className="w-full py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 transition-all shadow-lg shadow-sky-600/20">
                                Şifreyi Değiştir
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );

    return createPortal(content, document.body);
}
