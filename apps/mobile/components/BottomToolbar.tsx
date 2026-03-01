import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
} from 'react-native';
import { COLORS, SIZES } from '@/constants';

// ─── Emoji list (web ile aynı) ───
const EMOJI_LIST = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
    '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋',
    '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
    '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😌', '😔',
    '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥵', '🥶',
    '😱', '😨', '😰', '😥', '😭', '😢', '😤', '😠', '😡', '🤬',
    '👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '✌️', '🤟', '🤙',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕',
    '🔥', '⭐', '✨', '🎉', '🎊', '💯', '👀', '💬', '🎵', '🎶',
];

// ─── Sticker list (web ile aynı kaomoji) ───
const STICKER_LIST = [
    '(╯°□°)╯︵ ┻━┻', '┬─┬ノ( º _ ºノ)', '¯\\_(ツ)_/¯', '( ͡° ͜ʖ ͡°)',
    '(ノಠ益ಠ)ノ彡┻━┻', '(づ￣ ³￣)づ', '(ง •̀_•́)ง', '(☞ﾟヮﾟ)☞',
    '(ᵔᴥᵔ)', '(◕‿◕✿)', '(◠‿◠)', '(¬‿¬)', '(⌐■_■)', '(ʘ‿ʘ)',
    '♪(´ε` )', '(∩^o^)⊃━☆', '(╥_╥)', '(ﾉ◕ヮ◕)ﾉ*:・ﾟ✧',
    'ᕦ(ò_óˇ)ᕤ', '(•_•) ( •_•)>⌐■-■ (⌐■_■)',
];

interface BottomToolbarProps {
    // Message
    onSendMessage: (text: string) => void;
    inputText: string;
    onChangeText: (text: string) => void;

    // Mic
    onRequestMic: () => void;
    onReleaseMic: () => void;
    isMicOn: boolean;
    isMeSpeaker: boolean;

    // Queue
    onJoinQueue: () => void;
    onLeaveQueue: () => void;
    isInQueue: boolean;
    queueCount: number;

    // Camera
    onToggleCamera: () => void;
    isCameraOn: boolean;
    hasCameraPackage: boolean;

    // Chat Lock / Gag
    isChatLocked?: boolean;
    isGagged?: boolean;
}

export default function BottomToolbar({
    onSendMessage,
    inputText,
    onChangeText,
    onRequestMic,
    onReleaseMic,
    isMicOn,
    isMeSpeaker,
    onJoinQueue,
    onLeaveQueue,
    isInQueue,
    queueCount,
    onToggleCamera,
    isCameraOn,
    hasCameraPackage,
    isChatLocked = false,
    isGagged = false,
}: BottomToolbarProps) {
    const [showEmoji, setShowEmoji] = useState(false);
    const [showSticker, setShowSticker] = useState(false);
    const isChatDisabled = isChatLocked || isGagged;

    const handleSend = useCallback(() => {
        const text = inputText.trim();
        if (!text || isChatDisabled) return;
        onSendMessage(text);
    }, [inputText, isChatDisabled, onSendMessage]);

    const handleEmojiSelect = useCallback((emoji: string) => {
        onChangeText(inputText + emoji);
    }, [inputText, onChangeText]);

    const handleStickerSend = useCallback((sticker: string) => {
        onSendMessage(sticker);
        setShowSticker(false);
    }, [onSendMessage]);

    return (
        <View style={styles.container}>
            {/* ═══ TOP ROW: Action buttons — web ile birebir aynı layout ═══ */}
            <View style={styles.topRow}>
                {/* Left group: Hand + Camera + Volume + | + Emoji + Sticker + GIF */}
                <View style={styles.leftGroup}>
                    {/* 🤚 Hand (Queue) — web: Hand icon */}
                    <TouchableOpacity
                        onPress={() => {
                            if (isMeSpeaker) return;
                            isInQueue ? onLeaveQueue() : onJoinQueue();
                        }}
                        disabled={isMeSpeaker}
                        style={[
                            styles.iconBtn,
                            isInQueue && styles.iconBtnActiveGreen,
                            isMeSpeaker && styles.iconBtnDisabled,
                        ]}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.iconText}>✋</Text>
                        {isInQueue && (
                            <View style={styles.activeDot} />
                        )}
                        {queueCount > 0 && !isInQueue && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{queueCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* 📹 Camera — web: Video icon */}
                    {hasCameraPackage && (
                        <TouchableOpacity
                            onPress={onToggleCamera}
                            style={[
                                styles.iconBtn,
                                isCameraOn && styles.iconBtnActiveBlue,
                            ]}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.iconText}>📹</Text>
                            {isCameraOn && <View style={[styles.activeDot, { backgroundColor: '#3b82f6' }]} />}
                        </TouchableOpacity>
                    )}

                    {/* 🔊 Volume — web: Volume2 icon */}
                    <TouchableOpacity
                        style={styles.iconBtn}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.iconText}>🔊</Text>
                    </TouchableOpacity>

                    {/* Divider — web: w-px h-6 bg-white/10 mx-2 */}
                    <View style={styles.divider} />

                    {/* 😊 Emoji — web: Smile icon */}
                    <TouchableOpacity
                        onPress={() => { setShowEmoji(!showEmoji); setShowSticker(false); }}
                        style={[
                            styles.iconBtn,
                            showEmoji && styles.iconBtnActiveYellow,
                        ]}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.iconText}>😊</Text>
                    </TouchableOpacity>

                    {/* 🎭 Sticker — web: Sticker icon */}
                    <TouchableOpacity
                        onPress={() => { setShowSticker(!showSticker); setShowEmoji(false); }}
                        style={[
                            styles.iconBtn,
                            showSticker && styles.iconBtnActivePink,
                        ]}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.iconText}>🎭</Text>
                    </TouchableOpacity>

                    {/* 🎬 GIF — web: Clapperboard icon */}
                    <TouchableOpacity
                        style={styles.iconBtn}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.iconText}>🎬</Text>
                    </TouchableOpacity>
                </View>

                {/* Right group: Settings — web: Settings2 icon */}
                <View style={styles.rightGroup}>
                    <TouchableOpacity
                        style={styles.iconBtn}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.iconText}>⚙️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ═══ BOTTOM ROW: Input + GÖNDER — web ile birebir aynı ═══ */}
            <View style={styles.inputRow}>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={[styles.input, isChatDisabled && styles.inputDisabled]}
                        placeholder={isGagged ? '🔇 Susturuldunuz' : isChatLocked ? '🔒 Chat kilitli' : 'Mesaj yaz...'}
                        placeholderTextColor={'#4b5563'}
                        value={inputText}
                        onChangeText={onChangeText}
                        onSubmitEditing={handleSend}
                        returnKeyType="send"
                        maxLength={500}
                        editable={!isChatDisabled}
                    />
                </View>
                <TouchableOpacity
                    style={[styles.sendBtn, isChatDisabled && styles.sendBtnDisabled]}
                    onPress={handleSend}
                    disabled={isChatDisabled}
                    activeOpacity={0.7}
                >
                    <Text style={styles.sendLabel}>GÖNDER</Text>
                    <Text style={styles.sendArrow}>➤</Text>
                </TouchableOpacity>
            </View>

            {/* ═══ EMOJI PICKER MODAL ═══ */}
            <Modal
                visible={showEmoji}
                transparent
                animationType="slide"
                onRequestClose={() => setShowEmoji(false)}
            >
                <TouchableOpacity
                    style={styles.pickerOverlay}
                    activeOpacity={1}
                    onPress={() => setShowEmoji(false)}
                >
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>😊 Emoji Seç</Text>
                            <TouchableOpacity onPress={() => setShowEmoji(false)}>
                                <Text style={styles.pickerClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.emojiGrid}>
                            {EMOJI_LIST.map((emoji, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.emojiItem}
                                    onPress={() => handleEmojiSelect(emoji)}
                                    activeOpacity={0.6}
                                >
                                    <Text style={styles.emojiChar}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* ═══ STICKER PICKER MODAL ═══ */}
            <Modal
                visible={showSticker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowSticker(false)}
            >
                <TouchableOpacity
                    style={styles.pickerOverlay}
                    activeOpacity={1}
                    onPress={() => setShowSticker(false)}
                >
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>🎭 Sticker Gönder</Text>
                            <TouchableOpacity onPress={() => setShowSticker(false)}>
                                <Text style={styles.pickerClose}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={styles.stickerGrid}>
                            {STICKER_LIST.map((sticker, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.stickerItem}
                                    onPress={() => handleStickerSend(sticker)}
                                    activeOpacity={0.6}
                                >
                                    <Text style={styles.stickerText}>{sticker}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    // ═══ Container — web: p-4 bg-[#0F1626]/60 border-t border-white/5
    container: {
        backgroundColor: 'rgba(15,22,38,0.6)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },

    // ═══ Top Row — web: flex items-center justify-between
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    // ═══ Left group — web: bg-[#070B14]/80 rounded-2xl border border-white/5 shadow-xl
    leftGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(7,11,20,0.8)',
        borderRadius: 16,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },

    rightGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    // ═══ Icon buttons — web: w-10 h-10 rounded-xl bg-white/5 border border-white/5
    iconBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBtnActiveGreen: {
        backgroundColor: 'rgba(16,185,129,0.2)',
        borderColor: 'rgba(16,185,129,0.5)',
    },
    iconBtnActiveBlue: {
        backgroundColor: 'rgba(59,130,246,0.2)',
        borderColor: 'rgba(59,130,246,0.5)',
    },
    iconBtnActiveYellow: {
        backgroundColor: 'rgba(234,179,8,0.2)',
        borderColor: 'rgba(234,179,8,0.5)',
    },
    iconBtnActivePink: {
        backgroundColor: 'rgba(236,72,153,0.2)',
        borderColor: 'rgba(236,72,153,0.5)',
    },
    iconBtnDisabled: {
        opacity: 0.4,
    },
    iconText: {
        fontSize: 18,
    },

    // ═══ Badge — web: absolute -top-2 -left-2 bg-[#1f2937] text-white text-[9px]
    badge: {
        position: 'absolute',
        top: -6,
        left: -6,
        backgroundColor: '#1f2937',
        borderRadius: 6,
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#fff',
    },
    activeDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10b981',
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 4,
    },

    // ═══ Input Row — web: flex gap-4 h-14
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        height: 48,
    },
    inputWrapper: {
        flex: 1,
        height: '100%',
    },
    // ═══ Input — web: bg-[#070B14] text-gray-200 text-sm rounded-xl border border-white/10
    input: {
        flex: 1,
        height: '100%',
        backgroundColor: '#070B14',
        borderRadius: 12,
        paddingHorizontal: 20,
        color: '#e5e7eb',
        fontSize: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    inputDisabled: {
        borderColor: 'rgba(239,68,68,0.2)',
        opacity: 0.5,
    },

    // ═══ Send Button — web: gradient bg, w-32, rounded-xl, border-[#7b9fef]/30
    sendBtn: {
        height: '100%',
        paddingHorizontal: 16,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 6,
        backgroundColor: 'rgba(123,159,239,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(123,159,239,0.3)',
    },
    sendBtnDisabled: {
        opacity: 0.5,
    },
    sendLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 2,
    },
    sendArrow: {
        fontSize: 14,
        color: '#7b9fef',
    },

    // ═══ Picker modals
    pickerOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    pickerContainer: {
        backgroundColor: '#0F1626',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        maxHeight: '45%',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    pickerTitle: {
        color: '#e5e7eb',
        fontSize: 15,
        fontWeight: '700',
    },
    pickerClose: {
        color: '#6b7280',
        fontSize: 18,
        padding: 4,
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    emojiItem: {
        width: '12.5%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiChar: {
        fontSize: 26,
    },
    stickerGrid: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
    },
    stickerItem: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    stickerText: {
        color: '#e5e7eb',
        fontSize: 14,
        textAlign: 'center',
    },
});
