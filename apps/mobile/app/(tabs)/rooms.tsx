import { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, SIZES } from '@/constants';
import { useAuthStore } from '@/stores/authStore';
import { getSocket } from '@/services/socket';

interface RoomItem {
    id: string;
    name: string;
    slug: string;
    description?: string;
    userCount: number;
    isVipRoom: boolean;
    isLocked: boolean;
    isMeetingRoom: boolean;
    buttonColor?: string | null;
    category?: string;
}

export default function RoomsScreen() {
    const user = useAuthStore((s) => s.user);
    const router = useRouter();
    const [rooms, setRooms] = useState<RoomItem[]>([]);
    const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const mapRooms = (data: any[]): RoomItem[] => {
        return data
            .filter((r: any) => !r.isMeetingRoom)
            .map((r: any) => ({
                id: r.id,
                name: r.name,
                slug: r.slug,
                description: r.description,
                userCount: r.userCount || r.participantCount || 0,
                isVipRoom: r.isVipRoom || false,
                isLocked: r.isLocked || false,
                isMeetingRoom: r.isMeetingRoom || false,
                buttonColor: r.buttonColor || null,
                category: r.category,
            }));
    };

    const fetchRooms = useCallback(() => {
        const socket = getSocket();
        if (!socket) {
            setLoading(false);
            return;
        }

        // ★ Backend handler: @SubscribeMessage('room:list')
        // NestJS returns acknowledgment as callback data
        socket.emit('room:list', {}, (response: any) => {
            console.log('[rooms] room:list response:', JSON.stringify(response)?.substring(0, 200));
            // NestJS @SubscribeMessage wraps return in { event, data }
            // OR returns data directly as callback
            let roomData: any[] = [];
            if (response?.rooms && Array.isArray(response.rooms)) {
                roomData = response.rooms;
            } else if (response?.data?.rooms && Array.isArray(response.data.rooms)) {
                roomData = response.data.rooms;
            } else if (Array.isArray(response)) {
                roomData = response;
            }

            if (roomData.length > 0) {
                setRooms(mapRooms(roomData));
            }
            setLoading(false);
            setRefreshing(false);
        });

        // Fallback timeout — if callback never fires
        setTimeout(() => {
            setLoading(false);
            setRefreshing(false);
        }, 5000);
    }, []);

    useEffect(() => {
        fetchRooms();

        const socket = getSocket();
        if (!socket) return;

        // Listen for room:joined event too (in case user auto-joins a room)
        const onJoined = (data: any) => {
            if (data.rooms && Array.isArray(data.rooms)) {
                setRooms(mapRooms(data.rooms));
            }
        };

        // Live room count updates
        const onCounts = (data: { roomCounts: Record<string, number> }) => {
            setRoomCounts(data.roomCounts);
        };

        socket.on('room:joined', onJoined);
        socket.on('rooms:count-updated', onCounts);

        return () => {
            socket.off('room:joined', onJoined);
            socket.off('rooms:count-updated', onCounts);
        };
    }, [fetchRooms]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchRooms();
    };

    const joinRoom = (room: RoomItem) => {
        router.push(`/room/${room.slug}`);
    };

    const renderRoom = ({ item }: { item: RoomItem }) => {
        const count = roomCounts[item.slug] ?? item.userCount;
        const accentColor = item.buttonColor || COLORS.primary;

        return (
            <TouchableOpacity
                style={styles.roomCard}
                onPress={() => joinRoom(item)}
                activeOpacity={0.7}
            >
                {/* Room icon */}
                <View style={[styles.roomIcon, { borderColor: accentColor + '30' }]}>
                    <Text style={styles.roomEmoji}>
                        {item.isVipRoom ? '👑' : item.isLocked ? '🔒' : '💬'}
                    </Text>
                </View>

                {/* Room info */}
                <View style={styles.roomInfo}>
                    <Text style={styles.roomName} numberOfLines={1}>{item.name}</Text>
                    {item.description ? (
                        <Text style={styles.roomDesc} numberOfLines={1}>{item.description}</Text>
                    ) : null}
                    {/* Badges */}
                    <View style={styles.badgeRow}>
                        {item.isVipRoom && (
                            <View style={[styles.badge, { backgroundColor: '#A855F720', borderColor: '#A855F740' }]}>
                                <Text style={[styles.badgeText, { color: '#A855F7' }]}>VIP</Text>
                            </View>
                        )}
                        {item.isLocked && (
                            <View style={[styles.badge, { backgroundColor: '#EAB30820', borderColor: '#EAB30840' }]}>
                                <Text style={[styles.badgeText, { color: '#EAB308' }]}>🔒</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* User count */}
                <View style={styles.roomMeta}>
                    <View style={styles.countBadge}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.countText}>{count}</Text>
                    </View>
                    <Text style={styles.joinHint}>Gir →</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>🎙️ SopranoChat</Text>
                    <Text style={styles.headerSub}>
                        Hoş geldin, <Text style={styles.userName}>{user?.displayName}</Text>
                    </Text>
                </View>
                {user?.avatar && (
                    <Image
                        source={{ uri: user.avatar }}
                        style={styles.headerAvatar}
                    />
                )}
            </View>

            {/* Section header */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>ODALAR</Text>
                <View style={styles.totalBadge}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.totalText}>{rooms.length} oda</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Odalar yükleniyor...</Text>
                </View>
            ) : rooms.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyEmoji}>🏠</Text>
                    <Text style={styles.emptyText}>Henüz oda yok</Text>
                    <Text style={styles.emptySubtext}>Sunucu yöneticisi oda oluşturduğunda burada görünecek</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={fetchRooms}>
                        <Text style={styles.retryText}>🔄 Tekrar Dene</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={rooms}
                    keyExtractor={(item) => item.id}
                    renderItem={renderRoom}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={COLORS.primary}
                            colors={[COLORS.primary]}
                            progressBackgroundColor={COLORS.bgSecondary}
                        />
                    }
                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SIZES.padding,
        paddingTop: 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerLeft: {
        flex: 1,
    },
    headerTitle: {
        fontSize: SIZES.xxl,
        fontWeight: '700',
        color: COLORS.white,
    },
    headerSub: {
        fontSize: SIZES.sm,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    userName: {
        color: COLORS.primaryLight,
        fontWeight: '600',
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: COLORS.primary + '40',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SIZES.padding,
        paddingVertical: 10,
    },
    sectionTitle: {
        fontSize: SIZES.xs,
        fontWeight: '700',
        color: COLORS.textMuted,
        letterSpacing: 1.5,
    },
    totalBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    totalText: {
        fontSize: SIZES.xs,
        color: COLORS.textMuted,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        color: COLORS.textMuted,
        fontSize: SIZES.md,
        marginTop: 12,
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: SIZES.lg,
        fontWeight: '600',
    },
    emptySubtext: {
        color: COLORS.textMuted,
        fontSize: SIZES.sm,
        marginTop: 4,
        textAlign: 'center',
    },
    retryBtn: {
        marginTop: 20,
        backgroundColor: COLORS.primary + '20',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.primary + '40',
    },
    retryText: {
        color: COLORS.primaryLight,
        fontSize: SIZES.md,
        fontWeight: '600',
    },
    list: {
        paddingHorizontal: SIZES.padding,
        paddingBottom: SIZES.padding,
    },
    roomCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.borderRadius,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    roomIcon: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: COLORS.bgTertiary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
    },
    roomEmoji: {
        fontSize: 20,
    },
    roomInfo: {
        flex: 1,
    },
    roomName: {
        fontSize: SIZES.lg,
        fontWeight: '600',
        color: COLORS.text,
    },
    roomDesc: {
        fontSize: SIZES.sm,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 4,
        marginTop: 4,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '700',
    },
    roomMeta: {
        alignItems: 'flex-end',
        gap: 4,
    },
    countBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.bgTertiary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.online,
    },
    countText: {
        color: COLORS.text,
        fontSize: SIZES.sm,
        fontWeight: '600',
    },
    joinHint: {
        fontSize: 10,
        color: COLORS.primaryLight,
        fontWeight: '500',
    },
});
