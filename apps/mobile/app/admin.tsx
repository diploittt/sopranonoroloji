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
  TextInput,
  Animated,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';

const { width } = Dimensions.get('window');

/* ═══════════════════════════════════════════════════════════
   PAKET CONFIG (UI yapılandırması — mock değil)
   ═══════════════════════════════════════════════════════════ */

const PACKAGES = [
  { id: 'basic', name: 'Basic', capacity: '30 Kişi', price: '₺500/ay', color: '#64748b', rooms: 1, features: ['Sesli sohbet', '1 oda', 'Temel destek'] },
  { id: 'pro', name: 'Pro', capacity: '50 Kişi', price: '₺1.200/ay', color: '#6366f1', rooms: 3, features: ['Sesli + görüntülü', '3 oda', 'Öncelikli destek'], popular: true },
  { id: 'premium', name: 'Premium', capacity: '100 Kişi', price: '₺2.500/ay', color: '#f59e0b', rooms: 10, features: ['Tüm özellikler', '10 oda', '7/24 destek', 'Özel domain'] },
];

type TabId = 'dashboard' | 'customers' | 'orders' | 'settings';

/* ═══════════════════════════════════════════════════════════
   STAT KART
   ═══════════════════════════════════════════════════════════ */

function StatCard({ stat, index }: { stat: { label: string; value: string; icon: string; color: string; bg: string; delta: string }; index: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <TouchableOpacity activeOpacity={1}
      onPressIn={() => Animated.spring(scale, { toValue: 0.95, friction: 7, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }).start()}
    >
      <Animated.View style={[st.statCard, { transform: [{ scale }] }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={[st.statIconWrap, { backgroundColor: stat.bg }]}>
            <Ionicons name={stat.icon as any} size={16} color={stat.color} />
          </View>
          <View style={[st.statDelta, { backgroundColor: stat.bg }]}>
            <Text style={[st.statDeltaText, { color: stat.color }]}>{stat.delta}</Text>
          </View>
        </View>
        <Text style={[st.statValue, { color: stat.color, textShadowColor: stat.bg, textShadowRadius: 12 }]}>{stat.value}</Text>
        <Text style={st.statLabel}>{stat.label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD TAB
   ═══════════════════════════════════════════════════════════ */

function DashboardTab() {
  const { adminStats, adminStatsLoading, adminStatsError, fetchAdminStats, orders: storeOrders, ordersLoading, fetchOrders } = useStore();

  useEffect(() => {
    fetchAdminStats();
    fetchOrders();
  }, []);

  // Backend'den veri gelmediyse boş stat kartları göster
  const stats = adminStats ? [
    { label: 'Toplam Müşteri', value: String(adminStats.totalCustomers), icon: 'people', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', delta: '' },
    { label: 'Aktif Oda', value: String(adminStats.activeRooms), icon: 'radio', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', delta: '' },
    { label: 'Online Kullanıcı', value: String(adminStats.onlineUsers), icon: 'pulse', color: '#34d399', bg: 'rgba(52,211,153,0.1)', delta: 'şu an' },
    { label: 'Aylık Gelir', value: `₺${(adminStats.monthlyRevenue / 1000).toFixed(1)}K`, icon: 'wallet', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', delta: '' },
  ] : [
    { label: 'Toplam Müşteri', value: '-', icon: 'people', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', delta: '' },
    { label: 'Aktif Oda', value: '-', icon: 'radio', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', delta: '' },
    { label: 'Online Kullanıcı', value: '-', icon: 'pulse', color: '#34d399', bg: 'rgba(52,211,153,0.1)', delta: '' },
    { label: 'Aylık Gelir', value: '-', icon: 'wallet', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', delta: '' },
  ];

  const pendingOrders = storeOrders.filter((o: any) => o.status === 'pending' || o.status === 'PENDING').length;
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Loading */}
      {adminStatsLoading && (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#fb7185" />
          <Text style={{ marginTop: 12, fontSize: 14, color: '#64748b', fontWeight: '600' }}>Yükleniyor...</Text>
        </View>
      )}
      {/* Error */}
      {adminStatsError && !adminStatsLoading && (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
          <Text style={{ marginTop: 12, fontSize: 14, color: '#ef4444', fontWeight: '600' }}>{adminStatsError}</Text>
          <TouchableOpacity onPress={() => fetchAdminStats()} style={{ marginTop: 16, backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Başlık */}
      <View style={st.sectionHead}>
        <View style={st.sectionIconWrap}>
          <Ionicons name="trending-up" size={16} color="#fb7185" />
        </View>
        <View>
          <Text style={st.sectionTitle}>Genel Bakış</Text>
          <Text style={st.sectionSub}>Canlı istatistikler ve aktiviteler</Text>
        </View>
      </View>

      {/* Stat Grid 2×2 */}
      <View style={st.statGrid}>
        {stats.map((s, i) => <StatCard key={i} stat={s} index={i} />)}
      </View>

      {/* Bekleyen Sipariş Uyarısı */}
      {pendingOrders > 0 && (
        <View style={st.alertCard}>
          <LinearGradient colors={['rgba(251,191,36,0.12)','rgba(251,191,36,0.06)']} style={st.alertGradient}>
            <Ionicons name="alert-circle" size={18} color="#fbbf24" />
            <Text style={st.alertText}><Text style={{ fontWeight: '800', color: '#fbbf24' }}>{pendingOrders}</Text> bekleyen sipariş onayını bekliyor</Text>
            <Ionicons name="chevron-forward" size={14} color="#fbbf24" />
          </LinearGradient>
        </View>
      )}

      {/* Son Aktiviteler — backend'den veri gelene kadar boş */}
      {adminStats && (
        <>
          <View style={st.sectionHead}>
            <Ionicons name="flash" size={14} color="#a78bfa" />
            <Text style={[st.sectionTitle, { fontSize: 13 }]}>Son Aktiviteler</Text>
          </View>
          <View style={st.activityCard}>
            <View style={st.activityRow}>
              <View style={[st.activityIcon, { backgroundColor: 'rgba(52,211,153,0.15)' }]}>
                <Ionicons name="checkmark-circle" size={14} color="#34d399" />
              </View>
              <Text style={st.activityText} numberOfLines={1}>Veriler başarıyla yüklendi</Text>
              <Text style={st.activityTime}>şimdi</Text>
            </View>
          </View>
        </>
      )}

      {/* Hızlı İstatistik Bar */}
      <View style={st.quickStatsBar}>
        <View style={st.quickStatItem}>
          <Text style={st.quickStatValue}>6</Text>
          <Text style={st.quickStatLabel}>Paket</Text>
        </View>
        <View style={st.quickStatDivider} />
        <View style={st.quickStatItem}>
          <Text style={st.quickStatValue}>3</Text>
          <Text style={st.quickStatLabel}>Domain</Text>
        </View>
        <View style={st.quickStatDivider} />
        <View style={st.quickStatItem}>
          <Text style={st.quickStatValue}>99.9%</Text>
          <Text style={st.quickStatLabel}>Uptime</Text>
        </View>
      </View>
    </ScrollView>
  );
}

/* ═══════════════════════════════════════════════════════════
   MÜŞTERİLER TAB — Detay + Düzenleme + Yeni Müşteri
   ═══════════════════════════════════════════════════════════ */

type CustomerView = 'list' | 'detail' | 'new';
type Customer = { id: string; name: string; email: string; domain: string; package: string; rooms: number; users: number; status: string; avatar: string };

const PKG_COLOR: Record<string, string> = { Premium: '#fbbf24', Pro: '#6366f1', Basic: '#64748b' };

function CustomersTab() {
  const [view, setView] = useState<CustomerView>('list');
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'passive'>('all');
  const [pkgFilter, setPkgFilter] = useState<'all' | 'Basic' | 'Pro' | 'Premium'>('all');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', domain: '', package: '' });
  const [newForm, setNewForm] = useState({ name: '', email: '', phone: '', domain: '', package: 'Pro' });

  // ── Store bağlantısı — gerçek API verisi ──
  const { customers: storeCustomers, customersLoading, customersError, fetchCustomers, addCustomer: storeAddCustomer } = useStore();

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Store verisini UI formatına dönüştür
  const customers = storeCustomers.map((c: any) => ({
    id: c.id,
    name: c.name || c.clientName || '',
    email: c.email || '',
    domain: c.domain || (c.slug ? c.slug + '.sopranochat.com' : ''),
    package: c.package || c.packageType || 'Basic',
    rooms: c.roomCount || c.maxRooms || 0,
    users: c.userCount || c.maxUsers || 0,
    status: (c.status || 'active').toLowerCase(),
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || c.clientName || '')}&background=1e293b&color=fb7185&bold=true`,
  }));

  const filtered = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.domain.includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchPkg = pkgFilter === 'all' || c.package === pkgFilter;
    return matchSearch && matchStatus && matchPkg;
  });
  const activeCount = customers.filter(c => c.status === 'active').length;

  const openDetail = (c: any) => { setSelected(c); setView('detail'); setEditing(false); };
  const openEdit = () => { if (!selected) return; setEditForm({ name: selected.name, domain: selected.domain, package: selected.package }); setEditing(true); };
  const saveEdit = async () => {
    if (!selected) return;
    await useStore.getState().updateCustomer(selected.id, { name: editForm.name, domain: editForm.domain, package: editForm.package } as any);
    setEditing(false);
    fetchCustomers(); // Yenile
  };
  const toggleStatus = async () => {
    if (!selected) return;
    const ns = selected.status === 'active' ? 'passive' : 'active';
    await useStore.getState().toggleCustomerStatus(selected.id, ns);
    setSelected((prev: any) => prev ? { ...prev, status: ns } : prev);
    fetchCustomers();
  };
  const deleteCustomer = async () => {
    if (!selected) return;
    await useStore.getState().deleteCustomer(selected.id);
    setSelected(null); setView('list');
    fetchCustomers();
  };
  const createCustomer = async () => {
    const result = await storeAddCustomer({
      clientName: newForm.name,
      email: newForm.email,
      phone: newForm.phone,
      domain: newForm.domain || undefined,
    } as any);
    if (result) {
      setNewForm({ name: '', email: '', phone: '', domain: '', package: 'Pro' });
      setView('list');
      fetchCustomers();
    }
  };

  /* ── YENİ MÜŞTERİ FORMU ── */
  if (view === 'new') return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
      <TouchableOpacity onPress={() => setView('list')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 }}>
        <Ionicons name="arrow-back" size={18} color="#fb7185" />
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#fb7185' }}>Müşterilere Dön</Text>
      </TouchableOpacity>
      <Text style={[st.sectionTitle, { marginBottom: 4 }]}>Yeni Müşteri Ekle</Text>
      <Text style={[st.sectionSub, { marginBottom: 18 }]}>Müşteri bilgilerini girin, sistem otomatik kurulum yapacak</Text>
      {/* Form alanları */}
      {[
        { key: 'name', label: 'Ad Soyad *', icon: 'person', ph: 'Örn: Ahmet Yılmaz' },
        { key: 'email', label: 'E-Posta *', icon: 'mail', ph: 'mail@site.com' },
        { key: 'phone', label: 'Telefon *', icon: 'call', ph: '555 123 45 67' },
        { key: 'domain', label: 'Domain (opsiyonel)', icon: 'globe', ph: 'orneksite.com' },
      ].map(f => (
        <View key={f.key} style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</Text>
          <View style={st.searchDark}>
            <Ionicons name={f.icon as any} size={16} color="#475569" />
            <TextInput style={st.searchDarkInput} placeholder={f.ph} placeholderTextColor="#475569" value={(newForm as any)[f.key]} onChangeText={v => setNewForm(p => ({ ...p, [f.key]: v }))} />
          </View>
        </View>
      ))}
      {/* Paket Seçimi */}
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Paket Seçimi</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
        {PACKAGES.map(p => (
          <TouchableOpacity key={p.id} onPress={() => setNewForm(prev => ({ ...prev, package: p.name }))} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: newForm.package === p.name ? p.color + '15' : 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: newForm.package === p.name ? p.color + '40' : 'rgba(255,255,255,0.06)', alignItems: 'center' }} activeOpacity={0.7}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: newForm.package === p.name ? p.color : '#64748b' }}>{p.name}</Text>
            <Text style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>{p.capacity}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Oluştur butonu */}
      <TouchableOpacity onPress={createCustomer} activeOpacity={0.8} disabled={!newForm.name || !newForm.email || !newForm.phone}>
        <LinearGradient colors={['#6366f1','#4f46e5']} style={{ paddingVertical: 14, borderRadius: 14, alignItems: 'center', opacity: (!newForm.name || !newForm.email || !newForm.phone) ? 0.4 : 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>⚡ Müşteriyi Oluştur</Text>
        </LinearGradient>
      </TouchableOpacity>
      <Text style={{ fontSize: 9, color: '#475569', textAlign: 'center', marginTop: 10 }}>Sistem otomatik: subdomain üretir • panel açar • login ekranı verir</Text>
    </ScrollView>
  );

  /* ── MÜŞTERİ DETAY ── */
  if (view === 'detail' && selected) return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
      <TouchableOpacity onPress={() => { setView('list'); setEditing(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 }}>
        <Ionicons name="arrow-back" size={18} color="#fb7185" />
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#fb7185' }}>Müşterilere Dön</Text>
      </TouchableOpacity>

      {editing ? (
        /* ── DÜZENLEME MODU ── */
        <>
          <View style={[st.customerCard, { flexDirection: 'column', alignItems: 'stretch', gap: 14 }]}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 1 }}>✏️ Müşteri Düzenle</Text>
            {[
              { key: 'name', label: 'Ad Soyad', icon: 'person' },
              { key: 'domain', label: 'Domain', icon: 'globe' },
            ].map(f => (
              <View key={f.key}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#64748b', marginBottom: 4, textTransform: 'uppercase' }}>{f.label}</Text>
                <View style={[st.searchDark, { marginBottom: 0 }]}>
                  <Ionicons name={f.icon as any} size={14} color="#475569" />
                  <TextInput style={st.searchDarkInput} value={(editForm as any)[f.key]} onChangeText={v => setEditForm(p => ({ ...p, [f.key]: v }))} />
                </View>
              </View>
            ))}
            <View>
              <Text style={{ fontSize: 9, fontWeight: '700', color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>Paket Değiştir</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {PACKAGES.map(p => (
                  <TouchableOpacity key={p.id} onPress={() => setEditForm(prev => ({ ...prev, package: p.name }))} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: editForm.package === p.name ? p.color + '15' : 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: editForm.package === p.name ? p.color + '40' : 'rgba(255,255,255,0.06)', alignItems: 'center' }} activeOpacity={0.7}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: editForm.package === p.name ? p.color : '#475569' }}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setEditing(false)} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' }} activeOpacity={0.7}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#94a3b8' }}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} activeOpacity={0.8} style={{ flex: 2, borderRadius: 10, overflow: 'hidden' }}>
                <LinearGradient colors={['#6366f1','#4f46e5']} style={{ paddingVertical: 12, alignItems: 'center', borderRadius: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>💾 Kaydet</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
        /* ── DETAY GÖRÜNÜMÜ ── */
        <>
          {/* Profil Kartı */}
          <View style={[st.customerCard, { flexDirection: 'column', alignItems: 'center', padding: 22, gap: 8 }]}>
            <Image source={{ uri: selected.avatar }} style={{ width: 64, height: 64, borderRadius: 22, borderWidth: 2, borderColor: (PKG_COLOR[selected.package] || '#64748b') + '40' }} />
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff' }}>{selected.name}</Text>
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#64748b' }}>{selected.email}</Text>
            <View style={[st.statusBadge, selected.status === 'active' ? st.statusActive : st.statusPassive, { paddingHorizontal: 10, paddingVertical: 4 }]}>
              <View style={[st.statusDot, { backgroundColor: selected.status === 'active' ? '#34d399' : '#94a3b8' }]} />
              <Text style={[st.statusText, { color: selected.status === 'active' ? '#34d399' : '#94a3b8', fontSize: 10 }]}>{selected.status === 'active' ? 'Aktif' : 'Pasif'}</Text>
            </View>
          </View>

          {/* Bilgi Kartları */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            {[
              { label: 'Paket', value: selected.package, icon: 'shield', color: PKG_COLOR[selected.package] || '#64748b' },
              { label: 'Odalar', value: String(selected.rooms), icon: 'radio', color: '#a78bfa' },
              { label: 'Kullanıcı', value: String(selected.users), icon: 'people', color: '#38bdf8' },
            ].map((d, i) => (
              <View key={i} style={[st.statCard, { flex: 1, padding: 12, alignItems: 'center' }]}>
                <Ionicons name={d.icon as any} size={16} color={d.color} />
                <Text style={{ fontSize: 18, fontWeight: '900', color: d.color, marginVertical: 2 }}>{d.value}</Text>
                <Text style={{ fontSize: 8, fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>{d.label}</Text>
              </View>
            ))}
          </View>

          {/* Domain + Email */}
          <View style={[st.customerCard, { gap: 8 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="globe" size={14} color="#38bdf8" />
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Domain</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#38bdf8' }}>{selected.domain}</Text>
            <View style={{ height: 0.5, backgroundColor: 'rgba(255,255,255,0.04)', marginVertical: 2 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="mail" size={14} color="#a78bfa" />
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Email</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#a78bfa' }}>{selected.email}</Text>
          </View>

          {/* Aksiyonlar */}
          <View style={{ gap: 8, marginTop: 4 }}>
            {/* Panele Git */}
            <TouchableOpacity activeOpacity={0.8}>
              <LinearGradient colors={['#6366f1','#4f46e5']} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 }}>
                <Ionicons name="open-outline" size={16} color="#fff" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>Panele Git</Text>
              </LinearGradient>
            </TouchableOpacity>
            {/* Paket Değiştir + Düzenle */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={openEdit} activeOpacity={0.8} style={{ flex: 1 }}>
                <View style={[st.settingRow, { justifyContent: 'center', gap: 6 }]}>
                  <Ionicons name="pencil" size={14} color="#a78bfa" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#a78bfa' }}>Düzenle</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={openEdit} activeOpacity={0.8} style={{ flex: 1 }}>
                <View style={[st.settingRow, { justifyContent: 'center', gap: 6 }]}>
                  <Ionicons name="swap-horizontal" size={14} color="#fbbf24" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fbbf24' }}>Paket Değiştir</Text>
                </View>
              </TouchableOpacity>
            </View>
            {/* Pasife Al + Sil */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={toggleStatus} activeOpacity={0.8} style={{ flex: 1 }}>
                <View style={[st.settingRow, { justifyContent: 'center', gap: 6, borderColor: selected.status === 'active' ? 'rgba(239,68,68,0.15)' : 'rgba(52,211,153,0.15)' }]}>
                  <Ionicons name={selected.status === 'active' ? 'pause-circle' : 'play-circle'} size={14} color={selected.status === 'active' ? '#ef4444' : '#34d399'} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: selected.status === 'active' ? '#ef4444' : '#34d399' }}>{selected.status === 'active' ? 'Pasif Yap' : 'Aktif Et'}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={deleteCustomer} activeOpacity={0.8} style={{ flex: 1 }}>
                <View style={[st.settingRow, { justifyContent: 'center', gap: 6, borderColor: 'rgba(239,68,68,0.15)', backgroundColor: 'rgba(239,68,68,0.04)' }]}>
                  <Ionicons name="trash" size={14} color="#ef4444" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#ef4444' }}>Sil</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );

  /* ── MÜŞTERİ LİSTESİ ── */
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View>
          <Text style={st.sectionTitle}>Müşteriler</Text>
          <Text style={st.sectionSub}>{customers.length} kayıtlı • {activeCount} aktif</Text>
        </View>
        <TouchableOpacity onPress={() => setView('new')} activeOpacity={0.8}>
          <LinearGradient colors={['#fb7185','#e11d48']} style={st.addBtnGrad}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={st.addBtnText}>Yeni Müşteri</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Durum Filtreleri */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
        {([['all', 'Tümü'], ['active', 'Aktif'], ['passive', 'Pasif']] as const).map(([key, label]) => (
          <TouchableOpacity key={key} onPress={() => setStatusFilter(key)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: statusFilter === key ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)', borderWidth: 0.5, borderColor: statusFilter === key ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)' }} activeOpacity={0.7}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: statusFilter === key ? '#818cf8' : '#475569' }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Paket Filtreleri */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
        {([['all', 'Tüm Paketler', '#64748b'], ['Basic', 'Basic', '#64748b'], ['Pro', 'Pro', '#6366f1'], ['Premium', 'Premium', '#fbbf24']] as const).map(([key, label, color]) => (
          <TouchableOpacity key={key} onPress={() => setPkgFilter(key as any)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: pkgFilter === key ? color + '18' : 'transparent', borderWidth: 0.5, borderColor: pkgFilter === key ? color + '40' : 'rgba(255,255,255,0.04)' }} activeOpacity={0.7}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: pkgFilter === key ? color : '#334155' }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Arama */}
      <View style={st.searchDark}>
        <Ionicons name="search" size={16} color="#475569" />
        <TextInput style={st.searchDarkInput} placeholder="Müşteri ara..." placeholderTextColor="#475569" value={search} onChangeText={setSearch} />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color="#475569" /></TouchableOpacity>}
      </View>

      {filtered.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <Ionicons name="search" size={32} color="#334155" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', marginTop: 8 }}>Sonuç bulunamadı</Text>
        </View>
      ) : filtered.map(c => (
        <TouchableOpacity key={c.id} activeOpacity={0.8} onPress={() => openDetail(c)}>
          <View style={st.customerCard}>
            <Image source={{ uri: c.avatar }} style={[st.customerAvatar, { borderColor: (PKG_COLOR[c.package] || '#64748b') + '30' }]} />
            <View style={st.customerInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={st.customerName}>{c.name}</Text>
                <View style={[st.statusBadge, c.status === 'active' ? st.statusActive : st.statusPassive]}>
                  <View style={[st.statusDot, { backgroundColor: c.status === 'active' ? '#34d399' : '#94a3b8' }]} />
                  <Text style={[st.statusText, { color: c.status === 'active' ? '#34d399' : '#94a3b8' }]}>{c.status === 'active' ? 'Aktif' : 'Pasif'}</Text>
                </View>
              </View>
              <Text style={st.customerDomain}>{c.email} • {c.domain}</Text>
              <View style={st.customerMeta}>
                <View style={st.customerMetaChip}>
                  <Ionicons name="shield" size={10} color={PKG_COLOR[c.package] || '#64748b'} />
                  <Text style={[st.customerMetaText, { color: PKG_COLOR[c.package] || '#64748b' }]}>{c.package}</Text>
                </View>
                <View style={st.customerMetaChip}>
                  <Ionicons name="radio" size={10} color="#a78bfa" />
                  <Text style={st.customerMetaText}>{c.rooms} oda</Text>
                </View>
                <View style={st.customerMetaChip}>
                  <Ionicons name="people" size={10} color="#38bdf8" />
                  <Text style={st.customerMetaText}>{c.users} kişi</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#475569" />
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

/* ═══════════════════════════════════════════════════════════
   SİPARİŞLER TAB
   ═══════════════════════════════════════════════════════════ */

function OrdersTab() {
  // ── Store bağlantısı — gerçek API verisi ──
  const { orders: storeOrders, ordersLoading, ordersError, fetchOrders, updateOrderStatus } = useStore();

  useEffect(() => {
    fetchOrders();
  }, []);

  // Store verisini UI formatına dönüştür
  const orders = storeOrders.map((o: any) => ({
    id: o.id,
    name: o.clientName || '',
    package: o.package || o.packageName || '',
    amount: typeof o.amount === 'number' ? `₺${o.amount.toLocaleString('tr-TR')}` : (o.amount || ''),
    status: (o.status || 'pending').toLowerCase(),
    date: o.createdAt ? new Date(o.createdAt).toLocaleDateString('tr-TR') : '',
    email: o.email || '',
    phone: o.phone || '',
  }));

  const handleUpdateStatus = async (id: string, status: string) => {
    await updateOrderStatus(id, status);
    fetchOrders(); // Yenile
  };
  const statusConfig = {
    pending: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)', label: 'Bekliyor' },
    approved: { color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', label: 'Onaylandı' },
    rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', label: 'Reddedildi' },
  };



  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Loading */}
      {ordersLoading && (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#fb7185" />
          <Text style={{ marginTop: 12, fontSize: 14, color: '#64748b', fontWeight: '600' }}>Siparişler yükleniyor...</Text>
        </View>
      )}
      {/* Error */}
      {ordersError && !ordersLoading && (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
          <Text style={{ marginTop: 12, fontSize: 14, color: '#ef4444', fontWeight: '600' }}>{ordersError}</Text>
          <TouchableOpacity onPress={() => fetchOrders()} style={{ marginTop: 16, backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={{ marginBottom: 16 }}>
        <Text style={st.sectionTitle}>Siparişler</Text>
        <Text style={st.sectionSub}>{orders.filter((o: any) => o.status === 'pending').length} bekleyen sipariş</Text>
      </View>

      {/* Empty */}
      {!ordersLoading && !ordersError && orders.length === 0 && (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Ionicons name="receipt-outline" size={48} color="#94a3b8" />
          <Text style={{ marginTop: 12, fontSize: 15, color: '#64748b', fontWeight: '700' }}>Henüz sipariş yok</Text>
        </View>
      )}

      {orders.map(o => {
        const cfg = statusConfig[o.status as keyof typeof statusConfig];
        return (
          <View key={o.id} style={st.orderCard}>
            {/* Üst kısım */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View>
                <Text style={st.orderName}>{o.name}</Text>
                <Text style={st.orderEmail}>{o.email}</Text>
              </View>
              <View style={[st.orderStatusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                <Text style={[st.orderStatusText, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </View>

            {/* Detaylar */}
            <View style={st.orderDetails}>
              <View style={st.orderDetailItem}>
                <Ionicons name="shield" size={11} color="#a78bfa" />
                <Text style={st.orderDetailText}>{o.package}</Text>
              </View>
              <View style={st.orderDetailItem}>
                <Ionicons name="wallet" size={11} color="#fbbf24" />
                <Text style={st.orderDetailText}>{o.amount}</Text>
              </View>
              <View style={st.orderDetailItem}>
                <Ionicons name="time" size={11} color="#64748b" />
                <Text style={st.orderDetailText}>{o.date}</Text>
              </View>
            </View>

            {/* Aksiyon butonları */}
            {o.status === 'pending' && (
              <View style={st.orderActions}>
                <TouchableOpacity style={st.orderRejectBtn} onPress={() => handleUpdateStatus(o.id, 'rejected')} activeOpacity={0.8}>
                  <Ionicons name="close" size={14} color="#ef4444" />
                  <Text style={st.orderRejectText}>Reddet</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.orderApproveBtn} onPress={() => handleUpdateStatus(o.id, 'approved')} activeOpacity={0.8}>
                  <LinearGradient colors={['#22c55e','#16a34a']} style={st.orderApproveBtnGrad}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                    <Text style={st.orderApproveText}>Onayla</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

/* ═══════════════════════════════════════════════════════════
   AYARLAR TAB
   ═══════════════════════════════════════════════════════════ */

function SettingsTab() {
  const router = useRouter();

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Profil */}
      <View style={st.profileCard}>
        <View style={st.profileAvatar}>
          <Text style={st.profileAvatarText}>S</Text>
        </View>
        <View>
          <Text style={st.profileName}>Soprano Owner</Text>
          <Text style={st.profileRole}>Root Administrator</Text>
        </View>
      </View>

      {/* Paket Sistemi */}
      <View style={{ marginBottom: 20 }}>
        <View style={st.sectionHead}>
          <Ionicons name="layers" size={14} color="#a78bfa" />
          <Text style={[st.sectionTitle, { fontSize: 13 }]}>Paket Sistemi</Text>
        </View>
        {PACKAGES.map(pkg => (
          <View key={pkg.id} style={[st.packageCard, pkg.popular && st.packageCardPopular]}>
            {pkg.popular && (
              <View style={st.packagePopularBadge}>
                <Text style={st.packagePopularText}>⭐ En Popüler</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={[st.packageName, { color: pkg.color }]}>{pkg.name}</Text>
                <Text style={st.packageCapacity}>{pkg.capacity} • {pkg.rooms} oda</Text>
              </View>
              <Text style={[st.packagePrice, { color: pkg.color }]}>{pkg.price}</Text>
            </View>
            <View style={st.packageFeatures}>
              {pkg.features.map((f, i) => (
                <View key={i} style={st.packageFeatureRow}>
                  <Ionicons name="checkmark-circle" size={12} color={pkg.color} />
                  <Text style={st.packageFeatureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Ayar Menüleri */}
      <View style={{ marginBottom: 20 }}>
        <View style={st.sectionHead}>
          <Ionicons name="settings" size={14} color="#64748b" />
          <Text style={[st.sectionTitle, { fontSize: 13 }]}>Sistem Ayarları</Text>
        </View>
        {[
          { icon: 'globe', label: 'Domain Yönetimi', sub: 'CNAME / Embed ayarları', color: '#38bdf8' },
          { icon: 'people', label: 'HQ Üyeler', sub: 'Admin yardımcıları', color: '#a78bfa' },
          { icon: 'document-text', label: 'Sistem Logları', sub: 'Event izleme', color: '#64748b' },
          { icon: 'mail', label: 'İletişim Mesajları', sub: 'Müşteri mesajları', color: '#fbbf24' },
        ].map((item, i) => (
          <TouchableOpacity key={i} activeOpacity={0.7}>
            <View style={st.settingRow}>
              <View style={[st.settingIcon, { backgroundColor: item.color + '12' }]}>
                <Ionicons name={item.icon as any} size={16} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.settingLabel}>{item.label}</Text>
                <Text style={st.settingSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#334155" />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Çıkış */}
      <TouchableOpacity style={st.logoutBtn} activeOpacity={0.7} onPress={() => router.push('/home' as any)}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={st.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANA EKRAN
   ═══════════════════════════════════════════════════════════ */

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const { orders: storeOrders, fetchOrders } = useStore();

  useEffect(() => {
    fetchOrders();
  }, []);

  const pendingCount = storeOrders.filter((o: any) => o.status === 'pending' || o.status === 'PENDING').length;

  const TABS: { id: TabId; icon: string; label: string; badge?: number }[] = [
    { id: 'dashboard', icon: 'grid', label: 'Dashboard' },
    { id: 'customers', icon: 'people', label: 'Müşteriler' },
    { id: 'orders', icon: 'cart', label: 'Siparişler', badge: pendingCount },
    { id: 'settings', icon: 'settings', label: 'Ayarlar' },
  ];

  return (
    <View style={st.container}>
      {/* Arka plan */}
      <LinearGradient colors={['#0f172a','#0a0e1a','#020617']} style={StyleSheet.absoluteFill as any} />
      <View style={st.orbDark1} />
      <View style={st.orbDark2} />

      {/* ── ÜST BAR ── */}
      <View style={st.topBar}>
        <View>
          <Text style={st.topBarLabel}>OWNER PANEL</Text>
          <Text style={st.topBarTitle}>
            <Text style={st.logoSoprano}>Soprano</Text>
            <Text style={st.logoAdmin}>Admin</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity style={st.topBarIconBtn}>
            <Ionicons name="notifications-outline" size={20} color="#64748b" />
            {pendingCount > 0 && (
              <View style={st.topBarNotifBadge}>
                <Text style={st.topBarNotifText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={st.topBarAvatar}>
            <Text style={st.topBarAvatarText}>S</Text>
          </View>
        </View>
      </View>

      {/* İçerik */}
      <View style={st.content}>
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'customers' && <CustomersTab />}
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </View>

      {/* ── ALT TAB BAR ── */}
      <View style={st.tabBar}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={st.tabItem}
              activeOpacity={0.7}
            >
              <View>
                <Ionicons name={(isActive ? tab.icon : tab.icon + '-outline') as any} size={22} color={isActive ? '#fb7185' : '#475569'} />
                {tab.badge && tab.badge > 0 && (
                  <View style={st.tabBadge}>
                    <Text style={st.tabBadgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[st.tabLabel, isActive && st.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   STİLLER
   ═══════════════════════════════════════════════════════════ */

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0d14' },

  orbDark1: {
    position: 'absolute', top: -60, right: -80,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(244,63,94,0.03)',
  },
  orbDark2: {
    position: 'absolute', bottom: 100, left: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(99,102,241,0.03)',
  },

  /* ── ÜST BAR ── */
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  topBarLabel: { fontSize: 8, fontWeight: '700', color: '#475569', letterSpacing: 2, marginBottom: 2 },
  topBarTitle: { fontSize: 22, fontWeight: '900' },
  logoSoprano: { color: '#fb7185' },
  logoAdmin: { color: '#fff' },
  topBarIconBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)' },
  topBarNotifBadge: { position: 'absolute', top: -3, right: -3, backgroundColor: '#ef4444', width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#0b0d14' },
  topBarNotifText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  topBarAvatar: { width: 34, height: 34, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(244,63,94,0.4)', backgroundColor: 'rgba(244,63,94,0.1)', alignItems: 'center', justifyContent: 'center' },
  topBarAvatarText: { fontSize: 14, fontWeight: '900', color: 'rgba(244,63,94,0.8)' },

  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  /* ── SECTION ── */
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(244,63,94,0.08)', borderWidth: 0.5, borderColor: 'rgba(244,63,94,0.15)', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  sectionSub: { fontSize: 10, color: '#475569', fontWeight: '500' },

  /* ── STAT KARTLAR ── */
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: (width - 42) / 2, padding: 16, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  statIconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statDelta: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statDeltaText: { fontSize: 9, fontWeight: '700' },
  statValue: { fontSize: 26, fontWeight: '900', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  /* ── ALERT CARD ── */
  alertCard: { marginBottom: 16, borderRadius: 14, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(251,191,36,0.15)' },
  alertGradient: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  alertText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#94a3b8' },

  /* ── AKTİVİTE ── */
  activityCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)', padding: 4, marginBottom: 16 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12 },
  activityRowBorder: { borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.04)' },
  activityIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  activityText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#cbd5e1' },
  activityTime: { fontSize: 10, fontWeight: '500', color: '#475569' },

  /* ── HIZLI STAT BAR ── */
  quickStatsBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  quickStatItem: { alignItems: 'center' },
  quickStatValue: { fontSize: 16, fontWeight: '800', color: '#fff' },
  quickStatLabel: { fontSize: 9, fontWeight: '600', color: '#475569', textTransform: 'uppercase', marginTop: 2 },
  quickStatDivider: { width: 0.5, height: 24, backgroundColor: 'rgba(255,255,255,0.08)' },

  /* ── MÜŞTERİLER ── */
  addBtn: {},
  addBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  addBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  searchDark: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  searchDarkInput: { flex: 1, fontSize: 13, fontWeight: '500', color: '#fff' },
  customerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 14,
    marginBottom: 8, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  customerAvatar: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  customerDomain: { fontSize: 10, fontWeight: '500', color: '#475569', marginVertical: 2 },
  customerMeta: { flexDirection: 'row', gap: 8 },
  customerMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  customerMetaText: { fontSize: 9, fontWeight: '600', color: '#64748b' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusActive: { backgroundColor: 'rgba(52,211,153,0.1)', borderWidth: 0.5, borderColor: 'rgba(52,211,153,0.2)' },
  statusPassive: { backgroundColor: 'rgba(148,163,184,0.1)', borderWidth: 0.5, borderColor: 'rgba(148,163,184,0.15)' },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 9, fontWeight: '700' },

  /* ── SİPARİŞLER ── */
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  orderName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  orderEmail: { fontSize: 10, fontWeight: '500', color: '#475569' },
  orderStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 0.5 },
  orderStatusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  orderDetails: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  orderDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  orderDetailText: { fontSize: 11, fontWeight: '600', color: '#94a3b8' },
  orderActions: { flexDirection: 'row', gap: 10, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.04)', paddingTop: 12 },
  orderRejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.15)',
  },
  orderRejectText: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  orderApproveBtn: { flex: 2, borderRadius: 10, overflow: 'hidden' },
  orderApproveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10 },
  orderApproveText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  /* ── AYARLAR ── */
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, padding: 18,
    marginBottom: 20, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  profileAvatar: {
    width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(244,63,94,0.1)',
    borderWidth: 1.5, borderColor: 'rgba(244,63,94,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 20, fontWeight: '900', color: 'rgba(244,63,94,0.8)' },
  profileName: { fontSize: 15, fontWeight: '800', color: '#fff' },
  profileRole: { fontSize: 10, fontWeight: '600', color: '#fb7185' },
  packageCard: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  packageCardPopular: { borderColor: 'rgba(99,102,241,0.2)', backgroundColor: 'rgba(99,102,241,0.04)' },
  packagePopularBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(99,102,241,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  packagePopularText: { fontSize: 9, fontWeight: '700', color: '#6366f1' },
  packageName: { fontSize: 14, fontWeight: '800' },
  packageCapacity: { fontSize: 10, fontWeight: '500', color: '#475569' },
  packagePrice: { fontSize: 16, fontWeight: '800' },
  packageFeatures: { marginTop: 10, gap: 4 },
  packageFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  packageFeatureText: { fontSize: 11, fontWeight: '500', color: '#94a3b8' },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14,
    marginBottom: 6, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.06)',
  },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 13, fontWeight: '700', color: '#fff' },
  settingSub: { fontSize: 10, fontWeight: '500', color: '#475569' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.06)', borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.15)',
  },
  logoutText: { fontSize: 13, fontWeight: '700', color: '#ef4444' },

  /* ── TAB BAR ── */
  tabBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(11,13,20,0.98)', paddingVertical: 8,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.04)',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
  },
  tabItem: { alignItems: 'center', gap: 3, paddingVertical: 4, minWidth: 60 },
  tabLabel: { fontSize: 9, fontWeight: '600', color: '#475569' },
  tabLabelActive: { color: '#fb7185' },
  tabBadge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: '#ef4444', minWidth: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 1.5, borderColor: '#0b0d14',
  },
  tabBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
});
