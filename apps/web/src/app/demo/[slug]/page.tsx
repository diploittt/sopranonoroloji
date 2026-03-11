"use client";

import { use } from 'react';
import { redirect } from 'next/navigation';

// /demo/[slug] → /room/[slug] yönlendirmesi
// Demo odası artık /room/ route'unda render ediliyor, aynı glassmorphism tasarımla
export default function DemoPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    redirect(`/room/${slug}`);
}
