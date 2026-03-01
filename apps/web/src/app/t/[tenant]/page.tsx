"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, User, Lock, ArrowRight, Loader2, Eye, EyeOff, Users, Mail, UserPlus, LogIn, ChevronLeft } from 'lucide-react';
import { setAuthUser } from '@/lib/auth';
import { generateGenderAvatar } from '@/lib/avatar';
import { openChatWindow } from '@/components/ui/TitleBar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface TenantInfo {
    id: string;
    name: string;
    displayName?: string;
    slug: string;
    domain: string;
    status: string;
    logoUrl?: string;
    rooms?: { id: string; name: string; slug: string }[];
}

export default function TenantEntryPage({ params }: { params: Promise<{ tenant: string }> }) {
    const { tenant: accessCode } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();

    const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [loginMode, setLoginMode] = useState<'member' | 'guest' | 'register'>('member');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        guestName: '',
        gender: '' as '' | 'Male' | 'Female',
        regUsername: '',
        regEmail: '',
        regPassword: '',
        regGender: '' as '' | 'Male' | 'Female',
    });

    // Giriş sonrası odaya yönlendir (aynı pencerede)
    const navigateToRoom = () => {
        const firstRoom = tenantInfo?.rooms?.[0];
        const roomSlug = firstRoom?.slug || 'oda-1';
        const tenantSlug = tenantInfo?.slug || accessCode;
        router.push(`/t/${tenantSlug}/room/${roomSlug}`);
    };

    // AccessCode ile tenant bilgilerini çek
    useEffect(() => {
        let redirecting = false;
        const fetchTenantInfo = async () => {
            try {
                const res = await fetch(`${API_URL}/rooms/by-access/${accessCode}`);
                if (res.ok) {
                    const data = await res.json();
                    const info: TenantInfo = {
                        id: data.tenantId || accessCode,
                        name: data.tenantName || 'Sohbet Odası',
                        displayName: data.displayName || null,
                        slug: data.slug || accessCode,
                        domain: data.domain || '',
                        status: data.status || 'ACTIVE',
                        logoUrl: data.logoUrl || null,
                        rooms: data.rooms || [],
                    };
                    setTenantInfo(info);

                    if (info.status === 'PASSIVE' || info.status === 'SUSPENDED') {
                        setLoading(false);
                        return;
                    }

                    // GodMaster token ile doğrudan giriş (admin panelinden)
                    const godmasterToken = searchParams.get('godmaster_token');
                    const targetRoom = searchParams.get('room');
                    if (godmasterToken) {
                        redirecting = true;
                        // Token'ı localStorage'a kaydet
                        const tenantSlug = info.slug || accessCode;
                        localStorage.setItem('soprano_tenant_token', godmasterToken);
                        // Token'dan user bilgilerini decode et
                        try {
                            const payload = JSON.parse(atob(godmasterToken.split('.')[1]));
                            setAuthUser({
                                userId: payload.sub,
                                username: payload.displayName || 'GodMaster',
                                avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=godmaster`,
                                isMember: true,
                                role: 'godmaster' as any,
                            });
                        } catch { /* decode başarısız — token yine de gönderilir */ }
                        const roomSlug = targetRoom || info.rooms?.[0]?.slug || 'oda-1';
                        openChatWindow(roomSlug, tenantSlug);
                        return;
                    }

                    // GodMaster girişi (?gm=1 parametresi ile)
                    const isGodMasterEntry = searchParams.get('gm') === '1';
                    const existingToken = localStorage.getItem('soprano_tenant_token');
                    if (isGodMasterEntry && existingToken) {
                        redirecting = true;
                        const firstRoom = info.rooms?.[0];
                        const roomSlug = firstRoom?.slug || 'oda-1';
                        const tenantSlug = info.slug || accessCode;
                        openChatWindow(roomSlug, tenantSlug);
                        return;
                    }

                    localStorage.removeItem('soprano_tenant_token');
                    localStorage.removeItem('soprano_tenant_user');
                } else {
                    setNotFound(true);
                }
            } catch {
                setNotFound(true);
            } finally {
                if (!redirecting) setLoading(false);
            }
        };
        fetchTenantInfo();
    }, [accessCode]);

    useEffect(() => {
        setTermsAccepted(false);
        setError(null);
    }, [loginMode]);

    // ─── Üye girişi ──────────────────────────────────────────────────
    const handleMemberLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        setError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId: tenantInfo?.id || accessCode,
                    username: formData.email,
                    password: formData.password,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ message: 'Giriş başarısız' }));
                throw new Error(errData.message || 'Giriş başarısız');
            }

            const data = await res.json();
            localStorage.setItem('soprano_tenant_token', data.access_token);
            setAuthUser({
                userId: data.user.userId || data.user.sub || data.user.id,
                username: data.user.username || data.user.displayName || data.user.email,
                avatar: data.user.avatar || data.user.avatarUrl || generateGenderAvatar(data.user.username || data.user.displayName || formData.email, data.user.gender),
                isMember: true,
                role: (data.user.role || 'member') as any,
                gender: data.user.gender || 'Unspecified',
            });
            localStorage.setItem('soprano_user', JSON.stringify(data.user));
            localStorage.setItem('soprano_entry_url', `/t/${accessCode}`);

            // Aynı pencerede odaya yönlendir
            navigateToRoom();
        } catch (err: any) {
            setError(err.message || 'Giriş sırasında bir hata oluştu');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Misafir girişi ──────────────────────────────────────────────
    const handleGuestLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!termsAccepted) { setError('Kullanım koşullarını kabul etmeniz gerekmektedir.'); return; }
        if (!formData.gender) { setError('Lütfen cinsiyetinizi seçiniz.'); return; }
        setError(null);
        setIsSubmitting(true);

        try {
            const guestName = formData.guestName.trim();
            if (guestName.length < 2) throw new Error('İsim en az 2 karakter olmalı');

            const res = await fetch(`${API_URL}/auth/guest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: guestName,
                    tenantId: tenantInfo?.id || accessCode,
                    gender: formData.gender,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ message: 'Misafir girişi başarısız' }));
                throw new Error(errData.message || 'Misafir girişi başarısız');
            }

            const data = await res.json();
            localStorage.setItem('soprano_tenant_token', data.access_token);
            setAuthUser({
                userId: data.user.sub || data.user.userId || data.user.id,
                username: data.user.username || data.user.displayName,
                avatar: data.user.avatar || generateGenderAvatar(data.user.username || data.user.displayName || formData.guestName, formData.gender),
                isMember: false,
                role: 'guest',
                gender: formData.gender,
            });
            localStorage.setItem('soprano_user', JSON.stringify(data.user));
            localStorage.setItem('soprano_entry_url', `/t/${accessCode}`);

            // Aynı pencerede odaya yönlendir
            navigateToRoom();
        } catch (err: any) {
            setError(err.message || 'Giriş sırasında bir hata oluştu');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Üye kayıt ──────────────────────────────────────────────────
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!termsAccepted) { setError('Kullanım koşullarını kabul etmeniz gerekmektedir.'); return; }
        if (!formData.regGender) { setError('Lütfen cinsiyetinizi seçiniz.'); return; }
        setError(null);
        setIsSubmitting(true);

        try {
            const username = formData.regUsername.trim();
            if (username.length < 2) throw new Error('Kullanıcı adı en az 2 karakter olmalı');
            if (formData.regPassword.length < 4) throw new Error('Şifre en az 4 karakter olmalı');

            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    email: formData.regEmail,
                    password: formData.regPassword,
                    gender: formData.regGender,
                    tenantId: tenantInfo?.id || accessCode,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ message: 'Kayıt başarısız' }));
                throw new Error(errData.message || 'Kayıt başarısız');
            }

            const data = await res.json();
            localStorage.setItem('soprano_tenant_token', data.access_token);
            setAuthUser({
                userId: data.user.sub || data.user.userId || data.user.id,
                username: data.user.username || data.user.displayName,
                avatar: data.user.avatar || generateGenderAvatar(username, formData.regGender),
                isMember: true,
                role: (data.user.role || 'member') as any,
                gender: formData.regGender,
            });
            localStorage.setItem('soprano_user', JSON.stringify(data.user));
            localStorage.setItem('soprano_entry_url', `/t/${accessCode}`);

            // Aynı pencerede odaya yönlendir
            navigateToRoom();
        } catch (err: any) {
            setError(err.message || 'Kayıt sırasında bir hata oluştu');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Cinsiyet Seçici ─────────────────────────────────────────────
    const GenderSelector = ({ value, onChange }: { value: '' | 'Male' | 'Female'; onChange: (g: 'Male' | 'Female') => void }) => (
        <div>
            <label className="text-[11px] text-[#b8a47c] mb-2 block font-semibold tracking-wider uppercase">Cinsiyet</label>
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={() => onChange('Male')}
                    className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${value === 'Male'
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/10'
                        : 'bg-[#151b27] border-[#2a3344] text-gray-500 hover:border-[#3a4555] hover:text-gray-400'
                        }`}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="10" cy="14" r="5" />
                        <line x1="19" y1="5" x2="13.6" y2="10.4" />
                        <line x1="19" y1="5" x2="15" y2="5" />
                        <line x1="19" y1="5" x2="19" y2="9" />
                    </svg>
                    Erkek
                </button>
                <button
                    type="button"
                    onClick={() => onChange('Female')}
                    className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${value === 'Female'
                        ? 'bg-pink-500/15 border-pink-500/40 text-pink-400 shadow-lg shadow-pink-500/10'
                        : 'bg-[#151b27] border-[#2a3344] text-gray-500 hover:border-[#3a4555] hover:text-gray-400'
                        }`}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="8" r="5" />
                        <line x1="12" y1="13" x2="12" y2="21" />
                        <line x1="9" y1="18" x2="15" y2="18" />
                    </svg>
                    Kadın
                </button>
            </div>
        </div>
    );

    // ─── Kullanım Koşulları ──────────────────────────────────────────
    const TermsCheckbox = () => (
        <label className="flex items-start gap-2.5 cursor-pointer group select-none mt-1">
            <div className="relative mt-0.5 flex-shrink-0">
                <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="sr-only peer"
                />
                <div className={`w-[18px] h-[18px] rounded-md border-2 transition-all duration-200 flex items-center justify-center ${termsAccepted
                    ? 'bg-[#06b6d4] border-[#06b6d4]'
                    : 'bg-transparent border-[#2a3344] group-hover:border-[#3a4555]'
                    }`}>
                    {termsAccepted && (
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6L5 9L10 3" stroke="#0f1419" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </div>
            </div>
            <span className="text-[11px] leading-[1.45] text-gray-500 group-hover:text-gray-400 transition-colors">
                5651 sayılı İnternet Kanunu ve TCK hükümleri gereğince, bu platformda yasa dışı, hakaret içeren, kişilik haklarına saldıran veya suç teşkil eden içerik paylaşmayacağımı{' '}
                <span className="text-[#06b6d4] font-medium">kabul ve taahhüt ederim</span>.
            </span>
        </label>
    );

    // ─── Loading ─────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#06b6d4] animate-spin" />
            </div>
        );
    }

    // ─── Not Found ───────────────────────────────────────────────────
    if (notFound) {
        return (
            <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-2xl flex items-center justify-center">
                        <Shield className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">Geçersiz Bağlantı</h1>
                    <p className="text-sm text-gray-500">Bu giriş bağlantısı geçersiz veya süresi dolmuş.</p>
                </div>
            </div>
        );
    }

    // ─── Pasif Tenant ────────────────────────────────────────────────
    if (tenantInfo && (tenantInfo.status === 'PASSIVE' || tenantInfo.status === 'SUSPENDED')) {
        return (
            <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[150px] animate-pulse" />
                    <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-red-800/5 rounded-full blur-[120px]" />
                </div>
                <div className="relative z-10 text-center max-w-md">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 bg-red-500/20 rounded-3xl animate-ping" style={{ animationDuration: '2s' }} />
                        <div className="relative w-24 h-24 bg-gradient-to-br from-red-600 to-red-800 rounded-3xl flex items-center justify-center shadow-2xl shadow-red-900/40 border border-red-500/30">
                            <Shield className="w-12 h-12 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">Sistem Bakımda</h1>
                    <p className="text-gray-400 text-base leading-relaxed mb-6">
                        <span className="text-red-400 font-semibold">{tenantInfo.name}</span> şu anda bakım modundadır. Lütfen daha sonra tekrar deneyiniz.
                    </p>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5 backdrop-blur-sm">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-red-400 text-sm font-bold uppercase tracking-wider">Geçici Olarak Kapalı</span>
                        </div>
                        <p className="text-gray-500 text-xs">Sistem yöneticisi tarafından geçici olarak hizmete kapatılmıştır.</p>
                    </div>
                    <p className="mt-8 text-[11px] text-gray-700">
                        Powered by <span className="text-gray-500 font-medium">SopranoChat</span>
                    </p>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════
    // ANA GİRİŞ SAYFASI — Premium Dark Theme
    // ═══════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0f1a 0%, #0c1929 25%, #0e1f33 50%, #0c1929 75%, #0a0f1a 100%)' }}>
            {/* Arka plan glow efektleri */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full blur-[200px]" style={{ background: 'rgba(6,182,212,0.04)' }} />
                <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] rounded-full blur-[180px]" style={{ background: 'rgba(99,102,241,0.05)' }} />
            </div>

            <div className="w-full max-w-[420px] relative z-10">
                {/* ─── Logo & Başlık ─────────────────────────────────── */}
                <div className="text-center mb-8">
                    {/* Tenant logo veya varsayılan SopranoChat logosu */}
                    {tenantInfo?.logoUrl ? (
                        <div className="mx-auto mb-4 flex items-center justify-center">
                            <img
                                src={tenantInfo.logoUrl}
                                alt={tenantInfo.displayName || tenantInfo.name}
                                className="max-h-20 max-w-[200px] object-contain"
                                style={{ filter: 'drop-shadow(0 4px 12px rgba(184, 164, 124, 0.3))' }}
                            />
                        </div>
                    ) : (
                        <div className="mx-auto mb-4 flex items-center justify-center">
                            {/* ── Default CINEMATIC WORDMARK LOGO (aynı chat odasındaki) ── */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 0 0', overflow: 'visible', transform: 'scale(1.15)' }}>
                                <style>{`
                                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap');
                                @keyframes wmFlowLight { 0% { background-position: 150% 0; } 100% { background-position: -150% 0; } }
                                @keyframes wmNeonFlicker { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; transform: scale(1.02); } }
                                @keyframes wmRecPulse { 0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(0.9); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } }
                                @keyframes wmLensSweep { 0% { transform: translate(-10%, -10%) rotate(0deg); } 100% { transform: translate(10%, 10%) rotate(20deg); } }
                                @keyframes wmWaveRipple { 0% { transform: scaleY(0.3); opacity: 0; } 20% { opacity: 0.8; transform: scaleY(1.3); } 100% { transform: scaleY(0.4); opacity: 0; } }
                                @keyframes wmShimmer { 0% { background-position: 150% 0, 0 0; } 100% { background-position: -150% 0, 0 0; } }
                                `}</style>
                                {/* Grunge doku filtresi */}
                                <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                                    <filter id="grungeFilterLogin">
                                        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
                                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
                                        <feComposite in="SourceGraphic" in2="noise" operator="out" />
                                    </filter>
                                </svg>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    gap: 3,
                                }}>
                                    {/* Sol Ses Dalgaları */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexDirection: 'row-reverse', flexShrink: 0 }}>
                                        {[10, 18, 28, 20, 12].map((h, i) => (
                                            <div key={`wl${i}`} style={{
                                                width: 3, height: h, borderRadius: 10,
                                                background: 'linear-gradient(to top, #ff3344, #ff6655)',
                                                boxShadow: '0 0 8px rgba(255, 51, 68, 0.4)',
                                                opacity: 0, animation: `wmWaveRipple 3s ${i * 0.15}s infinite ease-in-out`,
                                            }} />
                                        ))}
                                    </div>

                                    {/* Wordmark Grubu */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))',
                                        flexShrink: 0,
                                    }}>
                                        {/* S */}
                                        <span style={{
                                            fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 52, lineHeight: 1,
                                            letterSpacing: '0.02em',
                                            background: 'linear-gradient(180deg, #ffffff 0%, #ff3344 50%, #cc2222 100%)',
                                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text', marginRight: -2,
                                            filter: 'url(#grungeFilterLogin) drop-shadow(0 0 8px rgba(255,51,68,0.3))',
                                        }}>S</span>

                                        {/* opran */}
                                        <span style={{
                                            fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 34, lineHeight: 1,
                                            letterSpacing: '0.02em',
                                            background: 'linear-gradient(180deg, #ffffff 0%, #ff3344 50%, #cc2222 100%)',
                                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text',
                                            filter: 'url(#grungeFilterLogin) drop-shadow(0 0 6px rgba(255,51,68,0.25))',
                                        }}>opran</span>

                                        {/* O = Kamera Lensi */}
                                        <svg viewBox="0 0 34 34" width="34" height="34" style={{ margin: '0 -1px', flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(255,51,68,0.25))', transform: 'translateY(1px)' }}>
                                            <defs>
                                                <linearGradient id="lensRingGradLogin" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
                                                    <stop offset="50%" stopColor="rgba(255,51,68,0.75)" />
                                                    <stop offset="100%" stopColor="rgba(204,34,34,0.55)" />
                                                </linearGradient>
                                                <linearGradient id="lensInnerGradLogin" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
                                                    <stop offset="50%" stopColor="rgba(255,51,68,0.55)" />
                                                    <stop offset="100%" stopColor="rgba(170,17,17,0.45)" />
                                                </linearGradient>
                                                <radialGradient id="lensGlassLogin" cx="40%" cy="30%" r="60%">
                                                    <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                                                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                                                </radialGradient>
                                            </defs>
                                            <circle cx="17" cy="17" r="15.5" fill="none" stroke="url(#lensRingGradLogin)" strokeWidth="2.5" />
                                            <circle cx="17" cy="17" r="13" fill="#120808" stroke="url(#lensInnerGradLogin)" strokeWidth="1.2" />
                                            <circle cx="17" cy="17" r="9.5" fill="#0e0505" stroke="url(#lensRingGradLogin)" strokeWidth="1.4" opacity="0.85" />
                                            <circle cx="17" cy="17" r="6" fill="#0a0303" stroke="url(#lensInnerGradLogin)" strokeWidth="1" opacity="0.75" />
                                            <circle cx="17" cy="17" r="3" fill="#1f0808" />
                                            <circle cx="13" cy="13" r="2.2" fill="rgba(255,220,220,0.22)" />
                                            <circle cx="14" cy="14" r="0.8" fill="rgba(255,255,255,0.45)" />
                                            <circle cx="17" cy="17" r="1.5" fill="#7b9fef">
                                                <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
                                                <animate attributeName="r" values="1.5;2.5;1.5" dur="2s" repeatCount="indefinite" />
                                            </circle>
                                            <ellipse cx="14" cy="12" rx="8" ry="5" fill="url(#lensGlassLogin)" />
                                            <path d="M 10 12 Q 17 8, 24 12" fill="none" stroke="rgba(255,200,200,0.08)" strokeWidth="0.6" />
                                        </svg>

                                        {/* Boşluk */}
                                        <span style={{ width: 2, flexShrink: 0 }} />

                                        {/* C */}
                                        <span style={{
                                            fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 52, lineHeight: 1,
                                            letterSpacing: '0.01em',
                                            background: 'linear-gradient(180deg, #ffffff 0%, #7b9fef 50%, #4a6bc9 100%)',
                                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text', marginRight: -2,
                                            filter: 'url(#grungeFilterLogin) drop-shadow(0 0 8px rgba(99,133,209,0.35))',
                                        }}>C</span>
                                        {/* ha */}
                                        <span style={{
                                            fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 34, lineHeight: 1,
                                            letterSpacing: '0.01em',
                                            background: 'linear-gradient(180deg, #ffffff 0%, #7b9fef 50%, #4a6bc9 100%)',
                                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                            backgroundClip: 'text',
                                            filter: 'url(#grungeFilterLogin) drop-shadow(0 0 6px rgba(99,133,209,0.3))',
                                        }}>ha</span>

                                        {/* T = Mikrofon */}
                                        <div style={{
                                            display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                                            marginLeft: 0, transform: 'translateY(-1px)', flexShrink: 0,
                                        }}>
                                            <div style={{
                                                width: 18, height: 26,
                                                background: 'linear-gradient(180deg, #555 0%, #222 50%, #111 100%)',
                                                border: '1.8px solid #7b9fef', borderRadius: 9,
                                                boxShadow: '0 0 10px rgba(99,133,209,0.45), inset 0 1px 0 rgba(255,255,255,0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    width: '100%', height: '100%',
                                                    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                                                    backgroundSize: '3px 3px',
                                                }} />
                                            </div>
                                            <div style={{
                                                width: 22, height: 3, marginTop: -1,
                                                background: 'linear-gradient(to bottom, #7b9fef, #2a3d6b)',
                                                borderRadius: 2,
                                            }} />
                                            <div style={{
                                                width: 3, height: 18,
                                                background: 'linear-gradient(to bottom, #444, #222, #111)',
                                                borderRadius: 2,
                                                border: '0.5px solid rgba(123,159,239,0.5)',
                                                boxShadow: '0 0 5px rgba(123,159,239,0.35)',
                                            }} />
                                        </div>
                                    </div>

                                    {/* Sağ Ses Dalgaları */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                                        {[8, 16, 28, 22, 14].map((h, i) => (
                                            <div key={`wr${i}`} style={{
                                                width: 3, height: h, borderRadius: 10,
                                                background: 'linear-gradient(to top, #7b9fef, #a3bfff)',
                                                boxShadow: '0 0 8px rgba(123,159,239,0.5)',
                                                opacity: 0, animation: `wmWaveRipple 3s ${i * 0.15}s infinite ease-in-out`,
                                            }} />
                                        ))}
                                    </div>
                                </div>

                                {/* Slogan */}
                                <span style={{
                                    fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 10, lineHeight: 1,
                                    letterSpacing: '0.3em', textTransform: 'uppercase' as const,
                                    background: 'linear-gradient(180deg, #e0e0e0 0%, #7b9fef 50%, #4a6bc9 100%)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text', marginTop: 4,
                                    filter: 'drop-shadow(0 0 6px rgba(123,159,239,0.5))',
                                }}>
                                    Senin Sesin
                                </span>
                            </div>
                        </div>
                    )}
                    {tenantInfo?.displayName && (
                        <h1 className="text-2xl font-extrabold text-white tracking-tight mb-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            <span style={{ color: '#cc2222' }}>{tenantInfo.displayName}</span>
                        </h1>
                    )}
                    <h2 className="text-lg font-bold text-white mb-1">Sisteme Giriş Yap</h2>
                    <p className="text-sm text-gray-500">Premium sohbete katılmak için devam et</p>
                </div>

                {/* ─── Ana Kart ───────────────────────────────────────── */}
                <div className="rounded-2xl border shadow-2xl backdrop-blur-sm" style={{ background: 'linear-gradient(180deg, rgba(15,25,41,0.95) 0%, rgba(10,15,26,0.98) 100%)', borderColor: 'rgba(6,182,212,0.15)', boxShadow: '0 25px 60px -12px rgba(6,182,212,0.15), 0 0 0 1px rgba(6,182,212,0.05)' }}>

                    {/* Sekme Başlıkları */}
                    <div className="flex border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <button
                            onClick={() => setLoginMode('member')}
                            className={`flex-1 py-4 text-xs font-bold tracking-widest uppercase transition-all duration-200 relative ${loginMode === 'member' || loginMode === 'register'
                                ? 'text-[#06b6d4]'
                                : 'text-gray-600 hover:text-gray-400'
                                }`}
                        >
                            ÜYE GİRİŞİ
                            {(loginMode === 'member' || loginMode === 'register') && (
                                <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #06b6d4, transparent)' }} />
                            )}
                        </button>
                        <button
                            onClick={() => setLoginMode('guest')}
                            className={`flex-1 py-4 text-xs font-bold tracking-widest uppercase transition-all duration-200 relative ${loginMode === 'guest'
                                ? 'text-[#06b6d4]'
                                : 'text-gray-600 hover:text-gray-400'
                                }`}
                        >
                            MİSAFİR KATILIMI
                            {loginMode === 'guest' && (
                                <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #06b6d4, transparent)' }} />
                            )}
                        </button>
                    </div>

                    {/* Form İçeriği */}
                    <div className="p-6 pt-5">

                        {/* Hata Mesajı */}
                        {error && (
                            <div className="mb-4 p-3 rounded-xl text-red-400 text-sm text-center" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                                {error}
                            </div>
                        )}

                        {/* ═══ ÜYE GİRİŞİ ═══ */}
                        {loginMode === 'member' && (
                            <form onSubmit={handleMemberLogin} className="space-y-4">
                                <div>
                                    <label className="text-[11px] text-[#06b6d4] mb-2 block font-semibold tracking-wider uppercase">Kullanıcı Adı veya E-Posta</label>
                                    <div className="relative">
                                        <User className="w-4 h-4 text-gray-600 absolute left-4 top-3.5" />
                                        <input
                                            type="text"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="kullanıcı adı veya e-posta"
                                            className="w-full rounded-xl pl-11 pr-4 py-3.5 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                                            style={{ background: '#151b27', border: '1px solid #2a3344' }}
                                            onFocus={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.45)'}
                                            onBlur={(e) => e.target.style.borderColor = '#2a3344'}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[11px] text-[#06b6d4] font-semibold tracking-wider uppercase">Şifre</label>
                                        <button type="button" className="text-[11px] text-[#06b6d4] hover:text-[#67e8f9] font-semibold transition-colors">Şifremi Unuttum?</button>
                                    </div>
                                    <div className="relative">
                                        <Lock className="w-4 h-4 text-gray-600 absolute left-4 top-3.5" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="••••••••"
                                            className="w-full rounded-xl pl-11 pr-12 py-3.5 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                                            style={{ background: '#151b27', border: '1px solid #2a3344' }}
                                            onFocus={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.45)'}
                                            onBlur={(e) => e.target.style.borderColor = '#2a3344'}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-3.5 text-gray-600 hover:text-gray-400 transition"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Beni Hatırla */}
                                <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                                    <div className="relative flex-shrink-0">
                                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="sr-only" />
                                        <div className={`w-[16px] h-[16px] rounded border-2 transition-all duration-200 flex items-center justify-center ${rememberMe
                                            ? 'bg-[#06b6d4] border-[#06b6d4]'
                                            : 'bg-transparent border-[#2a3344] group-hover:border-[#3a4555]'
                                            }`}>
                                            {rememberMe && (
                                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="#0f1419" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors">Beni Hatırla</span>
                                </label>



                                {/* Giriş Butonu */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                                    style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#fff', boxShadow: '0 8px 24px rgba(6, 182, 212, 0.3)' }}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>GİRİŞ YAP <LogIn className="w-4 h-4" /></>
                                    )}
                                </button>



                                {/* Alt Linkler */}
                                <div className="text-center pt-1">
                                    <span className="text-xs text-gray-600">Hesabınız yok mu? </span>
                                    <button type="button" onClick={() => setLoginMode('register')} className="text-xs font-bold text-[#06b6d4] hover:text-[#67e8f9] transition-colors">
                                        Yeni Hesap Oluştur
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* ═══ MİSAFİR GİRİŞİ ═══ */}
                        {loginMode === 'guest' && (
                            <form onSubmit={handleGuestLogin} className="space-y-4">
                                <div>
                                    <label className="text-[11px] text-[#06b6d4] mb-2 block font-semibold tracking-wider uppercase">Takma Adınız</label>
                                    <div className="relative">
                                        <User className="w-4 h-4 text-gray-600 absolute left-4 top-3.5" />
                                        <input
                                            type="text"
                                            value={formData.guestName}
                                            onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                                            placeholder="Bir isim girin"
                                            className="w-full rounded-xl pl-11 pr-4 py-3.5 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                                            style={{ background: '#0a0a1a', border: '1px solid #2a2a3a' }}
                                            onFocus={(e) => e.target.style.borderColor = 'rgba(184, 164, 124, 0.4)'}
                                            onBlur={(e) => e.target.style.borderColor = '#2a2a3a'}
                                            maxLength={24}
                                            required
                                        />
                                    </div>
                                </div>

                                <GenderSelector value={formData.gender} onChange={(g) => setFormData({ ...formData, gender: g })} />
                                <TermsCheckbox />

                                <button
                                    type="submit"
                                    disabled={isSubmitting || formData.guestName.trim().length < 2 || !formData.gender || !termsAccepted}
                                    className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                                    style={{ background: 'linear-gradient(135deg, #cc2222, #991111)', color: '#fff', boxShadow: '0 8px 24px rgba(204, 34, 34, 0.3)' }}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>MİSAFİR OLARAK GİR <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* ═══ KAYIT FORMU ═══ */}
                        {loginMode === 'register' && (
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div>
                                    <label className="text-[11px] text-[#06b6d4] mb-2 block font-semibold tracking-wider uppercase">Kullanıcı Adı</label>
                                    <div className="relative">
                                        <User className="w-4 h-4 text-gray-600 absolute left-4 top-3.5" />
                                        <input
                                            type="text"
                                            value={formData.regUsername}
                                            onChange={(e) => setFormData({ ...formData, regUsername: e.target.value })}
                                            placeholder="Kullanıcı adınız"
                                            className="w-full rounded-xl pl-11 pr-4 py-3.5 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                                            style={{ background: '#0a0a1a', border: '1px solid #2a2a3a' }}
                                            onFocus={(e) => e.target.style.borderColor = 'rgba(184, 164, 124, 0.4)'}
                                            onBlur={(e) => e.target.style.borderColor = '#2a2a3a'}
                                            maxLength={24}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] text-[#06b6d4] mb-2 block font-semibold tracking-wider uppercase">E-Posta Adresi</label>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 text-gray-600 absolute left-4 top-3.5" />
                                        <input
                                            type="email"
                                            value={formData.regEmail}
                                            onChange={(e) => setFormData({ ...formData, regEmail: e.target.value })}
                                            placeholder="mail@ornek.com"
                                            className="w-full rounded-xl pl-11 pr-4 py-3.5 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                                            style={{ background: '#0a0a1a', border: '1px solid #2a2a3a' }}
                                            onFocus={(e) => e.target.style.borderColor = 'rgba(184, 164, 124, 0.4)'}
                                            onBlur={(e) => e.target.style.borderColor = '#2a2a3a'}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] text-[#06b6d4] mb-2 block font-semibold tracking-wider uppercase">Şifre</label>
                                    <div className="relative">
                                        <Lock className="w-4 h-4 text-gray-600 absolute left-4 top-3.5" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={formData.regPassword}
                                            onChange={(e) => setFormData({ ...formData, regPassword: e.target.value })}
                                            placeholder="En az 4 karakter"
                                            className="w-full rounded-xl pl-11 pr-12 py-3.5 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                                            style={{ background: '#0a0a1a', border: '1px solid #2a2a3a' }}
                                            onFocus={(e) => e.target.style.borderColor = 'rgba(184, 164, 124, 0.4)'}
                                            onBlur={(e) => e.target.style.borderColor = '#2a2a3a'}
                                            minLength={4}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-3.5 text-gray-600 hover:text-gray-400 transition"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <GenderSelector value={formData.regGender} onChange={(g) => setFormData({ ...formData, regGender: g })} />
                                <TermsCheckbox />

                                <button
                                    type="submit"
                                    disabled={isSubmitting || formData.regUsername.trim().length < 2 || !formData.regGender || !termsAccepted}
                                    className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                                    style={{ background: 'linear-gradient(135deg, #cc2222, #991111)', color: '#fff', boxShadow: '0 8px 24px rgba(204, 34, 34, 0.3)' }}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>ÜYE OL VE GİRİŞ YAP <UserPlus className="w-4 h-4" /></>
                                    )}
                                </button>

                                <div className="text-center pt-1">
                                    <span className="text-xs text-gray-600">Zaten üye misin? </span>
                                    <button type="button" onClick={() => setLoginMode('member')} className="text-xs font-bold text-[#06b6d4] hover:text-[#67e8f9] transition-colors">
                                        Giriş Yap
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Ana Sayfaya Dön */}
                <div className="text-center mt-5">
                    <button
                        onClick={() => router.push('/')}
                        className="text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Ana Sayfaya Dön
                    </button>
                </div>

                {/* Footer */}
                <p className="text-center text-[11px] text-gray-700 mt-4">
                    Powered by <span className="font-medium" style={{ color: '#06b6d4' }}>SopranoChat</span>
                </p>
            </div>
        </div>
    );
}
