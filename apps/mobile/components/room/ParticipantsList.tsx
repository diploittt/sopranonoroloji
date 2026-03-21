/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — ParticipantsList
   Katılımcı listesi — rol sıralı, mic durumu, tap → profil
   ═══════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, Image, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getRoleIcon, getRoleColor, getRoleLabel, sortUsersByRole } from '../../utils/roleHelpers';
import useStore from '../../store';
import type { Participant } from '../../services/realtimeService';
import UserProfileModal from './UserProfileModal';

/* ── Tek Katılımcı Satırı ── */
function ParticipantRow({
  participant,
  isActiveSpeaker,
  onPress,
}: {
  participant: Participant;
  isActiveSpeaker: boolean;
  onPress: () => void;
}) {
  const roleColor = getRoleColor(participant.role);
  const roleIcon = getRoleIcon(participant.role);
  const avatarUri = participant.avatar?.startsWith('http') ? participant.avatar : 'https://sopranochat.com/avatars/neutral_1.png';

  return (
    <TouchableOpacity style={st.row} onPress={onPress} activeOpacity={0.7} onLongPress={onPress}>
      {/* Avatar */}
      <View style={[st.avatarWrap, isActiveSpeaker && { borderColor: '#38bdf8', shadowColor: '#38bdf8', shadowOpacity: 0.5, shadowRadius: 8, elevation: 3 }]}>
        <Image source={{ uri: avatarUri }} style={st.avatar} />

        {/* Mute badge */}
        {participant.isMuted && (
          <View style={st.muteBadge}>
            <Ionicons name="mic-off" size={8} color="#ef4444" />
          </View>
        )}

        {/* Konuşuyor indicator */}
        {isActiveSpeaker && (
          <View style={st.speakingBadge}>
            <Ionicons name="volume-high" size={8} color="#22c55e" />
          </View>
        )}
      </View>

      {/* İsim + Rol */}
      <View style={st.info}>
        <View style={st.nameRow}>
          {roleIcon ? <Text style={{ fontSize: 12 }}>{roleIcon}</Text> : null}
          <Text
            style={[st.name, { color: participant.nameColor || roleColor }]}
            numberOfLines={1}
          >
            {participant.displayName}
          </Text>
        </View>
        <Text style={[st.roleLabel, { color: roleColor }]}>{getRoleLabel(participant.role)}</Text>
      </View>

      {/* Sağ taraf — platform + durum */}
      <View style={st.rightSection}>
        {participant.isGagged && (
          <View style={st.statusIcon}>
            <Ionicons name="chatbubble-outline" size={12} color="#f97316" />
          </View>
        )}
        {participant.platform && (
          <Ionicons
            name={participant.platform === 'mobile' ? 'phone-portrait-outline' : 'desktop-outline'}
            size={12}
            color="rgba(255,255,255,0.2)"
          />
        )}
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.15)" />
      </View>
    </TouchableOpacity>
  );
}

/* ── Ana ParticipantsList ── */
export default function ParticipantsList() {
  const { participants, activeSpeaker } = useStore();
  const [selectedUser, setSelectedUser] = useState<Participant | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Rol hiyerarşisine göre sırala
  const sorted = sortUsersByRole(participants);

  const openProfile = (p: Participant) => {
    setSelectedUser(p);
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: Participant }) => {
    const isActive = activeSpeaker?.userId === item.userId;
    return <ParticipantRow participant={item} isActiveSpeaker={isActive} onPress={() => openProfile(item)} />;
  };

  // Rol gruplarını ayır
  const roleGroups = sorted.reduce<Record<string, Participant[]>>((acc, p) => {
    const label = getRoleLabel(p.role);
    if (!acc[label]) acc[label] = [];
    acc[label].push(p);
    return acc;
  }, {});

  return (
    <View style={st.container}>
      {/* Toplam sayı */}
      <View style={st.header}>
        <Ionicons name="people" size={14} color="rgba(255,255,255,0.4)" />
        <Text style={st.headerText}>{participants.length} katılımcı</Text>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.userId || item.socketId}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={st.empty}>
            <Ionicons name="people-outline" size={36} color="rgba(255,255,255,0.12)" />
            <Text style={st.emptyText}>Henüz katılımcı yok</Text>
          </View>
        }
      />

      {/* Profil Modal */}
      <UserProfileModal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setSelectedUser(null); }}
        participant={selectedUser}
      />
    </View>
  );
}

/* ═══ STİLLER ═══ */
const st = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },

  /* ── Row ── */
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  avatarWrap: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#1e293b',
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  muteBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  speakingBadge: {
    position: 'absolute', top: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(34,197,94,0.2)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },

  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { fontSize: 14, fontWeight: '700' },
  roleLabel: { fontSize: 10, fontWeight: '600' },

  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusIcon: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(249,115,22,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.2)' },
});
