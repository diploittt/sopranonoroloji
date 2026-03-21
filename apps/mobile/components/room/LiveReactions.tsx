import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';

const { width, height } = Dimensions.get('window');

const REACTION_EMOJIS = ['❤️', '🔥', '👏', '😂', '😍', '🎉', '💯', '👑'];

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  anim: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  drift: number;
}

let emojiCounter = 0;

/* ── Tek Uçan Emoji ── */
function FloatingEmojiView({ item }: { item: FloatingEmoji }) {
  useEffect(() => {
    Animated.parallel([
      Animated.timing(item.anim, { toValue: 1, duration: 2500, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(item.scale, { toValue: 1.3, duration: 300, useNativeDriver: true }),
        Animated.timing(item.scale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(item.opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const translateY = item.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.4] });
  const translateX = item.anim.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [0, item.drift, -item.drift * 0.5, item.drift * 0.3] });

  return (
    <Animated.View style={{
      position: 'absolute', bottom: 120, left: item.x,
      opacity: item.opacity,
      transform: [{ translateY }, { translateX }, { scale: item.scale }],
    }}>
      <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
    </Animated.View>
  );
}

/* ══════════════════════════════════════════
   LIVE REACTIONS — Uçan emojiler + tepki bar
   ══════════════════════════════════════════ */
export default function LiveReactions({
  onReaction,
  incomingReaction,
}: {
  onReaction?: (emoji: string) => void;
  incomingReaction?: { emoji: string; userId: string; timestamp: number } | null;
}) {
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);

  const addEmoji = (emoji: string) => {
    const id = emojiCounter++;
    const newEmoji: FloatingEmoji = {
      id, emoji,
      x: 20 + Math.random() * (width - 80),
      anim: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(0.5),
      drift: (Math.random() - 0.5) * 40,
    };
    setFloatingEmojis(prev => [...prev.slice(-12), newEmoji]);
    // Cleanup after animation
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== id));
    }, 3000);
  };

  // Gelen reactionları göster
  useEffect(() => {
    if (incomingReaction) {
      addEmoji(incomingReaction.emoji);
    }
  }, [incomingReaction?.timestamp]);

  const handleTap = (emoji: string) => {
    addEmoji(emoji);
    onReaction?.(emoji);
  };

  return (
    <>
      {/* Uçan emojiler */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {floatingEmojis.map(e => (
          <FloatingEmojiView key={e.id} item={e} />
        ))}
      </View>

      {/* Reaction bar — ekranın altında, kontrol panelinin üstünde */}
      <View style={s.reactionBar}>
        {REACTION_EMOJIS.map(emoji => (
          <TouchableOpacity key={emoji} onPress={() => handleTap(emoji)} style={s.reactionBtn} activeOpacity={0.7}>
            <Text style={s.reactionEmoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  reactionBar: {
    flexDirection: 'row', justifyContent: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  reactionBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  reactionEmoji: { fontSize: 18 },
});
