import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    FlatList,
    Image,
    Switch,
} from 'react-native';
import { getSocket } from '@/services/socket';

interface MeetingModalProps {
    visible: boolean;
    onClose: () => void;
    roomSlug: string;
    users: any[];
    mode: 'meeting' | 'conference';
}

export default function MeetingModal({ visible, onClose, roomSlug, users, mode }: MeetingModalProps) {
    const [roomName, setRoomName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [isPrivate, setIsPrivate] = useState(false);
    const [error, setError] = useState('');

    const toggleUser = (userId: string) => {
        setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    const handleCreate = () => {
        if (!roomName.trim()) { setError('Oda adı gerekli'); return; }
        const socket = getSocket();
        if (socket) {
            socket.emit('admin:roomAction', {
                action: 'create',
                name: roomName.trim(),
                isMeetingRoom: true,
                isPrivate,
                invitedUsers: selectedUsers,
                type: mode,
            });
        }
        onClose();
    };

    const availableUsers = (users || []).filter((u: any) => {
        if (u.role?.toLowerCase() === 'godmaster') {
            if ((u.visibilityMode || 'hidden') === 'hidden') return false;
        }
        return true;
    });

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
                <View style={s.container} onStartShouldSetResponder={() => true}>
                    {/* Header */}
                    <View style={s.header}>
                        <Text style={s.headerTitle}>
                            {mode === 'meeting' ? '📋 Toplantı Oluştur' : '📞 Konferans Oluştur'}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                            <Text style={s.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Room name input */}
                    <View style={s.section}>
                        <Text style={s.label}>Oda Adı</Text>
                        <TextInput
                            style={s.input}
                            value={roomName}
                            onChangeText={t => { setRoomName(t); setError(''); }}
                            placeholder={mode === 'meeting' ? 'Toplantı adı...' : 'Konferans adı...'}
                            placeholderTextColor="#4b5563"
                        />
                        {error ? <Text style={s.errorText}>{error}</Text> : null}
                    </View>

                    {/* Private toggle */}
                    <View style={s.toggleRow}>
                        <Text style={s.toggleLabel}>🔒 Gizli oda (sadece davet edilenler)</Text>
                        <Switch
                            value={isPrivate}
                            onValueChange={setIsPrivate}
                            trackColor={{ false: '#374151', true: 'rgba(123,159,239,0.4)' }}
                            thumbColor={isPrivate ? '#7b9fef' : '#9ca3af'}
                        />
                    </View>

                    {/* User selection list */}
                    {availableUsers.length > 0 && (
                        <View style={s.section}>
                            <Text style={s.label}>Katılımcı Davet Et ({selectedUsers.length})</Text>
                            <FlatList
                                data={availableUsers}
                                keyExtractor={(u: any) => u.id || u.userId}
                                style={s.userList}
                                renderItem={({ item: u }) => {
                                    const selected = selectedUsers.includes(u.id || u.userId);
                                    return (
                                        <TouchableOpacity
                                            style={[s.userRow, selected && s.userRowSelected]}
                                            onPress={() => toggleUser(u.id || u.userId)}
                                        >
                                            <Image
                                                source={{ uri: u.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${u.username || u.displayName}` }}
                                                style={s.userAvatar}
                                            />
                                            <Text style={s.userName}>{u.username || u.displayName}</Text>
                                            {selected && <Text style={s.checkMark}>✓</Text>}
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        </View>
                    )}

                    {/* Create button */}
                    <TouchableOpacity style={s.createBtn} onPress={handleCreate}>
                        <Text style={s.createBtnText}>
                            {mode === 'meeting' ? '📋 Toplantı Başlat' : '📞 Konferans Başlat'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    container: { width: '88%', maxHeight: '75%', backgroundColor: '#0F1626', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    headerTitle: { color: '#e5e7eb', fontSize: 16, fontWeight: '700' },
    closeBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    closeBtnText: { color: '#6b7280', fontSize: 16 },
    section: { paddingHorizontal: 16, marginTop: 12 },
    label: { color: '#6b7280', fontSize: 11, fontWeight: '600', marginBottom: 6 },
    input: { height: 44, backgroundColor: '#10121b', borderRadius: 12, paddingHorizontal: 14, color: '#e5e7eb', fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    errorText: { color: '#ef4444', fontSize: 11, marginTop: 4 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, marginTop: 8, marginHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    toggleLabel: { color: '#e5e7eb', fontSize: 12 },
    userList: { maxHeight: 180, borderRadius: 12, backgroundColor: '#10121b', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 4 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8 },
    userRowSelected: { backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
    userAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#0d0f17' },
    userName: { flex: 1, color: '#e5e7eb', fontSize: 13 },
    checkMark: { color: '#7b9fef', fontSize: 14 },
    createBtn: { marginHorizontal: 16, marginVertical: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(123,159,239,0.15)', borderWidth: 1, borderColor: 'rgba(123,159,239,0.3)', alignItems: 'center' },
    createBtnText: { color: '#7b9fef', fontSize: 14, fontWeight: '700' },
});
