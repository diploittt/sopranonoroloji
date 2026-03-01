import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    FlatList,
    Image,
    TextInput,
    ScrollView,
} from 'react-native';
import { getSocket } from '@/services/socket';

interface RoomUser {
    userId: string;
    displayName: string;
    avatar: string;
    role: string;
    status: string;
    isMuted?: boolean;
    isGagged?: boolean;
    isBanned?: boolean;
}

interface RoomInfo {
    id: string;
    name: string;
    slug: string;
    userCount: number;
    maxParticipants?: number | null;
    status: string;
    isLocked: boolean;
    isMeetingRoom: boolean;
    isVipRoom: boolean;
    users: RoomUser[];
}

interface RoomMonitorProps {
    visible: boolean;
    onClose: () => void;
    currentRoomSlug: string;
    onNavigateToRoom?: (slug: string) => void;
    currentUserRole?: string;
}

const ROLE_ICONS: Record<string, string> = {
    godmaster: '🔮', owner: '👑', super_admin: '🛡️', superadmin: '🛡️',
    admin: '🛡️', moderator: '⚔️', operator: '🔧', vip: '⭐',
};

const ROLE_COLORS: Record<string, string> = {
    godmaster: '#a855f7', owner: '#ef4444', super_admin: '#f97316', superadmin: '#f97316',
    admin: '#f59e0b', moderator: '#8b5cf6', operator: '#06b6d4', vip: '#facc15',
    member: '#94a3b8', guest: '#64748b',
};

export default function RoomMonitorModal({ visible, onClose, currentRoomSlug, onNavigateToRoom, currentUserRole }: RoomMonitorProps) {
    const [rooms, setRooms] = useState<RoomInfo[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<RoomInfo | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!visible) return;
        const socket = getSocket();
        if (!socket) return;

        // Request room monitor data
        socket.emit('admin:monitor:rooms', {}, (data: any) => {
            if (Array.isArray(data)) setRooms(data);
            else if (data?.rooms) setRooms(data.rooms);
            setLoading(false);
        });

        // Listen for updates
        const onUpdate = (data: any) => {
            if (Array.isArray(data)) setRooms(data);
            else if (data?.rooms) setRooms(data.rooms);
        };
        socket.on('admin:monitor:update', onUpdate);
        return () => { socket.off('admin:monitor:update', onUpdate); };
    }, [visible]);

    const filteredRooms = rooms.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.slug.toLowerCase().includes(search.toLowerCase())
    );

    const totalUsers = rooms.reduce((sum, r) => sum + r.userCount, 0);

    const handleUserAction = (action: string, user: RoomUser, room: RoomInfo) => {
        const socket = getSocket();
        if (!socket) return;
        socket.emit(`room:${action}`, { roomId: room.slug, userId: user.userId });
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={s.container}>
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={{ color: '#7b9fef', fontSize: 18, fontWeight: '700' }}>←</Text>
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>🖥️ Oda Monitörü</Text>
                    <View style={s.statsBadge}>
                        <Text style={s.statsText}>{rooms.length} oda • {totalUsers} kullanıcı</Text>
                    </View>
                </View>

                {/* Search */}
                <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
                    <TextInput
                        style={s.searchInput}
                        placeholder="Oda ara..."
                        placeholderTextColor="#4b5563"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                {/* Room list or Room detail */}
                {selectedRoom ? (
                    <ScrollView style={{ flex: 1, paddingHorizontal: 12 }}>
                        {/* Room detail header */}
                        <TouchableOpacity onPress={() => setSelectedRoom(null)} style={s.backRow}>
                            <Text style={{ color: '#7b9fef', fontSize: 13, fontWeight: '600' }}>← Tüm Odalar</Text>
                        </TouchableOpacity>

                        <View style={s.roomDetailCard}>
                            <Text style={s.roomDetailName}>{selectedRoom.name}</Text>
                            <Text style={s.roomDetailMeta}>
                                {selectedRoom.userCount} kullanıcı • {selectedRoom.isLocked ? '🔒 Kilitli' : '🔓 Açık'}
                                {selectedRoom.isMeetingRoom ? ' • 📋 Toplantı' : ''}
                                {selectedRoom.isVipRoom ? ' • ⭐ VIP' : ''}
                            </Text>
                        </View>

                        {/* User list */}
                        <Text style={s.sectionTitle}>Kullanıcılar ({selectedRoom.users?.length || 0})</Text>
                        {(selectedRoom.users || []).map(user => (
                            <View key={user.userId} style={s.userRow}>
                                <Image
                                    source={{ uri: user.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.displayName}` }}
                                    style={s.userAvatar}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.userDisplayName, { color: ROLE_COLORS[user.role] || '#e5e7eb' }]}>
                                        {ROLE_ICONS[user.role] || ''} {user.displayName}
                                    </Text>
                                    <Text style={s.userMeta}>
                                        {user.role} • {user.status || 'online'}
                                        {user.isMuted ? ' • 🔇' : ''}
                                        {user.isGagged ? ' • 🤐' : ''}
                                    </Text>
                                </View>
                                {/* Admin actions */}
                                <View style={{ flexDirection: 'row', gap: 4 }}>
                                    <TouchableOpacity style={s.miniBtn} onPress={() => handleUserAction('mute', user, selectedRoom)}>
                                        <Text style={{ fontSize: 12 }}>{user.isMuted ? '🔊' : '🔇'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={s.miniBtn} onPress={() => handleUserAction('kick', user, selectedRoom)}>
                                        <Text style={{ fontSize: 12 }}>🚫</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                ) : (
                    <FlatList
                        data={filteredRooms}
                        keyExtractor={r => r.id || r.slug}
                        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
                        renderItem={({ item: room }) => {
                            const isActive = room.slug === currentRoomSlug;
                            return (
                                <TouchableOpacity
                                    style={[s.roomCard, isActive && s.roomCardActive]}
                                    onPress={() => setSelectedRoom(room)}
                                >
                                    <View style={s.roomCardHeader}>
                                        <Text style={s.roomName}>{room.name}</Text>
                                        <Text style={s.roomUserCount}>{room.userCount}</Text>
                                    </View>
                                    <View style={s.roomCardMeta}>
                                        <Text style={s.roomMetaText}>
                                            {room.isLocked ? '🔒' : '🔓'} {room.status}
                                            {room.isMeetingRoom ? ' • 📋' : ''}
                                            {room.isVipRoom ? ' • ⭐' : ''}
                                        </Text>
                                        {/* User avatars preview */}
                                        <View style={{ flexDirection: 'row' }}>
                                            {(room.users || []).slice(0, 4).map((u, i) => (
                                                <Image
                                                    key={u.userId}
                                                    source={{ uri: u.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${u.displayName}` }}
                                                    style={[s.previewAvatar, { marginLeft: i > 0 ? -6 : 0 }]}
                                                />
                                            ))}
                                            {(room.users?.length || 0) > 4 && (
                                                <View style={[s.previewAvatar, { marginLeft: -6, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' }]}>
                                                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>+{(room.users?.length || 0) - 4}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    {/* Navigate button */}
                                    {onNavigateToRoom && !isActive && (
                                        <TouchableOpacity
                                            style={s.joinBtn}
                                            onPress={() => { onNavigateToRoom(room.slug); onClose(); }}
                                        >
                                            <Text style={s.joinBtnText}>Odaya Git →</Text>
                                        </TouchableOpacity>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                )}
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070B14' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    headerTitle: { flex: 1, color: '#e5e7eb', fontSize: 16, fontWeight: '800' },
    statsBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(123,159,239,0.1)', borderWidth: 1, borderColor: 'rgba(123,159,239,0.2)' },
    statsText: { color: '#7b9fef', fontSize: 10, fontWeight: '600' },
    searchInput: { height: 40, backgroundColor: '#0F1626', borderRadius: 10, paddingHorizontal: 14, color: '#e5e7eb', fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    // Room cards
    roomCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 12, marginBottom: 6 },
    roomCardActive: { borderColor: 'rgba(123,159,239,0.3)', backgroundColor: 'rgba(123,159,239,0.05)' },
    roomCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    roomName: { color: '#e5e7eb', fontSize: 14, fontWeight: '600' },
    roomUserCount: { color: '#7b9fef', fontSize: 13, fontWeight: '700' },
    roomCardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    roomMetaText: { color: '#6b7280', fontSize: 11 },
    previewAvatar: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#070B14' },
    joinBtn: { marginTop: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(123,159,239,0.1)', borderWidth: 1, borderColor: 'rgba(123,159,239,0.2)', alignItems: 'center' },
    joinBtnText: { color: '#7b9fef', fontSize: 11, fontWeight: '600' },
    // Room detail
    backRow: { paddingVertical: 8 },
    roomDetailCard: { backgroundColor: 'rgba(123,159,239,0.06)', borderWidth: 1, borderColor: 'rgba(123,159,239,0.15)', borderRadius: 14, padding: 14, marginBottom: 12 },
    roomDetailName: { color: '#e5e7eb', fontSize: 16, fontWeight: '700' },
    roomDetailMeta: { color: '#6b7280', fontSize: 12, marginTop: 4 },
    sectionTitle: { color: '#6b7280', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', marginBottom: 4 },
    userAvatar: { width: 32, height: 32, borderRadius: 16 },
    userDisplayName: { fontSize: 13, fontWeight: '600' },
    userMeta: { color: '#6b7280', fontSize: 10, marginTop: 1 },
    miniBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
});
