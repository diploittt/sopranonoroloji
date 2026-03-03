"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthUser, setAuthUser, removeAuthUser, clearAllSopranoAuth, AuthUser } from "@/lib/auth";
import { generateGenderAvatar } from "@/lib/avatar";
import {
    Mic, Video, Users, LogIn, Monitor,
    Headset, ShieldCheck, Play, Star, Sparkles,
    Volume2, User, Lock, Settings
} from "lucide-react";
import { API_URL } from '@/lib/api';
import ToastContainer from '@/components/ui/ToastContainer';
import { useAdminStore } from '@/lib/admin/store';

const AUTH_TOKEN_KEY = 'soprano_auth_token';

// --- SAHTE VERİLER ---
const ACTIVE_ROOMS = [
    { id: 1, name: "Goygoy & Müzik", owner: "Celine", users: 142, max: 250, type: "Kamera + Ses", isVip: false },
    { id: 2, name: "Gece Kuşları", owner: "Karanlık", users: 85, max: 100, type: "Sadece Ses", isVip: false },
    { id: 3, name: "Radyo Soprano", owner: "DJ.Bora", users: 310, max: 500, type: "Yayın", isVip: false },
    { id: 4, name: "Oyun Lobisi", owner: "GamerTR", users: 45, max: 50, type: "Kamera + Ses", isVip: false },
    { id: 5, name: "VIP Sohbet", owner: "Admin", users: 12, max: 30, type: "Özel Oda", isVip: true },
];

export default function HomePage() {
    const router = useRouter();
    const [guestNick, setGuestNick] = useState("");
    const [user, setUser] = useState<AuthUser | null>(null);
    const [guestLoading, setGuestLoading] = useState(false);
    const [guestError, setGuestError] = useState('');
    const [memberUsername, setMemberUsername] = useState('');
    const [memberPassword, setMemberPassword] = useState('');
    const [memberError, setMemberError] = useState('');
    const [memberLoading, setMemberLoading] = useState(false);
    const [dbRooms, setDbRooms] = useState<any[]>([]);
    const addToast = useAdminStore((s) => s.addToast);

    // Auth check on mount
    useEffect(() => {
        const initialUser = getAuthUser();
        if (initialUser && !initialUser.isMember) {
            clearAllSopranoAuth();
            setUser(null);
        } else {
            setUser(initialUser);
        }
        const onAuthChange = () => setUser(getAuthUser());
        window.addEventListener('auth-change', onAuthChange);
        return () => window.removeEventListener('auth-change', onAuthChange);
    }, []);

    // Fetch rooms
    useEffect(() => {
        const fetchRooms = () => {
            fetch(`${API_URL}/rooms/public`)
                .then(r => r.ok ? r.json() : [])
                .then((data: any[]) => {
                    if (Array.isArray(data) && data.length > 0)
                        setDbRooms(data.map((r: any) => ({ id: r.id, name: r.name, slug: r.slug, users: r._count?.participants || 0 })));
                }).catch(() => { });
        };
        fetchRooms();
        const interval = setInterval(fetchRooms, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!guestNick.trim()) return;
        setGuestError(''); setGuestLoading(true);
        localStorage.removeItem(AUTH_TOKEN_KEY); removeAuthUser();
        try {
            const res = await fetch(`${API_URL}/auth/guest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: guestNick.trim(), gender: 'Belirsiz' }) });
            const data = await res.json();
            if (data.error) { setGuestError(data.error); return; }
            localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
            const avatarUrl = generateGenderAvatar(guestNick.trim(), 'Belirsiz');
            const u: AuthUser = { userId: data.user.sub, username: data.user.username, avatar: data.user?.avatar || avatarUrl, isMember: false, role: 'guest' as const, gender: 'Belirsiz' };
            setAuthUser(u);
            window.location.href = '/room/genel-sohbet';
        } catch { setGuestError('Bağlantı hatası.'); } finally { setGuestLoading(false); }
    };

    const handleMemberLogin = async () => {
        if (!memberUsername.trim() || !memberPassword) { setMemberError('Kullanıcı adı ve şifre gerekli.'); return; }
        setMemberError(''); setMemberLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: memberUsername.trim(), password: memberPassword, tenantId: 'system' }) });
            const data = await res.json();
            if (!res.ok) { setMemberError(data.message === 'Invalid credentials' ? 'Geçersiz kullanıcı adı veya şifre.' : (data.message || 'Giriş başarısız.')); return; }
            if (data.access_token) {
                localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
                const u: AuthUser = { userId: data.user?.sub || memberUsername.trim(), username: data.user?.displayName || memberUsername.trim(), avatar: data.user?.avatar || generateGenderAvatar(memberUsername.trim()), isMember: true, role: (data.user?.role || 'member') as any };
                setAuthUser(u); setUser(u); window.dispatchEvent(new Event('auth-change'));
            } else { setMemberError(data.message || 'Giriş başarısız.'); }
        } catch { setMemberError('Bağlantı hatası.'); } finally { setMemberLoading(false); }
    };

    const handleLogout = () => {
        clearAllSopranoAuth();
        setUser(null);
        setGuestNick("");
    };

    const goRoom = (slug?: string) => {
        const rooms = dbRooms.length > 0 ? dbRooms : [{ slug: 'genel-sohbet' }];
        const roomSlug = slug || rooms[0]?.slug || 'genel-sohbet';
        router.push(`/room/${roomSlug}`);
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800;900&display=swap');

                body {
                    margin: 0;
                    padding: 0;
                    background: linear-gradient(to bottom, #a3ace5 0%, #c4c9ee 50%, #d8dbf4 100%);
                    background-attachment: fixed;
                    font-family: 'Plus Jakarta Sans', Tahoma, Verdana, Arial, sans-serif;
                    color: #f8fafc;
                    min-height: 100vh;
                    overflow-x: hidden;
                }

                .main-content {
                    width: 100%;
                    max-width: 1280px;
                    margin: 0 auto;
                    position: relative;
                    background-color: #7a7e9e;
                    min-height: 100vh;
                    border-left: 14px solid transparent;
                    border-right: 14px solid transparent;
                    border-image: linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.7) 30%, rgba(255,255,255,0.3) 70%, rgba(255,255,255,0.05) 100%) 1;
                    box-shadow:
                        0 0 40px rgba(0,0,0,0.5),
                        0 0 80px rgba(0,0,0,0.3),
                        inset 0 0 30px rgba(0,0,0,0.15),
                        -8px 0 20px rgba(0,0,0,0.4),
                        8px 0 20px rgba(0,0,0,0.4);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .retro-logo-text {
                    font-family: 'Arial Rounded MT Bold', 'Arial Black', sans-serif;
                    background: linear-gradient(180deg, #f0f2f6 0%, #c0c8d5 35%, #8a95a8 55%, #6a7588 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(1px 2px 2px rgba(0,0,0,0.9)) drop-shadow(-1px -1px 0px rgba(255,255,255,0.2));
                    letter-spacing: -1.5px;
                    transform: scaleY(1.05);
                }

                .retro-subtitle {
                    color: #9abfd9;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    letter-spacing: 0.5px;
                    text-shadow: 0 1px 1px rgba(0,0,0,0.9);
                    margin-top: 0px;
                    font-style: italic;
                    padding-left: 2px;
                }

                /* ====== PREMIUM HEADER BAR ====== */
                @keyframes headerSlide {
                    0% { transform: translateY(-100%); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .premium-header {
                    position: relative;
                    width: 100%;
                    height: 78px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 36px;
                    /* Bombeli metalik gradient — barrel efekti */
                    background: linear-gradient(180deg,
                        #5a6070 0%,
                        #3d4250 15%,
                        #1e222e 50%,
                        #282c3a 75%,
                        #3a3f50 100%);
                    border-radius: 0 0 28px 28px;
                    border: 1px solid rgba(0,0,0,0.5);
                    border-top: 1px solid rgba(120,130,150,0.6);
                    box-shadow:
                        0 6px 20px rgba(0, 0, 0, 0.5),
                        0 2px 6px rgba(0, 0, 0, 0.4),
                        inset 0 1px 0 rgba(255, 255, 255, 0.12),
                        inset 0 -1px 0 rgba(255, 255, 255, 0.05);
                    animation: headerSlide 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
                    z-index: 50;
                    overflow: hidden;
                }
                /* Üst parlak şerit — bombeli yansıma */
                .premium-header::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 10%;
                    right: 10%;
                    height: 35%;
                    background: linear-gradient(180deg,
                        rgba(255,255,255,0.06) 0%,
                        rgba(255,255,255,0.02) 50%,
                        transparent 100%);
                    border-radius: 0 0 50% 50%;
                    pointer-events: none;
                }

                /* Logo */
                .header-logo {
                    display: flex;
                    align-items: baseline;
                    gap: 14px;
                    flex-shrink: 0;
                }
                @keyframes premiumLogoReveal {
                    0% { opacity: 0; filter: brightness(0.5); transform: translateX(-12px); }
                    60% { opacity: 1; filter: brightness(1.8); }
                    100% { opacity: 1; filter: brightness(1); transform: translateX(0); }
                }
                .header-logo h1 {
                    margin: 0;
                    font-size: 38px;
                    line-height: 1;
                    letter-spacing: -1px;
                    animation: premiumLogoReveal 0.8s ease-out forwards;
                    animation-delay: 0.2s;
                    opacity: 0;
                }
                .header-logo .tagline {
                    font-size: 11px;
                    color: rgba(200, 180, 140, 0.5);
                    font-style: italic;
                    letter-spacing: 2px;
                    text-transform: lowercase;
                    opacity: 0;
                    animation: premiumLogoReveal 0.6s ease-out forwards;
                    animation-delay: 0.6s;
                }

                /* Nav linkleri */
                .header-nav {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                @keyframes navFadeIn {
                    0% { opacity: 0; transform: translateY(-6px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .nav-link {
                    position: relative;
                    padding: 8px 18px;
                    background: none;
                    border: none;
                    outline: none;
                    cursor: pointer;
                    color: rgba(255, 255, 255, 0.55);
                    font-family: 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif;
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 2.5px;
                    text-transform: uppercase;
                    transition: color 0.3s ease;
                    animation: navFadeIn 0.4s ease-out forwards;
                    opacity: 0;
                }
                .nav-link-0 { animation-delay: 0.4s; }
                .nav-link-1 { animation-delay: 0.5s; }
                .nav-link-2 { animation-delay: 0.6s; }
                .nav-link-3 { animation-delay: 0.7s; }
                .nav-link-4 { animation-delay: 0.8s; }

                .nav-link::after {
                    content: '';
                    position: absolute;
                    bottom: 2px;
                    left: 50%;
                    width: 0;
                    height: 1.5px;
                    background: linear-gradient(90deg, transparent, rgba(200, 170, 110, 0.8), transparent);
                    transition: width 0.3s ease, left 0.3s ease;
                }
                .nav-link:hover {
                    color: rgba(255, 255, 255, 0.95);
                }
                .nav-link:hover::after {
                    width: 70%;
                    left: 15%;
                }
                .nav-link:active {
                    color: rgba(200, 170, 110, 0.9);
                }

                .nav-dot {
                    width: 3px;
                    height: 3px;
                    border-radius: 50%;
                    background: rgba(200, 170, 110, 0.2);
                    flex-shrink: 0;
                }

                /* 6) İçerik kartları — sırayla fade-in */
                @keyframes contentFadeIn {
                    0% { transform: translateY(30px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .content-fade { opacity: 0; animation: contentFadeIn 0.6s ease-out forwards; }
                .content-fade-1 { animation-delay: 1.2s; }
                .content-fade-2 { animation-delay: 1.4s; }
                .content-fade-3 { animation-delay: 1.6s; }
                .content-fade-4 { animation-delay: 1.8s; }
                .content-fade-5 { animation-delay: 2.0s; }
                .content-fade-6 { animation-delay: 2.2s; }

                .glossy-panel {
                    background: linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.55) 100%);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-top: 1px solid rgba(255,255,255,0.4);
                    border-left: 1px solid rgba(255,255,255,0.25);
                    box-shadow:
                        0 50px 70px -20px rgba(0, 0, 0, 0.8),
                        0 20px 30px -10px rgba(0, 0, 0, 0.6),
                        inset 0 0 40px rgba(255, 255, 255, 0.05);
                    border-radius: 20px;
                    overflow: hidden;
                }

                .btn-3d {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    outline: none;
                    cursor: pointer;
                    border-radius: 12px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .btn-3d-blue { background: linear-gradient(180deg, #38bdf8 0%, #0284c7 100%); color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.4); box-shadow: inset 0 2px 0 rgba(255,255,255,0.5), inset 0 -2px 0 rgba(0,0,0,0.3), 0 6px 0 #0369a1, 0 10px 20px rgba(0,0,0,0.4); }
                .btn-3d-blue:active { transform: translateY(4px); box-shadow: inset 0 2px 0 rgba(255,255,255,0.5), inset 0 -2px 0 rgba(0,0,0,0.3), 0 2px 0 #0369a1, 0 4px 10px rgba(0,0,0,0.4); }

                .btn-3d-green { background: linear-gradient(180deg, #34d399 0%, #059669 100%); color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.4); box-shadow: inset 0 2px 0 rgba(255,255,255,0.5), inset 0 -2px 0 rgba(0,0,0,0.3), 0 6px 0 #047857, 0 10px 20px rgba(0,0,0,0.4); }
                .btn-3d-green:active { transform: translateY(4px); box-shadow: inset 0 2px 0 rgba(255,255,255,0.5), inset 0 -2px 0 rgba(0,0,0,0.3), 0 2px 0 #047857, 0 4px 10px rgba(0,0,0,0.4); }

                .btn-3d-gold { background: linear-gradient(180deg, #fbbf24 0%, #d97706 100%); color: #fffbeb; text-shadow: 0 1px 2px rgba(0,0,0,0.4); box-shadow: inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -2px 0 rgba(0,0,0,0.2), 0 6px 0 #b45309, 0 10px 20px rgba(0,0,0,0.4); }
                .btn-3d-gold:active { transform: translateY(4px); box-shadow: inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -2px 0 rgba(0,0,0,0.2), 0 2px 0 #b45309, 0 4px 10px rgba(0,0,0,0.4); }

                .input-inset { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-top: 1px solid rgba(0,0,0,0.4); box-shadow: inset 0 3px 6px rgba(0,0,0,0.3); border-radius: 10px; color: #fff; transition: all 0.2s ease; }
                .input-inset:focus { outline: none; background: rgba(0,0,0,0.3); border-color: #38bdf8; box-shadow: inset 0 3px 6px rgba(0,0,0,0.4), 0 0 10px rgba(56, 189, 248, 0.2); }
                .input-inset::placeholder { color: rgba(255,255,255,0.3); }

                .room-item { transition: all 0.2s ease; border: 1px solid transparent; }
                .room-item:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); transform: scale(1.01); border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }

                .btn-3d-logout { background: linear-gradient(180deg, #94a3b8 0%, #64748b 100%); color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.4); box-shadow: inset 0 2px 0 rgba(255,255,255,0.4), 0 6px 0 #475569, 0 10px 20px rgba(0,0,0,0.4); }
                .btn-3d-logout:active { transform: translateY(4px); box-shadow: inset 0 2px 0 rgba(255,255,255,0.4), 0 2px 0 #475569, 0 4px 10px rgba(0,0,0,0.4); }

                /* 3D TV Efekti */
                .tv-wrapper {
                    width: 260px;
                    height: 200px;
                    position: relative;
                    animation: tvSlideIn 1s cubic-bezier(0.22, 0.61, 0.36, 1) 0.8s both;
                }
                @keyframes tvSlideIn {
                    from { opacity: 0; transform: translateX(80px) scale(0.8); }
                    to { opacity: 1; transform: translateX(0) scale(1); }
                }
                .tv-monitor {
                    width: 100%;
                    height: 100%;
                    background: #1a1a1a;
                    border: 4px solid #dcdcdc;
                    border-radius: 10px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.8);
                    position: relative;
                    overflow: hidden;
                    transition: transform 0.4s ease, border-color 0.3s ease, box-shadow 0.3s ease;
                }
                .tv-wrapper:hover .tv-monitor {
                    transform: scale(1.02);
                    border-color: #fff;
                    box-shadow: 0 12px 35px rgba(0,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.8);
                }
                .tv-screen {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(to bottom, #697ab5 0%, #9cb1d9 50%, #d8dff0 100%);
                    position: relative;
                    overflow: hidden;
                }
                /* Scanline overlay */
                .tv-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
                    background-size: 100% 2px, 3px 100%;
                    pointer-events: none;
                    z-index: 2;
                }
                /* Statik yayın noise efekti */
                .tv-static {
                    position: absolute;
                    inset: 0;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E");
                    opacity: 0.12;
                    animation: tvStatic 0.15s infinite;
                    pointer-events: none;
                    z-index: 1;
                }
                @keyframes tvStatic {
                    0%, 100% { opacity: 0.10; }
                    25% { opacity: 0.14; }
                    50% { opacity: 0.08; }
                    75% { opacity: 0.12; }
                }
                /* Flash / flicker efekti */
                .tv-flash {
                    position: absolute;
                    inset: 0;
                    background: white;
                    opacity: 0;
                    animation: tvFlash 4s infinite;
                    pointer-events: none;
                    z-index: 3;
                }
                @keyframes tvFlash {
                    0%, 95%, 100% { opacity: 0; }
                    96% { opacity: 0.08; }
                    97% { opacity: 0; }
                    98% { opacity: 0.05; }
                }
                /* Sohbet simülasyonu */
                .chat-sim { display: flex; flex-direction: column; gap: 6px; padding: 8px; height: 100%; overflow: hidden; position: relative; z-index: 1; }
                .chat-bubble {
                    display: flex; align-items: flex-start; gap: 5px;
                    animation: chatFadeIn 0.5s ease backwards;
                }
                .chat-bubble:nth-child(1) { animation-delay: 0.3s; }
                .chat-bubble:nth-child(2) { animation-delay: 0.8s; }
                .chat-bubble:nth-child(3) { animation-delay: 1.3s; }
                .chat-bubble:nth-child(4) { animation-delay: 1.8s; }
                .chat-bubble:nth-child(5) { animation-delay: 2.3s; }
                @keyframes chatFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .chat-avatar {
                    width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
                    border: 1px solid rgba(255,255,255,0.3);
                }
                .chat-msg {
                    font-size: 8px; font-family: 'Plus Jakarta Sans', sans-serif;
                    padding: 3px 6px; border-radius: 6px; max-width: 75%;
                    line-height: 1.3;
                }
                .tv-reflection {
                    position: absolute;
                    bottom: -30px;
                    right: 20px;
                    width: 80%;
                    height: 20px;
                    background: black;
                    filter: blur(15px);
                    opacity: 0.6;
                }
            `}</style>

            <ToastContainer />

            {/* --- ANA KASA --- */}
            <div className="main-content">

                {/* PREMIUM HEADER */}
                <header className="premium-header">
                    <div className="header-logo">
                        <h1 className="retro-logo-text">SopranoChat</h1>
                        <span className="tagline">hear my voice</span>
                    </div>

                    <nav className="header-nav">
                        {["HOME", "SCENE", "REHBER", "FİYATLAR", "İLETİŞİM"].map((label, i, arr) => (
                            <React.Fragment key={i}>
                                <button className={`nav-link nav-link-${i}`}>{label}</button>
                                {i < arr.length - 1 && <span className="nav-dot" />}
                            </React.Fragment>
                        ))}
                    </nav>
                </header>

                {/* İÇERİK ALANI */}
                < main style={{ width: '100%', padding: '32px 32px 32px', display: 'flex', flexDirection: 'column', gap: 32, position: 'relative', zIndex: 0 }
                }>

                    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>

                        {/* SOL ALAN */}
                        <div style={{ flex: '1 1 60%', minWidth: 400, display: 'flex', flexDirection: 'column', gap: 32 }}>

                            {/* Karşılama Kartı */}
                            <div className="glossy-panel content-fade content-fade-1" style={{ padding: '40px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 256, height: 256, background: 'rgba(56, 189, 248, 0.2)', filter: 'blur(80px)', borderRadius: '50%', pointerEvents: 'none' }}></div>

                                <div style={{ position: 'relative', zIndex: 10, display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: 280 }}>
                                        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 12, lineHeight: 1.3, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                            SopranoChat&apos;e Hoşgeldiniz
                                        </h2>
                                        <p style={{ fontSize: 14, color: '#cbd5e1', fontWeight: 600, lineHeight: 1.7, marginBottom: 20, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                            <strong style={{ color: '#fff' }}>Sesli ve görüntülü sohbet</strong> için web kameranızı açın, arkadaşlarınızla gerçek zamanlı iletişim kurun.
                                        </p>

                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {[
                                                { icon: <ShieldCheck style={{ width: 20, height: 20, color: '#34d399' }} />, text: 'Tüm iletişimler şifreli ve güvenlidir' },
                                                { icon: <Volume2 style={{ width: 20, height: 20, color: '#38bdf8' }} />, text: 'Düşük bant genişliğinde yüksek ses kalitesi' },
                                                { icon: <Video style={{ width: 20, height: 20, color: '#a78bfa' }} />, text: 'Web kameranızı açarak karşılıklı görüntülü sohbet' },
                                                { icon: <Lock style={{ width: 20, height: 20, color: '#fbbf24' }} />, text: 'Odalar şifre ile korunabilir' },
                                                { icon: <Settings style={{ width: 20, height: 20, color: '#f87171' }} />, text: 'Admin paneli ile tam oda yönetimi' },
                                            ].map((item, i) => (
                                                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>
                                                    <span style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)' }}>{item.icon}</span>
                                                    {item.text}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* 3D TV Efekti */}
                                    <div className="tv-wrapper" style={{ flexShrink: 0 }}>
                                        <div className="tv-monitor">
                                            <div className="tv-screen">
                                                {/* Sohbet Simülasyonu */}
                                                <div className="chat-sim">
                                                    <div style={{ fontSize: 7, color: '#38bdf8', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', padding: '2px 0 4px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 2 }}>🎙️ Goygoy & Müzik — 142 kişi</div>
                                                    {[
                                                        { name: 'Celine', color: '#f472b6', bg: '#831843', msg: 'Herkese merhaba! 🎵' },
                                                        { name: 'DJ.Bora', color: '#38bdf8', bg: '#0c4a6e', msg: 'Bu şarkıyı sevenler +1 🎧' },
                                                        { name: 'Admin', color: '#fbbf24', bg: '#713f12', msg: 'Hoş geldiniz, kuralları okuyun' },
                                                        { name: 'Karanlik', color: '#a78bfa', bg: '#3b0764', msg: 'Ses kalitesi harika 🔥' },
                                                        { name: 'GamerTR', color: '#34d399', bg: '#064e3b', msg: 'Kameramı açtım görüyor musunuz?' },
                                                    ].map((c, i) => (
                                                        <div key={i} className="chat-bubble">
                                                            <div className="chat-avatar" style={{ background: c.bg }}></div>
                                                            <div>
                                                                <span style={{ fontSize: 7, fontWeight: 700, color: c.color }}>{c.name}</span>
                                                                <div className="chat-msg" style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>{c.msg}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {/* Statik noise */}
                                                <div className="tv-static"></div>
                                            </div>
                                            {/* Scanlines + Flash */}
                                            <div className="tv-overlay"></div>
                                            <div className="tv-flash"></div>
                                        </div>
                                        <div className="tv-reflection"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Oda Listesi */}
                            <div className="glossy-panel content-fade content-fade-2" style={{ padding: '24px 32px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                    <h3 style={{ fontSize: 20, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                        <Play style={{ width: 24, height: 24, color: '#38bdf8' }} fill="currentColor" /> Aktif Sahneler
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}>
                                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 10px rgba(239,68,68,1)', display: 'inline-block' }}></span>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: 2, textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}>Canlı İzle</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {ACTIVE_ROOMS.map((room) => (
                                        <div key={room.id} className="room-item" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                <div style={{
                                                    width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.3)',
                                                    background: room.isVip ? 'linear-gradient(180deg, #fbbf24, #ea580c)' : 'linear-gradient(180deg, #64748b, #334155)'
                                                }}>
                                                    {room.isVip ? <Star style={{ width: 24, height: 24, color: '#fef3c7', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} fill="currentColor" /> : <Mic style={{ width: 24, height: 24, color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />}
                                                </div>
                                                <div>
                                                    <h4 style={{ fontSize: 16, fontWeight: 900, color: '#fff', textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}>{room.name}</h4>
                                                    <p style={{ fontSize: 11, color: '#bae6fd', fontWeight: 800, marginTop: 4, textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}>Yönetici: <span style={{ color: '#fff' }}>{room.owner}</span></p>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.4)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}>
                                                    {room.type}
                                                </span>
                                                <div style={{ textAlign: 'center', width: 56 }}>
                                                    <div style={{ fontSize: 18, fontWeight: 900, color: '#34d399', textShadow: '0 0 8px rgba(52,211,153,0.8)' }}>{room.users}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* SAĞ ALAN */}
                        <div style={{ flex: '1 1 30%', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 24 }}>

                            {/* GİRİŞ PANELİ */}
                            <div className="glossy-panel content-fade content-fade-3" style={{ padding: '24px 32px' }}>
                                <h3 style={{ fontSize: 14, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 16, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                    <User style={{ width: 20, height: 20, color: '#38bdf8' }} /> Hesap Paneli
                                </h3>

                                {!user ? (
                                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 8, marginLeft: 4, textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}>Kullanıcı Adınız</label>
                                            <input
                                                type="text"
                                                value={guestNick}
                                                onChange={(e) => setGuestNick(e.target.value)}
                                                className="input-inset"
                                                style={{ width: '100%', padding: '14px 16px', fontSize: 14, boxSizing: 'border-box' }}
                                                placeholder="Buraya yazın..."
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 8, marginLeft: 4, textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}>Şifre (Aboneler)</label>
                                            <input
                                                type="password"
                                                value={memberPassword}
                                                onChange={(e) => setMemberPassword(e.target.value)}
                                                className="input-inset"
                                                style={{ width: '100%', padding: '14px 16px', fontSize: 14, boxSizing: 'border-box' }}
                                                placeholder="Gizli kelime"
                                            />
                                        </div>
                                        {guestError && <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{guestError}</p>}
                                        {memberError && <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{memberError}</p>}
                                        <div style={{ paddingTop: 12 }}>
                                            <button type="submit" className="btn-3d btn-3d-blue" style={{ width: '100%', padding: '16px 0', fontSize: 14, gap: 8 }} disabled={guestLoading}>
                                                <LogIn style={{ width: 20, height: 20 }} /> {guestLoading ? 'Giriş yapılıyor...' : 'Sohbete Gir'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                                        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 24 }}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={user.avatar} style={{ width: 96, height: 96, borderRadius: 18, border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 15px 30px rgba(0,0,0,0.5)', background: '#1e293b', objectFit: 'cover' }} alt="Avatar" />
                                        </div>
                                        <h4 style={{ fontSize: 24, fontWeight: 900, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{user.username}</h4>
                                        <p style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8', marginTop: 8, marginBottom: 32, textTransform: 'uppercase', letterSpacing: 2, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{user.isMember ? (user.role === 'owner' ? '👑 Owner' : user.role === 'admin' ? '🛡️ Admin' : '✦ Üye') : '👤 Misafir'}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <button onClick={() => goRoom()} className="btn-3d btn-3d-blue" style={{ width: '100%', padding: '14px 0', fontSize: 14, gap: 8 }}>
                                                Odaya Gir
                                            </button>
                                            <button onClick={handleLogout} className="btn-3d btn-3d-logout" style={{ width: '100%', padding: '14px 0', fontSize: 14 }}>
                                                Çıkış Yap
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ODA SATIN AL */}
                            <div className="glossy-panel content-fade content-fade-4" style={{ padding: '24px 32px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(251, 191, 36, 0.4)' }}>
                                <div style={{ position: 'absolute', top: 0, right: 0, width: 192, height: 192, background: 'rgba(251, 191, 36, 0.2)', filter: 'blur(60px)', pointerEvents: 'none' }}></div>

                                <div style={{ position: 'relative', zIndex: 10 }}>
                                    <h3 style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}>
                                        <Star style={{ width: 16, height: 16 }} fill="currentColor" /> Premium Paket
                                    </h3>
                                    <h4 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 12, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Kendi Odanı Kur</h4>
                                    <p style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 500, marginBottom: 32, lineHeight: 1.7, textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}>
                                        Yönetici yetkileri, HD yayın kalitesi ve şifreli koruma ile kendi topluluğunu oluştur.
                                    </p>
                                    <button className="btn-3d btn-3d-gold" style={{ width: '100%', padding: '16px 0', fontSize: 14 }}>
                                        Paketleri İncele
                                    </button>
                                </div>
                            </div>

                            {/* CANLI DESTEK */}
                            <div className="glossy-panel content-fade content-fade-5" style={{ padding: '24px 32px', textAlign: 'center', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(180deg, #34d399, #059669)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6), 0 10px 20px rgba(16,185,129,0.3)' }}>
                                    <Headset style={{ width: 28, height: 28, color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                                </div>
                                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 2, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Müşteri Hizmetleri</h4>
                                <button className="btn-3d btn-3d-green" style={{ width: '100%', padding: '16px 0', fontSize: 12 }}>
                                    Canlı Desteğe Bağlan
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <footer style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 8, textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}>
                        &copy; 2026 SopranoChat Systems.
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 32 }}>
                            <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}>Kurallar</a>
                            <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}>Gizlilik Sözleşmesi</a>
                        </div>
                    </footer>
                </main >
            </div >
        </>
    );
}
