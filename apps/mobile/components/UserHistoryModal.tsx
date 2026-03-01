import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, ActivityIndicator } from 'react-native';
import { getSocket } from '@/services/socket';

interface LogEntry {
    id: string;
    event: string;
    adminId?: string;
    targetUserId?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    admin?: { id: string; displayName: string };
    targetUser?: { id: string; displayName: string };
}

interface UserHistoryModalProps {
    visible: boolean;
    onClose: () => void;
    userId: string;
    displayName: string;
}

const EVENT_COLORS: Record<string, string> = {
    'user.login': '#22c55e',
    'user.logout': '#6b7280',
    'user.register': '#3b82f6',
    'user.update': '#8b5cf6',
    'user.ban': '#ef4444',
    'user.unban': '#22c55e',
    'room.join': '#3b82f6',
    'room.leave': '#6b7280',
    'room.mute': '#f59e0b',
    'room.unmute': '#22c55e',
    'room.gag': '#f59e0b',
    'room.ungag': '#22c55e',
    'room.kick': '#ef4444',
    'ban.create': '#ef4444',
    'ban.remove': '#22c55e',
};

const EVENT_LABELS: Record<string, string> = {
    'user.login': 'Giriş Yapıldı',
    'user.logout': 'Çıkış Yapıldı',
    'user.register': 'Kayıt Olundu',
    'user.update': 'Bilgi Güncellendi',
    'user.ban': 'Yasaklandı',
    'user.unban': 'Yasak Kaldırıldı',
    'room.join': 'Odaya Katıldı',
    'room.leave': 'Odadan Ayrıldı',
    'room.mute': 'Sessize Alındı',
    'room.unmute': 'Ses Açıldı',
    'room.gag': 'Susturuldu',
    'room.ungag': 'Susturma Kaldırıldı',
    'room.kick': 'Atıldı',
    'ban.create': 'Ban Oluşturuldu',
    'ban.remove': 'Ban Kaldırıldı',
};

export default function UserHistoryModal({ visible, onClose, userId, displayName }: UserHistoryModalProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!visible || !userId) return;
        setLoading(true);
        const socket = getSocket();
        if (!socket) { setLoading(false); return; }

        socket.emit('admin:user-history', { userId }, (data: any) => {
            setLogs(data?.logs || []);
            setLoading(false);
        });
    }, [visible, userId]);

    const formatDate = (d: string) => {
        try {
            const date = new Date(d);
            return `${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
        } catch { return d; }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={s.container}>
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={onClose}>
                        <Text style={{ color: '#7b9fef', fontSize: 18, fontWeight: '700' }}>←</Text>
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>📋 {displayName} — Geçmiş</Text>
                    <Text style={s.countBadge}>{logs.length}</Text>
                </View>

                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#7b9fef" />
                    </View>
                ) : logs.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 32 }}>📭</Text>
                        <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 8 }}>Kayıt bulunamadı</Text>
                    </View>
                ) : (
                    <FlatList
                        data={logs}
                        keyExtractor={l => l.id}
                        contentContainerStyle={{ padding: 12 }}
                        renderItem={({ item }) => {
                            const color = EVENT_COLORS[item.event] || '#6b7280';
                            const label = EVENT_LABELS[item.event] || item.event;
                            return (
                                <View style={s.logItem}>
                                    <View style={[s.logDot, { backgroundColor: color }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[s.logEvent, { color }]}>{label}</Text>
                                        {item.admin && (
                                            <Text style={s.logMeta}>Admin: {item.admin.displayName}</Text>
                                        )}
                                        {item.metadata && Object.keys(item.metadata).length > 0 && (
                                            <Text style={s.logMeta} numberOfLines={2}>
                                                {Object.entries(item.metadata)
                                                    .filter(([k]) => !['password', 'token', 'secret', 'hash'].includes(k))
                                                    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                                                    .join(', ')}
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={s.logDate}>{formatDate(item.createdAt)}</Text>
                                </View>
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
    headerTitle: { flex: 1, color: '#e5e7eb', fontSize: 15, fontWeight: '700' },
    countBadge: { backgroundColor: 'rgba(123,159,239,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, color: '#7b9fef', fontSize: 11, fontWeight: '700', overflow: 'hidden' },
    logItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    logDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
    logEvent: { fontSize: 13, fontWeight: '600' },
    logMeta: { color: '#6b7280', fontSize: 10, marginTop: 2 },
    logDate: { color: '#4b5563', fontSize: 10 },
});
