import React, { useMemo, useCallback, useRef } from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    StyleSheet,
    TouchableOpacity,
    Linking,
} from 'react-native';
import { COLORS } from '@/constants';

// ═══ Types ═══
export interface ChatMessage {
    id?: string;
    sender: string;
    message?: string;
    // Backend compatibility — backend sends `content` instead of `message`
    content?: string;
    type: 'user' | 'system' | 'gift' | string;
    timestamp?: number | string;
    createdAt?: string;
    avatar?: string;
    nameColor?: string;
    // Backend fields
    senderName?: string;
    senderAvatar?: string;
    senderNameColor?: string;
    reactions?: Record<string, string[]>;
}

// Helper to get actual message text (backend uses content, web uses message)
function getMessageText(msg: ChatMessage): string {
    return msg.message || msg.content || '';
}

interface ChatMessagesProps {
    messages: ChatMessage[];
    currentUsername?: string;
    onReaction?: (messageId: string, emoji: string) => void;
    roomName?: string;
}

// ═══ Helpers — web ile birebir aynı ═══
function isEmojiOnly(text: string): boolean {
    const stripped = text.replace(/\s/g, '');
    if (!stripped) return false;
    const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji}\u200D\p{Emoji})+$/u;
    return emojiRegex.test(stripped) && stripped.length <= 24;
}

const STICKER_PREFIX = '[sticker]';
function isSticker(text: string): boolean {
    return text.startsWith(STICKER_PREFIX);
}
function getStickerContent(text: string): string {
    return text.slice(STICKER_PREFIX.length);
}

function isGifUrl(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.includes(' ') || trimmed.includes('\n')) return false;
    try {
        const url = new URL(trimmed);
        return (
            url.hostname.includes('giphy.com') ||
            url.hostname.includes('tenor.com') ||
            url.hostname.includes('media.giphy.com') ||
            url.pathname.endsWith('.gif') ||
            url.pathname.includes('/media/')
        );
    } catch {
        return false;
    }
}

function isGiftMessage(text: string): boolean {
    return text.startsWith('[gift]') || text.trimStart().startsWith('[gift]');
}

function parseGiftData(text: string) {
    try {
        const jsonStart = text.indexOf('{');
        if (jsonStart === -1) return null;
        return JSON.parse(text.slice(jsonStart));
    } catch {
        return null;
    }
}

function formatTime(timestamp?: number | string): string {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ═══ Gift category colors — web ile aynı ═══
const GIFT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    basic: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', text: '#4ade80' },
    premium: { bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.3)', text: '#c084fc' },
    legendary: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', text: '#fbbf24' },
};

// ═══ Quick reaction emojis — web ile aynı ═══
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

// ═══ COMPONENT ═══
export default function ChatMessages({ messages, currentUsername, onReaction, roomName }: ChatMessagesProps) {
    const flatListRef = useRef<FlatList>(null);
    const [reactionMsgId, setReactionMsgId] = React.useState<string | null>(null);

    // Session time
    const sessionTime = useMemo(() => {
        return new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }, []);

    const renderItem = useCallback(({ item: msg, index }: { item: ChatMessage; index: number }) => {
        const displayName = msg.senderName || msg.sender || 'Anonim';
        const isMe = currentUsername && (msg.sender === currentUsername || displayName === currentUsername);
        const msgText = getMessageText(msg);

        // ═══ GIFT MESSAGE ═══
        if (isGiftMessage(msgText)) {
            const giftData = parseGiftData(msgText);
            if (giftData) {
                const cat = GIFT_COLORS[giftData.giftCategory] || GIFT_COLORS.basic;
                return (
                    <View style={styles.systemRow}>
                        <View style={[styles.giftCard, { backgroundColor: cat.bg, borderColor: cat.border }]}>
                            <Text style={styles.giftEmoji}>{giftData.giftEmoji}</Text>
                            <View>
                                <Text style={[styles.giftNames, { color: cat.text }]}>
                                    {giftData.senderName}
                                    <Text style={styles.giftArrow}> → </Text>
                                    {giftData.receiverName}
                                </Text>
                                <Text style={styles.giftDetail}>
                                    {giftData.giftName}
                                    {giftData.quantity > 1 && (
                                        <Text style={{ color: cat.text }}> x{giftData.quantity}</Text>
                                    )}
                                    <Text style={styles.giftCost}> 🪙 {giftData.totalCost}</Text>
                                </Text>
                            </View>
                        </View>
                    </View>
                );
            }
            return (
                <View style={styles.systemRow}>
                    <View style={styles.systemBadge}>
                        <Text style={styles.systemText}>🎁 Hediye gönderildi</Text>
                    </View>
                </View>
            );
        }

        // ═══ SYSTEM MESSAGE ═══
        if (msg.type === 'system' || msg.type === 'SYSTEM' || msg.sender === 'system') {
            return (
                <View style={styles.systemRow}>
                    <View style={styles.systemBadge}>
                        <Text style={styles.systemText}>{msgText}</Text>
                    </View>
                </View>
            );
        }

        // ═══ Parse message type ═══
        const stickerMsg = isSticker(msgText);
        const displayMessage = stickerMsg ? getStickerContent(msgText) : msgText;
        const emojiOnly = !stickerMsg && isEmojiOnly(msgText);
        const gifMessage = !stickerMsg && isGifUrl(msgText);

        const avatarUri = msg.senderAvatar || msg.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`;

        return (
            <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
                {/* Avatar — LEFT side for others */}
                {!isMe && (
                    <View style={styles.avatarCol}>
                        <Image source={{ uri: avatarUri }} style={styles.msgAvatar} />
                    </View>
                )}

                <View style={[styles.bubbleColumn, isMe ? styles.bubbleColumnMe : styles.bubbleColumnOther]}>
                    {/* Sender name + time */}
                    <View style={[styles.headerRow, isMe ? styles.headerRowMe : styles.headerRowOther]}>
                        <Text style={[styles.senderName, { color: msg.senderNameColor || msg.nameColor || '#9ca3af' }]}>
                            {displayName}
                        </Text>
                        <Text style={styles.timeText}>{formatTime(msg.timestamp || msg.createdAt)}</Text>
                    </View>

                    {/* Message content */}
                    {gifMessage ? (
                        // GIF
                        <TouchableOpacity
                            onPress={() => Linking.openURL(msgText.trim())}
                            style={[styles.gifBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}
                        >
                            <Image
                                source={{ uri: msgText.trim() }}
                                style={styles.gifImage}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    ) : stickerMsg ? (
                        // Sticker (kaomoji) — big text
                        <Text style={styles.stickerText}>{displayMessage}</Text>
                    ) : emojiOnly ? (
                        // Emoji only — slightly larger
                        <Text style={styles.emojiText}>{msgText}</Text>
                    ) : (
                        // Normal text bubble
                        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                            <Text style={styles.messageText}>{msgText}</Text>
                        </View>
                    )}

                    {/* ═══ Reaction Badges ═══ */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <View style={[styles.reactionRow, isMe ? { justifyContent: 'flex-end' } : {}]}>
                            {Object.entries(msg.reactions).map(([emoji, users]) => {
                                const iReacted = (users as string[]).includes(currentUsername || '');
                                return (
                                    <TouchableOpacity
                                        key={emoji}
                                        style={[
                                            styles.reactionBadge,
                                            iReacted && styles.reactionBadgeActive,
                                        ]}
                                        onPress={() => {
                                            if (onReaction && msg.id) onReaction(msg.id, emoji);
                                        }}
                                    >
                                        <Text style={styles.reactionEmoji}>{emoji}</Text>
                                        <Text style={[styles.reactionCount, iReacted && { color: '#d4b896' }]}>
                                            {(users as string[]).length}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    {/* ═══ Reaction Picker (long-press trigger) ═══ */}
                    {reactionMsgId === msg.id && (
                        <View style={[styles.reactionPicker, isMe ? { alignSelf: 'flex-end' } : {}]}>
                            {REACTION_EMOJIS.map((emoji) => (
                                <TouchableOpacity
                                    key={emoji}
                                    style={styles.reactionPickerItem}
                                    onPress={() => {
                                        if (onReaction && msg.id) onReaction(msg.id, emoji);
                                        setReactionMsgId(null);
                                    }}
                                >
                                    <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Avatar — RIGHT side for me */}
                {isMe && (
                    <View style={styles.avatarCol}>
                        <Image source={{ uri: avatarUri }} style={styles.msgAvatar} />
                    </View>
                )}
            </View>
        );
    }, [currentUsername, onReaction, reactionMsgId]);

    // ═══ Session start badge + messages ═══
    const ListHeader = useMemo(() => (
        <View style={styles.sessionBadgeRow}>
            <View style={styles.sessionBadge}>
                <Text style={styles.sessionText}>
                    {roomName ? `${roomName} odasına hoş geldiniz` : 'Sohbet başladı'} • Bugün {sessionTime}
                </Text>
            </View>
        </View>
    ), [roomName, sessionTime]);

    return (
        <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item.id || `msg-${index}`}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
    );
}

// ═══ STYLES — web ile birebir aynı renkler ve border-radius ═══
const styles = StyleSheet.create({
    list: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },

    // Session badge — web: text-[10px] rounded-full
    sessionBadgeRow: {
        alignItems: 'center',
        marginBottom: 16,
    },
    sessionBadge: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(123,159,239,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(123,159,239,0.15)',
    },
    sessionText: {
        fontSize: 10,
        fontWeight: '500',
        color: 'rgba(123,159,239,0.7)',
    },

    // System message — web: text-[10px] rounded-full bg-white/[0.03]
    systemRow: {
        alignItems: 'center',
        marginVertical: 8,
    },
    systemBadge: {
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    systemText: {
        fontSize: 10,
        fontWeight: '500',
        color: 'rgba(156,163,175,0.7)',
    },

    // Gift card — web: flex gap-3 rounded-xl
    giftCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 14,
        borderWidth: 1,
    },
    giftEmoji: {
        fontSize: 24,
    },
    giftNames: {
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 16,
    },
    giftArrow: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
    },
    giftDetail: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 1,
    },
    giftCost: {
        color: 'rgba(255,255,255,0.35)',
    },

    // Message row — web: flex gap-2.5
    messageRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
    },
    messageRowMe: {
        justifyContent: 'flex-end',
    },
    messageRowOther: {
        justifyContent: 'flex-start',
    },

    // Avatar in message
    avatarCol: {
        width: 32,
        flexShrink: 0,
    },
    msgAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        backgroundColor: '#1a1f2e',
    },

    // Bubble column
    bubbleColumn: {
        maxWidth: '75%',
    },
    bubbleColumnMe: {
        alignItems: 'flex-end',
    },
    bubbleColumnOther: {
        alignItems: 'flex-start',
    },

    // Header — web: flex items-center gap-2 mb-0.5
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
        paddingHorizontal: 4,
    },
    headerRowMe: {
        flexDirection: 'row-reverse',
    },
    headerRowOther: {},
    senderName: {
        fontSize: 12,
        fontWeight: '600',
    },
    timeText: {
        fontSize: 9,
        color: '#4b5563',
    },

    // Normal text bubble — web: bg-[#1a1f2e]/80 rounded-2xl
    bubble: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
    },
    bubbleMe: {
        backgroundColor: 'rgba(26,31,46,0.8)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderTopRightRadius: 4,
    },
    bubbleOther: {
        backgroundColor: 'rgba(26,31,46,0.6)',
        borderColor: 'rgba(255,255,255,0.06)',
        borderTopLeftRadius: 4,
    },
    messageText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 20,
    },

    // Sticker — web: text-4xl
    stickerText: {
        fontSize: 28,
        lineHeight: 36,
        paddingVertical: 2,
    },

    // Emoji only — web: text-lg
    emojiText: {
        fontSize: 22,
        lineHeight: 30,
        paddingVertical: 2,
    },

    // GIF bubble
    gifBubble: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        maxWidth: 280,
    },
    gifImage: {
        width: 260,
        height: 180,
        backgroundColor: '#000',
    },

    // Reaction badges — web: flex flex-wrap gap-1
    reactionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
    },
    reactionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    reactionBadgeActive: {
        backgroundColor: 'rgba(123,159,239,0.15)',
        borderColor: 'rgba(123,159,239,0.35)',
    },
    reactionEmoji: {
        fontSize: 14,
    },
    reactionCount: {
        fontSize: 11,
        fontWeight: '600',
        color: '#8b95a5',
    },

    // Reaction picker — web: absolute picker
    reactionPicker: {
        flexDirection: 'row',
        gap: 2,
        padding: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(15,20,35,0.97)',
        borderWidth: 1,
        borderColor: 'rgba(123,159,239,0.15)',
        marginTop: 4,
    },
    reactionPickerItem: {
        paddingHorizontal: 6,
        paddingVertical: 4,
    },
    reactionPickerEmoji: {
        fontSize: 20,
    },
});
