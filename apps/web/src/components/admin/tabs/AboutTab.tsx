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
        totalUsers: number;
        onlineUsers: number;
    };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    TRIAL: { label: 'Deneme', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    ACTIVE: { label: 'Aktif', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    SUSPENDED: { label: 'Askıda', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    CANCELLED: { label: 'İptal', color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20' },
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
                    <div className="w-10 h-10 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
                    <span className="text-xs text-gray-500">Bilgiler yükleniyor...</span>
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
                    <p className="text-sm text-red-400">{error || 'Bilgiler yüklenemedi'}</p>
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
                        <span className="text-[10px] text-gray-600 bg-white/[0.03] px-2.5 py-1 rounded-full border border-white/[0.06]">
                            v2.0.0
                        </span>
                    </div>
                </div>

                {/* ─── Müşteri Numarası (Öne çıkan kart) ─── */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-700/10 via-amber-600/5 to-amber-800/10 border border-amber-600/20 p-5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                            <Hash className="w-4 h-4 text-[#7b9fef]" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#7b9fef]/70">Müşteri Numarası</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-black text-white tracking-widest font-mono">
                                {customerCode}
                            </span>
                            <button
                                onClick={() => copyToClipboard(customerCode)}
                                className="px-2.5 py-1 rounded-lg bg-amber-600/10 hover:bg-amber-600/20 border border-amber-600/20 text-[10px] font-semibold text-[#7b9fef] transition-all duration-200"
                            >
                                {copied ? '✓ Kopyalandı' : 'Kopyala'}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2">Ödeme açıklamasına bu kodu yazınız</p>
                    </div>
                </div>

                {/* ─── Ödeme Bilgileri ─── */}
                {tenant.expiresAt && (
                    <div className={`rounded-xl border p-4 ${remaining?.urgent
                        ? 'bg-gradient-to-r from-red-600/10 to-orange-600/5 border-red-500/20'
                        : 'bg-white/[0.02] border-white/[0.06]'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${remaining?.urgent
                                    ? 'bg-red-500/10 text-red-400'
                                    : 'bg-emerald-500/10 text-emerald-400'
                                    }`}>
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Sonraki Ödeme Tarihi</div>
                                    <div className="text-sm font-bold text-white mt-0.5">{formatDate(tenant.expiresAt)}</div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                        {tenant.billingPeriod === 'YEARLY' ? '📆 Yıllık Ödeme' : '📅 Aylık Ödeme'}
                                    </div>
                                </div>
                            </div>
                            {remaining && (
                                <div className={`text-right ${remaining.urgent ? 'animate-pulse' : ''}`}>
                                    <div className={`text-2xl font-black ${remaining.urgent ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {remaining.days}
                                    </div>
                                    <div className={`text-[9px] font-semibold ${remaining.urgent ? 'text-red-400/70' : 'text-emerald-400/70'}`}>
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
                    <StatCard icon={<Home className="w-4 h-4" />} label="Toplam Oda" value={stats.totalRooms} color="purple" />
                </div>

                {/* ─── Paket ve Limitler ─── */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Paket Tipi */}
                    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Crown className="w-4 h-4 text-amber-400" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Paket</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-amber-400">{pkg.icon}</span>
                            <div>
                                <div className="text-sm font-bold text-white">{pkg.label}</div>
                                <div className="text-[10px] text-gray-500">{pkg.desc}</div>
                            </div>
                        </div>
                    </div>

                    {/* Limitler */}
                    <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Shield className="w-4 h-4 text-cyan-400" />
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
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Globe className="w-4 h-4 text-[#7b9fef]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Platform Bilgileri</span>
                    </div>
                    <div className="space-y-2">
                        <InfoRow icon={<LayoutGrid className="w-3.5 h-3.5" />} label="Site Adı" value={tenant.name} />
                        <InfoRow icon={<Globe className="w-3.5 h-3.5" />} label="Slug" value={tenant.slug} />
                        <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Kayıt Tarihi" value={formatDateTime(tenant.createdAt)} />
                        <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Platform" value="Next.js + NestJS + WebRTC" />
                    </div>
                </div>

                {/* ─── Destek ─── */}
                <div className="rounded-xl bg-gradient-to-r from-emerald-600/5 to-teal-600/5 border border-emerald-500/15 p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <Headphones className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-white">Canlı Destek</div>
                            <div className="text-[10px] text-gray-500">15:00 - 01:00 (GMT+3) • Her gün aktif</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-400">Çevrimiçi</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                        <a
                            href="https://wa.me/905520363674"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 transition-all cursor-pointer group"
                        >
                            <div className="p-1.5 rounded-lg bg-[#25D366]/20 text-[#25D366] group-hover:scale-110 transition-transform">
                                <MessageCircle className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">WhatsApp İletişim</div>
                                <div className="text-sm font-bold text-white">+90 552 036 36 74</div>
                            </div>
                            <span className="text-[10px] font-semibold text-[#25D366] opacity-0 group-hover:opacity-100 transition-opacity">Mesaj Gönder →</span>
                        </a>
                        <a
                            href="mailto:destek@sopranochat.com"
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 border border-amber-600/20 transition-all cursor-pointer group mt-2"
                        >
                            <div className="p-1.5 rounded-lg bg-amber-600/20 text-[#7b9fef] group-hover:scale-110 transition-transform">
                                <Mail className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">E-Posta</div>
                                <div className="text-sm font-bold text-white">destek@sopranochat.com</div>
                            </div>
                            <span className="text-[10px] font-semibold text-[#7b9fef] opacity-0 group-hover:opacity-100 transition-opacity">Mail Gönder →</span>
                        </a>
                    </div>
                </div>

                {/* ─── Footer ─── */}
                <div className="text-center pt-2 pb-4">
                    <p className="text-[10px] text-gray-600">© 2024 SopranoChat. Tüm hakları saklıdır.</p>
                </div>
            </div>
        </div >
    );
}

// ─── Alt Bileşenler ───

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    const colorMap: Record<string, string> = {
        indigo: 'from-amber-600/10 to-amber-700/5 border-amber-600/15 text-[#7b9fef]',
        emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/15 text-emerald-400',
        purple: 'from-amber-700/10 to-amber-800/5 border-amber-700/15 text-[#7b9fef]',
    };
    return (
        <div className={`rounded-xl bg-gradient-to-br border p-3.5 ${colorMap[color] || colorMap.indigo}`}>
            <div className="flex items-center gap-1.5 mb-2">
                {icon}
                <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">{label}</span>
            </div>
            <div className="text-2xl font-black text-white">{value}</div>
        </div>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
            <div className="flex items-center gap-2 text-gray-500">
                {icon}
                <span className="text-[11px]">{label}</span>
            </div>
            <span className="text-[11px] font-semibold text-gray-300">{value}</span>
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
                    <div className="w-12 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${percentage > 90 ? 'bg-red-400' : percentage > 60 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                )}
                <span className="text-[10px] font-bold text-gray-300">
                    {current !== undefined ? `${current}/${value}` : value}
                </span>
            </div>
        </div>
    );
}
