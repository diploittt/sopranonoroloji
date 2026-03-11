"use client";

import { use } from 'react';
import dynamic from 'next/dynamic';

const HomePage = dynamic(() => import('@/app/home/HomePage'), { ssr: false });

export default function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    return <HomePage initialRoomsMode={true} initialSlug={slug} />;
}
