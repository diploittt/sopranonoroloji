/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — DMScreen
   Özel mesaj (DM) bottom sheet modal
   ═══════════════════════════════════════════════════════════ */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal,
  StyleSheet, Platform, KeyboardAvoidingView, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../../store';

interface DMMessage {
  id: string;
  fromUserId: string;
  fromUsername: string;
  content: string;
  timestamp: number;
  isOwn?: boolean;
}

interface Props {
  visible: boolean;
  targetUserId: string;
  targetUsername: string;
  onClose: () => void;
}

export default function DMScreen({ visible, targetUserId, targetUsername, onClose }: Props) {
  const { dmMessages, sendDM } = useStore();
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const msgs: DMMessage[] = dmMessages[targetUserId] || [];

  useEffect(() => {
    if (msgs.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [msgs.length]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !targetUserId) return;
    sendDM(targetUserId, text);
    setInput('');
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={s.container}
        >
          <View style={s.inner} onStartShouldSetResponder={() => true}>
            {/* Header */}
            <View style={s.header}>
              <View style={s.headerLeft}>
                <Ionicons name="chatbubble-outline" size={16} color="#818cf8" />
                <Text style={s.headerTitle}>{targetUsername}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            {/* Mesajlar */}
            <FlatList
              ref={flatListRef}
              data={msgs}
              keyExtractor={(item) => item.id}
              style={s.list}
              contentContainerStyle={s.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={[s.msgRow, item.isOwn && s.msgRowOwn]}>
                  <View style={[s.bubble, item.isOwn ? s.bubbleOwn : s.bubbleOther]}>
                    <Text style={[s.msgText, item.isOwn && s.msgTextOwn]}>{item.content}</Text>
                    <Text style={s.msgTime}>
                      {new Date(item.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={s.emptyState}>
                  <Ionicons name="mail-outline" size={32} color="rgba(255,255,255,0.1)" />
                  <Text style={s.emptyText}>Henüz mesaj yok</Text>
                  <Text style={s.emptySubtext}>İlk mesajı sen gönder!</Text>
                </View>
              }
            />

            {/* Input */}
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                placeholder="Mesaj yaz..."
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[s.sendBtn, input.trim() && s.sendBtnActive]}
                onPress={handleSend}
                disabled={!input.trim()}
                activeOpacity={0.7}
              >
                <Ionicons name="send" size={16} color={input.trim() ? '#fff' : 'rgba(255,255,255,0.25)'} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  container: { flex: 1, justifyContent: 'flex-end' },
  inner: {
    backgroundColor: 'rgba(15,20,35,0.98)',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '70%', minHeight: 300,
    borderTopWidth: 1, borderColor: 'rgba(123,159,239,0.1)',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#e2e8f0' },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 14, paddingVertical: 10 },

  emptyState: { alignItems: 'center', paddingVertical: 50, gap: 6 },
  emptyText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.2)' },
  emptySubtext: { fontSize: 11, color: 'rgba(255,255,255,0.1)' },

  msgRow: { marginBottom: 8, alignItems: 'flex-start' },
  msgRowOwn: { alignItems: 'flex-end' },
  bubble: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, maxWidth: '80%' },
  bubbleOwn: {
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderTopRightRadius: 4,
    borderWidth: 0.5, borderColor: 'rgba(99,102,241,0.25)',
  },
  bubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderTopLeftRadius: 4,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  msgText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
  msgTextOwn: { color: '#c7d2fe' },
  msgTime: { fontSize: 8, color: 'rgba(255,255,255,0.2)', marginTop: 3, textAlign: 'right' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  input: {
    flex: 1, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14, fontSize: 13, color: '#f1f5f9',
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: 'rgba(99,102,241,0.5)' },
});
