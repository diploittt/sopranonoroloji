import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform, TextInput, Keyboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface ControlPanelProps {
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  onMicToggle: () => void;
  onCamToggle: () => void;
  onHandToggle: () => void;
  onChatOpen: () => void;
  onGiftOpen: () => void;
  onExit: () => void;
  /* Yeni: inline chat */
  chatMessage?: string;
  onChatChange?: (text: string) => void;
  onChatSend?: () => void;
  onEmojiPress?: () => void;
}

/* ══════════════════════════════════════════
   COMPACT BOTTOM BAR
   Tek satır: [mesaj input] [emoji] [kamera] [el] [MIC] [sohbet] [hediye]
   ══════════════════════════════════════════ */
export default function ControlPanel(props: ControlPanelProps) {
  const {
    micOn, camOn, handRaised,
    onMicToggle, onCamToggle, onHandToggle,
    onChatOpen, onGiftOpen,
    chatMessage = '', onChatChange, onChatSend, onEmojiPress,
  } = props;

  // Mic pulse
  const pulse = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (micOn) {
      Animated.loop(Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1.06, duration: 600, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, { toValue: 0.96, duration: 600, useNativeDriver: true }),
          Animated.timing(glow, { toValue: 0.5, duration: 300, useNativeDriver: true }),
        ]),
      ])).start();
    } else {
      pulse.setValue(1);
      glow.setValue(0);
    }
  }, [micOn]);

  // Keyboard height tracking
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKbHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKbHeight(0)
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Web-safe press handler wrapper
  const webPress = (handler: () => void) => {
    return Platform.OS === 'web' ? { onClick: handler } : {};
  };

  return (
    <View style={[s.wrapper, kbHeight > 0 && { paddingBottom: Platform.OS === 'ios' ? kbHeight : kbHeight - 20 }]}>
      <LinearGradient
        colors={['rgba(10,14,39,0.5)', 'rgba(10,14,39,0.97)']}
        style={s.gradient}
      />

      {/* ── MESAJ INPUT SATIRI ── */}
      <View style={s.chatRow}>
        <Pressable style={s.emojiBtn} onPress={onEmojiPress} {...webPress(onEmojiPress!)}>
          <Ionicons name="happy-outline" size={18} color="rgba(255,255,255,0.4)" />
        </Pressable>
        <TextInput
          style={s.chatInput}
          placeholder="Say..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={chatMessage}
          onChangeText={onChatChange}
          returnKeyType="send"
          onSubmitEditing={onChatSend}
          maxLength={300}
        />
        {chatMessage.trim().length > 0 && (
          <Pressable onPress={onChatSend} {...webPress(onChatSend!)}>
            <Ionicons name="send" size={16} color="#00ff88" />
          </Pressable>
        )}
      </View>

      {/* ── BUTON SATIRI ── */}
      <View style={s.bar}>
        {/* Kamera */}
        <Pressable onPress={onCamToggle} style={[s.btn, camOn && s.btnCamOn]} {...webPress(onCamToggle)}>
          <Ionicons name={camOn ? 'videocam' : 'videocam-off-outline'} size={18} color={camOn ? '#fff' : 'rgba(255,255,255,0.5)'} />
        </Pressable>

        {/* El kaldır */}
        <Pressable onPress={onHandToggle} style={[s.btn, handRaised && s.btnHandOn]} {...webPress(onHandToggle)}>
          <Ionicons name="hand-left" size={18} color={handRaised ? '#fff' : '#ffb800'} />
        </Pressable>

        {/* ═══ MİKROFON ═══ */}
        <Animated.View style={[s.micOuter, { transform: [{ scale: pulse }] }]}>
          <Animated.View style={[s.micGlow, {
            opacity: glow,
            backgroundColor: micOn ? 'rgba(255,45,120,0.25)' : 'transparent',
          }]} />
          <Pressable onPress={onMicToggle}
            style={[s.micBtn, micOn ? s.micOn : s.micOff]}
            {...webPress(onMicToggle)}>
            <Ionicons name={micOn ? 'mic' : 'mic-off'} size={24} color={micOn ? '#fff' : 'rgba(255,255,255,0.7)'} />
          </Pressable>
        </Animated.View>

        {/* Sohbet */}
        <Pressable onPress={onChatOpen} style={s.btn} {...webPress(onChatOpen)}>
          <Ionicons name="chatbubble-outline" size={18} color="rgba(255,255,255,0.5)" />
        </Pressable>

        {/* Hediye */}
        <Pressable onPress={onGiftOpen} style={[s.btn, s.btnGift]} {...webPress(onGiftOpen)}>
          <Ionicons name="gift" size={18} color="#a855f7" />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },

  /* Chat input row */
  chatRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 12, marginTop: 4, marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 6 : 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  emojiBtn: {
    padding: 2,
  },
  chatInput: {
    flex: 1, fontSize: 13, fontWeight: '500', color: '#fff',
    paddingVertical: 0, minHeight: 22,
  },

  /* Button row */
  bar: {
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },

  btn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnCamOn: {
    backgroundColor: 'rgba(74,158,255,0.2)',
    borderColor: 'rgba(74,158,255,0.35)',
  },
  btnHandOn: {
    backgroundColor: 'rgba(255,184,0,0.2)',
    borderColor: 'rgba(255,184,0,0.35)',
  },
  btnGift: {
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderColor: 'rgba(168,85,247,0.2)',
  },

  /* MIC */
  micOuter: {
    width: 52, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  micGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
  },
  micBtn: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
  },
  micOn: {
    backgroundColor: '#ff2d78',
    borderColor: '#ff2d78',
    shadowColor: '#ff2d78',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  micOff: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.15)',
  },
});
