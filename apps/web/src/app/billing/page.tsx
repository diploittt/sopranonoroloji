
'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Copy, CreditCard } from 'lucide-react';

import { API_URL as API } from '@/lib/api';

function BillingContent() {
    const searchParams = useSearchParams();
    const tenantId = searchParams.get('tenant') || 'default';
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [paymentResponse, setPaymentResponse] = useState<any>(null);

    const handlePurchase = async (plan: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/billing/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenantId
                },
                body: JSON.stringify({ plan })
            });

            if (res.ok) {
                const data = await res.json();
                setPaymentResponse(data);
            } else {
                alert('Ödeme talebi oluşturulamadı.');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (paymentResponse) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-sans">
                <div className="bg-[#121216] border border-indigo-500/30 p-8 rounded-3xl max-w-lg w-full text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />

                    <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CreditCard className="w-8 h-8 text-indigo-500" />
                    </div>

                    <h2 className="text-2xl font-bold mb-2">Ödeme Talimatı</h2>
                    <p className="text-gray-400 mb-8">
                        Lütfen aşağıdaki IBAN numarasına <strong>{paymentResponse.amount} TL</strong> gönderiniz.
                        <br />
                        <span className="text-red-400 text-sm">Açıklama alanına kodu yazmayı unutmayınız!</span>
                    </p>

                    <div className="space-y-4 text-left">
                        <div className="bg-black/40 p-4 rounded-xl border border-white/10 group hover:border-white/20 transition-all">
                            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">IBAN</label>
                            <div className="flex justify-between items-center mt-1">
                                <div className="font-mono text-lg text-white tracking-wide">{paymentResponse.iban}</div>
                                <button className="text-gray-500 hover:text-white transition-colors" onClick={() => navigator.clipboard.writeText(paymentResponse.iban)}>
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="bg-black/40 p-4 rounded-xl border border-white/10 group hover:border-white/20 transition-all">
                            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Alıcı</label>
                            <div className="font-mono text-lg text-white">{paymentResponse.accountName}</div>
                        </div>

                        <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/30 group hover:border-indigo-500/50 transition-all">
                            <label className="text-xs text-indigo-400 uppercase font-bold tracking-wider">Açıklama (Kod)</label>
                            <div className="flex justify-between items-center mt-1">
                                <div className="font-mono text-xl font-bold text-indigo-300 tracking-wider">{paymentResponse.description}</div>
                                <button className="text-indigo-400 hover:text-indigo-200 transition-colors" onClick={() => navigator.clipboard.writeText(paymentResponse.description)}>
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 text-sm text-gray-500">
                        Ödemeniz kontrol edildikten sonra (1-2 saat) hesabınız otomatik olarak aktif olacaktır.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans p-8">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12 text-center">
                    <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Planlar & Fiyatlandırma</h1>
                    <p className="text-gray-400 text-lg">İhtiyacınıza en uygun paketi seçin, hemen başlayın.</p>
                </header>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* FREE */}
                    <div className="bg-[#121216] border border-white/5 rounded-3xl p-8 hover:border-zinc-700 transition-all flex flex-col">
                        <h3 className="text-xl font-bold mb-2 text-zinc-300">BAŞLANGIÇ</h3>
                        <div className="text-4xl font-bold mb-6">Ücretsiz</div>
                        <ul className="space-y-4 mb-8 text-gray-400 flex-1">
                            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-zinc-600" /> <span>50 Kişilik Kapasite</span></li>
                            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-zinc-600" /> <span>Standart Destek</span></li>
                            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-zinc-600" /> <span>Watermark Var</span></li>
                        </ul>
                        <button disabled className="w-full bg-white/5 text-gray-500 font-bold py-3 rounded-xl cursor-not-allowed">
                            Mevcut Plan
                        </button>
                    </div>

                    {/* PRO */}
                    <div className="bg-[#1c1c21] border border-indigo-500/30 rounded-3xl p-8 hover:border-indigo-500 transition-all flex flex-col relative transform hover:-translate-y-2 duration-300 shadow-2xl shadow-indigo-900/10">
                        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">POPÜLER</div>
                        <h3 className="text-xl font-bold mb-2 text-white">PRO</h3>
                        <div className="text-4xl font-bold mb-6">₺299<span className="text-base font-normal text-gray-500">/ay</span></div>
                        <ul className="space-y-4 mb-8 text-gray-300 flex-1">
                            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-indigo-500" /> <span>Watermark Yok</span></li>
                            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-indigo-500" /> <span>500 Kişilik Kapasite</span></li>
                            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-indigo-500" /> <span>Öncelikli Destek</span></li>
                            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-indigo-500" /> <span>Özel Arkaplan</span></li>
                        </ul>
                        <button
                            onClick={() => handlePurchase('pro')}
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                        >
                            {loading ? 'İşleniyor...' : 'Plan Satın Al'}
                        </button>
                    </div>

                    {/* ENTERPRISE */}
                    <div className="bg-[#121216] border border-white/5 rounded-3xl p-8 hover:border-purple-500/50 transition-all flex flex-col">
                        <h3 className="text-xl font-bold mb-2 text-white">ENTERPRISE</h3>
                        <div className="text-4xl font-bold mb-6">₺999<span className="text-base font-normal text-gray-500">/ay</span></div>
                        <ul className="space-y-4 mb-8 text-gray-400 flex-1">
                            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-purple-500" /> <span>Her Şey Sınırsız</span></li>
                            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-purple-500" /> <span>Özel Domain (CNAME)</span></li>
                            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-purple-500" /> <span>7/24 Özel Temsilci</span></li>
                            <li className="flex items-center gap-2"><CheckCircle size={16} className="text-purple-500" /> <span>SLA Garantisi</span></li>
                        </ul>
                        <button
                            onClick={() => handlePurchase('enterprise')}
                            disabled={loading}
                            className="w-full bg-white/10 hover:bg-purple-600 hover:text-white text-white font-bold py-3 rounded-xl transition-all"
                        >
                            {loading ? 'İşleniyor...' : 'Plan Satın Al'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function BillingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Yükleniyor...</div>}>
            <BillingContent />
        </Suspense>
    );
}
