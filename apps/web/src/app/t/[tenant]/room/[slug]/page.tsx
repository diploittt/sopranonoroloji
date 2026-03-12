"use client";

import { use } from 'react';
import dynamic from 'next/dynamic';

const HomePage = dynamic(() => import('@/app/home/HomePage'), { ssr: false });

export default function TenantRoomPage({ params }: { params: Promise<{ tenant: string; slug: string }> }) {
    const { tenant, slug } = use(params);
    return <HomePage initialRoomsMode={true} initialSlug={slug} initialTenant={tenant} />;
}
