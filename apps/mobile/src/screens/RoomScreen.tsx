import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Image, Dimensions, KeyboardAvoidingView, Platform,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, getAvatarUrl, ROLE_CONFIG } from '../constants';
import { connectSocket, getSocket, disconnectSocket } from '../services/socket';
import type { RootStackParamList } from '../../App';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Room'>;

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  role?: string;
  text: string;
  timestamp: number;
  type?: string;
}

interface RoomUser {
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  role?: string;
  gender?: string;
  status?: string;
}

export default function RoomScreen({ route, navigation }: Props) {
  const { slug, token, user } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [showUsers, setShowUsers] = useState(false);
  const [roomName, setRoomName] = useState(slug);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const socket = connectSocket(token);

    socket.emit('room:join', { slug });

    socket.on('room:info', (data: any) => {
      if (data.name) setRoomName(data.name);
    });

    socket.on('room:users', (users: RoomUser[]) => {
      setRoomUsers(users || []);
    });

    socket.on('room:user-joined', (u: RoomUser) => {
      setRoomUsers(prev => {
        if (prev.find(p => p.userId === u.userId)) return prev;
        return [...prev, u];
      });
      addSystemMessage(`${u.displayName || u.username} odaya katıldı`);
    });

    socket.on('room:user-left', (data: { userId: string }) => {
      setRoomUsers(prev => {
        const leaving = prev.find(p => p.userId === data.userId);
        if (leaving) addSystemMessage(`${leaving.displayName || leaving.username} odadan ayrıldı`);
        return prev.filter(p => p.userId !== data.userId);
      });
    });

    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, { ...msg, id: msg.id || `${Date.now()}-${Math.random()}` }]);
    });

    socket.on('chat:history', (history: ChatMessage[]) => {
      setMessages(history.map((m, i) => ({ ...m, id: m.id || `hist-${i}` })));
    });

    return () => {
      socket.emit('room:leave', { slug });
      disconnectSocket();
    };
  }, [slug, token]);

  const addSystemMessage = (text: string) => {
    setMessages(prev => [...prev, {
      id: `sys-${Date.now()}-${Math.random()}`,
      userId: 'system',
      username: 'Sistem',
      text,
      timestamp: Date.now(),
      type: 'system',
    }]);
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('chat:send', { slug, text: inputText.trim() });
      setInputText('');
    }
  };

  const getRoleConfig = (role?: string) => {
    return ROLE_CONFIG[role?.toLowerCase() || 'guest'] || ROLE_CONFIG.guest;
  };

  const sortedUsers = [...roomUsers].sort((a, b) => {
    const la = getRoleConfig(a.role).level;
    const lb = getRoleConfig(b.role).level;
    return lb - la;
  });

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.type === 'system') {
      return (
        <View style={styles.systemMsg}>
          <Text style={styles.systemMsgText}>• {item.text}</Text>
        </View>
      );
    }
    const roleConf = getRoleConfig(item.role);
    const isOwn = item.userId === user?.sub || item.userId === user?.userId;
    return (
      <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
        <Image source={{ uri: getAvatarUrl(item.avatar || '/avatars/male_1.png') }} style={styles.msgAvatar} />
        <View style={[styles.msgBubble, isOwn && styles.msgBubbleOwn]}>
          <View style={styles.msgHeader}>
            {roleConf.icon ? <Text style={{ fontSize: 10 }}>{roleConf.icon}</Text> : null}
            <Text style={[styles.msgUsername, { color: roleConf.color }]}>{item.username}</Text>
            <Text style={styles.msgTime}>{new Date(item.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <Text style={styles.msgText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ═══ HEADER ═══ */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.roomTitle} numberOfLines={1}>{roomName}</Text>
          <Text style={styles.roomUserCount}>{roomUsers.length} kişi çevrimiçi</Text>
        </View>
        <TouchableOpacity style={styles.usersToggle} onPress={() => setShowUsers(!showUsers)}>
          <Text style={styles.usersToggleText}>👥</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* ═══ KULLANICI LİSTESİ (yan panel) ═══ */}
        {showUsers && (
          <View style={styles.userPanel}>
            <View style={styles.userPanelHeader}>
              <View style={styles.onlineDot} />
              <Text style={styles.userPanelTitle}>Çevrimiçi</Text>
              <Text style={styles.userPanelCount}>{roomUsers.length}</Text>
            </View>
            <FlatList
              data={sortedUsers}
              keyExtractor={item => item.userId}
              renderItem={({ item }) => {
                const rc = getRoleConfig(item.role);
                return (
                  <View style={styles.userRow}>
                    <Image source={{ uri: getAvatarUrl(item.avatar || '/avatars/male_1.png') }} style={styles.userAvatar} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {rc.icon ? <Text style={{ fontSize: 9 }}>{rc.icon}</Text> : null}
                        <Text style={[styles.userName, { color: rc.color }]} numberOfLines={1}>
                          {item.displayName || item.username}
                        </Text>
                      </View>
                      <Text style={styles.userRole}>{rc.label}</Text>
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: item.status === 'busy' ? COLORS.red : COLORS.green }]} />
                  </View>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {/* ═══ SOHBET ALANI ═══ */}
        <View style={styles.chatArea}>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.chatList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text>
                <Text style={styles.emptyChatText}>Henüz mesaj yok</Text>
                <Text style={styles.emptyChatSubtext}>İlk mesajı sen gönder!</Text>
              </View>
            }
          />

          {/* ═══ MESAJ GİRİŞİ ═══ */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.inputBar}>
              <TextInput
                style={styles.chatInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Mesaj yaz..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                maxLength={500}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
              />
              <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
                <Text style={styles.sendBtnText}>➤</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 22, color: COLORS.cyan, fontWeight: '700' },
  headerCenter: { flex: 1, marginHorizontal: 12 },
  roomTitle: { fontSize: 16, fontWeight: '900', color: COLORS.white },
  roomUserCount: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600', marginTop: 2 },
  usersToggle: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
  usersToggleText: { fontSize: 18 },

  // Content
  content: { flex: 1, flexDirection: 'row' },

  // User Panel
  userPanel: {
    width: width * 0.35, backgroundColor: COLORS.bgCard,
    borderRightWidth: 1, borderRightColor: COLORS.border, padding: 8,
  },
  userPanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 8 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green },
  userPanelTitle: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  userPanelCount: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, marginLeft: 'auto' },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  userAvatar: { width: 32, height: 32, borderRadius: 16 },
  userName: { fontSize: 11, fontWeight: '700', color: COLORS.white },
  userRole: { fontSize: 8, fontWeight: '600', color: COLORS.textMuted, marginTop: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },

  // Chat Area
  chatArea: { flex: 1, justifyContent: 'space-between' },
  chatList: { padding: 12, paddingBottom: 4 },

  // Messages
  msgRow: { flexDirection: 'row', marginBottom: 8, gap: 8 },
  msgRowOwn: { flexDirection: 'row-reverse' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, marginTop: 4 },
  msgBubble: {
    maxWidth: '75%', padding: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border,
    borderTopLeftRadius: 4,
  },
  msgBubbleOwn: {
    backgroundColor: 'rgba(56,189,248,0.1)', borderColor: 'rgba(56,189,248,0.2)',
    borderTopLeftRadius: 12, borderTopRightRadius: 4,
  },
  msgHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  msgUsername: { fontSize: 10, fontWeight: '800' },
  msgTime: { fontSize: 8, color: COLORS.textMuted, marginLeft: 'auto' },
  msgText: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 18, fontWeight: '500' },

  systemMsg: { alignItems: 'center', paddingVertical: 4, marginBottom: 8 },
  systemMsgText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', fontStyle: 'italic' },

  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyChatText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  emptyChatSubtext: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },

  // Input Bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: COLORS.bgCard, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  chatInput: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: COLORS.white,
    maxHeight: 100, fontWeight: '500',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(56,189,248,0.2)', borderWidth: 1, borderColor: 'rgba(56,189,248,0.4)',
  },
  sendBtnText: { fontSize: 18, color: COLORS.cyan },
});
