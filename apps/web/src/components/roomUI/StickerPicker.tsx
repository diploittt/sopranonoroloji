"use client";

import { useState } from 'react';
import { Star, Smile, Cat, Coffee, Heart, Flame, Ghost, Zap } from 'lucide-react';

interface StickerPickerProps {
    onStickerSelect?: (sticker: string) => void;
}

interface StickerItem {
    emoji: string;
    label: string;
}

const CATEGORIES = [
    { id: 'popular', icon: Star, label: 'Popüler' },
    { id: 'faces', icon: Smile, label: 'İfadeler' },
    { id: 'animals', icon: Cat, label: 'Hayvanlar' },
    { id: 'food', icon: Coffee, label: 'Yiyecek' },
    { id: 'love', icon: Heart, label: 'Aşk' },
    { id: 'reactions', icon: Zap, label: 'Tepkiler' },
    { id: 'spooky', icon: Ghost, label: 'Korku' },
    { id: 'fire', icon: Flame, label: 'Ateş' },
];

const STICKER_DATA: Record<string, StickerItem[]> = {
    popular: [
        { emoji: '😂', label: 'Gülen' }, { emoji: '❤️', label: 'Kalp' }, { emoji: '🔥', label: 'Ateş' },
        { emoji: '👍', label: 'Beğeni' }, { emoji: '🎉', label: 'Kutlama' }, { emoji: '😍', label: 'Aşık' },
        { emoji: '🤔', label: 'Düşünen' }, { emoji: '👀', label: 'Gözler' }, { emoji: '💯', label: 'Yüz' },
        { emoji: '🙌', label: 'Eller' }, { emoji: '😎', label: 'Cool' }, { emoji: '🥳', label: 'Parti' },
        { emoji: '💪', label: 'Güç' }, { emoji: '🤣', label: 'Yerlere' }, { emoji: '😱', label: 'Şok' },
        { emoji: '🫡', label: 'Selam' }, { emoji: '🫶', label: 'Kalp El' }, { emoji: '🤝', label: 'El Sıkış' },
        { emoji: '🙏', label: 'Dua' }, { emoji: '✨', label: 'Parıltı' },
    ],
    faces: [
        { emoji: '😀', label: 'Mutlu' }, { emoji: '😃', label: 'Neşeli' }, { emoji: '😄', label: 'Gülümse' },
        { emoji: '😁', label: 'Sırıtış' }, { emoji: '😆', label: 'Kahkaha' }, { emoji: '😅', label: 'Terlemiş' },
        { emoji: '🤣', label: 'Yerlere' }, { emoji: '🥲', label: 'Tatlı Ağla' }, { emoji: '😊', label: 'Utangaç' },
        { emoji: '😇', label: 'Melek' }, { emoji: '🥰', label: 'Sarılma' }, { emoji: '😍', label: 'Aşık' },
        { emoji: '😘', label: 'Öpücük' }, { emoji: '😜', label: 'Dil' }, { emoji: '🤪', label: 'Çılgın' },
        { emoji: '🤓', label: 'Nerd' }, { emoji: '🥸', label: 'Kılık' }, { emoji: '😎', label: 'Cool' },
        { emoji: '🤯', label: 'Patlama' }, { emoji: '🥳', label: 'Parti' },
    ],
    animals: [
        { emoji: '🐶', label: 'Köpek' }, { emoji: '🐱', label: 'Kedi' }, { emoji: '🐻', label: 'Ayı' },
        { emoji: '🐼', label: 'Panda' }, { emoji: '🐨', label: 'Koala' }, { emoji: '🦊', label: 'Tilki' },
        { emoji: '🦁', label: 'Aslan' }, { emoji: '🐯', label: 'Kaplan' }, { emoji: '🐸', label: 'Kurbağa' },
        { emoji: '🐧', label: 'Penguen' }, { emoji: '🐥', label: 'Civciv' }, { emoji: '🦋', label: 'Kelebek' },
        { emoji: '🐢', label: 'Kaplumbağ' }, { emoji: '🐙', label: 'Ahtapot' }, { emoji: '🦄', label: 'Unicorn' },
        { emoji: '🐬', label: 'Yunus' }, { emoji: '🦈', label: 'Köpekbalığı' }, { emoji: '🦅', label: 'Kartal' },
        { emoji: '🐝', label: 'Arı' }, { emoji: '🐞', label: 'Uğurböceği' },
    ],
    food: [
        { emoji: '🍕', label: 'Pizza' }, { emoji: '🍔', label: 'Hamburger' }, { emoji: '🌮', label: 'Taco' },
        { emoji: '🍟', label: 'Patates' }, { emoji: '🍜', label: 'Noodle' }, { emoji: '🍣', label: 'Suşi' },
        { emoji: '🍰', label: 'Pasta' }, { emoji: '🍩', label: 'Donut' }, { emoji: '🍪', label: 'Kurabiye' },
        { emoji: '🧁', label: 'Cupcake' }, { emoji: '🍫', label: 'Çikolata' }, { emoji: '🍿', label: 'Patlamış' },
        { emoji: '☕', label: 'Kahve' }, { emoji: '🧋', label: 'Boba' }, { emoji: '🍺', label: 'Bira' },
        { emoji: '🥤', label: 'İçecek' }, { emoji: '🍉', label: 'Karpuz' }, { emoji: '🍓', label: 'Çilek' },
        { emoji: '🥑', label: 'Avokado' }, { emoji: '🌶️', label: 'Biber' },
    ],
    love: [
        { emoji: '❤️', label: 'Kırmızı' }, { emoji: '🧡', label: 'Turuncu' }, { emoji: '💛', label: 'Sarı' },
        { emoji: '💚', label: 'Yeşil' }, { emoji: '💙', label: 'Mavi' }, { emoji: '💜', label: 'Mor' },
        { emoji: '🖤', label: 'Siyah' }, { emoji: '🤍', label: 'Beyaz' }, { emoji: '💔', label: 'Kırık' },
        { emoji: '💘', label: 'Ok Kalp' }, { emoji: '💝', label: 'Hediye' }, { emoji: '💖', label: 'Parlak' },
        { emoji: '💗', label: 'Büyüyen' }, { emoji: '💓', label: 'Atan' }, { emoji: '💞', label: 'Dönen' },
        { emoji: '💕', label: 'Çift' }, { emoji: '🫶', label: 'El Kalp' }, { emoji: '💋', label: 'Öpücük' },
        { emoji: '🌹', label: 'Gül' }, { emoji: '💐', label: 'Buket' },
    ],
    reactions: [
        { emoji: '👍', label: 'Beğeni' }, { emoji: '👎', label: 'Beğenme' }, { emoji: '👏', label: 'Alkış' },
        { emoji: '🙌', label: 'Eller' }, { emoji: '🤝', label: 'El Sıkış' }, { emoji: '💪', label: 'Güç' },
        { emoji: '✊', label: 'Yumruk' }, { emoji: '👊', label: 'Tokat' }, { emoji: '🫡', label: 'Selam' },
        { emoji: '🙏', label: 'Dua' }, { emoji: '✌️', label: 'Zafer' }, { emoji: '🤞', label: 'Şans' },
        { emoji: '🤟', label: 'Rock' }, { emoji: '🤘', label: 'Metal' }, { emoji: '🤙', label: 'Ara' },
        { emoji: '👋', label: 'El Salla' }, { emoji: '🫰', label: 'Para' }, { emoji: '🖕', label: 'Orta Prm' },
        { emoji: '💯', label: 'Yüz' }, { emoji: '‼️', label: 'Ünlem' },
    ],
    spooky: [
        { emoji: '👻', label: 'Hayalet' }, { emoji: '💀', label: 'Kafatası' }, { emoji: '☠️', label: 'Tehlike' },
        { emoji: '👹', label: 'Şeytan' }, { emoji: '👺', label: 'Goblin' }, { emoji: '🤡', label: 'Palyaço' },
        { emoji: '👽', label: 'Uzaylı' }, { emoji: '👾', label: 'Canavar' }, { emoji: '🤖', label: 'Robot' },
        { emoji: '🎃', label: 'Balkabağı' }, { emoji: '😈', label: 'İblis' }, { emoji: '👿', label: 'Kötü' },
        { emoji: '🕷️', label: 'Örümcek' }, { emoji: '🦇', label: 'Yarasa' }, { emoji: '🌙', label: 'Ay' },
        { emoji: '⚡', label: 'Yıldırım' }, { emoji: '🔮', label: 'Kristal' }, { emoji: '🧿', label: 'Nazar' },
        { emoji: '💩', label: 'Kaka' }, { emoji: '🫣', label: 'Korkak' },
    ],
    fire: [
        { emoji: '🔥', label: 'Ateş' }, { emoji: '💥', label: 'Patlama' }, { emoji: '✨', label: 'Parıltı' },
        { emoji: '⚡', label: 'Şimşek' }, { emoji: '🌟', label: 'Yıldız' }, { emoji: '💫', label: 'Baş Dönme' },
        { emoji: '☄️', label: 'Kuyruk Yıl' }, { emoji: '🌈', label: 'Gökkuşağı' }, { emoji: '🎆', label: 'Fişek' },
        { emoji: '🎇', label: 'Maytap' }, { emoji: '🎊', label: 'Konfeti' }, { emoji: '🎉', label: 'Kutlama' },
        { emoji: '🏆', label: 'Kupa' }, { emoji: '🥇', label: 'Altın' }, { emoji: '💎', label: 'Elmas' },
        { emoji: '👑', label: 'Taç' }, { emoji: '🛡️', label: 'Kalkan' }, { emoji: '⚔️', label: 'Kılıç' },
        { emoji: '🚀', label: 'Roket' }, { emoji: '💣', label: 'Bomba' },
    ],
};

export function StickerPicker({ onStickerSelect }: StickerPickerProps) {
    const [activeCategory, setActiveCategory] = useState('popular');

    const stickers = STICKER_DATA[activeCategory] || [];

    return (
        <div className="flex select-none" style={{ width: 440, height: 260 }}>
            {/* Sol: Kategori Tab'ları (dikey şerit) */}
            <div className="flex flex-col items-center gap-0.5 py-2 px-1" style={{ borderRight: '1px solid rgba(255,255,255,0.06)', width: 42 }}>
                {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex-shrink-0 p-1.5 rounded-lg transition-all duration-200 ${isActive
                                ? 'bg-pink-500/10 text-pink-400'
                                : 'text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]'
                                }`}
                            title={cat.label}
                        >
                            <Icon className="w-3.5 h-3.5" />
                        </button>
                    );
                })}
            </div>

            {/* Sağ: Sticker Grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Kategori başlığı */}
                <div className="px-3 py-1.5 flex items-center gap-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {CATEGORIES.find(c => c.id === activeCategory)?.label || ''}
                    </span>
                    <span className="text-[9px] text-pink-400/60 ml-auto font-bold">{stickers.length} sticker</span>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    <div className="grid grid-cols-5 gap-1.5">
                        {stickers.map((sticker, idx) => (
                            <button
                                key={`${sticker.emoji}-${idx}`}
                                onClick={() => onStickerSelect?.(sticker.emoji)}
                                className="group relative flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl transition-all duration-200 hover:scale-[1.08] active:scale-95"
                                style={{
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.04)',
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(236,72,153,0.06)'; e.currentTarget.style.borderColor = 'rgba(236,72,153,0.2)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; }}
                            >
                                <span className="text-[28px] leading-none group-hover:scale-110 transition-transform duration-300">
                                    {sticker.emoji}
                                </span>
                                <span className="text-[8px] font-semibold text-gray-600 group-hover:text-gray-400 transition-colors truncate max-w-full">
                                    {sticker.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
