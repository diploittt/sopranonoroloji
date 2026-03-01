import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '@/constants';

export interface RoomInfo {
    id: string;
    name: string;
    slug: string;
    status: string;
    isLocked: boolean;
    isVipRoom: boolean;
    isMeetingRoom: boolean;
    participantCount: number;
    buttonColor?: string | null;
}

interface RoomHeaderProps {
    currentRoomSlug: string;
    rooms: RoomInfo[];
    participantCount: number;
    onRoomPress: (room: RoomInfo) => void;
    onBackPress: () => void;
    onToggleUsers: () => void;
    showUsers: boolean;
}

export default function RoomHeader({
    currentRoomSlug,
    rooms,
    participantCount,
    onRoomPress,
    onBackPress,
    onToggleUsers,
    showUsers,
}: RoomHeaderProps) {
    const currentRoom = rooms.find(r => r.slug === currentRoomSlug);
    const roomName = currentRoom?.name || currentRoomSlug;
    const filteredRooms = rooms.filter(r => !r.isMeetingRoom);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                {/* Back button */}
                <TouchableOpacity onPress={onBackPress} style={styles.backBtn}>
                    <Text style={styles.backIcon}>←</Text>
                </TouchableOpacity>

                {/* User list toggle — sol tarafta, her zaman görünür */}
                <TouchableOpacity
                    onPress={onToggleUsers}
                    style={[styles.usersToggle, showUsers && styles.usersToggleActive]}
                    activeOpacity={0.7}
                >
                    <View style={styles.onlineDot} />
                    <Text style={[styles.usersToggleText, showUsers && styles.usersToggleTextActive]}>
                        👥 {participantCount}
                    </Text>
                </TouchableOpacity>

                {/* Room Tabs — yatay kaydırılabilir */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabScroll}
                    style={{ flex: 1 }}
                >
                    {filteredRooms.map((room) => {
                        const isActive = room.slug === currentRoomSlug;
                        const count = room.participantCount || 0;
                        return (
                            <TouchableOpacity
                                key={room.id}
                                style={[
                                    styles.roomTab,
                                    isActive && styles.roomTabActive,
                                ]}
                                onPress={() => onRoomPress(room)}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={[
                                        styles.roomTabName,
                                        isActive && styles.roomTabNameActive,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {room.name}
                                </Text>
                                <Text style={[
                                    styles.roomTabCount,
                                    isActive && styles.roomTabCountActive,
                                ]}>
                                    {count} Kişi
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.bg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        gap: 6,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.glass,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    backIcon: {
        fontSize: 18,
        color: COLORS.textSecondary,
    },
    usersToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    usersToggleActive: {
        backgroundColor: '#7b9fef20',
        borderColor: '#7b9fef50',
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#22c55e',
    },
    usersToggleText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '700',
    },
    usersToggleTextActive: {
        color: '#7b9fef',
    },
    tabScroll: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    roomTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        alignItems: 'center',
    },
    roomTabActive: {
        backgroundColor: '#7b9fef15',
        borderColor: '#7b9fef40',
        borderBottomWidth: 2,
        borderBottomColor: '#ef4444',
    },
    roomTabName: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    roomTabNameActive: {
        color: COLORS.white,
    },
    roomTabCount: {
        fontSize: 10,
        color: COLORS.textMuted,
        marginTop: 1,
    },
    roomTabCountActive: {
        color: '#ef4444',
    },
});
