/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — UserProfileModal
   Kullanıcı profilini ve moderation aksiyonlarını gösterir
   ═══════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, Image, ScrollView,
  StyleSheet, Dimensions, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getRoleIcon, getRoleColor, getRoleLabel, getRoleLevel, canPerformAction } from '../../utils/roleHelpers';
import useStore from '../../store';
import type { Participant } from '../../services/realtimeService';

const { width } = Dimensions.get('window');

/* ── Moderation Aksiyonları ── */
interface ModAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  danger?: boolean;
  confirm?: boolean;
  confirmMsg?: string;
  submenu?: ModAction[];
}

const MOD_ACTIONS: ModAction[] = [
  { id: 'mute', label: 'Sustur', icon: 'mic-off', color: '#f59e0b' },
  { id: 'kick', label: 'At', icon: 'exit-outline', color: '#ef4444', confirm: true, confirmMsg: 'Bu kullanıcıyı odadan atmak istediğinize emin misiniz?' },
  {
    id: 'ban', label: 'Yasakla', icon: 'ban', color: '#dc2626', submenu: [
      { id: 'ban-1day', label: '1 Gün', icon: 'time-outline', color: '#ef4444', confirm: true, confirmMsg: '1 günlük yasak uygulanacak.' },
      { id: 'ban-1week', label: '1 Hafta', icon: 'calendar-outline', color: '#dc2626', confirm: true, confirmMsg: '1 haftalık yasak uygulanacak.' },
      { id: 'ban-1month', label: '1 Ay', icon: 'calendar', color: '#991b1b', confirm: true, confirmMsg: '1 aylık yasak uygulanacak.' },
    ],
  },
  {
    id: 'setRole', label: 'Rol Değiştir', icon: 'shield-checkmark', color: '#6366f1', submenu: [
      { id: 'role-guest', label: 'Misafir', icon: 'person-outline', color: '#94a3b8' },
      { id: 'role-member', label: 'Üye', icon: 'person', color: '#64748b' },
      { id: 'role-vip', label: 'VIP', icon: 'diamond', color: '#ca8a04' },
      { id: 'role-operator', label: 'Operatör', icon: 'game-controller', color: '#0891b2' },
      { id: 'role-moderator', label: 'Moderatör', icon: 'construct', color: '#059669' },
      { id: 'role-admin', label: 'Admin', icon: 'shield', color: '#3b82f6' },
    ],
  },
  { id: 'gag', label: 'Yazma Yasağı', icon: 'chatbubble-outline', color: '#f97316' },
  { id: 'cam-block', label: 'Kamera Engelle', icon: 'videocam-off', color: '#a855f7' },
];

/* ── Props ── */
interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
  participant: Participant | null;
}

export default function UserProfileModal({ visible, onClose, participant }: UserProfileModalProps) {
  const { user, emitModAction } = useStore();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  if (!participant) return null;

  const isSelf = user?.id === participant.userId;
  const myRole = user?.role || 'guest';
  const targetRole = participant.role || 'guest';
  const myLevel = getRoleLevel(myRole);
  const targetLevel = getRoleLevel(targetRole);

  /* Aksiyonu gerçekleştir */
  const handleAction = (actionId: string) => {
    const action = MOD_ACTIONS.flatMap(a => a.submenu ? a.submenu : [a]).find(a => a.id === actionId);

    const execute = () => {
      // Role change
      if (actionId.startsWith('role-')) {
        const newRole = actionId.replace('role-', '');
        emitModAction('setRole', participant.userId, { role: newRole });
      }
      // Ban variants
      else if (actionId === 'ban-1day') {
        emitModAction('ban', participant.userId, { duration: '1d' });
      } else if (actionId === 'ban-1week') {
        emitModAction('ban', participant.userId, { duration: '1w' });
      } else if (actionId === 'ban-1month') {
        emitModAction('ban', participant.userId, { duration: '1m' });
      }
      // Simple actions
      else {
        emitModAction(actionId, participant.userId);
      }
      setOpenSubmenu(null);
      onClose();
    };

    if (action?.confirm) {
      Alert.alert('Onay', action.confirmMsg || 'Emin misiniz?', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Evet', style: 'destructive', onPress: execute },
      ]);
    } else {
      execute();
    }
  };

  /* Filtrelenmiş aksiyonlar */
  const availableActions = isSelf ? [] : MOD_ACTIONS.filter(action => {
    // Basit aksiyon — canPerformAction ile kontrol
    if (!action.submenu) {
      return canPerformAction(action.id, myRole, targetRole, isSelf);
    }
    // Submenu — en az bir alt aksiyon kullanılabilir mi?
    return action.submenu.some(sub => {
      if (sub.id.startsWith('role-')) {
        return myLevel > targetLevel && getRoleLevel(myRole) >= 5; // admin+
      }
      return canPerformAction(sub.id, myRole, targetRole, isSelf);
    });
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={st.overlay} activeOpacity={1} onPress={() => { setOpenSubmenu(null); onClose(); }}>
        <TouchableOpacity style={st.sheet} activeOpacity={1} onPress={() => setOpenSubmenu(null)}>
          {/* Handle bar */}
          <View style={st.handleBar} />

          {/* Profil Başlığı */}
          <View style={st.profileSection}>
            {/* Avatar */}
            <View style={[st.avatarWrap, { borderColor: getRoleColor(targetRole) + '60' }]}>
              <Image
                source={{ uri: participant.avatar?.startsWith('http') ? participant.avatar : 'https://sopranochat.com/avatars/neutral_1.png' }}
                style={st.avatar}
              />
              {/* Online dot */}
              <View style={st.onlineDot} />
            </View>

            {/* İsim + Rol */}
            <View style={st.nameSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {getRoleIcon(targetRole) ? <Text style={{ fontSize: 16 }}>{getRoleIcon(targetRole)}</Text> : null}
                <Text style={[st.userName, { color: participant.nameColor || '#f1f5f9' }]}>
                  {participant.displayName}
                </Text>
              </View>
              <View style={[st.roleBadge, { backgroundColor: getRoleColor(targetRole) + '18', borderColor: getRoleColor(targetRole) + '40' }]}>
                <Text style={[st.roleText, { color: getRoleColor(targetRole) }]}>
                  {getRoleLabel(targetRole)}
                </Text>
              </View>
            </View>

            {/* Durum bilgileri */}
            <View style={st.statusRow}>
              {participant.isMuted && (
                <View style={[st.statusChip, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.25)' }]}>
                  <Ionicons name="mic-off" size={11} color="#ef4444" />
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#ef4444' }}>Susturulmuş</Text>
                </View>
              )}
              {participant.isGagged && (
                <View style={[st.statusChip, { backgroundColor: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.25)' }]}>
                  <Ionicons name="chatbubble-outline" size={11} color="#f97316" />
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#f97316' }}>Yazma Yasağı</Text>
                </View>
              )}
              {participant.platform && (
                <View style={[st.statusChip, { backgroundColor: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.25)' }]}>
                  <Ionicons name={participant.platform === 'mobile' ? 'phone-portrait' : 'desktop'} size={11} color="#6366f1" />
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#6366f1' }}>{participant.platform === 'mobile' ? 'Mobil' : 'Web'}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Ayırıcı */}
          {availableActions.length > 0 && <View style={st.divider} />}

          {/* Moderation Aksiyonları */}
          {availableActions.length > 0 && (
            <ScrollView style={st.actionsScroll} showsVerticalScrollIndicator={false}>
              <Text style={st.sectionLabel}>Moderasyon</Text>
              {availableActions.map(action => (
                <View key={action.id}>
                  <TouchableOpacity
                    style={st.actionBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (action.submenu) {
                        setOpenSubmenu(openSubmenu === action.id ? null : action.id);
                      } else {
                        handleAction(action.id);
                      }
                    }}
                  >
                    <View style={[st.actionIconWrap, { backgroundColor: action.color + '15' }]}>
                      <Ionicons name={action.icon as any} size={16} color={action.color} />
                    </View>
                    <Text style={[st.actionLabel, action.danger && { color: action.color }]}>{action.label}</Text>
                    {action.submenu && (
                      <Ionicons
                        name={openSubmenu === action.id ? 'chevron-up' : 'chevron-down'}
                        size={14} color="rgba(71,85,105,0.3)"
                      />
                    )}
                  </TouchableOpacity>

                  {/* Alt menü */}
                  {action.submenu && openSubmenu === action.id && (
                    <View style={st.submenu}>
                      {action.submenu
                        .filter(sub => {
                          if (sub.id.startsWith('role-')) return myLevel > targetLevel;
                          return canPerformAction(sub.id, myRole, targetRole, isSelf);
                        })
                        .map(sub => (
                          <TouchableOpacity key={sub.id} style={st.subBtn} activeOpacity={0.7} onPress={() => handleAction(sub.id)}>
                            <Ionicons name={sub.icon as any} size={13} color={sub.color} />
                            <Text style={[st.subLabel, { color: sub.color }]}>{sub.label}</Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          {/* Kapat butonu */}
          <TouchableOpacity style={st.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={st.closeBtnText}>Kapat</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

/* ═══ STİLLER ═══ */
const st = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30,
    maxHeight: '75%',
    borderTopWidth: 1, borderColor: 'rgba(148,163,184,0.15)',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 10,
  },
  handleBar: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(148,163,184,0.2)',
    alignSelf: 'center', marginBottom: 16,
  },
  profileSection: { alignItems: 'center', paddingBottom: 16 },
  avatarWrap: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, backgroundColor: '#f8fafc',
    alignItems: 'center', justifyContent: 'center',
  },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#22c55e', borderWidth: 2.5, borderColor: '#fff',
  },
  nameSection: { alignItems: 'center', marginTop: 10, gap: 6 },
  userName: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  roleBadge: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 0.5,
  },
  divider: {
    height: 1, backgroundColor: 'rgba(148,163,184,0.12)',
    marginVertical: 8,
  },
  actionsScroll: { maxHeight: 280 },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: 'rgba(71,85,105,0.6)',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 8, marginLeft: 4,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, paddingHorizontal: 8,
    borderRadius: 10,
  },
  actionIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#334155' },
  submenu: {
    marginLeft: 44, marginBottom: 4,
    backgroundColor: 'rgba(99,102,241,0.04)',
    borderRadius: 10, paddingVertical: 4, paddingHorizontal: 8,
    borderWidth: 0.5, borderColor: 'rgba(99,102,241,0.1)',
  },
  subBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, paddingHorizontal: 6,
  },
  subLabel: { fontSize: 13, fontWeight: '600' },
  closeBtn: {
    marginTop: 12, alignItems: 'center',
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderWidth: 0.5, borderColor: 'rgba(148,163,184,0.12)',
  },
  closeBtnText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
});
