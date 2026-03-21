import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  StyleSheet,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../config';

const { width } = Dimensions.get('window');

/* ═══════════════════════════════════════════════════════════
   PAKET VERİLERİ — Web ile uyumlu
   ═══════════════════════════════════════════════════════════ */

interface Plan {
  name: string;
  price: number;
  period: string;
  icon: string;
  features: string[];
  color: string;
  darkColor: string;
  popular: boolean;
  badge: string;
  gradient: [string, string];
}

const PLANS: Plan[] = [
  {
    name: 'Ses + Metin',
    price: 200,
    period: '/ay',
    icon: '🎙️',
    features: ['Sesli ve yazılı sohbet', 'Şifreli oda', 'Ban/Gag yetkileri'],
    color: '#38bdf8',
    darkColor: '#0369a1',
    popular: false,
    badge: '',
    gradient: ['#0ea5e9', '#0284c7'],
  },
  {
    name: 'Kamera + Ses',
    price: 400,
    period: '/ay',
    icon: '📹',
    features: ['Tüm standart özellikler', 'Web kamerası yayını', 'Canlı protokol'],
    color: '#a78bfa',
    darkColor: '#6d28d9',
    popular: true,
    badge: 'POPÜLER',
    gradient: ['#8b5cf6', '#7c3aed'],
  },
  {
    name: 'White Label',
    price: 2990,
    period: '/ay',
    icon: '🏢',
    features: ['10 bağımsız oda', 'Embed altyapısı', 'Farklı domain'],
    color: '#fbbf24',
    darkColor: '#b45309',
    popular: false,
    badge: 'BAYİ',
    gradient: ['#f59e0b', '#d97706'],
  },
];

/* ═══════════════════════════════════════════════════════════
   ANA EKRAN — TOPLULUK AÇ
   ═══════════════════════════════════════════════════════════ */

export default function CreateRoomScreen() {
  const router = useRouter();

  // Paket seçimi
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(PLANS[0]);

  // Sipariş formu
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hosting, setHosting] = useState<'soprano' | 'own'>('soprano');
  const [roomName, setRoomName] = useState('');
  const [domain, setDomain] = useState('');
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentCode] = useState(() => 'SPR-' + Math.random().toString(36).substring(2, 7).toUpperCase());

  // UI state
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const amount = selectedPlan
    ? (billing === 'yearly' ? selectedPlan.price * 10 : selectedPlan.price)
    : 0;

  const canSubmit = selectedPlan && firstName.trim() && lastName.trim() && email.trim() && phone.trim()
    && (hosting === 'soprano' ? roomName.trim() : domain.trim());

  const handleSubmit = async () => {
    if (!canSubmit || !selectedPlan) return;
    setSending(true);
    try {
      const body = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        packageName: selectedPlan.name,
        paymentCode,
        hostingType: hosting === 'own' ? 'own_domain' : 'sopranochat',
        customDomain: hosting === 'own' ? domain.trim() : null,
        roomName: hosting === 'soprano' ? roomName.trim() : null,
        amount,
        details: { billing, period: selectedPlan.period },
      };

      const res = await fetch(`${config.API_BASE_URL}/admin/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => { setSuccess(false); router.back(); }, 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Hata', err.message || 'Sipariş gönderilemedi.');
      }
    } catch {
      Alert.alert('Bağlantı Hatası', 'Sunucuya bağlanılamadı.');
    } finally {
      setSending(false);
    }
  };

  // ── Başarı Ekranı ──
  if (success) {
    return (
      <View style={s.container}>
        <LinearGradient colors={['#eee8f5', '#d0cce0', '#b8b3d1']} style={StyleSheet.absoluteFill as any} />
        <View style={s.successWrap}>
          <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
          <Text style={s.successTitle}>Siparişiniz Alındı! 🎉</Text>
          <Text style={s.successSub}>Onaylandığında odanız otomatik oluşturulacak.</Text>
          <View style={s.codeBox}>
            <Text style={s.codeLabel}>ÖDEME KODU</Text>
            <Text style={s.codeValue}>{paymentCode}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 }}>
            <Ionicons name="time-outline" size={14} color="#a78bfa" />
            <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '500' }}>Onay süresi genellikle 24 saat</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <LinearGradient colors={['#eee8f5', '#d0cce0', '#b8b3d1']} style={StyleSheet.absoluteFill as any} />

      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="chevron-back" size={20} color="#475569" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Topluluk Aç</Text>
        <TouchableOpacity style={s.headerBtn} onPress={() => Alert.alert('Bilgi', 'Paket seçin, formu doldurun, siparişiniz onaylandığında odanız açılır.', [{ text: 'Tamam' }])}>
          <Ionicons name="help-circle-outline" size={20} color="#475569" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ═══ PAKET KARTLARI — Yatay kompakt ═══ */}
          <Text style={s.sec}>① Paket Seçin</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
            {PLANS.map(plan => {
              const sel = selectedPlan?.name === plan.name;
              return (
                <TouchableOpacity key={plan.name} activeOpacity={0.85} onPress={() => setSelectedPlan(plan)}>
                  <LinearGradient
                    colors={sel ? plan.gradient : ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                    style={[s.pCard, sel && { borderColor: plan.color, shadowColor: plan.color, shadowOpacity: 0.35, elevation: 10 }]}
                  >
                    {plan.badge !== '' && (
                      <View style={[s.pBadge, { backgroundColor: sel ? 'rgba(255,255,255,0.25)' : `${plan.color}18` }]}>
                        <Text style={[s.pBadgeText, { color: sel ? '#fff' : plan.darkColor }]}>{plan.badge}</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 24 }}>{plan.icon}</Text>
                    <Text style={[s.pName, sel && { color: '#fff' }]}>{plan.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <Text style={[s.pPrice, sel && { color: '#fff' }]}>{plan.price.toLocaleString('tr-TR')}₺</Text>
                      <Text style={[s.pPeriod, sel && { color: 'rgba(255,255,255,0.95)' }]}>{plan.period}</Text>
                    </View>
                    {plan.features.map((f, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <Ionicons name="checkmark" size={11} color={sel ? 'rgba(255,255,255,0.8)' : plan.darkColor} />
                        <Text style={[s.pFeat, sel && { color: 'rgba(255,255,255,0.85)' }]}>{f}</Text>
                      </View>
                    ))}
                    {sel && (
                      <View style={s.pCheck}><Ionicons name="checkmark" size={12} color="#fff" /></View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ═══ FORM — sadece paket seçiliyse ═══ */}
          {selectedPlan && (
            <>
              {/* FATURA */}
              <Text style={[s.sec, { marginTop: 14 }]}>② Fatura</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([
                  { key: 'monthly' as const, icon: '💳', label: 'Aylık', sub: `${selectedPlan.price.toLocaleString('tr-TR')}₺${selectedPlan.period}` },
                  { key: 'yearly' as const, icon: '🎁', label: 'Yıllık', sub: `${(selectedPlan.price * 10).toLocaleString('tr-TR')}₺/yıl` },
                ] as const).map(b => (
                  <TouchableOpacity key={b.key} onPress={() => setBilling(b.key)} style={[s.billBtn, billing === b.key && { borderColor: selectedPlan.darkColor, backgroundColor: `${selectedPlan.darkColor}12` }]}>
                    <Text style={[s.billLabel, billing === b.key && { color: selectedPlan.darkColor }]}>{b.icon} {b.label}</Text>
                    <Text style={[s.billSub, billing === b.key && { color: selectedPlan.darkColor }]}>{b.sub}</Text>
                    {b.key === 'yearly' && <View style={s.discBadge}><Text style={s.discText}>2 AY HEDİYE</Text></View>}
                  </TouchableOpacity>
                ))}
              </View>

              {/* KİŞİSEL BİLGİLER */}
              <Text style={[s.sec, { marginTop: 14 }]}>③ Bilgiler</Text>
              <View style={s.formCard}>
                <View style={s.formRow}>
                  <Ionicons name="person" size={14} color="#6366f1" />
                  <TextInput style={s.formInput} placeholder="Ad" placeholderTextColor="#94a3b8" value={firstName} onChangeText={setFirstName} />
                  <View style={s.formDiv} />
                  <TextInput style={s.formInput} placeholder="Soyad" placeholderTextColor="#94a3b8" value={lastName} onChangeText={setLastName} />
                </View>
                <View style={s.formLine} />
                <View style={s.formRow}>
                  <Ionicons name="mail" size={14} color="#a78bfa" />
                  <TextInput style={[s.formInput, { flex: 1 }]} placeholder="E-posta" placeholderTextColor="#94a3b8" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                </View>
                <View style={s.formLine} />
                <View style={s.formRow}>
                  <Ionicons name="call" size={14} color="#a78bfa" />
                  <TextInput style={[s.formInput, { flex: 1 }]} placeholder="Telefon" placeholderTextColor="#94a3b8" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                </View>
              </View>

              {/* HOSTİNG */}
              <Text style={[s.sec, { marginTop: 14 }]}>④ Odanız Nerede Yayınlansın?</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setHosting('soprano')} style={[s.hostBtn, hosting === 'soprano' && { borderColor: '#38bdf8', backgroundColor: '#38bdf815' }]}>
                  <View style={[s.radio, hosting === 'soprano' && { borderColor: '#38bdf8' }]}>
                    {hosting === 'soprano' && <View style={[s.radioDot, { backgroundColor: '#38bdf8' }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.hostLabel, hosting === 'soprano' && { color: '#0284c7' }]}>🌐 SopranoChat</Text>
                    <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '500', marginTop: 1 }}>sopranochat.com üzerinde barındırılır</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setHosting('own')} style={[s.hostBtn, hosting === 'own' && { borderColor: '#a78bfa', backgroundColor: '#a78bfa15' }]}>
                  <View style={[s.radio, hosting === 'own' && { borderColor: '#a78bfa' }]}>
                    {hosting === 'own' && <View style={[s.radioDot, { backgroundColor: '#a78bfa' }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.hostLabel, hosting === 'own' && { color: '#7c3aed' }]}>🔗 Kendi Siten</Text>
                    <Text style={{ fontSize: 9, color: '#64748b', fontWeight: '500', marginTop: 1 }}>Kendi web sitenize embed edin</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={[s.formCard, { marginTop: 6 }]}>
                <View style={s.formRow}>
                  <Ionicons name={hosting === 'soprano' ? 'home' : 'globe'} size={14} color={hosting === 'soprano' ? '#0284c7' : '#7c3aed'} />
                  <TextInput
                    style={[s.formInput, { flex: 1 }]}
                    placeholder={hosting === 'soprano' ? 'Topluluk adınızı girin' : 'ornek.com'}
                    placeholderTextColor="#94a3b8"
                    value={hosting === 'soprano' ? roomName : domain}
                    onChangeText={hosting === 'soprano' ? setRoomName : setDomain}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* ÖDEME KODU */}
              <View style={s.codeBox}>
                <Text style={s.codeLabel}>ÖDEME KODU</Text>
                <Text style={s.codeValue}>{paymentCode}</Text>
                <Text style={{ fontSize: 9, color: '#475569', marginTop: 3, fontWeight: '600' }}>Bu kodu ödeme açıklamasına yazın</Text>
              </View>

              {/* ÖZET ŞERİDİ */}
              <View style={s.strip}>
                <View style={s.stripChip}>
                  <Text style={s.stripText}>{selectedPlan.icon} {selectedPlan.name}</Text>
                </View>
                <View style={s.stripChip}>
                  <Text style={s.stripText}>{billing === 'yearly' ? '📅 Yıllık' : '💳 Aylık'}</Text>
                </View>
                <View style={[s.stripChip, { backgroundColor: `${selectedPlan.darkColor}12`, borderColor: `${selectedPlan.darkColor}30` }]}>
                  <Text style={[s.stripText, { color: selectedPlan.darkColor, fontWeight: '800' }]}>{amount.toLocaleString('tr-TR')} ₺</Text>
                </View>
              </View>

              {/* SİPARİŞ BUTONU */}
              <TouchableOpacity activeOpacity={0.9} onPress={handleSubmit} disabled={sending || !canSubmit} style={{ marginTop: 10, opacity: (!canSubmit || sending) ? 0.45 : 1 }}>
                <LinearGradient colors={selectedPlan.gradient} style={s.submitBtn}>
                  {sending ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <Ionicons name="cart" size={18} color="#fff" />
                      <Text style={s.submitText}>Sipariş Gönder</Text>
                      <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.6)" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={s.trustRow}>
                {['🛡️ Güvenli', '⚡ 24s Onay', '📞 7/24 Destek'].map((t, i) => (
                  <Text key={i} style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}>{t}</Text>
                ))}
              </View>
            </>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════
   STİLLER — Kompakt & Belirgin
   ═══════════════════════════════════════════════════════════ */

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#d0cce0' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 14, paddingBottom: 2, gap: 10,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, fontSize: 17, fontWeight: '800', color: '#1e293b',
    textAlign: 'center',
  },

  scroll: { paddingHorizontal: 16, paddingTop: 6 },

  sec: {
    fontSize: 12, fontWeight: '800', color: '#4c1d95',
    letterSpacing: 0.3, marginBottom: 8,
  },

  /* ── PAKET KARTLARI — yatay, kompakt ── */
  pCard: {
    width: (width - 56) / 2.3,
    paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
    overflow: 'hidden', alignItems: 'center',
  },
  pBadge: {
    position: 'absolute', top: 0, right: 0, left: 0,
    alignItems: 'center', paddingVertical: 2, borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
  },
  pBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  pName: { fontSize: 13, fontWeight: '800', color: '#1e293b', marginTop: 4 },
  pPrice: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
  pPeriod: { fontSize: 10, fontWeight: '600', color: '#94a3b8' },
  pFeat: { fontSize: 9, fontWeight: '600', color: '#475569' },
  pCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },

  /* ── FATURA ── */
  billBtn: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 10,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1.5, borderColor: 'rgba(200,200,220,0.5)',
    alignItems: 'center', gap: 2,
  },
  billLabel: { fontSize: 12, fontWeight: '700', color: '#334155' },
  billSub: { fontSize: 11, fontWeight: '800', color: '#475569' },
  discBadge: {
    backgroundColor: '#ef444418', paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 4, marginTop: 2,
  },
  discText: { fontSize: 7, fontWeight: '900', color: '#ef4444', letterSpacing: 0.3 },

  /* ── FORM ── */
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(200,200,220,0.5)',
    marginBottom: 6,
  },
  formRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  formInput: { flex: 1, fontSize: 13, fontWeight: '500', color: '#1e293b' },
  formDiv: { width: 1, height: 16, backgroundColor: 'rgba(0,0,0,0.06)' },
  formLine: { height: 0.5, backgroundColor: 'rgba(226,232,240,0.5)', marginLeft: 22 },

  /* ── HOSTİNG ── */
  hostBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 10,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1.5, borderColor: 'rgba(200,200,220,0.5)',
  },
  radio: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: '#94a3b8',
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { width: 7, height: 7, borderRadius: 3.5 },
  hostLabel: { fontSize: 11, fontWeight: '700', color: '#334155' },

  /* ── ÖDEME KODU ── */
  codeBox: {
    marginTop: 10, alignItems: 'center', paddingVertical: 12,
    backgroundColor: 'rgba(99,102,241,0.06)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.12)',
  },
  codeLabel: { fontSize: 9, fontWeight: '800', color: '#334155', letterSpacing: 1.5 },
  codeValue: { fontSize: 22, fontWeight: '900', color: '#4f46e5', letterSpacing: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 2 },

  /* ── ÖZET ŞERİDİ ── */
  strip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, flexWrap: 'wrap',
  },
  stripChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 0.5, borderColor: 'rgba(99,102,241,0.15)',
  },
  stripText: { fontSize: 11, fontWeight: '600', color: '#4f46e5' },

  /* ── BUTON ── */
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 50, borderRadius: 16,
    shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  submitText: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },

  /* ── GÜVEN ── */
  trustRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 10,
  },
  trustText: { fontSize: 10, fontWeight: '600', color: '#94a3b8' },

  /* ── BAŞARI ── */
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  successTitle: { fontSize: 22, fontWeight: '900', color: '#1e293b', marginTop: 12, textAlign: 'center' },
  successSub: { fontSize: 13, fontWeight: '500', color: '#64748b', textAlign: 'center', marginTop: 6 },
});
