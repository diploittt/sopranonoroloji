"use client";

// Bu sayfa, tenant-scoped room URL'lerini destekler.
// /t/[tenant]/room/[slug] → mevcut RoomPage bileşenini yeniden kullanır.
// JWT'deki tenantId zaten doğru ayarlanmış olduğu için,
// sadece slug parametresini RoomPage'e iletmemiz yeterli.
// Token yoksa login sayfasına yönlendirir.

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import RoomPage from '@/app/room/[slug]/page';

export default function TenantRoomPage({ params }: { params: Promise<{ tenant: string; slug: string }> }) {
    const { tenant, slug } = use(params);
    const router = useRouter();
    const [isAuthed, setIsAuthed] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('soprano_tenant_token');
        if (!token) {
            // Token yok — login sayfasına yönlendir
            router.replace(`/t/${tenant}`);
            return;
        }
        setIsAuthed(true);
        setChecking(false);
    }, [router, tenant]);

    // Auth kontrolü sırasında loading göster
    if (checking || !isAuthed) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent"></div>
            </div>
        );
    }

    // tenant parametresi URL'de görüntüleme amaçlı — gerçek tenant JWT'den gelir
    // slug'ı RoomPage'e iletiyoruz
    const wrappedParams = Promise.resolve({ slug });
    return <RoomPage params={wrappedParams} />;
}
