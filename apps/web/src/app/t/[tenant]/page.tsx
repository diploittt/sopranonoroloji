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
                                avatar: generateGenderAvatar('godmaster'),
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
    // ANA GİRİŞ SAYFASI — Homepage Hesap Paneli Login Ekranı Klonu
    // ═══════════════════════════════════════════════════════════════════
    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
                body { margin: 0; padding: 0; }
                .login-wall {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(180deg, #9ca3cc 0%, #adb5d8 30%, #c5cce8 60%, #dde3f3 100%);

                    font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
                    padding: 40px 20px;
                }
                .login-frame {
                    background-color: #7a7e9e;
                    border: 16px solid rgba(255,255,255,0.88);
                    box-shadow:
                        0 0 30px rgba(0,0,0,0.2),
                        0 0 60px rgba(0,0,0,0.08),
                        -4px 0 15px rgba(0,0,0,0.12),
                        4px 0 15px rgba(0,0,0,0.12);
                    width: 100%;
                    max-width: 520px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    position: relative;
                    padding: 0 20px 36px;
                    overflow: hidden;
                }
                .glossy-panel {
                    background:
                        radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%),
                        linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%),
                        linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.55) 100%);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-top: 1px solid rgba(255,255,255,0.35);
                    border-left: 1px solid rgba(255,255,255,0.2);
                    box-shadow:
                        0 8px 32px rgba(0,0,0,0.4),
                        0 2px 8px rgba(0,0,0,0.3),
                        inset 0 1px 0 rgba(255,255,255,0.06);
                    border-radius: 22px;
                    overflow: hidden;
                }
                .gallery-lamp-glow {
                    position: relative;
                    width: 300px;
                    height: 90px;
                    background: radial-gradient(ellipse at top center, rgba(255,210,120,0.22) 0%, rgba(255,180,80,0.08) 40%, transparent 70%);
                    pointer-events: none;
                    border-radius: 0 0 50% 50%;
                    filter: blur(8px);
                    z-index: 1;
                    margin-top: -10px;
                }
                .input-inset { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-top: 1px solid rgba(0,0,0,0.4); box-shadow: inset 0 3px 6px rgba(0,0,0,0.3); border-radius: 10px; color: #fff; transition: all 0.2s ease; font-family: inherit; }
                .input-inset:focus { outline: none; background: rgba(0,0,0,0.3); border-color: #38bdf8; box-shadow: inset 0 3px 6px rgba(0,0,0,0.4), 0 0 10px rgba(56, 189, 248, 0.2); }
                .input-inset::placeholder { color: rgba(255,255,255,0.3); }
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
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    transition: all 0.3s ease;
                    overflow: hidden;
                    font-family: inherit;
                }
                .btn-3d-blue { background: linear-gradient(180deg, rgba(56,189,248,0.25) 0%, rgba(2,132,199,0.35) 100%); color: #bae6fd; box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05); }
                .btn-3d-blue:hover { background: linear-gradient(180deg, rgba(56,189,248,0.35) 0%, rgba(2,132,199,0.45) 100%); box-shadow: 0 6px 24px rgba(56,189,248,0.2), inset 0 1px 0 rgba(255,255,255,0.2); transform: translateY(-1px); }
                .btn-3d-blue:active { transform: translateY(1px); }
                .btn-3d-blue:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
                .btn-3d-red { background: linear-gradient(180deg, rgba(220,38,38,0.3) 0%, rgba(153,27,27,0.45) 100%); color: #fca5a5; box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 12px rgba(220,38,38,0.15), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.04); }
                .btn-3d-red:hover { background: linear-gradient(180deg, rgba(220,38,38,0.4) 0%, rgba(153,27,27,0.55) 100%); box-shadow: 0 6px 24px rgba(220,38,38,0.25), 0 0 18px rgba(220,38,38,0.2); transform: translateY(-1px); }
                .btn-3d-red:active { transform: translateY(1px); }
                .btn-3d-red:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
                .btn-3d-green { background: linear-gradient(180deg, rgba(52,211,153,0.25) 0%, rgba(5,150,105,0.35) 100%); color: #a7f3d0; box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05); }
                .btn-3d-green:hover { background: linear-gradient(180deg, rgba(52,211,153,0.35) 0%, rgba(5,150,105,0.45) 100%); transform: translateY(-1px); }
                .btn-3d-green:active { transform: translateY(1px); }
                .btn-3d-green:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
                .retro-logo-text {
                    font-family: 'Cooper Black', 'Arial Rounded MT Bold', serif;
                    font-weight: 900;
                    letter-spacing: 0.5px;
                    transform: scaleY(1.05);
                    display: inline-flex;
                    gap: 0px;
                    position: relative;
                    font-size: 44px;
                    line-height: 1;
                }
                .retro-logo-soprano {
                    font-size: 44px;
                    background: linear-gradient(180deg, #ffffff 0%, #dde4ee 35%, #b8c2d4 70%, #ccd4e4 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)) drop-shadow(1px 1px 0 rgba(0,0,0,0.4));
                }
                .retro-logo-chat {
                    font-size: 44px;
                    background: linear-gradient(180deg, #b8f0f0 0%, #5ec8c8 30%, #3a9e9e 65%, #4db0a8 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6)) drop-shadow(1px 1px 0 rgba(20,80,70,0.5));
                    animation: logoGlow 3s ease-in-out infinite;
                }
                @keyframes logoGlow {
                    0%, 100% { filter: drop-shadow(0 0 2px rgba(120,200,200,0)) drop-shadow(0 2px 4px rgba(0,0,0,0.6)); }
                    50% { filter: drop-shadow(0 0 8px rgba(120,200,200,0.3)) drop-shadow(0 0 20px rgba(120,200,200,0.1)) drop-shadow(0 2px 4px rgba(0,0,0,0.6)); }
                }
                @keyframes lampSlideDown {
                    0% { opacity: 0; transform: translateY(-100%); }
                    40% { opacity: 1; }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes glowLightUp {
                    0% { opacity: 0; transform: scale(0.7); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>

            <div className="login-wall">
                <div className="login-frame">

                    {/* ═══ Galeri Lambası — Çerçeve üst border'unun altından sarkan ═══ */}
                    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -14, marginBottom: 0, zIndex: 3, animation: 'lampSlideDown 1.2s cubic-bezier(0.22, 0.61, 0.36, 1) 0.3s both' }}>
                        <svg width="300" height="52" viewBox="0 0 300 52" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}>
                            <defs>
                                <linearGradient id="glBarMetal" x1="0" y1="30" x2="0" y2="44" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor="#4a4a4a" /><stop offset="25%" stopColor="#2a2a2a" /><stop offset="50%" stopColor="#1a1a1a" /><stop offset="75%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#3a3a3a" />
                                </linearGradient>
                                <linearGradient id="glMountPlate" x1="150" y1="0" x2="150" y2="14" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#2a2a2a" /><stop offset="100%" stopColor="#1a1a1a" />
                                </linearGradient>
                                <linearGradient id="glArmMetal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#555" /><stop offset="50%" stopColor="#333" /><stop offset="100%" stopColor="#2a2a2a" />
                                </linearGradient>
                                <linearGradient id="glLightSpread" x1="150" y1="44" x2="150" y2="52" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor="#ffd080" stopOpacity="0.6" /><stop offset="100%" stopColor="#ffc864" stopOpacity="0" />
                                </linearGradient>
                                <linearGradient id="glLedStrip" x1="50" y1="43" x2="250" y2="43" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor="#ffcc66" stopOpacity="0" /><stop offset="15%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="50%" stopColor="#fff0cc" stopOpacity="1" /><stop offset="85%" stopColor="#ffe0a0" stopOpacity="0.9" /><stop offset="100%" stopColor="#ffcc66" stopOpacity="0" />
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
                            <circle cx="115" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="115" cy="34" r="1" fill="#555" />
                            <circle cx="185" cy="34" r="2.5" fill="#333" stroke="#555" strokeWidth="0.5" /><circle cx="185" cy="34" r="1" fill="#555" />
                        </svg>
                        <div style={{ width: 280, height: 110, margin: '-8px auto 0', opacity: 0, animation: 'glowLightUp 1.8s cubic-bezier(0.4,0,0.2,1) 1.5s forwards', background: 'radial-gradient(ellipse at top center, rgba(255,210,120,0.32) 0%, rgba(255,180,80,0.14) 40%, transparent 70%)', pointerEvents: 'none', borderRadius: '0 0 50% 50%', filter: 'blur(8px)', zIndex: 1 }} />
                    </div>

                    {/* ═══ Logo — Homepage sol üst ile birebir aynı ═══ */}
                    <div style={{ textAlign: 'center', marginBottom: 16, position: 'relative', zIndex: 2 }}>
                        {tenantInfo?.logoUrl ? (
                            <img src={tenantInfo.logoUrl} alt={tenantInfo.displayName || tenantInfo.name} style={{ maxHeight: 56, maxWidth: 200, objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }} />
                        ) : (
                            <h1 className="retro-logo-text" style={{ margin: 0 }}>
                                <span className="retro-logo-soprano">Soprano</span>
                                <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span className="retro-logo-chat">Chat</span>
                                    <span style={{ fontSize: 11, fontFamily: "'Cooper Black', 'Arial Rounded MT Bold', sans-serif", fontStyle: 'normal', letterSpacing: '1.5px', lineHeight: 1, marginTop: -2, background: 'linear-gradient(180deg, #ffffff 0%, #dde4ee 35%, #b8c2d4 70%, #ccd4e4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>Senin Sesin</span>
                                </span>
                            </h1>
                        )}
                        {tenantInfo?.displayName && (
                            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#334155', marginTop: 4, marginBottom: 0, letterSpacing: 0.5 }}>{tenantInfo.displayName}</h2>
                        )}
                    </div>

                    {/* ═══ Glossy Login Panel — Homepage ile birebir aynı ═══ */}
                    <div className="glossy-panel" style={{ width: 'calc(100% - 40px)', padding: '12px 14px', position: 'relative', zIndex: 2 }}>
                        {/* Üst Başlık */}
                        <h3 style={{ fontSize: 11, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 1px 2px rgba(0,0,0,0.5)', marginTop: 0 }}>
                            <User style={{ width: 18, height: 18, color: '#38bdf8' }} /> Hesap Paneli
                        </h3>

                        {/* Sekmeler — Homepage ile birebir aynı */}
                        <div style={{ display: 'flex', marginBottom: 12, borderRadius: 10, overflow: 'hidden', gap: 8 }}>
                            <button
                                onClick={() => setLoginMode('guest')}
                                style={{
                                    flex: 1, padding: '8px 0', fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                                    textTransform: 'uppercase', border: 'none', cursor: 'pointer',
                                    borderRadius: 8,
                                    background: loginMode === 'guest' ? 'linear-gradient(180deg, rgba(56,189,248,0.3), rgba(2,132,199,0.4))' : 'rgba(0,0,0,0.25)',
                                    color: loginMode === 'guest' ? '#7dd3fc' : 'rgba(255,255,255,0.35)',
                                    transition: 'all 0.3s ease',
                                    boxShadow: loginMode === 'guest' ? '0 0 16px rgba(56,189,248,0.3), 0 0 4px rgba(56,189,248,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                                    fontFamily: 'inherit',
                                }}
                            >👤 Misafir</button>
                            <button
                                onClick={() => setLoginMode('member')}
                                style={{
                                    flex: 1, padding: '8px 0', fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                                    textTransform: 'uppercase', border: 'none', cursor: 'pointer',
                                    borderRadius: 8,
                                    background: loginMode === 'member' ? 'linear-gradient(180deg, rgba(239,68,68,0.3), rgba(185,28,28,0.4))' : 'rgba(0,0,0,0.25)',
                                    color: loginMode === 'member' ? '#fca5a5' : 'rgba(255,255,255,0.35)',
                                    transition: 'all 0.3s ease',
                                    boxShadow: loginMode === 'member' ? '0 0 16px rgba(239,68,68,0.3), 0 0 4px rgba(239,68,68,0.2), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
                                    fontFamily: 'inherit',
                                }}
                            >⭐ Üye Giriş</button>
                        </div>

                        {/* ═══ MİSAFİR GİRİŞİ ═══ */}
                        {loginMode === 'guest' && (
                            <form onSubmit={handleGuestLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 6, marginLeft: 2 }}>Takma Adınız</label>
                                    <input
                                        type="text"
                                        value={formData.guestName}
                                        onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                                        className="input-inset"
                                        style={{ width: '100%', padding: '12px 14px', fontSize: 13, boxSizing: 'border-box' }}
                                        placeholder="Nickname girin..."
                                        autoComplete="off"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 8, marginLeft: 2 }}>Cinsiyet</label>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {(['Male', 'Female'] as const).map(g => (
                                            <button key={g} type="button" onClick={() => setFormData({ ...formData, gender: g })} style={{
                                                flex: 1, padding: '7px 0', fontSize: 10, fontWeight: 700, letterSpacing: 1, border: 'none', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.25s ease', fontFamily: 'inherit',
                                                background: formData.gender === g ? (g === 'Male' ? 'linear-gradient(180deg, rgba(56,189,248,0.3), rgba(2,132,199,0.4))' : 'linear-gradient(180deg, rgba(244,114,182,0.3), rgba(219,39,119,0.4))') : 'rgba(0,0,0,0.2)',
                                                color: formData.gender === g ? (g === 'Male' ? '#7dd3fc' : '#f9a8d4') : 'rgba(255,255,255,0.35)',
                                                boxShadow: formData.gender === g ? 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05)' : 'none',
                                            }}>{g === 'Male' ? '♂ Erkek' : '♀ Kadın'}</button>
                                        ))}
                                    </div>
                                </div>
                                <TermsCheckbox />
                                {error && <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, margin: 0 }}>{error}</p>}
                                <button type="submit" className="btn-3d btn-3d-blue" style={{ width: '100%', padding: '10px 0', fontSize: 11, gap: 6 }} disabled={isSubmitting || !formData.guestName.trim() || !formData.gender || !termsAccepted}>
                                    <LogIn style={{ width: 14, height: 14 }} /> {isSubmitting ? 'Giriş yapılıyor...' : 'Misafir Giriş'}
                                </button>
                            </form>
                        )}

                        {/* ═══ ÜYE GİRİŞİ ═══ */}
                        {loginMode === 'member' && (
                            <div style={{ position: 'relative', overflow: 'hidden' }}>
                                {/* Login / Register geçiş container */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        <div>
                                            <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 6, marginLeft: 2 }}>Kullanıcı Adı veya E-posta</label>
                                            <input type="text" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-inset" style={{ width: '100%', padding: '12px 14px', fontSize: 13, boxSizing: 'border-box' }} placeholder="Üye adınız veya e-posta" autoComplete="one-time-code" />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 6, marginLeft: 2 }}>Şifre</label>
                                            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="input-inset" style={{ width: '100%', padding: '12px 14px', fontSize: 13, boxSizing: 'border-box' }} placeholder="••••••••" autoComplete="one-time-code" />
                                        </div>
                                        {error && <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, margin: 0 }}>{error}</p>}
                                        <button onClick={handleMemberLogin} className="btn-3d btn-3d-red" style={{ width: '100%', padding: '10px 0', fontSize: 11, gap: 6 }} disabled={isSubmitting}>
                                            <LogIn style={{ width: 14, height: 14 }} /> {isSubmitting ? 'Giriş yapılıyor...' : 'Üye Girişi'}
                                        </button>
                                        <button type="button" onClick={() => setLoginMode('register')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#94a3b8', fontWeight: 600, padding: '4px 0', transition: 'color 0.2s', fontFamily: 'inherit' }}>
                                            Hesabın yok mu? <span style={{ color: '#fca5a5', fontWeight: 700 }}>Üye Ol</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═══ KAYIT FORMU ═══ */}
                        {loginMode === 'register' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <h4 style={{ fontSize: 12, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 2, textAlign: 'center', marginBottom: 4, marginTop: 0 }}>✨ Yeni Üyelik</h4>
                                <div>
                                    <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 5, marginLeft: 2 }}>Kullanıcı Adı</label>
                                    <input type="text" value={formData.regUsername} onChange={(e) => setFormData({ ...formData, regUsername: e.target.value })} className="input-inset" style={{ width: '100%', padding: '10px 14px', fontSize: 12, boxSizing: 'border-box' }} placeholder="Kullanıcı adınız" autoComplete="off" />
                                </div>
                                <div>
                                    <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 5, marginLeft: 2 }}>E-posta</label>
                                    <input type="email" value={formData.regEmail} onChange={(e) => setFormData({ ...formData, regEmail: e.target.value })} className="input-inset" style={{ width: '100%', padding: '10px 14px', fontSize: 12, boxSizing: 'border-box' }} placeholder="ornek@mail.com" autoComplete="one-time-code" />
                                </div>
                                <div>
                                    <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 5, marginLeft: 2 }}>Şifre</label>
                                    <input type="password" value={formData.regPassword} onChange={(e) => setFormData({ ...formData, regPassword: e.target.value })} className="input-inset" style={{ width: '100%', padding: '10px 14px', fontSize: 12, boxSizing: 'border-box' }} placeholder="En az 4 karakter" autoComplete="one-time-code" />
                                </div>
                                <div>
                                    <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, display: 'block', marginBottom: 8, marginLeft: 2 }}>Cinsiyet</label>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {(['Male', 'Female'] as const).map(g => (
                                            <button key={g} type="button" onClick={() => setFormData({ ...formData, regGender: g })} style={{
                                                flex: 1, padding: '7px 0', fontSize: 9, fontWeight: 700, letterSpacing: 1, border: 'none', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.25s ease', fontFamily: 'inherit',
                                                background: formData.regGender === g ? (g === 'Male' ? 'linear-gradient(180deg, rgba(56,189,248,0.3), rgba(2,132,199,0.4))' : 'linear-gradient(180deg, rgba(244,114,182,0.3), rgba(219,39,119,0.4))') : 'rgba(0,0,0,0.2)',
                                                color: formData.regGender === g ? (g === 'Male' ? '#7dd3fc' : '#f9a8d4') : 'rgba(255,255,255,0.35)',
                                                boxShadow: formData.regGender === g ? 'inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(255,255,255,0.05)' : 'none',
                                            }}>{g === 'Male' ? '♂ Erkek' : '♀ Kadın'}</button>
                                        ))}
                                    </div>
                                </div>
                                <TermsCheckbox />
                                {error && <p style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, margin: 0 }}>{error}</p>}
                                <button onClick={handleRegister} className="btn-3d btn-3d-red" style={{ width: '100%', padding: '10px 0', fontSize: 11, gap: 6 }} disabled={isSubmitting || !formData.regUsername.trim() || !formData.regPassword || !formData.regGender || !termsAccepted}>
                                    <UserPlus style={{ width: 14, height: 14 }} /> {isSubmitting ? 'Kayıt yapılıyor...' : 'Üye Ol'}
                                </button>
                                <button type="button" onClick={() => setLoginMode('member')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#94a3b8', fontWeight: 600, padding: '2px 0', transition: 'color 0.2s', fontFamily: 'inherit' }}>
                                    ← Giriş ekranına dön
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Alt bilgi */}
                    <p style={{ marginTop: 20, fontSize: 11, color: '#1e293b', textAlign: 'center', fontWeight: 500, letterSpacing: 0.5 }}>
                        Powered by <span style={{ color: '#0f172a', fontWeight: 700 }}>SopranoChat</span>
                    </p>
                </div>
            </div>
        </>
    );
}
