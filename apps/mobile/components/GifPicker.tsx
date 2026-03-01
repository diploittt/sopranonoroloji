import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image, TextInput, ActivityIndicator } from 'react-native';

interface GifPickerProps {
    onGifSelect?: (gifUrl: string) => void;
    onClose?: () => void;
}

interface GiphyGif {
    id: string;
    title: string;
    images: {
        fixed_width_small: { url: string };
        fixed_width: { url: string };
        original: { url: string };
    };
}

const TRENDING_TAGS = ['Reaction', 'Komik', 'Mutlu', 'Üzgün', 'Dans', 'Aşk', 'Anime', 'Meme', 'Alkış', 'OK'];
const GIPHY_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65'; // Public key

export default function GifPicker({ onGifSelect, onClose }: GifPickerProps) {
    const [query, setQuery] = useState('');
    const [gifs, setGifs] = useState<GiphyGif[]>([]);
    const [loading, setLoading] = useState(false);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const fetchGifs = useCallback(async (searchQuery: string) => {
        setLoading(true);
        try {
            const endpoint = searchQuery.trim()
                ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(searchQuery)}&limit=30&rating=g&lang=tr`
                : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=30&rating=g`;
            const res = await fetch(endpoint);
            const data = await res.json();
            setGifs(data.data || []);
        } catch {
            setGifs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load trending on mount
    useEffect(() => { fetchGifs(''); }, []);

    // Debounced search
    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            fetchGifs(query);
        }, 400);
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [query]);

    const handleTagClick = (tag: string) => {
        setQuery(tag);
    };

    return (
        <View style={s.container}>
            {/* Search */}
            <View style={s.searchRow}>
                <TextInput
                    style={s.searchInput}
                    placeholder="GIF ara..."
                    placeholderTextColor="#4b5563"
                    value={query}
                    onChangeText={setQuery}
                />
                {onClose && (
                    <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                        <Text style={{ color: '#6b7280', fontSize: 14 }}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Trending tags */}
            <View style={s.tagRow}>
                {TRENDING_TAGS.map(tag => (
                    <TouchableOpacity key={tag} style={s.tag} onPress={() => handleTagClick(tag)}>
                        <Text style={s.tagText}>{tag}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* GIF grid */}
            {loading ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#7b9fef" />
                </View>
            ) : (
                <FlatList
                    data={gifs}
                    keyExtractor={g => g.id}
                    numColumns={2}
                    contentContainerStyle={{ padding: 4, gap: 4 }}
                    columnWrapperStyle={{ gap: 4 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={s.gifItem}
                            onPress={() => onGifSelect?.(item.images.fixed_width.url || item.images.original.url)}
                        >
                            <Image
                                source={{ uri: item.images.fixed_width_small.url }}
                                style={s.gifImage}
                                resizeMode="cover"
                            />
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', padding: 20 }}>
                            <Text style={{ color: '#6b7280', fontSize: 12 }}>GIF bulunamadı</Text>
                        </View>
                    }
                />
            )}

            {/* GIPHY attribution */}
            <View style={s.footer}>
                <Text style={s.footerText}>Powered by GIPHY</Text>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: { backgroundColor: '#0F1626', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', maxHeight: 360, overflow: 'hidden' },
    searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 8, gap: 4 },
    searchInput: { flex: 1, height: 34, backgroundColor: '#10121b', borderRadius: 8, paddingHorizontal: 10, color: '#e5e7eb', fontSize: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    closeBtn: { width: 30, height: 30, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(123,159,239,0.1)', borderWidth: 1, borderColor: 'rgba(123,159,239,0.15)' },
    tagText: { color: '#7b9fef', fontSize: 10, fontWeight: '600' },
    gifItem: { flex: 1, aspectRatio: 1.3, borderRadius: 8, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)' },
    gifImage: { width: '100%', height: '100%' },
    footer: { paddingVertical: 4, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    footerText: { color: '#4b5563', fontSize: 9 },
});
