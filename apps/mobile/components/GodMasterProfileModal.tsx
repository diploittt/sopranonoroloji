import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    ScrollView,
    Image,
} from 'react-native';
import { getSocket } from '@/services/socket';

interface GodMasterProfileModalProps {
    visible: boolean;
    onClose: () => void;
    currentUser: any;
}

const TABS = [
    { id: 'animated', label: 'Animated Nick', icon: '✨' },
    { id: 'gif', label: 'GIF Nick', icon: '🎬' },
    { id: '3d', label: '3D Efekt', icon: '🔱' },
    { id: 'avatar', label: 'Avatar', icon: '🖼️' },
    { id: 'settings', label: 'Ayarlar', icon: '⚙️' },
];

const ANIM_CLASSES = [
    { id: 'shimmer-gold', label: 'Gold Shimmer', emoji: '💛', color: '#fbbf24' },
    { id: 'fire-glow', label: 'Fire Glow', emoji: '🔥', color: '#ef4444' },
    { id: 'ice-shimmer', label: 'Ice Shimmer', emoji: '❄️', color: '#06b6d4' },
    { id: 'neon-pulse', label: 'Neon Pulse', emoji: '⚡', color: '#22c55e' },
    { id: 'matrix-glow', label: 'Matrix Glow', emoji: '🟢', color: '#00ff41' },
    { id: 'royal-glow', label: 'Royal Glow', emoji: '👑', color: '#a855f7' },
];

const THEMES_3D = [
    { id: 'purple', label: 'Purple', color: '#a855f7' },
    { id: 'gold', label: 'Gold', color: '#fbbf24' },
    { id: 'cyan', label: 'Cyan', color: '#06b6d4' },
    { id: 'fire', label: 'Fire', color: '#ef4444' },
    { id: 'emerald', label: 'Emerald', color: '#10b981' },
    { id: 'royal', label: 'Royal', color: '#6366f1' },
];

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24];

export default function GodMasterProfileModal({ visible, onClose, currentUser }: GodMasterProfileModalProps) {
    const [activeTab, setActiveTab] = useState('animated');

    // Animated nick state
    const [animClass, setAnimClass] = useState('shimmer-gold');
    const [animFontSize, setAnimFontSize] = useState(14);
    const [animShowAvatar, setAnimShowAvatar] = useState(true);
    const [animText, setAnimText] = useState(currentUser?.displayName || '');

    // GIF nick state
    const [gifUrl, setGifUrl] = useState('');

    // 3D state
    const [theme3d, setTheme3d] = useState('purple');
    const [mainText3d, setMainText3d] = useState('GodMaster');
    const [subText3d, setSubText3d] = useState('');

    // Avatar URL
    const [avatarUrl, setAvatarUrl] = useState('');

    // Name color
    const [nameColor, setNameColor] = useState(currentUser?.nameColor || '#a855f7');

    const handleApplyAnimated = () => {
        const socket = getSocket();
        if (!socket) return;
        const avatar = `animated:${animClass}:${animFontSize}:${animShowAvatar ? '1' : '0'}:${animText}`;
        socket.emit('status:change-avatar', { avatar });
        onClose();
    };

    const handleApplyGif = () => {
        if (!gifUrl.trim()) return;
        const socket = getSocket();
        if (!socket) return;
        const avatar = `gifnick::${gifUrl.trim()}::${animShowAvatar ? '1' : '0'}`;
        socket.emit('status:change-avatar', { avatar });
        onClose();
    };

    const handleApply3d = () => {
        const socket = getSocket();
        if (!socket) return;
        const avatar = `3d:${theme3d}:${mainText3d}:${subText3d}`;
        socket.emit('status:change-avatar', { avatar });
        onClose();
    };

    const handleApplyAvatar = () => {
        if (!avatarUrl.trim()) return;
        const socket = getSocket();
        if (!socket) return;
        socket.emit('status:change-avatar', { avatar: avatarUrl.trim() });
        onClose();
    };

    const handleApplyNameColor = () => {
        const socket = getSocket();
        if (!socket) return;
        socket.emit('status:change-name-color', { nameColor });
    };

    const NAME_COLORS = [
        '#a855f7', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6',
        '#ec4899', '#06b6d4', '#f97316', '#8b5cf6', '#fbbf24',
        '#fff', '#94a3b8',
    ];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={s.container}>
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={{ color: '#7b9fef', fontSize: 18, fontWeight: '700' }}>←</Text>
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>🔮 GodMaster Profili</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={{ gap: 4, paddingHorizontal: 12 }}>
                    {TABS.map(tab => (
                        <TouchableOpacity
                            key={tab.id}
                            style={[s.tab, activeTab === tab.id && s.tabActive]}
                            onPress={() => setActiveTab(tab.id)}
                        >
                            <Text style={{ fontSize: 14 }}>{tab.icon}</Text>
                            <Text style={[s.tabText, activeTab === tab.id && s.tabTextActive]}>{tab.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                    {/* ═══ ANIMATED NICK TAB ═══ */}
                    {activeTab === 'animated' && (
                        <View>
                            <Text style={s.sectionTitle}>Animasyon Stili</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {ANIM_CLASSES.map(ac => (
                                    <TouchableOpacity
                                        key={ac.id}
                                        style={[s.animItem, animClass === ac.id && { borderColor: ac.color }]}
                                        onPress={() => setAnimClass(ac.id)}
                                    >
                                        <Text style={{ fontSize: 16 }}>{ac.emoji}</Text>
                                        <Text style={[s.animLabel, { color: ac.color }]}>{ac.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[s.sectionTitle, { marginTop: 14 }]}>Font Boyutu</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {FONT_SIZES.map(fs => (
                                    <TouchableOpacity
                                        key={fs}
                                        style={[s.sizeBtn, animFontSize === fs && s.sizeBtnActive]}
                                        onPress={() => setAnimFontSize(fs)}
                                    >
                                        <Text style={[s.sizeBtnText, animFontSize === fs && { color: '#7b9fef' }]}>{fs}px</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[s.sectionTitle, { marginTop: 14 }]}>Nick Metni</Text>
                            <TextInput
                                style={s.input}
                                value={animText}
                                onChangeText={setAnimText}
                                placeholder="Görünen isim..."
                                placeholderTextColor="#4b5563"
                            />

                            <TouchableOpacity style={s.applyBtn} onPress={handleApplyAnimated}>
                                <Text style={s.applyBtnText}>✨ Uygula</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ═══ GIF NICK TAB ═══ */}
                    {activeTab === 'gif' && (
                        <View>
                            <Text style={s.sectionTitle}>GIF URL</Text>
                            <TextInput
                                style={s.input}
                                value={gifUrl}
                                onChangeText={setGifUrl}
                                placeholder="https://example.com/nick.gif"
                                placeholderTextColor="#4b5563"
                                autoCapitalize="none"
                            />
                            {gifUrl ? (
                                <View style={s.previewBox}>
                                    <Image source={{ uri: gifUrl }} style={{ width: '100%', height: 80 }} resizeMode="contain" />
                                </View>
                            ) : null}
                            <TouchableOpacity style={s.applyBtn} onPress={handleApplyGif}>
                                <Text style={s.applyBtnText}>🎬 GIF Nick Uygula</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ═══ 3D EFEKT TAB ═══ */}
                    {activeTab === '3d' && (
                        <View>
                            <Text style={s.sectionTitle}>Tema</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                {THEMES_3D.map(t => (
                                    <TouchableOpacity
                                        key={t.id}
                                        style={[s.themeBtn, { borderColor: theme3d === t.id ? t.color : 'rgba(255,255,255,0.08)' }]}
                                        onPress={() => setTheme3d(t.id)}
                                    >
                                        <View style={[s.themeDot, { backgroundColor: t.color }]} />
                                        <Text style={[s.themeLabel, theme3d === t.id && { color: t.color }]}>{t.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[s.sectionTitle, { marginTop: 14 }]}>Ana Metin</Text>
                            <TextInput style={s.input} value={mainText3d} onChangeText={setMainText3d} placeholderTextColor="#4b5563" />

                            <Text style={[s.sectionTitle, { marginTop: 10 }]}>Alt Metin</Text>
                            <TextInput style={s.input} value={subText3d} onChangeText={setSubText3d} placeholder="Alt başlık..." placeholderTextColor="#4b5563" />

                            <TouchableOpacity style={s.applyBtn} onPress={handleApply3d}>
                                <Text style={s.applyBtnText}>🔱 3D Banner Uygula</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ═══ AVATAR TAB ═══ */}
                    {activeTab === 'avatar' && (
                        <View>
                            <Text style={s.sectionTitle}>Avatar URL</Text>
                            <TextInput
                                style={s.input}
                                value={avatarUrl}
                                onChangeText={setAvatarUrl}
                                placeholder="https://example.com/avatar.png"
                                placeholderTextColor="#4b5563"
                                autoCapitalize="none"
                            />
                            {avatarUrl ? (
                                <View style={s.previewBox}>
                                    <Image source={{ uri: avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40, alignSelf: 'center' }} />
                                </View>
                            ) : null}
                            <TouchableOpacity style={s.applyBtn} onPress={handleApplyAvatar}>
                                <Text style={s.applyBtnText}>🖼️ Avatar Uygula</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ═══ SETTINGS TAB ═══ */}
                    {activeTab === 'settings' && (
                        <View>
                            <Text style={s.sectionTitle}>İsim Rengi</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {NAME_COLORS.map(c => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[s.colorDot, { backgroundColor: c }, nameColor === c && s.colorDotActive]}
                                        onPress={() => setNameColor(c)}
                                    />
                                ))}
                            </View>
                            <View style={s.previewName}>
                                <Text style={{ color: nameColor, fontSize: 16, fontWeight: '700' }}>{currentUser?.displayName || 'GodMaster'}</Text>
                            </View>
                            <TouchableOpacity style={s.applyBtn} onPress={handleApplyNameColor}>
                                <Text style={s.applyBtnText}>🎨 Renk Uygula</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[s.applyBtn, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', marginTop: 10 }]}
                                onPress={() => {
                                    const socket = getSocket();
                                    if (socket) socket.emit('status:change-avatar', { avatar: '' });
                                    onClose();
                                }}
                            >
                                <Text style={[s.applyBtnText, { color: '#ef4444' }]}>🗑 Özel Nicki Kaldır</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070B14' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    headerTitle: { flex: 1, color: '#e5e7eb', fontSize: 16, fontWeight: '800', textAlign: 'center' },
    tabBar: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    tab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
    tabActive: { backgroundColor: 'rgba(123,159,239,0.1)' },
    tabText: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
    tabTextActive: { color: '#7b9fef' },
    sectionTitle: { color: '#6b7280', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
    animItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' },
    animLabel: { fontSize: 11, fontWeight: '600' },
    sizeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' },
    sizeBtnActive: { borderColor: 'rgba(123,159,239,0.3)', backgroundColor: 'rgba(123,159,239,0.1)' },
    sizeBtnText: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
    input: { height: 42, backgroundColor: '#10121b', borderRadius: 10, paddingHorizontal: 14, color: '#e5e7eb', fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    previewBox: { marginTop: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    applyBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(123,159,239,0.15)', borderWidth: 1, borderColor: 'rgba(123,159,239,0.3)', alignItems: 'center' },
    applyBtnText: { color: '#7b9fef', fontSize: 14, fontWeight: '700' },
    themeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
    themeDot: { width: 14, height: 14, borderRadius: 7 },
    themeLabel: { fontSize: 11, fontWeight: '600', color: '#9ca3af' },
    colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
    colorDotActive: { borderColor: '#fff', transform: [{ scale: 1.15 }] },
    previewName: { marginTop: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, alignItems: 'center' },
});
