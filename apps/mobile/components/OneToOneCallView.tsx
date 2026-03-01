import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    TextInput,
    FlatList,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { getSocket } from '@/services/socket';

interface Participant {
    userId: string;
    displayName: string;
    avatar?: string;
    role?: string;
}

interface ChatMsg {
    id?: string;
    sender: string;
    message: string;
    timestamp?: number;
}

interface OneToOneCallViewProps {
    visible: boolean;
    currentUser: { userId: string; displayName: string; avatar?: string };
    otherUser: { userId: string; displayName: string; avatar?: string };
    callId: string;
    onHangUp: () => void;
}

export default function OneToOneCallView({ visible, currentUser, otherUser, callId, onHangUp }: OneToOneCallViewProps) {
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [inputText, setInputText] = useState('');
    const [callDuration, setCallDuration] = useState(0);
    const [isMicOn, setIsMicOn] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    // Timer
    useEffect(() => {
        if (!visible) return;
        setCallDuration(0);
        timerRef.current = setInterval(() => {
            setCallDuration(d => d + 1);
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [visible]);

    // Socket events
    useEffect(() => {
        const socket = getSocket();
        if (!socket || !visible) return;

        const onMessage = (data: any) => {
            setMessages(prev => [...prev, { id: String(Date.now()), sender: data.from || data.senderName, message: data.message, timestamp: data.timestamp }]);
        };
        const onCallEnded = () => onHangUp();

        socket.on('one2one:message', onMessage);
        socket.on('one2one:ended', onCallEnded);

        return () => {
            socket.off('one2one:message', onMessage);
            socket.off('one2one:ended', onCallEnded);
        };
    }, [visible]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const sendMessage = () => {
        if (!inputText.trim()) return;
        const socket = getSocket();
        if (socket) {
            socket.emit('one2one:message', { callId, message: inputText.trim() });
            setMessages(prev => [...prev, { id: String(Date.now()), sender: currentUser.displayName, message: inputText.trim(), timestamp: Date.now() }]);
        }
        setInputText('');
    };

    const handleMicToggle = () => {
        const socket = getSocket();
        if (socket) socket.emit(isMicOn ? 'one2one:mic-off' : 'one2one:mic-on', { callId });
        setIsMicOn(!isMicOn);
    };

    const handleHangUp = () => {
        const socket = getSocket();
        if (socket) socket.emit('one2one:end', { callId });
        onHangUp();
    };

    if (!visible) return null;

    const otherAvatarUri = otherUser.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(otherUser.displayName)}`;

    return (
        <View style={s.container}>
            {/* Call header */}
            <View style={s.callHeader}>
                <Image source={{ uri: otherAvatarUri }} style={s.callAvatar} />
                <View style={{ flex: 1 }}>
                    <Text style={s.callName}>{otherUser.displayName}</Text>
                    <Text style={s.callTimer}>📞 {formatTime(callDuration)}</Text>
                </View>
                <View style={s.callActions}>
                    <TouchableOpacity style={[s.actionBtn, !isMicOn && s.actionBtnOff]} onPress={handleMicToggle}>
                        <Text style={{ fontSize: 18 }}>{isMicOn ? '🎤' : '🔇'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.hangUpBtn} onPress={handleHangUp}>
                        <Text style={{ fontSize: 18 }}>📵</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Chat messages */}
            <FlatList
                data={messages}
                keyExtractor={(m, i) => m.id || String(i)}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
                renderItem={({ item }) => {
                    const isMe = item.sender === currentUser.displayName;
                    return (
                        <View style={[s.msgBubble, isMe ? s.msgBubbleMe : s.msgBubbleThem]}>
                            <Text style={s.msgSender}>{item.sender}</Text>
                            <Text style={s.msgText}>{item.message}</Text>
                        </View>
                    );
                }}
            />

            {/* Input */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={s.inputRow}>
                    <TextInput
                        style={s.input}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Mesaj yaz..."
                        placeholderTextColor="#4b5563"
                        onSubmitEditing={sendMessage}
                    />
                    <TouchableOpacity style={s.sendBtn} onPress={sendMessage}>
                        <Text style={{ fontSize: 16 }}>📤</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070B14' },
    callHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(34,197,94,0.04)' },
    callAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(34,197,94,0.3)' },
    callName: { color: '#e5e7eb', fontSize: 16, fontWeight: '700' },
    callTimer: { color: '#22c55e', fontSize: 12, fontWeight: '600', marginTop: 2 },
    callActions: { flexDirection: 'row', gap: 8 },
    actionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    actionBtnOff: { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)' },
    hangUpBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)' },
    msgBubble: { maxWidth: '75%', padding: 10, borderRadius: 12, marginBottom: 6 },
    msgBubbleMe: { alignSelf: 'flex-end', backgroundColor: 'rgba(123,159,239,0.12)', borderWidth: 1, borderColor: 'rgba(123,159,239,0.15)' },
    msgBubbleThem: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    msgSender: { color: '#7b9fef', fontSize: 10, fontWeight: '600', marginBottom: 2 },
    msgText: { color: '#e5e7eb', fontSize: 13 },
    inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
    input: { flex: 1, height: 40, backgroundColor: '#0F1626', borderRadius: 10, paddingHorizontal: 14, color: '#e5e7eb', fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    sendBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(123,159,239,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(123,159,239,0.3)' },
});
