import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, FlatList, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface EmojiPickerProps {
    onEmojiSelect?: (emoji: string) => void;
    onClose?: () => void;
}

const CATEGORIES = [
    { id: 'recent', label: '🕐', name: 'Son' },
    { id: 'smileys', label: '😀', name: 'İfadeler' },
    { id: 'people', label: '👤', name: 'İnsanlar' },
    { id: 'food', label: '🍕', name: 'Yiyecek' },
    { id: 'travel', label: '🚗', name: 'Seyahat' },
    { id: 'objects', label: '💡', name: 'Nesneler' },
    { id: 'symbols', label: '❤️', name: 'Semboller' },
    { id: 'flags', label: '🏳️', name: 'Bayraklar' },
];

const EMOJI_DATA: Record<string, string[]> = {
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🫢', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶', '🥴', '😵', '😵‍💫', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱'],
    people: ['👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👵', '🧓', '👴', '👲', '👮', '👷', '💂', '🕵️', '👩‍⚕️', '👩‍🎓', '👩‍💻', '👩‍🍳', '👩‍🎤', '👩‍🏫', '👩‍🎨', '👩‍✈️', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '💆', '💇', '🚶', '🧍', '🧎', '🏃', '💃', '🕺', '🧖', '🧗', '🤺', '🏇', '⛷️', '🏂', '🏋️', '🤸', '🤾', '🏊', '🚣', '🧘', '🛀', '🛌', '👭', '👫', '👬', '💏', '💑', '👪', '👨‍👩‍👦', '👨‍👩‍👧', '💐', '🌹'],
    food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🧀', '🥚', '🍳', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🍿', '🧈', '🍚', '🍜', '🍝', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍘', '🍥', '🥠', '🥮', '🍡', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍩', '🍪', '🌰', '🥜', '🍯'],
    travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '✈️', '🚀', '🛸', '🚁', '⛵', '🚢', '🏠', '🏡', '🏢', '🏣', '🏥', '🏦', '⛪', '🕌', '🏛️', '⛩️', '🗼', '🗽', '🗻', '🏕️', '🏖️', '🏜️', '🏝️', '🌋', '⛰️', '🗺️', '🧭', '🗿', '🏰', '🏯', '🎡', '🎢', '🎠', '⛲', '⛱️'],
    objects: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '🔦', '💡', '🕯️', '🪔', '🧯', '🗑️', '🛒', '🎁', '🎈', '🎀', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📅', '📆', '📇', '🗃️', '🗳️', '📋', '📁', '📂', '🗄️', '🗂️', '📰', '🗞️', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️'],
    symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅'],
    flags: ['🇹🇷', '🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️', '🇺🇸', '🇬🇧', '🇩🇪', '🇫🇷', '🇪🇸', '🇮🇹', '🇯🇵', '🇰🇷', '🇨🇳', '🇷🇺', '🇧🇷', '🇮🇳', '🇨🇦', '🇦🇺', '🇲🇽', '🇦🇷', '🇳🇱', '🇧🇪', '🇨🇭', '🇦🇹', '🇸🇪', '🇳🇴', '🇩🇰', '🇫🇮', '🇵🇹', '🇬🇷', '🇵🇱', '🇮🇪', '🇸🇦', '🇦🇪', '🇪🇬', '🇿🇦', '🇹🇭', '🇻🇳', '🇮🇩', '🇵🇭', '🇲🇾', '🇸🇬', '🇳🇿', '🇨🇱', '🇨🇴', '🇵🇪', '🇺🇦', '🇷🇴', '🇭🇺', '🇨🇿', '🇭🇷', '🇦🇿'],
};

const RECENT_KEY = 'soprano_recent_emojis';
const MAX_RECENT = 32;
const EMOJI_SIZE = 32;
const NUM_COLS = 8;

export default function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
    const [category, setCategory] = useState('smileys');
    const [search, setSearch] = useState('');
    const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

    // Load recent on mount
    React.useEffect(() => {
        AsyncStorage.getItem(RECENT_KEY).then(v => {
            if (v) try { setRecentEmojis(JSON.parse(v)); } catch { }
        }).catch(() => { });
    }, []);

    const handleSelect = useCallback((emoji: string) => {
        onEmojiSelect?.(emoji);
        // Save to recent
        setRecentEmojis(prev => {
            const updated = [emoji, ...prev.filter(e => e !== emoji)].slice(0, MAX_RECENT);
            AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated)).catch(() => { });
            return updated;
        });
    }, [onEmojiSelect]);

    const allEmojis = Object.values(EMOJI_DATA).flat();
    const displayEmojis = search
        ? allEmojis.filter(e => e.includes(search))
        : category === 'recent'
            ? recentEmojis
            : EMOJI_DATA[category] || [];

    return (
        <View style={s.container}>
            {/* Search */}
            <View style={s.searchRow}>
                <TextInput
                    style={s.searchInput}
                    placeholder="Emoji ara..."
                    placeholderTextColor="#4b5563"
                    value={search}
                    onChangeText={setSearch}
                />
                {onClose && (
                    <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                        <Text style={{ color: '#6b7280', fontSize: 14 }}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Category tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.categoryRow} contentContainerStyle={{ gap: 2, paddingHorizontal: 4 }}>
                {CATEGORIES.map(cat => (
                    <TouchableOpacity
                        key={cat.id}
                        style={[s.catBtn, category === cat.id && s.catBtnActive]}
                        onPress={() => { setCategory(cat.id); setSearch(''); }}
                    >
                        <Text style={{ fontSize: 16 }}>{cat.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Emoji grid */}
            <FlatList
                data={displayEmojis}
                keyExtractor={(item, i) => `${item}-${i}`}
                numColumns={NUM_COLS}
                contentContainerStyle={{ padding: 4 }}
                renderItem={({ item }) => (
                    <TouchableOpacity style={s.emojiBtn} onPress={() => handleSelect(item)}>
                        <Text style={{ fontSize: 24 }}>{item}</Text>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', padding: 20 }}>
                        <Text style={{ color: '#6b7280', fontSize: 12 }}>
                            {category === 'recent' ? 'Henüz kullanılan emoji yok' : 'Emoji bulunamadı'}
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { backgroundColor: '#0F1626', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', maxHeight: 320, overflow: 'hidden' },
    searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8, gap: 4 },
    searchInput: { flex: 1, height: 34, backgroundColor: '#10121b', borderRadius: 8, paddingHorizontal: 10, color: '#e5e7eb', fontSize: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    closeBtn: { width: 30, height: 30, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    categoryRow: { maxHeight: 38, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', marginTop: 4 },
    catBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
    catBtnActive: { backgroundColor: 'rgba(123,159,239,0.15)' },
    emojiBtn: { width: `${100 / NUM_COLS}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
});
