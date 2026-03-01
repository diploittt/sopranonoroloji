import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Modal,
    ScrollView,
} from 'react-native';
import { getSocket } from '@/services/socket';

// ═══ Role definitions — web ile aynı ═══
const ROLE_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
    owner: { label: 'Sahip', color: '#ef4444', emoji: '👑' },
    godmaster: { label: 'GodMaster', color: '#fbbf24', emoji: '⚡' },
    super_admin: { label: 'Süper Admin', color: '#f97316', emoji: '🔥' },
    superadmin: { label: 'Süper Admin', color: '#f97316', emoji: '🔥' },
    admin: { label: 'Admin', color: '#f59e0b', emoji: '🛡️' },
    moderator: { label: 'Moderatör', color: '#8b5cf6', emoji: '🎯' },
    operator: { label: 'Operatör', color: '#06b6d4', emoji: '🎧' },
    vip: { label: 'VIP', color: '#ec4899', emoji: '💎' },
    member: { label: 'Üye', color: '#10b981', emoji: '🏷️' },
    guest: { label: 'Misafir', color: '#6b7280', emoji: '👤' },
};

interface ProfileModalProps {
    visible: boolean;
    onClose: () => void;
    user: {
        userId: string;
        username?: string;
        displayName?: string;
        avatar?: string;
        role?: string;
        gender?: string;
        isMuted?: boolean;
        isGagged?: boolean;
        isBanned?: boolean;
    };
    currentUserRole?: string;
    roomId?: string;
    onDM?: () => void;
}

export default function ProfileModal({
    visible,
    onClose,
    user,
    currentUserRole,
    roomId,
    onDM,
}: ProfileModalProps) {
    const role = ROLE_LABELS[user.role?.toLowerCase() || 'guest'] || ROLE_LABELS.guest;
    const avatarUri = user.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(user.username || user.displayName || user.userId)}`;

    // Admin actions — web ile aynı yetki kontrolleri
    const isAdmin = ['owner', 'godmaster', 'super_admin', 'superadmin', 'admin', 'moderator', 'operator'].includes(currentUserRole?.toLowerCase() || '');

    const emitAction = (event: string, data?: any) => {
        const socket = getSocket();
        if (socket) socket.emit(event, { roomId, userId: user.userId, ...data });
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.container} onStartShouldSetResponder={() => true}>
                    {/* ═══ Profile Header ═══ */}
                    <View style={styles.profileHeader}>
                        <Image source={{ uri: avatarUri }} style={styles.avatar} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.displayName}>
                                {user.displayName || user.username}
                            </Text>
                            <View style={styles.roleBadge}>
                                <Text style={[styles.roleText, { color: role.color }]}>
                                    {role.emoji} {role.label}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.actions}>
                        {/* ═══ Social Actions ═══ */}
                        <Text style={styles.sectionTitle}>💬 İletişim</Text>
                        {onDM && (
                            <TouchableOpacity style={styles.actionBtn} onPress={() => { onDM(); onClose(); }}>
                                <Text style={styles.actionEmoji}>✉️</Text>
                                <Text style={styles.actionText}>Özel Mesaj Gönder</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.actionBtn} onPress={() => emitAction('gift:open')}>
                            <Text style={styles.actionEmoji}>🎁</Text>
                            <Text style={styles.actionText}>Hediye Gönder</Text>
                        </TouchableOpacity>

                        {/* ═══ Admin Actions ═══ */}
                        {isAdmin && (
                            <>
                                <Text style={styles.sectionTitle}>🛡️ Yönetim</Text>

                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => emitAction(user.isMuted ? 'room:unmute' : 'room:mute')}
                                >
                                    <Text style={styles.actionEmoji}>{user.isMuted ? '🔊' : '🔇'}</Text>
                                    <Text style={styles.actionText}>
                                        {user.isMuted ? 'Susturmayı Kaldır' : 'Sustur (Mute)'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => emitAction(user.isGagged ? 'room:ungag' : 'room:gag')}
                                >
                                    <Text style={styles.actionEmoji}>{user.isGagged ? '💬' : '🤐'}</Text>
                                    <Text style={styles.actionText}>
                                        {user.isGagged ? 'Yazma Yasağını Kaldır' : 'Yazma Yasağı (Gag)'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.actionBtn}
                                    onPress={() => emitAction('room:kick')}
                                >
                                    <Text style={styles.actionEmoji}>🚫</Text>
                                    <Text style={styles.actionText}>Odadan At (Kick)</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.dangerBtn]}
                                    onPress={() => emitAction(user.isBanned ? 'room:unban' : 'room:ban')}
                                >
                                    <Text style={styles.actionEmoji}>{user.isBanned ? '✅' : '⛔'}</Text>
                                    <Text style={[styles.actionText, styles.dangerText]}>
                                        {user.isBanned ? 'Yasağı Kaldır' : 'Yasakla (Ban)'}
                                    </Text>
                                </TouchableOpacity>

                                {/* Role change */}
                                <Text style={styles.sectionTitle}>👤 Rol Değiştir</Text>
                                <View style={styles.roleGrid}>
                                    {['guest', 'member', 'vip', 'operator', 'moderator', 'admin'].map(r => {
                                        const roleInfo = ROLE_LABELS[r];
                                        const isActive = user.role?.toLowerCase() === r;
                                        return (
                                            <TouchableOpacity
                                                key={r}
                                                style={[styles.roleChip, isActive && { borderColor: roleInfo.color, backgroundColor: roleInfo.color + '15' }]}
                                                onPress={() => emitAction('room:change-role', { role: r })}
                                                disabled={isActive}
                                            >
                                                <Text style={[styles.roleChipText, { color: roleInfo.color }]}>
                                                    {roleInfo.emoji} {roleInfo.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </>
                        )}
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    container: {
        width: '85%',
        maxHeight: '75%',
        backgroundColor: '#0F1626',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 2,
        borderColor: 'rgba(123,159,239,0.3)',
    },
    displayName: {
        color: '#e5e7eb',
        fontSize: 16,
        fontWeight: '700',
    },
    roleBadge: {
        marginTop: 2,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeText: {
        color: '#6b7280',
        fontSize: 16,
    },
    actions: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#6b7280',
        letterSpacing: 1,
        marginTop: 12,
        marginBottom: 6,
        paddingHorizontal: 4,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 4,
    },
    dangerBtn: {
        borderColor: 'rgba(239,68,68,0.2)',
        backgroundColor: 'rgba(239,68,68,0.05)',
    },
    actionEmoji: {
        fontSize: 18,
    },
    actionText: {
        color: '#e5e7eb',
        fontSize: 13,
        fontWeight: '500',
    },
    dangerText: {
        color: '#ef4444',
    },
    roleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        paddingBottom: 12,
    },
    roleChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    roleChipText: {
        fontSize: 11,
        fontWeight: '600',
    },
});
