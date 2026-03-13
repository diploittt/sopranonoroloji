"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, Loader2, ImageOff, Search } from 'lucide-react';

interface GifPickerProps {
    onGifSelect?: (gifUrl: string) => void;
}

// GIPHY API — Next.js proxy üzerinden (CORS sorunu yok)
const GIPHY_PROXY = '/api/giphy';

interface GiphyGif {
    id: string;
    title: string;
    images: {
        fixed_width_small: { url: string; width: string; height: string };
        fixed_width: { url: string; width: string; height: string };
        original: { url: string };
    };
}

const TRENDING_TAGS = ['Reaction', 'Komik', 'Mutlu', 'Üzgün', 'Dans', 'Aşk', 'Anime', 'Meme', 'Alkış', 'OK'];

export function GifPicker({ onGifSelect }: GifPickerProps) {
    const [gifs, setGifs] = useState<GiphyGif[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const fetchGifs = useCallback(async (query: string) => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = query
                ? `${GIPHY_PROXY}?q=${encodeURIComponent(query)}&limit=30`
                : `${GIPHY_PROXY}?limit=30`;

            const res = await fetch(endpoint);
            if (!res.ok) throw new Error('API hatası');
            const json = await res.json();
            setGifs(json.data || []);
        } catch {
            setError('GIF yüklenemedi');
            setGifs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Sayfa açıldığında trending yükle
    useEffect(() => {
        fetchGifs('');
    }, [fetchGifs]);

    const handleTagClick = (tag: string) => {
        if (activeTag === tag) {
            setActiveTag(null);
            setSearchQuery('');
            fetchGifs('');
        } else {
            setActiveTag(tag);
            setSearchQuery('');
            fetchGifs(tag);
        }
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setActiveTag(null);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            fetchGifs(value.trim() || '');
        }, 400);
    };

    return (
        <div className="flex select-none" style={{ width: 380, height: 220 }}>
            {/* Sol: Etiketler (dikey şerit) */}
            <div className="flex flex-col gap-1 py-2 px-1.5 overflow-y-auto no-scrollbar" style={{ borderRight: '1px solid #e2e8f0', width: 80 }}>
                <div className="flex items-center gap-1 px-1 pb-1 mb-0.5" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <TrendingUp className="w-3 h-3 text-blue-500" />
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Etiket</span>
                </div>
                {TRENDING_TAGS.map((tag) => {
                    const isActive = activeTag === tag;
                    return (
                        <button
                            key={tag}
                            onClick={() => handleTagClick(tag)}
                            className={`text-[10px] font-semibold px-2 py-1 rounded-lg text-left transition-all duration-200 ${isActive
                                ? 'text-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                            style={{
                                background: isActive ? '#dbeafe' : 'transparent',
                            }}
                        >
                            #{tag}
                        </button>
                    );
                })}
            </div>

            {/* Sağ: GIF Grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search + Başlık */}
                <div className="px-2 pt-1.5 pb-1" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <div className="flex items-center gap-1.5 mb-1.5" style={{
                        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 8px',
                    }}>
                        <Search className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="GIF ara..."
                            className="flex-1 text-[10px] bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                            style={{ border: 'none', padding: 0, minWidth: 0 }}
                        />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-blue-500" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {searchQuery ? `"${searchQuery}"` : activeTag ? activeTag : 'Trend GIF'}
                        </span>
                        <span className="text-[9px] text-slate-400 ml-auto font-bold tracking-wider">GIPHY</span>
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {/* Yükleniyor */}
                    {loading && gifs.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
                            <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
                            <span className="text-[10px] font-medium">GIF&apos;ler yükleniyor...</span>
                        </div>
                    )}

                    {/* Hata */}
                    {error && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
                            <ImageOff className="w-7 h-7 text-red-500/50" />
                            <span className="text-[10px] font-medium text-red-400">{error}</span>
                        </div>
                    )}

                    {/* Sonuç yok */}
                    {!loading && !error && gifs.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
                            <span className="text-2xl">🔍</span>
                            <span className="text-[10px] font-medium">GIF bulunamadı</span>
                        </div>
                    )}

                    {/* GIF Grid — 4 sütun, dikey scroll */}
                    {gifs.length > 0 && (
                        <div className="grid grid-cols-4 gap-1.5">
                            {gifs.map((gif) => {
                                const thumbUrl = gif.images?.fixed_width_small?.url || gif.images?.fixed_width?.url;
                                const fullUrl = gif.images?.fixed_width?.url || gif.images?.original?.url;
                                if (!thumbUrl) return null;
                                return (
                                    <button
                                        key={gif.id}
                                        onClick={() => onGifSelect?.(fullUrl || thumbUrl)}
                                        className="rounded-lg overflow-hidden relative group transition-all duration-200 hover:ring-1 ring-blue-300"
                                        style={{
                                            aspectRatio: '1',
                                            border: '1px solid #e2e8f0',
                                            background: '#f8fafc',
                                        }}
                                    >
                                        <img
                                            src={thumbUrl}
                                            alt={gif.title || 'GIF'}
                                            loading="lazy"
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                                        />
                                        {/* Hover */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-1">
                                            <span className="text-[7px] font-bold text-white truncate w-full">
                                                {gif.title || 'GIF'}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
