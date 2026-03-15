"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OwnerPanel from "@/components/admin/OwnerPanel";
import ToastContainer from "@/components/ui/ToastContainer";

export default function AdminPage() {
    const router = useRouter();
    const [isAuthed, setIsAuthed] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const token = sessionStorage.getItem('soprano_admin_token');
        if (!token) {
            router.replace('/riconun-odasi');
            return;
        }
        // Validate token exists and user has admin role
        try {
            const userStr = sessionStorage.getItem('soprano_admin_user');
            if (userStr) {
                const user = JSON.parse(userStr);
                const allowedRoles = ['admin', 'superadmin', 'owner', 'godmaster'];
                if (!allowedRoles.includes(user?.role?.toLowerCase())) {
                    sessionStorage.removeItem('soprano_admin_token');
                    sessionStorage.removeItem('soprano_admin_user');
                    router.replace('/riconun-odasi');
                    return;
                }
            }
        } catch { /* ignore parse errors */ }
        setIsAuthed(true);
        setChecking(false);
    }, [router]);

    // Show nothing while checking auth
    if (checking || !isAuthed) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-rose-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <>
            <ToastContainer />
            <OwnerPanel />
        </>
    );
}
