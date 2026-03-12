/**
 * Cinsiyete uygun yerel avatar URL'i oluşturur.
 * Seed string'den deterministik bir index seçer (aynı isim → aynı avatar).
 * Erkek → male_1..4.png
 * Kadın → female_1..4.png
 * Belirsiz/Diğer → neutral_1..4.png
 */

const MALE_AVATARS = ['/avatars/male_1.png', '/avatars/male_2.png', '/avatars/male_3.png', '/avatars/male_4.png'];
const FEMALE_AVATARS = ['/avatars/female_1.png', '/avatars/female_2.png', '/avatars/female_3.png', '/avatars/female_4.png'];
const NEUTRAL_AVATARS = ['/avatars/neutral_1.png', '/avatars/neutral_2.png', '/avatars/neutral_3.png', '/avatars/neutral_4.png'];

function hashSeed(seed: string): number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0; // 32-bit int
    }
    return Math.abs(hash);
}

export function generateGenderAvatar(seed: string, gender?: string): string {
    const g = (gender || '').toLowerCase();
    const idx = hashSeed(seed) % 4;

    if (g === 'male' || g === 'erkek') {
        return MALE_AVATARS[idx];
    }
    if (g === 'female' || g === 'kadın' || g === 'kadin') {
        return FEMALE_AVATARS[idx];
    }
    return NEUTRAL_AVATARS[idx];
}
