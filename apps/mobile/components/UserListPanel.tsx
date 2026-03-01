import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, FlatList, Image, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { COLORS, SIZES, ROLE_COLORS, ROLE_LABELS } from '@/constants';

export interface RoomParticipant {
    userId: string;
    displayName: string;
    avatar?: string;
    role?: string;
    isMuted?: boolean;
    isGagged?: boolean;
    isBanned?: boolean;
    isCamBlocked?: boolean;
    isStealth?: boolean;
    status?: string;
    nameColor?: string;
    platform?: 'web' | 'mobile' | 'embed';
    godmasterIcon?: string;
    username?: string;
}

interface Props {
    participants: RoomParticipant[];
    currentUserId?: string;
    onUserPress?: (participant: RoomParticipant) => void;
    onUserLongPress?: (participant: RoomParticipant) => void;
}

// Web ile aynı rol hiyerarşisi
const ROLE_HIERARCHY: Record<string, number> = {
    godmaster: 8, owner: 7, superadmin: 6, super_admin: 6,
    admin: 5, moderator: 4, operator: 3, vip: 2,
    member: 1, guest: 0,
};

// Web ile aynı rol ikonu
function getRoleIcon(role: string): string {
    switch (role.toLowerCase()) {
        case 'godmaster': return '🔱';
        case 'owner': return '👑';
        case 'superadmin':
        case 'super_admin': return '⭐';
        case 'admin': return '🛡️';
        case 'moderator': return '🔰';
        case 'operator': return '🎯';
        case 'vip': return '💎';
        case 'member': return '';
        default: return '';
    }
}

// Web ile aynı status emojisi
function getStatusEmoji(status: string | undefined): string {
    switch (status) {
        case 'busy': return '⛔';
        case 'away': return '🌙';
        case 'brb': return '⏰';
        case 'phone': return '📞';
        case 'outside': return '🚶';
        default: return '✅';
    }
}

// ═══ ANIMATED NICK STYLE DEFINITIONS ═══
// Web CSS gradients → RN color arrays for animation
const NICK_ANIM_STYLES: Record<string, { colors: string[]; duration: number }> = {
    'shimmer-gold': {
        colors: ['#fbbf24', '#f59e0b', '#fde68a', '#f59e0b', '#fbbf24'],
        duration: 2000,
    },
    'fire-glow': {
        colors: ['#ef4444', '#f97316', '#eab308', '#f97316', '#ef4444'],
        duration: 1800,
    },
    'ice-shimmer': {
        colors: ['#60a5fa', '#93c5fd', '#dbeafe', '#93c5fd', '#60a5fa'],
        duration: 2500,
    },
    'neon-pulse': {
        colors: ['#22d3ee', '#38bdf8', '#e879f9', '#d946ef', '#22d3ee'],
        duration: 1500,
    },
    'matrix-glow': {
        colors: ['#4ade80', '#22c55e', '#86efac', '#22c55e', '#4ade80'],
        duration: 1200,
    },
    'royal-glow': {
        colors: ['#d946ef', '#a855f7', '#fbbf24', '#a855f7', '#d946ef'],
        duration: 3000,
    },
    'rainbow-flow': {
        colors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444'],
        duration: 3000,
    },
};

// ═══ AnimatedNick Component ═══
function AnimatedNick({ text, animClass, fontSize }: { text: string; animClass: string; fontSize: number }) {
    const animValue = useRef(new Animated.Value(0)).current;
    const style = NICK_ANIM_STYLES[animClass] || NICK_ANIM_STYLES['shimmer-gold'];

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(animValue, {
                    toValue: 1,
                    duration: style.duration,
                    useNativeDriver: false,
                }),
                Animated.timing(animValue, {
                    toValue: 0,
                    duration: style.duration,
                    useNativeDriver: false,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [animClass]);

    // Interpolate between colors in the palette
    const colorCount = style.colors.length;
    const inputRange = style.colors.map((_, i) => i / (colorCount - 1));
    const animColor = animValue.interpolate({
        inputRange,
        outputRange: style.colors,
    });

    return (
        <Animated.Text
            style={{
                fontSize,
                fontWeight: '800',
                letterSpacing: 0.5,
                color: animColor,
            }}
            numberOfLines={1}
        >
            {text}
        </Animated.Text>
    );
}

// ═══ Parse avatar field for special modes ═══
function parseAvatarMode(avatar?: string, role?: string) {
    if (!avatar) return { mode: 'normal' as const };

    const isGodMaster = role?.toLowerCase() === 'godmaster';
    const isGif = avatar.toLowerCase().endsWith('.gif') || avatar.startsWith('data:image/gif');

    // GodMaster GIF banner
    if (isGodMaster && isGif) {
        return { mode: 'godmaster-gif' as const, url: avatar };
    }

    // Animated nick: "animated:class:fontSize:showAvatar:text"
    if (avatar.startsWith('animated:')) {
        const parts = avatar.split(':');
        return {
            mode: 'animated' as const,
            animClass: parts[1] || 'shimmer-gold',
            fontSize: parseInt(parts[2]) || 13,
            showAvatar: parts[3] !== '0',
            text: parts.slice(4).join(':') || '',
        };
    }

    // GIF nick: "gifnick::url::showAvatar"
    if (avatar.startsWith('gifnick::')) {
        const parts = avatar.split('::');
        return {
            mode: 'gifnick' as const,
            url: parts[1] || '',
            showAvatar: parts[2] !== '0',
        };
    }

    // 3D mode: "3d:theme:mainText:subText|params"
    if (avatar.startsWith('3d:')) {
        const [corePart] = avatar.split('|');
        const parts = corePart.split(':');
        return {
            mode: '3d' as const,
            theme: parts[1] || 'purple',
            mainText: parts[2] || 'GodMaster',
            subText: parts[3] || '',
        };
    }

    return { mode: 'normal' as const };
}

export default function UserListPanel({ participants, currentUserId, onUserPress, onUserLongPress }: Props) {
    const sortedParticipants = useMemo(() => {
        return [...participants]
            .filter(p => !p.isStealth || p.userId === currentUserId)
            .sort((a, b) => {
                if (a.userId === currentUserId) return -1;
                if (b.userId === currentUserId) return 1;
                const aLevel = ROLE_HIERARCHY[(a.role || 'guest').toLowerCase()] ?? 0;
                const bLevel = ROLE_HIERARCHY[(b.role || 'guest').toLowerCase()] ?? 0;
                return bLevel - aLevel;
            });
    }, [participants, currentUserId]);

    const renderItem = ({ item }: { item: RoomParticipant }) => {
        const role = (item.role || 'guest').toLowerCase();
        const roleColor = ROLE_COLORS[role] || ROLE_COLORS.guest;
        const roleLabel = ROLE_LABELS[role] || 'Misafir';
        const roleIcon = getRoleIcon(role);
        const nameColor = item.nameColor || COLORS.white;
        const isGodmaster = role === 'godmaster';
        const isOwner = role === 'owner';

        // ═══ Parse special avatar modes ═══
        const avatarMode = parseAvatarMode(item.avatar, item.role);
        const isSpecialMode = avatarMode.mode !== 'normal';
        const shouldShowAvatar =
            avatarMode.mode === 'animated' ? avatarMode.showAvatar :
                avatarMode.mode === 'gifnick' ? avatarMode.showAvatar :
                    avatarMode.mode === 'godmaster-gif' ? false :
                        true;

        // Determine avatar URI for normal rendering
        const avatarUri = isSpecialMode && !shouldShowAvatar
            ? `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(item.displayName)}`
            : (item.avatar && !item.avatar.startsWith('animated:') && !item.avatar.startsWith('gifnick::') && !item.avatar.startsWith('3d:'))
                ? item.avatar
                : `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(item.displayName)}`;

        // Card border farklılıkları — web ile aynı
        let cardStyle = styles.card;
        if (isGodmaster) cardStyle = styles.cardGodmaster;
        else if (isOwner) cardStyle = styles.cardOwner;
        else if (item.isMuted) cardStyle = styles.cardMuted;
        else if (item.isGagged) cardStyle = styles.cardGagged;
        else if (item.isBanned) cardStyle = styles.cardBanned;

        // Transparent card for special modes
        if (isSpecialMode && !shouldShowAvatar) {
            cardStyle = styles.cardTransparent;
        }

        // Rol alt metnini belirle
        let roleText = roleLabel;
        let roleTextColor = roleColor;
        if (item.isMuted) { roleText = '🔇 Susturuldu'; roleTextColor = '#ef4444'; }
        else if (item.isGagged) { roleText = '🚫 Yazı Yasağı'; roleTextColor = '#f97316'; }
        else if (item.isBanned) { roleText = '⛔ Yasaklı'; roleTextColor = '#dc2626'; }

        // ═══ GodMaster GIF Banner — tam genişlik ═══
        if (avatarMode.mode === 'godmaster-gif') {
            return (
                <View style={[styles.cardBase, styles.cardTransparent]}>
                    <Image
                        source={{ uri: avatarMode.url }}
                        style={styles.gifBanner}
                        resizeMode="contain"
                    />
                </View>
            );
        }

        // ═══ GIF Nick Mode ═══
        if (avatarMode.mode === 'gifnick') {
            return (
                <View style={[styles.cardBase, shouldShowAvatar ? cardStyle : styles.cardTransparent]}>
                    {shouldShowAvatar && (
                        <View style={styles.avatarWrap}>
                            <Image source={{ uri: avatarUri }} style={[styles.avatar]} />
                            <View style={styles.statusDot}>
                                <Text style={styles.statusEmoji}>{getStatusEmoji(item.status)}</Text>
                            </View>
                        </View>
                    )}
                    <View style={shouldShowAvatar ? styles.info : styles.infoCenter}>
                        {avatarMode.url ? (
                            <Image
                                source={{ uri: avatarMode.url }}
                                style={styles.gifNickImage}
                                resizeMode="contain"
                            />
                        ) : (
                            <Text style={[styles.name, { color: nameColor }]} numberOfLines={1}>
                                {item.displayName}
                            </Text>
                        )}
                    </View>
                </View>
            );
        }

        // ═══ 3D Text Mode — fallback rendering ═══
        if (avatarMode.mode === '3d') {
            return (
                <View style={[styles.cardBase, styles.cardGodmaster]}>
                    <View style={styles.info}>
                        <AnimatedNick
                            text={avatarMode.mainText}
                            animClass="royal-glow"
                            fontSize={14}
                        />
                        {avatarMode.subText ? (
                            <Text style={[styles.roleLabel, { color: '#d946ef' }]}>{avatarMode.subText}</Text>
                        ) : null}
                    </View>
                </View>
            );
        }

        // ═══ Animated Nick Mode ═══
        if (avatarMode.mode === 'animated') {
            const displayText = avatarMode.text || item.displayName || item.username || 'User';
            return (
                <View style={[styles.cardBase, shouldShowAvatar ? cardStyle : styles.cardTransparent]}>
                    {shouldShowAvatar && (
                        <View style={styles.avatarWrap}>
                            <Image source={{ uri: avatarUri }} style={[styles.avatar, isGodmaster && styles.avatarGodmaster]} />
                            <View style={styles.statusDot}>
                                <Text style={styles.statusEmoji}>{getStatusEmoji(item.status)}</Text>
                            </View>
                        </View>
                    )}
                    <View style={shouldShowAvatar ? styles.info : styles.infoCenter}>
                        <View style={styles.nameRow}>
                            <AnimatedNick
                                text={displayText}
                                animClass={avatarMode.animClass}
                                fontSize={avatarMode.fontSize}
                            />
                            {isGodmaster && (
                                <View style={styles.godmasterBadge}>
                                    <Text style={{ fontSize: 8 }}>{item.godmasterIcon || '🔱'}</Text>
                                </View>
                            )}
                            {roleIcon && !isGodmaster ? (
                                <Text style={styles.roleIconText}>{roleIcon}</Text>
                            ) : null}
                        </View>
                        <Text style={[styles.roleLabel, { color: roleTextColor }]}>{roleText}</Text>
                    </View>
                </View>
            );
        }

        // ═══ NORMAL MODE ═══
        return (
            <View style={[styles.cardBase, cardStyle]}>
                {/* Avatar */}
                <View style={styles.avatarWrap}>
                    <Image
                        source={{ uri: avatarUri }}
                        style={[
                            styles.avatar,
                            isGodmaster && styles.avatarGodmaster,
                            isOwner && styles.avatarOwner,
                        ]}
                    />
                    {/* Status indicator */}
                    <View style={styles.statusDot}>
                        <Text style={styles.statusEmoji}>{getStatusEmoji(item.status)}</Text>
                    </View>
                    {/* Moderation overlays */}
                    {item.isMuted && (
                        <View style={[styles.modOverlay, styles.modMuted]}>
                            <Text style={styles.modIcon}>🔇</Text>
                        </View>
                    )}
                    {item.isBanned && (
                        <View style={[styles.modOverlay, styles.modBanned, { right: -4 }]}>
                            <Text style={styles.modIcon}>⛔</Text>
                        </View>
                    )}
                </View>

                {/* Name + Role */}
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text
                            style={[styles.name, { color: nameColor }]}
                            numberOfLines={1}
                        >
                            {item.displayName}
                        </Text>
                        {/* Mobile badge */}
                        {item.platform === 'mobile' && (
                            <Text style={{ fontSize: 13, opacity: 0.8 }}>📱</Text>
                        )}
                        {/* GodMaster badge */}
                        {isGodmaster && (
                            <View style={styles.godmasterBadge}>
                                <Text style={{ fontSize: 8 }}>{item.godmasterIcon || '🔱'}</Text>
                            </View>
                        )}
                        {/* Role icon */}
                        {roleIcon && !isGodmaster ? (
                            <Text style={styles.roleIconText}>{roleIcon}</Text>
                        ) : null}
                    </View>
                    <Text style={[styles.roleLabel, { color: roleTextColor }]}>{roleText}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Web tarzı başlık: "ÇEVRİMİÇİ (X)" */}
            <View style={styles.header}>
                <View style={styles.headerDot} />
                <Text style={styles.headerText}>
                    ÇEVRİMİÇİ ({sortedParticipants.length})
                </Text>
            </View>
            <FlatList
                data={sortedParticipants}
                keyExtractor={(item) => item.userId}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgSecondary,
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 6,
    },
    headerDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.online,
    },
    headerText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    list: {
        paddingHorizontal: 8,
        paddingBottom: 8,
        gap: 4,
    },

    // User card
    cardBase: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderColor: 'rgba(255,255,255,0.06)',
    },
    cardGodmaster: {
        backgroundColor: 'rgba(217,70,239,0.08)',
        borderColor: 'rgba(217,70,239,0.25)',
    },
    cardOwner: {
        backgroundColor: 'rgba(123,159,239,0.08)',
        borderColor: 'rgba(123,159,239,0.2)',
    },
    cardMuted: {
        backgroundColor: 'rgba(239,68,68,0.04)',
        borderColor: 'rgba(239,68,68,0.25)',
    },
    cardGagged: {
        backgroundColor: 'rgba(249,115,22,0.04)',
        borderColor: 'rgba(249,115,22,0.25)',
    },
    cardBanned: {
        backgroundColor: 'rgba(220,38,38,0.06)',
        borderColor: 'rgba(220,38,38,0.35)',
    },
    cardTransparent: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
    },

    // Avatar
    avatarWrap: {
        position: 'relative',
        marginRight: 10,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: COLORS.bgTertiary,
    },
    avatarGodmaster: {
        borderColor: 'rgba(217,70,239,0.6)',
        shadowColor: '#D946EF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    avatarOwner: {
        borderColor: 'rgba(123,159,239,0.6)',
        shadowColor: '#7b9fef',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    statusDot: {
        position: 'absolute',
        bottom: -2,
        right: -2,
    },
    statusEmoji: {
        fontSize: 10,
    },
    modOverlay: {
        position: 'absolute',
        bottom: -4,
        left: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modMuted: {
        backgroundColor: '#dc2626',
    },
    modBanned: {
        backgroundColor: '#b91c1c',
    },
    modIcon: {
        fontSize: 9,
    },

    // Name + Role
    info: {
        flex: 1,
        minWidth: 0,
    },
    infoCenter: {
        flex: 1,
        minWidth: 0,
        alignItems: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    name: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.white,
        flexShrink: 1,
    },
    roleIconText: {
        fontSize: 12,
    },
    roleLabel: {
        fontSize: 10,
        marginTop: 1,
        fontWeight: '500',
    },

    // GodMaster badge
    godmasterBadge: {
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(217,70,239,0.3)',
        borderWidth: 1,
        borderColor: 'rgba(217,70,239,0.5)',
    },

    // GIF modes
    gifBanner: {
        width: '85%',
        height: 44,
        alignSelf: 'center',
    },
    gifNickImage: {
        width: '85%',
        height: 36,
    },
});
