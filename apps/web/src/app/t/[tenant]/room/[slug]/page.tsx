"use client";

// Bu sayfa, tenant-scoped room URL'lerini destekler.
// /t/[tenant]/room/[slug] → mevcut RoomPage bileşenini yeniden kullanır.
// JWT'deki tenantId zaten doğru ayarlanmış olduğu için,
// sadece slug parametresini RoomPage'e iletmemiz yeterli.
// Token yoksa login sayfasına yönlendirir.

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import RoomPage from '@/app/room/[slug]/page';

export default function TenantRoomPage({ params }: { params: Promise<{ tenant: string; slug: string }> }) {
    const router = useRouter();
    const routeParams = useParams<{ tenant: string; slug: string }>();
    const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('soprano_tenant_token');
        if (!token) {
            // Token yok — login sayfasına yönlendir
            router.replace(`/t/${routeParams.tenant}`);
            return;
        }
        setIsAuthed(true);
    }, [router, routeParams.tenant]);

    // Auth kontrolü sırasında loading göster
    if (isAuthed === null) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent"></div>
            </div>
        );
    }

    // Token var — RoomPage'i render et
    const wrappedParams = params.then(p => ({ slug: p.slug }));
    return <RoomPage params={wrappedParams} />;
}
