"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthUser, setAuthUser, removeAuthUser, clearAllSopranoAuth, AuthUser } from "@/lib/auth";
import { generateGenderAvatar } from "@/lib/avatar";
import {
    Mic, Video, Users, LogIn, Monitor,
    Headset, ShieldCheck, Play, Star, Sparkles,
    Volume2, User, Lock, Settings, Copy, Upload, X, Globe, Check,
    Phone, Mail, MessageCircle, Send, BookOpen
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
    const [loginTab, setLoginTab] = useState<'guest' | 'member'>('guest');
    const [tvTilt, setTvTilt] = useState({ x: 0, y: 0 });
    const [dbRooms, setDbRooms] = useState<any[]>([]);
    const addToast = useAdminStore((s) => s.addToast);
    const [guestGender, setGuestGender] = useState<'Erkek' | 'Kadın' | 'Belirsiz'>('Belirsiz');
    const [showRegister, setShowRegister] = useState(false);
    const [regUsername, setRegUsername] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
    const [regGender, setRegGender] = useState<'Erkek' | 'Kadın' | 'Belirsiz'>('Belirsiz');
    const [regAcceptTerms, setRegAcceptTerms] = useState(false);
    const [regError, setRegError] = useState('');
    const [regLoading, setRegLoading] = useState(false);
    const [showPackages, setShowPackages] = useState(false);
    const [showCustomConfig, setShowCustomConfig] = useState(false);
    const [cfgRooms, setCfgRooms] = useState(1);
    const [cfgPersons, setCfgPersons] = useState(30);
    const [cfgCamera, setCfgCamera] = useState<'Kameralı' | 'Kamerasız'>('Kameralı');
    const [cfgMeeting, setCfgMeeting] = useState<'Mevcut' | 'Yok'>('Mevcut');

    // Checkout state
    const [showCheckout, setShowCheckout] = useState(false);
    const [checkoutPlan, setCheckoutPlan] = useState<{ name: string; price: number; period: string } | null>(null);
    const [chkName, setChkName] = useState('');
    const [chkEmail, setChkEmail] = useState('');
    const [chkPhone, setChkPhone] = useState('');
    const [chkLogo, setChkLogo] = useState<File | null>(null);
    const [chkHosting, setChkHosting] = useState<'soprano' | 'own'>('soprano');
    const [chkDomain, setChkDomain] = useState('');
    const [chkRoomName, setChkRoomName] = useState('');
    const [chkBilling, setChkBilling] = useState<'monthly' | 'yearly'>('monthly');
    const [chkPaymentCode] = useState(() => 'SPR-' + Math.random().toString(36).substring(2, 7).toUpperCase());
    const [chkCopied, setChkCopied] = useState<string | null>(null);

    // Customer Support widget
    const [supportOpen, setSupportOpen] = useState(false);
    const [supName, setSupName] = useState('');
    const [supEmail, setSupEmail] = useState('');
    const [supSubject, setSupSubject] = useState('');
    const [supMessage, setSupMessage] = useState('');

    // Navigation sections
    const [activeSection, setActiveSection] = useState('home');
    const [guideOpen, setGuideOpen] = useState<string | null>(null);

    const openCheckout = (name: string, price: number, period: string) => {
        setCheckoutPlan({ name, price, period });
        setShowCheckout(true);
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setChkCopied(label);
        setTimeout(() => setChkCopied(null), 2000);
    };

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
            const res = await fetch(`${API_URL}/auth/guest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: guestNick.trim(), gender: guestGender }) });
            const data = await res.json();
            if (data.error) { setGuestError(data.error); return; }
            localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
            const avatarUrl = generateGenderAvatar(guestNick.trim(), guestGender);
            const u: AuthUser = { userId: data.user.sub, username: data.user.username, avatar: data.user?.avatar || avatarUrl, isMember: false, role: 'guest' as const, gender: guestGender };
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

    const handleRegister = async () => {
        if (!regUsername.trim()) { setRegError('Kullanıcı adı gerekli.'); return; }
        if (!regEmail.trim()) { setRegError('E-posta gerekli.'); return; }
        if (!regPassword || regPassword.length < 6) { setRegError('Şifre en az 6 karakter olmalı.'); return; }
        if (regPassword !== regPasswordConfirm) { setRegError('Şifreler eşleşmiyor.'); return; }
        if (!regAcceptTerms) { setRegError('Üyelik sözleşmesini onaylayın.'); return; }
        setRegError(''); setRegLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: regUsername.trim(), email: regEmail.trim(), password: regPassword, gender: regGender })
            });
            const data = await res.json();
            if (!res.ok) { setRegError(data.message || 'Kayıt başarısız.'); return; }
            addToast?.('Üyelik başarıyla oluşturuldu! Giriş yapabilirsiniz.', 'success');
            setShowRegister(false);
            setMemberUsername(regUsername.trim());
            setRegUsername(''); setRegEmail(''); setRegPassword(''); setRegPasswordConfirm(''); setRegGender('Belirsiz'); setRegAcceptTerms(false);
        } catch { setRegError('Bağlantı hatası.'); } finally { setRegLoading(false); }
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
                    overflow-y: scroll;
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
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 9px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    transition: all 0.3s ease;
                    overflow: hidden;
                }

                .btn-3d-blue { background: linear-gradient(180deg, rgba(56,189,248,0.25) 0%, rgba(2,132,199,0.35) 100%); color: #bae6fd; box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05); }
                .btn-3d-blue:hover { background: linear-gradient(180deg, rgba(56,189,248,0.35) 0%, rgba(2,132,199,0.45) 100%); box-shadow: 0 6px 24px rgba(56,189,248,0.2), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(255,255,255,0.08); transform: translateY(-1px); }
                .btn-3d-blue:active { transform: translateY(1px); box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1); }

                .btn-3d-green { background: linear-gradient(180deg, rgba(52,211,153,0.25) 0%, rgba(5,150,105,0.35) 100%); color: #a7f3d0; box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05); }
                .btn-3d-green:hover { background: linear-gradient(180deg, rgba(52,211,153,0.35) 0%, rgba(5,150,105,0.45) 100%); box-shadow: 0 6px 24px rgba(52,211,153,0.2), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(255,255,255,0.08); transform: translateY(-1px); }
                .btn-3d-green:active { transform: translateY(1px); box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1); }

                .btn-3d-gold { background: linear-gradient(180deg, rgba(251,191,36,0.25) 0%, rgba(217,119,6,0.35) 100%); color: #fef3c7; box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05); }
                .btn-3d-gold:hover { background: linear-gradient(180deg, rgba(251,191,36,0.35) 0%, rgba(217,119,6,0.45) 100%); box-shadow: 0 6px 24px rgba(251,191,36,0.2), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(255,255,255,0.08); transform: translateY(-1px); }
                .btn-3d-gold:active { transform: translateY(1px); box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1); }

                .btn-3d-red { background: linear-gradient(180deg, rgba(220,38,38,0.3) 0%, rgba(153,27,27,0.45) 100%); color: #fca5a5; box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 12px rgba(220,38,38,0.15), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.04); }
                .btn-3d-red:hover { background: linear-gradient(180deg, rgba(220,38,38,0.4) 0%, rgba(153,27,27,0.55) 100%); box-shadow: 0 6px 24px rgba(220,38,38,0.25), 0 0 18px rgba(220,38,38,0.2), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.06); transform: translateY(-1px); }
                .btn-3d-red:active { transform: translateY(1px); box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1); }

                .btn-3d-white { background: linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(200,210,225,0.2) 100%); color: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(255,255,255,0.08); border-top: 1px solid rgba(255,255,255,0.25); }
                .btn-3d-white:hover { background: linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(210,220,235,0.3) 100%); box-shadow: 0 6px 24px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(255,255,255,0.12); transform: translateY(-1px); }
                .btn-3d-white:active { transform: translateY(1px); box-shadow: 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3); }

                .input-inset { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-top: 1px solid rgba(0,0,0,0.4); box-shadow: inset 0 3px 6px rgba(0,0,0,0.3); border-radius: 10px; color: #fff; transition: all 0.2s ease; }
                .input-inset:focus { outline: none; background: rgba(0,0,0,0.3); border-color: #38bdf8; box-shadow: inset 0 3px 6px rgba(0,0,0,0.4), 0 0 10px rgba(56, 189, 248, 0.2); }
                .input-inset::placeholder { color: rgba(255,255,255,0.3); }

                .room-item { transition: all 0.2s ease; border: 1px solid transparent; }
                .room-item:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); transform: scale(1.01); border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }

                .feature-toast { transition: background 0.3s ease, box-shadow 0.3s ease; cursor: default; }
                .feature-toast:hover { background: rgba(255,255,255,0.08) !important; box-shadow: 0 2px 12px rgba(0,0,0,0.15); }

                .btn-3d-logout { background: linear-gradient(180deg, rgba(148,163,184,0.15) 0%, rgba(71,85,105,0.25) 100%); color: #94a3b8; box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(255,255,255,0.03); }
                .btn-3d-logout:hover { background: linear-gradient(180deg, rgba(148,163,184,0.25) 0%, rgba(71,85,105,0.35) 100%); color: #e2e8f0; box-shadow: 0 6px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05); transform: translateY(-1px); }
                .btn-3d-logout:active { transform: translateY(1px); box-shadow: 0 2px 8px rgba(0,0,0,0.3); }

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
                    border: 3px solid #c0c8d5;
                    border-top-color: #f0f2f6;
                    border-bottom-color: #6a7588;
                    border-left-color: #8a95a8;
                    border-right-color: #8a95a8;
                    border-radius: 18px;
                    box-shadow: 0 16px 50px rgba(0,0,0,0.7), 0 6px 16px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.8), 0 0 15px rgba(192,200,213,0.15);
                    position: relative;
                    overflow: hidden;
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


                /* === TABLO LAMBASI (SVG Gallery Lamp) === */
                .gallery-lamp-svg {
                    position: absolute;
                    top: -52px;
                    left: 50%;
                    transform: translateX(-50%);
                    z-index: 60;
                    pointer-events: none;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    animation: lampSlideDown 1.2s cubic-bezier(0.22, 0.61, 0.36, 1) 1.5s both;
                }
                @keyframes lampSlideDown {
                    0% {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-100%);
                    }
                    40% {
                        opacity: 1;
                    }
                    100% {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }
                .gallery-lamp-svg svg {
                    filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
                }
                .gallery-lamp-glow {
                    position: absolute;
                    top: 32px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 200px;
                    height: 90px;
                    background: radial-gradient(ellipse at top center, rgba(255,210,120,0.22) 0%, rgba(255,180,80,0.08) 50%, transparent 80%);
                    pointer-events: none;
                    animation: galleryGlowPulse 4s ease-in-out infinite alternate;
                }
                @keyframes galleryGlowPulse {
                    0% { opacity: 0.75; transform: translateX(-50%) scale(1); }
                    50% { opacity: 1; transform: translateX(-50%) scale(1.04); }
                    100% { opacity: 0.8; transform: translateX(-50%) scale(0.98); }
                }

                @keyframes cardDropDown {
                    0% {
                        opacity: 0;
                        transform: translateY(-120px) scaleY(0.7);
                    }
                    50% {
                        opacity: 1;
                        transform: translateY(8px) scaleY(1.02);
                    }
                    70% {
                        transform: translateY(-3px) scaleY(0.99);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0) scaleY(1);
                    }
                }

                @keyframes tvSettle {
                    0% { transform: rotateX(0deg) rotateY(10deg); }
                    25% { transform: rotateX(-2deg) rotateY(-8deg); }
                    50% { transform: rotateX(1deg) rotateY(4deg); }
                    75% { transform: rotateX(-1deg) rotateY(-2deg); }
                    100% { transform: rotateX(0deg) rotateY(0deg); }
                }
                @keyframes btnSlideUp {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes btnSlideDown {
                    0% { opacity: 0; transform: translateY(-20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes btnSway {
                    0%, 100% { transform: rotateX(-6deg) translateY(2px); }
                    50% { transform: rotateX(6deg) translateY(-2px); }
                }
                .model-btn:hover {
                    animation-play-state: paused !important;
                    transform: scale(1.03) !important;
                    transition: transform 0.5s ease !important;
                }

                /* ====== ANTI-GRAVITY EFFECTS ====== */
                @keyframes floatY {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
                @keyframes badgePulseGlow {
                    0%, 100% { box-shadow: 0 0 6px var(--badge-color, rgba(56,189,248,0.4)); }
                    50% { box-shadow: 0 0 16px var(--badge-color, rgba(56,189,248,0.7)), 0 0 30px var(--badge-color, rgba(56,189,248,0.25)); }
                }
                .antigravity-float {
                    animation: floatY 3s ease-in-out infinite;
                }
                .badge-glow {
                    animation: badgePulseGlow 2s ease-in-out infinite;
                    border: 1px solid var(--badge-color, rgba(56,189,248,0.5)) !important;
                }
                .btn-3d-gold-float {
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
                }
                .btn-3d-gold-float:hover {
                    transform: translateY(-4px) !important;
                    box-shadow: inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -2px 0 rgba(0,0,0,0.2), 0 10px 0 #b45309, 0 14px 30px rgba(251,191,36,0.4), 0 0 40px rgba(251,191,36,0.2) !important;
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
                        {[
                            { label: 'HOME', section: 'home' },
                            { label: 'SCENE', section: 'scene' },
                            { label: 'REHBER', section: 'rehber' },
                            { label: 'FİYATLAR', section: 'fiyatlar' },
                            { label: 'REFERANSLAR', section: 'referanslar' },
                            { label: 'İLETİŞİM', section: 'iletisim' },
                        ].map((item, i, arr) => (
                            <React.Fragment key={i}>
                                <button
                                    className={`nav-link nav-link-${i}`}
                                    onClick={() => { setActiveSection(item.section); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    style={{
                                        color: activeSection === item.section ? '#38bdf8' : undefined,
                                        textShadow: activeSection === item.section ? '0 0 10px rgba(56,189,248,0.4)' : undefined,
                                    }}
                                >{item.label}</button>
                                {i < arr.length - 1 && <span className="nav-dot" />}
                            </React.Fragment>
                        ))}
                    </nav>
                </header>

                {/* İÇERİK ALANI */}
                < main style={{ width: '100%', padding: '32px 32px 32px', display: 'flex', flexDirection: 'column', gap: 32, position: 'relative', zIndex: 0 }
                }>

                    {activeSection === 'home' && (<div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>

                        {/* SOL ALAN */}
                        <div style={{ flex: '1 1 60%', minWidth: 400, display: 'flex', flexDirection: 'column', gap: 32 }}>

                            {/* Karşılama Kartı + Tablo Lambası */}
                            <div style={{ position: 'relative' }}>
                                {/* ===== TABLO LAMBASI (geniş — Hoşgeldiniz kartı) ===== */}
                                <div className="gallery-lamp-svg">
                                    <svg width="500" height="52" viewBox="0 0 500 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                            <linearGradient id="glBarMetalW" x1="0" y1="30" x2="0" y2="44" gradientUnits="userSpaceOnUse">
                                                <stop offset="0%" stopColor="#4a4a4a" />
                                                <stop offset="25%" stopColor="#2a2a2a" />
                                                <stop offset="50%" stopColor="#1a1a1a" />
                                                <stop offset="75%" stopColor="#2a2a2a" />
                                                <stop offset="100%" stopColor="#3a3a3a" />
                                            </linearGradient>
                                            <linearGradient id="glMountPlateW" x1="250" y1="0" x2="250" y2="14" gradientUnits="userSpaceOnUse">
                                                <stop offset="0%" stopColor="#555" />
                                                <stop offset="50%" stopColor="#2a2a2a" />
                                                <stop offset="100%" stopColor="#1a1a1a" />
                                            </linearGradient>
                                            <linearGradient id="glArmMetalW" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#555" />
                                                <stop offset="50%" stopColor="#333" />
                                                <stop offset="100%" stopColor="#2a2a2a" />
                                            </linearGradient>
                                            <linearGradient id="glLightSpreadW" x1="250" y1="44" x2="250" y2="52" gradientUnits="userSpaceOnUse">
                                                <stop offset="0%" stopColor="#ffd080" stopOpacity="0.6" />
                                                <stop offset="100%" stopColor="#ffc864" stopOpacity="0" />
                                            </linearGradient>
                                            <linearGradient id="glLedStripW" x1="70" y1="43" x2="430" y2="43" gradientUnits="userSpaceOnUse">
                                                <stop offset="0%" stopColor="#ffcc66" stopOpacity="0" />
                                                <stop offset="15%" stopColor="#ffe0a0" stopOpacity="0.9" />
                                                <stop offset="50%" stopColor="#fff0cc" stopOpacity="1" />
                                                <stop offset="85%" stopColor="#ffe0a0" stopOpacity="0.9" />
                                                <stop offset="100%" stopColor="#ffcc66" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <path d="M78 44 L50 52 L450 52 L422 44 Z" fill="url(#glLightSpreadW)" opacity="0.5" />
                                        <rect x="235" y="0" width="30" height="10" rx="2" fill="url(#glMountPlateW)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                                        <rect x="238" y="1" width="24" height="1.5" rx="0.75" fill="white" fillOpacity="0.1" />
                                        <line x1="242" y1="10" x2="205" y2="30" stroke="url(#glArmMetalW)" strokeWidth="3" strokeLinecap="round" />
                                        <line x1="242.5" y1="10.5" x2="205.8" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                        <line x1="258" y1="10" x2="295" y2="30" stroke="url(#glArmMetalW)" strokeWidth="3" strokeLinecap="round" />
                                        <line x1="257.5" y1="10.5" x2="294.2" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                        <rect x="60" y="30" width="380" height="14" rx="7" fill="url(#glBarMetalW)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
                                        <rect x="70" y="32" width="360" height="2" rx="1" fill="white" fillOpacity="0.12" />
                                        <rect x="70" y="42" width="360" height="1" rx="0.5" fill="white" fillOpacity="0.04" />
                                        <rect x="67" y="43.5" width="366" height="1.5" rx="0.75" fill="url(#glLedStripW)" />
                                        <circle cx="205" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" />
                                        <circle cx="205" cy="34" r="1" fill="#555" />
                                        <circle cx="295" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" />
                                        <circle cx="295" cy="34" r="1" fill="#555" />
                                    </svg>
                                    <div className="gallery-lamp-glow" style={{ width: 450 }}></div>
                                </div>

                                <div className="glossy-panel content-fade content-fade-1" style={{ padding: '40px', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 256, height: 256, background: 'rgba(56, 189, 248, 0.2)', filter: 'blur(80px)', borderRadius: '50%', pointerEvents: 'none' }}></div>

                                    <div style={{ position: 'relative', zIndex: 10 }}>
                                        {/* Orijinal içerik — tümü birlikte fade/blur olur */}
                                        <div style={{
                                            display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap',
                                            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                            opacity: showPackages ? 0 : 1,
                                            filter: showPackages ? 'blur(8px)' : 'blur(0)',
                                            transform: showPackages ? 'scale(0.97)' : 'scale(1)',
                                            maxHeight: showPackages ? 0 : 2000,
                                            overflow: 'hidden',
                                            pointerEvents: showPackages ? 'none' : 'auto',
                                        }}>
                                            <div style={{ flex: 1, minWidth: 280 }}>
                                                <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 12, lineHeight: 1.3, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                                    Kendi Dijital Sahneni Yarat
                                                </h2>
                                                <p style={{ fontSize: 14, color: '#cbd5e1', fontWeight: 600, lineHeight: 1.8, marginBottom: 20, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                                    <strong style={{ color: '#fff' }}>Kişisel sohbet odanızı satın alın</strong> ve tamamen sizin kurallarınızla yönetin.
                                                    HD kalitesinde sesli ve görüntülü iletişim, şifreli giriş koruması, gelişmiş yönetici paneli ve
                                                    sınırsız kişiselleştirme seçenekleriyle topluluğunuzu büyütün.
                                                    Kurumsal düzeyde altyapı, bireysel kullanım kolaylığıyla buluşuyor.
                                                </p>
                                            </div>

                                            {/* 3D TV Efekti */}
                                            <div className="tv-wrapper" style={{ flexShrink: 0, marginTop: 15, marginRight: 40, perspective: 600 }}>
                                                <div className="tv-monitor" style={{ animation: 'tvSettle 3s cubic-bezier(0.22, 0.61, 0.36, 1) 0.8s both' }}>
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

                                                {/* Test Et — monitörün ARKASINDAN çıkan kablolu menü */}
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -14, position: 'relative', zIndex: -1, animation: 'btnSlideDown 1.2s cubic-bezier(0.22, 0.61, 0.36, 1) 3.5s both', perspective: 500 }}>
                                                    {/* Kablo */}
                                                    <div style={{ width: 2, height: 50, background: 'linear-gradient(to bottom, #8a95a8, #4a4e5e)', borderRadius: 1 }}></div>
                                                    {/* Buton */}
                                                    <button className="btn-3d btn-3d-white model-btn" style={{
                                                        padding: '8px 22px', fontSize: 10, fontWeight: 700,
                                                        letterSpacing: 1.5, textTransform: 'uppercase',
                                                        borderRadius: 10, gap: 6,
                                                        animation: 'floatY 3s ease-in-out infinite',
                                                    }}>
                                                        <Play style={{ width: 12, height: 12 }} fill="currentColor" /> Test Et
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Feature Toasts — tam genişlik 2x2 grid */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, width: '100%' }}>
                                                {[
                                                    { icon: <ShieldCheck style={{ width: 15, height: 15 }} />, label: 'Şifreli', desc: 'Uçtan uca şifreleme', color: '#34d399' },
                                                    { icon: <Video style={{ width: 15, height: 15 }} />, label: 'HD Video', desc: 'Kristal netliğinde görüntü', color: '#a78bfa' },
                                                    { icon: <Mic style={{ width: 15, height: 15 }} />, label: 'Kristal Ses', desc: 'Düşük gecikme, yüksek kalite', color: '#38bdf8' },
                                                    { icon: <Settings style={{ width: 15, height: 15 }} />, label: 'Tam Kontrol', desc: 'Gelişmiş yönetici paneli', color: '#fbbf24' },
                                                ].map((t, i) => (
                                                    <div key={i} className="feature-toast" style={{
                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                        padding: '8px 12px', borderRadius: 10,
                                                        background: 'rgba(255,255,255,0.04)', border: `1px solid ${t.color}22`,
                                                    }}>
                                                        <div style={{
                                                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            background: `${t.color}15`, color: t.color,
                                                            border: `1px solid ${t.color}30`,
                                                        }}>{t.icon}</div>
                                                        <div>
                                                            <div style={{ fontSize: 11, fontWeight: 800, color: t.color, letterSpacing: 0.5 }}>{t.label}</div>
                                                            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500, marginTop: 1 }}>{t.desc}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Paket Kartları — showPackages açıkken görünür */}
                                        <div style={{
                                            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.15s',
                                            opacity: showPackages ? 1 : 0,
                                            filter: showPackages ? 'blur(0)' : 'blur(8px)',
                                            transform: showPackages ? 'translateY(0)' : 'translateY(20px)',
                                            maxHeight: showPackages ? 2000 : 0,
                                            overflow: 'hidden',
                                            pointerEvents: showPackages ? 'auto' : 'none',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                                    Çözüm Modelleri
                                                </h2>
                                                <button onClick={() => setShowPackages(false)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', color: '#94a3b8', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>✕</button>
                                            </div>
                                            <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginBottom: 20 }}>İşletmenizin ihtiyacına göre iki farklı entegrasyon modeli.</p>

                                            <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
                                                <div className="feature-toast" style={{ flex: 1, padding: '20px', borderRadius: 14, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56,189,248,0.15)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Monitor style={{ width: 20, height: 20, color: '#38bdf8' }} />
                                                    </div>
                                                    <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>Soprano Hosted</h3>
                                                    <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7, fontWeight: 500 }}>Tamamen bizim sunucularımızda barınan, teknik kurulum gerektirmeyen hızlı çözüm. Saniyeler içinde kendi odanızı yayına alın.</p>
                                                </div>
                                                <div className="feature-toast" style={{ flex: 1, padding: '20px', borderRadius: 14, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(251,191,36,0.15)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Sparkles style={{ width: 20, height: 20, color: '#fbbf24' }} />
                                                    </div>
                                                    <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>White-Label Embed</h3>
                                                    <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7, fontWeight: 500 }}>Kendi sitenize iframe veya SDK ile gömün. Kullanıcılar sitenizden ayrılmadan SopranoChat deneyimini markanızla yaşasın.</p>
                                                </div>
                                            </div>

                                            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 14, padding: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20, textAlign: 'center' }}>⭐ Fiyatlandırma</h3>

                                                {/* Kampanyalı Paketler — fade out */}
                                                <div style={{
                                                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    opacity: showCustomConfig ? 0 : 1,
                                                    filter: showCustomConfig ? 'blur(6px)' : 'blur(0)',
                                                    transform: showCustomConfig ? 'scale(0.97)' : 'scale(1)',
                                                    maxHeight: showCustomConfig ? 0 : 2000,
                                                    overflow: 'hidden',
                                                    pointerEvents: showCustomConfig ? 'none' : 'auto',
                                                }}>
                                                    <div style={{ display: 'flex', gap: 12 }}>
                                                        {[
                                                            { name: 'Ses + Metin', price: '200', priceNum: 200, period: '/ay', icon: '🎙️', features: ['Sınırsız sesli ve yazılı sohbet', 'Şifreli oda koruma', 'Ban / Gag-List yetkileri'], color: '#38bdf8', popular: false, badge: '', btnText: 'Satın Al', btnClass: 'btn-3d-blue' },
                                                            { name: 'Kamera + Ses', price: '400', priceNum: 400, period: '/ay', icon: '📹', features: ['Standart paketteki tüm özellikler', 'Eşzamanlı web kamerası yayını', 'Canlı protokol takibi'], color: '#a78bfa', popular: true, badge: 'POPÜLER', btnText: 'Hemen Başla', btnClass: 'btn-3d-red' },
                                                            { name: 'White Label', price: '2.990', priceNum: 2990, period: '/ay', icon: '🏢', features: ['10 bağımsız oda lisansı', 'HTML/PHP embed altyapısı', 'Farklı domain desteği'], color: '#fbbf24', popular: false, badge: 'BAYİ', btnText: 'Satın Al', btnClass: 'btn-3d-gold' },
                                                        ].map((plan, i) => (
                                                            <div key={i} style={{
                                                                flex: 1, padding: '20px 16px', borderRadius: 12,
                                                                background: plan.popular ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.03)',
                                                                border: `1px solid ${plan.popular ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                                                position: 'relative', overflow: 'hidden',
                                                                display: 'flex', flexDirection: 'column',
                                                            }}>
                                                                {plan.badge && <div style={{ position: 'absolute', top: 8, right: -24, background: plan.popular ? '#a78bfa' : '#fbbf24', color: plan.popular ? '#fff' : '#000', fontSize: 7, fontWeight: 800, padding: '2px 28px', transform: 'rotate(45deg)', letterSpacing: 1 }}>{plan.badge}</div>}
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                                                    <span style={{ fontSize: 18 }}>{plan.icon}</span>
                                                                    <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{plan.name}</span>
                                                                </div>
                                                                <div style={{ marginBottom: 16 }}>
                                                                    <span style={{ fontSize: 28, fontWeight: 900, color: plan.color }}>{plan.price} ₺</span>
                                                                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}> {plan.period}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, flex: 1 }}>
                                                                    {plan.features.map((f, fi) => (
                                                                        <div key={fi} style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                            <span style={{ color: '#34d399', fontSize: 12 }}>✓</span> {f}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <button onClick={() => openCheckout(plan.name, plan.priceNum, plan.period)} className={`btn-3d ${plan.btnClass}`} style={{ width: '100%', padding: '10px 0', fontSize: 11, fontWeight: 800 }}>{plan.btnText}</button>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Özel Yapılandırma Butonu */}
                                                    <div style={{ textAlign: 'center', marginTop: 20 }}>
                                                        <button
                                                            onClick={() => setShowCustomConfig(true)}
                                                            className="btn-3d btn-3d-blue"
                                                            style={{ padding: '10px 28px', fontSize: 12, fontWeight: 800, borderRadius: 10, letterSpacing: 1 }}
                                                        >
                                                            ⚙️ Özel Yapılandırma
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Özel Yapılandırma Paneli — fade in */}
                                                <div style={{
                                                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
                                                    opacity: showCustomConfig ? 1 : 0,
                                                    filter: showCustomConfig ? 'blur(0)' : 'blur(6px)',
                                                    transform: showCustomConfig ? 'translateY(0)' : 'translateY(20px)',
                                                    maxHeight: showCustomConfig ? 2000 : 0,
                                                    overflow: 'hidden',
                                                    pointerEvents: showCustomConfig ? 'auto' : 'none',
                                                }}>
                                                    <div style={{
                                                        background: 'rgba(0,0,0,0.3)', borderRadius: 14, padding: '24px',
                                                        border: '1px solid rgba(56,189,248,0.2)',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
                                                            <div>
                                                                <div style={{ fontSize: 10, fontWeight: 800, color: '#38bdf8', background: 'rgba(56,189,248,0.15)', padding: '3px 10px', borderRadius: 6, display: 'inline-block', letterSpacing: 1, marginBottom: 8 }}>⚙️ Özel Yapılandırma</div>
                                                                <h4 style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>Kendi Paketini Oluştur</h4>
                                                                <p style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>İhtiyacın kadar oda, dilediğin kadar limit.</p>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 8 }}>
                                                                <button onClick={() => setShowCustomConfig(false)} className="btn-3d btn-3d-white" style={{ padding: '8px 16px', fontSize: 10, fontWeight: 800, borderRadius: 10 }}>
                                                                    ← Paketlere Dön
                                                                </button>
                                                                <button onClick={() => {
                                                                    const rc = cfgRooms * 200;
                                                                    const cc = cfgCamera === 'Kameralı' ? cfgRooms * 200 : 0;
                                                                    const mc = cfgMeeting === 'Mevcut' ? 200 : 0;
                                                                    const pe = cfgPersons > 30 ? Math.floor((cfgPersons - 30) / 20) * cfgRooms * 50 : 0;
                                                                    openCheckout('Özel Paket', rc + cc + mc + pe, '/ay');
                                                                }} className="btn-3d btn-3d-red" style={{ padding: '8px 20px', fontSize: 11, fontWeight: 800, borderRadius: 10 }}>
                                                                    Satın Al →
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Dropdown'lar */}
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginTop: 16 }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <div style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase', minHeight: 24, display: 'flex', alignItems: 'flex-end' }}>🏠 Oda Sayısı</div>
                                                                <select value={cfgRooms} onChange={e => setCfgRooms(Number(e.target.value))} style={{
                                                                    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff',
                                                                    background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)',
                                                                    cursor: 'pointer', outline: 'none',
                                                                }}>
                                                                    {[1, 2, 3, 5, 10, 15, 20, 30, 50, 75, 100].map(v => <option key={v} value={v} style={{ background: '#1e293b' }}>{v} Oda</option>)}
                                                                </select>
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <div style={{ fontSize: 9, fontWeight: 800, color: '#38bdf8', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase', minHeight: 24, display: 'flex', alignItems: 'flex-end' }}>👥 Oda Kişi Limiti</div>
                                                                <select value={cfgPersons} onChange={e => setCfgPersons(Number(e.target.value))} style={{
                                                                    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff',
                                                                    background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)',
                                                                    cursor: 'pointer', outline: 'none',
                                                                }}>
                                                                    {[30, 50, 100, 200, 500].map(v => <option key={v} value={v} style={{ background: '#1e293b' }}>{v} Kişi</option>)}
                                                                </select>
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <div style={{ fontSize: 9, fontWeight: 800, color: '#a78bfa', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase', minHeight: 24, display: 'flex', alignItems: 'flex-end' }}>📹 Kamera</div>
                                                                <select value={cfgCamera} onChange={e => setCfgCamera(e.target.value as any)} style={{
                                                                    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff',
                                                                    background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)',
                                                                    cursor: 'pointer', outline: 'none',
                                                                }}>
                                                                    <option value="Kameralı" style={{ background: '#1e293b' }}>Kameralı</option>
                                                                    <option value="Kamerasız" style={{ background: '#1e293b' }}>Kamerasız</option>
                                                                </select>
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <div style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase', minHeight: 24, display: 'flex', alignItems: 'flex-end' }}>💛 Toplantı Modu</div>
                                                                <select value={cfgMeeting} onChange={e => setCfgMeeting(e.target.value as any)} style={{
                                                                    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff',
                                                                    background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)',
                                                                    cursor: 'pointer', outline: 'none',
                                                                }}>
                                                                    <option value="Mevcut" style={{ background: '#1e293b' }}>Mevcut</option>
                                                                    <option value="Yok" style={{ background: '#1e293b' }}>Yok</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        {/* Tahmini Fiyatlandırma */}
                                                        {(() => {
                                                            const roomCost = cfgRooms * 200;
                                                            const cameraCost = cfgCamera === 'Kameralı' ? cfgRooms * 200 : 0;
                                                            const meetingCost = cfgMeeting === 'Mevcut' ? 200 : 0;
                                                            const personExtra = cfgPersons > 30 ? Math.floor((cfgPersons - 30) / 20) * cfgRooms * 50 : 0;
                                                            const monthlyTotal = roomCost + cameraCost + meetingCost + personExtra;
                                                            const yearlyTotal = monthlyTotal * 10; // 2 ay hediye
                                                            return (
                                                                <div style={{ marginTop: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                                    <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <span style={{ color: '#38bdf8' }}>₺</span> Tahmini Fiyatlandırma
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                                                                            <span>🏠 {cfgRooms} Oda</span>
                                                                            <span style={{ color: '#fff', fontWeight: 700 }}>+{roomCost.toLocaleString('tr-TR')} ₺</span>
                                                                        </div>
                                                                        {cameraCost > 0 && (
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                                                                                <span>📹 Kamera</span>
                                                                                <span style={{ color: '#fff', fontWeight: 700 }}>+{cameraCost.toLocaleString('tr-TR')} ₺</span>
                                                                            </div>
                                                                        )}
                                                                        {meetingCost > 0 && (
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                                                                                <span>💛 Toplantı Modu</span>
                                                                                <span style={{ color: '#fff', fontWeight: 700 }}>+{meetingCost.toLocaleString('tr-TR')} ₺</span>
                                                                            </div>
                                                                        )}
                                                                        {personExtra > 0 && (
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                                                                                <span>👥 Ek Kişi Kapasitesi ({cfgPersons} kişi)</span>
                                                                                <span style={{ color: '#fff', fontWeight: 700 }}>+{personExtra.toLocaleString('tr-TR')} ₺</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                                        <div>
                                                                            <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Aylık</div>
                                                                            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{monthlyTotal.toLocaleString('tr-TR')} ₺</div>
                                                                        </div>
                                                                        <div style={{ textAlign: 'right' }}>
                                                                            <div style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1 }}>Yıllık (2 Ay Ücretsiz)</div>
                                                                            <div style={{ fontSize: 22, fontWeight: 900, color: '#34d399' }}>{yearlyTotal.toLocaleString('tr-TR')} ₺</div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Müşteri Platformları */}
                            <div className="glossy-panel content-fade content-fade-2" style={{ padding: '24px 32px' }}>
                                <div style={{ paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                                    <h3 style={{ fontSize: 18, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                        <Users style={{ width: 24, height: 24, color: '#38bdf8' }} /> Müşteri Platformları
                                    </h3>
                                    <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, fontWeight: 500 }}>SopranoChat altyapısıyla çalışan sohbet odalarına katılanlar.</p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {[
                                        { name: 'Gurbetçiler', room: 'Gurbetçiler', users: 2, rooms: 1, color: '#fbbf24', emoji: '🌍' },
                                        { name: 'MüzikSeverler', room: 'DJ Lounge', users: 5, rooms: 3, color: '#a78bfa', emoji: '🎵' },
                                    ].map((p, i) => (
                                        <div key={i} className="feature-toast" style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '14px 16px', borderRadius: 14,
                                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                                <div style={{
                                                    width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: `linear-gradient(135deg, ${p.color}33, ${p.color}11)`,
                                                    border: `1px solid ${p.color}44`, fontSize: 22,
                                                }}>{p.emoji}</div>
                                                <div>
                                                    <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{p.name}</div>
                                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Oda: {p.room}</div>
                                                    <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users style={{ width: 12, height: 12 }} /> {p.users}</span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Monitor style={{ width: 12, height: 12 }} /> {p.rooms} oda</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button className="btn-3d btn-3d-blue" style={{
                                                padding: '6px 18px', fontSize: 11, fontWeight: 800, borderRadius: 10,
                                            }}>Katıl</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* SAĞ ALAN */}
                        <div style={{ flex: '1 1 30%', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 24 }}>

                            {/* GİRİŞ PANELİ + TABLO LAMBASI */}
                            <div className="content-fade content-fade-3" style={{ position: 'relative' }}>
                                {/* ===== TABLO LAMBASI (SVG Gallery Lamp) ===== */}
                                <div className="gallery-lamp-svg">
                                    <svg width="300" height="52" viewBox="0 0 300 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                            <linearGradient id="glBarMetal" x1="0" y1="30" x2="0" y2="44" gradientUnits="userSpaceOnUse">
                                                <stop offset="0%" stopColor="#4a4a4a" />
                                                <stop offset="25%" stopColor="#2a2a2a" />
                                                <stop offset="50%" stopColor="#1a1a1a" />
                                                <stop offset="75%" stopColor="#2a2a2a" />
                                                <stop offset="100%" stopColor="#3a3a3a" />
                                            </linearGradient>
                                            <linearGradient id="glMountPlate" x1="150" y1="0" x2="150" y2="14" gradientUnits="userSpaceOnUse">
                                                <stop offset="0%" stopColor="#555" />
                                                <stop offset="50%" stopColor="#2a2a2a" />
                                                <stop offset="100%" stopColor="#1a1a1a" />
                                            </linearGradient>
                                            <linearGradient id="glArmMetal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#555" />
                                                <stop offset="50%" stopColor="#333" />
                                                <stop offset="100%" stopColor="#2a2a2a" />
                                            </linearGradient>
                                            <linearGradient id="glLightSpread" x1="150" y1="44" x2="150" y2="52" gradientUnits="userSpaceOnUse">
                                                <stop offset="0%" stopColor="#ffd080" stopOpacity="0.6" />
                                                <stop offset="100%" stopColor="#ffc864" stopOpacity="0" />
                                            </linearGradient>
                                            <linearGradient id="glLedStrip" x1="50" y1="43" x2="250" y2="43" gradientUnits="userSpaceOnUse">
                                                <stop offset="0%" stopColor="#ffcc66" stopOpacity="0" />
                                                <stop offset="15%" stopColor="#ffe0a0" stopOpacity="0.9" />
                                                <stop offset="50%" stopColor="#fff0cc" stopOpacity="1" />
                                                <stop offset="85%" stopColor="#ffe0a0" stopOpacity="0.9" />
                                                <stop offset="100%" stopColor="#ffcc66" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <path d="M58 44 L35 52 L265 52 L242 44 Z" fill="url(#glLightSpread)" opacity="0.5" />
                                        <rect x="135" y="0" width="30" height="10" rx="2" fill="url(#glMountPlate)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                                        <rect x="138" y="1" width="24" height="1.5" rx="0.75" fill="white" fillOpacity="0.1" />
                                        <line x1="142" y1="10" x2="115" y2="30" stroke="url(#glArmMetal)" strokeWidth="3" strokeLinecap="round" />
                                        <line x1="142.5" y1="10.5" x2="115.8" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                        <line x1="158" y1="10" x2="185" y2="30" stroke="url(#glArmMetal)" strokeWidth="3" strokeLinecap="round" />
                                        <line x1="157.5" y1="10.5" x2="184.2" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                        <rect x="48" y="30" width="204" height="14" rx="7" fill="url(#glBarMetal)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
                                        <rect x="58" y="32" width="184" height="2" rx="1" fill="white" fillOpacity="0.12" />
                                        <rect x="58" y="42" width="184" height="1" rx="0.5" fill="white" fillOpacity="0.04" />
                                        <rect x="55" y="43.5" width="190" height="1.5" rx="0.75" fill="url(#glLedStrip)" />
                                        <circle cx="115" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" />
                                        <circle cx="115" cy="34" r="1" fill="#555" />
                                        <circle cx="185" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" />
                                        <circle cx="185" cy="34" r="1" fill="#555" />
                                    </svg>
                                    <div className="gallery-lamp-glow" style={{ width: 280 }}></div>
                                </div>

                                <div className="glossy-panel" style={{ padding: '24px 28px', position: 'relative', zIndex: 10 }}>
                                    {/* Üst başlık */}
                                    <h3 style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                                        <User style={{ width: 18, height: 18, color: user ? '#fbbf24' : '#38bdf8' }} /> Hesap Paneli
                                    </h3>

                                    {!user ? (
                                        <>
                                            {/* Sekmeler */}
                                            <div style={{ display: 'flex', marginBottom: 20, borderRadius: 10, overflow: 'hidden', gap: 8 }}>
                                                <button
                                                    onClick={() => setLoginTab('guest')}
                                                    style={{
                                                        flex: 1, padding: '8px 0', fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                                                        textTransform: 'uppercase', border: 'none', cursor: 'pointer',
                                                        borderRadius: 8,
                                                        background: loginTab === 'guest' ? 'linear-gradient(180deg, rgba(56,189,248,0.3), rgba(2,132,199,0.4))' : 'rgba(0,0,0,0.25)',
                                                        color: loginTab === 'guest' ? '#7dd3fc' : 'rgba(255,255,255,0.35)',
                                                        transition: 'all 0.3s ease',
                                                        boxShadow: loginTab === 'guest' ? '0 0 16px rgba(56,189,248,0.3), 0 0 4px rgba(56,189,248,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                                                    }}
                                                >👤 Misafir</button>
                                                <button
                                                    onClick={() => setLoginTab('member')}
                                                    style={{
                                                        flex: 1, padding: '8px 0', fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                                                        textTransform: 'uppercase', border: 'none', cursor: 'pointer',
                                                        borderRadius: 8,
                                                        background: loginTab === 'member' ? 'linear-gradient(180deg, rgba(239,68,68,0.3), rgba(185,28,28,0.4))' : 'rgba(0,0,0,0.25)',
                                                        color: loginTab === 'member' ? '#fca5a5' : 'rgba(255,255,255,0.35)',
                                                        transition: 'all 0.3s ease',
                                                        boxShadow: loginTab === 'member' ? '0 0 16px rgba(239,68,68,0.3), 0 0 4px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                                                    }}
                                                >⭐ Üye Giriş</button>
                                            </div>

                                            {loginTab === 'guest' ? (
                                                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                                    <div>
                                                        <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 6, marginLeft: 2 }}>Takma Adınız</label>
                                                        <input
                                                            type="text"
                                                            value={guestNick}
                                                            onChange={(e) => setGuestNick(e.target.value)}
                                                            className="input-inset"
                                                            style={{ width: '100%', padding: '12px 14px', fontSize: 13, boxSizing: 'border-box' }}
                                                            placeholder="Nickname girin..."
                                                            autoComplete="off"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 8, marginLeft: 2 }}>Cinsiyet</label>
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            {(['Erkek', 'Kadın', 'Belirsiz'] as const).map(g => (
                                                                <button key={g} type="button" onClick={() => setGuestGender(g)} style={{
                                                                    flex: 1, padding: '7px 0', fontSize: 10, fontWeight: 700, letterSpacing: 1, border: 'none', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.25s ease',
                                                                    background: guestGender === g ? (g === 'Erkek' ? 'linear-gradient(180deg, rgba(56,189,248,0.3), rgba(2,132,199,0.4))' : g === 'Kadın' ? 'linear-gradient(180deg, rgba(244,114,182,0.3), rgba(219,39,119,0.4))' : 'linear-gradient(180deg, rgba(148,163,184,0.3), rgba(71,85,105,0.4))') : 'rgba(0,0,0,0.2)',
                                                                    color: guestGender === g ? (g === 'Erkek' ? '#7dd3fc' : g === 'Kadın' ? '#f9a8d4' : '#cbd5e1') : 'rgba(255,255,255,0.35)',
                                                                    boxShadow: guestGender === g ? 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05)' : 'none',
                                                                }}>{g === 'Erkek' ? '♂ Erkek' : g === 'Kadın' ? '♀ Kadın' : '⭐ Belirtme'}</button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {guestError && <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{guestError}</p>}
                                                    <button type="submit" className="btn-3d btn-3d-blue" style={{ width: '100%', padding: '10px 0', fontSize: 11, gap: 6 }} disabled={guestLoading}>
                                                        <LogIn style={{ width: 14, height: 14 }} /> {guestLoading ? 'Giriş yapılıyor...' : 'Misafir Giriş'}
                                                    </button>
                                                </form>
                                            ) : (
                                                <div style={{ position: 'relative', overflow: 'hidden' }}>
                                                    {/* Login / Register geçiş container */}
                                                    <div style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', transform: showRegister ? 'translateX(-100%)' : 'translateX(0)', opacity: showRegister ? 0 : 1, maxHeight: showRegister ? 0 : 600, overflow: 'hidden' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                                            <div>
                                                                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 6, marginLeft: 2 }}>Kullanıcı Adı</label>
                                                                <input type="text" value={memberUsername} onChange={(e) => setMemberUsername(e.target.value)} className="input-inset" style={{ width: '100%', padding: '12px 14px', fontSize: 13, boxSizing: 'border-box' }} placeholder="Üye adınız" autoComplete="off" />
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 6, marginLeft: 2 }}>Şifre</label>
                                                                <input type="password" value={memberPassword} onChange={(e) => setMemberPassword(e.target.value)} className="input-inset" style={{ width: '100%', padding: '12px 14px', fontSize: 13, boxSizing: 'border-box' }} placeholder="••••••••" autoComplete="new-password" />
                                                            </div>
                                                            {memberError && <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>{memberError}</p>}
                                                            <button onClick={handleMemberLogin} className="btn-3d btn-3d-red" style={{ width: '100%', padding: '10px 0', fontSize: 11, gap: 6 }} disabled={memberLoading}>
                                                                <LogIn style={{ width: 14, height: 14 }} /> {memberLoading ? 'Giriş yapılıyor...' : 'Üye Girişi'}
                                                            </button>
                                                            <button type="button" onClick={() => setShowRegister(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#94a3b8', fontWeight: 600, padding: '4px 0', transition: 'color 0.2s' }}>
                                                                Hesabın yok mu? <span style={{ color: '#fca5a5', fontWeight: 700 }}>Üye Ol</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Register Form */}
                                                    <div style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', transform: showRegister ? 'translateX(0)' : 'translateX(100%)', opacity: showRegister ? 1 : 0, maxHeight: showRegister ? 800 : 0, overflow: 'hidden', position: showRegister ? 'relative' : 'absolute', top: 0, left: 0, right: 0 }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                            <h4 style={{ fontSize: 12, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', marginBottom: 4 }}>✨ Yeni Üyelik</h4>
                                                            <div>
                                                                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 5, marginLeft: 2 }}>Kullanıcı Adı</label>
                                                                <input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} className="input-inset" style={{ width: '100%', padding: '10px 14px', fontSize: 12, boxSizing: 'border-box' }} placeholder="Kullanıcı adınız" autoComplete="off" />
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 5, marginLeft: 2 }}>E-posta</label>
                                                                <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className="input-inset" style={{ width: '100%', padding: '10px 14px', fontSize: 12, boxSizing: 'border-box' }} placeholder="ornek@mail.com" autoComplete="off" />
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 5, marginLeft: 2 }}>Şifre</label>
                                                                <input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className="input-inset" style={{ width: '100%', padding: '10px 14px', fontSize: 12, boxSizing: 'border-box' }} placeholder="En az 6 karakter" autoComplete="new-password" />
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 5, marginLeft: 2 }}>Şifre Tekrar</label>
                                                                <input type="password" value={regPasswordConfirm} onChange={(e) => setRegPasswordConfirm(e.target.value)} className="input-inset" style={{ width: '100%', padding: '10px 14px', fontSize: 12, boxSizing: 'border-box' }} placeholder="Şifrenizi tekrarlayın" autoComplete="new-password" />
                                                            </div>
                                                            <div>
                                                                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 8, marginLeft: 2 }}>Cinsiyet</label>
                                                                <div style={{ display: 'flex', gap: 6 }}>
                                                                    {(['Erkek', 'Kadın', 'Belirsiz'] as const).map(g => (
                                                                        <button key={g} type="button" onClick={() => setRegGender(g)} style={{
                                                                            flex: 1, padding: '7px 0', fontSize: 9, fontWeight: 700, letterSpacing: 1, border: 'none', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.25s ease',
                                                                            background: regGender === g ? (g === 'Erkek' ? 'linear-gradient(180deg, rgba(56,189,248,0.3), rgba(2,132,199,0.4))' : g === 'Kadın' ? 'linear-gradient(180deg, rgba(244,114,182,0.3), rgba(219,39,119,0.4))' : 'linear-gradient(180deg, rgba(148,163,184,0.3), rgba(71,85,105,0.4))') : 'rgba(0,0,0,0.2)',
                                                                            color: regGender === g ? (g === 'Erkek' ? '#7dd3fc' : g === 'Kadın' ? '#f9a8d4' : '#cbd5e1') : 'rgba(255,255,255,0.35)',
                                                                            boxShadow: regGender === g ? 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05)' : 'none',
                                                                        }}>{g === 'Erkek' ? '♂ Erkek' : g === 'Kadın' ? '♀ Kadın' : '⭐ Belirtme'}</button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}>
                                                                <input type="checkbox" checked={regAcceptTerms} onChange={(e) => setRegAcceptTerms(e.target.checked)} style={{ accentColor: '#ef4444', width: 16, height: 16, cursor: 'pointer' }} />
                                                                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}><span style={{ color: '#fca5a5', textDecoration: 'underline', cursor: 'pointer' }}>Üyelik Sözleşmesini</span> okudum ve kabul ediyorum</span>
                                                            </label>
                                                            {regError && <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>{regError}</p>}
                                                            <button onClick={handleRegister} className="btn-3d btn-3d-red" style={{ width: '100%', padding: '10px 0', fontSize: 11, gap: 6 }} disabled={regLoading}>
                                                                <Sparkles style={{ width: 14, height: 14 }} /> {regLoading ? 'Kayıt yapılıyor...' : 'Üye Ol'}
                                                            </button>
                                                            <button type="button" onClick={() => setShowRegister(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#94a3b8', fontWeight: 600, padding: '2px 0', transition: 'color 0.2s' }}>
                                                                ← Giriş ekranına dön
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '8px 0' }}>
                                            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={user.avatar} style={{ width: 80, height: 80, borderRadius: 16, border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', background: '#1e293b', objectFit: 'cover' }} alt="Avatar" />
                                            </div>
                                            <h4 style={{ fontSize: 20, fontWeight: 900, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{user.username}</h4>
                                            <p style={{ fontSize: 12, fontWeight: 700, color: user.isMember ? '#fbbf24' : '#38bdf8', marginTop: 6, marginBottom: 24, textTransform: 'uppercase', letterSpacing: 2, textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>{user.isMember ? (user.role === 'owner' ? '👑 Owner' : user.role === 'admin' ? '🛡️ Admin' : '✦ Üye') : '👤 Misafir'}</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                <button onClick={() => goRoom()} className="btn-3d btn-3d-blue" style={{ width: '100%', padding: '10px 0', fontSize: 11, gap: 6 }}>
                                                    Odaya Gir
                                                </button>
                                                <button onClick={handleLogout} className="btn-3d btn-3d-logout" style={{ width: '100%', padding: '10px 0', fontSize: 11 }}>
                                                    Çıkış Yap
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
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
                                    <button onClick={() => setShowPackages(true)} className="btn-3d btn-3d-gold" style={{ width: '100%', padding: '12px 0', fontSize: 11 }}>
                                        Paketleri İncele
                                    </button>
                                </div>
                            </div>

                            {/* CANLI DESTEK */}
                            <div className="glossy-panel content-fade content-fade-5" style={{ padding: '24px 32px', textAlign: 'center', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(180deg, #34d399, #059669)', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.6), 0 10px 20px rgba(16,185,129,0.3)' }}>
                                    <Headset style={{ width: 28, height: 28, color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                                </div>
                                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Müşteri Hizmetleri</h4>
                                <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 20, fontWeight: 500 }}>Sorularınız ve önerileriniz için bize ulaşın.</p>
                                <button onClick={() => setSupportOpen(!supportOpen)} className="btn-3d btn-3d-green" style={{ width: '100%', padding: '12px 0', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <Headset style={{ width: 15, height: 15 }} /> {supportOpen ? 'Kapat' : 'Bize Ulaşın'}
                                </button>

                                {/* Expandable Content */}
                                <div style={{
                                    maxHeight: supportOpen ? 600 : 0,
                                    opacity: supportOpen ? 1 : 0,
                                    overflow: 'hidden',
                                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                    marginTop: supportOpen ? 16 : 0,
                                }}>
                                    {/* Quick Contact */}
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                        <a href="https://wa.me/905520363674" target="_blank" rel="noopener noreferrer" style={{
                                            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
                                            background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)',
                                        }}>
                                            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #25d366, #128c7e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <MessageCircle style={{ width: 12, height: 12, color: '#fff' }} />
                                            </div>
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ fontSize: 10, fontWeight: 800, color: '#25d366' }}>WhatsApp</div>
                                                <div style={{ fontSize: 8, color: '#94a3b8' }}>+90 552 036 3674</div>
                                            </div>
                                        </a>
                                        <a href="mailto:destek@sopranochat.com" style={{
                                            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '10px 12px', borderRadius: 10, textDecoration: 'none',
                                            background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)',
                                        }}>
                                            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Mail style={{ width: 12, height: 12, color: '#fff' }} />
                                            </div>
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ fontSize: 10, fontWeight: 800, color: '#38bdf8' }}>E-Posta</div>
                                                <div style={{ fontSize: 8, color: '#94a3b8' }}>destek@sopranochat.com</div>
                                            </div>
                                        </a>
                                    </div>
                                    {/* Divider */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                                        <span style={{ fontSize: 7, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>MESAJ GÖNDERİN</span>
                                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                                    </div>
                                    {/* Form */}
                                    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                                        <input type="text" value={supName} onChange={e => setSupName(e.target.value)} placeholder="Ad Soyad"
                                            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }} />
                                        <input type="email" value={supEmail} onChange={e => setSupEmail(e.target.value)} placeholder="mail@ornek.com"
                                            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none' }} />
                                    </div>
                                    <input type="text" value={supSubject} onChange={e => setSupSubject(e.target.value)} placeholder="Mesajınızın konusu"
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', marginBottom: 6 }} />
                                    <textarea value={supMessage} onChange={e => setSupMessage(e.target.value)} placeholder="Mesajınızı buraya yazın..."
                                        rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', resize: 'none', marginBottom: 10 }} />
                                    <button className="btn-3d btn-3d-gold" style={{ width: '100%', padding: '10px 0', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        Mesaj Gönder <Send style={{ width: 13, height: 13 }} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    )}

                    {/* İLETİŞİM SECTION */}
                    {activeSection === 'iletisim' && (
                        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative' }}>
                            {/* Gallery Lamp */}
                            <div className="gallery-lamp-svg" style={{ animation: 'lampSlideDown 1s cubic-bezier(0.22, 0.61, 0.36, 1) 0s both' }}>
                                <svg width="500" height="52" viewBox="0 0 500 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <linearGradient id="glBarMetalC" x1="0" y1="30" x2="0" y2="44" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#4a4a4a" /><stop offset="25%" stopColor="#2a2a2a" /><stop offset="50%" stopColor="#1a1a1a" /><stop offset="75%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#3a3a3a" />
                                        </linearGradient>
                                        <linearGradient id="glMountPlateC" x1="250" y1="0" x2="250" y2="14" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#1a1a1a" />
                                        </linearGradient>
                                        <linearGradient id="glArmMetalC" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#333" /><stop offset="100%" stopColor="#2a2a2a" />
                                        </linearGradient>
                                        <linearGradient id="glLightSpreadC" x1="250" y1="44" x2="250" y2="52" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#ffd080" stopOpacity="0.6" /><stop offset="100%" stopColor="#ffc864" stopOpacity="0" />
                                        </linearGradient>
                                        <linearGradient id="glLedStripC" x1="70" y1="43" x2="430" y2="43" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#ffcc66" stopOpacity="0" /><stop offset="15%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="50%" stopColor="#fff0cc" stopOpacity="1" /><stop offset="85%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="100%" stopColor="#ffcc66" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M78 44 L50 52 L450 52 L422 44 Z" fill="url(#glLightSpreadC)" opacity="0.5" />
                                    <rect x="235" y="0" width="30" height="10" rx="2" fill="url(#glMountPlateC)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                                    <rect x="238" y="1" width="24" height="1.5" rx="0.75" fill="white" fillOpacity="0.1" />
                                    <line x1="242" y1="10" x2="205" y2="30" stroke="url(#glArmMetalC)" strokeWidth="3" strokeLinecap="round" />
                                    <line x1="242.5" y1="10.5" x2="205.8" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                    <line x1="258" y1="10" x2="295" y2="30" stroke="url(#glArmMetalC)" strokeWidth="3" strokeLinecap="round" />
                                    <line x1="257.5" y1="10.5" x2="294.2" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                    <rect x="60" y="30" width="380" height="14" rx="7" fill="url(#glBarMetalC)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
                                    <rect x="70" y="32" width="360" height="2" rx="1" fill="white" fillOpacity="0.12" />
                                    <rect x="70" y="42" width="360" height="1" rx="0.5" fill="white" fillOpacity="0.04" />
                                    <rect x="67" y="43.5" width="366" height="1.5" rx="0.75" fill="url(#glLedStripC)" />
                                    <circle cx="205" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="205" cy="34" r="1" fill="#555" />
                                    <circle cx="295" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="295" cy="34" r="1" fill="#555" />
                                </svg>
                                <div className="gallery-lamp-glow" style={{ width: 450 }}></div>
                            </div>
                            <div className="glossy-panel" style={{ padding: '28px 32px', animation: 'cardDropDown 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 0.6s both', transformOrigin: 'top center' }}>
                                {/* Başlık */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 14,
                                        background: 'linear-gradient(135deg, #38bdf8, #06b6d4)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 6px 16px rgba(56,189,248,0.25), inset 0 1px 1px rgba(255,255,255,0.4)',
                                    }}>
                                        <Phone style={{ width: 20, height: 20, color: '#fff' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)', margin: 0 }}>Bizimle İletişime Geçin</h2>
                                        <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, margin: 0 }}>SopranoChat Bilişim · Sorularınız ve önerileriniz için bize ulaşın.</p>
                                    </div>
                                </div>

                                {/* İletişim Butonları — yatay */}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                                    <a href="https://wa.me/905520363674" target="_blank" rel="noopener noreferrer" style={{
                                        flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '12px 14px', borderRadius: 12, textDecoration: 'none',
                                        background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.18)',
                                        transition: 'all 0.3s',
                                    }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #25d366, #128c7e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <MessageCircle style={{ width: 15, height: 15, color: '#fff' }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: '#25d366' }}>WhatsApp</div>
                                            <div style={{ fontSize: 9, color: '#94a3b8' }}>+90 552 036 3674</div>
                                        </div>
                                    </a>
                                    <a href="mailto:destek@sopranochat.com" style={{
                                        flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '12px 14px', borderRadius: 12, textDecoration: 'none',
                                        background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.18)',
                                        transition: 'all 0.3s',
                                    }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Mail style={{ width: 15, height: 15, color: '#fff' }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8' }}>E-Posta</div>
                                            <div style={{ fontSize: 9, color: '#94a3b8' }}>destek@sopranochat.com</div>
                                        </div>
                                    </a>
                                    <div style={{
                                        flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '12px 14px', borderRadius: 12,
                                        background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.18)',
                                    }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Globe style={{ width: 15, height: 15, color: '#fff' }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24' }}>Web</div>
                                            <div style={{ fontSize: 9, color: '#94a3b8' }}>sopranochat.com</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Ayırıcı */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                                    <span style={{ fontSize: 8, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5 }}>Mesaj Gönderin</span>
                                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                                </div>

                                {/* Form */}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                    <input type="text" value={supName} onChange={e => setSupName(e.target.value)} placeholder="Ad Soyad" style={{
                                        flex: 1, padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff',
                                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none',
                                    }} />
                                    <input type="email" value={supEmail} onChange={e => setSupEmail(e.target.value)} placeholder="mail@ornek.com" style={{
                                        flex: 1, padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff',
                                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none',
                                    }} />
                                </div>
                                <input type="text" value={supSubject} onChange={e => setSupSubject(e.target.value)} placeholder="Mesajınızın konusu" style={{
                                    width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff',
                                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', marginBottom: 8,
                                }} />
                                <textarea value={supMessage} onChange={e => setSupMessage(e.target.value)} placeholder="Mesajınızı buraya yazın..."
                                    rows={3} style={{
                                        width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff',
                                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', outline: 'none', resize: 'none', marginBottom: 12,
                                    }} />
                                <button className="btn-3d btn-3d-gold" style={{ width: '100%', padding: '12px 0', fontSize: 13, fontWeight: 900, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    Mesaj Gönder <Send style={{ width: 14, height: 14 }} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* FİYATLAR SECTION */}
                    {activeSection === 'fiyatlar' && (
                        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
                            {/* Gallery Lamp */}
                            <div className="gallery-lamp-svg" style={{ animation: 'lampSlideDown 1s cubic-bezier(0.22, 0.61, 0.36, 1) 0s both' }}>
                                <svg width="500" height="52" viewBox="0 0 500 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <linearGradient id="glBarMetalP" x1="0" y1="30" x2="0" y2="44" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#4a4a4a" /><stop offset="25%" stopColor="#2a2a2a" /><stop offset="50%" stopColor="#1a1a1a" /><stop offset="75%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#3a3a3a" />
                                        </linearGradient>
                                        <linearGradient id="glMountPlateP" x1="250" y1="0" x2="250" y2="14" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#1a1a1a" />
                                        </linearGradient>
                                        <linearGradient id="glArmMetalP" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#333" /><stop offset="100%" stopColor="#2a2a2a" />
                                        </linearGradient>
                                        <linearGradient id="glLightSpreadP" x1="250" y1="44" x2="250" y2="52" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#ffd080" stopOpacity="0.6" /><stop offset="100%" stopColor="#ffc864" stopOpacity="0" />
                                        </linearGradient>
                                        <linearGradient id="glLedStripP" x1="70" y1="43" x2="430" y2="43" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#ffcc66" stopOpacity="0" /><stop offset="15%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="50%" stopColor="#fff0cc" stopOpacity="1" /><stop offset="85%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="100%" stopColor="#ffcc66" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M78 44 L50 52 L450 52 L422 44 Z" fill="url(#glLightSpreadP)" opacity="0.5" />
                                    <rect x="235" y="0" width="30" height="10" rx="2" fill="url(#glMountPlateP)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                                    <rect x="238" y="1" width="24" height="1.5" rx="0.75" fill="white" fillOpacity="0.1" />
                                    <line x1="242" y1="10" x2="205" y2="30" stroke="url(#glArmMetalP)" strokeWidth="3" strokeLinecap="round" />
                                    <line x1="242.5" y1="10.5" x2="205.8" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                    <line x1="258" y1="10" x2="295" y2="30" stroke="url(#glArmMetalP)" strokeWidth="3" strokeLinecap="round" />
                                    <line x1="257.5" y1="10.5" x2="294.2" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                    <rect x="60" y="30" width="380" height="14" rx="7" fill="url(#glBarMetalP)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
                                    <rect x="70" y="32" width="360" height="2" rx="1" fill="white" fillOpacity="0.12" />
                                    <rect x="70" y="42" width="360" height="1" rx="0.5" fill="white" fillOpacity="0.04" />
                                    <rect x="67" y="43.5" width="366" height="1.5" rx="0.75" fill="url(#glLedStripP)" />
                                    <circle cx="205" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="205" cy="34" r="1" fill="#555" />
                                    <circle cx="295" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="295" cy="34" r="1" fill="#555" />
                                </svg>
                                <div className="gallery-lamp-glow" style={{ width: 450 }}></div>
                            </div>
                            <div className="glossy-panel" style={{ padding: '28px 32px', animation: 'cardDropDown 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 0.6s both', transformOrigin: 'top center' }}>
                                {/* Başlık */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 14,
                                        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 6px 16px rgba(251,191,36,0.25), inset 0 1px 1px rgba(255,255,255,0.4)',
                                    }}>
                                        <Star style={{ width: 20, height: 20, color: '#fff' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)', margin: 0 }}>Fiyatlandırma</h2>
                                        <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, margin: 0 }}>İşletmenize uygun çözüm modelini seçin.</p>
                                    </div>
                                </div>

                                {/* Paket Kartları */}
                                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                                    {[
                                        { name: 'Ses + Metin', price: '200', priceNum: 200, period: '/ay', icon: '🎙️', features: ['Sınırsız sesli ve yazılı sohbet', 'Şifreli oda koruma', 'Ban / Gag-List yetkileri'], color: '#38bdf8', popular: false, badge: '', btnText: 'Satın Al', btnClass: 'btn-3d-blue' },
                                        { name: 'Kamera + Ses', price: '400', priceNum: 400, period: '/ay', icon: '📹', features: ['Standart paketteki tüm özellikler', 'Eşzamanlı web kamerası yayını', 'Canlı protokol takibi'], color: '#a78bfa', popular: true, badge: 'POPÜLER', btnText: 'Hemen Başla', btnClass: 'btn-3d-red' },
                                        { name: 'White Label', price: '2.990', priceNum: 2990, period: '/ay', icon: '🏢', features: ['10 bağımsız oda lisansı', 'HTML/PHP embed altyapısı', 'Farklı domain desteği'], color: '#fbbf24', popular: false, badge: 'BAYİ', btnText: 'Satın Al', btnClass: 'btn-3d-gold' },
                                    ].map((plan, i) => (
                                        <div key={i} style={{
                                            flex: 1, padding: '20px 16px', borderRadius: 14,
                                            background: plan.popular ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${plan.popular ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.06)'}`,
                                            position: 'relative', overflow: 'hidden',
                                            display: 'flex', flexDirection: 'column',
                                        }}>
                                            {plan.badge && <div style={{ position: 'absolute', top: 8, right: -24, background: plan.popular ? '#a78bfa' : '#fbbf24', color: plan.popular ? '#fff' : '#000', fontSize: 7, fontWeight: 800, padding: '2px 28px', transform: 'rotate(45deg)', letterSpacing: 1 }}>{plan.badge}</div>}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                                <span style={{ fontSize: 18 }}>{plan.icon}</span>
                                                <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{plan.name}</span>
                                            </div>
                                            <div style={{ marginBottom: 16 }}>
                                                <span style={{ fontSize: 28, fontWeight: 900, color: plan.color }}>{plan.price} ₺</span>
                                                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}> {plan.period}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, flex: 1 }}>
                                                {plan.features.map((f, fi) => (
                                                    <div key={fi} style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <span style={{ color: '#34d399', fontSize: 12 }}>✓</span> {f}
                                                    </div>
                                                ))}
                                            </div>
                                            <button onClick={() => openCheckout(plan.name, plan.priceNum, plan.period)} className={`btn-3d ${plan.btnClass}`} style={{ width: '100%', padding: '10px 0', fontSize: 11, fontWeight: 800 }}>{plan.btnText}</button>
                                        </div>
                                    ))}
                                </div>

                                {/* Özel Yapılandırma */}
                                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 14, padding: '20px', border: '1px solid rgba(56,189,248,0.15)', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                        <div>
                                            <div style={{ fontSize: 10, fontWeight: 800, color: '#38bdf8', background: 'rgba(56,189,248,0.15)', padding: '3px 10px', borderRadius: 6, display: 'inline-block', letterSpacing: 1, marginBottom: 6 }}>⚙️ Özel Yapılandırma</div>
                                            <h4 style={{ fontSize: 14, fontWeight: 900, color: '#fff', margin: 0 }}>Kendi Paketini Oluştur</h4>
                                        </div>
                                        <button onClick={() => {
                                            const rc = cfgRooms * 200;
                                            const cc = cfgCamera === 'Kameralı' ? cfgRooms * 200 : 0;
                                            const mc = cfgMeeting === 'Mevcut' ? 200 : 0;
                                            const pe = cfgPersons > 30 ? Math.floor((cfgPersons - 30) / 20) * cfgRooms * 50 : 0;
                                            openCheckout('Özel Paket', rc + cc + mc + pe, '/ay');
                                        }} className="btn-3d btn-3d-red" style={{ padding: '8px 20px', fontSize: 11, fontWeight: 800, borderRadius: 10 }}>
                                            Satın Al →
                                        </button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                                        <div>
                                            <div style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>🏠 Oda Sayısı</div>
                                            <select value={cfgRooms} onChange={e => setCfgRooms(Number(e.target.value))} style={{
                                                width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff',
                                                background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', cursor: 'pointer', outline: 'none',
                                            }}>
                                                {[1, 2, 3, 5, 10, 15, 20, 30, 50, 75, 100].map(v => <option key={v} value={v} style={{ background: '#1e293b' }}>{v} Oda</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 9, fontWeight: 800, color: '#38bdf8', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>👥 Kişi Limiti</div>
                                            <select value={cfgPersons} onChange={e => setCfgPersons(Number(e.target.value))} style={{
                                                width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff',
                                                background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', cursor: 'pointer', outline: 'none',
                                            }}>
                                                {[30, 50, 100, 200, 500].map(v => <option key={v} value={v} style={{ background: '#1e293b' }}>{v} Kişi</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 9, fontWeight: 800, color: '#a78bfa', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>📹 Kamera</div>
                                            <select value={cfgCamera} onChange={e => setCfgCamera(e.target.value as any)} style={{
                                                width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff',
                                                background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', cursor: 'pointer', outline: 'none',
                                            }}>
                                                <option value="Kameralı" style={{ background: '#1e293b' }}>Kameralı</option>
                                                <option value="Kamerasız" style={{ background: '#1e293b' }}>Kamerasız</option>
                                            </select>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>💛 Toplantı</div>
                                            <select value={cfgMeeting} onChange={e => setCfgMeeting(e.target.value as any)} style={{
                                                width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff',
                                                background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', cursor: 'pointer', outline: 'none',
                                            }}>
                                                <option value="Mevcut" style={{ background: '#1e293b' }}>Mevcut</option>
                                                <option value="Yok" style={{ background: '#1e293b' }}>Yok</option>
                                            </select>
                                        </div>
                                    </div>
                                    {/* Fiyat Hesaplama */}
                                    {(() => {
                                        const roomCost = cfgRooms * 200;
                                        const cameraCost = cfgCamera === 'Kameralı' ? cfgRooms * 200 : 0;
                                        const meetingCost = cfgMeeting === 'Mevcut' ? 200 : 0;
                                        const personExtra = cfgPersons > 30 ? Math.floor((cfgPersons - 30) / 20) * cfgRooms * 50 : 0;
                                        const monthlyTotal = roomCost + cameraCost + meetingCost + personExtra;
                                        const yearlyTotal = monthlyTotal * 10;
                                        return (
                                            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
                                                        <span>🏠 {cfgRooms} Oda</span><span style={{ color: '#fff', fontWeight: 700 }}>+{roomCost.toLocaleString('tr-TR')} ₺</span>
                                                    </div>
                                                    {cameraCost > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
                                                        <span>📹 Kamera</span><span style={{ color: '#fff', fontWeight: 700 }}>+{cameraCost.toLocaleString('tr-TR')} ₺</span>
                                                    </div>}
                                                    {meetingCost > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
                                                        <span>💛 Toplantı</span><span style={{ color: '#fff', fontWeight: 700 }}>+{meetingCost.toLocaleString('tr-TR')} ₺</span>
                                                    </div>}
                                                    {personExtra > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
                                                        <span>👥 Ek Kapasite ({cfgPersons} kişi)</span><span style={{ color: '#fff', fontWeight: 700 }}>+{personExtra.toLocaleString('tr-TR')} ₺</span>
                                                    </div>}
                                                </div>
                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                                                    <div><div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Aylık</div><div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{monthlyTotal.toLocaleString('tr-TR')} ₺</div></div>
                                                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: 9, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>Yıllık (2 Ay Ücretsiz)</div><div style={{ fontSize: 18, fontWeight: 900, color: '#34d399' }}>{yearlyTotal.toLocaleString('tr-TR')} ₺</div></div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Alt bilgi */}
                                <div style={{ textAlign: 'center', padding: '12px 16px', borderRadius: 10, background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.1)' }}>
                                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                                        Tüm paketler <span style={{ color: '#34d399', fontWeight: 700 }}>7 gün ücretsiz deneme</span> ile başlar. İstediğiniz zaman iptal edebilirsiniz.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* REHBER SECTION */}
                    {activeSection === 'rehber' && (
                        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
                            {/* Gallery Lamp */}
                            <div className="gallery-lamp-svg" style={{ animation: 'lampSlideDown 1s cubic-bezier(0.22, 0.61, 0.36, 1) 0s both' }}>
                                <svg width="500" height="52" viewBox="0 0 500 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <linearGradient id="glBarMetalR" x1="0" y1="30" x2="0" y2="44" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#4a4a4a" /><stop offset="25%" stopColor="#2a2a2a" /><stop offset="50%" stopColor="#1a1a1a" /><stop offset="75%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#3a3a3a" />
                                        </linearGradient>
                                        <linearGradient id="glMountPlateR" x1="250" y1="0" x2="250" y2="14" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#1a1a1a" />
                                        </linearGradient>
                                        <linearGradient id="glArmMetalR" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#333" /><stop offset="100%" stopColor="#2a2a2a" />
                                        </linearGradient>
                                        <linearGradient id="glLightSpreadR" x1="250" y1="44" x2="250" y2="52" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#ffd080" stopOpacity="0.6" /><stop offset="100%" stopColor="#ffc864" stopOpacity="0" />
                                        </linearGradient>
                                        <linearGradient id="glLedStripR" x1="70" y1="43" x2="430" y2="43" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#ffcc66" stopOpacity="0" /><stop offset="15%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="50%" stopColor="#fff0cc" stopOpacity="1" /><stop offset="85%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="100%" stopColor="#ffcc66" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M78 44 L50 52 L450 52 L422 44 Z" fill="url(#glLightSpreadR)" opacity="0.5" />
                                    <rect x="235" y="0" width="30" height="10" rx="2" fill="url(#glMountPlateR)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                                    <rect x="238" y="1" width="24" height="1.5" rx="0.75" fill="white" fillOpacity="0.1" />
                                    <line x1="242" y1="10" x2="205" y2="30" stroke="url(#glArmMetalR)" strokeWidth="3" strokeLinecap="round" />
                                    <line x1="242.5" y1="10.5" x2="205.8" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                    <line x1="258" y1="10" x2="295" y2="30" stroke="url(#glArmMetalR)" strokeWidth="3" strokeLinecap="round" />
                                    <line x1="257.5" y1="10.5" x2="294.2" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                    <rect x="60" y="30" width="380" height="14" rx="7" fill="url(#glBarMetalR)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
                                    <rect x="70" y="32" width="360" height="2" rx="1" fill="white" fillOpacity="0.12" />
                                    <rect x="70" y="42" width="360" height="1" rx="0.5" fill="white" fillOpacity="0.04" />
                                    <rect x="67" y="43.5" width="366" height="1.5" rx="0.75" fill="url(#glLedStripR)" />
                                    <circle cx="205" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="205" cy="34" r="1" fill="#555" />
                                    <circle cx="295" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="295" cy="34" r="1" fill="#555" />
                                </svg>
                                <div className="gallery-lamp-glow" style={{ width: 450 }}></div>
                            </div>
                            <div className="glossy-panel" style={{ padding: '28px 32px', animation: 'cardDropDown 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 0.6s both', transformOrigin: 'top center' }}>
                                {/* Başlık */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 14,
                                        background: 'linear-gradient(135deg, #34d399, #10b981)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 6px 16px rgba(52,211,153,0.25), inset 0 1px 1px rgba(255,255,255,0.4)',
                                    }}>
                                        <BookOpen style={{ width: 20, height: 20, color: '#fff' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)', margin: 0 }}>Kullanım Rehberi</h2>
                                        <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, margin: 0 }}>SopranoChat'i en verimli şekilde kullanmanız için rehber.</p>
                                    </div>
                                </div>

                                {/* Accordion */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {[
                                        {
                                            id: 'baslangic', icon: '🚀', title: 'Hızlı Başlangıç', color: '#38bdf8',
                                            items: [
                                                { q: 'Hesap Oluşturma', a: 'Ana sayfadaki "Kayıt Ol" butonuna tıklayın. Kullanıcı adı, e-posta ve şifrenizi girin. E-posta doğrulaması sonrası hesabınız aktif olacaktır.' },
                                                { q: 'İlk Odaya Giriş', a: 'Giriş yaptıktan sonra oda listesinden istediğiniz odaya tıklayın. Bazı odalar şifreli olabilir, şifreyi oda sahibinden öğrenebilirsiniz.' },
                                                { q: 'Mikrofon & Kamera İzinleri', a: 'Tarayıcınız mikrofon ve kamera erişimi isteyecektir. "İzin Ver" butonuna tıklayarak sesli/görüntülü sohbete katılabilirsiniz.' },
                                            ],
                                        },
                                        {
                                            id: 'oda', icon: '🎙️', title: 'Oda Kullanım Rehberi', color: '#a78bfa',
                                            items: [
                                                { q: 'Sesli Sohbet', a: 'Odaya girdikten sonra mikrofon butonuna tıklayarak sesli konuşmaya başlayabilirsiniz. Push-to-talk veya sürekli açık mod seçenekleri mevcuttur.' },
                                                { q: 'Kamera Yayını', a: 'Kamera destekli odalarda kamera ikonuna tıklayarak görüntülü yayın başlatabilirsiniz. HD kalitede eşzamanlı yayın yapılır.' },
                                                { q: 'Metin Sohbeti', a: 'Alt kısımdaki mesaj kutusundan yazılı mesajlar gönderebilirsiniz. Emoji, bağlantı ve özel formatlar desteklenir.' },
                                                { q: 'Özel Mesaj (Private Chat)', a: 'Bir kullanıcıya sağ tıklayıp "Özel Mesaj" seçeneğini kullanarak birebir yazışma başlatabilirsiniz.' },
                                                { q: 'One2One Görüşme', a: 'Bir kullanıcıya sağ tıklayıp "One2One Davet" ile özel birebir sesli/görüntülü görüşme başlatabilirsiniz.' },
                                            ],
                                        },
                                        {
                                            id: 'roller', icon: '👑', title: 'Roller & Yetkiler', color: '#fbbf24',
                                            items: [
                                                { q: 'Rol Sıralaması', a: 'Misafir → Üye → VIP → Operatör → Moderatör → Admin → Süper Admin → Owner → GodMaster. Her üst rol, altındaki tüm yetkilere sahiptir.' },
                                                { q: 'Misafir & Üye', a: 'Temel sohbet özellikleri: mesaj yazma, sesli dinleme, özel mesaj gönderme. Üyeler ayrıca nudge ve düello gönderebilir.' },
                                                { q: 'VIP', a: 'Özel VIP rozeti, öncelikli mikrofon sırası ve genişletilmiş profil özellikleri.' },
                                                { q: 'Operatör & Moderatör', a: 'Kullanıcıları susturma (mute/gag), odadan atma (kick), mikrofon yönetimi ve kısa süreli ban yetkileri.' },
                                                { q: 'Admin & Süper Admin', a: 'Uzun süreli ban, rol atama/kaldırma, admin paneli erişimi, oda izleme ve gelişmiş yönetim araçları.' },
                                                { q: 'Owner', a: 'Oda sahibi. Kalıcı ban, tüm rolleri atama, oda ayarlarını değiştirme ve tam yönetim yetkisi.' },
                                            ],
                                        },
                                        {
                                            id: 'yonetim', icon: '🏠', title: 'Oda Yönetimi', color: '#ef4444',
                                            items: [
                                                { q: 'Oda Satın Alma', a: 'Fiyatlar bölümünden size uygun paketi seçin veya Özel Yapılandırma ile ihtiyacınıza göre paket oluşturun. Ödeme sonrası odanız anında aktif olur.' },
                                                { q: 'Şifre Koruması', a: 'Admin panelinden odanıza şifre koyabilirsiniz. Şifreli odalara sadece şifreyi bilen kullanıcılar girebilir.' },
                                                { q: 'Toplantı Modu', a: 'Toplantı modunu aktif ederek odayı kapalı bir konferans ortamına dönüştürebilirsiniz. Sadece davet edilen kullanıcılar katılabilir.' },
                                                { q: 'Ban & Gag Listesi', a: 'Admin panelinden yasaklı (ban) ve susturulmuş (gag) kullanıcı listelerini yönetebilir, yasakları kaldırabilirsiniz.' },
                                                { q: 'Oda İzleme (Monitor)', a: 'Süper Admin ve üzeri roller, Oda İzleme özelliğiyle odadaki tüm aktiviteleri gerçek zamanlı takip edebilir.' },
                                            ],
                                        },
                                        {
                                            id: 'yapilandirma', icon: '⚙️', title: 'Özel Yapılandırma', color: '#38bdf8',
                                            items: [
                                                { q: 'Kendi Paketini Oluştur', a: 'Fiyatlar sayfasındaki Özel Yapılandırma bölümünden oda sayısı, kişi limiti, kamera ve toplantı modu seçeneklerini istediğiniz gibi ayarlayabilirsiniz.' },
                                                { q: 'White Label / Domain', a: 'White Label pakette kendi domaininizi kullanarak SopranoChat altyapısını kendi markanızla sunabilirsiniz. HTML/PHP embed desteği mevcuttur.' },
                                                { q: 'Farklı Domain Desteği', a: 'Birden fazla domain üzerinden aynı altyapıyı kullanabilirsiniz. Her domain için ayrı oda yapılandırması mümkündür.' },
                                            ],
                                        },
                                        {
                                            id: 'sss', icon: '❓', title: 'Sık Sorulan Sorular', color: '#f472b6',
                                            items: [
                                                { q: 'Sesim karşı tarafa gitmiyorsa ne yapmalıyım?', a: 'Tarayıcı ayarlarından mikrofon izninin verildiğinden emin olun. Farklı bir mikrofon seçmeyi deneyin. Sayfayı yenileyip tekrar giriş yapın.' },
                                                { q: 'Nasıl oda satın alabilirim?', a: 'Üst menüden FİYATLAR sekmesine gidin, size uygun paketi seçin ve ödeme adımlarını takip edin. 7 gün ücretsiz deneme ile başlayabilirsiniz.' },
                                                { q: 'Kamera açılmıyorsa ne yapmalıyım?', a: 'Tarayıcınızın kamera iznini kontrol edin. Başka bir uygulama kamerayı kullanıyor olabilir, kapatıp tekrar deneyin.' },
                                                { q: 'Ban yedim, ne yapabilirim?', a: 'Ban süresine bağlı olarak otomatik kalkar. Kalıcı banlarda oda sahibi veya adminlerle iletişime geçin. İletişim bölümünden destek alabilirsiniz.' },
                                                { q: 'Odamdaki rolleri nasıl yönetirim?', a: 'Admin panelinden kullanıcılara sağ tıklayarak rol atama/kaldırma işlemlerini yapabilirsiniz. Yalnızca kendi rolünüzden düşük rolleri atayabilirsiniz.' },
                                            ],
                                        },
                                    ].map((section) => (
                                        <div key={section.id} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${guideOpen === section.id ? `${section.color}30` : 'rgba(255,255,255,0.06)'}`, transition: 'all 0.3s' }}>
                                            <button onClick={() => setGuideOpen(guideOpen === section.id ? null : section.id)} style={{
                                                width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                                                background: guideOpen === section.id ? `${section.color}10` : 'rgba(0,0,0,0.15)',
                                                border: 'none', cursor: 'pointer', transition: 'all 0.3s',
                                            }}>
                                                <span style={{ fontSize: 18 }}>{section.icon}</span>
                                                <span style={{ fontSize: 13, fontWeight: 800, color: guideOpen === section.id ? section.color : '#fff', flex: 1, textAlign: 'left' }}>{section.title}</span>
                                                <span style={{ color: '#64748b', fontSize: 16, transition: 'transform 0.3s', transform: guideOpen === section.id ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                                            </button>
                                            <div style={{
                                                maxHeight: guideOpen === section.id ? 1200 : 0,
                                                overflow: 'hidden', transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                background: 'rgba(0,0,0,0.1)',
                                            }}>
                                                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                    {section.items.map((item, ii) => (
                                                        <div key={ii} style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                            <div style={{ fontSize: 12, fontWeight: 700, color: section.color, marginBottom: 6 }}>{item.q}</div>
                                                            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.7, fontWeight: 500 }}>{item.a}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* REFERANSLAR SECTION */}
                    {activeSection === 'referanslar' && (
                        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
                            {/* Gallery Lamp */}
                            <div className="gallery-lamp-svg" style={{ animation: 'lampSlideDown 1s cubic-bezier(0.22, 0.61, 0.36, 1) 0s both' }}>
                                <svg width="500" height="52" viewBox="0 0 500 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <linearGradient id="glBarMetalF" x1="0" y1="30" x2="0" y2="44" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#4a4a4a" /><stop offset="25%" stopColor="#2a2a2a" /><stop offset="50%" stopColor="#1a1a1a" /><stop offset="75%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#3a3a3a" />
                                        </linearGradient>
                                        <linearGradient id="glMountPlateF" x1="250" y1="0" x2="250" y2="14" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#1a1a1a" />
                                        </linearGradient>
                                        <linearGradient id="glArmMetalF" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#333" /><stop offset="100%" stopColor="#2a2a2a" />
                                        </linearGradient>
                                        <linearGradient id="glLightSpreadF" x1="250" y1="44" x2="250" y2="52" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#ffd080" stopOpacity="0.6" /><stop offset="100%" stopColor="#ffc864" stopOpacity="0" />
                                        </linearGradient>
                                        <linearGradient id="glLedStripF" x1="70" y1="43" x2="430" y2="43" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#ffcc66" stopOpacity="0" /><stop offset="15%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="50%" stopColor="#fff0cc" stopOpacity="1" /><stop offset="85%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="100%" stopColor="#ffcc66" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M78 44 L50 52 L450 52 L422 44 Z" fill="url(#glLightSpreadF)" opacity="0.5" />
                                    <rect x="235" y="0" width="30" height="10" rx="2" fill="url(#glMountPlateF)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                                    <rect x="238" y="1" width="24" height="1.5" rx="0.75" fill="white" fillOpacity="0.1" />
                                    <line x1="242" y1="10" x2="205" y2="30" stroke="url(#glArmMetalF)" strokeWidth="3" strokeLinecap="round" />
                                    <line x1="242.5" y1="10.5" x2="205.8" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                    <line x1="258" y1="10" x2="295" y2="30" stroke="url(#glArmMetalF)" strokeWidth="3" strokeLinecap="round" />
                                    <line x1="257.5" y1="10.5" x2="294.2" y2="30" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                                    <rect x="60" y="30" width="380" height="14" rx="7" fill="url(#glBarMetalF)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
                                    <rect x="70" y="32" width="360" height="2" rx="1" fill="white" fillOpacity="0.12" />
                                    <rect x="70" y="42" width="360" height="1" rx="0.5" fill="white" fillOpacity="0.04" />
                                    <rect x="67" y="43.5" width="366" height="1.5" rx="0.75" fill="url(#glLedStripF)" />
                                    <circle cx="205" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="205" cy="34" r="1" fill="#555" />
                                    <circle cx="295" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="295" cy="34" r="1" fill="#555" />
                                </svg>
                                <div className="gallery-lamp-glow" style={{ width: 450 }}></div>
                            </div>
                            <div className="glossy-panel" style={{ padding: '28px 32px', animation: 'cardDropDown 0.8s cubic-bezier(0.22, 0.61, 0.36, 1) 0.6s both', transformOrigin: 'top center' }}>
                                {/* Başlık */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 14,
                                        background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 6px 16px rgba(167,139,250,0.25), inset 0 1px 1px rgba(255,255,255,0.4)',
                                    }}>
                                        <Users style={{ width: 20, height: 20, color: '#fff' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)', margin: 0 }}>Referanslarımız</h2>
                                        <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, margin: 0 }}>SopranoChat altyapısını kullanan müşterilerimiz.</p>
                                    </div>
                                </div>

                                {/* Açıklama */}
                                <div style={{ textAlign: 'center', padding: '16px', marginBottom: 20, borderRadius: 12, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)' }}>
                                    <div style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 600, marginBottom: 4 }}>🌐 White Label & Domain Müşterilerimiz</div>
                                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>Kendi domainleriyle SopranoChat altyapısını kullanan kurumsal müşterilerimiz aşağıda listelenmiştir.</div>
                                </div>

                                {/* Referans Kartları */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                    {[
                                        { name: 'Yakında Eklenecek', domain: 'örnek-domain.com', desc: 'İlk referans müşterimiz burada görünecek', color: '#38bdf8', icon: '🌐' },
                                        { name: 'Yakında Eklenecek', domain: 'örnek-domain.com', desc: 'İlk referans müşterimiz burada görünecek', color: '#a78bfa', icon: '🌐' },
                                        { name: 'Yakında Eklenecek', domain: 'örnek-domain.com', desc: 'İlk referans müşterimiz burada görünecek', color: '#fbbf24', icon: '🌐' },
                                        { name: 'Yakında Eklenecek', domain: 'örnek-domain.com', desc: 'İlk referans müşterimiz burada görünecek', color: '#34d399', icon: '🌐' },
                                    ].map((ref, i) => (
                                        <div key={i} style={{
                                            padding: '18px 16px', borderRadius: 12,
                                            background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.06)',
                                            display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.3s',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{
                                                    width: 36, height: 36, borderRadius: 10,
                                                    background: `linear-gradient(135deg, ${ref.color}20, ${ref.color}08)`,
                                                    border: `1px solid ${ref.color}25`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 18,
                                                }}>{ref.icon}</div>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{ref.name}</div>
                                                    <div style={{ fontSize: 10, color: ref.color, fontWeight: 600 }}>{ref.domain}</div>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500, lineHeight: 1.6 }}>{ref.desc}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Alt bilgi */}
                                <div style={{ textAlign: 'center', padding: '12px 16px', borderRadius: 10, background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.1)' }}>
                                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                                        Siz de <span style={{ color: '#34d399', fontWeight: 700 }}>SopranoChat altyapısı</span> ile kendi markanızı oluşturun. <span style={{ color: '#38bdf8', fontWeight: 700, cursor: 'pointer' }} onClick={() => { setActiveSection('iletisim'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>İletişime geçin →</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <footer style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 8, textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}>
                        &copy; 2026 SopranoChat Systems.
                        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 32 }}>
                            <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}>Kurallar</a>
                            <a href="#" style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.2s' }}>Gizlilik Sözleşmesi</a>
                        </div>
                    </footer>
                </main>
            </div>

            {/* CHECKOUT MODAL */}
            {showCheckout && checkoutPlan && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.4s ease',
                }} onClick={(e) => { if (e.target === e.currentTarget) setShowCheckout(false); }}>
                    <div className="glossy-panel modal-scrollbar" style={{
                        width: '100%', maxWidth: 460, maxHeight: '85vh', overflowY: 'auto',
                        borderRadius: 18, position: 'relative',
                        border: '1px solid rgba(251,191,36,0.15)',
                        boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(251,191,36,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
                        padding: 0,
                    }}>
                        {/* Golden Header Bar */}
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.05))',
                            borderBottom: '1px solid rgba(251,191,36,0.12)',
                            padding: '14px 22px', borderRadius: '18px 18px 0 0',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div>
                                <div style={{ fontSize: 8, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>⭐ Sipariş Özeti</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                    <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                        {chkBilling === 'yearly'
                                            ? `${(checkoutPlan.price * 10).toLocaleString('tr-TR')} ₺`
                                            : `${checkoutPlan.price.toLocaleString('tr-TR')} ₺`}
                                    </span>
                                    <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700 }}>{chkBilling === 'yearly' ? '/yıl' : checkoutPlan.period}</span>
                                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>• {checkoutPlan.name}</span>
                                </div>
                            </div>
                            <button onClick={() => setShowCheckout(false)} style={{
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#94a3b8', cursor: 'pointer', transition: 'all 0.2s',
                            }}><X style={{ width: 14, height: 14 }} /></button>
                        </div>

                        <div style={{ padding: '16px 22px' }}>
                            {/* Aylık / Yıllık Toggle */}
                            <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <button onClick={() => setChkBilling('monthly')} style={{
                                    flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 11, fontWeight: 800, cursor: 'pointer', border: 'none',
                                    background: chkBilling === 'monthly' ? 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(56,189,248,0.1))' : 'transparent',
                                    color: chkBilling === 'monthly' ? '#38bdf8' : '#64748b',
                                    boxShadow: chkBilling === 'monthly' ? '0 2px 8px rgba(56,189,248,0.15)' : 'none',
                                    transition: 'all 0.3s',
                                }}>💳 Aylık Ödeme</button>
                                <button onClick={() => setChkBilling('yearly')} style={{
                                    flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 11, fontWeight: 800, cursor: 'pointer', border: 'none',
                                    background: chkBilling === 'yearly' ? 'linear-gradient(135deg, rgba(52,211,153,0.25), rgba(52,211,153,0.1))' : 'transparent',
                                    color: chkBilling === 'yearly' ? '#34d399' : '#64748b',
                                    boxShadow: chkBilling === 'yearly' ? '0 2px 8px rgba(52,211,153,0.15)' : 'none',
                                    transition: 'all 0.3s',
                                }}>🎁 Yıllık <span style={{ fontSize: 8, color: '#ef4444', fontWeight: 900, background: 'rgba(239,68,68,0.15)', padding: '2px 6px', borderRadius: 4, marginLeft: 4 }}>2 AY HEDİYE</span></button>
                            </div>

                            {/* Kişisel Bilgiler Section */}
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <User style={{ width: 11, height: 11 }} /> Kişisel Bilgiler
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {[
                                        { label: 'Ad Soyad', value: chkName, setter: setChkName, type: 'text', placeholder: 'Ahmet Yılmaz', icon: '👤' },
                                        { label: 'E-Posta', value: chkEmail, setter: setChkEmail, type: 'email', placeholder: 'ornek@mail.com', icon: '📧' },
                                        { label: 'Telefon', value: chkPhone, setter: setChkPhone, type: 'tel', placeholder: '0532 xxx xx xx', icon: '📱' },
                                    ].map((field, i) => (
                                        <div key={i} style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13 }}>{field.icon}</span>
                                            <input
                                                type={field.type} value={field.value} onChange={e => field.setter(e.target.value)}
                                                placeholder={field.placeholder}
                                                style={{
                                                    width: '100%', padding: '10px 12px 10px 32px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff',
                                                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)',
                                                    outline: 'none', transition: 'border-color 0.3s, box-shadow 0.3s',
                                                }}
                                                onFocus={e => { e.target.style.borderColor = 'rgba(56,189,248,0.4)'; e.target.style.boxShadow = '0 0 12px rgba(56,189,248,0.1)'; }}
                                                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Logo Upload */}
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Upload style={{ width: 11, height: 11 }} /> Müşteri Logosu
                                </div>
                                <label style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                    padding: '12px', borderRadius: 12, cursor: 'pointer',
                                    background: chkLogo ? 'rgba(52,211,153,0.06)' : 'rgba(0,0,0,0.2)',
                                    border: `1.5px dashed ${chkLogo ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                    color: chkLogo ? '#34d399' : '#64748b', fontSize: 13, fontWeight: 700,
                                    transition: 'all 0.3s',
                                }}>
                                    {chkLogo ? <Check style={{ width: 16, height: 16 }} /> : <Upload style={{ width: 16, height: 16 }} />}
                                    {chkLogo ? chkLogo.name : 'Logo Yükle (.png, .jpg)'}
                                    <input type="file" accept="image/*" onChange={e => setChkLogo(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                                </label>
                            </div>

                            {/* Hosting Tercihi */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 9, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Globe style={{ width: 11, height: 11 }} /> Hosting Tercihiniz
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    {[
                                        { key: 'soprano' as const, label: 'SopranoChat', sub: 'sopranochat.com üzerinden', color: '#38bdf8', icon: '🎙️' },
                                        { key: 'own' as const, label: 'Kendi Domainin', sub: 'Embed ile kendi siten', color: '#a78bfa', icon: '🌐' },
                                    ].map(opt => (
                                        <div key={opt.key} onClick={() => setChkHosting(opt.key)} style={{
                                            flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer',
                                            background: chkHosting === opt.key ? `linear-gradient(135deg, ${opt.color}11, ${opt.color}06)` : 'rgba(0,0,0,0.15)',
                                            border: `1.5px solid ${chkHosting === opt.key ? opt.color + '55' : 'rgba(255,255,255,0.06)'}`,
                                            transition: 'all 0.3s',
                                            boxShadow: chkHosting === opt.key ? `0 4px 16px ${opt.color}15` : 'none',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                                <div style={{
                                                    width: 20, height: 20, borderRadius: '50%',
                                                    border: `2px solid ${chkHosting === opt.key ? opt.color : '#475569'}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'all 0.3s',
                                                }}>
                                                    {chkHosting === opt.key && <div style={{ width: 10, height: 10, borderRadius: '50%', background: opt.color, boxShadow: `0 0 6px ${opt.color}` }} />}
                                                </div>
                                                <span style={{ fontSize: 13, fontWeight: 800, color: chkHosting === opt.key ? opt.color : '#94a3b8' }}>{opt.icon} {opt.label}</span>
                                            </div>
                                            <div style={{ fontSize: 10, color: '#64748b', marginLeft: 30, fontWeight: 500 }}>{opt.sub}</div>
                                        </div>
                                    ))}
                                </div>
                                {chkHosting === 'soprano' && (
                                    <div style={{ marginTop: 8 }}>
                                        <input
                                            type="text" value={chkRoomName} onChange={e => setChkRoomName(e.target.value)}
                                            placeholder="Oda Adınız"
                                            style={{
                                                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff',
                                                background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.2)',
                                                outline: 'none', transition: 'border-color 0.3s, box-shadow 0.3s',
                                            }}
                                            onFocus={e => { e.target.style.borderColor = 'rgba(56,189,248,0.5)'; e.target.style.boxShadow = '0 0 12px rgba(56,189,248,0.1)'; }}
                                            onBlur={e => { e.target.style.borderColor = 'rgba(56,189,248,0.2)'; e.target.style.boxShadow = 'none'; }}
                                        />
                                        <div style={{ fontSize: 9, color: '#64748b', marginTop: 4, fontWeight: 500 }}>🏠 sopranochat.com üzerinde odanız bu isimle oluşturulacak</div>
                                    </div>
                                )}
                                {chkHosting === 'own' && (
                                    <div style={{ marginTop: 8 }}>
                                        <input
                                            type="text" value={chkDomain} onChange={e => setChkDomain(e.target.value)}
                                            placeholder="ornek.com"
                                            style={{
                                                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff',
                                                background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)',
                                                outline: 'none', transition: 'border-color 0.3s, box-shadow 0.3s',
                                            }}
                                            onFocus={e => { e.target.style.borderColor = 'rgba(167,139,250,0.5)'; e.target.style.boxShadow = '0 0 12px rgba(167,139,250,0.1)'; }}
                                            onBlur={e => { e.target.style.borderColor = 'rgba(167,139,250,0.2)'; e.target.style.boxShadow = 'none'; }}
                                        />
                                        <div style={{ fontSize: 9, color: '#64748b', marginTop: 4, fontWeight: 500 }}>🔗 Embed kodunu bu domain için oluşturacağız</div>
                                    </div>
                                )}
                            </div>

                            {/* Ödeme Bilgileri Decorative Divider */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent)' }} />
                                <span style={{ fontSize: 8, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 2 }}>💰 Ödeme Bilgileri</span>
                                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent)' }} />
                            </div>

                            {/* IBAN Card */}
                            <div style={{
                                background: 'linear-gradient(145deg, rgba(0,0,0,0.3), rgba(0,0,0,0.15))',
                                borderRadius: 14, padding: '14px 16px',
                                border: '1px solid rgba(251,191,36,0.1)',
                                marginBottom: 10,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                    <div style={{
                                        width: 28, height: 28, borderRadius: 8,
                                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 15, fontWeight: 900, color: '#fff',
                                        boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
                                    }}>A</div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>AKBANK</div>
                                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>SopranoChat Bilişim</div>
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '12px 16px', borderRadius: 12,
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 2.5, fontFamily: 'monospace' }}>TR78 0004 6006 1388 8000 0123 45</span>
                                    <button onClick={() => copyToClipboard('TR78000460061388800001234 5', 'iban')} style={{
                                        background: chkCopied === 'iban' ? 'rgba(52,211,153,0.15)' : 'rgba(56,189,248,0.1)',
                                        border: `1px solid ${chkCopied === 'iban' ? 'rgba(52,211,153,0.3)' : 'rgba(56,189,248,0.25)'}`,
                                        borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                                        color: chkCopied === 'iban' ? '#34d399' : '#38bdf8',
                                        display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700,
                                        transition: 'all 0.2s',
                                    }}>
                                        {chkCopied === 'iban' ? <><Check style={{ width: 12, height: 12 }} /> Kopyalandı</> : <><Copy style={{ width: 12, height: 12 }} /> Kopyala</>}
                                    </button>
                                </div>
                            </div>

                            {/* Ödeme Kodu Card */}
                            <div style={{
                                background: 'linear-gradient(145deg, rgba(56,189,248,0.06), rgba(56,189,248,0.02))',
                                borderRadius: 14, padding: '12px 16px',
                                border: '1px solid rgba(56,189,248,0.12)',
                                marginBottom: 16,
                            }}>
                                <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>📋 Ödeme Kodu (Açıklamaya Yazılacak)</div>
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '14px 16px', borderRadius: 12,
                                    background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(56,189,248,0.15)',
                                }}>
                                    <span style={{ fontSize: 18, fontWeight: 900, color: '#38bdf8', letterSpacing: 4, fontFamily: 'monospace', textShadow: '0 0 10px rgba(56,189,248,0.3)' }}>{chkPaymentCode}</span>
                                    <button onClick={() => copyToClipboard(chkPaymentCode, 'code')} style={{
                                        background: chkCopied === 'code' ? 'rgba(52,211,153,0.15)' : 'rgba(56,189,248,0.1)',
                                        border: `1px solid ${chkCopied === 'code' ? 'rgba(52,211,153,0.3)' : 'rgba(56,189,248,0.25)'}`,
                                        borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                                        color: chkCopied === 'code' ? '#34d399' : '#38bdf8',
                                        display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700,
                                        transition: 'all 0.2s',
                                    }}>
                                        {chkCopied === 'code' ? <><Check style={{ width: 12, height: 12 }} /> Kopyalandı</> : <><Copy style={{ width: 12, height: 12 }} /> Kopyala</>}
                                    </button>
                                </div>
                            </div>

                            {/* Ödemeyi Tamamla Butonu */}
                            <button className="btn-3d btn-3d-gold" style={{
                                width: '100%', padding: '13px 0', fontSize: 13, fontWeight: 900, borderRadius: 12,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                letterSpacing: 0.5, textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                            }}>
                                Ödemeyi Gönderdim, Tamamla <Check style={{ width: 18, height: 18 }} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}
