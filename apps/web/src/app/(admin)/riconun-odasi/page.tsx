"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, Loader2, ShieldCheck, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { setAuthUser } from '@/lib/auth';
import { API_URL } from '@/lib/api';

// Premium Toast / Notification bileşeni
function ToastNotification({ message, type, onClose }: {
    message: string | null;
    type: 'error' | 'success';
    onClose: () => void;
}) {
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(onClose, type === 'success' ? 3000 : 6000);
        return () => clearTimeout(timer);
    }, [message, type, onClose]);

    if (!message) return null;

    const isError = type === 'error';

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 w-full max-w-md px-4">
            <div className={`
                relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl
                ${isError
                    ? 'bg-red-950/80 border-red-500/20 shadow-red-500/10'
                    : 'bg-emerald-950/80 border-emerald-500/20 shadow-emerald-500/10'
                }
            `}>
                {/* Üst glow çizgisi */}
                <div className={`absolute top-0 left-0 right-0 h-[2px] ${isError
                    ? 'bg-gradient-to-r from-transparent via-red-500 to-transparent'
                    : 'bg-gradient-to-r from-transparent via-emerald-500 to-transparent'
                    }`} />

                <div className="flex items-start gap-3 p-4">
                    <div className={`shrink-0 mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center ${isError
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                        {isError
                            ? <AlertCircle className="w-4.5 h-4.5" />
                            : <CheckCircle2 className="w-4.5 h-4.5" />
                        }
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${isError ? 'text-red-400' : 'text-emerald-400'
                            }`}>
                            {isError ? 'Hata' : 'Başarılı'}
                        </p>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            {message}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="shrink-0 mt-0.5 p-1 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Progress bar animasyonu */}
                <div className="h-[2px] bg-black/20">
                    <div
                        className={`h-full ${isError ? 'bg-red-500/40' : 'bg-emerald-500/40'}`}
                        style={{
                            animation: `shrink ${isError ? '6s' : '3s'} linear forwards`,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default function AdminLoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
    const [formData, setFormData] = useState({
        tenantId: 'system',
        email: '',
        password: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.email.trim() || !formData.password.trim()) return;
        setIsLoading(true);
        setToast(null);

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Giriş başarısız.');
            }

            const data = await response.json();

            // Validate token exists in response
            if (!data.access_token) {
                throw new Error('Giriş başarısız: Token alınamadı.');
            }

            // Validate admin-level role
            const allowedRoles = ['admin', 'superadmin', 'owner', 'godmaster'];
            const userRole = data.user?.role?.toLowerCase();
            if (!allowedRoles.includes(userRole)) {
                throw new Error('Bu panele erişim yetkiniz bulunmuyor. Yalnızca Admin ve üzeri roller giriş yapabilir.');
            }

            // Store tokens and user
            localStorage.setItem('soprano_admin_token', data.access_token);
            localStorage.setItem('soprano_auth_token', data.access_token);
            localStorage.setItem('soprano_admin_user', JSON.stringify(data.user));
            setAuthUser(data.user);

            // Başarı toast'ı göster
            setToast({ message: `Hoş geldiniz, ${data.user?.displayName || data.user?.email || ''}!`, type: 'success' });

            // Kısa gecikme sonra yönlendir
            setTimeout(() => {
                router.push('/riconun-mekani');
            }, 600);
        } catch (err: any) {
            setToast({ message: err.message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Toast Notification */}
            <ToastNotification
                message={toast?.message || null}
                type={toast?.type || 'error'}
                onClose={() => setToast(null)}
            />

            {/* Animated Background blobs */}
            <div className="absolute top-0 -left-20 w-96 h-96 bg-rose-600/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo Area */}
                <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-2xl shadow-rose-500/20 mb-4 border border-white/10">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">
                        Soprano<span className="text-rose-500">Chat</span>
                    </h1>
                    <p className="text-gray-500 text-sm mt-2 font-medium">
                        Yönetim Paneline Giriş Yapın
                    </p>
                </div>

                {/* ═══════════ LOGIN CARD ═══════════ */}
                <div className="glass-panel p-8 rounded-3xl border border-white/10 bg-[#0f111a]/80 backdrop-blur-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-500">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">E-posta Adresi</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-gray-600 group-focus-within:text-rose-500 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/5 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all placeholder:text-gray-700"
                                    placeholder=""
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest ml-1">Şifre</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-gray-600 group-focus-within:text-rose-500 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-black/40 border border-white/5 rounded-2xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/50 transition-all placeholder:text-gray-700"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full relative group overflow-hidden rounded-2xl"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-pink-600 transition-all group-hover:scale-105 duration-300"></div>
                            <div className="relative flex items-center justify-center gap-2 py-4 text-sm font-bold text-white tracking-wide">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Giriş yapılıyor...
                                    </>
                                ) : (
                                    <>
                                        Kimliğimi Doğrula
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                        </button>
                    </form>
                </div>

                {/* Footer Info */}
                <div className="mt-8 text-center">
                    <p className="text-gray-600 text-xs font-medium uppercase tracking-[0.2em]">
                        Soprano Secure Administration Module v2.0
                    </p>
                </div>
            </div>

            <style jsx global>{`
                .glass-panel {
                    box-shadow: 0 0 0 1px rgba(255,255,255,0.05), 0 20px 50px rgba(0,0,0,0.5);
                }
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
}
