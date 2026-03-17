import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Image, FlatList, KeyboardAvoidingView, Platform,
  Dimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS, SHADOWS, ROLE_CONFIG, getAvatarUrl } from '../constants';
import { connectSocket, getSocket, disconnectSocket } from '../services/socket';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../../App';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Room'>;
type RoomUser = { userId: string; displayName?: string; username?: string; avatar?: string; role?: string; status?: string; nameColor?: string };
type ChatMessage = { id: string; userId: string; username: string; avatar?: string; role?: string; text: string; timestamp: number; type?: string; nameColor?: string };

export default function RoomScreen({ navigation, route }: Props) {
  const { slug, token, user } = route.params;
  const [roomName, setRoomName] = useState(slug);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
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

    socket.on('room:info', (data: any) => { if (data.name) setRoomName(data.name); });
    socket.on('room:participants', (data: any) => {
      const users = data?.participants || data;
      if (Array.isArray(users)) setRoomUsers(users);
    });
    socket.on('room:participant-joined', (u: RoomUser) => {
      setRoomUsers(prev => prev.find(p => p.userId === u.userId) ? prev : [...prev, u]);
      addSystemMessage(`${u.displayName || u.username} odaya katıldı`);
    });
    socket.on('room:participant-left', (data: { userId: string }) => {
      setRoomUsers(prev => {
        const leaving = prev.find(p => p.userId === data.userId);
        if (leaving) addSystemMessage(`${leaving.displayName || leaving.username} ayrıldı`);
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

    return () => { socket.emit('room:leave', { roomId: slug }); disconnectSocket(); };
  }, [slug, token]);

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const socket = getSocket();
    if (socket) { socket.emit('chat:send', { roomId: slug, content: inputText.trim() }); setInputText(''); }
  };

  const getRoleInfo = (role?: string) => ROLE_CONFIG[(role || 'guest').toLowerCase()] || ROLE_CONFIG.guest;
  const isOwnMessage = (msg: ChatMessage) => msg.userId === user?.sub;
  const sortedUsers = [...roomUsers].sort((a, b) => getRoleInfo(b.role).level - getRoleInfo(a.role).level);

  // ═══ RENDERS ═══

  const renderUserChip = ({ item }: { item: RoomUser }) => {
    const ri = getRoleInfo(item.role);
    return (
      <View style={r.userChip}>
        <View style={r.userChipAvatarWrap}>
          <Image source={{ uri: getAvatarUrl(item.avatar || '') }} style={r.userChipAvatar} />
          <View style={[r.userChipOnline, { backgroundColor: item.status === 'stealth' ? '#f59e0b' : '#10b981' }]} />
        </View>
        <Text style={[r.userChipName, { color: item.nameColor || ri.color }]} numberOfLines={1}>
          {item.displayName || item.username}
        </Text>
        <Text style={r.userChipRole}>{ri.icon}</Text>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.type === 'system') {
      return (
        <View style={r.sysMsg}>
          <LinearGradient colors={['transparent', 'rgba(56,189,248,0.06)', 'transparent']} start={{x:0,y:0}} end={{x:1,y:0}} style={r.sysMsgBg}>
            <Text style={r.sysMsgText}>⸺ {item.text} ⸺</Text>
          </LinearGradient>
        </View>
      );
    }
    const own = isOwnMessage(item);
    const ri = getRoleInfo(item.role);
    return (
      <View style={[r.msgRow, own && r.msgRowOwn]}>
        {!own && <Image source={{ uri: getAvatarUrl(item.avatar || '') }} style={r.msgAvatar} />}
        <View style={[r.msgBubble, own ? r.msgBubbleOwn : r.msgBubbleOther]}>
          {!own && (
            <View style={r.msgHead}>
              <Text style={[r.msgName, { color: item.nameColor || ri.color }]}>{ri.icon} {item.username}</Text>
              <View style={[r.msgRoleBadge, { backgroundColor: `${ri.color}15`, borderColor: `${ri.color}30` }]}>
                <Text style={[r.msgRoleText, { color: ri.color }]}>{ri.label}</Text>
              </View>
            </View>
          )}
          <Text style={r.msgText}>{item.text}</Text>
          <Text style={r.msgTime}>{new Date(item.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        {own && <Image source={{ uri: getAvatarUrl(user?.avatar || '') }} style={r.msgAvatar} />}
      </View>
    );
  };

  const now = new Date();
  const dateStr = `${now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <View style={r.root}>
      <StatusBar style="light" />
      <View style={r.bg} />

      {/* ═══ METALLIC TOP BAR ═══ */}
      <LinearGradient colors={['#5a6070', '#3d4250', '#1e222e', '#282c3a', '#3a3f50']}
        locations={[0, 0.15, 0.5, 0.75, 1]} style={r.topBar}>
        {/* Top shine */}
        <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)', 'transparent']}
          style={r.topBarShine} />

        <TouchableOpacity onPress={() => navigation.goBack()} style={r.backBtn}>
          <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.04)']} style={r.iconBtn}>
            <Ionicons name="chevron-back" size={20} color="#94a3b8" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={r.topBarCenter}>
          <Image source={require('../../assets/icon.png')} style={{ width: 28, height: 28, borderRadius: 7 }} />
          <Text style={r.logoSoprano}>Soprano<Text style={r.logoChat}>Chat</Text></Text>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Rooms', { token, user })}>
          <LinearGradient colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.04)']} style={r.iconBtn}>
            <Ionicons name="home-outline" size={18} color="#94a3b8" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* ═══ ROOM NAV TABS ═══ */}
      <View style={r.roomNav}>
        <View style={[r.roomNavTab, r.roomNavTabActive]}>
          <Text style={[r.roomNavText, r.roomNavTextActive]}>{roomName.toUpperCase()}</Text>
        </View>
        <View style={r.roomNavTab}>
          <Text style={r.roomNavText}>ODALAR</Text>
        </View>
      </View>

      {/* ═══ HORIZONTAL USER STRIP ═══ */}
      <View style={r.userStrip}>
        <View style={r.userStripHeader}>
          <View style={r.onlineBadge}>
            <View style={r.onlinePulse} />
            <Text style={r.onlineText}>ÇEVRİMİÇİ</Text>
          </View>
          <Text style={r.userCount}>{roomUsers.length}</Text>
        </View>
        <FlatList data={sortedUsers} renderItem={renderUserChip} keyExtractor={i => i.userId}
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }} />
      </View>

      {/* ═══ CHAT AREA ═══ */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Chat header */}
        <View style={r.chatHeader}>
          <View style={r.chatHeaderDot} />
          <Text style={r.chatHeaderText}>{roomName} • {dateStr}</Text>
        </View>

        {/* Messages */}
        <FlatList ref={chatRef} data={messages} renderItem={renderMessage}
          keyExtractor={i => i.id} style={r.chatList}
          contentContainerStyle={{ padding: 14, paddingBottom: 6 }}
          onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false} />

        {/* ═══ CONTROL BAR ═══ */}
        <View style={r.controlBar}>
          {[
            { icon: 'hand-left-outline' as const, label: 'El' },
            { icon: 'videocam-outline' as const, label: 'Kam' },
            { icon: 'volume-high-outline' as const, label: 'Ses' },
            { icon: 'happy-outline' as const, label: 'Emoji' },
          ].map((b, i) => (
            <TouchableOpacity key={i} style={r.ctrlBtn}>
              <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                style={r.ctrlBtnInner}>
                <Ionicons name={b.icon} size={18} color="#94a3b8" />
              </LinearGradient>
            </TouchableOpacity>
          ))}
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={r.ctrlBtn}>
            <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
              style={r.ctrlBtnInner}>
              <Ionicons name="settings-outline" size={18} color="#94a3b8" />
            </LinearGradient>
          </TouchableOpacity>
          {/* MIC BUTTON */}
          <TouchableOpacity style={r.micBtn}>
            <LinearGradient colors={['#10b981', '#059669']} style={r.micBtnInner}>
              <Ionicons name="mic" size={22} color="#0a0f1d" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ═══ INPUT BAR ═══ */}
        <View style={r.inputBar}>
          <View style={r.inputWrap}>
            <TextInput style={r.chatInput} value={inputText} onChangeText={setInputText}
              placeholder="Mesajınızı buraya yazın..." placeholderTextColor="#4a5568"
              onSubmitEditing={sendMessage} returnKeyType="send" />
          </View>
          <TouchableOpacity onPress={sendMessage} style={r.sendBtn}>
            <LinearGradient colors={['#7b9fef', '#5a7fd4']} style={r.sendBtnInner}>
              <Ionicons name="send" size={16} color="#0a0f1d" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const r = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2d3548' },
  bg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#2d3548' },

  // ═══ TOP BAR (Metallic) ═══
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 14, paddingBottom: 8, paddingHorizontal: 16,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.5)', borderTopWidth: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 20,
    elevation: 12,
  },
  topBarShine: {
    position: 'absolute', top: 0, left: '10%', right: '10%', height: '35%',
    borderBottomLeftRadius: 999, borderBottomRightRadius: 999,
  },
  backBtn: {},
  homeBtn: {},
  iconBtn: {
    width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  iconBtnText: { fontSize: 20, color: '#94a3b8', fontWeight: '700' },

  topBarCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoSoprano: {
    fontSize: 18, fontFamily: 'Fraunces-Black',
    color: '#dde4ee',
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 4,
  },
  logoChat: {
    fontSize: 18, fontFamily: 'Fraunces-Black', color: '#5ec8c8',
  },

  // ═══ ROOM NAV ═══
  roomNav: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, gap: 8,
  },
  roomNavTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'transparent',
  },
  roomNavTabActive: {
    backgroundColor: 'rgba(94,200,200,0.1)', borderColor: 'rgba(94,200,200,0.3)',
  },
  roomNavText: { fontSize: 10, fontWeight: '700', color: '#4a5568', letterSpacing: 1.5 },
  roomNavTextActive: { color: '#5ec8c8' },

  // ═══ USER STRIP (Horizontal) ═══
  userStrip: {
    paddingTop: 8, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  userStripHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 8,
  },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlinePulse: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981',
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4,
  },
  onlineText: { fontSize: 9, fontWeight: '800', color: '#475569', letterSpacing: 2 },
  userCount: {
    fontSize: 11, fontWeight: '900', color: '#5ec8c8',
    backgroundColor: 'rgba(94,200,200,0.1)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },

  userChip: {
    alignItems: 'center', width: 58, gap: 3,
  },
  userChipAvatarWrap: { position: 'relative' },
  userChipAvatar: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)',
  },
  userChipOnline: {
    position: 'absolute', bottom: 0, right: -1,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: '#0d1220',
  },
  userChipName: { fontSize: 8, fontWeight: '700', textAlign: 'center' },
  userChipRole: { fontSize: 10 },

  // ═══ CHAT ═══
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  chatHeaderDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#334155' },
  chatHeaderText: { fontSize: 10, color: '#334155', fontWeight: '600' },
  chatList: { flex: 1 },

  // Messages
  sysMsg: { paddingVertical: 4, marginVertical: 2 },
  sysMsgBg: { paddingVertical: 4, paddingHorizontal: 16, borderRadius: 12 },
  sysMsgText: { fontSize: 10, color: '#475569', fontWeight: '500', textAlign: 'center', fontStyle: 'italic' },

  msgRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end', gap: 8 },
  msgRowOwn: { justifyContent: 'flex-end' },
  msgAvatar: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  msgBubble: { maxWidth: '72%', borderRadius: 16, padding: 10 },
  msgBubbleOwn: {
    backgroundColor: 'rgba(123,159,239,0.12)',
    borderWidth: 1, borderColor: 'rgba(123,159,239,0.25)',
    borderBottomRightRadius: 4,
  },
  msgBubbleOther: {
    backgroundColor: 'rgba(26,35,58,0.5)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
    borderBottomLeftRadius: 4,
  },
  msgHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  msgName: { fontSize: 11, fontWeight: '800' },
  msgRoleBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, borderWidth: 1 },
  msgRoleText: { fontSize: 7, fontWeight: '700' },
  msgText: { fontSize: 13, color: '#e2e8f0', lineHeight: 19 },
  msgTime: { fontSize: 8, color: '#475569', marginTop: 3, textAlign: 'right' },

  // ═══ CONTROL BAR ═══
  controlBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'rgba(13,18,32,0.95)',
  },
  ctrlBtn: {},
  ctrlBtnInner: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  ctrlIcon: { fontSize: 16 },

  micBtn: {},
  micBtnInner: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10,
    elevation: 6,
  },
  micIcon: { fontSize: 20 },

  // ═══ INPUT BAR ═══
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 34,
    backgroundColor: 'rgba(13,18,32,0.98)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
  },
  inputWrap: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  chatInput: {
    paddingHorizontal: 16, paddingVertical: 11, fontSize: 13, color: '#e2e8f0',
  },
  sendBtn: {},
  sendBtnInner: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12,
    shadowColor: '#7b9fef', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 6,
  },
  sendText: { fontSize: 11, fontWeight: '800', color: '#0a0f1d', letterSpacing: 1 },
  sendArrow: { fontSize: 12, color: 'rgba(10,15,29,0.6)' },
});
