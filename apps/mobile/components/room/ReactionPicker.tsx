/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — ReactionPicker
   Mesaja long-press ile açılan emoji reaction paneli
   ═══════════════════════════════════════════════════════════ */

import React from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Pressable,
} from 'react-native';

interface Props {
  visible: boolean;
  messageId: string;
  currentUserName: string;
  reactions?: Record<string, string[]>;
  onSelect: (messageId: string, emoji: string) => void;
  onClose: () => void;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function ReactionPicker({ visible, messageId, currentUserName, reactions, onSelect, onClose }: Props) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <View style={s.picker}>
          {REACTIONS.map((emoji) => {
            const users = reactions?.[emoji] || [];
            const alreadyReacted = users.includes(currentUserName);
            return (
              <TouchableOpacity
                key={emoji}
                style={[s.emojiBtn, alreadyReacted && s.emojiBtnActive]}
                onPress={() => { onSelect(messageId, emoji); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={s.emoji}>{emoji}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  picker: {
    flexDirection: 'row', gap: 4,
    backgroundColor: 'rgba(15,20,35,0.97)',
    borderRadius: 18, padding: 8,
    borderWidth: 1, borderColor: 'rgba(123,159,239,0.15)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 32,
    elevation: 20,
  },
  emojiBtn: {
    padding: 8, borderRadius: 12,
    borderWidth: 1, borderColor: 'transparent',
  },
  emojiBtnActive: {
    backgroundColor: 'rgba(123,159,239,0.18)',
    borderColor: 'rgba(123,159,239,0.3)',
  },
  emoji: { fontSize: 24 },
});
