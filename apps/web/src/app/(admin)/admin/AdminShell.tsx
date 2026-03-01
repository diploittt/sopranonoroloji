"use client";

import React from "react";
import styles from "./admin.module.css";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";
import GodModePanel from "@/components/admin/GodModePanel";

export default function AdminShell({ children }: { children: React.ReactNode }) {
    return (
        <div className={styles.adminContainer}>
            <div className={styles.glassPanel}>
                <AdminSidebar />

                <main className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-[#0f111a]/40 to-transparent relative z-10 overflow-hidden">
                    <AdminTopbar />

                    <div className={`flex-1 overflow-y-auto p-8 space-y-8 ${styles.customScrollbar}`}>
                        {children}
                    </div>
                </main>

                <GodModePanel />
            </div>
        </div>
    );
}
