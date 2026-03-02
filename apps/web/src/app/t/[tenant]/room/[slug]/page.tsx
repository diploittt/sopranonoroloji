"use client";

// Bu sayfa, tenant-scoped room URL'lerini destekler.
// /t/[tenant]/room/[slug] → mevcut RoomPage bileşenini yeniden kullanır.
// JWT'deki tenantId zaten doğru ayarlanmış olduğu için,
// sadece slug parametresini RoomPage'e iletmemiz yeterli.

import RoomPage from '@/app/room/[slug]/page';

export default function TenantRoomPage({ params }: { params: Promise<{ tenant: string; slug: string }> }) {
    // tenant parametresi URL'de görüntüleme amaçlı — gerçek tenant JWT'den gelir
    // slug'ı RoomPage'e iletiyoruz
    const wrappedParams = params.then(p => ({ slug: p.slug }));
    return <RoomPage params={wrappedParams} />;
}
