/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — GiftPanel
   Hediye gönderme bottom sheet — kategori, bakiye, grid
   ═══════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet,
  Pressable, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../../store';
import type { Participant } from '../../services/realtimeService';

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  animationType: string;
  category: string;
}

interface Props {
  visible: boolean;
  targetUser?: Participant | null;
  onClose: () => void;
  onOpenShop: () => void;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  basic: { label: 'Temel', color: '#22c55e' },
  premium: { label: 'Premium', color: '#a855f7' },
  legendary: { label: 'Efsanevi', color: '#f59e0b' },
};

export default function GiftPanel({ visible, targetUser, onClose, onOpenShop }: Props) {
  const { balance, points, giftList, fetchGiftList, sendGift, participants, user } = useStore();
  const [activeCategory, setActiveCategory] = useState('all');
  const [sending, setSending] = useState<string | null>(null);
  const [selectedReceiver, setSelectedReceiver] = useState<string | null>(targetUser?.userId || null);
  const [showUserPicker, setShowUserPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchGiftList();
      if (targetUser?.userId) setSelectedReceiver(targetUser.userId);
    }
  }, [visible, targetUser]);

  const filteredGifts = activeCategory === 'all'
    ? giftList
    : giftList.filter(g => g.category === activeCategory);

  const categories = ['all', ...Array.from(new Set(giftList.map(g => g.category)))];

  const handleSend = useCallback((giftId: string, price: number) => {
    if (balance < price || !selectedReceiver) return;
    setSending(giftId);
    sendGift(selectedReceiver, giftId, 1);
    setTimeout(() => setSending(null), 800);
  }, [balance, selectedReceiver, sendGift]);

  const receiverName = (() => {
    if (!selectedReceiver) return null;
    const p = participants.find(p => p.userId === selectedReceiver);
    return p?.displayName || 'Kullanıcı';
  })();

  // Kendini filtrele
  const selectableUsers = participants.filter(p => p.userId !== user?.id);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <View style={s.container} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={{ fontSize: 18 }}>🎁</Text>
              <View>
                <Text style={s.headerTitle}>Hediye Gönder</Text>
                {receiverName && (
                  <Text style={s.headerSub}>→ {receiverName}</Text>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={16} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          {/* Balance + Mağaza */}
          <View style={s.balanceRow}>
            <View style={s.balanceItem}>
              <Text style={{ fontSize: 12 }}>🪙</Text>
              <Text style={s.balanceVal}>{balance.toLocaleString()}</Text>
            </View>
            <View style={s.divider} />
            <View style={s.balanceItem}>
              <Text style={{ fontSize: 12 }}>⭐</Text>
              <Text style={[s.balanceVal, { color: '#a855f7' }]}>{points.toLocaleString()}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={s.shopBtn}
              onPress={() => { onClose(); onOpenShop(); }}
              activeOpacity={0.7}
            >
              <Text style={s.shopBtnText}>🏪 Mağaza</Text>
            </TouchableOpacity>
          </View>

          {/* Kullanıcı Seçimi */}
          {!targetUser && (
            <TouchableOpacity
              style={s.userSelectBtn}
              onPress={() => setShowUserPicker(!showUserPicker)}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={14} color="#818cf8" />
              <Text style={s.userSelectText}>
                {receiverName || 'Alıcı seç...'}
              </Text>
              <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          )}

          {/* Kullanıcı Picker */}
          {showUserPicker && (
            <ScrollView style={s.userList} horizontal={false} nestedScrollEnabled>
              {selectableUsers.map(p => (
                <TouchableOpacity
                  key={p.userId}
                  style={[s.userItem, selectedReceiver === p.userId && s.userItemActive]}
                  onPress={() => { setSelectedReceiver(p.userId); setShowUserPicker(false); }}
                >
                  <Text style={s.userItemName}>{p.displayName}</Text>
                  {selectedReceiver === p.userId && (
                    <Ionicons name="checkmark" size={14} color="#818cf8" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Kategori Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catBar}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[s.catBtn, activeCategory === cat && s.catBtnActive]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[s.catLabel, activeCategory === cat && s.catLabelActive]}>
                  {cat === 'all' ? 'Tümü' : CATEGORY_LABELS[cat]?.label || cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Gift Grid */}
          <ScrollView style={s.gridScroll} nestedScrollEnabled>
            <View style={s.grid}>
              {filteredGifts.length === 0 ? (
                <View style={s.emptyState}>
                  <ActivityIndicator color="#818cf8" />
                  <Text style={s.emptyText}>Yükleniyor...</Text>
                </View>
              ) : (
                filteredGifts.map(gift => {
                  const canAfford = balance >= gift.price;
                  const isSending = sending === gift.id;
                  const catColor = CATEGORY_LABELS[gift.category]?.color || '#6b7280';

                  return (
                    <TouchableOpacity
                      key={gift.id}
                      style={[
                        s.giftCard,
                        !canAfford && s.giftCardDisabled,
                        isSending && s.giftCardSending,
                      ]}
                      onPress={() => canAfford && selectedReceiver && handleSend(gift.id, gift.price)}
                      disabled={!canAfford || !selectedReceiver || !!sending}
                      activeOpacity={0.7}
                    >
                      <Text style={s.giftEmoji}>{gift.emoji}</Text>
                      <Text style={s.giftName} numberOfLines={1}>{gift.name}</Text>
                      <View style={s.giftPrice}>
                        <Text style={{ fontSize: 8 }}>🪙</Text>
                        <Text style={[s.giftPriceText, { color: catColor }]}>{gift.price}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Yetersiz bakiye */}
            {balance <= 0 && giftList.length > 0 && (
              <View style={s.warningBox}>
                <Text style={{ fontSize: 12 }}>⚠️</Text>
                <Text style={s.warningText}>Jeton bakiyeniz yetersiz.</Text>
              </View>
            )}

            {/* Alıcı seçilmedi */}
            {!selectedReceiver && giftList.length > 0 && (
              <View style={s.warningBox}>
                <Text style={{ fontSize: 12 }}>👤</Text>
                <Text style={s.warningText}>Lütfen önce alıcı seçin.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  container: {
    backgroundColor: 'rgba(15,20,35,0.98)',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '70%', paddingBottom: 30,
    borderTopWidth: 1, borderColor: 'rgba(123,159,239,0.1)',
  },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },

  balanceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 14, marginTop: 10, marginBottom: 6,
    padding: 8, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  balanceItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceVal: { fontSize: 13, fontWeight: '700', color: '#fbbf24' },
  divider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.08)' },
  shopBtn: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 0.5, borderColor: 'rgba(99,102,241,0.25)',
  },
  shopBtnText: { fontSize: 10, fontWeight: '700', color: '#818cf8' },

  userSelectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 14, marginBottom: 6,
    padding: 8, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  userSelectText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },

  userList: { maxHeight: 120, marginHorizontal: 14, marginBottom: 6 },
  userItem: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  userItemActive: { backgroundColor: 'rgba(99,102,241,0.1)' },
  userItemName: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  catBar: { paddingHorizontal: 12, marginBottom: 6, maxHeight: 36 },
  catBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, marginRight: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  catBtnActive: { backgroundColor: 'rgba(99,102,241,0.2)' },
  catLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)' },
  catLabelActive: { color: '#818cf8' },

  gridScroll: { flex: 1 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 10, gap: 8,
  },
  giftCard: {
    width: '22%', alignItems: 'center', gap: 3,
    paddingVertical: 10, paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  giftCardDisabled: { opacity: 0.35 },
  giftCardSending: { backgroundColor: 'rgba(99,102,241,0.12)', transform: [{ scale: 0.95 }] },
  giftEmoji: { fontSize: 24 },
  giftName: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  giftPrice: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  giftPriceText: { fontSize: 9, fontWeight: '700' },

  emptyState: { width: '100%', alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },

  warningBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 4, marginTop: 10, padding: 8, borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.06)',
    borderWidth: 0.5, borderColor: 'rgba(245,158,11,0.15)',
  },
  warningText: { fontSize: 10, color: '#92400e', fontWeight: '600' },
});
