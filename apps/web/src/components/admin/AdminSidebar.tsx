"use client";

import styles from "../../app/(admin)/admin/admin.module.css";
import {
    LayoutDashboard,
    Users,
    Globe,
    Wallet,
    Server,
} from "lucide-react";

export default function AdminSidebar() {
    return (
        <aside className="w-72 flex-shrink-0 flex flex-col bg-[#0b0d14]/60 border-r border-white/5 z-20">
            <div className="h-24 flex items-center px-8 border-b border-white/5 shrink-0">
                <div className="flex flex-col justify-center">
                    <div className="text-[9px] font-bold tracking-[0.3em] text-gray-500 uppercase mb-1">
                        Owner Panel
                    </div>
                    <div className={`text-3xl font-bold tracking-tight leading-none select-none flex items-center gap-1 ${styles.fontLogo}`}>
                        <span className={styles.logoSoprano}>Soprano</span>
                        <span className={styles.logoAdmin}>Admin</span>
                    </div>
                </div>
            </div>

            <nav className={`flex-1 p-4 space-y-2 overflow-y-auto ${styles.customScrollbar}`}>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-4 py-2 mt-2">
                    Genel Bakış
                </div>

                <a
                    href="#"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-600/10 text-white border border-amber-600/20 font-medium"
                >
                    <LayoutDashboard className="w-5 h-5 text-[#7b9fef]" />
                    Dashboard
                </a>

                <a
                    href="#"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition font-medium"
                >
                    <Users className="w-5 h-5" />
                    Müşteriler & Bayiler
                </a>

                <a
                    href="#"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition font-medium"
                >
                    <Globe className="w-5 h-5" />
                    Domain & Oda Yönetimi
                </a>

                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-4 py-2 mt-4">
                    Sistem & Finans
                </div>

                <a
                    href="#"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition font-medium"
                >
                    <Wallet className="w-5 h-5" />
                    Kasa & Ödemeler
                </a>

                <a
                    href="#"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition font-medium"
                >
                    <Server className="w-5 h-5" />
                    Sunucu Ayarları
                </a>
            </nav>

            <div className="p-6 border-t border-white/5 bg-[#08090c]/40">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-full border-2 border-amber-500/50 flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', fontSize: 16, fontWeight: 900, color: 'rgba(245,158,11,0.8)' }}
                    >S</div>
                    <div>
                        <div className="text-sm font-bold text-white">Soprano Owner</div>
                        <div className="text-[10px] text-amber-500">
                            Root Administrator
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
