"use client";

import { useState, useEffect, useCallback } from 'react';
import { Clock, Smile, Cat, Coffee, Lightbulb, Flag, Heart, Music, Car, Trophy } from 'lucide-react';

interface EmojiPickerProps {
    onEmojiSelect?: (emoji: string) => void;
}

const CATEGORIES = [
    { id: 'recent', icon: Clock, label: 'Son Kullanılanlar' },
    { id: 'smileys', icon: Smile, label: 'İfadeler' },
    { id: 'love', icon: Heart, label: 'Aşk & Kalp' },
    { id: 'people', icon: Cat, label: 'İnsanlar & Hayvanlar' },
    { id: 'food', icon: Coffee, label: 'Yiyecek & İçecek' },
    { id: 'activity', icon: Trophy, label: 'Aktivite & Spor' },
    { id: 'travel', icon: Car, label: 'Seyahat' },
    { id: 'objects', icon: Lightbulb, label: 'Nesneler' },
    { id: 'symbols', icon: Music, label: 'Semboller' },
    { id: 'flags', icon: Flag, label: 'Bayraklar' },
];

const EMOJI_DATA: Record<string, string[]> = {
    smileys: [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
        '😘', '😗', '☺️', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
        '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
        '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕',
        '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭',
        '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️',
        '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾',
    ],
    love: [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
        '💝', '💘', '💌', '💋', '😍', '🥰', '😘', '😻', '💑', '👩‍❤️‍👨', '👨‍❤️‍👨', '👩‍❤️‍👩',
        '💏', '🫶', '🫂', '💐', '🌹', '🌷', '🌺', '🫀', '💟',
    ],
    people: [
        '👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👵', '🧓', '👴', '👲', '👮', '👷', '💂', '🕵️',
        '👩‍⚕️', '👨‍⚕️', '👩‍🎓', '👨‍🎓', '👩‍💻', '👨‍💻', '👩‍🍳', '👨‍🍳', '🧙', '🧚', '🧜', '🧝',
        '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈',
        '🙉', '🙊', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛',
        '🦋', '🐌', '🐞', '🐜', '🐢', '🐍', '🦎', '🦂', '🕷️', '🐙', '🦑', '🐠', '🐟', '🐡', '🐬', '🦈',
        '🐳', '🐋', '🐊', '🐅', '🐆', '🦍', '🐘', '🦏', '🦛', '🐪', '🐫', '🦒', '🦘', '🐃', '🦬',
    ],
    food: [
        '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥',
        '🥝', '🍅', '🥑', '🍆', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠',
        '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🫕', '🥣', '🥗',
        '🍿', '🧈', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍡', '🍢', '🍣', '🍤', '🍥', '🥟', '🥠',
        '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯',
        '☕', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🧊', '🫗', '🧃', '🥤',
    ],
    activity: [
        '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🏓', '🏸', '🏒', '🥅', '⛳', '🏏',
        '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🏋️', '🤸',
        '🤺', '🏇', '⛹️', '🤾', '🏊', '🚴', '🧘', '🏄', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎗️',
        '🎪', '🤹', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲',
        '♟️', '🎯', '🎳', '🎮', '🕹️', '🧩',
    ],
    travel: [
        '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜',
        '🏍️', '🛵', '🚲', '🛴', '🚏', '🛣️', '🛤️', '⛽', '🚨', '🚥', '🚦', '🛑', '🚧',
        '⛵', '🛶', '🚤', '🛳️', '⛴️', '🚢', '✈️', '🛩️', '🪂', '💺', '🚁', '🚀', '🛸',
        '🏠', '🏡', '🏢', '🏣', '🏥', '🏦', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰', '🗼', '🗽', '⛪', '🕌',
        '🌍', '🌎', '🌏', '🗺️', '🧭', '🏔️', '⛰️', '🌋', '🗻', '🏕️', '🏖️', '🏜️', '🏝️',
    ],
    objects: [
        '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '💽', '💾', '💿', '📀', '📷', '📸', '📹', '🎥',
        '📞', '☎️', '📺', '📻', '⏰', '🕰️', '⏱️', '🔋', '🔌', '💡', '🔦', '🕯️', '🧯', '🛢️',
        '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '🔩',
        '📦', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🗂️', '📅', '📆', '📇', '📈',
        '🔑', '🗝️', '🔒', '🔓', '🔏', '🔐', '🪪', '📎', '🖊️', '✏️', '🖍️', '📏', '📐',
    ],
    symbols: [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖',
        '💝', '💘', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💣', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤',
        '✅', '❌', '❓', '❗', '‼️', '⁉️', '⭕', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤',
        '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔘', '🔲', '🔳', '◼️', '◻️', '◾', '◽', '▪️', '▫️',
        '♠️', '♥️', '♦️', '♣️', '🃏', '🀄', '🎴', '⚠️', '☢️', '☣️', '🚫', '🔞', '📵',
        '♻️', '✳️', '❇️', '🔆', '🔅', '⚜️', '🔱', '🎵', '🎶', '〽️', '🔊', '🔔', '🔕',
    ],
    flags: [
        '🇹🇷', '🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️', '🇺🇸', '🇬🇧', '🇩🇪', '🇫🇷', '🇪🇸', '🇮🇹',
        '🇯🇵', '🇰🇷', '🇨🇳', '🇷🇺', '🇧🇷', '🇮🇳', '🇦🇺', '🇨🇦', '🇲🇽', '🇦🇷', '🇸🇦', '🇦🇪',
        '🇳🇱', '🇧🇪', '🇨🇭', '🇦🇹', '🇸🇪', '🇳🇴', '🇩🇰', '🇫🇮', '🇵🇱', '🇬🇷', '🇵🇹', '🇮🇪',
        '🇪🇬', '🇿🇦', '🇳🇬', '🇰🇪', '🇮🇱', '🇮🇷', '🇵🇰', '🇧🇩', '🇹🇭', '🇻🇳', '🇮🇩', '🇵🇭',
        '🇲🇾', '🇸🇬', '🇳🇿', '🇨🇱', '🇨🇴', '🇵🇪', '🇺🇦', '🇷🇴', '🇭🇺', '🇨🇿', '🇭🇷', '🇦🇿',
    ],
};

const RECENT_KEY = 'soprano-recent-emojis';
const MAX_RECENT = 32;

function getRecentEmojis(): string[] {
    try {
        const stored = localStorage.getItem(RECENT_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
}

function saveRecentEmoji(emoji: string) {
    try {
        const recent = getRecentEmojis().filter(e => e !== emoji);
        recent.unshift(emoji);
        localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
    } catch { /* ignore */ }
}

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
    const [activeCategory, setActiveCategory] = useState('smileys');
    const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

    useEffect(() => {
        setRecentEmojis(getRecentEmojis());
    }, []);

    const handleSelect = useCallback((emoji: string) => {
        saveRecentEmoji(emoji);
        setRecentEmojis(getRecentEmojis());
        onEmojiSelect?.(emoji);
    }, [onEmojiSelect]);

    const displayEmojis = activeCategory === 'recent' ? recentEmojis : (EMOJI_DATA[activeCategory] || []);

    return (
        <div className="flex select-none" style={{ width: 340, height: 210 }}>
            {/* Sol: Kategori Tab'ları (dikey şerit) */}
            <div className="flex flex-col items-center gap-0.5 py-2 px-1.5 overflow-y-auto no-scrollbar" style={{ borderRight: '1px solid #e2e8f0', width: 40 }}>
                {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex-shrink-0 p-1.5 rounded-lg transition-all duration-200 ${isActive
                                ? 'bg-blue-100 text-blue-600'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                }`}
                            title={cat.label}
                        >
                            <Icon className="w-3.5 h-3.5" />
                        </button>
                    );
                })}
            </div>

            {/* Sağ: Emoji Grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Kategori başlığı */}
                <div className="px-3 py-1.5 flex items-center gap-1.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {CATEGORIES.find(c => c.id === activeCategory)?.label || ''}
                    </span>
                    <span className="text-[9px] text-slate-400 ml-auto">{displayEmojis.length}</span>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-1.5">
                    {displayEmojis.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                            <span className="text-2xl">🔍</span>
                            <span className="text-[10px] font-medium">
                                {activeCategory === 'recent' ? 'Henüz kullanılan emoji yok' : 'Emoji bulunamadı'}
                            </span>
                        </div>
                    ) : (
                        <div className="grid gap-px" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
                            {displayEmojis.map((emoji, idx) => (
                                <button
                                    key={`${emoji}-${idx}`}
                                    onClick={() => handleSelect(emoji)}
                                    className="flex items-center justify-center text-[16px] rounded-md hover:bg-blue-50 transition-all duration-150 hover:scale-[1.2] active:scale-90"
                                    style={{ width: 24, height: 24 }}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
