/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — MiniRadioPlayer
   Sağ alt köşede SÜRÜKLENEBİLİR dönen vinil plak FAB
   Tıkla → açılır panel (play/skip/kanal seçimi)
   ═══════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, ScrollView,
  Modal, Pressable, Easing, Dimensions, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const { width: W, height: H } = Dimensions.get('window');

interface RadioStation {
  id: string;
  name: string;
  genre: string;
  url: string;
  icon: string;
}

const STATIONS: RadioStation[] = [
  { id: 'powerfm', name: 'Power FM', genre: 'Pop / Dance', url: 'https://listen.powerapp.com.tr/powerfm/mpeg/icecast.audio', icon: '⚡' },
  { id: 'powerturk', name: 'Power Türk', genre: 'Türkçe Pop', url: 'https://listen.powerapp.com.tr/powerturk/mpeg/icecast.audio', icon: '🎤' },
  { id: 'kralpop', name: 'Kral Pop', genre: 'Türkçe Pop', url: 'https://listen.powerapp.com.tr/kralpop/mpeg/icecast.audio', icon: '👑' },
  { id: 'kralfm', name: 'Kral FM', genre: 'Arabesk', url: 'https://listen.powerapp.com.tr/kralfm/mpeg/icecast.audio', icon: '🎵' },
  { id: 'slowturk', name: 'SlowTürk', genre: 'Slow', url: 'https://listen.powerapp.com.tr/slowturk/mpeg/icecast.audio', icon: '💜' },
  { id: 'fenomen', name: 'Fenomen', genre: 'Pop / Dans', url: 'https://listen.radyofenomen.com/fenomen/128/icecast.audio', icon: '🔥' },
  { id: 'virginfm', name: 'Virgin Radio', genre: 'Pop / Rock', url: 'https://listen.powerapp.com.tr/virginradio/mpeg/icecast.audio', icon: '🎸' },
  { id: 'metrofm', name: 'Metro FM', genre: 'Pop / Hit', url: 'https://listen.powerapp.com.tr/metrofm/mpeg/icecast.audio', icon: '🌆' },
  { id: 'joyfm', name: 'Joy FM', genre: 'Pop / Hit', url: 'https://listen.powerapp.com.tr/joyfm/mpeg/icecast.audio', icon: '😊' },
  { id: 'superfm', name: 'Süper FM', genre: 'Türkçe Pop', url: 'https://listen.powerapp.com.tr/superfm/mpeg/icecast.audio', icon: '🌟' },
  { id: 'bestfm', name: 'Best FM', genre: 'Türkçe Pop', url: 'https://listen.powerapp.com.tr/bestfm/mpeg/icecast.audio', icon: '🏆' },
  { id: 'joyturk', name: 'JoyTürk', genre: 'Türkçe Rock', url: 'https://listen.powerapp.com.tr/joyturk/mpeg/icecast.audio', icon: '🎧' },
];

const FAB_SIZE = 50;

export default function MiniRadioPlayer() {
  const [station, setStation] = useState(STATIONS[0]);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinRef = useRef<Animated.CompositeAnimation | null>(null);

  // ── Sürükleme (PanResponder) ──
  const pan = useRef(new Animated.ValueXY({ x: W - FAB_SIZE - 12, y: H - 250 })).current;
  const lastPos = useRef({ x: W - FAB_SIZE - 12, y: H - 250 });
  const isDragging = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3,
      onPanResponderGrant: () => {
        isDragging.current = false;
        pan.setOffset({ x: lastPos.current.x, y: lastPos.current.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5) isDragging.current = true;
        pan.setValue({ x: g.dx, y: g.dy });
      },
      onPanResponderRelease: (_, g) => {
        pan.flattenOffset();
        const newX = Math.max(0, Math.min(W - FAB_SIZE, lastPos.current.x + g.dx));
        const newY = Math.max(40, Math.min(H - FAB_SIZE - 60, lastPos.current.y + g.dy));
        lastPos.current = { x: newX, y: newY };
        Animated.spring(pan, { toValue: { x: newX, y: newY }, useNativeDriver: false, friction: 6 }).start();

        // Sürükleme değilse → tap olarak algıla
        if (!isDragging.current) {
          setPanelOpen(true);
        }
      },
    })
  ).current;

  // Plak dönme
  useEffect(() => {
    if (playing) {
      spinRef.current = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
      );
      spinRef.current.start();
    } else {
      spinRef.current?.stop();
    }
  }, [playing]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  useEffect(() => {
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  const playStation = useCallback(async (st: RadioStation) => {
    try {
      setLoading(true);
      if (soundRef.current) { await soundRef.current.unloadAsync(); soundRef.current = null; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: true });
      const { sound } = await Audio.Sound.createAsync({ uri: st.url }, { shouldPlay: true, volume: 0.5 });
      soundRef.current = sound;
      setStation(st);
      setPlaying(true);
      setLoading(false);
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('isLoaded' in status && !status.isLoaded) { setPlaying(false); setLoading(false); }
      });
    } catch (e) {
      console.log('[Radio] Error:', e);
      setLoading(false); setPlaying(false);
    }
  }, []);

  const togglePlay = useCallback(async () => {
    if (playing) { await soundRef.current?.pauseAsync(); setPlaying(false); }
    else if (soundRef.current) { await soundRef.current.playAsync(); setPlaying(true); }
    else { await playStation(station); }
  }, [playing, station, playStation]);

  const skipStation = useCallback(async (dir: 1 | -1) => {
    const idx = STATIONS.findIndex(s => s.id === station.id);
    const next = STATIONS[(idx + dir + STATIONS.length) % STATIONS.length];
    await playStation(next);
  }, [station, playStation]);

  return (
    <>
      {/* ── SÜRÜKLENEBİLİR FLOATING VINYL FAB ── */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[s.fab, { left: pan.x, top: pan.y }]}
      >
        <Animated.View style={[s.vinyl, { transform: [{ rotate: spin }] }]}>
          <View style={s.vinylShine} />
          <View style={s.groove1} />
          <View style={s.groove2} />
          <View style={s.groove3} />
          <View style={s.vinylCenter}>
            <Text style={s.vinylIcon}>{playing ? station.icon : '📻'}</Text>
          </View>
        </Animated.View>
        {playing && <View style={s.fabLive} />}
      </Animated.View>

      {/* ── PANEL MODAL ── */}
      <Modal visible={panelOpen} transparent animationType="slide" onRequestClose={() => setPanelOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setPanelOpen(false)}>
          <View style={s.panel} onStartShouldSetResponder={() => true}>
            <View style={s.drag} />

            {/* Üst — büyük plak + info */}
            <View style={s.playerSection}>
              <Animated.View style={[s.bigVinyl, { transform: [{ rotate: spin }] }]}>
                <View style={s.bShine} />
                <View style={s.bGroove1} />
                <View style={s.bGroove2} />
                <View style={s.bGroove3} />
                <View style={s.bGroove4} />
                <View style={s.bigCenter}>
                  <Text style={s.bigCenterIcon}>{station.icon}</Text>
                </View>
              </Animated.View>

              <View style={s.playerInfo}>
                <Text style={s.pStationName}>{station.name}</Text>
                <Text style={s.pStationGenre}>{station.genre}</Text>
                {playing && (
                  <View style={s.pLiveBadge}>
                    <View style={s.pLiveDot} />
                    <Text style={s.pLiveText}>CANLI</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Kontrol butonları */}
            <View style={s.controlRow}>
              <TouchableOpacity onPress={() => skipStation(-1)} style={s.ctrlBtn}>
                <Ionicons name="play-skip-back" size={18} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
              <TouchableOpacity onPress={togglePlay} style={[s.playBtn, playing && s.playBtnActive]}>
                {loading ? (
                  <Ionicons name="hourglass" size={20} color="#fff" />
                ) : (
                  <Ionicons name={playing ? 'pause' : 'play'} size={22} color="#fff" />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => skipStation(1)} style={s.ctrlBtn}>
                <Ionicons name="play-skip-forward" size={18} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>

            {/* Kanal listesi */}
            <Text style={s.sectionTitle}>Kanallar</Text>
            <ScrollView style={s.stationList}>
              {STATIONS.map(st => (
                <TouchableOpacity
                  key={st.id}
                  style={[s.stationItem, station.id === st.id && s.stationItemActive]}
                  onPress={() => playStation(st)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 16 }}>{st.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.stItemName, station.id === st.id && { color: '#818cf8' }]}>{st.name}</Text>
                    <Text style={s.stItemGenre}>{st.genre}</Text>
                  </View>
                  {station.id === st.id && playing && <View style={s.activeDot} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  /* ── FAB ── */
  fab: {
    position: 'absolute',
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2,
    zIndex: 50,
    shadowColor: '#818cf8', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 10,
  },
  vinyl: {
    width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2,
    backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  vinylShine: {
    position: 'absolute', top: -6, left: -6,
    width: FAB_SIZE * 0.55, height: FAB_SIZE * 0.55, borderRadius: FAB_SIZE * 0.3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    transform: [{ rotate: '-30deg' }],
  },
  groove1: {
    position: 'absolute',
    width: FAB_SIZE - 6, height: FAB_SIZE - 6, borderRadius: (FAB_SIZE - 6) / 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  groove2: {
    position: 'absolute',
    width: FAB_SIZE - 14, height: FAB_SIZE - 14, borderRadius: (FAB_SIZE - 14) / 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
  },
  groove3: {
    position: 'absolute',
    width: FAB_SIZE - 22, height: FAB_SIZE - 22, borderRadius: (FAB_SIZE - 22) / 2,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  vinylCenter: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#818cf8', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  vinylIcon: { fontSize: 8 },
  fabLive: {
    position: 'absolute', top: -1, right: -1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#0a0e27',
  },

  /* ── Overlay & Panel ── */
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  panel: {
    backgroundColor: 'rgba(15,20,35,0.98)',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '65%', paddingBottom: 30,
    borderTopWidth: 1, borderColor: 'rgba(139,92,246,0.15)',
  },
  drag: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'center', marginTop: 10, marginBottom: 12,
  },

  /* ── Player section ── */
  playerSection: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 20, marginBottom: 14,
  },
  bigVinyl: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#0d0d0d', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  bShine: {
    position: 'absolute', top: -8, left: -8,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    transform: [{ rotate: '-30deg' }],
  },
  bGroove1: {
    position: 'absolute', width: 70, height: 70, borderRadius: 35,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  bGroove2: {
    position: 'absolute', width: 58, height: 58, borderRadius: 29,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  bGroove3: {
    position: 'absolute', width: 46, height: 46, borderRadius: 23,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.05)',
  },
  bGroove4: {
    position: 'absolute', width: 36, height: 36, borderRadius: 18,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.04)',
  },
  bigCenter: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#818cf8', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  bigCenterIcon: { fontSize: 13 },

  playerInfo: { flex: 1 },
  pStationName: { fontSize: 16, fontWeight: '800', color: '#f1f5f9' },
  pStationGenre: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  pLiveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  pLiveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#22c55e' },
  pLiveText: { fontSize: 8, fontWeight: '900', color: '#22c55e', letterSpacing: 1 },

  /* ── Controls ── */
  controlRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 20, marginBottom: 16,
  },
  ctrlBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  playBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(99,102,241,0.3)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.4)',
  },
  playBtnActive: { backgroundColor: 'rgba(99,102,241,0.5)' },

  /* ── Stations ── */
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 20, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1,
  },
  stationList: { paddingHorizontal: 14, maxHeight: 220 },
  stationItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, marginBottom: 2,
  },
  stationItemActive: { backgroundColor: 'rgba(99,102,241,0.08)' },
  stItemName: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.65)' },
  stItemGenre: { fontSize: 9, color: 'rgba(255,255,255,0.25)' },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
});
