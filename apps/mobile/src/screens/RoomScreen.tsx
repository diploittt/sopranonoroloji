import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Image, FlatList, KeyboardAvoidingView, Platform,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, SHADOWS, ROLE_CONFIG, getAvatarUrl } from '../constants';
import { connectSocket, getSocket, disconnectSocket } from '../services/socket';
import type { RootStackParamList } from '../../App';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Room'>;
type RoomUser = { userId: string; displayName?: string; username?: string; avatar?: string; role?: string; status?: string; nameColor?: string };
type ChatMessage = { id: string; userId: string; username: string; avatar?: string; role?: string; text: string; timestamp: number; type?: string; nameColor?: string };

type TabKey = 'chat' | 'users' | 'stage';

export default function RoomScreen({ navigation, route }: Props) {
  const { slug, token, user } = route.params;
  const [roomName, setRoomName] = useState(slug);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('chat');
  const chatRef = useRef<FlatList>(null);

  const addSystemMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, {
      id: `sys-${Date.now()}-${Math.random()}`, userId: 'system', username: 'Sistem',
      text, timestamp: Date.now(), type: 'system',
    }]);
  }, []);

  useEffect(() => {
    const socket = connectSocket(token);

    socket.emit('room:join', { roomId: slug });

    socket.on('room:info', (data: any) => {
      if (data.name) setRoomName(data.name);
    });

    socket.on('room:participants', (data: any) => {
      const users = data?.participants || data;
      if (Array.isArray(users)) setRoomUsers(users);
    });

    socket.on('room:participant-joined', (u: RoomUser) => {
      setRoomUsers(prev => {
        if (prev.find(p => p.userId === u.userId)) return prev;
        return [...prev, u];
      });
      addSystemMessage(`${u.displayName || u.username} odaya katıldı`);
    });

    socket.on('room:participant-left', (data: { userId: string }) => {
      setRoomUsers(prev => {
        const leaving = prev.find(p => p.userId === data.userId);
        if (leaving) addSystemMessage(`${leaving.displayName || leaving.username} odadan ayrıldı`);
        return prev.filter(p => p.userId !== data.userId);
      });
    });

    socket.on('chat:message', (msg: any) => {
      setMessages(prev => [...prev, {
        id: msg.id || `${Date.now()}-${Math.random()}`,
        userId: msg.sender || msg.userId,
        username: msg.senderName || msg.username || 'Anonim',
        avatar: msg.senderAvatar || msg.avatar,
        role: msg.role,
        text: msg.content || msg.text || '',
        timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
        type: msg.type === 'SYSTEM' ? 'system' : undefined,
        nameColor: msg.senderNameColor || msg.nameColor,
      }]);
    });

    socket.on('chat:history', (history: ChatMessage[]) => {
      if (Array.isArray(history)) setMessages(history);
    });

    return () => {
      socket.emit('room:leave', { roomId: slug });
      disconnectSocket();
    };
  }, [slug, token]);

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const socket = getSocket();
    if (socket) {
      socket.emit('chat:send', { roomId: slug, content: inputText.trim() });
      setInputText('');
    }
  };

  const getRoleInfo = (role?: string) => ROLE_CONFIG[(role || 'guest').toLowerCase()] || ROLE_CONFIG.guest;
  const isOwnMessage = (msg: ChatMessage) => msg.userId === user?.sub;

  // ═══ RENDER ═══

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.type === 'system') {
      return (
        <View style={r.systemMsg}>
          <Text style={r.systemMsgText}>— {item.text} —</Text>
        </View>
      );
    }

    const own = isOwnMessage(item);
    const roleInfo = getRoleInfo(item.role);

    return (
      <View style={[r.msgRow, own && r.msgRowOwn]}>
        {!own && (
          <Image source={{ uri: getAvatarUrl(item.avatar || '') }} style={r.msgAvatar} />
        )}
        <View style={[r.msgBubble, own ? r.msgBubbleOwn : r.msgBubbleOther]}>
          {!own && (
            <View style={r.msgHeader}>
              <Text style={[r.msgSender, { color: item.nameColor || roleInfo.color }]}>
                {roleInfo.icon} {item.username}
              </Text>
              <Text style={r.msgRole}>{roleInfo.label}</Text>
            </View>
          )}
          <Text style={r.msgText}>{item.text}</Text>
          <Text style={r.msgTime}>
            {new Date(item.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {own && (
          <Image source={{ uri: getAvatarUrl(user?.avatar || '') }} style={r.msgAvatar} />
        )}
      </View>
    );
  };

  const renderUser = ({ item }: { item: RoomUser }) => {
    const roleInfo = getRoleInfo(item.role);
    return (
      <View style={r.userCard}>
        <View style={r.userAvatarWrap}>
          <Image source={{ uri: getAvatarUrl(item.avatar || '') }} style={r.userAvatar} />
          <View style={r.onlineDot} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={r.userNameRow}>
            <Text style={[r.userName, { color: item.nameColor || roleInfo.color }]}>
              {item.displayName || item.username}
            </Text>
            <View style={[r.roleBadge, { backgroundColor: `${roleInfo.color}20`, borderColor: `${roleInfo.color}40` }]}>
              <Text style={[r.roleBadgeText, { color: roleInfo.color }]}>{roleInfo.icon} {roleInfo.label}</Text>
            </View>
          </View>
          <Text style={r.userStatus}>{item.status === 'stealth' ? '👻 Görünmez' : '🟢 Çevrimiçi'}</Text>
        </View>
      </View>
    );
  };

  const now = new Date();
  const dateStr = `Bugün ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <View style={r.container}>
      <StatusBar style="light" />

      {/* ═══ TOP BAR ═══ */}
      <View style={r.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={r.backBtn}>
          <Text style={r.backText}>←</Text>
        </TouchableOpacity>
        <View style={r.topBarCenter}>
          <Text style={r.topBarLogo}>Soprano</Text>
          <Text style={r.topBarLogoAccent}>Chat</Text>
        </View>
        <View style={r.topBarInfo}>
          <Text style={r.roomNameText} numberOfLines={1}>{roomName}</Text>
        </View>
      </View>

      {/* ═══ ROOM TABS (Alt Bar) ═══ */}
      <View style={r.tabBar}>
        {([
          { key: 'chat' as TabKey, icon: '💬', label: 'Sohbet' },
          { key: 'users' as TabKey, icon: '👥', label: `Kullanıcılar (${roomUsers.length})` },
          { key: 'stage' as TabKey, icon: '📺', label: 'Kürsü' },
        ]).map(tab => (
          <TouchableOpacity key={tab.key}
            style={[r.tabItem, activeTab === tab.key && r.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}>
            <Text style={r.tabIcon}>{tab.icon}</Text>
            <Text style={[r.tabLabel, activeTab === tab.key && r.tabLabelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ═══ CONTENT ═══ */}
      {activeTab === 'chat' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Chat Header */}
          <View style={r.chatHeader}>
            <View style={r.chatHeaderDot} />
            <Text style={r.chatHeaderText}>{roomName} • {dateStr}</Text>
          </View>

          {/* Messages */}
          <FlatList
            ref={chatRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            style={r.chatList}
            contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 12 }}
            onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          />

          {/* Control Bar */}
          <View style={r.controlBar}>
            <TouchableOpacity style={r.controlBtn}><Text style={r.controlIcon}>✋</Text></TouchableOpacity>
            <TouchableOpacity style={r.controlBtn}><Text style={r.controlIcon}>📷</Text></TouchableOpacity>
            <TouchableOpacity style={r.controlBtn}><Text style={r.controlIcon}>🔊</Text></TouchableOpacity>
            <TouchableOpacity style={r.controlBtn}><Text style={r.controlIcon}>😊</Text></TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={r.controlBtn}><Text style={r.controlIcon}>⚙️</Text></TouchableOpacity>
            <TouchableOpacity style={r.controlBtn}><Text style={r.controlIcon}>🎤</Text></TouchableOpacity>
          </View>

          {/* Input Bar */}
          <View style={r.inputBar}>
            <TextInput
              style={r.chatInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Mesajınızı buraya yazın..."
              placeholderTextColor={COLORS.textMuted}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity style={r.sendBtn} onPress={sendMessage}>
              <Text style={r.sendBtnText}>GÖNDER ▷</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {activeTab === 'users' && (
        <View style={{ flex: 1 }}>
          <View style={r.usersHeader}>
            <Text style={r.usersTitle}>ÇEVRİMİÇİ ({roomUsers.length})</Text>
          </View>
          <FlatList
            data={[...roomUsers].sort((a, b) => {
              const la = getRoleInfo(a.role).level;
              const lb = getRoleInfo(b.role).level;
              return lb - la;
            })}
            renderItem={renderUser}
            keyExtractor={item => item.userId}
            contentContainerStyle={{ padding: 12 }}
            showsVerticalScrollIndicator={false}
          />

          {/* Mikrofon Butonu */}
          <TouchableOpacity style={r.micBtn}>
            <Text style={r.micBtnIcon}>🎤</Text>
            <Text style={r.micBtnText}>MİKROFON AL</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'stage' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Kürsü / TV */}
          <View style={[r.stagePanel, SHADOWS.card]}>
            <Text style={r.stageTitle}>📺 KÜRSÜ</Text>
            <View style={r.tvArea}>
              <Text style={r.tvPlaceholder}>TV / YouTube yayını burada görünecek</Text>
            </View>
          </View>

          {/* Canlı Yayın */}
          <View style={[r.stagePanel, SHADOWS.card]}>
            <View style={r.liveBadgeRow}>
              <View style={r.liveBadge}>
                <Text style={r.liveBadgeText}>🔴 CANLI YAYIN</Text>
              </View>
            </View>
            <Text style={r.stageSub}>Yayın akışı bekleniyor...</Text>
          </View>

          {/* Radyo */}
          <View style={[r.stagePanel, SHADOWS.card]}>
            <Text style={r.stageTitle}>📻 RADYO</Text>
            <View style={r.radioRow}>
              <Text style={r.radioChannel}>🎵 Power FM</Text>
              <Text style={r.radioGenre}>POP / DANCE</Text>
            </View>
            <View style={r.radioControls}>
              <TouchableOpacity style={r.radioBtn}><Text style={r.radioBtnText}>⏮</Text></TouchableOpacity>
              <TouchableOpacity style={[r.radioBtn, r.radioBtnPlay]}><Text style={r.radioBtnText}>▶</Text></TouchableOpacity>
              <TouchableOpacity style={r.radioBtn}><Text style={r.radioBtnText}>⏭</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={r.radioChannelsBtn}>
              <Text style={r.radioChannelsBtnText}>🎵 KANALLAR</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const r = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Top Bar
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 50, paddingBottom: 10, paddingHorizontal: 14,
    backgroundColor: 'rgba(7,11,20,0.95)', borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  backBtn: { padding: 8 },
  backText: { fontSize: 20, color: COLORS.textSecondary, fontWeight: '700' },
  topBarCenter: { flexDirection: 'row', alignItems: 'baseline', marginLeft: 8 },
  topBarLogo: { fontSize: 16, fontWeight: '900', color: COLORS.white },
  topBarLogoAccent: { fontSize: 16, fontWeight: '900', color: '#fbbf24' },
  topBarInfo: { flex: 1, marginLeft: 12 },
  roomNameText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  // Tab Bar
  tabBar: {
    flexDirection: 'row', backgroundColor: 'rgba(7,11,20,0.9)',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tabItem: {
    flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: COLORS.cyan },
  tabIcon: { fontSize: 16 },
  tabLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.5 },
  tabLabelActive: { color: COLORS.cyan },

  // Chat Tab
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, backgroundColor: 'rgba(7,11,20,0.6)',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  chatHeaderDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.textMuted },
  chatHeaderText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  chatList: { flex: 1, backgroundColor: 'rgba(7,11,20,0.4)' },

  // Messages
  systemMsg: { alignItems: 'center', paddingVertical: 6 },
  systemMsgText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500', fontStyle: 'italic' },

  msgRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end', gap: 8 },
  msgRowOwn: { flexDirection: 'row', justifyContent: 'flex-end' },
  msgAvatar: { width: 32, height: 32, borderRadius: 16 },
  msgBubble: { maxWidth: '72%', borderRadius: 14, padding: 10 },
  msgBubbleOwn: {
    backgroundColor: COLORS.msgOwn, borderWidth: 1, borderColor: COLORS.msgOwnBorder,
    borderBottomRightRadius: 4,
  },
  msgBubbleOther: {
    backgroundColor: COLORS.msgOther, borderWidth: 1, borderColor: COLORS.msgOtherBorder,
    borderBottomLeftRadius: 4,
  },
  msgHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  msgSender: { fontSize: 11, fontWeight: '800' },
  msgRole: { fontSize: 8, color: COLORS.textMuted, fontWeight: '600', opacity: 0.7 },
  msgText: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 19, fontWeight: '400' },
  msgTime: { fontSize: 9, color: COLORS.textMuted, marginTop: 4, textAlign: 'right' },

  // Control Bar
  controlBar: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: 'rgba(7,11,20,0.85)', borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  controlBtn: {
    padding: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  controlIcon: { fontSize: 16 },

  // Input Bar
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: 'rgba(7,11,20,0.9)',
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  chatInput: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 13,
    color: COLORS.white, fontWeight: '400',
    borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    backgroundColor: COLORS.indigo, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10,
    shadowColor: COLORS.indigo, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 6,
    elevation: 4,
  },
  sendBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.white, letterSpacing: 1 },

  // Users Tab
  usersHeader: {
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'rgba(7,11,20,0.6)', borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  usersTitle: { fontSize: 12, fontWeight: '900', color: COLORS.white, letterSpacing: 2 },

  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, marginBottom: 6, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: COLORS.border,
  },
  userAvatarWrap: { position: 'relative' },
  userAvatar: { width: 42, height: 42, borderRadius: 21 },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.green,
    borderWidth: 2, borderColor: COLORS.bg,
  },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  userName: { fontSize: 13, fontWeight: '700' },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  roleBadgeText: { fontSize: 8, fontWeight: '700' },
  userStatus: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500', marginTop: 2 },

  micBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 16, paddingVertical: 14, borderRadius: 14,
    backgroundColor: COLORS.emerald,
    shadowColor: COLORS.emerald, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 6,
  },
  micBtnIcon: { fontSize: 20 },
  micBtnText: { fontSize: 14, fontWeight: '900', color: COLORS.white, letterSpacing: 2 },

  // Stage Tab
  stagePanel: {
    backgroundColor: COLORS.bgPanel, borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  stageTitle: { fontSize: 13, fontWeight: '900', color: COLORS.white, letterSpacing: 2, marginBottom: 12 },
  stageSub: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500', textAlign: 'center', paddingVertical: 16 },
  tvArea: {
    height: 180, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  tvPlaceholder: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  liveBadgeRow: { alignItems: 'center', marginBottom: 8 },
  liveBadge: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  liveBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.red, letterSpacing: 1.5 },

  // Radio
  radioRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  radioChannel: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  radioGenre: { fontSize: 10, fontWeight: '600', color: COLORS.gold },
  radioControls: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 12 },
  radioBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  radioBtnPlay: { backgroundColor: COLORS.cyan, width: 46, height: 46, borderRadius: 23 },
  radioBtnText: { fontSize: 16, color: COLORS.white },
  radioChannelsBtn: {
    paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border,
  },
  radioChannelsBtnText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 1.5 },
});
