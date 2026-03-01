/**
 * Cinsiyete uygun DiceBear avataaars URL'i oluşturur.
 * Erkek → kısa saç, sakal olasılığı %40
 * Kadın → uzun saç, sakal yok
 */
export function generateGenderAvatar(seed: string, gender?: string): string {
    const base = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}&style=circle`;
    const g = (gender || '').toLowerCase();
    if (g === 'male' || g === 'erkek') {
        return `${base}&top=shortFlat,shortRound,shortWaved,shortCurly,theCaesar,theCaesarAndSidePart,sides,shavedSides,shaggyMullet,dreads01,frizzle&facialHairProbability=40`;
    }
    if (g === 'female' || g === 'kadın' || g === 'kadin') {
        return `${base}&top=bigHair,bob,bun,curly,curvy,longButNotTooLong,miaWallace,straight01,straight02,straightAndStrand,frida&facialHairProbability=0`;
    }
    return `${base}`;
}
