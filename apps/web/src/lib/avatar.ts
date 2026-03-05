/**
 * Cinsiyete uygun 3D karikatür avatar URL'i oluşturur.
 * Her cinsiyet için 3 farklı avatar varyantı mevcut.
 * seed parametresi ile deterministik seçim yapılır (aynı kullanıcı hep aynı avatarı alır).
 */

const MALE_AVATARS = [
    '/avatars/male_1.png',
    '/avatars/male_2.png',
    '/avatars/male_3.png',
];

const FEMALE_AVATARS = [
    '/avatars/female_1.png',
    '/avatars/female_2.png',
    '/avatars/female_3.png',
    '/avatars/female_4.png',
];

const NEUTRAL_AVATARS = [
    '/avatars/neutral_1.png',
    '/avatars/neutral_2.png',
    '/avatars/neutral_3.png',
    '/avatars/neutral_4.png',
];

/** Basit hash fonksiyonu — seed string'inden tutarlı bir index üretir */
function seedToIndex(seed: string, count: number): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // 32-bit integer
    }
    return Math.abs(hash) % count;
}

export function generateGenderAvatar(seed: string, gender?: string): string {
    const g = (gender || '').toLowerCase();
    if (g === 'male' || g === 'erkek') {
        return MALE_AVATARS[seedToIndex(seed, MALE_AVATARS.length)];
    }
    if (g === 'female' || g === 'kadın' || g === 'kadin') {
        return FEMALE_AVATARS[seedToIndex(seed, FEMALE_AVATARS.length)];
    }
    return NEUTRAL_AVATARS[seedToIndex(seed, NEUTRAL_AVATARS.length)];
}
