"use client";

import { useState, useEffect, useCallback } from 'react';
import { Search, Clock, Smile, Cat, Coffee, Lightbulb, Flag, Heart, Music, Car, Trophy } from 'lucide-react';

interface EmojiPickerProps {
    onEmojiSelect?: (emoji: string) => void;
}

const CATEGORIES = [
    { id: 'recent', icon: Clock, label: 'Son Kullanılanlar', color: 'text-amber-400' },
    { id: 'smileys', icon: Smile, label: 'İfadeler', color: 'text-yellow-400' },
    { id: 'love', icon: Heart, label: 'Aşk & Kalp', color: 'text-pink-400' },
    { id: 'people', icon: Cat, label: 'İnsanlar & Hayvanlar', color: 'text-orange-400' },
    { id: 'food', icon: Coffee, label: 'Yiyecek & İçecek', color: 'text-emerald-400' },
    { id: 'activity', icon: Trophy, label: 'Aktivite & Spor', color: 'text-cyan-400' },
    { id: 'travel', icon: Car, label: 'Seyahat', color: 'text-blue-400' },
    { id: 'objects', icon: Lightbulb, label: 'Nesneler', color: 'text-violet-400' },
    { id: 'symbols', icon: Music, label: 'Semboller', color: 'text-[#7b9fef]' },
    { id: 'flags', icon: Flag, label: 'Bayraklar', color: 'text-red-400' },
];

const EMOJI_DATA: Record<string, string[]> = {
    smileys: [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
        '😘', '😗', '☺️', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
        '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
        '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕',
        '😟', '🙁', 'â˜️', '😮', '😯', '😲', '😳', '🥺', '🥹', '😦', '😧', '😨', '😰', '😥', '😢', '😭',
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
        '🤺', '🏇', 'â›️', '🤾', '🏊', '🚴', '🧘', '🏄', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎗️',
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

// Flatten all emojis for search
const ALL_EMOJIS = Object.values(EMOJI_DATA).flat();

export function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
    const [activeCategory, setActiveCategory] = useState('smileys');
    const [searchQuery, setSearchQuery] = useState('');
    const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

    useEffect(() => {
        setRecentEmojis(getRecentEmojis());
    }, []);

    const handleSelect = useCallback((emoji: string) => {
        saveRecentEmoji(emoji);
        setRecentEmojis(getRecentEmojis());
        onEmojiSelect?.(emoji);
    }, [onEmojiSelect]);

    const displayEmojis = searchQuery
        ? ALL_EMOJIS.filter(e => e.includes(searchQuery))
        : (activeCategory === 'recent' ? recentEmojis : (EMOJI_DATA[activeCategory] || []));

    return (
        <div className="w-[320px] h-[370px] flex flex-col select-none">
            {/* Search */}
            <div className="px-4 pt-3 pb-2">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 group-focus-within:text-[#7b9fef] transition-colors duration-200" />
                    <input
                        type="text"
                        placeholder="Emoji ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/[0.04] text-white text-[13px] rounded-xl py-2.5 pl-9 pr-4 border border-white/[0.08] focus:border-amber-600/40 focus:bg-white/[0.06] focus:outline-none transition-all duration-200 placeholder:text-gray-600"
                    />
                </div>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-0.5 px-3 pb-2 overflow-x-auto no-scrollbar">
                {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); }}
                            className={`flex-shrink-0 p-2 rounded-lg transition-all duration-200 ${isActive
                                ? `bg-white/[0.08] ${cat.color} shadow-sm`
                                : 'text-gray-600 hover:text-gray-400 hover:bg-white/[0.04]'
                                }`}
                            title={cat.label}
                        >
                            <Icon className="w-4 h-4 mx-auto" />
                        </button>
                    );
                })}
            </div>

            {/* Divider */}
            <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

            {/* Emoji Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2">
                {displayEmojis.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
                        <span className="text-3xl">🔍</span>
                        <span className="text-xs font-medium">
                            {activeCategory === 'recent' ? 'Henüz kullanılan emoji yok' : 'Emoji bulunamadı'}
                        </span>
                    </div>
                ) : (
                    <div className="grid grid-cols-9 gap-px">
                        {displayEmojis.map((emoji, idx) => (
                            <button
                                key={`${emoji}-${idx}`}
                                onClick={() => handleSelect(emoji)}
                                className="w-[31px] h-[31px] flex items-center justify-center text-[17px] rounded-lg hover:bg-white/[0.08] transition-all duration-150 hover:scale-[1.15] active:scale-90"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-white/[0.05] flex items-center justify-between">
                <span className="text-[10px] text-gray-600 font-medium">
                    {displayEmojis.length} emoji
                </span>
                <span className="text-[10px] text-amber-600/50 font-bold tracking-wider">
                    SOPRANO
                </span>
            </div>
        </div>
    );
}
