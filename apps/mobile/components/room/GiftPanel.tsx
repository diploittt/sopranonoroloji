/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — GiftPanel (Koyu Tema)
   Hediye gönderme bottom sheet — kategori, bakiye, grid
   ═══════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet,
  Pressable, ActivityIndicator, Image, Dimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useStore from '../../store';
import type { Participant } from '../../services/realtimeService';

const { width } = Dimensions.get('window');

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

const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  basic: { label: 'Temel', icon: '🎈', color: '#22c55e' },
  premium: { label: 'Premium', icon: '💎', color: '#a855f7' },
  legendary: { label: 'Efsanevi', icon: '👑', color: '#f59e0b' },
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

  // Backend'den hediye gelmediyse fallback kullan
  const FALLBACK_GIFTS: GiftItem[] = [
    // ── Temel Hediyeler ──
    { id: 'rose', name: 'Gül', emoji: '🌹', price: 5, animationType: 'float', category: 'basic' },
    { id: 'coffee', name: 'Kahve', emoji: '☕', price: 5, animationType: 'float', category: 'basic' },
    { id: 'heart', name: 'Kalp', emoji: '❤️', price: 10, animationType: 'pulse', category: 'basic' },
    { id: 'kiss', name: 'Öpücük', emoji: '💋', price: 10, animationType: 'float', category: 'basic' },
    { id: 'sunflower', name: 'Ay Çiçeği', emoji: '🌻', price: 15, animationType: 'float', category: 'basic' },
    { id: 'bear', name: 'Ayıcık', emoji: '🧸', price: 15, animationType: 'float', category: 'basic' },
    { id: 'candy', name: 'Şeker', emoji: '🍬', price: 18, animationType: 'spin', category: 'basic' },
    { id: 'icecream', name: 'Dondurma', emoji: '🍦', price: 20, animationType: 'float', category: 'basic' },
    { id: 'cake', name: 'Pasta', emoji: '🎂', price: 25, animationType: 'float', category: 'basic' },
    { id: 'balloon', name: 'Balon', emoji: '🎈', price: 25, animationType: 'fly', category: 'basic' },
    { id: 'rainbow', name: 'Gökkuşağı', emoji: '🌈', price: 30, animationType: 'glow', category: 'basic' },
    { id: 'perfume', name: 'Parfüm', emoji: '🧴', price: 35, animationType: 'float', category: 'basic' },

    // ── Premium Hediyeler ──
    { id: 'diamond', name: 'Elmas', emoji: '💎', price: 50, animationType: 'spin', category: 'premium' },
    { id: 'guitar', name: 'Gitar', emoji: '🎸', price: 60, animationType: 'pulse', category: 'premium' },
    { id: 'music', name: 'Müzik Notu', emoji: '🎵', price: 65, animationType: 'float', category: 'premium' },
    { id: 'bouquet', name: 'Buket', emoji: '💐', price: 75, animationType: 'glow', category: 'premium' },
    { id: 'fire', name: 'Ateş', emoji: '🔥', price: 80, animationType: 'pulse', category: 'premium' },
    { id: 'champagne', name: 'Şampanya', emoji: '🍾', price: 90, animationType: 'fly', category: 'premium' },
    { id: 'ring', name: 'Yüzük', emoji: '💍', price: 100, animationType: 'spin', category: 'premium' },
    { id: 'mic', name: 'Mikrofon', emoji: '🎤', price: 100, animationType: 'pulse', category: 'premium' },
    { id: 'crown', name: 'Taç', emoji: '👑', price: 120, animationType: 'glow', category: 'premium' },
    { id: 'sports_car', name: 'Spor Araba', emoji: '🏎️', price: 150, animationType: 'fly', category: 'premium' },
    { id: 'airplane', name: 'Uçak', emoji: '✈️', price: 180, animationType: 'fly', category: 'premium' },
    { id: 'trophy', name: 'Kupa', emoji: '🏆', price: 200, animationType: 'glow', category: 'premium' },

    // ── Efsanevi Hediyeler ──
    { id: 'rocket', name: 'Roket', emoji: '🚀', price: 300, animationType: 'fly', category: 'legendary' },
    { id: 'unicorn', name: 'Unicorn', emoji: '🦄', price: 400, animationType: 'fly', category: 'legendary' },
    { id: 'dragon', name: 'Ejderha', emoji: '🐉', price: 500, animationType: 'pulse', category: 'legendary' },
    { id: 'castle', name: 'Kale', emoji: '🏰', price: 600, animationType: 'glow', category: 'legendary' },
    { id: 'shooting_star', name: 'Kayan Yıldız', emoji: '🌠', price: 750, animationType: 'fly', category: 'legendary' },
    { id: 'galaxy', name: 'Galaksi', emoji: '🌌', price: 800, animationType: 'spin', category: 'legendary' },
    { id: 'fireworks', name: 'Havai Fişek', emoji: '🎆', price: 900, animationType: 'pulse', category: 'legendary' },
    { id: 'yacht', name: 'Yat', emoji: '🛥️', price: 1000, animationType: 'fly', category: 'legendary' },
    { id: 'island', name: 'Ada', emoji: '🏝️', price: 1500, animationType: 'glow', category: 'legendary' },
    { id: 'planet', name: 'Gezegen', emoji: '🪐', price: 2000, animationType: 'spin', category: 'legendary' },
    { id: 'aurora', name: 'Kuzey Işığı', emoji: '🌊', price: 3000, animationType: 'glow', category: 'legendary' },
    { id: 'infinity', name: 'Sonsuzluk', emoji: '♾️', price: 5000, animationType: 'spin', category: 'legendary' },
  ];

  // Her zaman zengin fallback listesini kullan
  const effectiveGifts = FALLBACK_GIFTS;

  const filteredGifts = activeCategory === 'all'
    ? effectiveGifts
    : effectiveGifts.filter(g => g.category === activeCategory);

  const categories = ['all', ...Array.from(new Set(effectiveGifts.map(g => g.category)))];

  const handleSend = useCallback((giftId: string, price: number) => {
    console.log('[GiftPanel] Hediye gönder:', giftId, 'fiyat:', price, 'alıcı:', selectedReceiver, 'bakiye:', balance);
    if (!selectedReceiver) {
      Alert.alert('Alıcı Seç', 'Lütfen hediye göndermek için bir kullanıcı seçin.');
      return;
    }
    if (balance < price) {
      Alert.alert('Yetersiz Bakiye', `Bu hediye ${price} jeton. Bakiyeniz: ${balance} jeton.`);
      return;
    }
    setSending(giftId);
    sendGift(selectedReceiver, giftId, 1);
    setTimeout(() => setSending(null), 800);
  }, [balance, selectedReceiver, sendGift]);

  const receiverName = (() => {
    if (!selectedReceiver) return null;
    const p = participants.find(p => p.userId === selectedReceiver);
    return p?.displayName || 'Kullanıcı';
  })();

  const selectableUsers = participants.filter(p => p.userId !== user?.id);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <View style={s.container} onStartShouldSetResponder={() => true}>
          {/* Drag handle */}
          <View style={s.dragHandle} />

          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={{ fontSize: 20 }}>🎁</Text>
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
              <Text style={{ fontSize: 14 }}>🪙</Text>
              <Text style={s.balanceVal}>{balance.toLocaleString()}</Text>
              <Text style={s.balanceLabel}>Jeton</Text>
            </View>
            <View style={s.divider} />
            <View style={s.balanceItem}>
              <Text style={{ fontSize: 14 }}>⭐</Text>
              <Text style={[s.balanceVal, { color: '#a855f7' }]}>{points.toLocaleString()}</Text>
              <Text style={s.balanceLabel}>Puan</Text>
            </View>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={s.shopBtn}
              onPress={() => { onClose(); onOpenShop(); }}
              activeOpacity={0.7}
            >
              <Ionicons name="storefront-outline" size={14} color="#818cf8" />
              <Text style={s.shopBtnText}>Mağaza</Text>
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
              <Ionicons name={showUserPicker ? 'chevron-up' : 'chevron-down'} size={14} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          )}

          {/* Kullanıcı Picker */}
          {showUserPicker && (
            <ScrollView style={s.userList} nestedScrollEnabled>
              {selectableUsers.length === 0 ? (
                <Text style={s.emptyText}>Odada başka kullanıcı yok</Text>
              ) : (
                selectableUsers.map(p => (
                  <TouchableOpacity
                    key={p.userId}
                    style={[s.userItem, selectedReceiver === p.userId && s.userItemActive]}
                    onPress={() => { setSelectedReceiver(p.userId); setShowUserPicker(false); }}
                  >
                    <Image source={{ uri: p.avatar || 'https://sopranochat.com/avatars/neutral_1.png' }} style={s.userAvatar} />
                    <Text style={s.userItemName}>{p.displayName}</Text>
                    {selectedReceiver === p.userId && (
                      <Ionicons name="checkmark-circle" size={16} color="#818cf8" />
                    )}
                  </TouchableOpacity>
                ))
              )}
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
                <Text style={s.catIcon}>{cat === 'all' ? '🎯' : CATEGORY_LABELS[cat]?.icon || '📦'}</Text>
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
                      <View style={[s.giftPrice, { borderColor: catColor + '30' }]}>
                        <Text style={{ fontSize: 8 }}>🪙</Text>
                        <Text style={[s.giftPriceText, { color: catColor }]}>{gift.price}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Uyarılar */}
            {balance <= 0 && giftList.length > 0 && (
              <View style={s.warningBox}>
                <Ionicons name="warning-outline" size={14} color="#f59e0b" />
                <Text style={s.warningText}>Jeton bakiyeniz yetersiz. Mağazadan jeton alabilirsiniz.</Text>
              </View>
            )}

            {!selectedReceiver && giftList.length > 0 && (
              <View style={s.warningBox}>
                <Ionicons name="person-outline" size={14} color="#818cf8" />
                <Text style={s.warningText}>Lütfen önce alıcı seçin.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

const CARD_W = (width - 24 - 24) / 4; // 4 sütun

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  container: {
    backgroundColor: 'rgba(15,20,35,0.98)',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    height: '90%', paddingBottom: 16,
    borderTopWidth: 1, borderColor: 'rgba(139,92,246,0.15)',
  },

  dragHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'center', marginTop: 10, marginBottom: 6,
  },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#f1f5f9' },
  headerSub: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },

  balanceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 14, marginBottom: 8,
    padding: 10, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  balanceItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceVal: { fontSize: 14, fontWeight: '800', color: '#fbbf24' },
  balanceLabel: { fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: '500' },
  divider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.08)' },
  shopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
  },
  shopBtnText: { fontSize: 11, fontWeight: '700', color: '#818cf8' },

  userSelectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 14, marginBottom: 8,
    padding: 10, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  userSelectText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

  userList: { maxHeight: 130, marginHorizontal: 14, marginBottom: 8 },
  userItem: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  userItemActive: { backgroundColor: 'rgba(99,102,241,0.1)' },
  userAvatar: { width: 24, height: 24, borderRadius: 12 },
  userItemName: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },

  catBar: { paddingHorizontal: 12, marginBottom: 8, maxHeight: 38 },
  catBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, marginRight: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  catBtnActive: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.25)' },
  catIcon: { fontSize: 12 },
  catLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.3)' },
  catLabelActive: { color: '#818cf8' },

  gridScroll: { flex: 1 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 6,
    justifyContent: 'flex-start',
  },
  giftCard: {
    width: CARD_W, alignItems: 'center', gap: 4,
    paddingVertical: 10, paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  giftCardDisabled: { opacity: 0.3 },
  giftCardSending: { backgroundColor: 'rgba(99,102,241,0.15)', transform: [{ scale: 0.95 }] },
  giftEmoji: { fontSize: 28 },
  giftName: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  giftPrice: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
  },
  giftPriceText: { fontSize: 10, fontWeight: '800' },

  emptyState: { width: '100%', alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 10 },

  warningBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 2, marginTop: 10, padding: 10, borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.06)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.12)',
  },
  warningText: { flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
});
