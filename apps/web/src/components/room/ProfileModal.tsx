'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';

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

const AVATAR_STYLES = ['avataaars', 'bottts', 'fun-emoji', 'lorelei', 'pixel-art', 'thumbs'];
const NAME_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e',
    '#ffffff', '#94a3b8', '#64748b', '#fbbf24', '#34d399', '#60a5fa',
];

export function ProfileModal({
    isOpen, onClose, currentUser, onChangeName, onChangeAvatar, onChangeNameColor, onChangePassword
}: ProfileModalProps) {
    const [activeTab, setActiveTab] = useState('avatar');
    const [avatarSeed, setAvatarSeed] = useState('');
    const [avatarStyle, setAvatarStyle] = useState('avataaars');
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
            setAvatarSeed(currentUser?.username || 'user');
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

    const avatarUrl = `https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${avatarSeed}`;

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
                    background: 'linear-gradient(160deg, #14161f 0%, #0d0f17 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                    borderRadius: '18px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                }}
            >
                {/* Accent */}
                <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #6366f1, #a855f7, transparent)', opacity: 0.7 }} />

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
                                background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                color: activeTab === tab.id ? '#a5b4fc' : '#64748b',
                                border: activeTab === tab.id ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
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
                                        background: useAnimatedNick ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))' : 'rgba(255,255,255,0.03)',
                                        border: useAnimatedNick ? '2px solid rgba(99,102,241,0.5)' : '2px solid rgba(255,255,255,0.06)',
                                        color: useAnimatedNick ? '#a5b4fc' : '#64748b',
                                        boxShadow: useAnimatedNick ? '0 0 20px rgba(99,102,241,0.15)' : 'none',
                                    }}
                                >
                                    ✨ Hareketli Nick
                                </button>
                                <button
                                    onClick={() => setUseAnimatedNick(false)}
                                    className="py-4 rounded-xl text-sm font-bold transition-all"
                                    style={{
                                        background: !useAnimatedNick ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))' : 'rgba(255,255,255,0.03)',
                                        border: !useAnimatedNick ? '2px solid rgba(99,102,241,0.5)' : '2px solid rgba(255,255,255,0.06)',
                                        color: !useAnimatedNick ? '#a5b4fc' : '#64748b',
                                        boxShadow: !useAnimatedNick ? '0 0 20px rgba(99,102,241,0.15)' : 'none',
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
                                        const defaultAvatar = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(currentUser?.username || 'user')}`;
                                        onChangeAvatar(defaultAvatar);
                                    }
                                    onClose();
                                }}
                                className="w-full py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 transition-all"
                            >
                                Görünümü Kaydet
                            </button>
                        </div>
                    )}

                    {activeTab === 'avatar' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-2xl border-2 border-amber-600/20" style={{ background: '#10121b' }} />
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 mb-1 block">Seed</label>
                                    <input
                                        value={avatarSeed}
                                        onChange={(e) => setAvatarSeed(e.target.value)}
                                        className="w-full text-sm text-white rounded-lg px-3 py-2 border border-white/10 focus:border-amber-600/40 focus:outline-none"
                                        style={{ background: '#10121b' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-2 block">Stil</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {AVATAR_STYLES.map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setAvatarStyle(s)}
                                            className="py-2 text-xs font-medium rounded-lg transition-all"
                                            style={{
                                                background: avatarStyle === s ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                                                color: avatarStyle === s ? '#a5b4fc' : '#94a3b8',
                                                border: avatarStyle === s ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.05)',
                                            }}
                                        >{s}</button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => {
                                const currentAv = currentUser?.avatar || '';
                                const isCurrentlyAnimated = currentAv.startsWith('animated:') || currentAv.startsWith('gifnick::');
                                if (isCurrentlyAnimated) {
                                    // Animated nick aktifken avatar'ı localStorage'a kaydet — animated nick korunur
                                    try { localStorage.setItem('soprano_custom_avatar', avatarUrl); } catch (e) { }
                                    onClose();
                                } else {
                                    onChangeAvatar(avatarUrl);
                                    onClose();
                                }
                            }} className="w-full py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 transition-all">
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
                                <input value={newName} onChange={(e) => { setNewName(e.target.value); setError(''); }} maxLength={20} placeholder="Yeni isminizi yazın..." className="w-full text-sm text-white rounded-xl px-4 py-3 border border-white/10 focus:border-amber-600/40 focus:outline-none" style={{ background: '#10121b' }} />
                                {error && <span className="text-xs text-red-400 mt-1 block">{error}</span>}
                            </div>
                            <button onClick={() => {
                                if (!newName.trim() || newName.trim().length < 2) { setError('En az 2 karakter'); return; }
                                onChangeName(newName.trim()); onClose();
                            }} className="w-full py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 transition-all">
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
                            <button onClick={() => { onChangeNameColor(selectedColor); onClose(); }} className="w-full py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 transition-all">
                                Rengi Kaydet
                            </button>
                        </div>
                    )}

                    {activeTab === 'password' && (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-2 block">Mevcut Şifre</label>
                                <input type="password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} className="w-full text-sm text-white rounded-xl px-4 py-3 border border-white/10 focus:border-amber-600/40 focus:outline-none" style={{ background: '#10121b' }} />
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
                            }} className="w-full py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 transition-all">
                                Şifreyi Değiştir
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
