/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — MicQueuePanel
   Mikrofon sırası paneli — kuyruk listesi, mik iste/bırak
   ═══════════════════════════════════════════════════════════ */

import React from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getRoleIcon, getRoleColor, getRoleLevel } from '../../utils/roleHelpers';
import useStore from '../../store';

export default function MicQueuePanel() {
  const { micQueue, participants, user, activeSpeaker, requestMic, leaveQueue, takeMic, releaseMic } = useStore();

  const myId = user?.id;
  const myRole = user?.role || 'guest';
  const myLevel = getRoleLevel(myRole);
  const isInQueue = micQueue.includes(myId || '');
  const isSpeaking = activeSpeaker?.userId === myId;

  // Kuyruk kullanıcılarını resolve et
  const queueUsers = micQueue
    .map(userId => participants.find(p => p.userId === userId))
    .filter(Boolean)
    .map((p, i) => ({
      ...p!,
      queueIndex: i + 1,
    }));

  // Aktif konuşmacı bilgisi
  const speaker = activeSpeaker
    ? participants.find(p => p.userId === activeSpeaker.userId)
    : null;

  return (
    <View style={st.container}>
      {/* ── Aktif Konuşmacı ── */}
      <View style={st.speakerSection}>
        <View style={st.sectionHead}>
          <View style={st.micLive}>
            <View style={st.micLiveDot} />
            <Text style={st.micLiveText}>CANLI</Text>
          </View>
          <Text style={st.sectionTitle}>Aktif Konuşmacı</Text>
        </View>

        {speaker ? (
          <View style={st.speakerCard}>
            <View style={st.speakerAvWrap}>
              <Image source={{ uri: speaker.avatar || '/avatars/neutral_1.png' }} style={st.speakerAv} />
              <View style={st.speakerGlow} />
            </View>
            <View style={st.speakerInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {getRoleIcon(speaker.role) ? <Text style={{ fontSize: 12 }}>{getRoleIcon(speaker.role)}</Text> : null}
                <Text style={st.speakerName}>{speaker.displayName}</Text>
              </View>
              <Text style={{ fontSize: 10, color: '#22c55e', fontWeight: '600' }}>Konuşuyor...</Text>
            </View>
            <View style={st.speakerWave}>
              {[0, 1, 2, 3, 4].map(i => (
                <View key={i} style={[st.waveBar, { height: 8 + Math.random() * 16 }]} />
              ))}
            </View>
          </View>
        ) : (
          <View style={st.noSpeaker}>
            <Ionicons name="mic-outline" size={24} color="rgba(255,255,255,0.15)" />
            <Text style={st.noSpeakerText}>Mikrofon boş</Text>
          </View>
        )}
      </View>

      {/* ── Mikrofon Sırası ── */}
      <View style={st.queueSection}>
        <View style={st.sectionHead}>
          <Ionicons name="list" size={14} color="rgba(255,255,255,0.4)" />
          <Text style={st.sectionTitle}>Mikrofon Sırası</Text>
          {queueUsers.length > 0 && (
            <View style={st.countBadge}>
              <Text style={st.countText}>{queueUsers.length}</Text>
            </View>
          )}
        </View>

        {queueUsers.length > 0 ? (
          <FlatList
            data={queueUsers}
            keyExtractor={(item) => item.userId}
            renderItem={({ item, index }) => (
              <View style={[st.queueRow, index === 0 && st.queueRowFirst]}>
                <View style={[st.queueNum, index === 0 && st.queueNumFirst]}>
                  <Text style={[st.queueNumText, index === 0 && { color: '#fbbf24' }]}>
                    {item.queueIndex}
                  </Text>
                </View>
                <Image source={{ uri: item.avatar || '/avatars/neutral_1.png' }} style={st.queueAv} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {getRoleIcon(item.role) ? <Text style={{ fontSize: 10 }}>{getRoleIcon(item.role)}</Text> : null}
                    <Text style={[st.queueName, { color: getRoleColor(item.role) }]} numberOfLines={1}>
                      {item.displayName}
                    </Text>
                  </View>
                </View>
                {index === 0 && (
                  <View style={st.nextBadge}>
                    <Text style={st.nextText}>Sıradaki</Text>
                  </View>
                )}
                {/* Yetkili ise mikrofon ver butonu */}
                {myLevel >= 3 && (
                  <TouchableOpacity
                    style={st.giveMicBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                      // Mikrofonu bu kullanıcıya ver (take-mic emiti)
                      useStore.getState().emitModAction('take-mic', item.userId);
                    }}
                  >
                    <Ionicons name="mic" size={12} color="#22c55e" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            style={{ maxHeight: 200 }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={st.emptyQueue}>
            <Text style={st.emptyQueueText}>Sırada kimse yok</Text>
          </View>
        )}
      </View>

      {/* ── Aksiyon Butonu ── */}
      <View style={st.actionSection}>
        {isSpeaking ? (
          <TouchableOpacity onPress={releaseMic} activeOpacity={0.8}>
            <LinearGradient colors={['#ef4444', '#dc2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.actionBtn}>
              <Ionicons name="mic-off" size={20} color="#fff" />
              <Text style={st.actionText}>Mikrofonu Bırak</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : isInQueue ? (
          <TouchableOpacity onPress={leaveQueue} activeOpacity={0.8}>
            <View style={[st.actionBtn, st.actionBtnOutline]}>
              <Ionicons name="close-circle" size={20} color="#f97316" />
              <Text style={[st.actionText, { color: '#f97316' }]}>Sıradan Çık</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={requestMic} activeOpacity={0.8}>
            <LinearGradient colors={['#6366f1', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.actionBtn}>
              <Ionicons name="hand-left" size={20} color="#fff" />
              <Text style={st.actionText}>Mikrofon İste</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* ═══ STİLLER ═══ */
const st = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  /* ── Speaker ── */
  speakerSection: { marginBottom: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.4)' },
  micLive: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  micLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  micLiveText: { fontSize: 9, fontWeight: '800', color: '#ef4444', letterSpacing: 1 },

  speakerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderRadius: 14, padding: 12,
    borderWidth: 0.5, borderColor: 'rgba(34,197,94,0.15)',
  },
  speakerAvWrap: { position: 'relative' },
  speakerAv: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#22c55e' },
  speakerGlow: {
    position: 'absolute', width: 52, height: 52, borderRadius: 26,
    left: -4, top: -4,
    backgroundColor: 'transparent', borderWidth: 2, borderColor: 'rgba(34,197,94,0.2)',
  },
  speakerInfo: { flex: 1, gap: 2 },
  speakerName: { fontSize: 14, fontWeight: '700', color: '#f1f5f9' },
  speakerWave: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 24,
  },
  waveBar: {
    width: 3, borderRadius: 2, backgroundColor: 'rgba(34,197,94,0.5)',
  },

  noSpeaker: {
    alignItems: 'center', paddingVertical: 20, gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12,
  },
  noSpeakerText: { fontSize: 12, color: 'rgba(255,255,255,0.2)', fontWeight: '600' },

  /* ── Queue ── */
  queueSection: { flex: 1 },
  countBadge: {
    backgroundColor: 'rgba(99,102,241,0.15)', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6,
  },
  countText: { fontSize: 10, fontWeight: '700', color: '#818cf8' },

  queueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  queueRowFirst: {
    backgroundColor: 'rgba(251,191,36,0.05)',
    borderRadius: 10, paddingHorizontal: 8, marginBottom: 4,
    borderBottomWidth: 0, borderWidth: 0.5, borderColor: 'rgba(251,191,36,0.15)',
  },
  queueNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  queueNumFirst: { backgroundColor: 'rgba(251,191,36,0.15)' },
  queueNumText: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.4)' },
  queueAv: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#1e293b' },
  queueName: { fontSize: 13, fontWeight: '600' },
  nextBadge: {
    backgroundColor: 'rgba(251,191,36,0.15)', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 6, borderWidth: 0.5, borderColor: 'rgba(251,191,36,0.25)',
  },
  nextText: { fontSize: 9, fontWeight: '700', color: '#fbbf24' },
  giveMicBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderWidth: 0.5, borderColor: 'rgba(34,197,94,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },

  emptyQueue: { alignItems: 'center', paddingVertical: 20 },
  emptyQueueText: { fontSize: 12, color: 'rgba(255,255,255,0.2)', fontWeight: '600' },

  /* ── Action ── */
  actionSection: { paddingVertical: 12 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
  },
  actionBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5, borderColor: 'rgba(249,115,22,0.3)',
  },
  actionText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
