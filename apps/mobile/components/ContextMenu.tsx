import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
} from 'react-native';

interface ContextMenuProps {
    visible: boolean;
    onClose: () => void;
    targetUser: {
        userId: string;
        username?: string;
        displayName?: string;
        role?: string;
        isMuted?: boolean;
        isGagged?: boolean;
    };
    currentUserRole?: string;
    onViewProfile: () => void;
    onSendDM: () => void;
    onSendGift: () => void;
    onMute: () => void;
    onGag: () => void;
    onKick: () => void;
    onBan: () => void;
}

export default function ContextMenu({
    visible,
    onClose,
    targetUser,
    currentUserRole,
    onViewProfile,
    onSendDM,
    onSendGift,
    onMute,
    onGag,
    onKick,
    onBan,
}: ContextMenuProps) {
    const isAdmin = ['owner', 'godmaster', 'super_admin', 'superadmin', 'admin', 'moderator', 'operator']
        .includes(currentUserRole?.toLowerCase() || '');

    const actions = [
        { emoji: '👤', label: 'Profili Görüntüle', onPress: onViewProfile },
        { emoji: '✉️', label: 'Özel Mesaj', onPress: onSendDM },
        { emoji: '🎁', label: 'Hediye Gönder', onPress: onSendGift },
    ];

    const adminActions = isAdmin ? [
        { emoji: targetUser.isMuted ? '🔊' : '🔇', label: targetUser.isMuted ? 'Susturmayı Kaldır' : 'Sustur', onPress: onMute },
        { emoji: targetUser.isGagged ? '💬' : '🤐', label: targetUser.isGagged ? 'Yazma Yasağını Kaldır' : 'Yazma Yasağı', onPress: onGag },
        { emoji: '🚫', label: 'Odadan At', onPress: onKick },
        { emoji: '⛔', label: 'Yasakla', onPress: onBan, danger: true },
    ] : [];

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
                <View style={styles.menu}>
                    {/* User header */}
                    <View style={styles.menuHeader}>
                        <Text style={styles.menuTitle}>
                            {targetUser.displayName || targetUser.username}
                        </Text>
                    </View>

                    {/* Social actions */}
                    {actions.map((action, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.menuItem}
                            onPress={() => { action.onPress(); onClose(); }}
                        >
                            <Text style={styles.menuEmoji}>{action.emoji}</Text>
                            <Text style={styles.menuLabel}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}

                    {/* Admin divider */}
                    {adminActions.length > 0 && <View style={styles.divider} />}

                    {/* Admin actions */}
                    {adminActions.map((action, i) => (
                        <TouchableOpacity
                            key={`admin-${i}`}
                            style={[styles.menuItem, (action as any).danger && styles.menuItemDanger]}
                            onPress={() => { action.onPress(); onClose(); }}
                        >
                            <Text style={styles.menuEmoji}>{action.emoji}</Text>
                            <Text style={[styles.menuLabel, (action as any).danger && styles.menuLabelDanger]}>
                                {action.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
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
    menu: {
        width: '72%',
        backgroundColor: '#0F1626',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    menuHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    menuTitle: {
        color: '#e5e7eb',
        fontSize: 14,
        fontWeight: '700',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    menuItemDanger: {
        backgroundColor: 'rgba(239,68,68,0.05)',
    },
    menuEmoji: {
        fontSize: 16,
    },
    menuLabel: {
        color: '#e5e7eb',
        fontSize: 13,
        fontWeight: '500',
    },
    menuLabelDanger: {
        color: '#ef4444',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
        marginHorizontal: 12,
    },
});
