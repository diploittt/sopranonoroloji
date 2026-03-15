"use client";

import React, { useState, useEffect } from 'react';
import { useDraggable } from '@/hooks/useDraggable';
import { Tenant } from '@/lib/admin/types';
import { useAdminStore } from '@/lib/admin/store';
import classNames from 'classnames';
import {
    X, Save, Loader2, CheckCircle, ShieldAlert, Copy,
    Calendar, Globe, Package, Users, Hash, CreditCard,
    Shield, Home, Lock, Unlock, Eye, EyeOff, RefreshCw, Key,
    Camera, CameraOff, Phone, Mail, Monitor
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

interface EditCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string | null;
}

export default function EditCustomerModal({ isOpen, onClose, clientId }: EditCustomerModalProps) {
    const tenants = useAdminStore((state) => state.tenants);
    const updateTenant = useAdminStore((state) => state.updateTenant);
    const loadInitialData = useAdminStore((state) => state.loadInitialData);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [rooms, setRooms] = useState<any[]>([]);
    const [origin, setOrigin] = useState('');

    useEffect(() => {
        setOrigin(window.location.origin);
    }, []);

    const [formData, setFormData] = useState({
        name: '',
        displayName: '',
        logoUrl: '',
        email: '',
        phone: '',
        domain: '',
        slug: '',
        plan: 'PRO' as string,
        status: 'ACTIVE' as string,
        roomLimit: 5,
        userLimitPerRoom: 30,
        packageType: 'CAMERA' as string,
        billingPeriod: 'MONTHLY' as string,
        expiresAt: '',
        isMeetingRoom: false,
        price: '',
        currency: 'TRY',
    });

    const [loading, setLoading] = useState(false);
    const { offset, handleMouseDown: onDragMouseDown, reset: resetDrag } = useDraggable();
    const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
    const [ownerInfo, setOwnerInfo] = useState<{ username: string; password?: string } | null>(null);
    const [godmasterInfo, setGodmasterInfo] = useState<{ username: string; email: string; password?: string } | null>(null);
    const [customLimit, setCustomLimit] = useState(false);
    const [isSystemTenant, setIsSystemTenant] = useState(false);

    useEffect(() => {
        if (isOpen && clientId) {
            let found = tenants.find(t => t.id === clientId);
            if (found) {
                setIsSystemTenant(false);
                applyTenantData(found);
            } else {
                // System tenant is excluded from store — fetch directly from API
                (async () => {
                    try {
                        const token = localStorage.getItem('soprano_admin_token');
                        const res = await fetch(`${API_URL}/admin/customers/system-tenant`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data && data.id === clientId) {
                                setIsSystemTenant(true);
                                applyTenantData(data);
                            }
                        }
                    } catch (e) {
                        console.error('Failed to fetch system tenant', e);
                    }
                })();
            }
        } else if (!isOpen) {
            setTenant(null);
            setRooms([]);
            setResetResult(null);
            setNewPassword('');
            setOwnerInfo(null);
            setGodmasterInfo(null);
            setCustomLimit(false);
            setIsSystemTenant(false);
            resetDrag();
        }
    }, [isOpen, clientId, tenants]);

    const applyTenantData = (found: any) => {
        setTenant(found);
        setFormData({
            name: found.name || '',
            displayName: found.displayName || '',
            logoUrl: found.logoUrl || '',
            email: (found as any).email || '',
            phone: found.phone || '',
            domain: found.domain || '',
            slug: found.slug || '',
            plan: found.plan || 'PRO',
            status: found.status || 'ACTIVE',
            roomLimit: found.roomLimit || 5,
            userLimitPerRoom: found.userLimitPerRoom || 30,
            packageType: found.packageType || 'CAMERA',
            billingPeriod: found.billingPeriod || 'MONTHLY',
            expiresAt: found.expiresAt ? found.expiresAt.split('T')[0] : '',
            isMeetingRoom: found.isMeetingRoom || false,
            price: (found as any).price || '',
            currency: (found as any).currency || 'TRY',
        });

        // Extract GodMaster info from included users (system tenant response)
        if (found.users && Array.isArray(found.users)) {
            const gm = found.users.find((u: any) => u.role === 'godmaster');
            if (gm) setGodmasterInfo({ username: gm.displayName, email: gm.email });
            const owner = found.users.find((u: any) => u.role === 'owner' || u.role === 'admin');
            if (owner) setOwnerInfo({ username: owner.displayName });
        }

        fetchRooms(found.id);

        // Auto-detect custom limit
        const limit = found.userLimitPerRoom || 30;
        if (![30, 55, 100].includes(limit)) setCustomLimit(true);
    };

    const fetchRooms = async (tenantId: string) => {
        try {
            const token = localStorage.getItem('soprano_admin_token');
            const res = await fetch(`${API_URL}/admin/customers/${tenantId}/rooms`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRooms(data);
            }
        } catch (e) {
            console.error("Failed to fetch rooms", e);
        }
    };

    const fetchOwnerInfo = async (tenantId: string) => {
        try {
            const token = localStorage.getItem('soprano_admin_token');
            const res = await fetch(`${API_URL}/admin/customers/${tenantId}/owner`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setOwnerInfo(data);
            }
        } catch (e) {
            console.error("Failed to fetch owner info", e);
        }
    };

    const handleSave = async () => {
        if (!tenant) return;
        setLoading(true);
        try {
            await updateTenant(tenant.id, {
                name: formData.name,
                displayName: formData.displayName,
                logoUrl: formData.logoUrl || null,
                email: formData.email,
                phone: formData.phone,
                domain: formData.domain,
                slug: formData.slug,
                plan: formData.plan as any,
                status: formData.status as any,
                roomLimit: formData.roomLimit,
                userLimitPerRoom: formData.userLimitPerRoom,
                packageType: formData.packageType as any,
                billingPeriod: formData.billingPeriod as any,
                expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
                isMeetingRoom: formData.isMeetingRoom,
                price: formData.price,
                currency: formData.currency,
                users: ownerInfo?.username ? [{ displayName: ownerInfo.username }] : undefined,
            } as any);
            // Reload all tenant data from backend so table reflects latest changes
            await loadInitialData();
            // System tenant is not included in loadInitialData — re-fetch and re-apply
            if (isSystemTenant) {
                try {
                    const token = localStorage.getItem('soprano_admin_token');
                    const res = await fetch(`${API_URL}/admin/customers/system-tenant`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        applyTenantData(data);
                    }
                } catch (e) {
                    console.error('Failed to refresh system tenant', e);
                }
            }
            showToast('success', 'Müşteri güncellendi');
        } catch (e: any) {
            showToast('error', e?.message || 'Güncelleme başarısız');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!tenant) return;
        try {
            const token = localStorage.getItem('soprano_admin_token');
            const res = await fetch(`${API_URL}/admin/customers/${tenant.id}/reset-admin-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password: newPassword || Math.random().toString(36).slice(-10) }),
            });
            if (res.ok) {
                const data = await res.json();
                setResetResult({ email: data.ownerEmail, password: data.newPassword });
                setOwnerInfo(prev => prev ? { ...prev, password: data.newPassword } : { username: data.ownerDisplayName || 'admin', password: data.newPassword });
                showToast('success', `Şifre sıfırlandı: ${data.newPassword}`);
            } else {
                showToast('error', 'Şifre sıfırlama başarısız');
            }
        } catch (e) {
            showToast('error', 'Şifre sıfırlama hatası');
        }
    };

    const handleResetGodmasterPassword = async () => {
        if (!tenant) return;
        try {
            const generatedPw = Math.random().toString(36).slice(-10);
            const token = localStorage.getItem('soprano_admin_token');
            const res = await fetch(`${API_URL}/admin/customers/${tenant.id}/reset-godmaster-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password: generatedPw }),
            });
            if (res.ok) {
                const data = await res.json();
                setGodmasterInfo(prev => prev ? { ...prev, password: data.newPassword } : null);
                showToast('success', `GodMaster şifresi sıfırlandı: ${data.newPassword}`);
            } else {
                showToast('error', 'GodMaster şifre sıfırlama başarısız');
            }
        } catch (e) {
            showToast('error', 'GodMaster şifre sıfırlama hatası');
        }
    };

    const showToast = (type: 'success' | 'error', msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3000);
    };

    const copyToClipboard = (text: string, label?: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label || 'copied');
        setTimeout(() => setCopied(null), 2000);
    };

    if (!isOpen || !tenant) return null;

    const entryLink = `${origin}/t/${tenant.accessCode || tenant.slug}`;
    const embedCode = `<iframe src="${origin}/embed/${tenant.slug}" width="100%" height="1000" frameborder="0" allow="camera; microphone; fullscreen; display-capture" style="border:none;border-radius:12px;max-width:1300px;"></iframe>`;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 fade-in duration-300"
                style={{
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 25%, transparent 55%), linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                    backdropFilter: 'blur(24px)',
                    borderRadius: 18,
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderTop: '1px solid rgba(255,255,255,0.35)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                    transform: `translate(${offset.x}px, ${offset.y}px)`,
                }}
                onClick={e => e.stopPropagation()}
            >


                {/* ─── Header — Metalik Bar ─── */}
                <div style={{ padding: '10px 20px', background: 'linear-gradient(180deg, #5a6070 0%, #3d4250 15%, #1e222e 50%, #282c3a 75%, #3a3f50 100%)', borderBottom: '1px solid rgba(0,0,0,0.5)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 6px rgba(0,0,0,0.3)' }} className="flex items-center justify-between cursor-grab active:cursor-grabbing select-none" onMouseDown={onDragMouseDown}>
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" style={{ color: '#fef3c7' }} />
                        <h2 style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>Müşteri Düzenle</h2>
                    </div>
                    <button onClick={onClose} className="owner-nav-btn" style={{ padding: 6, borderRadius: 8, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* ─── Body ─── */}
                <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: '20px 28px 28px' }}>
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">

                        {/* ═══════════ SOL KOLON: Form ═══════════ */}
                        <div className="space-y-6">

                            {/* ─── MÜŞTERİ BİLGİLERİ ─── */}
                            <div className="space-y-4">
                                <h3 style={{ fontSize: 10, fontWeight: 800, color: 'rgba(200,170,110,0.7)', textTransform: 'uppercase', letterSpacing: 2, borderBottom: '1px solid rgba(200,170,110,0.15)', paddingBottom: 8, marginBottom: 8 }} className="flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5" /> Müşteri Bilgileri
                                </h3>

                                {/* İsim */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-500 font-semibold">Müşteri Adı Soyadı *</label>
                                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] owner-input-inset">
                                        <Users className="w-4 h-4 text-gray-600" />
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                                            placeholder="Müşteri adı"
                                        />
                                    </div>
                                </div>

                                {/* Site / Platform Adı */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-500 font-semibold">Site / Platform Adı</label>
                                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-[10px] owner-input-inset">
                                        <Home className="w-4 h-4 text-gray-600" />
                                        <input
                                            type="text"
                                            value={formData.displayName}
                                            onChange={e => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                                            className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                                            placeholder="Örn: Murat'ın Mekanı, Damar FM..."
                                        />
                                    </div>
                                    <p className="text-[9px] text-gray-600">Müşterinin login sayfasında görünecek platform adı</p>
                                </div>

                                {/* Logo / Avatar Yükle */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-500 font-semibold">Logo / Avatar</label>
                                    <div className="flex items-center gap-3">
                                        {formData.logoUrl ? (
                                            <div className="relative group">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={formData.logoUrl} alt="Logo" className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                                                <button type="button" onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                                            </div>
                                        ) : (
                                            <div className="w-14 h-14 rounded-xl flex items-center justify-center border border-dashed border-white/10 text-gray-600">
                                                <Camera className="w-5 h-5" />
                                            </div>
                                        )}
                                        <label className="flex-1 cursor-pointer">
                                            <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-center hover:bg-white/[0.06] transition-colors">
                                                <span className="text-sm text-gray-400">{formData.logoUrl ? 'Değiştir' : 'Logo Yükle'}</span>
                                            </div>
                                            <input type="file" accept="image/*" className="hidden" onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                if (file.size > 1024 * 1024) { setToast({ type: 'error', msg: 'Logo 1MB\'dan küçük olmalı' }); return; }
                                                const reader = new FileReader();
                                                reader.onload = () => setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
                                                reader.readAsDataURL(file);
                                                e.target.value = '';
                                            }} />
                                        </label>
                                    </div>
                                    <p className="text-[9px] text-gray-600">Ana sayfada ve login sayfasında görünecek logo (maks 1MB)</p>
                                </div>

                                {/* E-Posta & Telefon */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] text-gray-500 font-semibold">E-Posta *</label>
                                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                            <Mail className="w-4 h-4 text-gray-600" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                                                placeholder="mail@example.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] text-gray-500 font-semibold">Telefon *</label>
                                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                            <Phone className="w-4 h-4 text-gray-600" />
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                                                placeholder="05XX XXX XX XX"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Domain */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-500 font-semibold">Domain Adresi *</label>
                                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                        <Globe className="w-4 h-4 text-gray-600" />
                                        <input
                                            type="text"
                                            value={formData.domain}
                                            onChange={e => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                                            className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                                            placeholder="example.com"
                                        />
                                    </div>
                                </div>

                                {/* Slug (salt okunur) */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-500 font-semibold">Slug (Erişim Kodu)</label>
                                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                                        <Hash className="w-4 h-4 text-gray-600" />
                                        <input
                                            type="text"
                                            value={formData.slug}
                                            readOnly
                                            className="flex-1 bg-transparent text-gray-400 text-sm focus:outline-none cursor-default"
                                        />
                                    </div>
                                    <p className="text-[9px] text-gray-600">URL'de kullanılan benzersiz tanımlayıcı (değiştirilemez)</p>
                                </div>

                                {/* Durum Değiştir */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-500 font-semibold">Hesap Durumu</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['ACTIVE', 'PASSIVE', 'SUSPENDED'] as const).map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setFormData(prev => ({ ...prev, status: s }))}
                                                className={classNames(
                                                    "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs transition border",
                                                    formData.status === s
                                                        ? s === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                                            : s === 'SUSPENDED' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                                                                : 'bg-red-500/10 text-red-400 border-red-500/30'
                                                        : 'bg-white/[0.03] text-gray-500 border-white/[0.08] hover:text-white'
                                                )}
                                            >
                                                <span className={classNames(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    s === 'ACTIVE' ? 'bg-green-400' : s === 'SUSPENDED' ? 'bg-orange-400' : 'bg-red-400'
                                                )} />
                                                {s === 'ACTIVE' ? 'Aktif' : s === 'SUSPENDED' ? 'Askıda' : 'Pasif'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ─── PAKET ÖZELLİKLERİ ─── */}
                            <div className="space-y-4">
                                <h3 style={{ fontSize: 10, fontWeight: 800, color: 'rgba(200,170,110,0.7)', textTransform: 'uppercase', letterSpacing: 2, borderBottom: '1px solid rgba(200,170,110,0.15)', paddingBottom: 8, marginBottom: 8 }} className="flex items-center gap-2">
                                    <Package className="w-3.5 h-3.5" /> Paket Özellikleri
                                </h3>

                                {/* Oda Sayısı & Kullanıcı Limiti */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] text-gray-500 font-semibold">Oda Sayısı</label>
                                        <input
                                            type="number"
                                            value={formData.roomLimit}
                                            onChange={e => setFormData(prev => ({ ...prev, roomLimit: parseInt(e.target.value) || 1 }))}
                                            className="w-full px-3 py-2.5 rounded-[10px] owner-input-inset text-white text-sm focus:outline-none transition"
                                            min={1}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] text-gray-500 font-semibold">Kullanıcı Limiti</label>
                                        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] rounded-xl p-1">
                                            {[30, 55, 100].map(val => (
                                                <button
                                                    key={val}
                                                    onClick={() => { setFormData(prev => ({ ...prev, userLimitPerRoom: val })); setCustomLimit(false); }}
                                                    className={classNames(
                                                        "flex-1 py-2 rounded-lg text-sm font-bold transition",
                                                        !customLimit && formData.userLimitPerRoom === val
                                                            ? "bg-amber-700 text-white"
                                                            : "text-gray-500 hover:text-white"
                                                    )}
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setCustomLimit(true)}
                                                className={classNames(
                                                    "flex-1 py-2 rounded-lg text-sm font-bold transition",
                                                    customLimit
                                                        ? "bg-amber-600 text-white"
                                                        : "text-gray-500 hover:text-white"
                                                )}
                                            >
                                                Özel
                                            </button>
                                        </div>
                                        {customLimit && (
                                            <input
                                                type="number"
                                                value={formData.userLimitPerRoom}
                                                onChange={e => setFormData(prev => ({ ...prev, userLimitPerRoom: Math.max(1, parseInt(e.target.value) || 1) }))}
                                                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-amber-500/30 text-white text-sm focus:border-amber-500/60 focus:outline-none transition mt-1"
                                                min={1}
                                                placeholder="Özel limit girin..."
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Kamera & Toplantı Modu Toggle */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div
                                        className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] cursor-pointer"
                                        onClick={() => setFormData(prev => ({ ...prev, packageType: prev.packageType === 'CAMERA' ? 'NO_CAMERA' : 'CAMERA' }))}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Camera className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-white font-medium">Kamera</span>
                                        </div>
                                        <div className={classNames(
                                            "w-10 h-5 rounded-full relative transition-all",
                                            formData.packageType === 'CAMERA' ? 'bg-green-500' : 'bg-gray-700'
                                        )}>
                                            <div className={classNames(
                                                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                                                formData.packageType === 'CAMERA' ? 'left-5' : 'left-0.5'
                                            )} />
                                        </div>
                                    </div>
                                    <div
                                        className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] cursor-pointer"
                                        onClick={() => setFormData(prev => ({ ...prev, isMeetingRoom: !prev.isMeetingRoom }))}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Monitor className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-white font-medium">Toplantı Modu</span>
                                        </div>
                                        <div className={classNames(
                                            "w-10 h-5 rounded-full relative transition-all",
                                            formData.isMeetingRoom ? 'bg-blue-500' : 'bg-gray-700'
                                        )}>
                                            <div className={classNames(
                                                "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
                                                formData.isMeetingRoom ? 'left-5' : 'left-0.5'
                                            )} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ─── ÖDEME BİLGİLERİ ─── */}
                            <div className="space-y-4">
                                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                    <CreditCard className="w-3.5 h-3.5" /> Ödeme Bilgileri
                                </h3>

                                {/* Aylık / Yıllık Toggle */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, billingPeriod: 'MONTHLY' }))}
                                        className={classNames(
                                            "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition border",
                                            formData.billingPeriod === 'MONTHLY'
                                                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                                : 'bg-white/[0.03] text-gray-500 border-white/[0.08] hover:text-white'
                                        )}
                                    >
                                        <Calendar className="w-4 h-4" /> Aylık
                                    </button>
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, billingPeriod: 'YEARLY' }))}
                                        className={classNames(
                                            "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition border",
                                            formData.billingPeriod === 'YEARLY'
                                                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                                : 'bg-white/[0.03] text-gray-500 border-white/[0.08] hover:text-white'
                                        )}
                                    >
                                        <Calendar className="w-4 h-4" /> Yıllık
                                    </button>
                                </div>

                                {/* Fiyat & Para Birimi */}
                                <div className="grid grid-cols-[1fr_120px] gap-3">
                                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                                        <span className="text-gray-600">{formData.currency === 'USD' ? '$' : formData.currency === 'EUR' ? '€' : '₺'}</span>
                                        <input
                                            type="text"
                                            value={formData.price}
                                            onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                            className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                                            placeholder="0"
                                        />
                                    </div>
                                    <select
                                        value={formData.currency}
                                        onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                                        className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-sm focus:outline-none"
                                    >
                                        <option value="TRY" style={{ background: '#1a1c2e', color: '#fff' }}>TRY</option>
                                        <option value="USD" style={{ background: '#1a1c2e', color: '#fff' }}>USD</option>
                                        <option value="EUR" style={{ background: '#1a1c2e', color: '#fff' }}>EUR</option>
                                    </select>
                                </div>

                                {/* Son Ödeme Tarihi */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] text-gray-500 font-semibold">Son Ödeme Tarihi</label>
                                    <input
                                        type="date"
                                        value={formData.expiresAt}
                                        onChange={e => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                                        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-sm focus:border-amber-600/50 focus:outline-none transition"
                                    />
                                </div>
                            </div>

                            {/* ─── Butonlar ─── */}
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    onClick={onClose}
                                    className="owner-btn-3d owner-btn-3d-white flex-1 px-4 py-3 rounded-[10px] text-xs font-bold uppercase tracking-wider"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="owner-btn-3d owner-btn-3d-green flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-[10px] text-xs font-bold uppercase tracking-wider disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    Değişiklikleri Kaydet
                                </button>
                            </div>
                        </div>

                        {/* ═══════════ SAİ KOLON: Kurulum Özeti ═══════════ */}
                        <div className="space-y-4">
                            <div className="p-5 rounded-2xl bg-[#0a0c14] border border-white/[0.06] space-y-5">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-[#7b9fef]" /> Kurulum Özeti
                                    </h3>
                                    <span className={classNames(
                                        "text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
                                        formData.status === 'ACTIVE'
                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                            : formData.status === 'SUSPENDED'
                                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                    )}>
                                        {formData.status === 'ACTIVE' ? 'AKTİF' : formData.status === 'SUSPENDED' ? 'ASKIDA' : 'PASİF'}
                                    </span>
                                </div>

                                {/* GİRİŞ LİNKİ */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Giriş Linki</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono truncate">
                                            {entryLink}
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(entryLink, 'link')}
                                            className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-gray-500 hover:text-white transition flex-shrink-0"
                                        >
                                            {copied === 'link' ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* EMBED KODU */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Embed Kodu (iframe)</label>
                                    <div className="relative">
                                        <div className="px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-gray-400 text-[10px] font-mono leading-relaxed max-h-24 overflow-auto custom-scrollbar">
                                            {embedCode}
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(embedCode, 'embed')}
                                            className="absolute top-2 right-2 p-1.5 rounded-md bg-white/[0.05] border border-white/[0.06] text-gray-500 hover:text-white transition"
                                        >
                                            {copied === 'embed' ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>

                                {/* MÜŞTERİ DOMAİN */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Müşteri Domain (Alias)</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                                            <Globe className="w-3.5 h-3.5 text-gray-600" />
                                            <span className="text-[11px] text-white font-medium">{formData.domain || 'Belirlenmedi'}</span>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(formData.domain, 'domain')}
                                            className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-gray-500 hover:text-white transition flex-shrink-0"
                                        >
                                            {copied === 'domain' ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-gray-600">Bu domain ilerde CNAME/alias ile bağlanacak</p>
                                </div>

                                {/* OWNER KULLANICI & ŞİFRE */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Owner Kullanıcı</label>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06] focus-within:border-amber-600/40 transition">
                                                <Users className="w-3 h-3 text-gray-600" />
                                                <input
                                                    type="text"
                                                    value={ownerInfo?.username || ''}
                                                    onChange={e => setOwnerInfo(prev => prev ? { ...prev, username: e.target.value } : { username: e.target.value })}
                                                    className="flex-1 bg-transparent text-[11px] text-white font-medium focus:outline-none min-w-0"
                                                    placeholder="admin"
                                                />
                                            </div>
                                            <button
                                                onClick={() => copyToClipboard(ownerInfo?.username || 'admin', 'owner')}
                                                className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-gray-500 hover:text-white transition flex-shrink-0"
                                            >
                                                {copied === 'owner' ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Owner Şifre</label>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-700/5 border border-amber-700/20 overflow-hidden">
                                                <Key className="w-3 h-3 text-[#7b9fef] flex-shrink-0" />
                                                <span className="text-[11px] text-[#7b9fef] font-mono font-medium truncate">{resetResult?.password || ownerInfo?.password || '••••••'}</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const pw = resetResult?.password || ownerInfo?.password;
                                                    if (pw) copyToClipboard(pw, 'password');
                                                    else handleResetPassword();
                                                }}
                                                className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-gray-500 hover:text-white transition flex-shrink-0"
                                                title={resetResult?.password || ownerInfo?.password ? 'Kopyala' : 'Şifre Sıfırla'}
                                            >
                                                {copied === 'password' ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* GODMASTER BİLGİLERİ (sistem tenant'ı ise) */}
                                {godmasterInfo && (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">GodMaster Kullanıcı</label>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/5 border border-rose-500/20">
                                                        <Shield className="w-3 h-3 text-rose-400" />
                                                        <span className="text-[11px] text-white font-medium truncate">{godmasterInfo.username}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(godmasterInfo.username, 'godmaster')}
                                                        className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-gray-500 hover:text-white transition flex-shrink-0"
                                                    >
                                                        {copied === 'godmaster' ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">GodMaster E-posta</label>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/5 border border-rose-500/20">
                                                        <Mail className="w-3 h-3 text-rose-400" />
                                                        <span className="text-[11px] text-rose-300 font-medium truncate">{godmasterInfo.email}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard(godmasterInfo.email, 'gm-email')}
                                                        className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-gray-500 hover:text-white transition flex-shrink-0"
                                                    >
                                                        {copied === 'gm-email' ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">GodMaster Şifre</label>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/5 border border-rose-500/20">
                                                        <Key className="w-3 h-3 text-rose-400" />
                                                        <span className="text-[11px] text-rose-300 font-mono font-medium truncate">{godmasterInfo.password || '••••••'}</span>
                                                    </div>
                                                    {godmasterInfo.password ? (
                                                        <button
                                                            onClick={() => copyToClipboard(godmasterInfo.password!, 'gm-pw')}
                                                            className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-gray-500 hover:text-white transition flex-shrink-0"
                                                            title="Kopyala"
                                                        >
                                                            {copied === 'gm-pw' ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                                        </button>
                                                    ) : null}
                                                    <button
                                                        onClick={handleResetGodmasterPassword}
                                                        className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 hover:text-rose-300 transition flex-shrink-0 text-[10px] font-bold border border-rose-500/20"
                                                        title="Yeni GodMaster Şifresi Üret"
                                                    >
                                                        <RefreshCw className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ─── Özet Tablosu ─── */}
                                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Oda Limiti:</span>
                                        <span className="text-white font-bold">{formData.roomLimit} Adet</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Kişi Başına:</span>
                                        <span className="text-white font-bold">{formData.userLimitPerRoom} Kişi</span>
                                    </div>
                                    <div className="flex justify-between text-xs items-center">
                                        <span className="text-gray-500">Özellikler:</span>
                                        <div className="flex items-center gap-1.5">
                                            {formData.packageType === 'CAMERA' && (
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20">Kamera</span>
                                            )}
                                            {formData.isMeetingRoom && (
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">Toplantı</span>
                                            )}
                                            <span className={classNames(
                                                "text-[9px] font-bold px-2 py-0.5 rounded-md border",
                                                formData.billingPeriod === 'MONTHLY'
                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    : 'bg-amber-700/10 text-[#7b9fef] border-amber-700/20'
                                            )}>
                                                {formData.billingPeriod === 'MONTHLY' ? 'Aylık' : 'Yıllık'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>

                {toast && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#121218] border border-white/10 px-4 py-2 rounded-full shadow-xl flex items-center gap-2 z-50 animate-in slide-in-from-bottom-5">
                        {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <ShieldAlert className="w-4 h-4 text-red-500" />}
                        <span className={classNames("text-xs font-bold", { "text-green-500": toast.type === 'success', "text-red-500": toast.type === 'error' })}>{toast.msg}</span>
                    </div>
                )}

            </div>
        </div>
    );
}
