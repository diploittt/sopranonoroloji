'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { generateGenderAvatar } from '@/lib/avatar';
import { ThreeDTextBanner, DEFAULT_3D_PARAMS, serialize3DParams, ANIM_MODES, type ThreeDParams, type AnimMode } from './ThreeDTextBanner';

interface GodMasterProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: any;
    onChangeAvatar: (avatar: string) => void;
    onChangeName: (name: string) => void;
    onChangeNameColor: (color: string) => void;
    onChangeIcon: (icon: string) => void;
}

const TABS = [
    { id: 'gif', label: 'GIF Nick', icon: '🎬' },
    { id: 'library', label: 'Kütüphane', icon: '📚' },
    { id: '3d', label: '3D Efekt', icon: '🔱' },
    { id: 'avatar', label: 'Avatar', icon: '🖼️' },
    { id: 'name', label: 'İsim', icon: '✏️' },
    { id: 'icon', label: 'İkon', icon: '⚡' },
    { id: 'color', label: 'Renk', icon: '🎨' },
];

const GODMASTER_ICONS = ['🔱', '⚡', '🌟', '👑', '💎', '🔥', '🌀', '⚔️', '🛡️', '✨', '💜', '🦅', '🐉', '☠️', '🎭', '🌙'];
const ALL_AVATARS = [
    '/avatars/male_1.png', '/avatars/male_2.png', '/avatars/male_3.png', '/avatars/male_4.png',
    '/avatars/female_1.png', '/avatars/female_2.png', '/avatars/female_3.png', '/avatars/female_4.png',
    '/avatars/neutral_1.png', '/avatars/neutral_2.png', '/avatars/neutral_3.png', '/avatars/neutral_4.png',
];
const NAME_COLORS = [
    '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#ec4899', '#f43f5e',
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
    '#3b82f6', '#ffffff', '#94a3b8', '#64748b', '#fbbf24', '#34d399',
];

const MAX_GIF_SIZE = 2 * 1024 * 1024;
const LIBRARY_KEY = 'soprano_godmaster_gif_library';
const THEMES_3D = ['purple', 'gold', 'cyan', 'fire', 'emerald', 'royal'];

// ═══ GIF Library ═══
interface SavedGif { id: string; name: string; dataUri: string; savedAt: number; }
function loadGifLibrary(): SavedGif[] { try { return JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]'); } catch { return []; } }
function saveGifToLibrary(name: string, dataUri: string): SavedGif[] {
    const lib = loadGifLibrary();
    if (lib.some(g => g.dataUri === dataUri)) return lib;
    lib.unshift({ id: `gif_${Date.now()}`, name, dataUri, savedAt: Date.now() });
    if (lib.length > 20) lib.pop();
    try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib)); } catch { }
    return lib;
}
function removeGifFromLibrary(id: string): SavedGif[] {
    const lib = loadGifLibrary().filter(g => g.id !== id);
    try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib)); } catch { }
    return lib;
}

// ═══ Cinema4D-Style Slider ═══
function ParamSlider({ label, value, min, max, step, onChange, icon, unit }: {
    label: string; value: number; min: number; max: number; step: number;
    onChange: (v: number) => void; icon?: string; unit?: string;
}) {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>
                    {icon && <span style={{ marginRight: '4px' }}>{icon}</span>}{label}
                </span>
                <span style={{ fontSize: '10px', color: '#e879f9', fontFamily: 'monospace', fontWeight: 700 }}>
                    {value.toFixed(step < 0.01 ? 4 : step < 1 ? 2 : 0)}{unit || ''}
                </span>
            </div>
            <div style={{ position: 'relative', height: '18px', display: 'flex', alignItems: 'center' }}>
                <div style={{
                    position: 'absolute', left: 0, right: 0, height: '4px',
                    background: 'rgba(255,255,255,0.06)', borderRadius: '2px',
                }} />
                <div style={{
                    position: 'absolute', left: 0, width: `${pct}%`, height: '4px',
                    background: 'linear-gradient(90deg, #a855f7, #d946ef)', borderRadius: '2px',
                }} />
                <input
                    type="range" min={min} max={max} step={step} value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    style={{
                        position: 'absolute', left: 0, right: 0, width: '100%',
                        height: '18px', opacity: 0, cursor: 'pointer', zIndex: 2, margin: 0,
                    }}
                />
                <div style={{
                    position: 'absolute', left: `calc(${pct}% - 7px)`, width: '14px', height: '14px',
                    borderRadius: '50%', background: '#d946ef', border: '2px solid #1a0e2e',
                    boxShadow: '0 0 8px rgba(217, 70, 239, 0.5)', pointerEvents: 'none',
                }} />
            </div>
        </div>
    );
}

export function GodMasterProfileModal({
    isOpen, onClose, currentUser, onChangeAvatar, onChangeName, onChangeNameColor, onChangeIcon,
}: GodMasterProfileModalProps) {
    const [activeTab, setActiveTab] = useState('gif');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // GIF
    const [gifPreview, setGifPreview] = useState<string | null>(null);
    const [gifFileName, setGifFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Library
    const [gifLibrary, setGifLibrary] = useState<SavedGif[]>([]);

    // 3D Cinema4D Editor
    const [customMainText, setCustomMainText] = useState('');
    const [customSubText, setCustomSubText] = useState('');
    const [customTheme, setCustomTheme] = useState('purple');
    const [params3D, setParams3D] = useState<ThreeDParams>({ ...DEFAULT_3D_PARAMS });
    const [editorSection, setEditorSection] = useState<string>('anim');

    // Avatar
    const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('/avatars/neutral_1.png');

    // Name / Icon / Color
    const [newName, setNewName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('🔱');
    const [selectedColor, setSelectedColor] = useState('#d946ef');

    // Drag
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [centered, setCentered] = useState(true);
    const dragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setActiveTab('gif');
            setNewName(currentUser?.username || '');
            setSelectedAvatarUrl(currentUser?.avatar || '/avatars/neutral_1.png');
            setSelectedColor(currentUser?.nameColor || '#d946ef');
            setCustomMainText(currentUser?.username || 'SopranoChat');
            setCustomSubText('Owner');
            setParams3D({ ...DEFAULT_3D_PARAMS });
            setEditorSection('anim');
            setError(''); setSuccess('');
            setCentered(true);
            setGifPreview(null); setGifFileName('');
            setGifLibrary(loadGifLibrary());
            if (currentUser?.avatar?.startsWith('data:image/gif') || currentUser?.avatar?.toLowerCase().endsWith('.gif')) {
                setGifPreview(currentUser.avatar);
                setGifFileName('Mevcut GIF');
            }
        }
    }, [isOpen, currentUser]);

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
        const move = (e: MouseEvent) => { if (!dragging.current) return; setPosition({ x: Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x)), y: Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.current.y)) }); };
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

    // GIF handlers
    const handleGifSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setError(''); setSuccess('');
        if (!file.type.startsWith('image/gif')) { setError('Sadece GIF dosyaları.'); return; }
        if (file.size > MAX_GIF_SIZE) { setError('Max 2MB'); return; }
        const reader = new FileReader();
        reader.onload = () => { setGifPreview(reader.result as string); setGifFileName(file.name); };
        reader.readAsDataURL(file);
    };
    const handleSaveGif = () => {
        if (!gifPreview) return;
        setGifLibrary(saveGifToLibrary(gifFileName || 'GIF', gifPreview));
        onChangeAvatar(gifPreview);
        setSuccess('GIF kaydedildi! 🎉');
        setTimeout(() => { setSuccess(''); onClose(); }, 1000);
    };
    const handleRemoveGif = () => {
<<<<<<< HEAD
        onChangeAvatar('/avatars/neutral_1.png');
=======
        onChangeAvatar(generateGenderAvatar(currentUser?.username || 'gm'));
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
        setGifPreview(null); setGifFileName('');
        setSuccess('GIF kaldırıldı.'); setTimeout(() => setSuccess(''), 1500);
    };
    const handleUseFromLibrary = (gif: SavedGif) => {
        onChangeAvatar(gif.dataUri);
        setSuccess(`"${gif.name}" aktif! 🎬`);
        setTimeout(() => { setSuccess(''); onClose(); }, 800);
    };
    const handleDeleteFromLibrary = (id: string) => {
        setGifLibrary(removeGifFromLibrary(id));
        setSuccess('Silindi.'); setTimeout(() => setSuccess(''), 1000);
    };

    // 3D Apply — extended format with params
    const handleApply3D = () => {
        const main = customMainText || currentUser?.username || 'GodMaster';
        const sub = customSubText;
        const core = `3d:${customTheme}:${main}${sub ? ':' + sub : ''}`;
        const paramStr = serialize3DParams(params3D);
        const val = `${core}|${paramStr}`;
        onChangeAvatar(val);
        setSuccess(`3D "${main}" aktif! 🔱`);
        setTimeout(() => { setSuccess(''); onClose(); }, 800);
    };

    const setParam = <K extends keyof ThreeDParams>(key: K, value: ThreeDParams[K]) => {
        setParams3D(prev => ({ ...prev, [key]: value }));
    };

    if (!isOpen) return null;

<<<<<<< HEAD
    const avatarUrl = selectedAvatarUrl;
=======
    const avatarUrl = generateGenderAvatar(currentUser?.username || 'gm');
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
    const modalStyle: React.CSSProperties = centered ? {} : { position: 'fixed', left: position.x, top: position.y, margin: 0, transform: 'none' };

    const EDITOR_SECTIONS = [
        { id: 'anim', label: 'Animasyon', icon: '🎬' },
        { id: 'shape', label: '3D Şekil', icon: '📐' },
        { id: 'light', label: 'Işık', icon: '💡' },
        { id: 'camera', label: 'Kamera', icon: '📷' },
    ];

    const content = (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={onClose} style={centered ? {} : { display: 'block' }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div ref={modalRef} className="relative w-full max-w-lg animate-pure-fade" onClick={(e) => e.stopPropagation()}
                style={{
                    ...modalStyle,
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%), linear-gradient(180deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.92) 100%)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderTop: '1px solid rgba(255,255,255,0.30)',
                    borderRadius: '16px',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 1px rgba(168,85,247,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(24px) saturate(150%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(150%)',
                }}>
                <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 10%, rgba(168,85,247,0.35) 40%, rgba(217,70,239,0.3) 60%, transparent 90%)', borderRadius: '16px 16px 0 0' }} />

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-3 pb-0" onMouseDown={handleMouseDown} style={{ cursor: 'move', userSelect: 'none' }}>
                    <h2 style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15 }}>🔱</span>
                        <span style={{ background: 'linear-gradient(90deg, #e879f9, #7b9fef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>GodMaster Profil</span>
                    </h2>
                    <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 8, background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, transition: 'all 0.2s' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                    >✕</button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 3, padding: '6px 20px 4px', flexWrap: 'wrap' }}>
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); }}
                            style={{
                                padding: '4px 8px', fontSize: 10, fontWeight: 600, borderRadius: 7, transition: 'all 0.2s', cursor: 'pointer',
                                background: activeTab === tab.id ? 'rgba(168,85,247,0.12)' : 'transparent',
                                color: activeTab === tab.id ? '#c084fc' : '#64748b',
                                border: activeTab === tab.id ? '1px solid rgba(168,85,247,0.2)' : '1px solid transparent',
                            }}>{tab.icon} {tab.label}</button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ padding: '4px 20px 16px', maxHeight: activeTab === '3d' ? '65vh' : 'auto', overflowY: activeTab === '3d' ? 'auto' : 'visible' }}>
                    {error && <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}
                    {success && <div className="mb-3 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs">{success}</div>}

                    {/* ═══ GIF NICK ═══ */}
                    {activeTab === 'gif' && (
                        <div className="space-y-3">
                            <p className="text-xs text-gray-400">Hareketli GIF yükleyin. Otomatik kütüphaneye kaydedilir. <span className="text-fuchsia-400">Max 2MB</span></p>
                            <div className="relative w-full rounded-xl overflow-hidden flex items-center justify-center cursor-pointer group"
                                style={{ minHeight: '80px', background: gifPreview ? 'rgba(0,0,0,0.4)' : 'rgba(217, 70, 239, 0.05)', border: '2px dashed rgba(217, 70, 239, 0.2)' }}
                                onClick={() => fileInputRef.current?.click()}>
                                {gifPreview ? (<><img src={gifPreview} alt="GIF" className="max-h-16 object-contain rounded" /><div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><span className="text-white text-sm">Değiştir</span></div></>) : (
                                    <div className="py-4 text-center"><div className="text-2xl mb-1">📁</div><p className="text-xs text-gray-500">Tıklayın</p></div>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/gif" className="hidden" onChange={handleGifSelect} />
                            {gifFileName && <p className="text-[10px] text-gray-500">📎 {gifFileName}</p>}
                            <div className="flex gap-2">
                                <button onClick={handleSaveGif} disabled={!gifPreview} className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-40" style={{ background: gifPreview ? 'linear-gradient(135deg, #d946ef, #a855f7)' : 'rgba(255,255,255,0.05)' }}>🎬 Kaydet & Kullan</button>
                                {gifPreview && <button onClick={handleRemoveGif} className="px-3 py-2.5 text-xs text-gray-400 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 transition-all border border-white/5">Kaldır</button>}
                            </div>
                        </div>
                    )}

                    {/* ═══ KÜTÜPHANE ═══ */}
                    {activeTab === 'library' && (
                        <div>
                            <p className="text-xs text-gray-400 mb-3">Kayıtlı GIF'leriniz. Tıklayarak kullanın.</p>
                            {gifLibrary.length === 0 ? (
                                <div className="text-center py-6"><div className="text-2xl mb-1">📭</div><p className="text-xs text-gray-500">Henüz GIF yok</p></div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    {gifLibrary.map(gif => (
                                        <div key={gif.id} className="relative rounded-xl overflow-hidden group cursor-pointer border border-white/[0.06] hover:border-fuchsia-500/30 transition-all" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                            <div className="flex items-center justify-center p-2" onClick={() => handleUseFromLibrary(gif)}>
                                                <img src={gif.dataUri} alt={gif.name} className="max-h-12 object-contain" />
                                            </div>
                                            <div className="flex items-center justify-between px-2 pb-1.5">
                                                <span className="text-[9px] text-gray-600 truncate flex-1">{gif.name}</span>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteFromLibrary(gif.id); }} className="text-[9px] text-gray-600 hover:text-red-400 ml-1">✕</button>
                                            </div>
                                            <div className="absolute inset-0 bg-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" onClick={() => handleUseFromLibrary(gif)}>
                                                <span className="text-[10px] font-bold text-fuchsia-300 bg-black/60 px-2 py-0.5 rounded">Kullan</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ 3D EFEKT — Cinema4D-Style Editor ═══ */}
                    {activeTab === '3d' && (
                        <div>
                            {/* ★ Live Preview */}
                            <div style={{
                                background: 'rgba(0,0,0,0.5)', borderRadius: '12px',
                                border: '1px solid rgba(217, 70, 239, 0.15)', padding: '8px',
                                marginBottom: '12px', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', position: 'relative',
                            }}>
                                <div style={{
                                    position: 'absolute', top: '6px', left: '10px',
                                    fontSize: '8px', color: 'rgba(217, 70, 239, 0.5)',
                                    fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                                }}>CANLI ÖNİZLEME</div>
                                <ThreeDTextBanner mainText={customMainText || 'SopranoChat'} subText={customSubText}
                                    theme={customTheme} width={420} height={100} params={params3D} />
                            </div>

                            {/* Text inputs */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '10px', color: '#64748b', marginBottom: '3px', display: 'block' }}>Ana Metin</label>
                                    <input value={customMainText} onChange={(e) => setCustomMainText(e.target.value)} maxLength={16} placeholder="SopranoChat"
                                        style={{ width: '100%', fontSize: '12px', color: '#fff', borderRadius: '8px', padding: '7px 10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', color: '#64748b', marginBottom: '3px', display: 'block' }}>Alt Metin</label>
                                    <input value={customSubText} onChange={(e) => setCustomSubText(e.target.value)} maxLength={12} placeholder="Owner"
                                        style={{ width: '100%', fontSize: '12px', color: '#fff', borderRadius: '8px', padding: '7px 10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)', outline: 'none' }} />
                                </div>
                            </div>

                            {/* Theme selector */}
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                {THEMES_3D.map(t => (
                                    <button key={t} onClick={() => setCustomTheme(t)}
                                        style={{
                                            padding: '4px 10px', fontSize: '10px', fontWeight: 600,
                                            borderRadius: '6px', transition: 'all 0.2s', textTransform: 'capitalize',
                                            background: customTheme === t ? 'rgba(217, 70, 239, 0.15)' : 'rgba(255,255,255,0.03)',
                                            color: customTheme === t ? '#e879f9' : '#64748b',
                                            border: customTheme === t ? '1px solid rgba(217, 70, 239, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                                            cursor: 'pointer',
                                        }}>{t}</button>
                                ))}
                            </div>

                            {/* ★ Cinema4D Editor Section Tabs */}
                            <div style={{ display: 'flex', gap: '3px', marginBottom: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '3px' }}>
                                {EDITOR_SECTIONS.map(sec => (
                                    <button key={sec.id} onClick={() => setEditorSection(sec.id)}
                                        style={{
                                            flex: 1, padding: '5px 0', fontSize: '10px', fontWeight: 600,
                                            borderRadius: '6px', transition: 'all 0.2s', cursor: 'pointer',
                                            background: editorSection === sec.id ? 'rgba(217, 70, 239, 0.15)' : 'transparent',
                                            color: editorSection === sec.id ? '#e879f9' : '#64748b',
                                            border: editorSection === sec.id ? '1px solid rgba(217, 70, 239, 0.2)' : '1px solid transparent',
                                        }}>{sec.icon} {sec.label}</button>
                                ))}
                            </div>

                            {/* Editor controls */}
                            <div style={{
                                background: 'rgba(0,0,0,0.25)', borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.04)', padding: '12px 14px', marginBottom: '12px',
                            }}>
                                {editorSection === 'anim' && (<>
                                    {/* Animation Mode Selector */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>🎬 Hareket Tipi</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                                            {ANIM_MODES.map(mode => (
                                                <button key={mode.id} onClick={() => setParam('animMode', mode.id)}
                                                    title={mode.desc}
                                                    style={{
                                                        padding: '6px 2px', fontSize: '9px', fontWeight: 600,
                                                        borderRadius: '6px', transition: 'all 0.2s', cursor: 'pointer',
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                                                        background: params3D.animMode === mode.id ? 'rgba(217, 70, 239, 0.2)' : 'rgba(255,255,255,0.03)',
                                                        color: params3D.animMode === mode.id ? '#e879f9' : '#64748b',
                                                        border: params3D.animMode === mode.id ? '1px solid rgba(217, 70, 239, 0.35)' : '1px solid rgba(255,255,255,0.06)',
                                                        boxShadow: params3D.animMode === mode.id ? '0 0 8px rgba(217, 70, 239, 0.15)' : 'none',
                                                    }}>
                                                    <span style={{ fontSize: '14px' }}>{mode.icon}</span>
                                                    <span>{mode.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0 10px' }} />
                                    <ParamSlider label="Hız" icon="⚡" value={params3D.animSpeed} min={0.0003} max={0.005} step={0.0001} onChange={(v) => setParam('animSpeed', v)} />
                                    <ParamSlider label="Y Dönme Genliği" icon="↔️" value={params3D.rotationY} min={0} max={1.5} step={0.01} onChange={(v) => setParam('rotationY', v)} />
                                    <ParamSlider label="X Dönme Genliği" icon="↕️" value={params3D.rotationX} min={0} max={0.8} step={0.01} onChange={(v) => setParam('rotationX', v)} />
                                </>)}
                                {editorSection === 'shape' && (<>
                                    <ParamSlider label="Metin Derinliği" icon="📏" value={params3D.textDepth} min={0.1} max={3.0} step={0.05} onChange={(v) => setParam('textDepth', v)} />
                                    <ParamSlider label="Bevel Kalınlığı" icon="🔷" value={params3D.bevelThickness} min={0} max={1.5} step={0.05} onChange={(v) => setParam('bevelThickness', v)} />
                                    <ParamSlider label="Bevel Büyüklüğü" icon="🔶" value={params3D.bevelSize} min={0} max={0.8} step={0.02} onChange={(v) => setParam('bevelSize', v)} />
                                </>)}
                                {editorSection === 'light' && (<>
                                    <ParamSlider label="Işık Şiddeti" icon="☀️" value={params3D.lightIntensity} min={0} max={3.0} step={0.1} onChange={(v) => setParam('lightIntensity', v)} />
                                    <ParamSlider label="Işık X Pozisyonu" icon="◀▶" value={params3D.lightX} min={-30} max={30} step={1} onChange={(v) => setParam('lightX', v)} />
                                    <ParamSlider label="Işık Y Pozisyonu" icon="▲▼" value={params3D.lightY} min={-30} max={30} step={1} onChange={(v) => setParam('lightY', v)} />
                                </>)}
                                {editorSection === 'camera' && (<>
                                    <ParamSlider label="Yakınlaştırma (Zoom)" icon="🔍" value={params3D.cameraZ} min={10} max={40} step={0.5} onChange={(v) => setParam('cameraZ', v)} />
                                    <ParamSlider label="Yüzey Parlaklığı" icon="✨" value={params3D.shininess} min={0} max={200} step={5} onChange={(v) => setParam('shininess', v)} />
                                </>)}
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setParams3D({ ...DEFAULT_3D_PARAMS })}
                                    style={{
                                        padding: '8px 16px', fontSize: '11px', fontWeight: 600,
                                        borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                                        background: 'rgba(255,255,255,0.05)', color: '#94a3b8',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                    }}>🔄 Sıfırla</button>
                                <button onClick={handleApply3D}
                                    style={{
                                        flex: 1, padding: '10px', fontSize: '13px', fontWeight: 700,
                                        borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                                        background: 'linear-gradient(135deg, #d946ef, #a855f7)',
                                        color: '#fff', border: 'none',
                                        boxShadow: '0 4px 20px rgba(217, 70, 239, 0.3)',
                                    }}>🔱 3D Efekti Uygula</button>
                            </div>
                        </div>
                    )}

                    {/* ═══ AVATAR ═══ */}
                    {activeTab === 'avatar' && (
                        <div className="space-y-3">
<<<<<<< HEAD
                            <div className="flex items-center justify-center">
                                <img src={selectedAvatarUrl} alt="Avatar" className="w-16 h-16 rounded-2xl border-2 border-fuchsia-500/20" style={{ background: '#10121b', objectFit: 'cover' }} />
=======
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl border-2 border-fuchsia-500/20 flex items-center justify-center overflow-hidden" style={{ background: 'rgba(15,23,42,0.6)', fontSize: 24, fontWeight: 900, color: 'rgba(233,121,249,0.6)', textTransform: 'uppercase' }}>{currentUser?.avatar ? <img src={currentUser.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '14px', objectFit: 'cover' }} /> : (currentUser?.username || '?').charAt(0)}</div>
                                <div className="flex-1">
                                    <label className="text-[10px] text-gray-500 mb-1 block">Seed</label>
                                    <input value={avatarSeed} onChange={(e) => setAvatarSeed(e.target.value)} className="w-full text-xs text-white rounded-lg px-2.5 py-2 border border-white/10 focus:border-fuchsia-500/40 focus:outline-none" style={{ background: 'rgba(15,23,42,0.6)' }} />
                                </div>
>>>>>>> 2a4b46592931e0071e1280158602315f3c375626
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {ALL_AVATARS.map(av => (
                                    <button key={av} onClick={() => setSelectedAvatarUrl(av)} className="rounded-xl transition-all hover:scale-105"
                                        style={{
                                            padding: 3,
                                            background: selectedAvatarUrl === av ? 'rgba(217, 70, 239, 0.2)' : 'rgba(255,255,255,0.03)',
                                            border: selectedAvatarUrl === av ? '2px solid rgba(217, 70, 239, 0.5)' : '2px solid rgba(255,255,255,0.06)',
                                            boxShadow: selectedAvatarUrl === av ? '0 0 12px rgba(217, 70, 239, 0.2)' : 'none',
                                        }}>
                                        <img src={av} alt="" className="w-full aspect-square rounded-lg" style={{ objectFit: 'cover' }} />
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => { onChangeAvatar(selectedAvatarUrl); setSuccess('Avatar kaydedildi!'); setTimeout(() => { setSuccess(''); onClose(); }, 800); }} className="w-full py-2.5 text-sm font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #d946ef, #a855f7)' }}>Avatarı Kaydet</button>
                        </div>
                    )}

                    {/* ═══ İSİM ═══ */}
                    {activeTab === 'name' && (
                        <div className="space-y-3">
                            <div className="text-xs text-fuchsia-300 bg-fuchsia-500/5 rounded-lg px-3 py-2 border border-fuchsia-500/10">Mevcut: {currentUser?.username || '—'}</div>
                            <input value={newName} onChange={(e) => { setNewName(e.target.value); setError(''); }} maxLength={20} placeholder="Yeni isim..." className="w-full text-sm text-white rounded-xl px-4 py-3 border border-white/10 focus:border-fuchsia-500/40 focus:outline-none" style={{ background: 'rgba(15,23,42,0.6)' }} />
                            <button onClick={() => { if (!newName.trim() || newName.trim().length < 2) { setError('En az 2 karakter'); return; } onChangeName(newName.trim()); setSuccess('İsim değiştirildi!'); setTimeout(() => { setSuccess(''); onClose(); }, 800); }} className="w-full py-2.5 text-sm font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #d946ef, #a855f7)' }}>İsmi Değiştir</button>
                        </div>
                    )}

                    {/* ═══ İKON ═══ */}
                    {activeTab === 'icon' && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-8 gap-1.5">
                                {GODMASTER_ICONS.map(icon => (
                                    <button key={icon} onClick={() => setSelectedIcon(icon)} className="w-9 h-9 rounded-lg flex items-center justify-center text-base transition-all hover:scale-110"
                                        style={{ background: selectedIcon === icon ? 'rgba(217, 70, 239, 0.2)' : 'rgba(255,255,255,0.03)', border: selectedIcon === icon ? '2px solid rgba(217, 70, 239, 0.5)' : '1px solid rgba(255,255,255,0.05)', boxShadow: selectedIcon === icon ? '0 0 10px rgba(217, 70, 239, 0.2)' : 'none' }}>{icon}</button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/5 text-sm"><span>{selectedIcon}</span><span className="text-white font-bold text-xs">{currentUser?.username || 'GodMaster'}</span></div>
                            <button onClick={() => { onChangeIcon(selectedIcon); setSuccess('İkon güncellendi!'); setTimeout(() => { setSuccess(''); onClose(); }, 800); }} className="w-full py-2.5 text-sm font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #d946ef, #a855f7)' }}>İkonu Kaydet</button>
                        </div>
                    )}

                    {/* ═══ RENK ═══ */}
                    {activeTab === 'color' && (
                        <div className="space-y-3">
                            <div className="text-center"><span className="text-base font-bold" style={{ color: selectedColor }}>{currentUser?.username || 'GodMaster'}</span></div>
                            <div className="grid grid-cols-9 gap-1.5">
                                {NAME_COLORS.map(c => (
                                    <button key={c} onClick={() => setSelectedColor(c)} className="w-8 h-8 rounded-lg transition-all hover:scale-110 mx-auto"
                                        style={{ background: c, border: selectedColor === c ? '2px solid white' : '2px solid rgba(255,255,255,0.1)', boxShadow: selectedColor === c ? `0 0 10px ${c}50` : 'none' }} />
                                ))}
                            </div>
                            <button onClick={() => { onChangeNameColor(selectedColor); setSuccess('Renk güncellendi!'); setTimeout(() => { setSuccess(''); onClose(); }, 800); }} className="w-full py-2.5 text-sm font-bold text-white rounded-xl" style={{ background: 'linear-gradient(135deg, #d946ef, #a855f7)' }}>Rengi Kaydet</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
