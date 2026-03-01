import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface MeetingRoomBannerProps {
    roomName: string;
    createdBy?: string;
    isPrivate?: boolean;
    userCount?: number;
    onLeaveMeeting?: () => void;
}

export default function MeetingRoomBanner({ roomName, createdBy, isPrivate, userCount, onLeaveMeeting }: MeetingRoomBannerProps) {
    return (
        <View style={s.container}>
            <View style={s.iconRow}>
                <Text style={{ fontSize: 18 }}>🎤</Text>
                <View style={{ flex: 1 }}>
                    <Text style={s.title}>{roomName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {createdBy && <Text style={s.meta}>👤 {createdBy}</Text>}
                        {isPrivate && <Text style={s.privateBadge}>🔒 Özel</Text>}
                        {(userCount != null) && <Text style={s.meta}>👥 {userCount}</Text>}
                    </View>
                </View>
                {onLeaveMeeting && (
                    <TouchableOpacity style={s.leaveBtn} onPress={onLeaveMeeting}>
                        <Text style={s.leaveBtnText}>Ayrıl</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: { marginHorizontal: 12, marginTop: 6, padding: 10, borderRadius: 12, backgroundColor: 'rgba(168,85,247,0.08)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)' },
    iconRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { color: '#c084fc', fontSize: 13, fontWeight: '700' },
    meta: { color: '#9ca3af', fontSize: 10 },
    privateBadge: { color: '#fbbf24', fontSize: 10, fontWeight: '600' },
    leaveBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
    leaveBtnText: { color: '#ef4444', fontSize: 11, fontWeight: '700' },
});
