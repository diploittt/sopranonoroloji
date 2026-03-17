'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Trash2, Save, RotateCcw, Sparkles, Palette, Type, Image as ImageIcon, Zap, Crown, Star } from 'lucide-react';
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
    { id: 'gif', label: 'GIF Nick', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'library', label: 'Kütüphane', icon: <Star className="w-3.5 h-3.5" /> },
    { id: '3d', label: '3D Efekt', icon: <Crown className="w-3.5 h-3.5" /> },
    { id: 'avatar', label: 'Avatar', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 'name', label: 'İsim', icon: <Type className="w-3.5 h-3.5" /> },
    { id: 'icon', label: 'İkon', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'color', label: 'Renk', icon: <Palette className="w-3.5 h-3.5" /> },
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
function saveGifToLibrary(name: string, dataUri: string): { library: SavedGif[]; error?: string } {
    const lib = loadGifLibrary();
    if (lib.some(g => g.dataUri === dataUri)) return { library: lib };
    lib.unshift({ id: `gif_${Date.now()}`, name, dataUri, savedAt: Date.now() });
    if (lib.length > 5) lib.pop();
    try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib)); } catch {
        lib.shift(); // Eklenen GIF'i geri al
        return { library: loadGifLibrary(), error: 'Kütüphane dolu! Eski GIF\'leri silip tekrar deneyin.' };
    }
    return { library: lib };
}
function removeGifFromLibrary(id: string): SavedGif[] {
    const lib = loadGifLibrary().filter(g => g.id !== id);
    try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib)); } catch { }
    return lib;
}

// ═══ Premium Slider ═══
function PremiumSlider({ label, value, min, max, step, onChange, icon, unit }: {
    label: string; value: number; min: number; max: number; step: number;
    onChange: (v: number) => void; icon?: string; unit?: string;
}) {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: 'rgba(200,170,110,0.7)', fontWeight: 700, letterSpacing: 0.5 }}>
                    {icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}
                </span>
                <span style={{ fontSize: 10, color: '#67e8f9', fontFamily: 'monospace', fontWeight: 700 }}>
                    {value.toFixed(step < 0.01 ? 4 : step < 1 ? 2 : 0)}{unit || ''}
                </span>
            </div>
            <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }} />
                <div style={{ position: 'absolute', left: 0, width: `${pct}%`, height: 4, background: 'linear-gradient(90deg, #38bdf8, #67e8f9)', borderRadius: 2, boxShadow: '0 0 6px rgba(56,189,248,0.3)' }} />
                <input type="range" min={min} max={max} step={step} value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    style={{ position: 'absolute', left: 0, right: 0, width: '100%', height: 20, opacity: 0, cursor: 'pointer', zIndex: 2, margin: 0 }} />
                <div style={{
                    position: 'absolute', left: `calc(${pct}% - 8px)`, width: 16, height: 16,
                    borderRadius: '50%',
                    background: 'linear-gradient(180deg, #67e8f9, #38bdf8)',
                    border: '2px solid rgba(15,23,42,0.8)',
                    boxShadow: '0 0 10px rgba(56,189,248,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                    pointerEvents: 'none',
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
        if (!file.type.startsWith('image/gif')) { setError('Sadece GIF dosyaları kabul edilir.'); return; }
        if (file.size > MAX_GIF_SIZE) { setError('Maksimum dosya boyutu 2MB'); return; }
        const reader = new FileReader();
        reader.onload = () => { setGifPreview(reader.result as string); setGifFileName(file.name); };
        reader.readAsDataURL(file);
    };
    const handleSaveGif = () => {
        if (!gifPreview) return;
        const result = saveGifToLibrary(gifFileName || 'GIF', gifPreview);
        if (result.error) {
            setError(result.error);
            return;
        }
        setGifLibrary(result.library);
        onChangeAvatar(gifPreview);
        setSuccess('GIF kaydedildi! 🎉');
        setTimeout(() => { setSuccess(''); onClose(); }, 1000);
    };
    const handleRemoveGif = () => {
        onChangeAvatar('/avatars/neutral_1.png');
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

    // 3D Apply
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

    const modalStyle: React.CSSProperties = centered ? {} : { position: 'fixed', left: position.x, top: position.y, margin: 0, transform: 'none' };

    const EDITOR_SECTIONS = [
        { id: 'anim', label: 'Animasyon', icon: '🎬' },
        { id: 'shape', label: '3D Şekil', icon: '📐' },
        { id: 'light', label: 'Işık', icon: '💡' },
        { id: 'camera', label: 'Kamera', icon: '📷' },
    ];

    // ═══ Shared button styles ═══
    const actionBtnStyle: React.CSSProperties = {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
        transition: 'all 0.3s ease',
    };
    const primaryBtn: React.CSSProperties = {
        ...actionBtnStyle,
        background: 'linear-gradient(180deg, rgba(52,211,153,0.25) 0%, rgba(5,150,105,0.35) 100%)',
        color: '#a7f3d0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
    };
    const secondaryBtn: React.CSSProperties = {
        ...actionBtnStyle,
        background: 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.5)',
        border: '1px solid rgba(255,255,255,0.08)',
    };

    const sectionLabel: React.CSSProperties = {
        fontSize: 10, fontWeight: 800, color: 'rgba(200,170,110,0.7)',
        textTransform: 'uppercase', letterSpacing: 2,
        borderBottom: '1px solid rgba(200,170,110,0.15)',
        paddingBottom: 8, marginBottom: 14,
    };

    const content = (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={onClose} style={centered ? {} : { display: 'block' }}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div ref={modalRef} className="relative w-full max-w-lg animate-pure-fade" onClick={(e) => e.stopPropagation()}
                style={{
                    ...modalStyle,
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%), linear-gradient(180deg, rgba(30, 41, 59, 0.97) 0%, rgba(15, 23, 42, 0.99) 100%)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderTop: '1px solid rgba(255,255,255,0.35)',
                    borderRadius: 18,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                }}>

                {/* ═══ HEADER — Premium Metalik Bar ═══ */}
                <div onMouseDown={handleMouseDown} style={{
                    padding: '12px 20px',
                    background: 'linear-gradient(180deg, #5a6070 0%, #3d4250 15%, #1e222e 50%, #282c3a 75%, #3a3f50 100%)',
                    borderBottom: '1px solid rgba(0,0,0,0.5)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 6px rgba(0,0,0,0.3)',
                    cursor: 'move', userSelect: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: 'linear-gradient(180deg, rgba(251,191,36,0.25) 0%, rgba(217,119,6,0.35) 100%)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16,
                        }}>👑</div>
                        <div>
                            <h2 style={{ fontSize: 13, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: 1, textTransform: 'uppercase' }}>GodMaster Profil</h2>
                            <span style={{ fontSize: 9, color: 'rgba(200,170,110,0.5)', fontStyle: 'italic' }}>premium profil yöneticisi</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        padding: 6, borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                    }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                    ><X className="w-4 h-4" /></button>
                </div>

                {/* ═══ TAB BAR ═══ */}
                <div style={{
                    display: 'flex', gap: 2, padding: '10px 16px 6px', flexWrap: 'wrap',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '6px 10px', fontSize: 10, fontWeight: 700, borderRadius: 8,
                                transition: 'all 0.2s', cursor: 'pointer', border: 'none',
                                letterSpacing: 0.5,
                                background: activeTab === tab.id
                                    ? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'
                                    : 'transparent',
                                color: activeTab === tab.id ? '#fef3c7' : 'rgba(255,255,255,0.35)',
                                boxShadow: activeTab === tab.id
                                    ? 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.2)'
                                    : 'none',
                                borderBottom: activeTab === tab.id ? '2px solid rgba(251,191,36,0.5)' : '2px solid transparent',
                            }}>{tab.icon} {tab.label}</button>
                    ))}
                </div>

                {/* ═══ CONTENT ═══ */}
                <div style={{ padding: '12px 20px 20px', maxHeight: activeTab === '3d' ? '60vh' : '50vh', overflowY: 'auto' }} className="custom-scrollbar">
                    {error && <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 10, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#fca5a5', fontSize: 11, fontWeight: 600 }}>{error}</div>}
                    {success && <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 10, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#a7f3d0', fontSize: 11, fontWeight: 600 }}>{success}</div>}

                    {/* ═══ GIF NICK ═══ */}
                    {activeTab === 'gif' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={sectionLabel}>🎬 Hareketli GIF Nickname</div>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
                                Hareketli GIF yükleyin. Otomatik kütüphaneye kaydedilir. <span style={{ color: '#67e8f9' }}>Maks 2MB</span>
                            </p>

                            {/* Upload Area */}
                            <div onClick={() => fileInputRef.current?.click()} style={{
                                borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                                minHeight: 90, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: gifPreview ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)',
                                border: gifPreview ? '1px solid rgba(255,255,255,0.1)' : '2px dashed rgba(255,255,255,0.1)',
                                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.2)',
                                transition: 'all 0.3s',
                                position: 'relative',
                            }}>
                                {gifPreview ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={gifPreview} alt="GIF" style={{ maxHeight: 70, objectFit: 'contain', borderRadius: 8 }} />
                                        <div style={{
                                            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                                            opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }} className="group-hover-overlay">
                                            <Upload className="w-5 h-5" style={{ color: '#fff' }} />
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                        <Upload className="w-6 h-6 mx-auto" style={{ color: 'rgba(255,255,255,0.15)', marginBottom: 6 }} />
                                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', margin: 0 }}>Tıklayarak GIF yükleyin</p>
                                    </div>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/gif" style={{ display: 'none' }} onChange={handleGifSelect} />
                            {gifFileName && <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', margin: 0 }}>📎 {gifFileName}</p>}

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={handleSaveGif} disabled={!gifPreview} style={{
                                    ...primaryBtn, flex: 1, opacity: gifPreview ? 1 : 0.4,
                                }}><Save className="w-3.5 h-3.5" /> Kaydet & Kullan</button>
                                {gifPreview && (
                                    <button onClick={handleRemoveGif} style={secondaryBtn}>
                                        <Trash2 className="w-3.5 h-3.5" /> Kaldır
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══ KÜTÜPHANE ═══ */}
                    {activeTab === 'library' && (
                        <div>
                            <div style={sectionLabel}>📚 GIF Kütüphanesi</div>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 14px' }}>Kayıtlı GIF&apos;leriniz. Tıklayarak kullanın.</p>
                            {gifLibrary.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                                    <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>📭</div>
                                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Henüz GIF kaydedilmemiş</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                    {gifLibrary.map(gif => (
                                        <div key={gif.id} style={{
                                            borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                                            background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)',
                                            transition: 'all 0.2s', position: 'relative',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }} onClick={() => handleUseFromLibrary(gif)}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={gif.dataUri} alt={gif.name} style={{ maxHeight: 48, objectFit: 'contain' }} />
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 8px 6px' }}>
                                                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{gif.name}</span>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteFromLibrary(gif.id); }}
                                                    style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4 }}>✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ 3D EFEKT ═══ */}
                    {activeTab === '3d' && (
                        <div>
                            <div style={sectionLabel}>🔱 3D Animasyonlu Efekt</div>

                            {/* Live Preview */}
                            <div style={{
                                background: 'rgba(0,0,0,0.4)', borderRadius: 14,
                                border: '1px solid rgba(255,255,255,0.08)', padding: 10,
                                marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                position: 'relative', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)',
                            }}>
                                <div style={{ position: 'absolute', top: 6, left: 12, fontSize: 8, color: 'rgba(56,189,248,0.5)', fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' }}>CANLI ÖNİZLEME</div>
                                <ThreeDTextBanner mainText={customMainText || 'SopranoChat'} subText={customSubText} theme={customTheme} width={420} height={100} params={params3D} />
                            </div>

                            {/* Text inputs */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                <div>
                                    <label style={{ fontSize: 9, color: 'rgba(200,170,110,0.5)', fontWeight: 700, marginBottom: 4, display: 'block', letterSpacing: 1, textTransform: 'uppercase' }}>Ana Metin</label>
                                    <input value={customMainText} onChange={(e) => setCustomMainText(e.target.value)} maxLength={16} placeholder="SopranoChat"
                                        className="owner-input-inset" style={{ width: '100%', fontSize: 12, color: '#fff', borderRadius: 10, padding: '8px 12px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: 9, color: 'rgba(200,170,110,0.5)', fontWeight: 700, marginBottom: 4, display: 'block', letterSpacing: 1, textTransform: 'uppercase' }}>Alt Metin</label>
                                    <input value={customSubText} onChange={(e) => setCustomSubText(e.target.value)} maxLength={12} placeholder="Owner"
                                        className="owner-input-inset" style={{ width: '100%', fontSize: 12, color: '#fff', borderRadius: 10, padding: '8px 12px' }} />
                                </div>
                            </div>

                            {/* Theme selector */}
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
                                {THEMES_3D.map(t => (
                                    <button key={t} onClick={() => setCustomTheme(t)} style={{
                                        padding: '5px 12px', fontSize: 10, fontWeight: 700, borderRadius: 8,
                                        transition: 'all 0.2s', textTransform: 'capitalize', cursor: 'pointer', border: 'none',
                                        background: customTheme === t ? 'linear-gradient(180deg, rgba(56,189,248,0.2), rgba(2,132,199,0.3))' : 'rgba(255,255,255,0.03)',
                                        color: customTheme === t ? '#67e8f9' : 'rgba(255,255,255,0.3)',
                                        boxShadow: customTheme === t ? '0 2px 8px rgba(56,189,248,0.15), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                                    }}>{t}</button>
                                ))}
                            </div>

                            {/* Editor Section Tabs */}
                            <div style={{
                                display: 'flex', gap: 3, marginBottom: 12,
                                background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 3,
                                border: '1px solid rgba(255,255,255,0.04)',
                            }}>
                                {EDITOR_SECTIONS.map(sec => (
                                    <button key={sec.id} onClick={() => setEditorSection(sec.id)} style={{
                                        flex: 1, padding: '6px 0', fontSize: 10, fontWeight: 700,
                                        borderRadius: 8, transition: 'all 0.2s', cursor: 'pointer', border: 'none',
                                        background: editorSection === sec.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                                        color: editorSection === sec.id ? '#67e8f9' : 'rgba(255,255,255,0.3)',
                                        boxShadow: editorSection === sec.id ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
                                    }}>{sec.icon} {sec.label}</button>
                                ))}
                            </div>

                            {/* Editor controls */}
                            <div style={{
                                background: 'rgba(0,0,0,0.2)', borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.04)', padding: '14px 16px', marginBottom: 14,
                            }}>
                                {editorSection === 'anim' && (<>
                                    {/* Animation Mode Selector */}
                                    <div style={{ marginBottom: 14 }}>
                                        <div style={{ fontSize: 10, color: 'rgba(200,170,110,0.6)', fontWeight: 700, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Hareket Tipi</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                                            {ANIM_MODES.map(mode => (
                                                <button key={mode.id} onClick={() => setParam('animMode', mode.id)} title={mode.desc} style={{
                                                    padding: '7px 2px', fontSize: 9, fontWeight: 700, borderRadius: 8,
                                                    transition: 'all 0.2s', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                                                    border: 'none',
                                                    background: params3D.animMode === mode.id ? 'linear-gradient(180deg, rgba(56,189,248,0.15), rgba(2,132,199,0.2))' : 'rgba(255,255,255,0.02)',
                                                    color: params3D.animMode === mode.id ? '#67e8f9' : 'rgba(255,255,255,0.25)',
                                                    boxShadow: params3D.animMode === mode.id ? '0 0 10px rgba(56,189,248,0.1), inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                                                }}>
                                                    <span style={{ fontSize: 14 }}>{mode.icon}</span>
                                                    <span>{mode.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '4px 0 12px' }} />
                                    <PremiumSlider label="Hız" icon="⚡" value={params3D.animSpeed} min={0.0003} max={0.005} step={0.0001} onChange={(v) => setParam('animSpeed', v)} />
                                    <PremiumSlider label="Y Dönme Genliği" icon="↔️" value={params3D.rotationY} min={0} max={1.5} step={0.01} onChange={(v) => setParam('rotationY', v)} />
                                    <PremiumSlider label="X Dönme Genliği" icon="↕️" value={params3D.rotationX} min={0} max={0.8} step={0.01} onChange={(v) => setParam('rotationX', v)} />
                                </>)}
                                {editorSection === 'shape' && (<>
                                    <PremiumSlider label="Metin Derinliği" icon="📏" value={params3D.textDepth} min={0.1} max={3.0} step={0.05} onChange={(v) => setParam('textDepth', v)} />
                                    <PremiumSlider label="Bevel Kalınlığı" icon="🔷" value={params3D.bevelThickness} min={0} max={1.5} step={0.05} onChange={(v) => setParam('bevelThickness', v)} />
                                    <PremiumSlider label="Bevel Büyüklüğü" icon="🔶" value={params3D.bevelSize} min={0} max={0.8} step={0.02} onChange={(v) => setParam('bevelSize', v)} />
                                </>)}
                                {editorSection === 'light' && (<>
                                    <PremiumSlider label="Işık Şiddeti" icon="☀️" value={params3D.lightIntensity} min={0} max={3.0} step={0.1} onChange={(v) => setParam('lightIntensity', v)} />
                                    <PremiumSlider label="Işık X Pozisyonu" icon="◀▶" value={params3D.lightX} min={-30} max={30} step={1} onChange={(v) => setParam('lightX', v)} />
                                    <PremiumSlider label="Işık Y Pozisyonu" icon="▲▼" value={params3D.lightY} min={-30} max={30} step={1} onChange={(v) => setParam('lightY', v)} />
                                </>)}
                                {editorSection === 'camera' && (<>
                                    <PremiumSlider label="Yakınlaştırma (Zoom)" icon="🔍" value={params3D.cameraZ} min={10} max={40} step={0.5} onChange={(v) => setParam('cameraZ', v)} />
                                    <PremiumSlider label="Yüzey Parlaklığı" icon="✨" value={params3D.shininess} min={0} max={200} step={5} onChange={(v) => setParam('shininess', v)} />
                                </>)}
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setParams3D({ ...DEFAULT_3D_PARAMS })} style={secondaryBtn}>
                                    <RotateCcw className="w-3.5 h-3.5" /> Sıfırla
                                </button>
                                <button onClick={handleApply3D} style={{ ...primaryBtn, flex: 1, background: 'linear-gradient(180deg, rgba(251,191,36,0.25) 0%, rgba(217,119,6,0.35) 100%)', color: '#fef3c7', boxShadow: '0 4px 16px rgba(0,0,0,0.3), 0 0 12px rgba(251,191,36,0.1), inset 0 1px 0 rgba(255,255,255,0.15)' }}>
                                    <Crown className="w-3.5 h-3.5" /> 3D Efekti Uygula
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══ AVATAR ═══ */}
                    {activeTab === 'avatar' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={sectionLabel}>🖼️ Avatar Seçimi</div>

                            {/* Preview */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                                <div style={{
                                    width: 72, height: 72, borderRadius: 18, overflow: 'hidden',
                                    border: '2px solid rgba(255,255,255,0.15)',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 0 20px rgba(56,189,248,0.1)',
                                }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={selectedAvatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            </div>

                            {/* Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                {ALL_AVATARS.map(av => (
                                    <button key={av} onClick={() => setSelectedAvatarUrl(av)} style={{
                                        padding: 3, borderRadius: 12, transition: 'all 0.2s', cursor: 'pointer', border: 'none',
                                        background: selectedAvatarUrl === av ? 'linear-gradient(180deg, rgba(56,189,248,0.2), rgba(2,132,199,0.15))' : 'rgba(255,255,255,0.02)',
                                        outline: selectedAvatarUrl === av ? '2px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.06)',
                                        boxShadow: selectedAvatarUrl === av ? '0 0 14px rgba(56,189,248,0.15)' : 'none',
                                    }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={av} alt="" style={{ width: '100%', aspectRatio: '1', borderRadius: 10, objectFit: 'cover' }} />
                                    </button>
                                ))}
                            </div>

                            <button onClick={() => { onChangeAvatar(selectedAvatarUrl); setSuccess('Avatar kaydedildi!'); setTimeout(() => { setSuccess(''); onClose(); }, 800); }}
                                style={{ ...primaryBtn, width: '100%' }}><Save className="w-3.5 h-3.5" /> Avatarı Kaydet</button>
                        </div>
                    )}

                    {/* ═══ İSİM ═══ */}
                    {activeTab === 'name' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={sectionLabel}>✏️ İsim Değiştir</div>

                            <div style={{
                                padding: '10px 14px', borderRadius: 10,
                                background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.1)',
                                fontSize: 11, color: '#67e8f9', fontWeight: 600,
                            }}>Mevcut: <span style={{ color: '#fff' }}>{currentUser?.username || '—'}</span></div>

                            <input value={newName} onChange={(e) => { setNewName(e.target.value); setError(''); }} maxLength={20} placeholder="Yeni isim..."
                                className="owner-input-inset" style={{ width: '100%', fontSize: 13, color: '#fff', borderRadius: 10, padding: '12px 16px' }} />

                            <button onClick={() => {
                                if (!newName.trim() || newName.trim().length < 2) { setError('En az 2 karakter gerekli'); return; }
                                onChangeName(newName.trim()); setSuccess('İsim değiştirildi!'); setTimeout(() => { setSuccess(''); onClose(); }, 800);
                            }} style={{ ...primaryBtn, width: '100%' }}><Save className="w-3.5 h-3.5" /> İsmi Kaydet</button>
                        </div>
                    )}

                    {/* ═══ İKON ═══ */}
                    {activeTab === 'icon' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={sectionLabel}>⚡ GodMaster İkon</div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
                                {GODMASTER_ICONS.map(icon => (
                                    <button key={icon} onClick={() => setSelectedIcon(icon)} style={{
                                        width: '100%', aspectRatio: '1', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 18, transition: 'all 0.2s', cursor: 'pointer', border: 'none',
                                        background: selectedIcon === icon ? 'linear-gradient(180deg, rgba(251,191,36,0.2), rgba(217,119,6,0.15))' : 'rgba(255,255,255,0.02)',
                                        outline: selectedIcon === icon ? '2px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.06)',
                                        boxShadow: selectedIcon === icon ? '0 0 12px rgba(251,191,36,0.15)' : 'none',
                                    }}>{icon}</button>
                                ))}
                            </div>

                            {/* Preview */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10,
                                background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                <span style={{ fontSize: 18 }}>{selectedIcon}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{currentUser?.username || 'GodMaster'}</span>
                            </div>

                            <button onClick={() => { onChangeIcon(selectedIcon); setSuccess('İkon güncellendi!'); setTimeout(() => { setSuccess(''); onClose(); }, 800); }}
                                style={{ ...primaryBtn, width: '100%' }}><Save className="w-3.5 h-3.5" /> İkonu Kaydet</button>
                        </div>
                    )}

                    {/* ═══ RENK ═══ */}
                    {activeTab === 'color' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={sectionLabel}>🎨 İsim Rengi</div>

                            {/* Preview */}
                            <div style={{ textAlign: 'center', padding: '12px 0' }}>
                                <span style={{ fontSize: 18, fontWeight: 800, color: selectedColor, textShadow: `0 0 20px ${selectedColor}40` }}>
                                    {currentUser?.username || 'GodMaster'}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 6 }}>
                                {NAME_COLORS.map(c => (
                                    <button key={c} onClick={() => setSelectedColor(c)} style={{
                                        width: '100%', aspectRatio: '1', borderRadius: 10, transition: 'all 0.2s', cursor: 'pointer', border: 'none',
                                        background: c,
                                        outline: selectedColor === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: selectedColor === c ? `0 0 16px ${c}60, inset 0 1px 0 rgba(255,255,255,0.3)` : 'inset 0 1px 0 rgba(255,255,255,0.15)',
                                        transform: selectedColor === c ? 'scale(1.15)' : 'scale(1)',
                                    }} />
                                ))}
                            </div>

                            <button onClick={() => { onChangeNameColor(selectedColor); setSuccess('Renk güncellendi!'); setTimeout(() => { setSuccess(''); onClose(); }, 800); }}
                                style={{ ...primaryBtn, width: '100%' }}><Save className="w-3.5 h-3.5" /> Rengi Kaydet</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(content, document.body);
}
