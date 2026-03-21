import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRoleColor } from '../../utils/roleHelpers';

interface ChatMessage {
  id: string;
  userId?: string;
  sender?: string;
  displayName?: string;
  senderName?: string;
  avatar?: string;
  senderAvatar?: string;
  role?: string;
  text?: string;
  content?: string;
  timestamp?: number;
  createdAt?: string;
}

const FADE_OUT_DELAY = 8000;  // 8 saniye sonra kaybolmaya başla
const FADE_OUT_DURATION = 2000; // 2 saniyede tamamen yok ol

/* ── Tek Mesaj Satırı — fade-in + otomatik fade-out ── */
function ChatBubble({ msg, onFaded }: { msg: ChatMessage; onFaded?: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const roleColor = getRoleColor(msg.role);
  const name = msg.displayName || msg.senderName || 'Kullanıcı';
  const msgText = msg.text || msg.content || '';
  const msgAvatar = msg.avatar || msg.senderAvatar || 'https://sopranochat.com/avatars/neutral_1.png';

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
      // Fade out — belirli süre sonra hayalet gibi kaybol
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: FADE_OUT_DURATION,
          useNativeDriver: true,
        }).start(() => {
          onFaded?.();
        });
      }, FADE_OUT_DELAY);
    });
  }, []);

  return (
    <Animated.View style={[s.bubble, { opacity: fadeAnim }]}>
      <Image source={{ uri: msgAvatar }} style={s.bubbleAvatar} />
      <View style={s.bubbleContent}>
        <Text style={[s.bubbleName, { color: roleColor }]}>{name}</Text>
        {msgText ? <Text style={s.bubbleText}>{msgText}</Text> : null}
      </View>
    </Animated.View>
  );
}

/* ══════════════════════════════════════════
   LIVE CHAT OVERLAY
   Son mesajlar yarı-şeffaf overlay olarak gösterilir,
   8 saniye sonra hayalet gibi kaybolur
   ══════════════════════════════════════════ */
export default function LiveChat({
  messages,
  maxVisible = 4,
  onOpenFullChat,
}: {
  messages: ChatMessage[];
  maxVisible?: number;
  onOpenFullChat?: () => void;
}) {
  const [fadedIds, setFadedIds] = useState<Set<string>>(new Set());

  // Yok olmuş mesajları filtrele
  const visibleMessages = messages
    .filter(m => !fadedIds.has(m.id))
    .slice(-maxVisible);

  const handleFaded = (id: string) => {
    setFadedIds(prev => new Set(prev).add(id));
  };

  return (
    <View style={s.container}>
      {/* Mesajlar */}
      {visibleMessages.map(msg => (
        <ChatBubble
          key={msg.id || `${msg.userId || msg.sender}-${msg.timestamp}`}
          msg={msg}
          onFaded={() => handleFaded(msg.id)}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },

  bubble: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    paddingVertical: 3, paddingHorizontal: 4,
    marginVertical: 1,
  },
  bubbleAvatar: {
    width: 22, height: 22, borderRadius: 11,
    marginTop: 2,
  },
  bubbleContent: { flex: 1 },
  bubbleName: {
    fontSize: 10, fontWeight: '800',
  },
  bubbleText: {
    fontSize: 12, color: 'rgba(255,255,255,0.85)',
    lineHeight: 16,
  },

  emptyHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center', paddingVertical: 6,
  },
  emptyText: {
    fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: '500',
  },
});
