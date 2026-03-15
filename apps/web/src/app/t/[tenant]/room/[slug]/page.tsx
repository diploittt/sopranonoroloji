"use client";

import { use } from 'react';
import RoomPage from '@/app/room/[slug]/page';

// Tenant-specific room page — renders the SAME room UI as /room/[slug]
// but keeps the /t/[tenant]/room/[slug] URL intact so that useRoomRealtime
// correctly detects isTenantPage=true and uses soprano_tenant_token.
export default function TenantRoomPage({ params }: { params: Promise<{ tenant: string; slug: string }> }) {
    const { slug } = use(params);
    // Pass slug as a resolved Promise to RoomPage
    return <RoomPage params={Promise.resolve({ slug })} />;
}
