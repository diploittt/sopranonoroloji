"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Video, Store, ExternalLink, Search } from "lucide-react";
import { API_URL } from "@/lib/api";

export default function PlatformsPage() {
    const router = useRouter();
    const [tenants, setTenants] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/admin/tenants/public`)
            .then(r => r.ok ? r.json() : [])
            .then(data => { if (Array.isArray(data)) setTenants(data); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const filtered = tenants
        .filter((t: any) => t.hostingType !== 'own_domain')
        .filter((t: any) => !search || (t.displayName || t.firstRoom?.name || t.name)?.toLowerCase().includes(search.toLowerCase()));

    const gradients = [
        'from-sky-500 to-indigo-600',
        'from-purple-500 to-pink-500',
        'from-emerald-500 to-teal-600',
        'from-amber-500 to-orange-600',
        'from-rose-500 to-red-600',
        'from-violet-500 to-fuchsia-600',
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <button onClick={() => router.push('/')} className="flex items-center gap-2 text-slate-600 hover:text-sky-600 font-bold transition-colors">
                        <ArrowLeft className="w-5 h-5" /> Ana Sayfa
                    </button>
                    <div className="flex items-center gap-2">
                        <Store className="w-5 h-5 text-sky-500" />
                        <span className="font-extrabold text-slate-800">Topluluk Platformları</span>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="relative py-16 px-6 overflow-hidden">
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-sky-100/50 rounded-full mix-blend-multiply blur-[80px]"></div>
                    <div className="absolute top-20 -right-20 w-[400px] h-[400px] bg-purple-100/50 rounded-full mix-blend-multiply blur-[80px]"></div>
                </div>
                <div className="max-w-7xl mx-auto relative z-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-4">
                        Topluluk <span style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Platformları</span>
                    </h1>
                    <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto mb-8">
                        SopranoChat altyapısıyla çalışan sohbet odalarına katılın. Her platform kendi benzersiz topluluğunu barındırır.
                    </p>
                    {/* Arama */}
                    <div className="max-w-md mx-auto relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Platform ara..."
                            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 shadow-lg shadow-slate-200/50 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all"
                        />
                    </div>
                </div>
            </section>

            {/* Grid */}
            <section className="max-w-7xl mx-auto px-6 pb-20">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-slate-400 mt-4 font-medium">Platformlar yükleniyor...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <Store className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-400 font-bold">
                            {search ? 'Aramanızla eşleşen platform bulunamadı.' : 'Henüz topluluk platformu yok.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filtered.map((t: any, idx: number) => {
                            const accessUrl = `/t/${t.accessCode || t.slug}`;
                            const grad = gradients[idx % gradients.length];
                            return (
                                <a
                                    key={t.id}
                                    href={accessUrl}
                                    className="group block rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-xl hover:shadow-sky-500/10 hover:-translate-y-1 hover:border-sky-200 transition-all duration-300 overflow-hidden"
                                >
                                    {/* Gradient Banner */}
                                    <div className={`h-20 bg-gradient-to-br ${grad} relative overflow-hidden`}>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-15">
                                            <Store className="w-16 h-16 text-white" />
                                        </div>
                                    </div>
                                    {/* Content */}
                                    <div className="p-5 -mt-6 relative">
                                        <div className="flex items-start gap-3 mb-3">
                                            {t.logoUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={t.logoUrl} alt={t.displayName || t.name} className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-md bg-white" />
                                            ) : (
                                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-lg shadow-md border-2 border-white`}>
                                                    {(t.displayName || t.firstRoom?.name || t.name)?.charAt(0)?.toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0 pt-2">
                                                <h3 className="font-bold text-slate-800 truncate group-hover:text-sky-600 transition-colors">{t.displayName || t.firstRoom?.name || t.name}</h3>
                                                <p className="text-[11px] text-slate-400 truncate">{t.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {t._count?.users || 0} üye</span>
                                                <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" /> {t._count?.rooms || 0} oda</span>
                                            </div>
                                            <div className="text-xs font-bold text-sky-600 bg-sky-50 px-3 py-1.5 rounded-full border border-sky-100 group-hover:bg-sky-600 group-hover:text-white transition-all flex items-center gap-1">
                                                Katıl <ExternalLink className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
