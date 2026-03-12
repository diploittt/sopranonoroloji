"use client";

import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import {
    Calendar, Clock, CreditCard, Crown, Globe,
    Hash, Home, LayoutGrid, Shield, Users, Zap, Headphones, MessageCircle, Mail
} from 'lucide-react';

interface AboutTabProps {
    socket: Socket | null;
}

interface TenantInfo {
    tenant: {
        id: string;
        name: string;
        slug: string;
        packageType: 'CAMERA' | 'NO_CAMERA';
        status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
        roomLimit: number;
        userLimitPerRoom: number;
        maxConcurrentRooms: number;
        createdAt: string;
        expiresAt: string | null;
        billingPeriod: string;
        logoUrl: string | null;
        primaryColor: string | null;
    };
    stats: {
        totalRooms: number;
        meetingRooms?: number;
        totalUsers: number;
        onlineUsers: number;
    };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    TRIAL: { label: 'Deneme', color: 'text-amber-600', bg: 'bg-amber-500/10 border-amber-500/25' },
    ACTIVE: { label: 'Aktif', color: 'text-emerald-600', bg: 'bg-emerald-500/10 border-emerald-500/25' },
    SUSPENDED: { label: 'Askıda', color: 'text-red-600', bg: 'bg-red-500/10 border-red-500/25' },
    CANCELLED: { label: 'İptal', color: 'text-gray-500', bg: 'bg-gray-500/10 border-gray-500/20' },
};

const PACKAGE_MAP: Record<string, { label: string; icon: React.ReactNode; desc: string }> = {
    CAMERA: { label: 'Kamera + Ses', icon: <Zap className="w-4 h-4" />, desc: 'Görüntülü ve sesli sohbet' },
    NO_CAMERA: { label: 'Yalnızca Ses', icon: <Headphones className="w-4 h-4" />, desc: 'Sesli sohbet' },
};

export function AboutTab({ socket }: AboutTabProps) {
    const [info, setInfo] = useState<TenantInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!socket) return;

        socket.emit('admin:getTenantInfo');

        const handler = (data: any) => {
            setLoading(false);
            if (data.error) {
                setError(data.error);
            } else {
                setInfo(data);
            }
        };

        socket.on('admin:tenantInfo', handler);
        return () => { socket.off('admin:tenantInfo', handler); };
    }, [socket]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // ─── Kalan Gün Hesaplama ───
    const getDaysRemaining = (expiresAt: string | null): { days: number; text: string; urgent: boolean } | null => {
        if (!expiresAt) return null;
        const now = new Date();
        const exp = new Date(expiresAt);
        const diff = exp.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days < 0) return { days: 0, text: 'Süresi doldu', urgent: true };
        if (days === 0) return { days: 0, text: 'Bugün doluyor!', urgent: true };
        if (days <= 7) return { days, text: `${days} gün kaldı`, urgent: true };
        return { days, text: `${days} gün kaldı`, urgent: false };
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: '2-digit', month: 'long', year: 'numeric',
        });
    };

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    // ─── Loading State ───
    if (loading) {
        return (
            <div className="flex-1 p-8 overflow-y-auto flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                    <span className="text-xs text-gray-500 font-medium">Bilgiler yükleniyor...</span>
                </div>
            </div>
        );
    }

    // ─── Error State ───
    if (error || !info) {
        return (
            <div className="flex-1 p-8 overflow-y-auto flex items-center justify-center">
                <div className="text-center">
                    <div className="text-3xl mb-3">⚠️</div>
                    <p className="text-sm text-red-600 font-medium">{error || 'Bilgiler yüklenemedi'}</p>
                </div>
            </div>
        );
    }

    const { tenant, stats } = info;
    const status = STATUS_MAP[tenant.status] || STATUS_MAP.TRIAL;
    const pkg = PACKAGE_MAP[tenant.packageType] || PACKAGE_MAP.CAMERA;
    const remaining = getDaysRemaining(tenant.expiresAt);
    const customerCode = tenant.slug?.toUpperCase().replace(/-/g, '') + tenant.id.slice(-6).toUpperCase();

    return (
        <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-2xl mx-auto space-y-5">

                {/* ─── Header ─── */}
                <div className="text-center pb-4">
                    <div className="flex items-center justify-center gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.bg} ${status.color}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                            {status.label}
                        </span>
                        <span className="text-[10px] text-gray-500 font-semibold bg-black/[0.04] px-2.5 py-1 rounded-full border border-gray-200">
                            v1.0
                        </span>
                    </div>
                </div>

                {/* ─── Müşteri Numarası (Öne çıkan kart) ─── */}
                <div className="relative overflow-hidden rounded-xl border p-5"
                    style={{ background: 'linear-gradient(135deg, rgba(30,58,95,0.9) 0%, rgba(44,82,130,0.85) 100%)', borderColor: 'rgba(30,58,95,0.3)' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.04] rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                            <Hash className="w-4 h-4 text-white/60" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Müşteri Numarası</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-black text-white tracking-widest font-mono">
                                {customerCode}
                            </span>
                            <button
                                onClick={() => copyToClipboard(customerCode)}
                                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-[10px] font-semibold text-white/80 transition-all duration-200"
                            >
                                {copied ? '✓ Kopyalandı' : 'Kopyala'}
                            </button>
                        </div>
                        <p className="text-[10px] text-white/40 mt-2">Ödeme açıklamasına bu kodu yazınız</p>
                    </div>
                </div>

                {/* ─── Ödeme Bilgileri ─── */}
                {tenant.expiresAt && (
                    <div className={`rounded-xl border p-4 ${remaining?.urgent
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50/50 border-gray-200'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${remaining?.urgent
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-emerald-100 text-emerald-600'
                                    }`}>
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Sonraki Ödeme Tarihi</div>
                                    <div className="text-sm font-bold text-gray-800 mt-0.5">{formatDate(tenant.expiresAt)}</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                        {tenant.billingPeriod === 'YEARLY' ? '📆 Yıllık Ödeme' : '📅 Aylık Ödeme'}
                                    </div>
                                </div>
                            </div>
                            {remaining && (
                                <div className={`text-right ${remaining.urgent ? 'animate-pulse' : ''}`}>
                                    <div className={`text-2xl font-black ${remaining.urgent ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {remaining.days}
                                    </div>
                                    <div className={`text-[9px] font-semibold ${remaining.urgent ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {remaining.text}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── İstatistikler Grid ─── */}
                <div className="grid grid-cols-3 gap-3">
                    <StatCard icon={<Users className="w-4 h-4" />} label="Toplam Kullanıcı" value={stats.totalUsers} color="indigo" />
                    <StatCard icon={<Zap className="w-4 h-4" />} label="Çevrimiçi" value={stats.onlineUsers} color="emerald" />
                    <StatCard icon={<Home className="w-4 h-4" />} label="Toplam Oda" value={stats.meetingRooms ? `${stats.totalRooms}+${stats.meetingRooms}` : stats.totalRooms} color="purple" />
                </div>

                {/* ─── Paket ve Limitler ─── */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Paket Tipi */}
                    <div className="rounded-xl bg-gray-50/60 border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Crown className="w-4 h-4 text-amber-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Paket</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-amber-500">{pkg.icon}</span>
                            <div>
                                <div className="text-sm font-bold text-gray-800">{pkg.label}</div>
                                <div className="text-[10px] text-gray-500">{pkg.desc}</div>
                            </div>
                        </div>
                    </div>

                    {/* Limitler */}
                    <div className="rounded-xl bg-gray-50/60 border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-4 h-4 text-cyan-600" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Limitler</span>
                        </div>
                        <div className="space-y-1.5">
                            <LimitRow label="Oda Limiti" value={tenant.roomLimit} current={stats.totalRooms} />
                            <LimitRow label="Oda Başı Kullanıcı" value={tenant.userLimitPerRoom} />
                            <LimitRow label="Eşzamanlı Oda" value={tenant.maxConcurrentRooms} />
                        </div>
                    </div>
                </div>

                {/* ─── Detay Bilgileri ─── */}
                <div className="rounded-xl bg-gray-50/60 border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Platform Bilgileri</span>
                    </div>
                    <div className="space-y-2">
                        <InfoRow icon={<LayoutGrid className="w-3.5 h-3.5" />} label="Site Adı" value={tenant.name} />
                        <InfoRow icon={<Globe className="w-3.5 h-3.5" />} label="Slug" value={tenant.slug} />
                        <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Kayıt Tarihi" value={formatDateTime(tenant.createdAt)} />

                    </div>
                </div>

                {/* ─── Destek ─── */}
                <div className="rounded-xl border p-4"
                    style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.06) 0%, rgba(20,184,166,0.04) 100%)', borderColor: 'rgba(5,150,105,0.15)' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
                            <Headphones className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-gray-800">Canlı Destek</div>
                            <div className="text-[10px] text-gray-500">15:00 - 01:00 (GMT+3) • Her gün aktif</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-600">Çevrimiçi</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-emerald-200/30">
                        <a
                            href="https://wa.me/905520363674"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/25 transition-all cursor-pointer group"
                        >
                            <div className="p-1.5 rounded-lg bg-[#25D366]/15 text-[#25D366] group-hover:scale-110 transition-transform">
                                <MessageCircle className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">WhatsApp İletişim</div>
                                <div className="text-sm font-bold text-gray-800">+90 552 036 36 74</div>
                            </div>
                            <span className="text-[10px] font-semibold text-[#25D366] opacity-0 group-hover:opacity-100 transition-opacity">Mesaj Gönder →</span>
                        </a>
                        <a
                            href="mailto:destek@sopranochat.com"
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-600/5 hover:bg-blue-600/10 border border-blue-600/15 transition-all cursor-pointer group mt-2"
                        >
                            <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 group-hover:scale-110 transition-transform">
                                <Mail className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">E-Posta</div>
                                <div className="text-sm font-bold text-gray-800">destek@sopranochat.com</div>
                            </div>
                            <span className="text-[10px] font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">Mail Gönder →</span>
                        </a>
                    </div>
                </div>

                {/* ─── Footer ─── */}
                <div className="text-center pt-2 pb-4">
                    <p className="text-[10px] text-gray-400">© 2024 SopranoChat. Tüm hakları saklıdır.</p>
                </div>
            </div>
        </div>
    );
}

// ─── Alt Bileşenler ───

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
    const colorMap: Record<string, { bg: string; border: string; text: string; value: string }> = {
        indigo: { bg: 'bg-blue-50/60', border: 'border-blue-200', text: 'text-blue-600', value: 'text-blue-700' },
        emerald: { bg: 'bg-emerald-50/60', border: 'border-emerald-200', text: 'text-emerald-600', value: 'text-emerald-700' },
        purple: { bg: 'bg-purple-50/60', border: 'border-purple-200', text: 'text-purple-600', value: 'text-purple-700' },
    };
    const c = colorMap[color] || colorMap.indigo;
    return (
        <div className={`rounded-xl border p-3.5 ${c.bg} ${c.border}`}>
            <div className={`flex items-center gap-1.5 mb-2 ${c.text}`}>
                {icon}
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">{label}</span>
            </div>
            <div className={`text-2xl font-black ${c.value}`}>{value}</div>
        </div>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-gray-200/50 last:border-0">
            <div className="flex items-center gap-2 text-gray-500">
                {icon}
                <span className="text-[11px]">{label}</span>
            </div>
            <span className="text-[11px] font-semibold text-gray-700">{value}</span>
        </div>
    );
}

function LimitRow({ label, value, current }: { label: string; value: number; current?: number }) {
    const percentage = current ? Math.min(100, (current / value) * 100) : 0;
    return (
        <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500">{label}</span>
            <div className="flex items-center gap-2">
                {current !== undefined && (
                    <div className="w-12 h-1 rounded-full bg-gray-200 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${percentage > 90 ? 'bg-red-500' : percentage > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                )}
                <span className="text-[10px] font-bold text-gray-700">
                    {current !== undefined ? `${current}/${value}` : value}
                </span>
            </div>
        </div>
    );
}
