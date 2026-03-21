import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  StyleSheet,
  Image,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';

const { width } = Dimensions.get('window');

/* ═══════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════ */

type NotifType = 'invite' | 'message' | 'follow' | 'warning' | 'system' | 'like';

interface NotifItem {
  id: string;
  type: NotifType;
  avatar: string;
  title: string;
  subtitle: string;
  time: string;
  read: boolean;
  action?: 'join' | 'reply' | 'view';
}

/* Zaman farkını insancıl formata çevir */
function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(dateStr).toLocaleDateString('tr-TR');
}

const TYPE_CONFIG: Record<string, { color: string; icon: string; bgAlpha: string; label: string }> = {
  invite:  { color: '#8b5cf6', icon: 'enter-outline',        bgAlpha: 'rgba(139,92,246,', label: 'Davet' },
  message: { color: '#3b82f6', icon: 'chatbubble-outline',   bgAlpha: 'rgba(59,130,246,', label: 'Mesaj' },
  follow:  { color: '#22c55e', icon: 'person-add-outline',   bgAlpha: 'rgba(34,197,94,',  label: 'Takip' },
  warning: { color: '#ef4444', icon: 'alert-circle-outline', bgAlpha: 'rgba(239,68,68,',  label: 'Uyarı' },
  system:  { color: '#6366f1', icon: 'information-circle-outline', bgAlpha: 'rgba(99,102,241,', label: 'Sistem' },
  like:    { color: '#ec4899', icon: 'heart-outline',        bgAlpha: 'rgba(236,72,153,',  label: 'Beğeni' },
};

const ACTION_LABELS: Record<string, string> = { join: 'Katıl', reply: 'Cevapla', view: 'Görüntüle' };

/* ═══════════════════════════════════════════════════════════
   PARTİKÜLLER
   ═══════════════════════════════════════════════════════════ */

function FloatingParticles() {
  const pts = useRef(
    Array.from({ length: 5 }, () => ({
      x: Math.random() * width,
      y: new Animated.Value(Math.random() * 400),
      op: new Animated.Value(0),
      size: 2 + Math.random() * 3,
    }))
  ).current;

  useEffect(() => {
    pts.forEach(p => {
      const go = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(p.op, { toValue: 0.2 + Math.random() * 0.15, duration: 2500, useNativeDriver: true }),
            Animated.timing(p.y, { toValue: Math.random() * 350, duration: 4500, useNativeDriver: true }),
          ]),
          Animated.timing(p.op, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ]).start(go);
      };
      setTimeout(go, Math.random() * 2000);
    });
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {pts.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', width: p.size, height: p.size, borderRadius: p.size,
          backgroundColor: i % 2 === 0 ? '#5eead4' : '#a78bfa',
          left: p.x, opacity: p.op, transform: [{ translateY: p.y }],
        }} />
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   BİLDİRİM KARTI
   ═══════════════════════════════════════════════════════════ */

function NotificationCard({ item, onMarkRead }: { item: NotifItem; onMarkRead: (id: string) => void }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG['system'];
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(item.read ? 0 : 1)).current;

  const onPressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.95, friction: 7, useNativeDriver: true }),
      Animated.timing(shadowAnim, { toValue: 0.5, duration: 150, useNativeDriver: true }),
    ]).start();
  };
  const onPressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, useNativeDriver: true }),
      Animated.timing(shadowAnim, { toValue: item.read ? 0 : 1, duration: 200, useNativeDriver: true }),
    ]).start();
    if (!item.read) onMarkRead(item.id);
  };

  return (
    <TouchableOpacity activeOpacity={1} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[
        st.card,
        !item.read && st.cardUnread,
        !item.read && { borderColor: cfg.color + '20', borderWidth: 1 },
        { transform: [{ scale: scaleAnim }], opacity: shadowAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.85, 0.7, 1] }) },
      ]}>
        {/* Okunmamış dot — daha büyük */}
        {!item.read && <View style={[st.unreadDot, { backgroundColor: cfg.color }]} />}

        {/* Sol — avatar + tip ikonu */}
        <View style={st.avatarWrap}>
          <Image source={{ uri: item.avatar }} style={[
            st.avatar,
            !item.read && { borderColor: cfg.color + '40', borderWidth: 2 },
          ]} />
          <View style={[st.typeIcon, { backgroundColor: cfg.color }]}>
            <Ionicons name={cfg.icon as any} size={10} color="#fff" />
          </View>
        </View>

        {/* Orta — bilgi */}
        <View style={st.cardContent}>
          <Text style={[st.cardTitle, !item.read && st.cardTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={st.cardSub} numberOfLines={1}>{item.subtitle}</Text>
          <View style={st.cardMeta}>
            <Ionicons name="time-outline" size={11} color={!item.read ? '#64748b' : '#94a3b8'} />
            <Text style={[st.cardTime, !item.read && st.cardTimeUnread]}>{item.time}</Text>
          </View>
        </View>

        {/* Sağ — aksiyon butonu */}
        {item.action && (
          <TouchableOpacity activeOpacity={0.8} style={st.actionBtnWrap}
            onPress={() => {
              if (item.action === 'join') {
                Alert.alert('Oda Daveti', 'Odaya katılmak ister misiniz?', [
                  { text: 'İptal', style: 'cancel' },
                  { text: 'Katıl', onPress: () => {} },
                ]);
              } else {
                Alert.alert('Bildirim', 'Bu bildirim detayı görüntüleniyor.', [{ text: 'Tamam' }]);
              }
            }}>
            <LinearGradient colors={['#6366f1','#8b5cf6']} style={st.actionBtn}>
              <Text style={st.actionText}>{ACTION_LABELS[item.action]}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Sol kenar renk şeridi — daha kalın */}
        <View style={[st.cardStripe, { backgroundColor: cfg.color, width: !item.read ? 4 : 3 }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

/* ═══════════════════════════════════════════════════════════
   BOŞ DURUM
   ═══════════════════════════════════════════════════════════ */

function EmptyState() {
  return (
    <View style={st.emptyWrap}>
      <View style={st.emptyIconWrap}>
        <Ionicons name="notifications-off-outline" size={48} color="#a78bfa" />
      </View>
      <Text style={st.emptyTitle}>Henüz bildirim yok</Text>
      <Text style={st.emptySub}>Yeni aktiviteler burada görünecek</Text>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   ALT NAVİGASYON
   ═══════════════════════════════════════════════════════════ */

function BottomNavigation({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const items = [
    { id: 'home', icon: 'home-outline' as const, label: 'Anasayfa', route: '/home' },
    { id: 'explore', icon: 'compass-outline' as const, label: 'Keşfet', route: '/explore' },
    { id: 'create', icon: 'add', label: 'Topluluk Aç', isCenter: true, route: '/create-room' },
    { id: 'notifications', icon: 'notifications' as const, label: 'Bildirimler', route: '/notifications' },
    { id: 'profile', icon: 'person-outline' as const, label: 'Profil', route: null },
  ];

  return (
    <View style={st.bottomNav}>
      {items.map(item => {
        if (item.isCenter) {
          return (
            <TouchableOpacity key={item.id} style={st.bottomNavCenter} activeOpacity={0.85}
              onPress={() => item.route && router.push(item.route as any)}>
              <LinearGradient colors={['#4ecdc4','#44b8b0']} style={st.bottomNavCenterGrad}>
                <Ionicons name="add" size={30} color="#fff" />
              </LinearGradient>
              <Text style={st.bottomNavCenterLabel}>{item.label}</Text>
            </TouchableOpacity>
          );
        }
        const isActive = item.id === 'notifications';
        return (
          <TouchableOpacity key={item.id}
            onPress={() => {
              if (item.route) router.push(item.route as any);
              else if (item.id === 'profile') Alert.alert('Profil', 'Profil sayfası yakında eklenecek.', [{ text: 'Tamam' }]);
            }}
            style={st.bottomNavItem}>
            <View>
              <Ionicons name={item.icon as any} size={26} color={isActive ? '#4f46e5' : '#94a3b8'} />
              {item.id === 'notifications' && unreadCount > 0 && (
                <View style={st.navBadge}>
                  <Text style={st.navBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={[st.bottomNavLabel, isActive && st.bottomNavLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANA EKRAN
   ═══════════════════════════════════════════════════════════ */

export default function NotificationsScreen() {
  // ── Store bağlantısı — gerçek API verisi ──
  const {
    notifications: storeNotifs,
    notificationsLoading,
    notificationsError,
    fetchNotifications,
    markAllRead: storeMarkAllRead,
    unreadCount: storeUnreadCount,
  } = useStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Store verisini UI formatına dönüştür
  const notifications: NotifItem[] = storeNotifs.map((n: any) => {
    const typeMap: Record<string, NotifType> = {
      invite: 'invite', message: 'message', follow: 'follow',
      system: 'system', like: 'like', warning: 'warning',
    };
    const type = typeMap[n.type] || 'system';
    return {
      id: n.id,
      type,
      avatar: n.fromUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(n.title?.slice(0, 2) || 'N')}&background=1e293b&color=fb7185`,
      title: n.title || '',
      subtitle: n.body || n.message || '',
      time: n.createdAt ? formatTimeAgo(n.createdAt) : '',
      read: !!n.isRead,
      action: type === 'invite' ? 'join' : type === 'message' ? 'reply' : 'view',
    };
  });

  const unreadCount = storeUnreadCount;

  const markRead = (id: string) => {
    // Lokal bildirim okundu işaretleme
    // Backend'de tekil okundu endpoint eklenince burayı güncelle
  };

  const markAllRead = () => {
    storeMarkAllRead();
  };

  return (
    <View style={st.container}>
      <LinearGradient colors={['#eee8f5','#d0cce0','#b8b3d1']} style={StyleSheet.absoluteFill as any} />
      <View style={st.orbTopRight} />
      <View style={st.orbBottomLeft} />
      <FloatingParticles />

      {/* ── ÜST BAR ── */}
      <View style={st.topBar}>
        <View style={{ width: 40 }} />
        <View style={st.topBarCenter}>
          <Text style={st.topBarTitle}>Bildirimler</Text>
          {unreadCount > 0 && (
            <View style={st.topBarBadge}>
              <Text style={st.topBarBadgeText}>{unreadCount} yeni</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={st.markAllBtnWrap}>
            <View style={st.markAllBtn}>
              <Ionicons name="checkmark-done" size={16} color="#6366f1" />
              <Text style={st.markAllText}>Okundu</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* ── BİLDİRİM TÜRLERİ ÖZET ── */}
      {unreadCount > 0 && (
        <View style={st.summaryRow}>
          {(['invite', 'message', 'follow', 'warning'] as NotifType[]).map(type => {
            const count = notifications.filter(n => n.type === type && !n.read).length;
            if (count === 0) return null;
            const cfg = TYPE_CONFIG[type];
            return (
              <View key={type} style={[st.summaryChip, { backgroundColor: cfg.bgAlpha + '0.08)', borderColor: cfg.bgAlpha + '0.15)' }]}>
                <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                <Text style={[st.summaryChipCount, { color: cfg.color }]}>{count}</Text>
                <Text style={[st.summaryChipLabel, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ── LİSTE ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* LOADING */}
        {notificationsLoading && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={{ marginTop: 12, fontSize: 14, color: '#64748b', fontWeight: '600' }}>Bildirimler yükleniyor...</Text>
          </View>
        )}

        {/* ERROR */}
        {notificationsError && !notificationsLoading && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
            <Text style={{ marginTop: 12, fontSize: 14, color: '#ef4444', fontWeight: '600' }}>{notificationsError}</Text>
            <TouchableOpacity
              onPress={() => fetchNotifications()}
              style={{ marginTop: 16, backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        )}
        {notifications.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Okunmamışlar */}
            {unreadCount > 0 && (
              <>
                <View style={st.sectionLabelRow}>
                  <View style={st.sectionLabelDot} />
                  <Text style={st.sectionLabelNew}>Yeni</Text>
                  <View style={st.sectionLabelLine} />
                </View>
                {notifications.filter(n => !n.read).map(n => (
                  <NotificationCard key={n.id} item={n} onMarkRead={markRead} />
                ))}
              </>
            )}

            {/* Okunmuşlar */}
            {notifications.some(n => n.read) && (
              <>
                <Text style={st.sectionLabel}>Daha Önce</Text>
                {notifications.filter(n => n.read).map(n => (
                  <NotificationCard key={n.id} item={n} onMarkRead={markRead} />
                ))}
              </>
            )}
          </>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      <BottomNavigation unreadCount={unreadCount} />
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   STİLLER
   ═══════════════════════════════════════════════════════════ */

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#d0cce0' },

  orbTopRight: {
    position: 'absolute', top: -50, right: -70,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(94,234,212,0.15)',
  },
  orbBottomLeft: {
    position: 'absolute', bottom: 80, left: -90,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(167,139,250,0.12)',
  },

  /* ── ÜST BAR ── */
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  topBarCenter: { flex: 1, alignItems: 'center' },
  topBarTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  topBarBadge: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    marginTop: 3, borderWidth: 0.5, borderColor: 'rgba(99,102,241,0.2)',
  },
  topBarBadgeText: { fontSize: 10, fontWeight: '700', color: '#6366f1' },
  markAllBtnWrap: {},
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(99,102,241,0.08)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    borderWidth: 0.5, borderColor: 'rgba(99,102,241,0.15)',
  },
  markAllText: { fontSize: 10, fontWeight: '700', color: '#6366f1' },

  /* ── ÖZET ── */
  summaryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingHorizontal: 16, marginBottom: 12,
  },
  summaryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    borderWidth: 0.5,
  },
  summaryChipCount: { fontSize: 13, fontWeight: '800' },
  summaryChipLabel: { fontSize: 10, fontWeight: '600', opacity: 0.8 },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 20 },

  /* ── SECTION LABEL ── */
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#64748b',
    letterSpacing: 1, textTransform: 'uppercase',
    marginBottom: 10, marginTop: 6,
  },
  sectionLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 12, marginTop: 6,
  },
  sectionLabelDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 6, elevation: 4,
  },
  sectionLabelNew: {
    fontSize: 13, fontWeight: '800', color: '#4f46e5',
    letterSpacing: 0.5,
  },
  sectionLabelLine: {
    flex: 1, height: 1,
    backgroundColor: 'rgba(99,102,241,0.15)',
  },

  /* ── KART — Premium Glass ── */
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20, padding: 15, gap: 12,
    marginBottom: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  cardUnread: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#6366f1', shadowRadius: 18, elevation: 8,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15,
  },
  unreadDot: {
    position: 'absolute', top: 14, left: 8,
    width: 8, height: 8, borderRadius: 4,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 4, elevation: 3,
  },
  cardStripe: {
    position: 'absolute', left: 0, top: 6, bottom: 6,
    width: 3, borderRadius: 2,
  },

  /* Avatar */
  avatarWrap: { position: 'relative' },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(226,232,240,0.5)' },
  typeIcon: {
    position: 'absolute', bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },

  /* Bilgi */
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 2 },
  cardTitleUnread: { fontWeight: '700', color: '#0f172a' },
  cardSub: { fontSize: 11, fontWeight: '500', color: '#94a3b8', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardTime: { fontSize: 10, fontWeight: '500', color: '#94a3b8' },
  cardTimeUnread: { color: '#64748b', fontWeight: '600' },

  /* Aksiyon butonu — Premium Glow */
  actionBtnWrap: {},
  actionBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  actionText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  /* ── BOŞ DURUM ── */
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(167,139,250,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginBottom: 6 },
  emptySub: { fontSize: 13, fontWeight: '500', color: '#94a3b8' },

  /* ── ALT NAV — Premium Glass ── */
  bottomNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.88)', paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 15,
  },
  bottomNavItem: { alignItems: 'center', gap: 2, paddingVertical: 4, minWidth: 56 },
  bottomNavLabel: { fontSize: 9, fontWeight: '600', color: '#94a3b8' },
  bottomNavLabelActive: { color: '#4f46e5' },
  bottomNavCenter: { alignItems: 'center', marginTop: -22 },
  bottomNavCenterGrad: {
    width: 56, height: 56, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 10,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
  },
  bottomNavCenterLabel: { fontSize: 9, fontWeight: '800', color: '#4f46e5', marginTop: 4 },
  navBadge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: '#ef4444', minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  navBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
});
