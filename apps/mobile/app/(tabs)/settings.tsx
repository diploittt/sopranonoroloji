import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Switch, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { COLORS, SIZES } from '@/constants';
import { useAuthStore } from '@/stores/authStore';
import { disconnectSocket, getSocket } from '@/services/socket';

export default function SettingsScreen() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);

    // Profile editing state
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [nameColor, setNameColor] = useState((user as any)?.nameColor || '#ffffff');
    const [editing, setEditing] = useState(false);

    // Notification settings
    const [notifMessages, setNotifMessages] = useState(true);
    const [notifGifts, setNotifGifts] = useState(true);
    const [notifDM, setNotifDM] = useState(true);

    const handleLogout = () => {
        Alert.alert('Çıkış', 'Çıkış yapmak istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Çıkış',
                style: 'destructive',
                onPress: async () => {
                    disconnectSocket();
                    await SecureStore.deleteItemAsync('soprano_session');
                    logout();
                    router.replace('/auth/login');
                },
            },
        ]);
    };

    const handleSaveProfile = () => {
        const socket = getSocket();
        if (!socket) return;
        if (displayName.trim()) {
            socket.emit('status:change-name', { displayName: displayName.trim() });
        }
        if (nameColor) {
            socket.emit('status:change-name-color', { nameColor });
        }
        setEditing(false);
        Alert.alert('Başarılı', 'Profil güncellendi!');
    };

    const handleChangePassword = () => {
        Alert.alert('Şifre Değiştir', 'Bu özelliği web üzerinden kullanabilirsiniz.', [
            { text: 'Tamam' },
        ]);
    };

    const NAME_COLORS = ['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

    const avatarUri = user?.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(user?.displayName || user?.username || 'user')}`;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Text style={styles.title}>⚙️ Ayarlar</Text>
                </View>

                {/* ═══ Profile Card ═══ */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PROFİL</Text>
                    <View style={styles.profileCard}>
                        <Image source={{ uri: avatarUri }} style={styles.profileAvatar} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.profileName, { color: nameColor }]}>{user?.displayName || user?.username}</Text>
                            <Text style={styles.profileRole}>{user?.role || 'guest'}</Text>
                        </View>
                        <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(!editing)}>
                            <Text style={styles.editBtnText}>{editing ? '✕' : '✏️'}</Text>
                        </TouchableOpacity>
                    </View>

                    {editing && (
                        <View style={styles.editPanel}>
                            <Text style={styles.inputLabel}>Görünen İsim</Text>
                            <TextInput
                                style={styles.textInput}
                                value={displayName}
                                onChangeText={setDisplayName}
                                placeholder="Görünen isim..."
                                placeholderTextColor="#4b5563"
                            />

                            <Text style={[styles.inputLabel, { marginTop: 12 }]}>İsim Rengi</Text>
                            <View style={styles.colorRow}>
                                {NAME_COLORS.map(c => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[styles.colorDot, { backgroundColor: c }, nameColor === c && styles.colorDotActive]}
                                        onPress={() => setNameColor(c)}
                                    />
                                ))}
                            </View>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                                <Text style={styles.saveBtnText}>💾 Kaydet</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.passwordBtn} onPress={handleChangePassword}>
                                <Text style={styles.passwordBtnText}>🔑 Şifre Değiştir</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* ═══ Notifications ═══ */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>BİLDİRİMLER</Text>
                    <View style={styles.card}>
                        <View style={styles.toggleItem}>
                            <Text style={styles.itemLabel}>💬 Mesaj Bildirimleri</Text>
                            <Switch value={notifMessages} onValueChange={setNotifMessages} trackColor={{ false: '#374151', true: 'rgba(123,159,239,0.4)' }} thumbColor={notifMessages ? '#7b9fef' : '#9ca3af'} />
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.toggleItem}>
                            <Text style={styles.itemLabel}>🎁 Hediye Bildirimleri</Text>
                            <Switch value={notifGifts} onValueChange={setNotifGifts} trackColor={{ false: '#374151', true: 'rgba(123,159,239,0.4)' }} thumbColor={notifGifts ? '#7b9fef' : '#9ca3af'} />
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.toggleItem}>
                            <Text style={styles.itemLabel}>✉️ DM Bildirimleri</Text>
                            <Switch value={notifDM} onValueChange={setNotifDM} trackColor={{ false: '#374151', true: 'rgba(123,159,239,0.4)' }} thumbColor={notifDM ? '#7b9fef' : '#9ca3af'} />
                        </View>
                    </View>
                </View>

                {/* ═══ App Info ═══ */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>UYGULAMA</Text>
                    <View style={styles.card}>
                        <View style={styles.item}>
                            <Text style={styles.itemLabel}>Sürüm</Text>
                            <Text style={styles.itemValue}>1.0.0</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.item}>
                            <Text style={styles.itemLabel}>Platform</Text>
                            <Text style={styles.itemValue}>📱 Android</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.item}>
                            <Text style={styles.itemLabel}>Bağlantı</Text>
                            <Text style={styles.itemValue}>WebSocket</Text>
                        </View>
                    </View>
                </View>

                {/* ═══ Admin shortcut ═══ */}
                {['owner', 'godmaster', 'super_admin', 'superadmin', 'admin'].includes((user?.role || '').toLowerCase()) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>YÖNETİM</Text>
                        <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/admin')}>
                            <Text style={styles.adminBtnText}>🛡️ Yönetim Paneli</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ═══ Logout ═══ */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>HESAP</Text>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <Text style={styles.logoutText}>🚪 Çıkış Yap</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { paddingBottom: 32 },
    header: { paddingHorizontal: SIZES.padding, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    title: { fontSize: SIZES.xxl, fontWeight: '700', color: COLORS.white },
    section: { marginTop: 24, paddingHorizontal: SIZES.padding },
    sectionTitle: { fontSize: SIZES.xs, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 8 },
    // Profile card
    profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: COLORS.surface, borderRadius: SIZES.borderRadius, borderWidth: 1, borderColor: COLORS.glassBorder },
    profileAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(123,159,239,0.3)' },
    profileName: { fontSize: 15, fontWeight: '700' },
    profileRole: { color: COLORS.textMuted, fontSize: 11, marginTop: 2, textTransform: 'uppercase' as any },
    editBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    editBtnText: { fontSize: 16 },
    // Edit panel
    editPanel: { marginTop: 10, padding: 14, backgroundColor: COLORS.surface, borderRadius: SIZES.borderRadius, borderWidth: 1, borderColor: COLORS.glassBorder },
    inputLabel: { color: '#6b7280', fontSize: 11, fontWeight: '600', marginBottom: 4 },
    textInput: { height: 42, backgroundColor: '#10121b', borderRadius: 10, paddingHorizontal: 14, color: '#e5e7eb', fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    colorRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
    colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
    colorDotActive: { borderColor: '#fff', transform: [{ scale: 1.15 }] },
    saveBtn: { marginTop: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', alignItems: 'center' },
    saveBtnText: { color: '#22c55e', fontSize: 13, fontWeight: '700' },
    passwordBtn: { marginTop: 8, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(123,159,239,0.1)', borderWidth: 1, borderColor: 'rgba(123,159,239,0.2)', alignItems: 'center' },
    passwordBtnText: { color: '#7b9fef', fontSize: 13, fontWeight: '600' },
    // Cards
    card: { backgroundColor: COLORS.surface, borderRadius: SIZES.borderRadius, borderWidth: 1, borderColor: COLORS.glassBorder, overflow: 'hidden' },
    item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
    toggleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
    divider: { height: 1, backgroundColor: COLORS.glassBorder, marginHorizontal: 14 },
    itemLabel: { color: COLORS.textSecondary, fontSize: SIZES.md },
    itemValue: { color: COLORS.text, fontSize: SIZES.md, fontWeight: '500' },
    // Admin
    adminBtn: { paddingVertical: 14, borderRadius: SIZES.borderRadius, backgroundColor: 'rgba(168,85,247,0.1)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)', alignItems: 'center' },
    adminBtnText: { color: '#a855f7', fontSize: SIZES.lg, fontWeight: '600' },
    // Logout
    logoutBtn: { backgroundColor: COLORS.error + '15', padding: 14, borderRadius: SIZES.borderRadius, alignItems: 'center', borderWidth: 1, borderColor: COLORS.error + '30' },
    logoutText: { color: COLORS.error, fontSize: SIZES.lg, fontWeight: '600' },
});
