import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Platform,
  StyleSheet, TextInput, Image, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../store';
import AppBackground from '../components/shared/AppBackground';

/* ═══════════════════════════════════════════════════════════
   DM SOHBET — KOYU TEMA
   ═══════════════════════════════════════════════════════════ */
export default function DMChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ conversationId: string; userId: string; username: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const [message, setMessage] = useState('');
  const { user, dmMessages, sendDM, fetchDMMessages } = useStore();

  const otherName = params.username || 'Kullanıcı';
  const conversationId = params.conversationId || params.userId || '';

  useEffect(() => {
    if (conversationId) fetchDMMessages?.(conversationId);
  }, [conversationId]);

  // dmMessages is Record<string, msg[]> — get the array for this conversation
  const messages = (dmMessages && typeof dmMessages === 'object' && !Array.isArray(dmMessages))
    ? (dmMessages[conversationId] || dmMessages[params.userId] || [])
    : (Array.isArray(dmMessages) ? dmMessages : []);

  const handleSend = () => {
    if (!message.trim()) return;
    sendDM?.(params.userId, message.trim());
    setMessage('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <AppBackground>
      {/* HEADER */}
      <View style={st.header}>
        <TouchableOpacity style={st.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <View style={st.headerInfo}>
          <Text style={st.headerName} numberOfLines={1}>{otherName}</Text>
          <Text style={st.headerStatus}>Çevrimiçi</Text>
        </View>
        <TouchableOpacity style={st.headerBtn}>
          <Ionicons name="ellipsis-vertical" size={18} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </View>

      {/* MESAJLAR */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={st.msgScroll}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 && (
            <View style={st.emptyWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color="rgba(139,92,246,0.2)" />
              <Text style={st.emptyText}>Sohbete başlayın</Text>
            </View>
          )}

          {messages.map((msg: any, i: number) => {
            const isMine = msg.senderId === user?.id;
            return (
              <View key={msg.id || i} style={[st.msgRow, isMine && st.msgRowMine]}>
                {isMine ? (
                  <LinearGradient colors={['#8b5cf6', '#6366f1']} style={st.bubbleMine}>
                    <Text style={st.bubbleMineText}>{msg.content || msg.text}</Text>
                    <Text style={st.bubbleMineTime}>{formatTime(msg.createdAt || msg.timestamp || new Date().toISOString())}</Text>
                  </LinearGradient>
                ) : (
                  <View style={st.bubbleOther}>
                    <Text style={st.bubbleOtherText}>{msg.content || msg.text}</Text>
                    <Text style={st.bubbleOtherTime}>{formatTime(msg.createdAt || msg.timestamp || new Date().toISOString())}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* INPUT BAR */}
        <View style={st.inputBar}>
          <View style={st.inputWrap}>
            <TextInput
              style={st.input}
              placeholder="Mesaj yaz..."
              placeholderTextColor="rgba(255,255,255,0.2)"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={handleSend}
            />
          </View>
          <TouchableOpacity activeOpacity={0.85} onPress={handleSend}
            disabled={!message.trim()}
            style={[st.sendBtn, !message.trim() && { opacity: 0.4 }]}>
            <LinearGradient colors={['#8b5cf6', '#6366f1']} style={st.sendGrad}>
              <Ionicons name="send" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 16, paddingBottom: 10, gap: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  headerBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerInfo: { flex: 1, alignItems: 'center' },
  headerName: { fontSize: 16, fontWeight: '800', color: '#f1f5f9' },
  headerStatus: { fontSize: 10, fontWeight: '600', color: '#22c55e', marginTop: 1 },

  msgScroll: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },

  msgRow: { marginBottom: 6, alignItems: 'flex-start' },
  msgRowMine: { alignItems: 'flex-end' },

  bubbleMine: {
    maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, borderBottomRightRadius: 4,
  },
  bubbleMineText: { fontSize: 14, fontWeight: '500', color: '#fff', lineHeight: 20 },
  bubbleMineTime: { fontSize: 9, fontWeight: '500', color: 'rgba(255,255,255,0.5)', alignSelf: 'flex-end', marginTop: 3 },

  bubbleOther: {
    maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, borderBottomLeftRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  bubbleOtherText: { fontSize: 14, fontWeight: '500', color: '#f1f5f9', lineHeight: 20 },
  bubbleOtherTime: { fontSize: 9, fontWeight: '500', color: 'rgba(255,255,255,0.25)', alignSelf: 'flex-end', marginTop: 3 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 26 : 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'rgba(10,14,39,0.95)',
  },
  inputWrap: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16, paddingVertical: 10,
    maxHeight: 100,
  },
  input: { fontSize: 15, fontWeight: '500', color: '#f1f5f9' },

  sendBtn: { borderRadius: 20, overflow: 'hidden' },
  sendGrad: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 8 },
  emptyText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.2)' },
});
