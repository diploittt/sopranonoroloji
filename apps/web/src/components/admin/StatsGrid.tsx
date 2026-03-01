"use client";

import styles from "../../app/(admin)/admin/admin.module.css";
import { Globe, Users, Coins, Activity } from "lucide-react";
import { useAdminStore } from "@/lib/admin/store";
import { AdminStats } from "@/lib/admin/types";

export default function StatsGrid() {
    const stats = useAdminStore((state) => state.stats) as AdminStats;

    const statItems = [
        { label: 'Aktif Domain (Oda)', value: stats.activeRooms.toString(), subValue: '+2 Yeni', icon: Globe, color: '#8b5cf6', subColor: 'green' },
        { label: 'Anlık Online Kullanıcı', value: stats.totalUsers.toString(), subValue: 'High Load', icon: Users, color: '#10b981', subColor: 'emerald' },
        { label: 'Toplam Ciro', value: stats.revenue, subValue: 'Bu Ay', icon: Coins, color: '#f59e0b', subColor: 'amber' },
        { label: 'Sunucu Yükü', value: stats.serverLoad, subValue: 'CPU', icon: Activity, color: '#ef4444', subColor: 'gray' },
    ];

    return (
        <div className="grid grid-cols-4 gap-6">
            {statItems.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={index}
                        className={styles.statCard}
                        style={{ "--card-color": stat.color } as React.CSSProperties}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-2 rounded-lg text-${stat.subColor}-400 bg-${stat.subColor}-500/20`}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <span className={`text-xs font-bold text-${stat.subColor}-400 bg-${stat.subColor}-500/10 px-2 py-1 rounded`}>
                                {stat.subValue}
                            </span>
                        </div>
                        <div className="text-3xl font-bold text-white">{stat.value}</div>
                        <div className="text-[11px] text-gray-400 mt-1">
                            {stat.label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
