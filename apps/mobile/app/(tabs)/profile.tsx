import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, ROLE_COLORS, ROLE_LABELS } from '@/constants';
import { useAuthStore } from '@/stores/authStore';

export default function ProfileScreen() {
    const user = useAuthStore((s) => s.user);

    const role = (user?.role || 'guest').toLowerCase();
    const roleColor = ROLE_COLORS[role] || ROLE_COLORS.guest;
    const roleLabel = ROLE_LABELS[role] || 'Misafir';
    const avatarUri = user?.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user?.displayName}`;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>👤 Profil</Text>
                </View>

                {/* Profile Card */}
                <View style={styles.card}>
                    {/* Avatar with glow */}
                    <View style={[styles.avatarGlow, { shadowColor: roleColor }]}>
                        <Image source={{ uri: avatarUri }} style={[styles.avatar, { borderColor: roleColor }]} />
                    </View>

                    <Text style={styles.name}>{user?.displayName}</Text>

                    <View style={[styles.roleBadge, { backgroundColor: roleColor + '20', borderColor: roleColor + '40' }]}>
                        <Text style={[styles.roleText, { color: roleColor }]}>{roleLabel}</Text>
                    </View>

                    {user?.email && (
                        <Text style={styles.email}>{user.email}</Text>
                    )}
                </View>

                {/* Info Section */}
                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>BİLGİLER</Text>

                    <View style={styles.infoCard}>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Kullanıcı Adı</Text>
                            <Text style={styles.infoValue}>{user?.displayName || '—'}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Rol</Text>
                            <Text style={[styles.infoValue, { color: roleColor }]}>{roleLabel}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Platform</Text>
                            <Text style={styles.infoValue}>📱 Mobil</Text>
                        </View>
                        {user?.tenantId && (
                            <>
                                <View style={styles.divider} />
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Sunucu</Text>
                                    <Text style={styles.infoValue}>{user.tenantId}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsSection}>
                    <Text style={styles.sectionTitle}>İSTATİSTİKLER</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>0</Text>
                            <Text style={styles.statLabel}>Jeton</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>0</Text>
                            <Text style={styles.statLabel}>Puan</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>0</Text>
                            <Text style={styles.statLabel}>Hediye</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    scroll: { paddingBottom: 32 },
    header: {
        paddingHorizontal: SIZES.padding,
        paddingTop: 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    title: { fontSize: SIZES.xxl, fontWeight: '700', color: COLORS.white },

    card: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 24,
    },
    avatarGlow: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 10,
        marginBottom: 16,
    },
    avatar: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 3,
        backgroundColor: COLORS.bgTertiary,
    },
    name: {
        fontSize: SIZES.xxl,
        fontWeight: '700',
        color: COLORS.white,
    },
    roleBadge: {
        marginTop: 8,
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    roleText: {
        fontSize: SIZES.sm,
        fontWeight: '700',
    },
    email: {
        color: COLORS.textSecondary,
        marginTop: 8,
        fontSize: SIZES.md,
    },

    infoSection: {
        paddingHorizontal: SIZES.padding,
    },
    sectionTitle: {
        fontSize: SIZES.xs,
        fontWeight: '700',
        color: COLORS.textMuted,
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    infoCard: {
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.borderRadius,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        overflow: 'hidden',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 13,
    },
    infoLabel: {
        color: COLORS.textSecondary,
        fontSize: SIZES.md,
    },
    infoValue: {
        color: COLORS.text,
        fontSize: SIZES.md,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.glassBorder,
        marginHorizontal: 14,
    },

    statsSection: {
        paddingHorizontal: SIZES.padding,
        marginTop: 24,
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.borderRadius,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    stat: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 18,
    },
    statDivider: {
        width: 1,
        backgroundColor: COLORS.glassBorder,
        marginVertical: 12,
    },
    statValue: {
        fontSize: SIZES.xxl,
        fontWeight: '700',
        color: COLORS.white,
    },
    statLabel: {
        fontSize: SIZES.sm,
        color: COLORS.textMuted,
        marginTop: 2,
    },
});
