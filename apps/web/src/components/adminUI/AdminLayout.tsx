"use client";

import { LayoutDashboard, Users, Globe, Wallet, Server, PlusCircle, AlertCircle, Coins, Activity, List, Settings, ExternalLink, Power, Trash2, MicOff, ShieldAlert, Send } from 'lucide-react';

export default function AdminLayout() {
    return (
        <div className="app-background h-screen w-full flex items-center justify-center p-4 overflow-hidden text-slate-200">

            {/* Global Styles for this layout specifically if needed, but using globals.css classes */}
            <style jsx global>{`
                .logo-soprano {
                    background: linear-gradient(180deg, #ffffff 0%, #94a3b8 100%);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
                }
                .logo-admin {
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.4));
                }
                .stat-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 20px;
                    padding: 20px;
                    transition: all 0.3s;
                    position: relative;
                    overflow: hidden;
                }
                .stat-card:hover {
                    transform: translateY(-5px);
                    background: rgba(255,255,255,0.06);
                    border-color: rgba(255,255,255,0.1);
                }
                .stat-card::before {
                    content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%;
                    background: var(--card-color, #6366f1); opacity: 0.8;
                }
                .room-row {
                    background: rgba(255,255,255,0.02);
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    transition: all 0.2s;
                }
                .room-row:hover { background: rgba(255,255,255,0.05); }
                .room-row:last-child { border-bottom: none; }
            `}</style>

            <div className="glass-panel w-full max-w-[1500px] h-[90vh] rounded-[32px] flex overflow-hidden relative shadow-2xl">

                <aside className="w-72 flex-shrink-0 flex flex-col bg-[#0b0d14]/60 border-r border-white/5 z-20">

                    <div className="h-24 flex items-center px-8 border-b border-white/5 shrink-0">
                        <div className="flex flex-col justify-center">
                            <div className="text-[9px] font-bold tracking-[0.3em] text-gray-500 uppercase mb-1">Owner Panel</div>
                            <div className="text-3xl font-logo font-bold tracking-tight leading-none select-none flex items-center gap-1">
                                <span className="logo-soprano">Soprano</span>
                                <span className="logo-admin">Admin</span>
                            </div>
                        </div>
                    </div>

                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">

                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-4 py-2 mt-2">Genel Bakış</div>

                        <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-500/10 text-white border border-indigo-500/20 font-medium">
                            <LayoutDashboard className="w-5 h-5 text-indigo-400" />
                            Dashboard
                        </a>

                        <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition font-medium">
                            <Users className="w-5 h-5" />
                            Müşteriler & Bayiler
                        </a>

                        <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition font-medium">
                            <Globe className="w-5 h-5" />
                            Domain & Oda Yönetimi
                        </a>

                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-4 py-2 mt-4">Sistem & Finans</div>

                        <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition font-medium">
                            <Wallet className="w-5 h-5" />
                            Kasa & Ödemeler
                        </a>

                        <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition font-medium">
                            <Server className="w-5 h-5" />
                            Sunucu Ayarları
                        </a>

                    </nav>

                    <div className="p-6 border-t border-white/5 bg-[#08090c]/40">
                        <div className="flex items-center gap-3">
                            <img src="https://i.pravatar.cc/150?img=11" className="w-10 h-10 rounded-full border-2 border-amber-500/50" />
                            <div>
                                <div className="text-sm font-bold text-white">Soprano Owner</div>
                                <div className="text-[10px] text-amber-500">Root Administrator</div>
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-[#0f111a]/40 to-transparent relative z-10 overflow-hidden">

                    <header className="h-24 flex-shrink-0 border-b border-white/5 bg-[#0f111a]/60 backdrop-blur-md flex items-center justify-between px-8">
                        <div>
                            <h2 className="text-xl font-bold text-white">Domain & Sistem Kontrol</h2>
                            <p className="text-xs text-gray-500 mt-1">Sunucu Saati: 14:45 • Diyarbakır TR</p>
                        </div>

                        <div className="flex gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition">
                                <PlusCircle className="w-4 h-4" />
                                <span>Yeni Domain Ekle</span>
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition">
                                <AlertCircle className="w-4 h-4" />
                                <span>Sistemi Durdur</span>
                            </button>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">

                        <div className="grid grid-cols-4 gap-6">
                            <div className="stat-card" style={{ '--card-color': '#8b5cf6' } as React.CSSProperties}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-violet-500/20 rounded-lg text-violet-400"><Globe className="w-6 h-6" /></div>
                                    <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded">+2 Yeni</span>
                                </div>
                                <div className="text-3xl font-bold text-white">42</div>
                                <div className="text-[11px] text-gray-400 mt-1">Aktif Domain (Oda)</div>
                            </div>

                            <div className="stat-card" style={{ '--card-color': '#10b981' } as React.CSSProperties}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><Users className="w-6 h-6" /></div>
                                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">High Load</span>
                                </div>
                                <div className="text-3xl font-bold text-white">1,842</div>
                                <div className="text-[11px] text-gray-400 mt-1">Anlık Online Kullanıcı</div>
                            </div>

                            <div className="stat-card" style={{ '--card-color': '#f59e0b' } as React.CSSProperties}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400"><Coins className="w-6 h-6" /></div>
                                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">Bu Ay</span>
                                </div>
                                <div className="text-3xl font-bold text-white">₺ 45.2K</div>
                                <div className="text-[11px] text-gray-400 mt-1">Toplam Ciro</div>
                            </div>

                            <div className="stat-card" style={{ '--card-color': '#ef4444' } as React.CSSProperties}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-red-500/20 rounded-lg text-red-400"><Activity className="w-6 h-6" /></div>
                                    <span className="text-xs font-bold text-gray-400">CPU</span>
                                </div>
                                <div className="text-3xl font-bold text-white">%12</div>
                                <div className="text-[11px] text-gray-400 mt-1">Sunucu Yükü</div>
                            </div>
                        </div>

                        <div className="bg-[#0f111a]/60 border border-white/5 rounded-2xl overflow-hidden">
                            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <List className="w-4 h-4 text-indigo-400" /> Aktif Domain Listesi
                                </h3>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Domain veya Müşteri Ara..." className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-4 p-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-black/20">
                                <div className="col-span-3">Domain Adı</div>
                                <div className="col-span-2">Müşteri (Sahibi)</div>
                                <div className="col-span-2">Bitiş Tarihi</div>
                                <div className="col-span-2">Durum</div>
                                <div className="col-span-3 text-right">İşlemler</div>
                            </div>

                            <div className="grid grid-cols-12 gap-4 p-4 items-center room-row group">
                                <div className="col-span-3 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                        <Globe className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-sm">vocalvi.com</div>
                                        <div className="text-[10px] text-gray-500">Port: 8080 • ID: #001</div>
                                    </div>
                                </div>
                                <div className="col-span-2 text-sm text-gray-300">Sistem (Resmi)</div>
                                <div className="col-span-2 text-xs text-gray-400">Süresiz</div>
                                <div className="col-span-2">
                                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">AKTİF</span>
                                </div>
                                <div className="col-span-3 flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white" title="DNS Ayarları"><Settings className="w-4 h-4" /></button>
                                    <button className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-blue-400" title="Siteye Git"><ExternalLink className="w-4 h-4" /></button>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-4 p-4 items-center room-row group">
                                <div className="col-span-3 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-pink-500/20 flex items-center justify-center text-pink-400">
                                        <Globe className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-sm">damar.fm</div>
                                        <div className="text-[10px] text-gray-500">Port: 8082 • ID: #045</div>
                                    </div>
                                </div>
                                <div className="col-span-2 flex items-center gap-2">
                                    <img src="https://i.pravatar.cc/150?img=3" className="w-5 h-5 rounded-full" />
                                    <span className="text-sm text-gray-300">Ahmet Demir</span>
                                </div>
                                <div className="col-span-2 text-xs text-yellow-500 font-bold">3 Gün Kaldı</div>
                                <div className="col-span-2">
                                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">AKTİF</span>
                                </div>
                                <div className="col-span-3 flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button className="p-1.5 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/30 text-[10px] font-bold px-3">Uzat</button>
                                    <button className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-red-400" title="Kapat"><Power className="w-4 h-4" /></button>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-4 p-4 items-center room-row group opacity-60 hover:opacity-100">
                                <div className="col-span-3 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-gray-500/20 flex items-center justify-center text-gray-400">
                                        <Globe className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-400 text-sm line-through">sohbetmekani.net</div>
                                        <div className="text-[10px] text-gray-600">Port: 8090 • ID: #022</div>
                                    </div>
                                </div>
                                <div className="col-span-2 text-sm text-gray-500">Mehmet Vural</div>
                                <div className="col-span-2 text-xs text-red-500 font-bold">Süre Doldu</div>
                                <div className="col-span-2">
                                    <span className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20">PASİF</span>
                                </div>
                                <div className="col-span-3 flex justify-end gap-2">
                                    <button className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/30 text-[10px] font-bold px-3">Yenile</button>
                                    <button className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-red-400" title="Sil"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>

                        </div>

                    </div>
                </main>

                <aside className="w-80 flex-shrink-0 bg-[#0b0d14]/60 border-l border-white/5 flex flex-col z-20">

                    <div className="p-5 border-b border-white/5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">God Mode Kontrolleri</h3>

                        <div className="grid grid-cols-2 gap-3">
                            <button className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col items-center gap-2 hover:bg-red-500/20 transition group">
                                <MicOff className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-bold text-red-400">Global Mute</span>
                            </button>

                            <button className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center gap-2 hover:bg-amber-500/20 transition group">
                                <ShieldAlert className="w-6 h-6 text-amber-500 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-bold text-amber-400">Bakım Modu</span>
                            </button>
                        </div>

                        <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <div className="text-[10px] text-indigo-300 font-bold mb-2">SİSTEM DUYURUSU GÖNDER</div>
                            <div className="flex gap-2">
                                <input type="text" placeholder="Mesaj..." className="w-full bg-black/30 border border-white/10 rounded px-2 text-xs h-8 focus:outline-none" />
                                <button className="h-8 w-8 bg-indigo-600 rounded flex items-center justify-center hover:bg-indigo-500"><Send className="w-3 h-3 text-white" /></button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Son Hareketler</h3>

                        <div className="flex gap-3 items-start">
                            <div className="mt-1 w-2 h-2 rounded-full bg-green-500"></div>
                            <div>
                                <div className="text-xs text-white">Yeni Domain Eklendi</div>
                                <div className="text-[10px] text-gray-500">"damar.fm" - Ahmet D.</div>
                                <div className="text-[9px] text-gray-600 mt-0.5">2 dk önce</div>
                            </div>
                        </div>

                        <div className="flex gap-3 items-start">
                            <div className="mt-1 w-2 h-2 rounded-full bg-blue-500"></div>
                            <div>
                                <div className="text-xs text-white">Ödeme Alındı</div>
                                <div className="text-[10px] text-gray-500">500₺ - Kredi Kartı</div>
                                <div className="text-[9px] text-gray-600 mt-0.5">15 dk önce</div>
                            </div>
                        </div>

                        <div className="flex gap-3 items-start">
                            <div className="mt-1 w-2 h-2 rounded-full bg-red-500"></div>
                            <div>
                                <div className="text-xs text-white">Süre Doldu</div>
                                <div className="text-[10px] text-gray-500">sohbetmekani.net - Kapatıldı</div>
                                <div className="text-[9px] text-gray-600 mt-0.5">1 saat önce</div>
                            </div>
                        </div>

                    </div>

                </aside>

            </div>
        </div>
    );
}
