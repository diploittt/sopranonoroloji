import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Platform, Dimensions,
  StyleSheet, Image, RefreshControl, ActivityIndicator, Alert,
  TextInput, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import api from '../services/api';
import AppBackground from '../components/shared/AppBackground';
import BottomNav from '../components/shared/BottomNav';

const { width } = Dimensions.get('window');

const GRADS: [string, string][] = [
  ['#8b5cf6', '#6366f1'],
  ['#06b6d4', '#0ea5e9'],
  ['#ec4899', '#f43f5e'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#059669'],
];

/* ═══════════════════════════════════════════════════════════
   HOME EKRANI — KOYU TEMA
   ═══════════════════════════════════════════════════════════ */
export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [directLoading, setDirectLoading] = useState<string | null>(null);

  // Üye girişi modal
  const [memberEntry, setMemberEntry] = useState<{ tenantId: string; room: any; tenantRooms: any[] } | null>(null);
  const [mTab, setMTab] = useState<'login' | 'register'>('login');
  const [mEmail, setMEmail] = useState('');
  const [mPassword, setMPassword] = useState('');
  const [mUsername, setMUsername] = useState('');
  const [mGender, setMGender] = useState<'male' | 'female'>('male');
  const [mLoading, setMLoading] = useState(false);

  const {
    publicRooms, roomsLoading, roomsError, fetchPublicRooms,
    exploreTenants: rawTenants, exploreLoading, fetchExploreData,
    loginWithSocket, user,
  } = useStore();
  const exploreTenants = Array.isArray(rawTenants) ? rawTenants : [];

  const allLiveRooms = [
    ...publicRooms,
    ...exploreTenants.flatMap((t: any) => (Array.isArray(t.rooms) ? t.rooms : [])),
  ].filter((r: any) => r && r.name);

  useEffect(() => { fetchPublicRooms(); fetchExploreData(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPublicRooms(), fetchExploreData()]);
    setRefreshing(false);
  }, []);

  const enterRoom = (room: any) => {
    router.push({ pathname: '/room', params: { roomId: room.slug || room.id } } as any);
  };

  const directEnterRoom = async (tenantId: string, room: any, tenantRooms: any[]) => {
    const roomId = room.slug || room.id;
    if (user && user.tenantId === tenantId) {
      router.push({ pathname: '/room', params: { roomId, tenantRooms: JSON.stringify(tenantRooms) } } as any);
      return;
    }
    setDirectLoading(roomId);
    try {
      const guestName = `Misafir_${Math.floor(Math.random() * 9000 + 1000)}`;
      const { data } = await api.post('/auth/guest', { username: guestName, gender: 'male', tenantId });
      loginWithSocket(data.access_token, data.user, tenantId);
      router.push({ pathname: '/room', params: { roomId, tenantRooms: JSON.stringify(tenantRooms) } } as any);
    } catch (err: any) {
      Alert.alert('Hata', err?.response?.data?.message || err?.message || 'Giriş başarısız.');
    } finally { setDirectLoading(null); }
  };

  const handleMemberEntry = async () => {
    if (!memberEntry || !mEmail.trim() || !mPassword.trim()) return;
    setMLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username: mEmail.trim(), password: mPassword.trim(), tenantId: memberEntry.tenantId });
      loginWithSocket(data.access_token, data.user, memberEntry.tenantId);
      const roomId = memberEntry.room.slug || memberEntry.room.id;
      const tenantRooms = memberEntry.tenantRooms;
      setMemberEntry(null); setMEmail(''); setMPassword('');
      router.push({ pathname: '/room', params: { roomId, tenantRooms: JSON.stringify(tenantRooms) } } as any);
    } catch (err: any) {
      Alert.alert('Hata', err?.response?.data?.message || err?.message || 'Giriş başarısız.');
    } finally { setMLoading(false); }
  };

  const handleRegister = async () => {
    if (!memberEntry || !mUsername.trim() || !mEmail.trim() || !mPassword.trim()) return;
    setMLoading(true);
    try {
      const { data } = await api.post('/auth/register', { username: mUsername.trim(), email: mEmail.trim(), password: mPassword.trim(), gender: mGender, tenantId: memberEntry.tenantId });
      loginWithSocket(data.access_token, data.user, memberEntry.tenantId);
      const roomId = memberEntry.room.slug || memberEntry.room.id;
      const tenantRooms = memberEntry.tenantRooms;
      setMemberEntry(null); setMEmail(''); setMPassword(''); setMUsername('');
      router.push({ pathname: '/room', params: { roomId, tenantRooms: JSON.stringify(tenantRooms) } } as any);
    } catch (err: any) {
      Alert.alert('Hata', err?.response?.data?.message || err?.message || 'Kayıt başarısız.');
    } finally { setMLoading(false); }
  };

  const toggleTenant = (tenantId: string) => setExpandedTenant(prev => prev === tenantId ? null : tenantId);

  return (
    <AppBackground>
      {/* HEADER */}
      <View style={st.header}>
        <TouchableOpacity style={st.headerBtn} onPress={() => router.push('/explore' as any)}>
          <Ionicons name="search" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Image source={require('../assets/images/logo.png')} style={st.headerLogo} resizeMode="contain" />
        </View>
        <TouchableOpacity style={st.headerBtn} onPress={() => router.push('/profile' as any)}>
          <Ionicons name="person-circle-outline" size={24} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      {/* İÇERİK */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a78bfa" />}>

        {(roomsLoading || exploreLoading) && !refreshing && (
          <View style={{ alignItems: 'center', paddingVertical: 50 }}>
            <ActivityIndicator size="large" color="#a78bfa" />
          </View>
        )}

        {roomsError && !roomsLoading && (
          <View style={{ alignItems: 'center', paddingVertical: 30 }}>
            <Ionicons name="cloud-offline-outline" size={40} color="#ef4444" />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#ef4444', marginTop: 8 }}>{roomsError}</Text>
            <TouchableOpacity onPress={() => { fetchPublicRooms(); fetchExploreData(); }}
              style={{ marginTop: 12, backgroundColor: '#8b5cf6', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 🔥 CANLI ODALAR */}
        {allLiveRooms.length > 0 && (
          <>
            <View style={st.secRow}>
              <View style={st.secIconWrap}><Ionicons name="radio" size={14} color="#a78bfa" /></View>
              <Text style={st.secTitle}>Canlı Odalar</Text>
              <View style={st.secBadge}>
                <View style={st.secDotLive} />
                <Text style={st.secBadgeText}>{allLiveRooms.length} aktif</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 10 }}>
              {allLiveRooms.map((room: any, i: number) => {
                const grad = GRADS[i % GRADS.length];
                return (
                  <TouchableOpacity key={room.id || i} activeOpacity={0.88} onPress={() => enterRoom(room)}>
                    <LinearGradient colors={grad} style={st.liveCard}>
                      <View style={st.liveBadge}>
                        <View style={st.liveDot} />
                        <Text style={st.liveBadgeText}>CANLI</Text>
                      </View>
                      <View style={[st.liveCircle, { top: -10, right: -10 }]} />
                      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                        <Text style={st.liveName} numberOfLines={1}>{room.name}</Text>
                        <View style={st.liveMetaRow}>
                          <Ionicons name="people" size={12} color="rgba(255,255,255,0.85)" />
                          <Text style={st.liveMeta}>{room.participantCount || 0} kişi</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {allLiveRooms.length === 0 && !roomsLoading && !exploreLoading && !roomsError && (
          <View style={st.emptyWrap}>
            <View style={st.emptyIconWrap}>
              <Ionicons name="radio-outline" size={36} color="rgba(139,92,246,0.4)" />
            </View>
            <Text style={st.emptyTitle}>Henüz canlı oda yok</Text>
            <Text style={st.emptySub}>Bir topluluğa katılarak başlayın</Text>
          </View>
        )}

        {/* 🌐 TOPLULUKLAR */}
        {exploreTenants.length > 0 && (
          <>
            <View style={[st.secRow, { marginTop: 18 }]}>
              <View style={[st.secIconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                <Ionicons name="globe" size={14} color="#10b981" />
              </View>
              <Text style={st.secTitle}>Topluluklar</Text>
              <View style={[st.secBadge, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                <Text style={[st.secBadgeText, { color: '#10b981' }]}>{exploreTenants.length}</Text>
              </View>
            </View>

            {exploreTenants.map((tenant: any, i: number) => {
              const rooms = Array.isArray(tenant.rooms) ? tenant.rooms : [];
              const totalOnline = rooms.reduce((s: number, r: any) => s + (r.onlineUsers || 0), 0);
              const grad = GRADS[i % GRADS.length];
              const isExpanded = expandedTenant === tenant.id;

              return (
                <View key={tenant.id}>
                  <TouchableOpacity activeOpacity={0.88} onPress={() => toggleTenant(tenant.id)}
                    style={[st.comCard, isExpanded && st.comCardExpanded]}>
                    {tenant.logoUrl ? (
                      <Image source={{ uri: tenant.logoUrl }} style={st.comLogoImg} />
                    ) : (
                      <LinearGradient colors={grad} style={st.comAvatar}>
                        <Ionicons name="storefront" size={22} color="#fff" />
                      </LinearGradient>
                    )}
                    <View style={st.comInfo}>
                      <Text style={st.comName} numberOfLines={1}>{tenant.name}</Text>
                      <View style={st.comMeta}>
                        <Ionicons name="chatbubbles" size={11} color="#a78bfa" />
                        <Text style={st.comMetaText}>{rooms.length} oda</Text>
                        <View style={st.comDot} />
                        <View style={st.comOnlineDot} />
                        <Text style={[st.comMetaText, { color: '#22c55e' }]}>{totalOnline} çevrimiçi</Text>
                      </View>
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>

                  {isExpanded && rooms.length > 0 && (
                    <View style={st.roomsExpanded}>
                      {rooms.map((room: any, ri: number) => {
                        const rGrad = GRADS[ri % GRADS.length];
                        const online = room.onlineUsers || 0;
                        const isRoomLoading = directLoading === (room.slug || room.id);
                        return (
                          <View key={room.id} style={st.roomRow}>
                            <LinearGradient colors={rGrad} style={st.roomDot}>
                              <Ionicons name="chatbubble" size={10} color="#fff" />
                            </LinearGradient>
                            <View style={{ flex: 1 }}>
                              <Text style={st.roomName} numberOfLines={1}>{room.name}</Text>
                              <Text style={st.roomOnline}>{online > 0 ? `${online} kişi çevrimiçi` : 'Boş oda'}</Text>
                            </View>
                            <TouchableOpacity activeOpacity={0.85}
                              onPress={() => directEnterRoom(tenant.id, room, rooms)}
                              disabled={!!directLoading} style={st.roomDirectBtn}>
                              {isRoomLoading
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <><Ionicons name="enter-outline" size={13} color="#fff" /><Text style={st.roomDirectText}>Gir</Text></>
                              }
                            </TouchableOpacity>
                            <TouchableOpacity activeOpacity={0.85}
                              onPress={() => {
                                if (user && user.tenantId === tenant.id) {
                                  router.push({ pathname: '/room', params: { roomId: room.slug || room.id, tenantRooms: JSON.stringify(rooms) } } as any);
                                } else {
                                  setMemberEntry({ tenantId: tenant.id, room, tenantRooms: rooms });
                                }
                              }}
                              style={st.roomMemberBtn}>
                              <Ionicons name="key-outline" size={13} color="#a78bfa" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {isExpanded && rooms.length === 0 && (
                    <View style={st.roomsExpanded}>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', paddingVertical: 12 }}>
                        Henüz oda oluşturulmamış
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* CTA */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/create-room' as any)} style={{ marginTop: 18, marginHorizontal: 16 }}>
          <LinearGradient colors={['#8b5cf6', '#6366f1']} style={st.ctaBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={st.ctaDecoCircle} />
            <View style={st.ctaContent}>
              <View style={st.ctaIcon}><Ionicons name="add-circle" size={24} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={st.ctaTitle}>Kendi Topluluğunu Kur</Text>
                <Text style={st.ctaSub}>200₺'den başlayan fiyatlarla</Text>
              </View>
              <View style={st.ctaArrow}><Ionicons name="arrow-forward" size={16} color="#8b5cf6" /></View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ═══ ÜYE GİRİŞİ MODAL — Koyu Tema ═══ */}
      <Modal visible={!!memberEntry} transparent animationType="fade" onRequestClose={() => setMemberEntry(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setMemberEntry(null)} style={st.modalOverlay}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={st.modalCard}>
            <View style={st.modalHandle} />
            <Text style={st.modalTitle}>Üye Girişi</Text>
            <Text style={st.modalRoom}>{memberEntry?.room?.name}</Text>

            <View style={st.mTabBar}>
              <TouchableOpacity onPress={() => setMTab('login')} style={[st.mTab, mTab === 'login' && st.mTabActive]}>
                <Text style={[st.mTabText, mTab === 'login' && st.mTabTextActive]}>Giriş</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMTab('register')} style={[st.mTab, mTab === 'register' && st.mTabActive]}>
                <Text style={[st.mTabText, mTab === 'register' && st.mTabTextActive]}>Üye Ol</Text>
              </TouchableOpacity>
            </View>

            {mTab === 'login' && (
              <>
                <Text style={st.modalLabel}>KULLANICI ADI / E-POSTA</Text>
                <View style={st.modalInputWrap}>
                  <Ionicons name="mail-outline" size={16} color="rgba(255,255,255,0.3)" />
                  <TextInput style={st.modalInput} placeholder="E-posta veya kullanıcı adı"
                    placeholderTextColor="rgba(255,255,255,0.25)" value={mEmail} onChangeText={setMEmail}
                    autoCapitalize="none" keyboardType="email-address" autoFocus />
                </View>
                <Text style={[st.modalLabel, { marginTop: 4 }]}>ŞİFRE</Text>
                <View style={st.modalInputWrap}>
                  <Ionicons name="lock-closed-outline" size={16} color="rgba(255,255,255,0.3)" />
                  <TextInput style={st.modalInput} placeholder="Şifreniz"
                    placeholderTextColor="rgba(255,255,255,0.25)" value={mPassword} onChangeText={setMPassword}
                    secureTextEntry returnKeyType="go" onSubmitEditing={handleMemberEntry} />
                </View>
                <TouchableOpacity activeOpacity={0.85} disabled={mLoading || !mEmail.trim() || !mPassword.trim()}
                  onPress={handleMemberEntry}
                  style={[st.modalBtn, (!mEmail.trim() || !mPassword.trim() || mLoading) && { opacity: 0.5 }]}>
                  <LinearGradient colors={['#8b5cf6', '#6366f1']} style={st.modalBtnGrad}>
                    {mLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                      <><Ionicons name="key-outline" size={16} color="#fff" /><Text style={st.modalBtnText}>Giriş Yap</Text></>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {mTab === 'register' && (
              <>
                <Text style={st.modalLabel}>KULLANICI ADI</Text>
                <View style={st.modalInputWrap}>
                  <Ionicons name="person-outline" size={16} color="rgba(255,255,255,0.3)" />
                  <TextInput style={st.modalInput} placeholder="Kullanıcı adınız"
                    placeholderTextColor="rgba(255,255,255,0.25)" value={mUsername} onChangeText={setMUsername}
                    autoCapitalize="none" autoFocus />
                </View>
                <Text style={[st.modalLabel, { marginTop: 4 }]}>E-POSTA</Text>
                <View style={st.modalInputWrap}>
                  <Ionicons name="mail-outline" size={16} color="rgba(255,255,255,0.3)" />
                  <TextInput style={st.modalInput} placeholder="E-posta adresiniz"
                    placeholderTextColor="rgba(255,255,255,0.25)" value={mEmail} onChangeText={setMEmail}
                    autoCapitalize="none" keyboardType="email-address" />
                </View>
                <Text style={[st.modalLabel, { marginTop: 4 }]}>ŞİFRE</Text>
                <View style={st.modalInputWrap}>
                  <Ionicons name="lock-closed-outline" size={16} color="rgba(255,255,255,0.3)" />
                  <TextInput style={st.modalInput} placeholder="En az 4 karakter"
                    placeholderTextColor="rgba(255,255,255,0.25)" value={mPassword} onChangeText={setMPassword}
                    secureTextEntry />
                </View>
                <Text style={[st.modalLabel, { marginTop: 4 }]}>CİNSİYET</Text>
                <View style={st.mGenderRow}>
                  <TouchableOpacity style={[st.mGenderBtn, mGender === 'male' && st.mGenderMale]} onPress={() => setMGender('male')}>
                    <Ionicons name="male" size={14} color={mGender === 'male' ? '#38bdf8' : 'rgba(255,255,255,0.3)'} />
                    <Text style={[st.mGenderText, mGender === 'male' && { color: '#38bdf8' }]}>Erkek</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.mGenderBtn, mGender === 'female' && st.mGenderFemale]} onPress={() => setMGender('female')}>
                    <Ionicons name="female" size={14} color={mGender === 'female' ? '#f472b6' : 'rgba(255,255,255,0.3)'} />
                    <Text style={[st.mGenderText, mGender === 'female' && { color: '#f472b6' }]}>Kadın</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity activeOpacity={0.85} disabled={mLoading || !mUsername.trim() || !mEmail.trim() || !mPassword.trim()}
                  onPress={handleRegister}
                  style={[st.modalBtn, { marginTop: 12 }, (!mUsername.trim() || !mEmail.trim() || !mPassword.trim() || mLoading) && { opacity: 0.5 }]}>
                  <LinearGradient colors={['#10b981', '#059669']} style={st.modalBtnGrad}>
                    {mLoading ? <ActivityIndicator color="#fff" size="small" /> : (
                      <><Ionicons name="person-add-outline" size={16} color="#fff" /><Text style={st.modalBtnText}>Üye Ol</Text></>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            <Text style={st.modalNote}>
              {mTab === 'login' ? 'Topluluk hesabınızla giriş yapın' : 'Kayıt olarak bu topluluğun üyesi olun'}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <BottomNav active="home" />
    </AppBackground>
  );
}

/* ═══════════════════════════════════════════════════════════
   STİLLER — KOYU TEMA
   ═══════════════════════════════════════════════════════════ */
const st = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 16, paddingBottom: 6, gap: 10,
  },
  headerBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLogo: { width: 120, height: 30 },

  scroll: { paddingBottom: 16 },

  secRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 10, marginTop: 8 },
  secIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: 'rgba(139,92,246,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  secTitle: { fontSize: 16, fontWeight: '800', color: '#f1f5f9', flex: 1 },
  secBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(139,92,246,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  secDotLive: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  secBadgeText: { fontSize: 10, fontWeight: '700', color: '#a78bfa' },

  liveCard: { width: (width - 52) / 2, height: 140, borderRadius: 18, padding: 14, overflow: 'hidden' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  liveBadgeText: { fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  liveCircle: { position: 'absolute', width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.08)' },
  liveName: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 4 },
  liveMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveMeta: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },

  comCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  comCardExpanded: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0, borderBottomWidth: 0 },
  comLogoImg: { width: 50, height: 50, borderRadius: 14 },
  comAvatar: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  comInfo: { flex: 1 },
  comName: { fontSize: 15, fontWeight: '800', color: '#f1f5f9', marginBottom: 4 },
  comMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  comMetaText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  comDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 2 },
  comOnlineDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#22c55e', marginRight: 1 },

  roomsExpanded: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
    borderWidth: 1, borderTopWidth: 0, borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12, paddingVertical: 6,
  },
  roomRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  roomDot: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  roomName: { fontSize: 13, fontWeight: '700', color: '#f1f5f9' },
  roomOnline: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.35)', marginTop: 1 },
  roomDirectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#8b5cf6', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  roomDirectText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  roomMemberBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(139,92,246,0.1)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
  },

  ctaBanner: { borderRadius: 18, overflow: 'hidden' },
  ctaDecoCircle: { position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)' },
  ctaContent: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  ctaIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  ctaSub: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  ctaArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(139,92,246,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  emptySub: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.3)', marginTop: 4 },

  /* Modal — Koyu Bottom Sheet */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'rgba(16,12,42,0.98)', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderWidth: 1, borderBottomWidth: 0, borderColor: 'rgba(139,92,246,0.1)' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#f1f5f9', textAlign: 'center' },
  modalRoom: { fontSize: 13, fontWeight: '600', color: '#a78bfa', textAlign: 'center', marginTop: 4, marginBottom: 16 },
  modalLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  modalInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 12 },
  modalInput: { flex: 1, fontSize: 15, fontWeight: '500', color: '#f1f5f9' },
  modalBtn: { marginTop: 4 },
  modalBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  modalBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  modalNote: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 10 },

  mTabBar: { flexDirection: 'row', gap: 4, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 3 },
  mTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  mTabActive: { backgroundColor: 'rgba(139,92,246,0.15)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
  mTabText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
  mTabTextActive: { color: '#f1f5f9', fontWeight: '700' },

  mGenderRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  mGenderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  mGenderMale: { backgroundColor: 'rgba(56,189,248,0.08)', borderColor: 'rgba(56,189,248,0.2)' },
  mGenderFemale: { backgroundColor: 'rgba(244,114,182,0.08)', borderColor: 'rgba(244,114,182,0.2)' },
  mGenderText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.35)' },
});
