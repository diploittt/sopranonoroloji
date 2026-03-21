/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — ChatPanel (Enhanced)
   Room içi sohbet — typing, reactions, emoji, mention, expand
   ═══════════════════════════════════════════════════════════ */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Platform, Image, Dimensions, KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRoleIcon, getRoleColor } from '../../utils/roleHelpers';
import useStore from '../../store';
import type { ChatMessage } from '../../services/realtimeService';
import TypingIndicator from './TypingIndicator';
import ReactionPicker from './ReactionPicker';
import EmojiPicker from './EmojiPicker';

const { width } = Dimensions.get('window');
const MAX_MSG_LENGTH = 200;

/* ── Mention highlight helper ── */
function renderMessageText(text: string, isOwn: boolean) {
  const mentionRegex = /@(\w+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text key={key++} style={isOwn ? st.ownText : st.otherText}>
          {text.slice(lastIndex, match.index)}
        </Text>
      );
    }
    parts.push(
      <Text key={key++} style={st.mentionText}>{match[0]}</Text>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(
      <Text key={key++} style={isOwn ? st.ownText : st.otherText}>
        {text.slice(lastIndex)}
      </Text>
    );
  }
  return parts.length > 0 ? <Text>{parts}</Text> : <Text style={isOwn ? st.ownText : st.otherText}>{text}</Text>;
}

/* ── Tek Mesaj Kartı ── */
function MessageBubble({
  msg, isOwn, onLongPress, userName,
}: {
  msg: ChatMessage; isOwn: boolean;
  onLongPress: (msgId: string) => void;
  userName: string;
}) {
  const { addReaction } = useStore();
  const [expanded, setExpanded] = useState(false);
  const roleColor = getRoleColor(msg.role);
  const roleIcon = getRoleIcon(msg.role);
  const isLong = msg.content.length > MAX_MSG_LENGTH;
  const displayText = isLong && !expanded ? msg.content.slice(0, MAX_MSG_LENGTH) + '...' : msg.content;

  const reactions = msg.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;

  const timeStr = msg.createdAt
    ? new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : '';

  if (isOwn) {
    return (
      <View style={st.ownRow}>
        <Pressable
          onLongPress={() => onLongPress(msg.id)}
          delayLongPress={400}
          style={st.ownBubble}
        >
          {renderMessageText(displayText, true)}
          {isLong && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <Text style={st.expandBtn}>{expanded ? 'kısalt' : 'devamını oku'}</Text>
            </TouchableOpacity>
          )}
          <Text style={st.timeText}>{timeStr}</Text>
        </Pressable>
        {/* Reaction badges */}
        {hasReactions && (
          <View style={st.reactionsRow}>
            {Object.entries(reactions).map(([emoji, users]) => (
              <TouchableOpacity
                key={emoji}
                style={[st.reactionBadge, (users as string[]).includes(userName) && st.reactionBadgeMine]}
                onPress={() => addReaction(msg.id, emoji)}
                activeOpacity={0.7}
              >
                <Text style={st.reactionEmoji}>{emoji}</Text>
                <Text style={st.reactionCount}>{(users as string[]).length}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={st.otherRow}>
      {/* Avatar */}
      <Image source={{ uri: msg.senderAvatar || '/avatars/neutral_1.png' }} style={st.msgAvatar} />

      <View style={{ flex: 1 }}>
        {/* İsim + Rol */}
        <View style={st.senderRow}>
          {roleIcon ? <Text style={{ fontSize: 10 }}>{roleIcon}</Text> : null}
          <Text style={[st.senderName, { color: msg.senderNameColor || roleColor }]}>
            {msg.senderName || 'Anonim'}
          </Text>
          <Text style={st.timeTextInline}>{timeStr}</Text>
        </View>

        {/* Mesaj */}
        <Pressable
          onLongPress={() => onLongPress(msg.id)}
          delayLongPress={400}
          style={st.otherBubble}
        >
          {renderMessageText(displayText, false)}
          {isLong && (
            <TouchableOpacity onPress={() => setExpanded(!expanded)}>
              <Text style={st.expandBtn}>{expanded ? 'kısalt' : 'devamını oku'}</Text>
            </TouchableOpacity>
          )}
        </Pressable>

        {/* Reaction badges */}
        {hasReactions && (
          <View style={st.reactionsRowLeft}>
            {Object.entries(reactions).map(([emoji, users]) => (
              <TouchableOpacity
                key={emoji}
                style={[st.reactionBadge, (users as string[]).includes(userName) && st.reactionBadgeMine]}
                onPress={() => addReaction(msg.id, emoji)}
                activeOpacity={0.7}
              >
                <Text style={st.reactionEmoji}>{emoji}</Text>
                <Text style={st.reactionCount}>{(users as string[]).length}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

/* ── Ana ChatPanel ── */
export default function ChatPanel() {
  const { messages, sendChatMessage, user, typingUsers, emitTyping, addReaction } = useStore();
  const [input, setInput] = useState('');
  const [emojiVisible, setEmojiVisible] = useState(false);
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userName = user?.displayName || user?.id || '';

  // Yeni mesaj geldiğinde en alta scroll
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // ─── Typing emit logic ────────────────────────────────────
  const handleTextChange = useCallback((text: string) => {
    setInput(text);
    if (text.trim().length > 0) {
      emitTyping(true);
      // 2 saniye yazmayı bırakırsa typing:false gönder
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => emitTyping(false), 2000);
    } else {
      emitTyping(false);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    }
  }, [emitTyping]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendChatMessage(text);
    setInput('');
    emitTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  };

  // ─── Long press → reaction picker ────────────────────────
  const handleLongPress = useCallback((msgId: string) => {
    setReactionMsgId(msgId);
  }, []);

  const handleReaction = useCallback((msgId: string, emoji: string) => {
    addReaction(msgId, emoji);
  }, [addReaction]);

  // ─── Emoji picker → input'a ekle ────────────────────────
  const handleEmojiSelect = useCallback((emoji: string) => {
    setInput(prev => prev + emoji);
  }, []);

  const reactionMsg = reactionMsgId ? messages.find(m => m.id === reactionMsgId) : null;

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwn = item.sender === user?.id;
    return (
      <MessageBubble
        msg={item}
        isOwn={isOwn}
        onLongPress={handleLongPress}
        userName={userName}
      />
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={st.container}
      keyboardVerticalOffset={100}
    >
      {/* Mesaj Listesi */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        style={st.list}
        contentContainerStyle={st.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={st.emptyState}>
            <Ionicons name="chatbubble-ellipses-outline" size={36} color="rgba(255,255,255,0.12)" />
            <Text style={st.emptyText}>Henüz mesaj yok</Text>
            <Text style={st.emptySubtext}>İlk mesajı sen yaz!</Text>
          </View>
        }
      />

      {/* Typing Indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Mesaj Gönderme */}
      <View style={st.inputRow}>
        {/* Emoji Picker butonu */}
        <TouchableOpacity
          style={st.emojiBtn}
          onPress={() => setEmojiVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="happy-outline" size={22} color="rgba(255,255,255,0.35)" />
        </TouchableOpacity>

        <TextInput
          style={st.input}
          placeholder="Mesaj yaz..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={input}
          onChangeText={handleTextChange}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline={false}
        />
        <TouchableOpacity
          style={[st.sendBtn, input.trim().length > 0 && st.sendBtnActive]}
          onPress={handleSend}
          activeOpacity={0.7}
          disabled={!input.trim()}
        >
          <Ionicons name="send" size={18} color={input.trim() ? '#fff' : 'rgba(255,255,255,0.25)'} />
        </TouchableOpacity>
      </View>

      {/* Reaction Picker Modal */}
      <ReactionPicker
        visible={!!reactionMsgId}
        messageId={reactionMsgId || ''}
        currentUserName={userName}
        reactions={reactionMsg?.reactions}
        onSelect={handleReaction}
        onClose={() => setReactionMsgId(null)}
      />

      {/* Emoji Picker Modal */}
      <EmojiPicker
        visible={emojiVisible}
        onSelect={handleEmojiSelect}
        onClose={() => setEmojiVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

/* ═══ STİLLER ═══ */
const st = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },

  /* ── Empty ── */
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 6 },
  emptyText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.2)' },
  emptySubtext: { fontSize: 11, color: 'rgba(255,255,255,0.12)' },

  /* ── Başkasının mesajı (sol) ── */
  otherRow: { flexDirection: 'row', marginBottom: 10, gap: 8, maxWidth: '85%' },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, marginTop: 2, backgroundColor: '#1e293b' },
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  senderName: { fontSize: 11, fontWeight: '700' },
  otherBubble: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, borderTopLeftRadius: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  otherText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },

  /* ── Kendi mesajım (sağ) ── */
  ownRow: { alignItems: 'flex-end', marginBottom: 10 },
  ownBubble: {
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderRadius: 14, borderTopRightRadius: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    maxWidth: '80%',
    borderWidth: 0.5, borderColor: 'rgba(99,102,241,0.25)',
  },
  ownText: { fontSize: 13, color: '#c7d2fe', lineHeight: 18 },

  /* ── Zaman ── */
  timeText: {
    fontSize: 9, color: 'rgba(255,255,255,0.2)',
    marginTop: 3, textAlign: 'right',
  },
  timeTextInline: {
    fontSize: 9, color: 'rgba(255,255,255,0.15)',
    marginLeft: 6,
  },

  /* ── Mention ── */
  mentionText: {
    fontSize: 13, fontWeight: '700',
    color: '#818cf8',
    backgroundColor: 'rgba(129,140,248,0.12)',
    borderRadius: 4, paddingHorizontal: 2,
  },

  /* ── Expand ── */
  expandBtn: {
    fontSize: 11, fontWeight: '600', color: '#818cf8',
    marginTop: 4,
  },

  /* ── Reactions ── */
  reactionsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
    marginTop: 4, justifyContent: 'flex-end',
  },
  reactionsRowLeft: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 4,
    marginTop: 4, justifyContent: 'flex-start',
  },
  reactionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  reactionBadgeMine: {
    backgroundColor: 'rgba(123,159,239,0.15)',
    borderColor: 'rgba(123,159,239,0.3)',
  },
  reactionEmoji: { fontSize: 12 },
  reactionCount: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },

  /* ── Input ── */
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 6 : 10,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  emojiBtn: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14, fontSize: 13, color: '#f1f5f9',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: 'rgba(99,102,241,0.5)',
  },
});
