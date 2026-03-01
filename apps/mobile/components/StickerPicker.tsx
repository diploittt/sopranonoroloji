import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';

interface StickerPickerProps {
    onStickerSelect?: (sticker: string) => void;
    onClose?: () => void;
}

const CATEGORIES = [
    { id: 'popular', label: '⭐', name: 'Popüler' },
    { id: 'faces', label: '😀', name: 'İfadeler' },
    { id: 'animals', label: '🐱', name: 'Hayvanlar' },
    { id: 'food', label: '🍕', name: 'Yiyecek' },
    { id: 'love', label: '❤️', name: 'Aşk' },
    { id: 'reactions', label: '⚡', name: 'Tepkiler' },
    { id: 'spooky', label: '👻', name: 'Korku' },
    { id: 'fire', label: '🔥', name: 'Ateş' },
];

interface StickerItem { emoji: string; label: string; }

const STICKER_DATA: Record<string, StickerItem[]> = {
    popular: [
        { emoji: '😂', label: 'Gülen' }, { emoji: '❤️', label: 'Kalp' }, { emoji: '🔥', label: 'Ateş' },
        { emoji: '👍', label: 'Beğeni' }, { emoji: '😍', label: 'Aşk' }, { emoji: '🤣', label: 'Kahkaha' },
        { emoji: '😎', label: 'Cool' }, { emoji: '🥳', label: 'Parti' }, { emoji: '💯', label: '100' },
        { emoji: '🫡', label: 'Selam' }, { emoji: '🫶', label: 'Kalp El' }, { emoji: '🤝', label: 'El Sıkış' },
        { emoji: '🙏', label: 'Dua' }, { emoji: '✨', label: 'Parıltı' },
    ],
    faces: [
        { emoji: '😀', label: 'Mutlu' }, { emoji: '😃', label: 'Neşeli' }, { emoji: '😄', label: 'Gülümse' },
        { emoji: '😁', label: 'Sırıtış' }, { emoji: '😆', label: 'Kahkaha' }, { emoji: '😅', label: 'Terlemiş' },
        { emoji: '🤣', label: 'Yerde' }, { emoji: '😂', label: 'Gözyaşı' }, { emoji: '🙂', label: 'Hafif' },
        { emoji: '😉', label: 'Göz Kırp' }, { emoji: '😊', label: 'Utanmış' }, { emoji: '😇', label: 'Melek' },
        { emoji: '🤓', label: 'Nerd' }, { emoji: '🥸', label: 'Kılık' }, { emoji: '😎', label: 'Cool' },
        { emoji: '🤯', label: 'Patlama' }, { emoji: '🥳', label: 'Parti' },
    ],
    animals: [
        { emoji: '🐶', label: 'Köpek' }, { emoji: '🐱', label: 'Kedi' }, { emoji: '🐻', label: 'Ayı' },
        { emoji: '🐼', label: 'Panda' }, { emoji: '🐨', label: 'Koala' }, { emoji: '🦊', label: 'Tilki' },
        { emoji: '🦁', label: 'Aslan' }, { emoji: '🐯', label: 'Kaplan' }, { emoji: '🐮', label: 'İnek' },
        { emoji: '🐷', label: 'Domuz' }, { emoji: '🐸', label: 'Kurbağa' }, { emoji: '🐙', label: 'Ahtapot' },
        { emoji: '🦋', label: 'Kelebek' }, { emoji: '🐢', label: 'Kaplumbağa' }, { emoji: '🦄', label: 'Unicorn' },
    ],
    food: [
        { emoji: '🍕', label: 'Pizza' }, { emoji: '🍔', label: 'Hamburger' }, { emoji: '🌮', label: 'Taco' },
        { emoji: '🍟', label: 'Patates' }, { emoji: '🍜', label: 'Noodle' }, { emoji: '🍣', label: 'Suşi' },
        { emoji: '🍰', label: 'Pasta' }, { emoji: '🧁', label: 'Cupcake' }, { emoji: '🍩', label: 'Donut' },
        { emoji: '🍪', label: 'Kurabiye' }, { emoji: '☕', label: 'Kahve' }, { emoji: '🍺', label: 'Bira' },
        { emoji: '🍷', label: 'Şarap' }, { emoji: '🧃', label: 'Meyve Suyu' }, { emoji: '🥤', label: 'İçecek' },
    ],
    love: [
        { emoji: '❤️', label: 'Kırmızı' }, { emoji: '🧡', label: 'Turuncu' }, { emoji: '💛', label: 'Sarı' },
        { emoji: '💚', label: 'Yeşil' }, { emoji: '💙', label: 'Mavi' }, { emoji: '💜', label: 'Mor' },
        { emoji: '🤎', label: 'Kahve' }, { emoji: '🖤', label: 'Siyah' }, { emoji: '🤍', label: 'Beyaz' },
        { emoji: '💝', label: 'Hediye' }, { emoji: '💘', label: 'Ok' }, { emoji: '💕', label: 'Çift' },
        { emoji: '🫶', label: 'El Kalp' }, { emoji: '💋', label: 'Öpücük' }, { emoji: '🌹', label: 'Gül' },
    ],
    reactions: [
        { emoji: '👍', label: 'Beğeni' }, { emoji: '👎', label: 'Beğenme' }, { emoji: '👏', label: 'Alkış' },
        { emoji: '🙌', label: 'Eller' }, { emoji: '🤝', label: 'El Sıkış' }, { emoji: '💪', label: 'Güç' },
        { emoji: '✌️', label: 'Zafer' }, { emoji: '🤟', label: 'Rock' }, { emoji: '🤙', label: 'Ara' },
        { emoji: '🫡', label: 'Selam' }, { emoji: '🤷', label: 'Bilmem' }, { emoji: '🤦', label: 'Yüz' },
        { emoji: '👋', label: 'El Salla' }, { emoji: '🫰', label: 'Para' }, { emoji: '💯', label: 'Yüz' },
    ],
    spooky: [
        { emoji: '👻', label: 'Hayalet' }, { emoji: '💀', label: 'Kafatası' }, { emoji: '☠️', label: 'Tehlike' },
        { emoji: '👹', label: 'Şeytan' }, { emoji: '👺', label: 'Goblin' }, { emoji: '🤡', label: 'Palyaço' },
        { emoji: '🎃', label: 'Balkabağı' }, { emoji: '🕷️', label: 'Örümcek' }, { emoji: '🕸️', label: 'Ağ' },
        { emoji: '🦇', label: 'Yarasa' }, { emoji: '🐍', label: 'Yılan' }, { emoji: '🦂', label: 'Akrep' },
        { emoji: '⚡', label: 'Yıldırım' }, { emoji: '🔮', label: 'Kristal' }, { emoji: '🧿', label: 'Nazar' },
    ],
    fire: [
        { emoji: '🔥', label: 'Ateş' }, { emoji: '💥', label: 'Patlama' }, { emoji: '✨', label: 'Parıltı' },
        { emoji: '⚡', label: 'Şimşek' }, { emoji: '🌟', label: 'Yıldız' }, { emoji: '💫', label: 'Baş Dönme' },
        { emoji: '☄️', label: 'Kuyruklu' }, { emoji: '🌈', label: 'Gökkuşağı' }, { emoji: '🎆', label: 'Havai Fişek' },
        { emoji: '🎇', label: 'Maytap' }, { emoji: '💎', label: 'Elmas' }, { emoji: '🏆', label: 'Kupa' },
        { emoji: '👑', label: 'Taç' }, { emoji: '🛡️', label: 'Kalkan' }, { emoji: '⚔️', label: 'Kılıç' },
        { emoji: '🚀', label: 'Roket' }, { emoji: '💣', label: 'Bomba' },
    ],
};

const NUM_COLS = 5;

export default function StickerPicker({ onStickerSelect, onClose }: StickerPickerProps) {
    const [category, setCategory] = useState('popular');

    const stickers = STICKER_DATA[category] || [];

    return (
        <View style={s.container}>
            {/* Header */}
            <View style={s.headerRow}>
                <Text style={s.headerText}>Çıkartmalar</Text>
                {onClose && (
                    <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                        <Text style={{ color: '#6b7280', fontSize: 14 }}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Category tabs */}
            <View style={s.categoryRow}>
                {CATEGORIES.map(cat => (
                    <TouchableOpacity
                        key={cat.id}
                        style={[s.catBtn, category === cat.id && s.catBtnActive]}
                        onPress={() => setCategory(cat.id)}
                    >
                        <Text style={{ fontSize: 16 }}>{cat.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Sticker grid */}
            <FlatList
                data={stickers}
                keyExtractor={(item, i) => `${item.emoji}-${i}`}
                numColumns={NUM_COLS}
                contentContainerStyle={{ padding: 8 }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={s.stickerBtn}
                        onPress={() => onStickerSelect?.(item.emoji)}
                    >
                        <Text style={{ fontSize: 32 }}>{item.emoji}</Text>
                        <Text style={s.stickerLabel}>{item.label}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { backgroundColor: '#0F1626', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', maxHeight: 340, overflow: 'hidden' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    headerText: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
    closeBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    categoryRow: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    catBtn: { flex: 1, alignItems: 'center', paddingVertical: 4, borderRadius: 6 },
    catBtnActive: { backgroundColor: 'rgba(123,159,239,0.15)' },
    stickerBtn: { width: `${100 / NUM_COLS}%`, alignItems: 'center', paddingVertical: 8 },
    stickerLabel: { color: '#6b7280', fontSize: 9, marginTop: 2 },
});
