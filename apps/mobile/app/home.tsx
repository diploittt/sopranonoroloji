import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import api from '../services/api';

const { width, height: H } = Dimensions.get('window');

/* ═══════════════════════════════════════════════════════════
   FLOATING PARTİKÜLLER — Mockup tarzı turkuaz/lavanta
   ═══════════════════════════════════════════════════════════ */

function FloatingParticles() {
  const COLORS = ['#5eead4', '#a78bfa', '#7dd3c8', '#c4b5fd', '#38bdf8'];
  const pts = useRef(
    Array.from({ length: 10 }, (_, i) => ({
      x: Math.random() * width,
      y: new Animated.Value(Math.random() * H * 0.5),
      opacity: new Animated.Value(0),
      size: 1.5 + Math.random() * 3,
      color: COLORS[i % COLORS.length],
    }))
  ).current;

  useEffect(() => {
    pts.forEach(p => {
      const go = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(p.opacity, { toValue: 0.15 + Math.random() * 0.25, duration: 2000 + Math.random() * 2000, useNativeDriver: true }),
            Animated.timing(p.y, { toValue: Math.random() * H * 0.5, duration: 4000 + Math.random() * 3000, useNativeDriver: true }),
          ]),
          Animated.timing(p.opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ]).start(go);
      };
      setTimeout(go, Math.random() * 2500);
    });
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {pts.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', width: p.size, height: p.size, borderRadius: p.size,
          backgroundColor: p.color,
          left: p.x, opacity: p.opacity, transform: [{ translateY: p.y }],
        }} />
      ))}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   ALT NAVİGASYON — Mockup stili (koyu, turkuaz vurgu, + butonu)
   ═══════════════════════════════════════════════════════════ */

function BottomNavigation() {
  const router = useRouter();
  const items = [
    { id: 'home', icon: 'home' as const, iconOut: 'home-outline' as const, label: 'Anasayfa', route: null },
    { id: 'explore', icon: 'compass' as const, iconOut: 'compass-outline' as const, label: 'Keşfet', route: '/explore' },
    { id: 'create', icon: 'add', label: 'Topluluk Aç', isCenter: true, route: '/create-room' },
    { id: 'notifications', icon: 'notifications' as const, iconOut: 'notifications-outline' as const, label: 'Bildirimler', route: '/notifications' },
    { id: 'profile', icon: 'person' as const, iconOut: 'person-outline' as const, label: 'Profil', route: null },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map(item => {
        if (item.isCenter) {
          return (
            <TouchableOpacity key={item.id} style={styles.bottomNavCenter} activeOpacity={0.85}
              onPress={() => item.route && router.push(item.route as any)}>
              <LinearGradient colors={['#4ecdc4','#44b8b0']} style={styles.bottomNavCenterGrad}>
                <Ionicons name="add" size={30} color="#fff" />
              </LinearGradient>
              <Text style={styles.bottomNavCenterLabel}>{item.label}</Text>
            </TouchableOpacity>
          );
        }
        const isActive = item.id === 'home';
        return (
          <TouchableOpacity key={item.id}
            onPress={() => {
              if (item.route) router.push(item.route as any);
              else if (item.id === 'profile') Alert.alert('Profil', 'Profil sayfası yakında eklenecek.', [{ text: 'Tamam' }]);
            }}
            style={styles.bottomNavItem}>
            <Ionicons name={(isActive ? item.icon : item.iconOut) as any} size={24}
              color={isActive ? '#4f46e5' : '#94a3b8'} />
            <Text style={[styles.bottomNavLabel, isActive && styles.bottomNavLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   TENANT KARTI — Inline çekmece ile misafir/üye girişi
   Tıkla → misafir olarak gir (mevcut isimle)
   "Üye Girişi" → çekmece aç → email+şifre
   ═══════════════════════════════════════════════════════════ */

function TenantCard({ tenant, index, user, router }: { tenant: any; index: number; user: any; router: any }) {
  const { loginWithSocket } = useStore();
  const [drawerMode, setDrawerMode] = useState<'closed' | 'rooms' | 'member'>('closed');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPass, setMemberPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drawerH = useRef(new Animated.Value(0)).current;
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const rooms = Array.isArray(tenant.rooms) ? tenant.rooms : [];

  const openDrawer = (mode: 'rooms' | 'member') => {
    const newMode = drawerMode === mode ? 'closed' : mode;
    setDrawerMode(newMode);
    setError(null);
    Animated.timing(drawerH, {
      toValue: newMode === 'closed' ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  // Misafir olarak odaya gir
  const enterAsGuest = async (roomSlug: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const guestName = user?.displayName || user?.username || 'Misafir';
      const { data } = await api.post('/auth/guest', {
        username: guestName,
        gender: user?.gender || 'male',
        tenantId: tenant.id,
      });
      loginWithSocket(data.access_token, data.user, tenant.id);
      router.push({ pathname: '/room', params: { roomId: roomSlug } } as any);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  };

  // Üye olarak gir
  const handleMemberLogin = async () => {
    if (!memberEmail.trim() || !memberPass.trim()) {
      setError('Kullanıcı adı ve şifre gerekli.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/login', {
        username: memberEmail.trim(),
        password: memberPass.trim(),
        tenantId: tenant.id,
      });
      loginWithSocket(data.access_token, data.user, tenant.id);
      const slug = tenant.firstRoom || rooms[0]?.slug;
      if (slug) router.push({ pathname: '/room', params: { roomId: slug } } as any);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  };

  // Misafir tıkla: tek oda → direkt gir, çok oda → çekmece aç
  const handleGuestClick = () => {
    if (rooms.length === 1) {
      enterAsGuest(rooms[0].slug);
    } else if (rooms.length > 1) {
      openDrawer('rooms');
    } else if (tenant.firstRoom) {
      enterAsGuest(tenant.firstRoom);
    } else {
      Alert.alert('Topluluk', 'Bu toplulukta henüz aktif oda yok.');
    }
  };


  return (
    <View style={{ marginBottom: 10 }}>
      {/* Ana kart */}
      <View style={styles.roomCard}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          activeOpacity={0.7}
          onPress={handleGuestClick}
        >
          <View style={[styles.roomIconWrap, { backgroundColor: gradient[0] + '25' }]}>
            <Ionicons name="globe" size={22} color={gradient[0]} />
          </View>
          <View style={styles.roomInfo}>
            <Text style={styles.roomName} numberOfLines={1}>{tenant.name}</Text>
            <Text style={styles.roomAnnounce} numberOfLines={1}>{tenant.firstRoomName || tenant.slug}</Text>
            <View style={styles.roomMeta}>
              <View style={styles.roomLiveDot} />
              <Text style={styles.roomMetaText}>{tenant.roomCount || 0} oda • {tenant.onlineUsers || 0} çevrimiçi</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Sağ: Misafir + Üye iki küçük buton */}
        <View style={{ alignItems: 'stretch', gap: 3, width: 62 }}>
          <TouchableOpacity activeOpacity={0.85} onPress={handleGuestClick}>
            <LinearGradient colors={['#4ecdc4','#44b8b0']} style={{
              paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
            }}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="person-outline" size={11} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>Misafir</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} onPress={() => openDrawer('member')}>
            <LinearGradient colors={drawerMode === 'member' ? ['#8b5cf6','#7c3aed'] : ['#6366f1','#4f46e5']} style={{
              paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
            }}>
              <Ionicons name="key-outline" size={11} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>Üye</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hata mesajı */}
      {error && (
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <Text style={{ fontSize: 11, color: '#ef4444' }}>⚠ {error}</Text>
        </View>
      )}

      {/* Çekmece — oda listesi veya üye girişi */}
      <Animated.View style={{
        overflow: 'hidden',
        maxHeight: drawerH.interpolate({ inputRange: [0, 1], outputRange: [0, drawerMode === 'member' ? 160 : Math.max(rooms.length * 52 + 20, 60)] }),
        opacity: drawerH.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0, 1] }),
      }}>
        <View style={{
          marginHorizontal: 12, marginTop: 6, borderRadius: 12, padding: 10,
          backgroundColor: drawerMode === 'member' ? 'rgba(99,102,241,0.06)' : 'rgba(78,205,196,0.06)',
          borderWidth: 1, borderColor: drawerMode === 'member' ? 'rgba(99,102,241,0.15)' : 'rgba(78,205,196,0.15)',
        }}>
          {/* Oda listesi */}
          {drawerMode === 'rooms' && (
            <>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#0d9488', marginBottom: 6, letterSpacing: 1 }}>ODALAR</Text>
              {rooms.map((room: any) => (
                <TouchableOpacity
                  key={room.id}
                  activeOpacity={0.7}
                  onPress={() => enterAsGuest(room.slug)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingVertical: 8, paddingHorizontal: 10, marginBottom: 4,
                    backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 8,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <Ionicons name="mic" size={14} color="#0d9488" />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#1e293b' }} numberOfLines={1}>{room.name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 10, color: '#64748b' }}>{room.onlineUsers || 0} 👤</Text>
                    <View style={{ backgroundColor: '#4ecdc4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>Gir</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Üye girişi */}
          {drawerMode === 'member' && (
            <>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#6366f1', marginBottom: 8, letterSpacing: 1 }}>ÜYE GİRİŞİ</Text>
              <TextInput
                style={{
                  backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 8,
                  paddingHorizontal: 12, paddingVertical: 8, fontSize: 13,
                  color: '#1e293b', marginBottom: 6, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
                }}
                placeholder="Kullanıcı adı" placeholderTextColor="#94a3b8"
                value={memberEmail} onChangeText={setMemberEmail} autoCapitalize="none"
              />
              <TextInput
                style={{
                  backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 8,
                  paddingHorizontal: 12, paddingVertical: 8, fontSize: 13,
                  color: '#1e293b', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
                }}
                placeholder="Şifre" placeholderTextColor="#94a3b8"
                value={memberPass} onChangeText={setMemberPass} secureTextEntry
              />
              <TouchableOpacity activeOpacity={0.85} onPress={handleMemberLogin} disabled={loading}
                style={{ borderRadius: 8, overflow: 'hidden' }}>
                <LinearGradient colors={['#6366f1','#4f46e5']} style={{
                  paddingVertical: 10, alignItems: 'center', borderRadius: 8,
                  flexDirection: 'row', justifyContent: 'center', gap: 6,
                }}>
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Ionicons name="key-outline" size={14} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Giriş Yap</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'communities' | 'rooms' | 'online'>('rooms');
  const [refreshing, setRefreshing] = useState(false);

  const {
    publicRooms, roomsLoading, roomsError, fetchPublicRooms,
    exploreTenants: rawTenants, exploreLoading, fetchExploreData,
    activeTenantId, setActiveTenant,
    user,
  } = useStore();
  const exploreTenants = Array.isArray(rawTenants) ? rawTenants : [];

  useEffect(() => {
    fetchPublicRooms();
    fetchExploreData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPublicRooms(), fetchExploreData()]);
    setRefreshing(false);
  }, []);

  return (
    <View style={styles.container}>
      {/* Arka plan — ikon.png zemin rengi */}
      <LinearGradient colors={['#eee8f5','#d0cce0','#b8b3d1']} style={StyleSheet.absoluteFill as any} />

      {/* Işık orbs */}
      <View style={styles.orbTopRight} />
      <View style={styles.orbBottomLeft} />
      <FloatingParticles />

      {/* ═══ HEADER — Logo + arama + profil ═══ */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/explore' as any)}>
          <Ionicons name="search" size={20} color="#475569" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image source={require('../assets/images/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerSlogan}>Senin Sesin</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => Alert.alert('Profil', 'Profil sayfası yakında eklenecek.', [{ text: 'Tamam' }])}>
          <Ionicons name="person-circle-outline" size={24} color="#475569" />
        </TouchableOpacity>
      </View>

      {/* ═══ SEKMELER — Topluluklar / Odalar / Çevrimiçi ═══ */}
      <View style={styles.tabBar}>
        {([{ id: 'communities' as const, label: 'Topluluklar' }, { id: 'rooms' as const, label: 'Odalar' }, { id: 'online' as const, label: 'Çevrimiçi' }]).map(t => {
          const isActive = activeTab === t.id;
          return (
            <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id)}
              style={[styles.tab, isActive && styles.tabActive]}>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ═══ İÇERİK ═══ */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#5eead4" />}
      >
        {/* ── LOADING ── */}
        {roomsLoading && !refreshing && (
          <View style={styles.placeholder}>
            <ActivityIndicator size="large" color="#5eead4" />
            <Text style={styles.placeholderText}>{activeTab === 'rooms' ? 'Odalar yükleniyor...' : 'Kullanıcılar yükleniyor...'}</Text>
          </View>
        )}

        {/* ── ERROR ── */}
        {roomsError && !roomsLoading && (
          <View style={styles.placeholder}>
            <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
            <Text style={[styles.placeholderText, { color: '#ef4444' }]}>{roomsError}</Text>
            <TouchableOpacity onPress={fetchPublicRooms} style={styles.retryBtn}>
              <Text style={styles.retryText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ TOPLULUKLAR SEKMESİ ═══ */}
        {activeTab === 'communities' && !exploreLoading && (
          <>
            {exploreTenants.length === 0 && (
              <View style={styles.placeholder}>
                <Ionicons name="globe-outline" size={56} color="rgba(167,139,250,0.4)" />
                <Text style={styles.placeholderText}>Henüz topluluk yok</Text>
                <Text style={styles.placeholderSub}>Yakında topluluklar burada listelenecek</Text>
              </View>
            )}
            {exploreTenants.map((tenant: any, index: number) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                index={index}
                user={user}
                router={router}
              />
            ))}
          </>
        )}

        {/* ═══ ODALAR SEKMESİ ═══ */}
        {activeTab === 'rooms' && !roomsLoading && (
          <>
            {publicRooms.length === 0 && !roomsError && (
              <View style={styles.placeholder}>
                <Ionicons name="mic-circle-outline" size={56} color="rgba(167,139,250,0.4)" />
                <Text style={styles.placeholderText}>Henüz aktif oda yok</Text>
                <Text style={styles.placeholderSub}>Yeni bir oda oluşturarak başla!</Text>
              </View>
            )}

            {publicRooms.map((room: any, index: number) => {
              const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
              return (
                <TouchableOpacity
                  key={room.id}
                  activeOpacity={0.88}
                  onPress={() => router.push({ pathname: '/room', params: { roomId: room.slug || room.id } } as any)}
                  style={styles.roomCard}
                >
                  <View style={[styles.roomIconWrap, { backgroundColor: gradient[0] + '25' }]}>
                    <Ionicons name="mic" size={22} color={gradient[0]} />
                  </View>
                  <View style={styles.roomInfo}>
                    <View style={styles.roomNameRow}>
                      {room.isLocked && <Ionicons name="lock-closed" size={12} color="#f59e0b" style={{ marginRight: 4 }} />}
                      {room.isVipRoom && <Text style={{ fontSize: 12, marginRight: 4 }}>💎</Text>}
                      <Text style={styles.roomName} numberOfLines={1}>{room.name}</Text>
                    </View>
                    <Text style={styles.roomAnnounce} numberOfLines={1}>{room.announcement || 'Sohbet odası'}</Text>
                    <View style={styles.roomMeta}>
                      <View style={styles.roomLiveDot} />
                      <Text style={styles.roomMetaText}>{room.participantCount || 0} kişi dinliyor</Text>
                    </View>
                  </View>
                  <TouchableOpacity activeOpacity={0.85}
                    onPress={() => router.push({ pathname: '/room', params: { roomId: room.slug || room.id } } as any)}
                    style={styles.joinBtnWrap}>
                    <LinearGradient colors={['#4ecdc4','#44b8b0']} style={styles.joinGradient}>
                      <Ionicons name="enter-outline" size={14} color="#fff" />
                      <Text style={styles.joinText}>Katıl</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}

            {/* ── TENANT ODALARI ── */}
            {exploreTenants.filter((t: any) => Array.isArray(t.rooms) && t.rooms.length > 0).map((tenant: any, ti: number) => (
              <View key={`t-${tenant.id}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 6, paddingHorizontal: 4 }}>
                  <Ionicons name="globe" size={14} color="#6366f1" />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#4c1d95', letterSpacing: 0.3 }}>{tenant.name}</Text>
                  <Text style={{ fontSize: 10, color: '#7c3aed', fontWeight: '600' }}>({tenant.rooms.length} oda)</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(99,102,241,0.15)', marginLeft: 6 }} />
                </View>
                {tenant.rooms.map((room: any, ri: number) => {
                  const gradient = CARD_GRADIENTS[(ti + ri) % CARD_GRADIENTS.length];
                  return (
                    <View key={room.id} style={styles.roomCard}>
                      <View style={[styles.roomIconWrap, { backgroundColor: gradient[0] + '25' }]}>
                        <Ionicons name="mic" size={22} color={gradient[0]} />
                      </View>
                      <View style={styles.roomInfo}>
                        <Text style={styles.roomName} numberOfLines={1}>{room.name}</Text>
                        <View style={styles.roomMeta}>
                          <View style={styles.roomLiveDot} />
                          <Text style={styles.roomMetaText}>{room.onlineUsers || 0} çevrimiçi</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'column', gap: 4 }}>
                        <TouchableOpacity activeOpacity={0.85}
                          onPress={() => router.push({ pathname: '/room', params: { roomId: room.slug || room.id } } as any)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#4ecdc4', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                          <Ionicons name="person-outline" size={12} color="#fff" />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>Misafir</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.85}
                          onPress={() => {/* üye girişi — TenantCard drawer ile */}}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#8b5cf6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                          <Ionicons name="key-outline" size={12} color="#fff" />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>Üye</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
          </>
        )}

        {/* ═══ ÇEVRİMİÇİ SEKMESİ ═══ */}
        {activeTab === 'online' && (
          <>
            {(!publicRooms || publicRooms.length === 0) && !roomsLoading && (
              <View style={styles.placeholder}>
                <Ionicons name="people-outline" size={56} color="rgba(167,139,250,0.4)" />
                <Text style={styles.placeholderText}>Çevrimiçi kullanıcı yok</Text>
              </View>
            )}

            {publicRooms && publicRooms.map((u: any) => (
              <View key={u.id || u.username} style={styles.userCard}>
                <Image source={{ uri: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || u.username)}&background=2d1b69&color=5eead4` }}
                  style={styles.userAvatar} />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{u.displayName || u.username}</Text>
                  <Text style={styles.userRole}>{u.role || 'Üye'}</Text>
                </View>
                <View style={styles.onlineDot} />
              </View>
            ))}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <BottomNavigation />
    </View>
  );
}

/* ── Kart gradientleri ── */
const CARD_GRADIENTS: [string, string][] = [
  ['#8b5cf6', '#a78bfa'],
  ['#5eead4', '#38b2ac'],
  ['#ec4899', '#f43f5e'],
  ['#f59e0b', '#ef4444'],
  ['#6366f1', '#818cf8'],
];

/* ═══════════════════════════════════════════════════════════
   STİLLER — Mockup tarzı koyu mor arka plan, turkuaz vurgu
   ═══════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#c8c0da' },

  /* ── IŞIK ORBS — Zenginleştirilmiş ── */
  orbTopRight: {
    position: 'absolute', top: -70, right: -60,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(94,234,212,0.2)',
  },
  orbBottomLeft: {
    position: 'absolute', bottom: 50, left: -90,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(167,139,250,0.18)',
  },

  /* ── HEADER ── */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  headerBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 4,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLogo: { width: width * 0.5, height: 30 },
  headerSlogan: { fontSize: 10, fontWeight: '500', color: '#475569', marginTop: 2, letterSpacing: 2 },

  /* ── SEKMELER — Glass ── */
  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 16, padding: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 13, alignItems: 'center' },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#4ecdc4', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#1e293b', fontWeight: '700' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 6 },

  /* ── ODA KARTI — Glassmorphism ── */
  roomCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 20, padding: 15, gap: 12,
    marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14, shadowRadius: 20, elevation: 8,
  },
  roomIconWrap: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
  },
  roomInfo: { flex: 1 },
  roomNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  roomName: { fontSize: 15, fontWeight: '700', color: '#1e293b', flexShrink: 1 },
  roomAnnounce: { fontSize: 11, fontWeight: '500', color: '#64748b', marginBottom: 4 },
  roomMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  roomLiveDot: {
    width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#22c55e',
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 6, elevation: 2,
  },
  roomMetaText: { fontSize: 10, fontWeight: '600', color: '#475569' },

  /* ── KATIL BUTONU — Gradient + Glow ── */
  joinBtnWrap: {},
  joinGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
    shadowColor: '#4ecdc4', shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.55, shadowRadius: 14, elevation: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  joinText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  /* ── KULLANICI KARTI — Glass ── */
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 16, padding: 12, gap: 12,
    marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: 'rgba(94,234,212,0.3)',
    shadowColor: '#5eead4', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 6, elevation: 2,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  userRole: { fontSize: 11, fontWeight: '500', color: '#64748b', marginTop: 1 },
  onlineDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 6, elevation: 4,
  },

  /* ── PLACEHOLDER ── */
  placeholder: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  placeholderText: { fontSize: 15, fontWeight: '600', color: '#475569', marginTop: 12 },
  placeholderSub: { fontSize: 12, fontWeight: '500', color: '#64748b', marginTop: 4 },
  retryBtn: {
    marginTop: 12, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: 'rgba(94,234,212,0.18)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(94,234,212,0.35)',
    shadowColor: '#5eead4', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 2,
  },
  retryText: { color: '#0d9488', fontWeight: '700', fontSize: 13 },

  /* ── ALT NAVİGASYON — Premium Glass ── */
  bottomNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 18,
  },
  bottomNavItem: { alignItems: 'center', gap: 2, paddingVertical: 4, minWidth: 56 },
  bottomNavLabel: { fontSize: 9, fontWeight: '600', color: '#94a3b8' },
  bottomNavLabelActive: { color: '#4f46e5', fontWeight: '700' },
  bottomNavCenter: { alignItems: 'center', marginTop: -22 },
  bottomNavCenterGrad: {
    width: 56, height: 56, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4ecdc4', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55, shadowRadius: 20, elevation: 14,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  bottomNavCenterLabel: { fontSize: 9, fontWeight: '800', color: '#0d9488', marginTop: 4 },
});
