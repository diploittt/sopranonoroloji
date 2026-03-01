"use client";

import { useAdminStore } from "@/lib/admin/store";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useEffect } from "react";

export default function ToastContainer() {
    const toasts = useAdminStore((state) => state.toasts);
    const removeToast = useAdminStore((state) => state.removeToast);

    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
                        pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-md animate-in zoom-in-95 fade-in duration-200 min-w-[300px] text-center justify-center
                        ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400/40 text-white shadow-[0_0_20px_rgba(16,185,129,0.5)]' : ''}
                        ${toast.type === 'error' ? 'bg-red-500/90 border-red-400/40 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]' : ''}
                        ${toast.type === 'info' ? 'bg-indigo-600/90 border-indigo-500/20 text-white' : ''}
                    `}
                >
                    {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-white" />}
                    {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-white" />}
                    {toast.type === 'info' && <Info className="w-5 h-5 text-white" />}

                    <span className="text-sm font-bold">{toast.message}</span>
                </div>
            ))}
        </div>
    );
}
