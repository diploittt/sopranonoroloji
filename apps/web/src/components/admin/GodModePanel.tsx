"use client";

import styles from "../../app/(admin)/admin/admin.module.css";
import { MicOff, ShieldAlert, Send } from "lucide-react";
import { useAdminStore } from "@/lib/admin/store";

export default function GodModePanel() {
    const maintenanceMode = useAdminStore((state) => state.maintenanceMode);
    const globalMute = useAdminStore((state) => state.globalMute);
    const toggleMaintenance = useAdminStore((state) => state.toggleMaintenance);
    const toggleGlobalMute = useAdminStore((state) => state.toggleGlobalMute);
    const addToast = useAdminStore((state) => state.addToast);
    const recentActivities = useAdminStore((state) => state.recentActivities);

    const handleBroadcast = () => {
        addToast("Sistem duyurusu gönderildi (Mock)", "info");
    };

    return (
        <aside className="w-80 flex-shrink-0 bg-[#0b0d14]/60 border-l border-white/5 flex flex-col z-20">
            <div className="p-5 border-b border-white/5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
                    God Mode Kontrolleri
                </h3>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={toggleGlobalMute}
                        className={`
                            p-3 rounded-xl border flex flex-col items-center gap-2 transition group
                            ${globalMute
                                ? 'bg-red-500/20 border-red-500 text-red-400'
                                : 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
                            }
                        `}
                    >
                        <MicOff className={`w-6 h-6 ${globalMute ? 'text-red-400' : 'text-red-500'} group-hover:scale-110 transition-transform`} />
                        <span className="text-[10px] font-bold text-red-400">
                            {globalMute ? 'Mute Aktif' : 'Global Mute'}
                        </span>
                    </button>

                    <button
                        onClick={toggleMaintenance}
                        className={`
                            p-3 rounded-xl border flex flex-col items-center gap-2 transition group
                            ${maintenanceMode
                                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                : 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'
                            }
                        `}
                    >
                        <ShieldAlert className={`w-6 h-6 ${maintenanceMode ? 'text-amber-400' : 'text-amber-500'} group-hover:scale-110 transition-transform`} />
                        <span className="text-[10px] font-bold text-amber-400">
                            {maintenanceMode ? 'Bakım Modu' : 'Bakım Modu'}
                        </span>
                    </button>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-amber-600/10 border border-amber-600/20">
                    <div className="text-[10px] text-[#a3bfff] font-bold mb-2">
                        SİSTEM DUYURUSU GÖNDER
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Mesaj..."
                            className="w-full bg-black/30 border border-white/10 rounded px-2 text-xs h-8 focus:outline-none text-white"
                        />
                        <button
                            className="h-8 w-8 bg-amber-700 rounded flex items-center justify-center hover:bg-amber-600"
                            onClick={handleBroadcast}
                        >
                            <Send className="w-3 h-3 text-white" />
                        </button>
                    </div>
                </div>
            </div>

            <div className={`flex-1 overflow-y-auto p-5 space-y-4 ${styles.customScrollbar}`}>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Son Hareketler
                </h3>

                {recentActivities.map((activity) => {
                    let color = "blue";
                    if (activity.type === "TENANT_CREATED") color = "green";
                    if (activity.type === "SYSTEM_ALERT") color = "red";

                    return (
                        <div key={activity.id} className="flex gap-3 items-start">
                            <div className={`mt-1 w-2 h-2 rounded-full bg-${color}-500`}></div>
                            <div>
                                <div className="text-xs text-white">{activity.type}</div>
                                <div className="text-[10px] text-gray-500">
                                    {activity.description}
                                </div>
                                <div className="text-[9px] text-gray-600 mt-0.5">{activity.timestamp}</div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </aside>
    );
}
