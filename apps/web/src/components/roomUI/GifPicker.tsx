"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, TrendingUp, Loader2, ImageOff } from 'lucide-react';

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
    const [searchQuery, setSearchQuery] = useState('');
    const [gifs, setGifs] = useState<GiphyGif[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

    // Debounced arama
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!searchQuery.trim()) {
            fetchGifs('');
            return;
        }
        debounceRef.current = setTimeout(() => {
            fetchGifs(searchQuery);
        }, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchQuery, fetchGifs]);

    const handleTagClick = (tag: string) => {
        if (activeTag === tag) {
            setActiveTag(null);
            setSearchQuery('');
        } else {
            setActiveTag(tag);
            setSearchQuery(tag);
        }
    };

    return (
        <div className="w-[420px] h-[480px] flex flex-col select-none">
            {/* Arama + Etiketler */}
            <div className="px-4 pt-3 pb-2 space-y-2.5">
                <div className="relative group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600 group-focus-within:text-cyan-400 transition-colors duration-200" />
                    <input
                        type="text"
                        placeholder="GIF ara..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setActiveTag(null); }}
                        className="w-full bg-white/[0.04] text-white text-[13px] rounded-xl py-2.5 pl-10 pr-4 border border-white/[0.08] focus:border-cyan-500/40 focus:bg-white/[0.06] focus:outline-none transition-all duration-200 placeholder:text-gray-600"
                    />
                    {loading && (
                        <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400 animate-spin" />
                    )}
                </div>

                {/* Etiketler */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 max-w-full">
                    {TRENDING_TAGS.map((tag) => {
                        const isActive = activeTag === tag;
                        return (
                            <button
                                key={tag}
                                onClick={() => handleTagClick(tag)}
                                className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all duration-200 ${isActive
                                    ? 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/25 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                                    : 'bg-white/[0.03] text-gray-500 hover:bg-white/[0.06] hover:text-gray-300'
                                    }`}
                            >
                                #{tag}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Ayraç */}
            <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

            {/* İçerik */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                {/* Başlık */}
                <div className="mb-2 px-1 flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <TrendingUp className="w-3 h-3 text-cyan-500" />
                    {searchQuery ? 'Sonuçlar' : 'Trend'}
                </div>

                {/* Yükleniyor */}
                {loading && gifs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-600 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-cyan-500/50" />
                        <span className="text-xs font-medium">GIF&apos;ler yükleniyor...</span>
                    </div>
                )}

                {/* Hata */}
                {error && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-600 gap-3">
                        <ImageOff className="w-8 h-8 text-red-500/50" />
                        <span className="text-xs font-medium text-red-400">{error}</span>
                    </div>
                )}

                {/* Sonuç yok */}
                {!loading && !error && gifs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-600 gap-3">
                        <span className="text-3xl">🔍</span>
                        <span className="text-xs font-medium">GIF bulunamadı</span>
                    </div>
                )}

                {/* Masonry Grid */}
                {gifs.length > 0 && (
                    <div className="columns-3 gap-2 space-y-2">
                        {gifs.map((gif) => {
                            const thumbUrl = gif.images?.fixed_width_small?.url || gif.images?.fixed_width?.url;
                            const fullUrl = gif.images?.fixed_width?.url || gif.images?.original?.url;
                            if (!thumbUrl) return null;
                            return (
                                <button
                                    key={gif.id}
                                    onClick={() => onGifSelect?.(fullUrl || thumbUrl)}
                                    className="w-full break-inside-avoid rounded-xl overflow-hidden relative group hover:ring-2 ring-cyan-500/40 transition-all duration-200 bg-white/[0.02]"
                                >
                                    <img
                                        src={thumbUrl}
                                        alt={gif.title || 'GIF'}
                                        loading="lazy"
                                        className="w-full h-auto block transition-transform duration-300 group-hover:scale-[1.03]"
                                    />
                                    {/* Hover */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                                        <span className="text-[9px] font-bold text-white truncate w-full">
                                            {gif.title || 'GIF'}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-white/[0.05] flex justify-between items-center">
                <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/60 animate-pulse" />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60 animate-pulse" style={{ animationDelay: '75ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-600/60 animate-pulse" style={{ animationDelay: '150ms' }} />
                </div>
                <span className="text-[10px] font-bold text-gray-600 tracking-wider">
                    POWERED BY <span className="text-cyan-400/70">GIPHY</span>
                </span>
            </div>
        </div>
    );
}
