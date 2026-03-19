"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, X, CheckCircle2, Eye, EyeOff, Crown, Fingerprint } from 'lucide-react';
import { setAuthUser } from '@/lib/auth';
import { API_URL } from '@/lib/api';

/* ═══════════════════════════════════════════════════
   Premium Toast Notification
   ═══════════════════════════════════════════════════ */
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
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
            style={{ animation: 'fadeSlideDown 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
            <div style={{
                position: 'relative', overflow: 'hidden', borderRadius: 16,
                background: isError ? 'rgba(127, 29, 29, 0.85)' : 'rgba(6, 78, 59, 0.85)',
                border: `1px solid ${isError ? 'rgba(239,68,68,0.2)' : 'rgba(52,211,153,0.2)'}`,
                backdropFilter: 'blur(20px)', boxShadow: `0 20px 40px rgba(0,0,0,0.3), 0 0 20px ${isError ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)'}`,
            }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${isError ? '#ef4444' : '#34d399'}, transparent)` }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16 }}>
                    <div style={{ flexShrink: 0, marginTop: 2, width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isError ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)', color: isError ? '#fca5a5' : '#6ee7b7' }}>
                        {isError ? <AlertCircle style={{ width: 16, height: 16 }} /> : <CheckCircle2 style={{ width: 16, height: 16 }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2, color: isError ? '#fca5a5' : '#6ee7b7' }}>
                            {isError ? 'Erişim Reddedildi' : 'Kimlik Doğrulandı'}
                        </p>
                        <p style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.5 }}>{message}</p>
                    </div>
                    <button onClick={onClose} style={{ flexShrink: 0, marginTop: 2, padding: 4, borderRadius: 8, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X style={{ width: 14, height: 14 }} />
                    </button>
                </div>
                <div style={{ height: 2, background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ height: '100%', background: isError ? 'rgba(239,68,68,0.4)' : 'rgba(52,211,153,0.4)', animation: `shrink ${isError ? '6s' : '3s'} linear forwards` }} />
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   GLOSSY PANEL CARD — OwnerPanel kart stili
   ═══════════════════════════════════════════════════ */
const glossyPanelStyle: React.CSSProperties = {
    background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%), linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.55) 100%)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderTop: '1px solid rgba(255,255,255,0.35)',
    borderLeft: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
    borderRadius: 22,
};

/* ═══════════════════════════════════════════════════
   MAIN LOGIN PAGE — OwnerPanel temasıyla birebir
   ═══════════════════════════════════════════════════ */
export default function AdminLoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
    const [focused, setFocused] = useState<string | null>(null);
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

            if (!data.access_token) {
                throw new Error('Giriş başarısız: Token alınamadı.');
            }

            const allowedRoles = ['admin', 'superadmin', 'owner', 'godmaster'];
            const userRole = data.user?.role?.toLowerCase();
            if (!allowedRoles.includes(userRole)) {
                throw new Error('Bu panele erişim yetkiniz bulunmuyor. Yalnızca Admin ve üzeri roller giriş yapabilir.');
            }

            sessionStorage.setItem('soprano_admin_token', data.access_token);
            localStorage.setItem('soprano_auth_token', data.access_token);
            sessionStorage.setItem('soprano_admin_user', JSON.stringify(data.user));
            setAuthUser(data.user);

            setToast({ message: `Hoş geldiniz, ${data.user?.displayName || data.user?.email || ''}!`, type: 'success' });

            setTimeout(() => {
                router.push('/riconun-mekani');
            }, 800);
        } catch (err: any) {
            setToast({ message: err.message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            background: 'linear-gradient(to bottom, #a3ace5 0%, #c4c9ee 50%, #d8dbf4 100%)',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            fontFamily: "'Plus Jakarta Sans', Tahoma, Verdana, Arial, sans-serif",
            position: 'relative',
            overflow: 'hidden',
        }}>
            <ToastNotification message={toast?.message || null} type={toast?.type || 'error'} onClose={() => setToast(null)} />

            {/* ═══ İç çerçeve — OwnerPanel'deki gibi ═══ */}
            <div style={{
                width: '100%',
                maxWidth: 460,
                position: 'relative',
                zIndex: 10,
            }}>

                {/* ═══ Logo & Brand ═══ */}
                <div style={{ textAlign: 'center', marginBottom: 32, animation: 'fadeSlideDown 0.6s cubic-bezier(0.16,1,0.3,1)' }}>
                    {/* Shield icon — glossy panel stili */}
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 72,
                        height: 72,
                        borderRadius: 20,
                        marginBottom: 16,
                        position: 'relative',
                        ...glossyPanelStyle,
                    }}>
                        <Fingerprint style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.7)' }} />
                        <div style={{
                            position: 'absolute', top: -4, right: -4, width: 22, height: 22,
                            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                            boxShadow: '0 2px 8px rgba(251,191,36,0.4)',
                            border: '2px solid rgba(255,255,255,0.3)',
                        }}>
                            <Crown style={{ width: 11, height: 11, color: '#422006' }} />
                        </div>
                    </div>

                    <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>
                        <span style={{
                            background: 'linear-gradient(180deg, #fff 0%, #dde4ee 35%, #b8c2d4 70%, #ccd4e4 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                        }}>Soprano</span>
                        <span style={{
                            background: 'linear-gradient(180deg, #b8f0f0 0%, #5ec8c8 30%, #3a9e9e 65%, #4db0a8 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                        }}>Chat</span>
                    </h1>
                    <p style={{ color: '#5a5f7a', fontSize: 12, marginTop: 8, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Yönetim Kontrol Merkezi
                    </p>
                </div>

                {/* ═══ LOGIN CARD — glossy panel ═══ */}
                <div style={{ ...glossyPanelStyle, padding: 32, animation: 'fadeSlideUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both' }}>
                    {/* Güvenlik rozeti */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24,
                        padding: '8px 14px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        <Fingerprint style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.55)' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.55)' }}>
                            Güvenli Kimlik Doğrulama
                        </span>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Email */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8, marginLeft: 2 }}>
                                E-posta Adresi
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', inset: '0 auto 0 0', paddingLeft: 14, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                                    <Mail style={{ width: 15, height: 15, color: focused === 'email' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', transition: 'color 0.2s' }} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onFocus={() => setFocused('email')}
                                    onBlur={() => setFocused(null)}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    style={{
                                        display: 'block', width: '100%', paddingLeft: 40, paddingRight: 14, paddingTop: 12, paddingBottom: 12,
                                        borderRadius: 14, fontSize: 13, color: '#e2e8f0', outline: 'none',
                                        background: '#1a1e2e',
                                        border: focused === 'email' ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(148,163,184,0.25)',
                                        boxShadow: focused === 'email' ? '0 0 0 2px rgba(99,102,241,0.15)' : 'inset 0 2px 4px rgba(0,0,0,0.3)',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box',
                                    }}
                                    placeholder="admin@soprano.chat"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: 28 }}>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', marginBottom: 8, marginLeft: 2 }}>
                                Şifre
                            </label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', inset: '0 auto 0 0', paddingLeft: 14, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                                    <Lock style={{ width: 15, height: 15, color: focused === 'password' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', transition: 'color 0.2s' }} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={formData.password}
                                    onFocus={() => setFocused('password')}
                                    onBlur={() => setFocused(null)}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    style={{
                                        display: 'block', width: '100%', paddingLeft: 40, paddingRight: 44, paddingTop: 12, paddingBottom: 12,
                                        borderRadius: 14, fontSize: 13, color: '#e2e8f0', outline: 'none',
                                        background: '#1a1e2e',
                                        border: focused === 'password' ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(148,163,184,0.25)',
                                        boxShadow: focused === 'password' ? '0 0 0 2px rgba(99,102,241,0.15)' : 'inset 0 2px 4px rgba(0,0,0,0.3)',
                                        transition: 'all 0.2s',
                                        boxSizing: 'border-box',
                                    }}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', inset: '0 0 0 auto', paddingRight: 14,
                                        display: 'flex', alignItems: 'center',
                                        color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer',
                                        transition: 'color 0.2s',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
                                    {showPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit — 3D buton stili */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                width: '100%', position: 'relative', overflow: 'hidden',
                                borderRadius: 14, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                                background: isLoading
                                    ? 'linear-gradient(180deg, #4a5060 0%, #3a3f4e 100%)'
                                    : 'linear-gradient(180deg, #5a6070 0%, #3d4250 15%, #1e222e 50%, #282c3a 75%, #3a3f50 100%)',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2)',
                                padding: '14px 0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.03em',
                                transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.2)'; } }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2)'; }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Doğrulanıyor...</span>
                                </>
                            ) : (
                                <>
                                    <span>Panele Giriş Yap</span>
                                    <ArrowRight style={{ width: 15, height: 15, transition: 'transform 0.2s' }} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* ═══ Footer ═══ */}
                <div style={{ marginTop: 24, textAlign: 'center', animation: 'fadeSlideUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.3s both' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
                        <div style={{ width: 24, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15))' }} />
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                        <div style={{ width: 24, height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.15), transparent)' }} />
                    </div>
                    <p style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#6b6f8a' }}>
                        SopranoChat Administration v3.0
                    </p>
                </div>
            </div>

            {/* ═══ Global Animations ═══ */}
            <style jsx global>{`
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                @keyframes fadeSlideDown {
                    from { opacity: 0; transform: translateY(-16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                input::placeholder {
                    color: rgba(148,163,184,0.5) !important;
                }
                input:-webkit-autofill,
                input:-webkit-autofill:hover,
                input:-webkit-autofill:focus {
                    -webkit-text-fill-color: #e2e8f0 !important;
                    -webkit-box-shadow: 0 0 0px 1000px #1a1e2e inset !important;
                    transition: background-color 5000s ease-in-out 0s;
                    caret-color: #e2e8f0;
                }
            `}</style>
        </div>
    );
}
