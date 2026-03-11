'use client';
import React, { useState, useEffect, useRef } from 'react';

/* ───────────────────────────────────────────────────
   CRT Demo Simulation — Demo room exact replica
   With admin menus, ban/gag/kick features
   ─────────────────────────────────────────────────── */

const USERS = [
    { name: 'Yılmaz', role: 'Site Sahibi', avatar: '🧔', online: true, isSelf: true },
    { name: 'Ayşe', role: 'Admin', avatar: '👩', online: true, isSelf: false },
    { name: 'Kemal', role: 'Moderatör', avatar: '👨', online: true, isSelf: false },
    { name: 'Fatma', role: 'Operatör', avatar: '👩‍🦰', online: true, isSelf: false },
    { name: 'Zeynep', role: 'VIP', avatar: '👸', online: true, isSelf: false },
    { name: 'Mehmet', role: 'Üye', avatar: '👨‍🦱', online: true, isSelf: false },
    { name: 'Ahmet', role: 'Misafir', avatar: '🧑', online: true, isSelf: false },
    { name: 'Elif', role: 'Misafir', avatar: '👧', online: true, isSelf: false },
    { name: 'Ali', role: 'Üye', avatar: '🧑‍💼', online: false, isSelf: false },
];

const CAMERA_NAMES = ['Nila', 'Lir', 'Cam', 'Ada', 'Lun', 'Inka', 'Pym', 'Linda', 'Killa', 'Elfe', 'Papua', 'Mays'];

const MESSAGES = [
    { user: 'Yılmaz', text: 'Herkese merhaba! 🎉', color: '#38bdf8', time: '10:31' },
    { user: 'Ayşe', text: 'Selam Yılmaz!', color: '#e879f9', time: '10:32' },
    { user: 'Kemal', text: 'Bugün yayın var mı?', color: '#34d399', time: '10:32' },
    { user: 'Fatma', text: 'Güzel akşamlar 💜', color: '#fb923c', time: '10:33' },
    { user: 'Yılmaz', text: '📢 21:00\'da canlı müzik!', color: '#38bdf8', time: '10:33' },
    { user: 'Zeynep', text: 'Harika! Sabırsızlanıyorum 🎵', color: '#fbbf24', time: '10:34' },
    { user: 'Mehmet', text: 'Ben de geliyorum!', color: '#34d399', time: '10:34' },
    { user: 'Ahmet', text: 'Kamera açabilir miyim?', color: '#94a3b8', time: '10:35' },
    { user: 'Elif', text: 'Platform çok kaliteli 👏', color: '#f472b6', time: '10:35' },
    { user: 'Yılmaz', text: '✅ Ahmet, kamera izni verdim.', color: '#38bdf8', time: '10:36' },
];

const ADMIN_ACTIONS = [
    { icon: '🚫', label: 'Banla', desc: 'Kalıcı yasakla', color: '#ef4444' },
    { icon: '🔇', label: 'Gag', desc: 'Yazı yazmayı engelle', color: '#f59e0b' },
    { icon: '🔕', label: 'Sustur', desc: 'Mikrofonu kapat', color: '#f97316' },
    { icon: '👢', label: 'At', desc: 'Odadan çıkar', color: '#fb7185' },
    { icon: '🎤', label: 'Mikrofon Ver', desc: 'Konuşma izni', color: '#22c55e' },
    { icon: '📹', label: 'Kamera İzni', desc: 'Yayın izni ver', color: '#3b82f6' },
    { icon: '⭐', label: 'VIP Yap', desc: 'VIP rolü ata', color: '#a855f7' },
    { icon: '🛡️', label: 'Admin Yap', desc: 'Yönetici yetkisi ver', color: '#06b6d4' },
];

export default function CRTDemoSimulation() {
    const [visibleMessages, setVisibleMessages] = useState(0);
    const [micLevel, setMicLevel] = useState(0);
    const [adminMenuUser, setAdminMenuUser] = useState(-1);
    const [highlightedAction, setHighlightedAction] = useState(-1);
    const [adminCycle, setAdminCycle] = useState(0);
    const chatRef = useRef<HTMLDivElement>(null);

    // Mesajları sırayla göster
    useEffect(() => {
        if (visibleMessages >= MESSAGES.length) {
            const t = setTimeout(() => setVisibleMessages(0), 5000);
            return () => clearTimeout(t);
        }
        const t = setTimeout(() => setVisibleMessages(v => v + 1), 2200);
        return () => clearTimeout(t);
    }, [visibleMessages]);

    useEffect(() => {
        chatRef.current && (chatRef.current.scrollTop = chatRef.current.scrollHeight);
    }, [visibleMessages]);

    // Mic level sim
    useEffect(() => {
        const iv = setInterval(() => setMicLevel(Math.random() * 100), 200);
        return () => clearInterval(iv);
    }, []);

    // Admin menüyü periyodik göster — farklı kullanıcılarda döngü
    useEffect(() => {
        const targetUsers = [2, 3, 4, 5]; // Kemal, Fatma, Ahmet, Elif üzerinde gez
        const showMenu = () => {
            const userIdx = targetUsers[adminCycle % targetUsers.length];
            setAdminMenuUser(userIdx);
            setHighlightedAction(-1);

            // Action highlight animasyonu
            let actionIdx = 0;
            const actionInterval = setInterval(() => {
                setHighlightedAction(actionIdx);
                actionIdx++;
                if (actionIdx >= ADMIN_ACTIONS.length) {
                    clearInterval(actionInterval);
                    setTimeout(() => {
                        setAdminMenuUser(-1);
                        setHighlightedAction(-1);
                        setAdminCycle(c => c + 1);
                    }, 600);
                }
            }, 400);
            return () => clearInterval(actionInterval);
        };

        const timer = setTimeout(showMenu, 5000);
        return () => clearTimeout(timer);
    }, [adminCycle]);

    return (
        <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(180deg, #9ba8cc 0%, #b5bedb 50%, #ccd3ea 100%)',
            display: 'flex', fontFamily: '"Inter", system-ui, sans-serif',
            overflow: 'hidden',
        }}>

            {/* ══════ SOL SIDEBAR ══════ */}
            <div style={{
                width: 300, background: 'linear-gradient(180deg, #8e9bc2 0%, #a5b0d2 100%)',
                borderRight: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', flexDirection: 'column', flexShrink: 0,
            }}>
                {/* Lamba ışık çizgisi */}
                <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 120, height: 3, borderRadius: 2, background: 'linear-gradient(90deg, transparent, rgba(255,210,100,0.3), transparent)' }} />
                </div>

                {/* ÇEVRİMİÇİ */}
                <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>☁</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8', letterSpacing: '0.1em' }}>ÇEVRİMİÇİ</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#546380', fontWeight: 600 }}>{USERS.filter(u => u.online).length}kişi</span>
                </div>

                {/* Kullanıcı listesi */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px', position: 'relative' }}>
                    {USERS.map((u, i) => {
                        // Rol bazlı renk paleti
                        const roleColors: Record<string, { card: string; cardBorder: string; cardShadow: string; avatarBorder: string; avatarGlow: string; nameColor: string; roleColor: string; icon: string }> = {
                            'Site Sahibi': { card: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(217,119,6,0.04) 50%, transparent 100%)', cardBorder: 'rgba(245,158,11,0.3)', cardShadow: '0 0 10px rgba(245,158,11,0.1)', avatarBorder: 'rgba(245,158,11,0.5)', avatarGlow: '0 0 8px rgba(245,158,11,0.25)', nameColor: '#fbbf24', roleColor: '#f59e0b', icon: '👑' },
                            'Admin': { card: 'linear-gradient(135deg, rgba(96,165,250,0.08) 0%, rgba(59,130,246,0.04) 50%, transparent 100%)', cardBorder: 'rgba(96,165,250,0.25)', cardShadow: '0 0 8px rgba(96,165,250,0.08)', avatarBorder: 'rgba(96,165,250,0.5)', avatarGlow: '0 0 6px rgba(96,165,250,0.2)', nameColor: '#60a5fa', roleColor: '#3b82f6', icon: '🛡️' },
                            'Moderatör': { card: 'linear-gradient(135deg, rgba(52,211,153,0.08) 0%, rgba(16,185,129,0.04) 50%, transparent 100%)', cardBorder: 'rgba(52,211,153,0.2)', cardShadow: '0 0 6px rgba(52,211,153,0.06)', avatarBorder: 'rgba(52,211,153,0.4)', avatarGlow: '0 0 4px rgba(52,211,153,0.15)', nameColor: '#34d399', roleColor: '#10b981', icon: '🔧' },
                            'Operatör': { card: 'linear-gradient(135deg, rgba(34,211,238,0.08) 0%, rgba(6,182,212,0.04) 50%, transparent 100%)', cardBorder: 'rgba(34,211,238,0.2)', cardShadow: '0 0 6px rgba(34,211,238,0.06)', avatarBorder: 'rgba(34,211,238,0.4)', avatarGlow: '0 0 4px rgba(34,211,238,0.15)', nameColor: '#22d3ee', roleColor: '#06b6d4', icon: '🎯' },
                            'VIP': { card: 'linear-gradient(135deg, rgba(250,204,21,0.08) 0%, rgba(234,179,8,0.04) 50%, transparent 100%)', cardBorder: 'rgba(250,204,21,0.25)', cardShadow: '0 0 8px rgba(250,204,21,0.08)', avatarBorder: 'rgba(250,204,21,0.5)', avatarGlow: '0 0 6px rgba(250,204,21,0.2)', nameColor: '#fbbf24', roleColor: '#eab308', icon: '💎' },
                            'Üye': { card: 'transparent', cardBorder: 'rgba(148,163,184,0.12)', cardShadow: 'none', avatarBorder: 'rgba(148,163,184,0.2)', avatarGlow: 'none', nameColor: '#e2e8f0', roleColor: '#64748b', icon: '' },
                            'Misafir': { card: 'transparent', cardBorder: 'rgba(100,116,139,0.08)', cardShadow: 'none', avatarBorder: 'rgba(100,116,139,0.15)', avatarGlow: 'none', nameColor: '#94a3b8', roleColor: '#475569', icon: '' },
                        };
                        const rc = roleColors[u.role] || roleColors['Misafir'];

                        return (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '9px 12px', borderRadius: 10,
                                opacity: u.online ? 1 : 0.4,
                                background: adminMenuUser === i ? 'rgba(56,189,248,0.08)' : u.isSelf ? 'linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(56,189,248,0.03) 50%, transparent 100%)' : rc.card,
                                border: u.isSelf ? '1.5px solid rgba(34,211,238,0.3)' : `1px solid ${rc.cardBorder}`,
                                boxShadow: u.isSelf ? '0 0 14px rgba(34,211,238,0.12)' : rc.cardShadow,
                                transition: 'all 0.3s',
                                position: 'relative',
                                overflow: 'hidden',
                            }}>
                                {/* isSelf daralan çerçeve overlay */}
                                {u.isSelf && (
                                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                                        {/* Daralan gradient fill */}
                                        <div style={{
                                            position: 'absolute', inset: 0,
                                            clipPath: 'polygon(0% 15%, 12% 0%, 100% 0%, 100% 100%, 12% 100%, 0% 85%)',
                                            background: 'linear-gradient(90deg, rgba(34,211,238,0.15) 0%, rgba(56,189,248,0.08) 25%, rgba(99,102,241,0.04) 60%, transparent 100%)',
                                        }} />
                                        {/* Üst çizgi */}
                                        <div style={{ position: 'absolute', top: 0, left: '12%', right: 0, height: 2, background: 'linear-gradient(90deg, rgba(34,211,238,0.7), rgba(56,189,248,0.4), rgba(99,102,241,0.15), transparent)' }} />
                                        {/* Alt çizgi */}
                                        <div style={{ position: 'absolute', bottom: 0, left: '12%', right: 0, height: 2, background: 'linear-gradient(90deg, rgba(34,211,238,0.7), rgba(56,189,248,0.4), rgba(99,102,241,0.15), transparent)' }} />
                                        {/* Sağ kenar */}
                                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 2, background: 'linear-gradient(180deg, rgba(34,211,238,0.15), rgba(56,189,248,0.08), rgba(34,211,238,0.15))' }} />
                                        {/* Sol kenar — kısa dikey */}
                                        <div style={{ position: 'absolute', left: 0, top: '15%', bottom: '15%', width: 2, background: 'linear-gradient(180deg, transparent, rgba(34,211,238,0.6), transparent)' }} />
                                        {/* Üst-sol köşegen (daralan) */}
                                        <div style={{ position: 'absolute', top: 0, left: 0, width: '14%', height: '16%', background: 'linear-gradient(to bottom right, transparent 46%, rgba(34,211,238,0.6) 49%, rgba(34,211,238,0.6) 51%, transparent 54%)' }} />
                                        {/* Alt-sol köşegen (daralan) */}
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '14%', height: '16%', background: 'linear-gradient(to top right, transparent 46%, rgba(34,211,238,0.6) 49%, rgba(34,211,238,0.6) 51%, transparent 54%)' }} />
                                    </div>
                                )}
                                {/* Avatar */}
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    {/* Self glow ring */}
                                    {u.isSelf && (
                                        <div style={{
                                            position: 'absolute', inset: -3, borderRadius: '50%',
                                            background: 'linear-gradient(135deg, rgba(34,211,238,0.6), rgba(56,189,248,0.3), rgba(99,102,241,0.4), rgba(34,211,238,0.6))',
                                            animation: 'selfRingRotate 4s linear infinite',
                                            filter: 'blur(1px)',
                                        }} />
                                    )}
                                    <div style={{
                                        width: 38, height: 38, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #2b3650, #3a4b65)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 18, position: 'relative', zIndex: 1,
                                        border: u.isSelf ? '2px solid rgba(34,211,238,0.5)' : adminMenuUser === i ? '2px solid rgba(56,189,248,0.4)' : `2px solid ${rc.avatarBorder}`,
                                        boxShadow: u.isSelf ? '0 0 10px rgba(34,211,238,0.3)' : rc.avatarGlow,
                                        transition: 'all 0.3s',
                                    }}>
                                        {u.avatar}
                                        <div style={{
                                            position: 'absolute', bottom: -1, right: -1,
                                            width: 10, height: 10, borderRadius: '50%',
                                            background: u.online ? '#22c55e' : '#475569',
                                            border: '2px solid #151c2c',
                                        }} />
                                    </div>
                                </div>
                                <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: rc.nameColor, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {u.name}
                                        {rc.icon && <span style={{ fontSize: 11 }}>{rc.icon}</span>}
                                        {u.isSelf && <span style={{ fontSize: 9, color: 'rgba(34,211,238,0.6)', fontWeight: 600, letterSpacing: '0.05em' }}>(sen)</span>}
                                    </div>
                                    <div style={{ fontSize: 11, fontWeight: 500, color: rc.roleColor }}>{u.role}</div>
                                </div>
                                <div style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: i === 0 && micLevel > 30 ? '#22c55e' : '#253045',
                                    transition: 'background 0.15s',
                                    zIndex: 1,
                                }} />

                                {/* ═══ ADMIN CONTEXT MENU ═══ */}
                                {adminMenuUser === i && (
                                    <div style={{
                                        position: 'absolute', left: '100%', top: -20,
                                        marginLeft: 8,
                                        background: '#1a2238', border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: 12, padding: '10px 0', width: 230,
                                        boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.4)',
                                        zIndex: 100, animation: 'simFadeIn 0.25s ease',
                                    }}>
                                        {/* Menu Header */}
                                        <div style={{ padding: '4px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 4 }}>
                                            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {u.avatar} {u.name}
                                            </div>
                                            <div style={{ fontSize: 10, color: '#546380', marginTop: 2 }}>👑 Owner Yetkileri</div>
                                        </div>

                                        {/* Actions */}
                                        {ADMIN_ACTIONS.map((action, ai) => (
                                            <div key={ai} style={{
                                                padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 10,
                                                background: highlightedAction === ai ? `${action.color}18` : 'transparent',
                                                borderLeft: highlightedAction === ai ? `3px solid ${action.color}` : '3px solid transparent',
                                                transition: 'all 0.2s',
                                            }}>
                                                <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{action.icon}</span>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{
                                                        fontSize: 12, fontWeight: 700,
                                                        color: highlightedAction === ai ? action.color : '#c8d0dc',
                                                        transition: 'color 0.2s',
                                                    }}>{action.label}</div>
                                                    <div style={{ fontSize: 9, color: '#546380', marginTop: 1 }}>{action.desc}</div>
                                                </div>
                                                {highlightedAction === ai && (
                                                    <div style={{
                                                        width: 6, height: 6, borderRadius: '50%',
                                                        background: action.color,
                                                        boxShadow: `0 0 8px ${action.color}80`,
                                                    }} />
                                                )}
                                            </div>
                                        ))}

                                        {/* Footer */}
                                        <div style={{ padding: '8px 16px 2px', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4 }}>
                                            <div style={{ fontSize: 9, color: '#546380', fontStyle: 'italic' }}>🔐 Owner seviyesi yetki menüsü</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Çevrimiçi dropdown */}
                <div style={{
                    margin: '0 12px 8px', padding: '8px 14px', borderRadius: 8,
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>Çevrimiçi</span>
                    </div>
                    <span style={{ fontSize: 14, color: '#546380' }}>▾</span>
                </div>

                {/* Radio Player */}
                <div style={{
                    margin: '0 12px 8px', padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', gap: 10,
                }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#94a3b8', fontSize: 13,
                    }}>▶</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>♪ Power Türk</div>
                        <div style={{ fontSize: 10, color: '#546380', fontWeight: 500 }}>Türkçe Pop → Power Türk C...</div>
                    </div>
                </div>

                {/* Kanallar + Volume */}
                <div style={{ margin: '0 12px 8px', display: 'flex', gap: 6 }}>
                    <div style={{
                        flex: 1, padding: '8px 10px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: 11, fontWeight: 600, color: '#94a3b8', textAlign: 'center',
                    }}>∞ Kanallar ▾</div>
                    <div style={{
                        width: 36, padding: '8px 0', borderRadius: 8,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        fontSize: 14, color: '#94a3b8', textAlign: 'center',
                    }}>🔊</div>
                </div>

                {/* MİKROFONU AL */}
                <div style={{
                    margin: '0 12px 12px', padding: '12px 0', borderRadius: 10, textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(56,189,248,0.06))',
                    border: '1px solid rgba(56,189,248,0.2)',
                    fontSize: 13, fontWeight: 800, color: '#38bdf8',
                    letterSpacing: '0.08em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>🎤 MİKROFONU AL ●</div>
            </div >

            {/* ══════ ORTA — Sohbet ══════ */}
            < div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'linear-gradient(180deg, #a3aed0 0%, #bcc5de 100%)' }
            }>

                {/* ROOM TABS */}
                < div style={{
                    height: 44, padding: '0 16px',
                    background: 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'flex-start', gap: 4,
                }}>
                    {
                        [
                            { name: 'GENEL', active: true },
                            { name: 'VIP', active: false },
                            { name: 'OYUN', active: false },
                        ].map((tab, i) => (
                            <div key={i} style={{
                                padding: '8px 18px', borderRadius: '8px 8px 0 0',
                                background: tab.active ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
                                border: tab.active ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.05)',
                                borderBottom: 'none',
                                fontSize: 11, fontWeight: tab.active ? 800 : 600,
                                color: tab.active ? '#e2e8f0' : '#64748b',
                                letterSpacing: '0.08em',
                                transform: tab.active ? 'translateY(6px)' : 'translateY(0)',
                                transition: 'all 0.3s ease',
                                marginTop: 6,
                            }}>
                                {tab.active && <span style={{ marginRight: 4 }}>•</span>}
                                {tab.name}
                            </div>
                        ))
                    }
                    < div style={{ flex: 1 }} />
                    < div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
                        <span style={{ fontSize: 16, color: '#fbbf24' }}>🔒</span>
                        <span style={{ fontSize: 16, color: '#64748b' }}>✉</span>
                    </div >
                </div >

                {/* Chat */}
                < div ref={chatRef} style={{
                    flex: 1, overflowY: 'auto', padding: '16px 20px',
                    display: 'flex', flexDirection: 'column', gap: 4,
                    background: 'linear-gradient(180deg, #a3aed0 0%, #bcc5de 100%)',
                }}>
                    <div style={{ textAlign: 'center', margin: '20px 0 16px' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            padding: '8px 20px', borderRadius: 20,
                        }}>
                            <span style={{ fontSize: 16 }}>🔥</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>SOHBET BAŞLANGICI</span>
                            <span style={{ fontSize: 10, color: '#546380' }}>- bugün 10:31</span>
                        </div>
                    </div>

                    {
                        MESSAGES.slice(0, visibleMessages).map((msg, i) => (
                            <div key={i} style={{ padding: '6px 0', animation: 'simSlideUp 0.3s ease' }}>
                                <span style={{ fontSize: 13, fontWeight: 800, color: msg.color }}>{msg.user}</span>
                                <span style={{ fontSize: 10, color: '#546380', marginLeft: 8 }}>{msg.time}</span>
                                <div style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 500, marginTop: 2, lineHeight: 1.5 }}>
                                    {msg.text}
                                </div>
                            </div>
                        ))
                    }
                </div >

                {/* Bottom Toolbar */}
                < div style={{
                    padding: '8px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', flexDirection: 'column', gap: 8,
                }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                        {['✋', '🔊', '😊', '🖼', '🎬'].map((icon, i) => (
                            <div key={i} style={{
                                width: 34, height: 34, borderRadius: 8,
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                            }}>{icon}</div>
                        ))}
                        <div style={{ flex: 1 }} />
                        {['⚙️', '🔴'].map((icon, i) => (
                            <div key={i} style={{
                                width: 34, height: 34, borderRadius: 8,
                                background: i === 1 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${i === 1 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                            }}>{icon}</div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{
                            flex: 1, height: 38, borderRadius: 8,
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex', alignItems: 'center', padding: '0 14px',
                        }}>
                            <span style={{ fontSize: 12, color: '#546380', fontWeight: 500 }}>Mesajınızı buraya yazın...</span>
                        </div>
                        <div style={{
                            padding: '0 18px', borderRadius: 8, height: 38,
                            background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)',
                            display: 'flex', alignItems: 'center', gap: 6,
                            fontSize: 12, fontWeight: 800, color: '#38bdf8',
                        }}>GÖNDER <span style={{ fontSize: 14 }}>➤</span></div>
                    </div>
                </div >
            </div >

            {/* ══════ SAĞ SIDEBAR ══════ */}
            < div style={{
                width: 320, background: 'linear-gradient(180deg, #8e9bc2 0%, #a5b0d2 100%)',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', flexDirection: 'column', flexShrink: 0,
                overflowY: 'auto',
            }}>
                {/* CANLI YAYIN */}
                < div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'simPulse 1.5s infinite' }} />
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', letterSpacing: '0.1em' }}>CANLI YAYIN</span>
                </div >

                {/* TV — static */}
                < div style={{
                    margin: '0 14px 12px', height: 160, borderRadius: 8,
                    position: 'relative', overflow: 'hidden',
                    background: '#1e2840', border: '1px solid rgba(255,255,255,0.08)',
                }}>
                    <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`,
                        backgroundSize: '128px 128px', opacity: 0.6,
                        animation: 'simStatic 0.15s steps(5) infinite',
                    }} />
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, transparent 1px, transparent 3px)',
                    }} />
                    <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 10, fontWeight: 700, color: '#546380' }}>
                        Yayın bekleniyor...
                    </div>
                </div >

                {/* KAMERALAR */}
                < div style={{ padding: '4px 14px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: '#64748b' }}>📹</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.1em' }}>KAMERALAR</span>
                    </div>
                    <span style={{ fontSize: 10, color: '#546380', fontWeight: 500 }}>sil/kır</span>
                </div >

                {/* Camera Grid */}
                < div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {
                        CAMERA_NAMES.map((name, i) => (
                            <div key={i} style={{
                                height: 52, borderRadius: 6,
                                background: '#1e2840', border: '1px solid rgba(255,255,255,0.08)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                            }}>
                                <div style={{
                                    width: 24, height: 24, borderRadius: 6,
                                    background: `hsl(${i * 30}, 30%, 30%)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, fontWeight: 700, color: '#8899aa',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                }}>{name.substring(0, 2)}</div>
                                <span style={{ fontSize: 9, color: '#546380', fontWeight: 600 }}>{name}</span>
                            </div>
                        ))
                    }
                </div >
            </div >

            <style>{`
                @keyframes simSlideUp {
                    from { opacity: 0; transform: translateY(6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes simPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                @keyframes simStatic {
                    0% { transform: translate(0, 0); }
                    20% { transform: translate(-5%, -5%); }
                    40% { transform: translate(3%, 2%); }
                    60% { transform: translate(-2%, 5%); }
                    80% { transform: translate(5%, -3%); }
                    100% { transform: translate(0, 0); }
                }
                @keyframes simFadeIn {
                    from { opacity: 0; transform: scale(0.95) translateX(-5px); }
                    to { opacity: 1; transform: scale(1) translateX(0); }
                }
                @keyframes selfRingRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div >
    );
}
