
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Clock } from 'lucide-react';

import { API_URL as API } from '@/lib/api';

function UpgradeContent() {
    const searchParams = useSearchParams();
    const tenantId = searchParams.get('tenant') || 'default';
    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetch(`${API}/subscriptions/my-request`, {
            headers: { 'x-tenant-id': tenantId }
        })
            .then(res => res.json())
            .then(data => setRequest(data))
            .catch(console.error);
    }, [tenantId]);

    const handleRequest = async (plan: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/subscriptions/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-tenant-id': tenantId
                },
                body: JSON.stringify({ plan })
            });
            if (res.ok) {
                const data = await res.json();
                setRequest(data);
            } else {
                alert('Talep oluşturulamadı. Bekleyen talebiniz olabilir.');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (request && request.status === 'pending') {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-sans">
                <div className="bg-[#121216] border border-yellow-500/30 p-8 rounded-3xl max-w-md text-center">
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-8 h-8 text-yellow-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Talep İnceleniyor</h2>
                    <p className="text-gray-400 mb-6">
                        <span className="text-white font-bold uppercase">{request.plan}</span> paketine geçiş talebiniz alındı.
                        Ödemeniz kontrol edildikten sonra (1-2 saat içinde) hesabınız otomatik olarak yükseltilecektir.
                    </p>
                    <div className="bg-black/40 p-4 rounded-xl text-sm font-mono text-gray-500">
                        Talep ID: {request.id}
                    </div>
                </div>
            </div>
        );
    }

    if (request && request.status === 'active') {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-sans">
                <div className="bg-[#121216] border border-green-500/30 p-8 rounded-3xl max-w-md text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Abonelik Aktif!</h2>
                    <p className="text-gray-400 mb-6">
                        Şu anda <span className="text-white font-bold uppercase">{request.plan}</span> paketini kullanıyorsunuz.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Plan Yükselt</h1>
                <p className="text-gray-400 mb-12">İşletmeniz için en uygun planı seçin.</p>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* PRO Plan */}
                    <div className="bg-[#121216] border border-white/5 rounded-3xl p-8 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <h3 className="text-xl font-bold mb-2">PRO</h3>
                        <div className="text-3xl font-bold mb-6">₺299<span className="text-base font-normal text-gray-500">/ay</span></div>
                        <ul className="space-y-3 mb-8 text-gray-400">
                            <li>✅ Watermark Yok</li>
                            <li>✅ 500 Kişilik Kapasite</li>
                            <li>✅ Öncelikli Destek</li>
                        </ul>

                        <div className="bg-black/40 p-4 rounded-xl border border-white/10 mb-6 font-mono text-sm text-gray-300">
                            <div className="opacity-50 text-xs mb-1">IBAN (Havale/EFT)</div>
                            TR12 0006 1000 0000 1234 5678 90
                            <div className="opacity-50 text-xs mt-2">Alıcı: Soprano Teknoloji A.Ş.</div>
                        </div>

                        <button
                            onClick={() => handleRequest('pro')}
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all"
                        >
                            {loading ? 'İşleniyor...' : 'Ödemeyi Yaptım, Talep Oluştur'}
                        </button>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="bg-[#121216] border border-white/5 rounded-3xl p-8 hover:border-purple-500/30 transition-all group relative overflow-hidden">
                        <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <h3 className="text-xl font-bold mb-2">ENTERPRISE</h3>
                        <div className="text-3xl font-bold mb-6">₺999<span className="text-base font-normal text-gray-500">/ay</span></div>
                        <ul className="space-y-3 mb-8 text-gray-400">
                            <li>✅ Özel Domain</li>
                            <li>✅ 5000+ Kişilik Kapasite</li>
                            <li>✅ 7/24 Özel Temsilci</li>
                        </ul>

                        <div className="bg-black/40 p-4 rounded-xl border border-white/10 mb-6 font-mono text-sm text-gray-300">
                            <div className="opacity-50 text-xs mb-1">IBAN (Havale/EFT)</div>
                            TR12 0006 1000 0000 1234 5678 90
                            <div className="opacity-50 text-xs mt-2">Alıcı: Soprano Teknoloji A.Ş.</div>
                        </div>

                        <button
                            onClick={() => handleRequest('enterprise')}
                            disabled={loading}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-all"
                        >
                            {loading ? 'İşleniyor...' : 'Ödemeyi Yaptım, Talep Oluştur'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function UpgradePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Yükleniyor...</div>}>
            <UpgradeContent />
        </Suspense>
    );
}
