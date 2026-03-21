/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — EmojiPicker
   Hızlı erişim emoji paneli — kategori bazlı
   ═══════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, Pressable,
} from 'react-native';

interface Props {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

type Category = 'frequent' | 'faces' | 'hands' | 'hearts' | 'celebrate' | 'objects';

const CATEGORIES: { id: Category; icon: string; label: string }[] = [
  { id: 'frequent', icon: '⏱️', label: 'Sık' },
  { id: 'faces', icon: '😊', label: 'Yüzler' },
  { id: 'hands', icon: '👍', label: 'Eller' },
  { id: 'hearts', icon: '❤️', label: 'Kalpler' },
  { id: 'celebrate', icon: '🎉', label: 'Kutlama' },
  { id: 'objects', icon: '🔥', label: 'Nesneler' },
];

const EMOJIS: Record<Category, string[]> = {
  frequent: ['😂', '❤️', '🔥', '👍', '😊', '🎉', '😢', '🤔', '👏', '💯', '🙏', '😍'],
  faces: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '😍', '🤩', '😘', '😜', '🤔', '😐', '😑', '🙄', '😏', '😌', '😴', '🤧', '😎', '🤓', '😱', '😤', '😡', '🤬', '😈'],
  hands: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤙', '👋', '🤚', '✋', '🤏', '👐', '🙌', '👏', '🤝', '🙏', '💪', '🦾', '🖕', '🫵'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💔', '❣️', '🫶'],
  celebrate: ['🎉', '🎊', '🎈', '🎁', '🎀', '🪅', '🎆', '🎇', '✨', '🌟', '⭐', '💫', '🏆', '🥇', '🥈', '🥉', '🎯', '🎪', '🎭', '🎶'],
  objects: ['🔥', '💯', '💎', '🪙', '💰', '💸', '🎮', '🎧', '📱', '💻', '🚀', '⚡', '💡', '🔔', '🎵', '🎶', '☕', '🍕', '🌹', '🦋'],
};

export default function EmojiPicker({ visible, onSelect, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>('frequent');

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <View style={s.container} onStartShouldSetResponder={() => true}>
          {/* Başlık */}
          <View style={s.header}>
            <Text style={s.title}>Emoji Seç</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Kategori Tab'ları */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catBar}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[s.catBtn, activeCategory === cat.id && s.catBtnActive]}
                onPress={() => setActiveCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Text style={s.catIcon}>{cat.icon}</Text>
                <Text style={[s.catLabel, activeCategory === cat.id && s.catLabelActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Emoji Grid */}
          <View style={s.grid}>
            {EMOJIS[activeCategory].map((emoji, i) => (
              <TouchableOpacity
                key={`${emoji}_${i}`}
                style={s.emojiBtn}
                onPress={() => { onSelect(emoji); onClose(); }}
                activeOpacity={0.6}
              >
                <Text style={s.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    backgroundColor: 'rgba(15,20,35,0.98)',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 30, paddingTop: 12,
    borderTopWidth: 1, borderColor: 'rgba(123,159,239,0.1)',
    maxHeight: '50%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  title: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  catBar: { paddingHorizontal: 12, marginBottom: 8, maxHeight: 44 },
  catBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, marginRight: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  catBtnActive: { backgroundColor: 'rgba(99,102,241,0.2)' },
  catIcon: { fontSize: 14 },
  catLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.3)' },
  catLabelActive: { color: '#818cf8' },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 10, gap: 2,
  },
  emojiBtn: {
    width: '12%', aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 10,
  },
  emoji: { fontSize: 24 },
});
