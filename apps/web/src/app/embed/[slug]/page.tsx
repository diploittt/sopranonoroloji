"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, User, Lock, ArrowRight, Loader2, Eye, EyeOff, Users, Globe } from 'lucide-react';
import { setAuthUser } from '@/lib/auth';
import { openChatWindow } from '@/components/ui/TitleBar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface TenantInfo {
    id: string;
    name: string;
    slug: string;
    domain: string;
    status: string;
    rooms?: { id: string; name: string; slug: string }[];
}

export default function EmbedEntryPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const router = useRouter();

    const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [loginMode, setLoginMode] = useState<'member' | 'guest'>('guest');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        guestName: '',
    });

    // Slug ile tenant bilgilerini çek
    useEffect(() => {
        const fetchTenantInfo = async () => {
            try {
                const res = await fetch(`${API_URL}/rooms/by-slug/${slug}`);
                if (res.ok) {
                    const data = await res.json();
                    setTenantInfo({
                        id: data.tenantId || slug,
                        name: data.tenantName || 'Sohbet Odası',
                        slug: data.slug || slug,
                        domain: data.domain || '',
                        status: data.status || 'ACTIVE',
                        rooms: data.rooms || [],
                    });
                } else {
                    setNotFound(true);
                }
            } catch {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };
        fetchTenantInfo();
    }, [slug]);

    // Üye girişi
    const handleMemberLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId: tenantInfo?.id || slug,
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
                avatar: data.user.avatar || data.user.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${data.user.username}`,
                isMember: true,
                role: (data.user.role || 'member') as any,
                gender: data.user.gender || 'Unspecified',
            });
            localStorage.setItem('soprano_user', JSON.stringify(data.user));
            localStorage.setItem('soprano_entry_url', `/embed/${slug}`);

            const firstRoom = tenantInfo?.rooms?.[0];
            const roomSlug = firstRoom?.slug || 'oda-1';
            const tenantSlug = tenantInfo?.slug || slug;
            // Yeni pencerede aç
            openChatWindow(roomSlug, tenantSlug);
        } catch (err: any) {
            setError(err.message || 'Giriş sırasında bir hata oluştu');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Misafir girişi
    const handleGuestLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const guestName = formData.guestName.trim();
            if (guestName.length < 2) {
                throw new Error('İsim en az 2 karakter olmalı');
            }

            const res = await fetch(`${API_URL}/auth/guest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: guestName,
                    tenantId: tenantInfo?.id || slug,
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
                avatar: data.user.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${data.user.username}`,
                isMember: false,
                role: 'guest',
                gender: data.user.gender || 'Unspecified',
            });
            localStorage.setItem('soprano_user', JSON.stringify(data.user));
            localStorage.setItem('soprano_entry_url', `/embed/${slug}`);

            const firstRoom = tenantInfo?.rooms?.[0];
            const roomSlug = firstRoom?.slug || 'oda-1';
            const tenantSlug = tenantInfo?.slug || slug;
            // Yeni pencerede aç
            openChatWindow(roomSlug, tenantSlug);
        } catch (err: any) {
            setError(err.message || 'Giriş sırasında bir hata oluştu');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#060611] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="min-h-screen bg-[#060611] flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-2xl flex items-center justify-center">
                        <Shield className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">Geçersiz Bağlantı</h1>
                    <p className="text-sm text-gray-500">Bu embed bağlantısı geçersiz veya süresi dolmuş.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#060611] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Arka plan efektleri */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-[120px]" />
                <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] opacity-40" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo / Başlık */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Globe className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">
                        {tenantInfo?.name || 'Sohbet Odası'}
                    </h1>
                    <p className="text-sm text-gray-500">Sohbet odasına giriş yapın</p>
                </div>

                {/* Giriş Tipi Seçici */}
                <div className="flex bg-[#0d0d1a] rounded-xl p-1 mb-6 border border-white/5">
                    <button
                        onClick={() => { setLoginMode('guest'); setError(null); }}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${loginMode === 'guest'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Misafir
                    </button>
                    <button
                        onClick={() => { setLoginMode('member'); setError(null); }}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${loginMode === 'member'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <Shield className="w-4 h-4" />
                        Üye Giriş
                    </button>
                </div>

                {/* Hata Mesajı */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center animate-in fade-in duration-200">
                        {error}
                    </div>
                )}

                {/* Form Kartı */}
                <div className="bg-[#0d0d1a] border border-white/5 rounded-2xl p-6 shadow-2xl">
                    {loginMode === 'guest' ? (
                        <form onSubmit={handleGuestLogin} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 mb-1.5 block font-medium">
                                    Takma Adınız
                                </label>
                                <div className="relative">
                                    <User className="w-4 h-4 text-gray-600 absolute left-3.5 top-3.5" />
                                    <input
                                        type="text"
                                        value={formData.guestName}
                                        onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                                        placeholder="Bir isim girin"
                                        className="w-full bg-[#060611] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50 transition-colors placeholder:text-gray-700"
                                        maxLength={24}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || formData.guestName.trim().length < 2}
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <ArrowRight className="w-4 h-4" />
                                        Misafir Olarak Gir
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleMemberLogin} className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 mb-1.5 block font-medium">
                                    E-Posta veya Kullanıcı Adı
                                </label>
                                <div className="relative">
                                    <User className="w-4 h-4 text-gray-600 absolute left-3.5 top-3.5" />
                                    <input
                                        type="text"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="mail@ornek.com"
                                        className="w-full bg-[#060611] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-indigo-500/50 transition-colors placeholder:text-gray-700"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 mb-1.5 block font-medium">
                                    Şifre
                                </label>
                                <div className="relative">
                                    <Lock className="w-4 h-4 text-gray-600 absolute left-3.5 top-3.5" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="••••••••"
                                        className="w-full bg-[#060611] border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white text-sm outline-none focus:border-indigo-500/50 transition-colors placeholder:text-gray-700"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-3.5 text-gray-600 hover:text-gray-400 transition"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <ArrowRight className="w-4 h-4" />
                                        Giriş Yap
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-[11px] text-gray-700 mt-6">
                    Powered by <span className="text-gray-500 font-medium">SopranoChat</span>
                </p>
            </div>
        </div>
    );
}
