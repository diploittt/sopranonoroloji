import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    FlatList,
    Image,
    TextInput,
} from 'react-native';
import { getSocket } from '@/services/socket';

const ROLE_COLORS: Record<string, string> = {
    godmaster: '#a855f7', owner: '#ef4444', super_admin: '#f97316',
    admin: '#f59e0b', moderator: '#8b5cf6', operator: '#06b6d4',
    vip: '#facc15', member: '#94a3b8', guest: '#64748b',
};

const ROLE_ICONS: Record<string, string> = {
    godmaster: '🔮', owner: '👑', super_admin: '🛡️', admin: '🛡️',
    moderator: '⚔️', operator: '🔧', vip: '⭐',
};

interface AllUsersModalProps {
    visible: boolean;
    onClose: () => void;
    onUserPress?: (user: any) => void;
}

export default function AllUsersModal({ visible, onClose, onUserPress }: AllUsersModalProps) {
    const [users, setUsers] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!visible) return;
        const socket = getSocket();
        if (!socket) return;

        socket.emit('admin:online-users', {}, (data: any) => {
            if (Array.isArray(data)) setUsers(data);
            else if (data?.users) setUsers(data.users);
            setLoading(false);
        });

        const onUpdate = (data: any) => {
            if (Array.isArray(data)) setUsers(data);
            else if (data?.users) setUsers(data.users);
        };
        socket.on('admin:online-users:update', onUpdate);
        return () => { socket.off('admin:online-users:update', onUpdate); };
    }, [visible]);

    const filtered = users.filter(u =>
        (u.displayName || u.username || '').toLowerCase().includes(search.toLowerCase())
    );

    const grouped = filtered.reduce((acc: Record<string, any[]>, u) => {
        const role = (u.role || 'guest').toLowerCase();
        if (!acc[role]) acc[role] = [];
        acc[role].push(u);
        return acc;
    }, {});

    const roleOrder = ['godmaster', 'owner', 'super_admin', 'admin', 'moderator', 'operator', 'vip', 'member', 'guest'];
    const sections = roleOrder.filter(r => grouped[r]?.length).map(r => ({ role: r, users: grouped[r] }));

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={s.container}>
                <View style={s.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={{ color: '#7b9fef', fontSize: 18, fontWeight: '700' }}>←</Text>
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>👥 Tüm Çevrimiçi Kullanıcılar</Text>
                    <View style={s.badge}>
                        <Text style={s.badgeText}>{users.length}</Text>
                    </View>
                </View>

                <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
                    <TextInput
                        style={s.searchInput}
                        placeholder="Kullanıcı ara..."
                        placeholderTextColor="#4b5563"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                <FlatList
                    data={sections}
                    keyExtractor={item => item.role}
                    contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
                    renderItem={({ item: section }) => (
                        <View style={{ marginBottom: 12 }}>
                            <View style={s.sectionHeader}>
                                <Text style={[s.sectionTitle, { color: ROLE_COLORS[section.role] || '#6b7280' }]}>
                                    {ROLE_ICONS[section.role] || '👤'} {section.role.toUpperCase()} ({section.users.length})
                                </Text>
                            </View>
                            {section.users.map(user => (
                                <TouchableOpacity
                                    key={user.userId || user.id}
                                    style={s.userRow}
                                    onPress={() => onUserPress?.(user)}
                                >
                                    <Image
                                        source={{ uri: user.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.displayName || user.username}` }}
                                        style={s.avatar}
                                    />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.userName, { color: ROLE_COLORS[section.role] || '#e5e7eb' }]}>
                                            {user.displayName || user.username}
                                        </Text>
                                        <Text style={s.userMeta}>
                                            {user.currentRoom || 'Lobi'} • {user.status || 'online'}
                                            {user.platform === 'mobile' ? ' 📱' : ''}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                />
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070B14' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    headerTitle: { flex: 1, color: '#e5e7eb', fontSize: 15, fontWeight: '800' },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(34,197,94,0.15)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
    badgeText: { color: '#22c55e', fontSize: 11, fontWeight: '700' },
    searchInput: { height: 40, backgroundColor: '#0F1626', borderRadius: 10, paddingHorizontal: 14, color: '#e5e7eb', fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    sectionHeader: { paddingVertical: 6, paddingHorizontal: 4 },
    sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: 3 },
    avatar: { width: 32, height: 32, borderRadius: 16 },
    userName: { fontSize: 13, fontWeight: '600' },
    userMeta: { color: '#6b7280', fontSize: 10, marginTop: 1 },
});
