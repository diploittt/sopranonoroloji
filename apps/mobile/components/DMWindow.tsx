import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    TextInput,
    Modal,
    Image,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { getSocket } from '@/services/socket';

interface DMMessage {
    id: string;
    sender: string;
    senderName: string;
    content: string;
    timestamp: number;
    avatar?: string;
}

interface DMWindowProps {
    visible: boolean;
    onClose: () => void;
    targetUserId: string;
    targetUsername: string;
    targetAvatar?: string;
    currentUserId: string;
    currentUsername: string;
}

export default function DMWindow({
    visible,
    onClose,
    targetUserId,
    targetUsername,
    targetAvatar,
    currentUserId,
    currentUsername,
}: DMWindowProps) {
    const [messages, setMessages] = useState<DMMessage[]>([]);
    const [text, setText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!visible) return;
        const socket = getSocket();
        if (!socket) return;

        // Load DM history
        socket.emit('dm:history', { targetUserId }, (history: DMMessage[]) => {
            if (Array.isArray(history)) setMessages(history);
        });

        // Listen for incoming DMs
        const onDM = (msg: DMMessage) => {
            if (msg.sender === targetUserId || msg.sender === currentUserId) {
                setMessages(prev => [...prev, msg]);
            }
        };
        socket.on('dm:message', onDM);
        return () => { socket.off('dm:message', onDM); };
    }, [visible, targetUserId, currentUserId]);

    const handleSend = useCallback(() => {
        if (!text.trim()) return;
        const socket = getSocket();
        if (!socket) return;
        socket.emit('dm:send', { targetUserId, content: text.trim() });
        setMessages(prev => [...prev, {
            id: `dm_${Date.now()}`,
            sender: currentUserId,
            senderName: currentUsername,
            content: text.trim(),
            timestamp: Date.now(),
        }]);
        setText('');
    }, [text, targetUserId, currentUserId, currentUsername]);

    const avatarUri = targetAvatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(targetUsername)}`;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Image source={{ uri: avatarUri }} style={styles.avatar} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.username}>{targetUsername}</Text>
                            <Text style={styles.status}>Özel Mesaj</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Messages */}
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => {
                            const isMe = item.sender === currentUserId;
                            return (
                                <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                                        {!isMe && (
                                            <Text style={styles.senderName}>{item.senderName}</Text>
                                        )}
                                        <Text style={styles.msgText}>{item.content}</Text>
                                        <Text style={styles.timeText}>
                                            {new Date(item.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                </View>
                            );
                        }}
                        contentContainerStyle={styles.msgList}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    />

                    {/* Input */}
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="Mesaj yaz..."
                            placeholderTextColor="#4b5563"
                            value={text}
                            onChangeText={setText}
                            onSubmitEditing={handleSend}
                            returnKeyType="send"
                        />
                        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                            <Text style={styles.sendText}>GÖNDER</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    container: {
        backgroundColor: '#0F1626',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        maxHeight: '70%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    username: {
        color: '#e5e7eb',
        fontSize: 14,
        fontWeight: '700',
    },
    status: {
        color: '#6b7280',
        fontSize: 11,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeBtnText: {
        color: '#6b7280',
        fontSize: 16,
    },
    msgList: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    msgRow: {
        marginBottom: 8,
    },
    msgRowMe: {
        alignItems: 'flex-end',
    },
    bubble: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        maxWidth: '80%',
        borderWidth: 1,
    },
    bubbleMe: {
        backgroundColor: 'rgba(123,159,239,0.15)',
        borderColor: 'rgba(123,159,239,0.25)',
        borderTopRightRadius: 4,
    },
    bubbleOther: {
        backgroundColor: 'rgba(26,31,46,0.6)',
        borderColor: 'rgba(255,255,255,0.06)',
        borderTopLeftRadius: 4,
    },
    senderName: {
        fontSize: 11,
        fontWeight: '600',
        color: '#7b9fef',
        marginBottom: 2,
    },
    msgText: {
        color: '#e5e7eb',
        fontSize: 13,
        lineHeight: 18,
    },
    timeText: {
        fontSize: 9,
        color: '#4b5563',
        alignSelf: 'flex-end',
        marginTop: 2,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    input: {
        flex: 1,
        height: 40,
        backgroundColor: '#070B14',
        borderRadius: 10,
        paddingHorizontal: 14,
        color: '#e5e7eb',
        fontSize: 13,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    sendBtn: {
        height: 40,
        paddingHorizontal: 14,
        borderRadius: 10,
        justifyContent: 'center',
        backgroundColor: 'rgba(123,159,239,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(123,159,239,0.3)',
    },
    sendText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 1,
    },
});
