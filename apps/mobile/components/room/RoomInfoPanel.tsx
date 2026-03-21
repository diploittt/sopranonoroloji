import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RoomInfoProps {
  visible: boolean;
  onClose: () => void;
  roomName?: string;
  roomDescription?: string;
  participantCount?: number;
  createdAt?: string;
  rules?: string[];
  theme?: { primaryColor?: string };
}

export default function RoomInfoPanel({
  visible, onClose, roomName, roomDescription,
  participantCount, createdAt, rules, theme,
}: RoomInfoProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Handle */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>{roomName || 'Oda Bilgisi'}</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {/* Açıklama */}
            {roomDescription ? (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Ionicons name="information-circle-outline" size={16} color="#00ff88" />
                  <Text style={s.sectionTitle}>Açıklama</Text>
                </View>
                <Text style={s.descText}>{roomDescription}</Text>
              </View>
            ) : null}

            {/* İstatistikler */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Ionicons name="stats-chart-outline" size={16} color="#4a9eff" />
                <Text style={s.sectionTitle}>İstatistikler</Text>
              </View>
              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Text style={s.statValue}>{participantCount || 0}</Text>
                  <Text style={s.statLabel}>Katılımcı</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statValue}>∞</Text>
                  <Text style={s.statLabel}>Süre</Text>
                </View>
              </View>
            </View>

            {/* Oda Kuralları */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#ffb800" />
                <Text style={s.sectionTitle}>Oda Kuralları</Text>
              </View>
              {(rules && rules.length > 0) ? (
                rules.map((rule, i) => (
                  <View key={i} style={s.ruleItem}>
                    <Text style={s.ruleNum}>{i + 1}</Text>
                    <Text style={s.ruleText}>{rule}</Text>
                  </View>
                ))
              ) : (
                <View style={s.defaultRules}>
                  {['Saygılı olun', 'Küfür ve hakaret yasaktır', 'Spam yapmayın', 'Moderatör kararlarına uyun'].map((r, i) => (
                    <View key={i} style={s.ruleItem}>
                      <Text style={s.ruleNum}>{i + 1}</Text>
                      <Text style={s.ruleText}>{r}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0d1133',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '70%', minHeight: 300,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderBottomWidth: 0,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginTop: 10, marginBottom: 14,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },

  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  descText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 20 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.08)' },

  ruleItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8,
  },
  ruleNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,184,0,0.1)',
    textAlign: 'center', lineHeight: 22, fontSize: 11, fontWeight: '800', color: '#ffb800',
    overflow: 'hidden',
  },
  ruleText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 20 },
  defaultRules: {},
});
