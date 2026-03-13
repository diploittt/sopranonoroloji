"use client";

import React, { useState } from 'react';
import { X, CheckCircle, Copy, User, Mail, Phone, Globe, Server, Video, VideoOff, Users, CreditCard, ExternalLink, KeyRound, ShieldCheck, UserPlus, FileText, Home, Camera, PenLine } from 'lucide-react';
import { useAdminStore } from '@/lib/admin/store';
import { buildTenantUrls } from '@/lib/tenantUrlHelper';

interface NewClientModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function NewClientModal({ isOpen, onClose }: NewClientModalProps) {
    const addToast = useAdminStore((state) => state.addToast);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        displayName: '',
        roomName: '',
        logo: '',
        email: '',
        phone: '',
        domain: '',
        hostingType: 'sopranochat' as 'sopranochat' | 'own_domain',
        roomCount: 1,
        userLimit: '30',
        camera: 'true',
        meeting: 'false',
        amount: '',
        currency: 'TRY',
        billingPeriod: 'MONTHLY' as 'MONTHLY' | 'YEARLY',
    });

    // Result State
    const [isCreated, setIsCreated] = useState(false);
    const [resultData, setResultData] = useState({
        loginLink: '',
        embedCode: '',
        adminUser: '',
        adminPass: '',
        apiEndpoint: '',
        customerDomain: ''
    });

    const provisionCustomer = useAdminStore((state) => state.provisionCustomer);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!formData.name || !formData.email || !formData.phone || !formData.amount) {
            addToast('Lütfen tüm zorunlu alanları doldurun.', 'error');
            return;
        }
        if (formData.hostingType === 'own_domain' && (!formData.domain || !formData.domain.includes('.'))) {
            addToast('Geçerli bir domain adresi girin.', 'error');
            return;
        }

        try {
            const apiData = {
                name: formData.name,
                displayName: formData.displayName || undefined,
                roomName: formData.roomName || undefined,
                logo: formData.logo || undefined,
                adminName: 'admin',
                adminEmail: formData.email,
                adminPhone: formData.phone,
                domain: formData.hostingType === 'own_domain' ? formData.domain : undefined,
                hostingType: formData.hostingType,
                roomCount: formData.roomCount,
                userLimit: parseInt(formData.userLimit),
                cameraEnabled: formData.camera === 'true',
                plan: 'PRO',
                billingPeriod: formData.billingPeriod,
            };

            const result = await provisionCustomer(apiData as any);
            const slug = result.tenant.slug;

            const urls = buildTenantUrls({
                tenantSlug: slug,
                accessCode: result.tenant.accessCode || slug,
                customerDomain: formData.domain,
                webBaseUrl: window.location.origin
            });

            setResultData({
                loginLink: urls.loginLink,
                embedCode: urls.embedCode,
                adminUser: result.ownerUser?.displayName || 'admin',
                adminPass: result.ownerPassword || '',
                apiEndpoint: urls.apiEndpoint,
                customerDomain: urls.customerDomainAlias
            });

            setIsCreated(true);
            addToast('Müşteri başarıyla oluşturuldu!', 'success');
        } catch (error: any) {
            addToast(error.message || 'Müşteri oluşturulurken bir hata oluştu.', 'error');
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        addToast(`${label} kopyalandı`, 'success');
    };

    const inputClass = "w-full bg-black/30 border border-amber-600/15 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-600/50 transition placeholder:text-gray-600";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/15" onClick={onClose}></div>

            {/* Modal */}
            <div className="relative w-full max-w-5xl max-h-[90vh] animate-in zoom-in-95 fade-in duration-300 flex flex-col" style={{
                background: '#ffffff',
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                overflow: 'hidden',
            }}>


                {/* Header */}
                <div className="px-4 py-2.5 bg-[#1e293b] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-white" />
                        <h2 className="text-xs font-bold text-white">Yeni Müşteri Ekle</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-all">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: '20px 28px 28px' }}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

                        {/* LEFT: FORM */}
                        <div className={`space-y-6 transition-opacity duration-300 ${isCreated ? 'opacity-50 pointer-events-none' : ''}`}>

                            {/* Section: Client Info */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-[#7b9fef] uppercase tracking-wider border-b border-amber-600/10 pb-2 mb-4 flex items-center gap-2">
                                    <User className="w-3 h-3" /> Müşteri Bilgileri
                                </h3>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="group">
                                        <label className="text-xs text-gray-500 mb-1.5 block">Müşteri Adı Soyadı <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className={`${inputClass} pl-10`}
                                                placeholder="Örn: Ahmet Yılmaz"
                                            />
                                            <User className="w-4 h-4 text-gray-600 absolute left-3 top-3 group-focus-within:text-[#7b9fef] transition-colors" />
                                        </div>
                                    </div>

                                    {/* Site / Platform Adı */}
                                    <div className="group">
                                        <label className="text-xs text-gray-500 mb-1.5 block">Site / Platform Adı</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={formData.displayName}
                                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                                className={`${inputClass} pl-10`}
                                                placeholder="Müşterinin login sayfasında görünecek ad"
                                            />
                                            <Home className="w-4 h-4 text-gray-600 absolute left-3 top-3 group-focus-within:text-[#7b9fef] transition-colors" />
                                        </div>
                                        <p className="text-[9px] text-gray-600 mt-1">Login sayfasında görünecek platform adı</p>
                                    </div>

                                    {/* Oda İsmi */}
                                    <div className="group">
                                        <label className="text-xs text-gray-500 mb-1.5 block">Varsayılan Oda İsmi</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={formData.roomName}
                                                onChange={(e) => setFormData({ ...formData, roomName: e.target.value })}
                                                className={`${inputClass} pl-10`}
                                                placeholder="Örn: Sohbet Odası, Gurbetçiler..."
                                            />
                                            <PenLine className="w-4 h-4 text-gray-600 absolute left-3 top-3 group-focus-within:text-[#7b9fef] transition-colors" />
                                        </div>
                                        <p className="text-[9px] text-gray-600 mt-1">Ana sayfada ve odada görünecek isim (boş bırakılırsa "Oda 1")</p>
                                    </div>

                                    {/* Logo Yükleme */}
                                    <div className="group">
                                        <label className="text-xs text-gray-500 mb-1.5 block">Logo / Avatar</label>
                                        <div className="flex items-center gap-3">
                                            {formData.logo ? (
                                                <div className="relative group/logo">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={formData.logo} alt="Logo" className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                                                    <button type="button" onClick={() => setFormData({ ...formData, logo: '' })} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">&times;</button>
                                                </div>
                                            ) : (
                                                <div className="w-14 h-14 rounded-xl flex items-center justify-center border border-dashed border-white/10 text-gray-600">
                                                    <Camera className="w-5 h-5" />
                                                </div>
                                            )}
                                            <label className="flex-1 cursor-pointer">
                                                <div className={`${inputClass} text-center hover:bg-white/[0.06] transition-colors cursor-pointer`}>
                                                    <span className="text-sm text-gray-400">{formData.logo ? 'Değiştir' : 'Logo Yükle'}</span>
                                                </div>
                                                <input type="file" accept="image/*" className="hidden" onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    if (file.size > 1024 * 1024) { addToast('Logo 1MB\'dan küçük olmalı', 'error'); return; }
                                                    const reader = new FileReader();
                                                    reader.onload = () => setFormData(prev => ({ ...prev, logo: reader.result as string }));
                                                    reader.readAsDataURL(file);
                                                    e.target.value = '';
                                                }} />
                                            </label>
                                        </div>
                                        <p className="text-[9px] text-gray-600 mt-1">Ana sayfada ve login sayfasında görünecek logo (maks 1MB)</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="group">
                                            <label className="text-xs text-gray-500 mb-1.5 block">E-Posta <span className="text-rose-500">*</span></label>
                                            <div className="relative">
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    className={`${inputClass} pl-10`}
                                                    placeholder="mail@site.com"
                                                />
                                                <Mail className="w-4 h-4 text-gray-600 absolute left-3 top-3 group-focus-within:text-[#7b9fef] transition-colors" />
                                            </div>
                                        </div>
                                        <div className="group">
                                            <label className="text-xs text-gray-500 mb-1.5 block">Telefon <span className="text-rose-500">*</span></label>
                                            <div className="relative">
                                                <input
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    className={`${inputClass} pl-10`}
                                                    placeholder="555 123 4567"
                                                />
                                                <Phone className="w-4 h-4 text-gray-600 absolute left-3 top-3 group-focus-within:text-[#7b9fef] transition-colors" />
                                            </div>
                                        </div>
                                    </div>

                                </div>

                            </div>
                        </div>

                        {/* Section: Hosting Type */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-[#7b9fef] uppercase tracking-wider border-b border-amber-600/10 pb-2 mb-4 flex items-center gap-2">
                                <Globe className="w-3 h-3" /> Hosting Tercihi
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setFormData({ ...formData, hostingType: 'sopranochat', domain: '' })} className={`p-3 rounded-xl border text-left transition-all ${formData.hostingType === 'sopranochat'
                                    ? 'border-amber-600/40 bg-amber-600/10 shadow-[0_0_10px_rgba(99,102,241,0.15)]'
                                    : 'border-white/5 hover:border-white/15'
                                    }`} style={formData.hostingType !== 'sopranochat' ? { background: 'rgba(0,0,0,0.3)' } : undefined}>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${formData.hostingType === 'sopranochat' ? 'border-amber-600' : 'border-gray-600'}`}>
                                            {formData.hostingType === 'sopranochat' && <div className="w-1.5 h-1.5 rounded-full bg-amber-600"></div>}
                                        </div>
                                        <span className={`text-xs font-bold ${formData.hostingType === 'sopranochat' ? 'text-[#7b9fef]' : 'text-gray-500'}`}>SopranoChat</span>
                                    </div>
                                    <p className="text-[10px] text-gray-600 ml-5.5">sopranochat.com üzerinden</p>
                                </button>
                                <button type="button" onClick={() => setFormData({ ...formData, hostingType: 'own_domain' })} className={`p-3 rounded-xl border text-left transition-all ${formData.hostingType === 'own_domain'
                                    ? 'border-amber-700/40 bg-amber-700/10 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
                                    : 'border-white/5 hover:border-white/15'
                                    }`} style={formData.hostingType !== 'own_domain' ? { background: 'rgba(0,0,0,0.3)' } : undefined}>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${formData.hostingType === 'own_domain' ? 'border-amber-700' : 'border-gray-600'}`}>
                                            {formData.hostingType === 'own_domain' && <div className="w-1.5 h-1.5 rounded-full bg-amber-700"></div>}
                                        </div>
                                        <span className={`text-xs font-bold ${formData.hostingType === 'own_domain' ? 'text-[#7b9fef]' : 'text-gray-500'}`}>Kendi Domaini</span>
                                    </div>
                                    <p className="text-[10px] text-gray-600 ml-5.5">Embed ile kendi sitesi</p>
                                </button>
                            </div>
                            {formData.hostingType === 'own_domain' && (
                                <div className="group mt-2">
                                    <label className="text-xs text-gray-500 mb-1.5 block">Domain Adresi <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={formData.domain}
                                            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                            className={`${inputClass} pl-10`}
                                            placeholder="ornekdomain.com"
                                        />
                                        <Globe className="w-4 h-4 text-gray-600 absolute left-3 top-3 group-focus-within:text-[#7b9fef] transition-colors" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section: Package Info */}
                        <div className="space-y-4 pt-2">
                            <h3 className="text-xs font-bold text-[#7b9fef] uppercase tracking-wider border-b border-amber-600/10 pb-2 mb-4 flex items-center gap-2">
                                <Server className="w-3 h-3" /> Paket Özellikleri
                            </h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1.5 block">Oda Sayısı</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={formData.roomCount}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setFormData({ ...formData, roomCount: isNaN(val) ? 1 : val });
                                        }}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1.5 block">Kullanıcı Limiti</label>
                                    <div className="flex gap-2 items-center">
                                        <div className="flex p-1 rounded-xl border border-amber-600/15 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.3)' }}>
                                            <button
                                                onClick={() => setFormData({ ...formData, userLimit: '30' })}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${formData.userLimit === '30' ? 'bg-amber-700 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'text-gray-500 hover:text-white'}`}
                                            >30</button>
                                            <button
                                                onClick={() => setFormData({ ...formData, userLimit: '55' })}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${formData.userLimit === '55' ? 'bg-amber-700 text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'text-gray-500 hover:text-white'}`}
                                            >55</button>
                                        </div>
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                min="1"
                                                max="500"
                                                value={formData.userLimit}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFormData({ ...formData, userLimit: val });
                                                }}
                                                className={`${inputClass} text-center`}
                                                placeholder="Özel"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl border border-amber-600/10 flex items-center justify-between cursor-pointer hover:border-amber-600/30 transition" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setFormData({ ...formData, camera: formData.camera === 'true' ? 'false' : 'true' })}>
                                    <div className="flex items-center gap-2">
                                        {formData.camera === 'true' ? <Video className="w-4 h-4 text-green-500" /> : <VideoOff className="w-4 h-4 text-gray-500" />}
                                        <span className="text-sm text-gray-300">Kamera</span>
                                    </div>
                                    <div className={`w-10 h-5 rounded-full relative transition ${formData.camera === 'true' ? 'bg-green-500/20' : 'bg-gray-800'}`}>
                                        <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${formData.camera === 'true' ? 'bg-green-500 left-6' : 'bg-gray-500 left-1'}`}></div>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl border border-amber-600/10 flex items-center justify-between cursor-pointer hover:border-amber-600/30 transition" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setFormData({ ...formData, meeting: formData.meeting === 'true' ? 'false' : 'true' })}>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm text-gray-300">Toplantı Modu</span>
                                    </div>
                                    <div className={`w-10 h-5 rounded-full relative transition ${formData.meeting === 'true' ? 'bg-blue-500/20' : 'bg-gray-800'}`}>
                                        <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${formData.meeting === 'true' ? 'bg-blue-500 left-6' : 'bg-gray-500 left-1'}`}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Payment */}
                        <div className="space-y-4 pt-2">
                            <h3 className="text-xs font-bold text-[#7b9fef] uppercase tracking-wider border-b border-amber-600/10 pb-2 mb-4 flex items-center gap-2">
                                <CreditCard className="w-3 h-3" /> Ödeme Bilgileri
                            </h3>
                            <div className="flex gap-3 mb-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, billingPeriod: 'MONTHLY' })}
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition border ${formData.billingPeriod === 'MONTHLY'
                                        ? 'bg-green-500/15 border-green-500/40 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.15)]'
                                        : 'border-amber-600/10 text-gray-500 hover:border-amber-600/30'
                                        }`}
                                    style={formData.billingPeriod !== 'MONTHLY' ? { background: 'rgba(0,0,0,0.3)' } : undefined}
                                >
                                    📅 Aylık
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, billingPeriod: 'YEARLY' })}
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition border ${formData.billingPeriod === 'YEARLY'
                                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                                        : 'border-amber-600/10 text-gray-500 hover:border-amber-600/30'
                                        }`}
                                    style={formData.billingPeriod !== 'YEARLY' ? { background: 'rgba(0,0,0,0.3)' } : undefined}
                                >
                                    📆 Yıllık
                                </button>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1 relative">
                                    <input
                                        type="number"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className={`${inputClass} pl-8`}
                                        placeholder="Tutar"
                                    />
                                    <span className="absolute left-3 top-2.5 text-gray-500 text-sm">₺</span>
                                </div>
                                <select
                                    value={formData.currency}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                    className="w-24 bg-black/30 border border-amber-600/15 rounded-xl px-2 py-2.5 text-white text-sm outline-none focus:border-amber-600/50 transition"
                                >
                                    <option value="TRY">TRY</option>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                </select>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-4 flex gap-4">
                            <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-sm transition border border-white/10 text-gray-400 hover:text-white hover:bg-white/5">
                                İptal
                            </button>
                            <button onClick={handleGenerate} className="flex-[2] py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 text-white" style={{
                                background: 'linear-gradient(135deg, rgba(225,29,72,0.8), rgba(244,63,94,0.8))',
                                boxShadow: '0 0 20px rgba(225,29,72,0.3)',
                            }}>
                                <CheckCircle className="w-4 h-4" />
                                Müşteriyi Oluştur
                            </button>
                        </div>

                    </div>

                    {/* RIGHT: RESULT PANEL */}
                    <div className={`relative rounded-2xl border p-6 flex flex-col ${!isCreated ? 'opacity-50 grayscale border-white/5' : 'border-green-500/30'}`} style={{ background: 'rgba(0,0,0,0.3)' }}>

                        {!isCreated && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 backdrop-blur-[1px]" style={{ background: 'rgba(0,0,0,0.4)' }}>
                                <div className="text-center p-6">
                                    <ShieldCheck className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                                    <h3 className="text-gray-500 font-bold mb-1">Henüz Oluşturulmadı</h3>
                                    <p className="text-xs text-gray-600 max-w-[200px] mx-auto">Sol taraftaki formu doldurup "Oluştur" butonuna basınız.</p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <FileText className="w-4 h-4 text-green-500" /> Kurulum Özeti
                            </h3>
                            {isCreated && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded border border-green-500/30 font-bold uppercase tracking-wide">Aktif</span>}
                        </div>

                        <div className="space-y-5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                            {/* Giriş Linki */}
                            <div className="space-y-1">
                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Giriş Linki</label>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-black/30 border border-amber-600/10 rounded-lg px-3 py-2 text-xs text-blue-400 font-mono truncate">
                                        {resultData.loginLink || 'https://...'}
                                    </code>
                                    <button onClick={() => copyToClipboard(resultData.loginLink, 'Link')} disabled={!isCreated} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition disabled:opacity-50">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Embed Kodu */}
                            <div className="space-y-1">
                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Embed Kodu (Iframe)</label>
                                <div className="relative group">
                                    <textarea
                                        readOnly
                                        value={resultData.embedCode || '<iframe ...></iframe>'}
                                        className="w-full h-24 bg-black/30 border border-amber-600/10 rounded-lg p-3 text-[10px] text-gray-300 font-mono resize-none focus:outline-none focus:border-amber-600/50 transition leading-relaxed"
                                    ></textarea>
                                    <button onClick={() => copyToClipboard(resultData.embedCode, 'Embed Kodu')} disabled={!isCreated} className="absolute top-2 right-2 p-1.5 bg-amber-600/20 hover:bg-amber-600 text-[#7b9fef] hover:text-white rounded-md transition disabled:opacity-0">
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            {/* Müşteri Domain */}
                            <div className="space-y-1">
                                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Müşteri Domain (Alias)</label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-black/30 border border-amber-600/10 rounded-lg px-3 py-2 text-xs text-white font-mono truncate flex items-center gap-2">
                                        <Globe className="w-3 h-3 text-gray-500" />
                                        {resultData.customerDomain || 'domain.com'}
                                    </div>
                                    <button onClick={() => copyToClipboard(resultData.customerDomain, 'Müşteri Domain')} disabled={!isCreated} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition disabled:opacity-50">
                                        <Copy className="w-3 h-3" />
                                    </button>
                                </div>
                                <p className="text-[9px] text-gray-600 mt-1 italic">Bu domain ileride CNAME/alias ile bağlanacak</p>
                            </div>

                            {/* Admin Bilgileri */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Owner Kullanıcı</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-black/30 border border-amber-600/10 rounded-lg px-3 py-2 text-xs text-white font-mono truncate flex items-center gap-2">
                                            <User className="w-3 h-3 text-gray-500" />
                                            {resultData.adminUser || 'admin'}
                                        </div>
                                        <button onClick={() => copyToClipboard(resultData.adminUser, 'Kullanıcı Adı')} disabled={!isCreated} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition disabled:opacity-50">
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Owner Şifre</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-black/30 border border-amber-600/10 rounded-lg px-3 py-2 text-xs text-yellow-500 font-mono truncate flex items-center gap-2">
                                            <KeyRound className="w-3 h-3 text-gray-500" />
                                            {resultData.adminPass || '••••••••'}
                                        </div>
                                        <button onClick={() => copyToClipboard(resultData.adminPass, 'Şifre')} disabled={!isCreated} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition disabled:opacity-50">
                                            <Copy className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Özet */}
                            <div className="p-4 rounded-xl border border-amber-600/10 space-y-2" style={{ background: 'rgba(99,102,241,0.05)' }}>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Oda Limiti:</span>
                                    <span className="text-white font-medium">{formData.roomCount} Adet</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Kişi Başına:</span>
                                    <span className="text-white font-medium">{formData.userLimit} Kişi</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Özellikler:</span>
                                    <div className="flex gap-1">
                                        {formData.camera === 'true' && <span className="bg-green-500/20 text-green-400 px-1 py-0.5 rounded text-[10px]">Kamera</span>}
                                        {formData.meeting === 'true' && <span className="bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded text-[10px]">Toplantı</span>}
                                        <span className={`px-1 py-0.5 rounded text-[10px] ${formData.billingPeriod === 'YEARLY' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                                            {formData.billingPeriod === 'YEARLY' ? 'Yıllık' : 'Aylık'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

