import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    TextInput,
    FlatList,
    Alert,
    ActivityIndicator,
    Switch,
    Image,
    RefreshControl,
    Dimensions,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { getSocket } from '@/services/socket';

const { width: SW } = Dimensions.get('window');

// ═══ Role helpers ═══
const ROLE_COLORS: Record<string, string> = {
    owner: '#f59e0b', godmaster: '#ef4444', superadmin: '#a855f7', super_admin: '#a855f7',
    admin: '#3b82f6', moderator: '#22c55e', operator: '#06b6d4', vip: '#ec4899', member: '#6b7280', guest: '#4b5563',
};
const ROLE_LABELS: Record<string, string> = {
    owner: 'Sahip', godmaster: 'GodMaster', superadmin: 'Süper Admin', super_admin: 'Süper Admin',
    admin: 'Yönetici', moderator: 'Moderatör', operator: 'Operatör', vip: 'VIP', member: 'Üye', guest: 'Misafir',
};
const ROLE_ORDER = ['owner', 'superadmin', 'admin', 'moderator', 'operator', 'vip', 'member', 'guest'];

// ═══ DASHBOARD TAB ═══
function DashboardTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
    const [stats, setStats] = useState({ users: 0, rooms: 0, bans: 0, online: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [usersRes, roomsRes, bansRes] = await Promise.all([
                    api.get('/admin/users?limit=1').catch(() => ({ total: 0, users: [] })),
                    api.get('/admin/rooms').catch(() => ({ rooms: [] })),
                    api.get('/admin/bans?active=true').catch(() => ({ bans: [] })),
                ]);
                const userList = usersRes.users || usersRes || [];
                const roomList = roomsRes.rooms || roomsRes || [];
                const banList = bansRes.bans || bansRes || [];
                setStats({
                    users: usersRes.total || userList.length,
                    rooms: roomList.length,
                    bans: banList.length,
                    online: roomList.reduce((sum: number, r: any) => sum + (r.userCount || 0), 0),
                });
            } catch { } finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <ActivityIndicator style={{ marginTop: 60 }} color="#7b9fef" size="large" />;

    const cards = [
        { key: 'users', emoji: '👥', label: 'Kullanıcılar', value: stats.users, color: '#3b82f6', tab: 'users' },
        { key: 'online', emoji: '🟢', label: 'Çevrimiçi', value: stats.online, color: '#22c55e', tab: 'users' },
        { key: 'rooms', emoji: '🏠', label: 'Odalar', value: stats.rooms, color: '#a855f7', tab: 'rooms' },
        { key: 'bans', emoji: '⛔', label: 'Yasaklılar', value: stats.bans, color: '#ef4444', tab: 'bans' },
    ];

    const quickActions = [
        { key: 'users', emoji: '👥', label: 'Kullanıcılar', desc: 'Üye yönetimi', tab: 'users' },
        { key: 'bans', emoji: '⛔', label: 'Yasaklılar', desc: 'Ban yönetimi', tab: 'bans' },
        { key: 'rooms', emoji: '🏠', label: 'Odalar', desc: 'Oda yönetimi', tab: 'rooms' },
        { key: 'settings', emoji: '⚙️', label: 'Ayarlar', desc: 'Sistem ayarları', tab: 'settings' },
        { key: 'logs', emoji: '📋', label: 'Loglar', desc: 'Aktivite kayıtları', tab: 'logs' },
        { key: 'words', emoji: '🚫', label: 'Yasaklı Kelimeler', desc: 'Filtre yönetimi', tab: 'words' },
        { key: 'ipbans', emoji: '🌐', label: 'IP Yasakları', desc: 'IP ban yönetimi', tab: 'ipbans' },
        { key: 'about', emoji: 'ℹ️', label: 'Hakkında', desc: 'Sistem bilgileri', tab: 'about' },
    ];

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {/* Stats Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {cards.map(c => (
                    <TouchableOpacity key={c.key} onPress={() => onNavigate(c.tab)}
                        style={[P.statCard, { borderColor: c.color + '33' }]}>
                        <Text style={{ fontSize: 24 }}>{c.emoji}</Text>
                        <Text style={[P.statValue, { color: c.color }]}>{c.value}</Text>
                        <Text style={P.statLabel}>{c.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Quick Actions */}
            <Text style={P.sectionHeader}>Hızlı Erişim</Text>
            <View style={{ gap: 6 }}>
                {quickActions.map(a => (
                    <TouchableOpacity key={a.key} style={P.quickAction} onPress={() => onNavigate(a.tab)}>
                        <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={P.quickLabel}>{a.label}</Text>
                            <Text style={P.quickDesc}>{a.desc}</Text>
                        </View>
                        <Text style={{ color: '#374151', fontSize: 18 }}>›</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}

// ═══ USERS TAB ═══
function UsersTab() {
    const [users, setUsers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const fetchUsers = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
        try {
            const res = await api.get('/admin/users');
            setUsers(res.users || res || []);
        } catch (e: any) {
            if (!quiet) Alert.alert('Hata', e?.message || 'Yüklenemedi');
        } finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const filtered = users.filter(u =>
        (u.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.role || '').toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
        const ai = ROLE_ORDER.indexOf(a.role?.toLowerCase() || 'guest');
        const bi = ROLE_ORDER.indexOf(b.role?.toLowerCase() || 'guest');
        return ai - bi;
    });

    const handleRoleChange = async (userId: string, role: string) => {
        try {
            await api.patch(`/admin/users/${userId}`, { role });
            const socket = getSocket();
            if (socket) socket.emit('admin:userUpdate', { userId, role });
            setSelectedUser((p: any) => p ? { ...p, role } : null);
            fetchUsers(true);
        } catch (e: any) { Alert.alert('Hata', e?.message); }
    };

    const handleBan = (userId: string, name: string) => {
        Alert.alert('Yasakla', `${name} yasaklansın mı?`, [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Yasakla', style: 'destructive', onPress: async () => {
                    try {
                        await api.post('/admin/bans', { userId, type: 'permanent', reason: 'Admin panelden yasaklandı' });
                        setSelectedUser(null); fetchUsers(true);
                    } catch (e: any) { Alert.alert('Hata', e?.message); }
                }
            },
        ]);
    };

    const handleDelete = (userId: string, name: string) => {
        Alert.alert('Sil', `"${name}" kalıcı olarak silinecek. Emin misiniz?`, [
            { text: 'İptal', style: 'cancel' },
            {
                text: 'Sil', style: 'destructive', onPress: async () => {
                    try {
                        await api.del(`/admin/users/${userId}`);
                        setSelectedUser(null); fetchUsers(true);
                    } catch (e: any) { Alert.alert('Hata', e?.message); }
                }
            },
        ]);
    };

    if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#7b9fef" size="large" />;

    // ─── User Detail Modal ───
    if (selectedUser) {
        const role = (selectedUser.role || 'guest').toLowerCase();
        const avatarUri = selectedUser.avatarUrl && !selectedUser.avatarUrl.startsWith('animated:') && !selectedUser.avatarUrl.startsWith('gifnick:')
            ? selectedUser.avatarUrl
            : `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(selectedUser.displayName || 'u')}`;
        return (
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                <TouchableOpacity onPress={() => setSelectedUser(null)} style={{ paddingVertical: 8 }}>
                    <Text style={{ color: '#7b9fef', fontSize: 14, fontWeight: '700' }}>← Listeye Dön</Text>
                </TouchableOpacity>

                {/* Profile Card */}
                <View style={P.profileCard}>
                    <Image source={{ uri: avatarUri }} style={P.profileAvatar} />
                    <Text style={P.profileName}>{selectedUser.displayName}</Text>
                    <View style={[P.profileRoleBadge, { backgroundColor: (ROLE_COLORS[role] || '#6b7280') + '22', borderColor: (ROLE_COLORS[role] || '#6b7280') + '44' }]}>
                        <Text style={[P.profileRoleText, { color: ROLE_COLORS[role] || '#6b7280' }]}>{ROLE_LABELS[role] || role}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <View style={[P.statusDot, { backgroundColor: selectedUser.isOnline ? '#22c55e' : '#4b5563' }]} />
                        <Text style={{ color: '#6b7280', fontSize: 11 }}>{selectedUser.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}</Text>
                    </View>
                </View>

                {/* Info Grid */}
                <View style={P.infoGrid}>
                    {[
                        { label: 'E-posta', value: selectedUser.email || '—' },
                        { label: 'Giriş', value: `${selectedUser.loginCount || 0} kez` },
                        { label: 'Son Giriş', value: selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleDateString('tr-TR') : '—' },
                        { label: 'Bakiye', value: `${selectedUser.balance ?? 0} 💰` },
                        { label: 'Puan', value: `${selectedUser.points ?? 0} ⭐` },
                        { label: 'Premium', value: selectedUser.isPremium ? '✅ Evet' : '❌ Hayır' },
                    ].map((item, i) => (
                        <View key={i} style={P.infoItem}>
                            <Text style={P.infoLabel}>{item.label}</Text>
                            <Text style={P.infoValue} numberOfLines={1}>{item.value}</Text>
                        </View>
                    ))}
                </View>

                {/* Role Change */}
                <Text style={P.sectionHeader}>Rol Değiştir</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {ROLE_ORDER.map(r => (
                        <TouchableOpacity key={r}
                            style={[P.roleChip, role === r && { backgroundColor: (ROLE_COLORS[r] || '#6b7280') + '22', borderColor: (ROLE_COLORS[r] || '#6b7280') + '55' }]}
                            onPress={() => handleRoleChange(selectedUser.id, r)}>
                            <Text style={[P.roleChipText, role === r && { color: ROLE_COLORS[r] }]}>{ROLE_LABELS[r] || r}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Danger Zone */}
                <Text style={[P.sectionHeader, { color: '#ef4444' }]}>⚠️ Tehlikeli İşlemler</Text>
                <View style={{ gap: 8 }}>
                    <TouchableOpacity style={P.dangerBtn} onPress={() => handleBan(selectedUser.id, selectedUser.displayName)}>
                        <Text style={P.dangerBtnText}>⛔ Yasakla</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[P.dangerBtn, { borderColor: 'rgba(239,68,68,0.5)' }]} onPress={() => handleDelete(selectedUser.id, selectedUser.displayName)}>
                        <Text style={P.dangerBtnText}>🗑 Kalıcı Olarak Sil</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    // ─── User List ───
    return (
        <View style={{ flex: 1 }}>
            <View style={P.searchRow}>
                <Text style={{ fontSize: 16 }}>🔍</Text>
                <TextInput style={P.searchInput} placeholder="Kullanıcı ara..." placeholderTextColor="#4b5563" value={search} onChangeText={setSearch} />
                <Text style={P.countBadge}>{filtered.length}</Text>
            </View>
            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(true); }} tintColor="#7b9fef" />}
                renderItem={({ item }) => {
                    const r = (item.role || 'guest').toLowerCase();
                    const avatarUri = item.avatarUrl && !item.avatarUrl.startsWith('animated:') && !item.avatarUrl.startsWith('gifnick:')
                        ? item.avatarUrl
                        : `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(item.displayName || 'u')}`;
                    return (
                        <TouchableOpacity style={P.listItem} onPress={() => setSelectedUser(item)} activeOpacity={0.6}>
                            <Image source={{ uri: avatarUri }} style={P.listAvatar} />
                            <View style={{ flex: 1 }}>
                                <Text style={P.listName}>{item.displayName}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                    <View style={[P.statusDot, { backgroundColor: item.isOnline ? '#22c55e' : '#4b5563' }]} />
                                    <View style={[P.rolePill, { backgroundColor: (ROLE_COLORS[r] || '#6b7280') + '18' }]}>
                                        <Text style={[P.rolePillText, { color: ROLE_COLORS[r] || '#6b7280' }]}>{ROLE_LABELS[r] || r}</Text>
                                    </View>
                                </View>
                            </View>
                            <Text style={{ color: '#374151', fontSize: 20 }}>›</Text>
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={{ paddingBottom: 20 }}
            />
        </View>
    );
}

// ═══ BANS TAB ═══
function BansTab() {
    const [bans, setBans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBans = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/bans');
            setBans(res.bans || res || []);
        } catch { } finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchBans(); }, [fetchBans]);

    if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#7b9fef" size="large" />;

    return (
        <FlatList
            data={bans}
            keyExtractor={item => item.id}
            ListHeaderComponent={<Text style={[P.sectionHeader, { marginTop: 0 }]}>Aktif Yasaklar ({bans.length})</Text>}
            ListEmptyComponent={
                <View style={P.emptyState}>
                    <Text style={{ fontSize: 40 }}>✅</Text>
                    <Text style={P.emptyTitle}>Yasaklı kullanıcı yok</Text>
                    <Text style={P.emptyDesc}>Henüz aktif yasak bulunmuyor</Text>
                </View>
            }
            renderItem={({ item }) => (
                <View style={P.listItem}>
                    <View style={P.banIcon}><Text style={{ fontSize: 18 }}>⛔</Text></View>
                    <View style={{ flex: 1 }}>
                        <Text style={P.listName}>{item.user?.displayName || item.userId?.slice(0, 12)}</Text>
                        <Text style={P.listMeta}>{item.reason || 'Sebep belirtilmedi'}</Text>
                        <Text style={P.listMeta}>{item.type || 'permanent'} • {item.createdAt ? new Date(item.createdAt).toLocaleDateString('tr-TR') : ''}</Text>
                    </View>
                    <TouchableOpacity style={P.unbanBtn} onPress={async () => {
                        try { await api.del(`/admin/bans/${item.id}`); fetchBans(); } catch { }
                    }}>
                        <Text style={P.unbanBtnText}>Kaldır</Text>
                    </TouchableOpacity>
                </View>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
        />
    );
}

// ═══ ROOMS TAB ═══
function RoomsTab() {
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRooms = useCallback(async () => {
        setLoading(true);
        try { const res = await api.get('/admin/rooms'); setRooms(res.rooms || res || []); }
        catch { } finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchRooms(); }, [fetchRooms]);

    if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#7b9fef" size="large" />;

    return (
        <FlatList
            data={rooms}
            keyExtractor={item => item.id || item.slug}
            ListHeaderComponent={<Text style={[P.sectionHeader, { marginTop: 0 }]}>Odalar ({rooms.length})</Text>}
            ListEmptyComponent={
                <View style={P.emptyState}><Text style={{ fontSize: 40 }}>🏠</Text><Text style={P.emptyTitle}>Oda bulunamadı</Text></View>
            }
            renderItem={({ item }) => (
                <View style={P.listItem}>
                    <View style={[P.roomIcon, item.isMeetingRoom && { borderColor: 'rgba(168,85,247,0.3)' }]}>
                        <Text style={{ fontSize: 18 }}>{item.isMeetingRoom ? '🎤' : '🏠'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={P.listName}>{item.name || item.slug}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            <Text style={P.listMeta}>👥 {item.userCount || 0}</Text>
                            <Text style={P.listMeta}>{item.isLocked ? '🔒 Kilitli' : '🔓 Açık'}</Text>
                            {item.isVipRoom && <Text style={P.listMeta}>⭐ VIP</Text>}
                        </View>
                    </View>
                    <TouchableOpacity style={P.lockBtn} onPress={async () => {
                        try { await api.patch(`/admin/rooms/${item.id}`, { isLocked: !item.isLocked }); fetchRooms(); } catch { }
                    }}>
                        <Text style={{ fontSize: 18 }}>{item.isLocked ? '🔓' : '🔒'}</Text>
                    </TouchableOpacity>
                </View>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
        />
    );
}

// ═══ SETTINGS TAB ═══
function SettingsTab() {
    const [settings, setSettings] = useState<any>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try { setSettings(await api.get('/admin/settings') || {}); }
            catch { } finally { setLoading(false); }
        })();
    }, []);

    const update = async (key: string, value: any) => {
        setSettings((p: any) => ({ ...p, [key]: value }));
        try { await api.patch('/admin/settings', { [key]: value }); } catch { }
    };

    if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#7b9fef" size="large" />;

    const switches = [
        { key: 'chatLocked', label: 'Chat Kilitleme', desc: 'Sohbet yazımını kapat' },
        { key: 'guestCamera', label: 'Misafir Kamera', desc: 'Misafirlerin kamera açmasına izin ver' },
        { key: 'guestMic', label: 'Misafir Mikrofon', desc: 'Misafirlerin mikrofon kullanmasına izin ver' },
        { key: 'registrationEnabled', label: 'Kayıt Açık', desc: 'Yeni kullanıcı kaydına izin ver' },
    ];

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {/* Text settings */}
            <Text style={P.sectionHeader}>💬 Mesajlar</Text>
            <View style={P.settingCard}>
                <Text style={P.settingCardLabel}>Karşılama Mesajı</Text>
                <TextInput style={P.settingTextInput} value={settings.welcomeMessage || ''} onChangeText={v => update('welcomeMessage', v)} placeholder="Hoş geldiniz!" placeholderTextColor="#4b5563" multiline />
            </View>

            {/* Switch settings */}
            <Text style={P.sectionHeader}>🔧 Genel</Text>
            {switches.map(({ key, label, desc }) => (
                <View key={key} style={P.switchRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={P.switchLabel}>{label}</Text>
                        <Text style={P.switchDesc}>{desc}</Text>
                    </View>
                    <Switch value={!!settings[key]} onValueChange={v => update(key, v)} trackColor={{ false: '#1f2937', true: 'rgba(123,159,239,0.4)' }} thumbColor={settings[key] ? '#7b9fef' : '#6b7280'} />
                </View>
            ))}
        </ScrollView>
    );
}

// ═══ LOGS TAB ═══
function LogsTab() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        (async () => {
            try { const res = await api.get('/admin/audit-logs?limit=100'); setLogs(res.logs || res || []); }
            catch { } finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#7b9fef" size="large" />;

    return (
        <FlatList
            data={logs}
            keyExtractor={(item, i) => item.id || `${i}`}
            ListHeaderComponent={<Text style={[P.sectionHeader, { marginTop: 0 }]}>Son Aktiviteler ({logs.length})</Text>}
            ListEmptyComponent={<View style={P.emptyState}><Text style={{ fontSize: 40 }}>📋</Text><Text style={P.emptyTitle}>Kayıt yok</Text></View>}
            renderItem={({ item }) => (
                <View style={P.logItem}>
                    <View style={P.logDot} />
                    <View style={{ flex: 1 }}>
                        <Text style={P.logEvent}>{item.event || item.action || item.type}</Text>
                        {item.details || item.message ? <Text style={P.logDetail} numberOfLines={2}>{item.details || item.message}</Text> : null}
                    </View>
                    <Text style={P.logTime}>{item.createdAt ? new Date(item.createdAt).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                </View>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
        />
    );
}

// ═══ WORDS TAB ═══
function WordsTab() {
    const [words, setWords] = useState<any[]>([]);
    const [newWord, setNewWord] = useState('');
    const [loading, setLoading] = useState(true);

    const fetch_ = useCallback(async () => {
        setLoading(true);
        try { const res = await api.get('/admin/words'); setWords(res.filters || res || []); }
        catch { } finally { setLoading(false); }
    }, []);
    useEffect(() => { fetch_(); }, [fetch_]);

    const add = async () => {
        if (!newWord.trim()) return;
        try { await api.post('/admin/words', { badWord: newWord.trim() }); setNewWord(''); fetch_(); }
        catch (e: any) { Alert.alert('Hata', e?.message); }
    };

    if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#7b9fef" size="large" />;

    return (
        <View style={{ flex: 1 }}>
            <View style={P.addWordRow}>
                <TextInput style={P.addWordInput} placeholder="Yasaklı kelime ekle..." placeholderTextColor="#4b5563" value={newWord} onChangeText={setNewWord} onSubmitEditing={add} returnKeyType="done" />
                <TouchableOpacity style={P.addWordBtn} onPress={add}><Text style={P.addWordBtnText}>Ekle</Text></TouchableOpacity>
            </View>
            <FlatList
                data={words}
                keyExtractor={(item, i) => item.id || `${i}`}
                ListEmptyComponent={<View style={P.emptyState}><Text style={{ fontSize: 40 }}>✅</Text><Text style={P.emptyTitle}>Yasaklı kelime yok</Text></View>}
                renderItem={({ item }) => (
                    <View style={P.wordItem}>
                        <Text style={P.wordText}>{item.badWord || item}</Text>
                        <TouchableOpacity onPress={async () => {
                            try { await api.del(`/admin/words/${item.id}`); fetch_(); } catch { }
                        }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text style={P.wordRemove}>✕</Text>
                        </TouchableOpacity>
                    </View>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
            />
        </View>
    );
}

// ═══ IP BANS TAB ═══
function IpBansTab() {
    const [bans, setBans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const fetch_ = useCallback(async () => {
        setLoading(true);
        try { const res = await api.get('/admin/ipbans'); setBans(res.bans || res || []); }
        catch { } finally { setLoading(false); }
    }, []);
    useEffect(() => { fetch_(); }, [fetch_]);

    if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#7b9fef" size="large" />;

    return (
        <FlatList
            data={bans}
            keyExtractor={(item, i) => item.id || `${i}`}
            ListHeaderComponent={<Text style={[P.sectionHeader, { marginTop: 0 }]}>IP Yasakları ({bans.length})</Text>}
            ListEmptyComponent={<View style={P.emptyState}><Text style={{ fontSize: 40 }}>🌐</Text><Text style={P.emptyTitle}>IP yasağı yok</Text></View>}
            renderItem={({ item }) => (
                <View style={P.listItem}>
                    <View style={P.ipIcon}><Text style={{ fontSize: 14, color: '#ef4444' }}>IP</Text></View>
                    <View style={{ flex: 1 }}>
                        <Text style={P.listName}>{item.ip}</Text>
                        <Text style={P.listMeta}>{item.reason || 'Sebep belirtilmedi'}</Text>
                    </View>
                    <TouchableOpacity style={P.unbanBtn} onPress={async () => {
                        try { await api.del(`/admin/ipbans/${item.id}`); fetch_(); } catch { }
                    }}>
                        <Text style={P.unbanBtnText}>Kaldır</Text>
                    </TouchableOpacity>
                </View>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
        />
    );
}

// ═══ ABOUT TAB ═══
function AboutTab() {
    return (
        <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center', paddingTop: 40 }}>
            <View style={P.aboutLogo}><Text style={{ fontSize: 48 }}>🎤</Text></View>
            <Text style={P.aboutTitle}>SopranoChat</Text>
            <Text style={P.aboutSub}>Mobil Yönetim Paneli v1.0</Text>
            <View style={P.aboutGrid}>
                {[
                    { label: 'Platform', value: 'React Native' },
                    { label: 'Framework', value: 'Expo SDK' },
                    { label: 'Sunucu', value: 'NestJS' },
                    { label: 'Veritabanı', value: 'PostgreSQL' },
                    { label: 'ORM', value: 'Prisma' },
                    { label: 'Realtime', value: 'Socket.IO' },
                ].map((item, i) => (
                    <View key={i} style={P.aboutItem}>
                        <Text style={P.aboutItemLabel}>{item.label}</Text>
                        <Text style={P.aboutItemValue}>{item.value}</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

// ═══ MAIN ADMIN PANEL ═══
export default function AdminPanel() {
    const user = useAuthStore((s) => s.user);
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('dashboard');

    const isAdmin = ['owner', 'godmaster', 'super_admin', 'superadmin', 'admin'].includes(user?.role?.toLowerCase() || '');

    if (!isAdmin) {
        return (
            <SafeAreaView style={P.container}>
                <View style={P.noAccess}>
                    <Text style={{ fontSize: 56 }}>🔒</Text>
                    <Text style={P.noAccessTitle}>Yetkisiz Erişim</Text>
                    <Text style={P.noAccessDesc}>Bu panele erişim yetkiniz yok</Text>
                    <TouchableOpacity style={P.backButton} onPress={() => router.back()}>
                        <Text style={P.backButtonText}>← Geri Dön</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const renderTab = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardTab onNavigate={setActiveTab} />;
            case 'users': return <UsersTab />;
            case 'bans': return <BansTab />;
            case 'rooms': return <RoomsTab />;
            case 'settings': return <SettingsTab />;
            case 'logs': return <LogsTab />;
            case 'words': return <WordsTab />;
            case 'ipbans': return <IpBansTab />;
            case 'about': return <AboutTab />;
            default: return <DashboardTab onNavigate={setActiveTab} />;
        }
    };

    const tabTitle = activeTab === 'dashboard' ? 'Dashboard' :
        activeTab === 'users' ? 'Kullanıcılar' :
            activeTab === 'bans' ? 'Yasaklılar' :
                activeTab === 'rooms' ? 'Odalar' :
                    activeTab === 'settings' ? 'Ayarlar' :
                        activeTab === 'logs' ? 'Loglar' :
                            activeTab === 'words' ? 'Yasaklı Kelimeler' :
                                activeTab === 'ipbans' ? 'IP Yasakları' :
                                    activeTab === 'about' ? 'Hakkında' : 'Dashboard';

    return (
        <SafeAreaView style={P.container} edges={['top']}>
            {/* Header */}
            <View style={P.header}>
                <TouchableOpacity onPress={() => activeTab !== 'dashboard' ? setActiveTab('dashboard') : router.back()} style={P.headerBack}>
                    <Text style={P.headerBackText}>←</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={P.headerTitle}>{activeTab === 'dashboard' ? '🛡️ Yönetim Paneli' : tabTitle}</Text>
                    {activeTab !== 'dashboard' && <Text style={P.headerBreadcrumb}>Dashboard › {tabTitle}</Text>}
                </View>
            </View>

            {/* Content */}
            <View style={P.content}>
                {renderTab()}
            </View>
        </SafeAreaView>
    );
}

// ═══ PREMIUM STYLES ═══
const P = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070B14' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(123,159,239,0.08)', backgroundColor: 'rgba(15,22,38,0.6)' },
    headerBack: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(123,159,239,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(123,159,239,0.15)' },
    headerBackText: { color: '#7b9fef', fontSize: 18, fontWeight: '700' },
    headerTitle: { color: '#e5e7eb', fontSize: 17, fontWeight: '800' },
    headerBreadcrumb: { color: '#4b5563', fontSize: 10, marginTop: 1 },
    content: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },

    // Dashboard
    statCard: { width: (SW - 36) / 2, paddingVertical: 16, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, alignItems: 'center', gap: 4 },
    statValue: { fontSize: 28, fontWeight: '900' },
    statLabel: { color: '#6b7280', fontSize: 11, fontWeight: '600' },
    sectionHeader: { color: '#6b7280', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 12, marginBottom: 8, textTransform: 'uppercase' },
    quickAction: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    quickLabel: { color: '#e5e7eb', fontSize: 14, fontWeight: '700' },
    quickDesc: { color: '#4b5563', fontSize: 11, marginTop: 1 },

    // List items
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, backgroundColor: 'rgba(15,22,38,0.8)', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(123,159,239,0.1)', marginBottom: 8 },
    searchInput: { flex: 1, color: '#e5e7eb', fontSize: 14, height: 44 },
    countBadge: { backgroundColor: 'rgba(123,159,239,0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, color: '#7b9fef', fontSize: 11, fontWeight: '700', overflow: 'hidden' },
    listItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', marginBottom: 6 },
    listAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#0F1626' },
    listName: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' },
    listMeta: { color: '#4b5563', fontSize: 11 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    rolePill: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 4 },
    rolePillText: { fontSize: 10, fontWeight: '700' },

    // Profile detail
    profileCard: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(123,159,239,0.03)', borderWidth: 1, borderColor: 'rgba(123,159,239,0.08)', marginBottom: 16 },
    profileAvatar: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#0F1626', borderWidth: 2, borderColor: 'rgba(123,159,239,0.2)', marginBottom: 12 },
    profileName: { color: '#fff', fontSize: 20, fontWeight: '800' },
    profileRoleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, borderWidth: 1, marginTop: 6 },
    profileRoleText: { fontSize: 11, fontWeight: '700' },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    infoItem: { width: (SW - 36) / 2, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    infoLabel: { color: '#4b5563', fontSize: 10, fontWeight: '600', marginBottom: 2 },
    infoValue: { color: '#e5e7eb', fontSize: 13, fontWeight: '600' },
    roleChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    roleChipText: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
    dangerBtn: { paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', alignItems: 'center' },
    dangerBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },

    // Bans
    banIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)', alignItems: 'center', justifyContent: 'center' },
    unbanBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(34,197,94,0.08)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
    unbanBtnText: { color: '#22c55e', fontSize: 11, fontWeight: '700' },

    // Rooms
    roomIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(168,85,247,0.06)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.15)', alignItems: 'center', justifyContent: 'center' },
    lockBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },

    // Settings
    settingCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 14, marginBottom: 8 },
    settingCardLabel: { color: '#6b7280', fontSize: 11, fontWeight: '600', marginBottom: 8 },
    settingTextInput: { backgroundColor: '#070B14', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: '#e5e7eb', fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', minHeight: 60, textAlignVertical: 'top' },
    switchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', marginBottom: 6, gap: 12 },
    switchLabel: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' },
    switchDesc: { color: '#4b5563', fontSize: 11, marginTop: 1 },

    // Logs
    logItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
    logDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7b9fef', marginTop: 4 },
    logEvent: { color: '#7b9fef', fontSize: 12, fontWeight: '600' },
    logDetail: { color: '#6b7280', fontSize: 11, marginTop: 2 },
    logTime: { color: '#374151', fontSize: 10, fontWeight: '500' },

    // Words
    addWordRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    addWordInput: { flex: 1, height: 44, backgroundColor: 'rgba(15,22,38,0.8)', borderRadius: 12, paddingHorizontal: 14, color: '#e5e7eb', fontSize: 14, borderWidth: 1, borderColor: 'rgba(123,159,239,0.1)' },
    addWordBtn: { paddingHorizontal: 18, height: 44, borderRadius: 12, backgroundColor: 'rgba(123,159,239,0.12)', borderWidth: 1, borderColor: 'rgba(123,159,239,0.25)', justifyContent: 'center' },
    addWordBtnText: { color: '#7b9fef', fontSize: 13, fontWeight: '700' },
    wordItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.04)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.1)', marginBottom: 6 },
    wordText: { color: '#ef4444', fontSize: 14, fontWeight: '500' },
    wordRemove: { color: '#6b7280', fontSize: 16, fontWeight: '700' },

    // IP Bans
    ipIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.12)', alignItems: 'center', justifyContent: 'center' },

    // About
    aboutLogo: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(123,159,239,0.06)', borderWidth: 2, borderColor: 'rgba(123,159,239,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    aboutTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 4 },
    aboutSub: { color: '#6b7280', fontSize: 13, marginBottom: 24 },
    aboutGrid: { width: '100%', gap: 6 },
    aboutItem: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    aboutItemLabel: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
    aboutItemValue: { color: '#e5e7eb', fontSize: 12, fontWeight: '600' },

    // Empty states
    emptyState: { alignItems: 'center', paddingVertical: 50 },
    emptyTitle: { color: '#6b7280', fontSize: 15, fontWeight: '700', marginTop: 8 },
    emptyDesc: { color: '#4b5563', fontSize: 12, marginTop: 4 },

    // No access
    noAccess: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
    noAccessTitle: { color: '#ef4444', fontSize: 20, fontWeight: '800', marginTop: 16, marginBottom: 4 },
    noAccessDesc: { color: '#6b7280', fontSize: 14, textAlign: 'center' },
    backButton: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(123,159,239,0.12)', borderWidth: 1, borderColor: 'rgba(123,159,239,0.25)' },
    backButtonText: { color: '#7b9fef', fontSize: 14, fontWeight: '700' },
});
