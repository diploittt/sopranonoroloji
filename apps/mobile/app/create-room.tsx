import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Platform, Dimensions,
  StyleSheet, TextInput, Image, Animated, KeyboardAvoidingView,
  ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { config } from '../config';
import AppBackground from '../components/shared/AppBackground';

const { width } = Dimensions.get('window');

interface Plan {
  name: string; price: number; period: string; icon: string;
  features: string[]; color: string; darkColor: string;
  popular: boolean; badge: string; gradient: [string, string];
}

const PLANS: Plan[] = [
  { name: 'Ses + Metin', price: 200, period: '/ay', icon: '🎙️', features: ['Sesli ve yazılı sohbet', 'Şifreli oda', 'Ban/Gag yetkileri'], color: '#38bdf8', darkColor: '#0369a1', popular: false, badge: '', gradient: ['#0ea5e9', '#0284c7'] },
  { name: 'Kamera + Ses', price: 400, period: '/ay', icon: '📹', features: ['Tüm standart özellikler', 'Web kamerası yayını', 'Canlı protokol'], color: '#a78bfa', darkColor: '#6d28d9', popular: true, badge: 'POPÜLER', gradient: ['#8b5cf6', '#7c3aed'] },
  { name: 'White Label', price: 2990, period: '/ay', icon: '🏢', features: ['10 bağımsız oda', 'Embed altyapısı', 'Farklı domain'], color: '#fbbf24', darkColor: '#b45309', popular: false, badge: 'BAYİ', gradient: ['#f59e0b', '#d97706'] },
];

/* ═══════════════════════════════════════════════════════════
   TOPLULUK AÇ / SİPARİŞ — KOYU TEMA
   ═══════════════════════════════════════════════════════════ */
export default function CreateRoomScreen() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(PLANS[0]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hosting, setHosting] = useState<'soprano' | 'own'>('soprano');
  const [roomName, setRoomName] = useState('');
  const [domain, setDomain] = useState('');
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [paymentCode] = useState(() => 'SPR-' + Math.random().toString(36).substring(2, 7).toUpperCase());
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('İzin Gerekli', 'Galeriye erişim izni gerekiyor.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0]?.base64) setLogoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
  };

  const amount = selectedPlan ? (billing === 'yearly' ? selectedPlan.price * 10 : selectedPlan.price) : 0;
  const canSubmit = selectedPlan && firstName.trim() && lastName.trim() && email.trim() && phone.trim() && (hosting === 'soprano' ? roomName.trim() : domain.trim());

  const handleSubmit = async () => {
    if (!canSubmit || !selectedPlan) return;
    setSending(true);
    try {
      const body = {
        firstName: firstName.trim(), lastName: lastName.trim(),
        email: email.trim(), phone: phone.trim(),
        packageName: selectedPlan.name, paymentCode,
        hostingType: hosting === 'own' ? 'own_domain' : 'sopranochat',
        customDomain: hosting === 'own' ? domain.trim() : null,
        roomName: hosting === 'soprano' ? roomName.trim() : null,
        logo: logoBase64 || null, amount,
        details: { billing, period: selectedPlan.period },
      };
      const res = await fetch(`${config.API_BASE_URL}/admin/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (res.ok) { setSuccess(true); setTimeout(() => { setSuccess(false); router.back(); }, 4000); }
      else { const err = await res.json().catch(() => ({})); Alert.alert('Hata', err.message || 'Sipariş gönderilemedi.'); }
    } catch { Alert.alert('Bağlantı Hatası', 'Sunucuya bağlanılamadı.'); }
    finally { setSending(false); }
  };

  if (success) {
    return (
      <AppBackground>
        <View style={st.successWrap}>
          <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
          <Text style={st.successTitle}>Siparişiniz Alındı! 🎉</Text>
          <Text style={st.successSub}>Onaylandığında odanız otomatik oluşturulacak.</Text>
          <View style={st.codeBox}>
            <Text style={st.codeLabel}>ÖDEME KODU</Text>
            <Text style={st.codeValue}>{paymentCode}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 }}>
            <Ionicons name="time-outline" size={14} color="#a78bfa" />
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>Onay süresi genellikle 24 saat</Text>
          </View>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.headerBtn}>
          <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Topluluk Aç</Text>
        <TouchableOpacity style={st.headerBtn}
          onPress={() => Alert.alert('Bilgi', 'Paket seçin, formu doldurun, siparişiniz onaylandığında odanız açılır.', [{ text: 'Tamam' }])}>
          <Ionicons name="help-circle-outline" size={20} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <Text style={st.sec}>① Paket Seçin</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
            {PLANS.map(plan => {
              const sel = selectedPlan?.name === plan.name;
              return (
                <TouchableOpacity key={plan.name} activeOpacity={0.85} onPress={() => setSelectedPlan(plan)}>
                  <LinearGradient colors={sel ? plan.gradient : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']}
                    style={[st.pCard, sel && { borderColor: plan.color, shadowColor: plan.color, shadowOpacity: 0.35, elevation: 10 }]}>
                    {plan.badge !== '' && (
                      <View style={[st.pBadge, { backgroundColor: sel ? 'rgba(255,255,255,0.2)' : `${plan.color}18` }]}>
                        <Text style={[st.pBadgeText, { color: sel ? '#fff' : plan.color }]}>{plan.badge}</Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 24 }}>{plan.icon}</Text>
                    <Text style={[st.pName, sel && { color: '#fff' }]}>{plan.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                      <Text style={[st.pPrice, sel && { color: '#fff' }]}>{plan.price.toLocaleString('tr-TR')}₺</Text>
                      <Text style={[st.pPeriod, sel && { color: 'rgba(255,255,255,0.8)' }]}>{plan.period}</Text>
                    </View>
                    {plan.features.map((f, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <Ionicons name="checkmark" size={11} color={sel ? 'rgba(255,255,255,0.8)' : plan.color} />
                        <Text style={[st.pFeat, sel && { color: 'rgba(255,255,255,0.8)' }]}>{f}</Text>
                      </View>
                    ))}
                    {sel && <View style={st.pCheck}><Ionicons name="checkmark" size={12} color="#fff" /></View>}
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedPlan && (
            <>
              <Text style={[st.sec, { marginTop: 14 }]}>② Fatura</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([
                  { key: 'monthly' as const, icon: '💳', label: 'Aylık', sub: `${selectedPlan.price.toLocaleString('tr-TR')}₺${selectedPlan.period}` },
                  { key: 'yearly' as const, icon: '🎁', label: 'Yıllık', sub: `${(selectedPlan.price * 10).toLocaleString('tr-TR')}₺/yıl` },
                ] as const).map(b => (
                  <TouchableOpacity key={b.key} onPress={() => setBilling(b.key)}
                    style={[st.billBtn, billing === b.key && { borderColor: `${selectedPlan.color}50`, backgroundColor: `${selectedPlan.color}12` }]}>
                    <Text style={[st.billLabel, billing === b.key && { color: selectedPlan.color }]}>{b.icon} {b.label}</Text>
                    <Text style={[st.billSub, billing === b.key && { color: selectedPlan.color }]}>{b.sub}</Text>
                    {b.key === 'yearly' && <View style={st.discBadge}><Text style={st.discText}>2 AY HEDİYE</Text></View>}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[st.sec, { marginTop: 14 }]}>③ Bilgiler</Text>
              <View style={st.formCard}>
                <View style={st.formRow}>
                  <Ionicons name="person" size={14} color="#8b5cf6" />
                  <TextInput style={st.formInput} placeholder="Ad" placeholderTextColor="rgba(255,255,255,0.25)" value={firstName} onChangeText={setFirstName} />
                  <View style={st.formDiv} />
                  <TextInput style={st.formInput} placeholder="Soyad" placeholderTextColor="rgba(255,255,255,0.25)" value={lastName} onChangeText={setLastName} />
                </View>
                <View style={st.formLine} />
                <View style={st.formRow}>
                  <Ionicons name="mail" size={14} color="#a78bfa" />
                  <TextInput style={[st.formInput, { flex: 1 }]} placeholder="E-posta" placeholderTextColor="rgba(255,255,255,0.25)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                </View>
                <View style={st.formLine} />
                <View style={st.formRow}>
                  <Ionicons name="call" size={14} color="#a78bfa" />
                  <TextInput style={[st.formInput, { flex: 1 }]} placeholder="Telefon" placeholderTextColor="rgba(255,255,255,0.25)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                </View>
              </View>

              <Text style={[st.sec, { marginTop: 14 }]}>④ Odanız Nerede Yayınlansın?</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setHosting('soprano')} style={[st.hostBtn, hosting === 'soprano' && { borderColor: 'rgba(56,189,248,0.3)', backgroundColor: 'rgba(56,189,248,0.08)' }]}>
                  <View style={[st.radio, hosting === 'soprano' && { borderColor: '#38bdf8' }]}>
                    {hosting === 'soprano' && <View style={[st.radioDot, { backgroundColor: '#38bdf8' }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.hostLabel, hosting === 'soprano' && { color: '#38bdf8' }]}>🌐 SopranoChat</Text>
                    <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: '500', marginTop: 1 }}>sopranochat.com üzerinde</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setHosting('own')} style={[st.hostBtn, hosting === 'own' && { borderColor: 'rgba(139,92,246,0.3)', backgroundColor: 'rgba(139,92,246,0.08)' }]}>
                  <View style={[st.radio, hosting === 'own' && { borderColor: '#a78bfa' }]}>
                    {hosting === 'own' && <View style={[st.radioDot, { backgroundColor: '#a78bfa' }]} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.hostLabel, hosting === 'own' && { color: '#a78bfa' }]}>🔗 Kendi Siten</Text>
                    <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: '500', marginTop: 1 }}>Kendi alan adına embed</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={[st.formCard, { marginTop: 6 }]}>
                <View style={st.formRow}>
                  <Ionicons name={hosting === 'soprano' ? 'home' : 'globe'} size={14} color={hosting === 'soprano' ? '#38bdf8' : '#a78bfa'} />
                  <TextInput style={[st.formInput, { flex: 1 }]}
                    placeholder={hosting === 'soprano' ? 'Topluluk adınızı girin' : 'ornek.com'}
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    value={hosting === 'soprano' ? roomName : domain}
                    onChangeText={hosting === 'soprano' ? setRoomName : setDomain}
                    autoCapitalize="none" />
                </View>
              </View>

              <Text style={[st.sec, { marginTop: 14 }]}>⑤ Topluluk Logosu</Text>
              <TouchableOpacity activeOpacity={0.85} onPress={pickLogo} style={st.logoPicker}>
                {logoBase64 ? (
                  <Image source={{ uri: logoBase64 }} style={st.logoPreview} />
                ) : (
                  <View style={st.logoPlaceholder}>
                    <Ionicons name="camera-outline" size={24} color="rgba(255,255,255,0.3)" />
                    <Text style={st.logoPlaceholderText}>Logo Seç</Text>
                  </View>
                )}
                <View style={st.logoInfo}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#f1f5f9' }}>{logoBase64 ? 'Logo Seçildi ✓' : 'Galeriden Seç'}</Text>
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Kare format önerilir (1:1)</Text>
                </View>
                {logoBase64 && (
                  <TouchableOpacity onPress={() => setLogoBase64(null)} style={st.logoRemoveBtn}>
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              <View style={st.codeBox}>
                <Text style={st.codeLabel}>ÖDEME KODU</Text>
                <Text style={st.codeValue}>{paymentCode}</Text>
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontWeight: '600' }}>Bu kodu ödeme açıklamasına yazın</Text>
              </View>

              <View style={st.strip}>
                <View style={st.stripChip}><Text style={st.stripText}>{selectedPlan.icon} {selectedPlan.name}</Text></View>
                <View style={st.stripChip}><Text style={st.stripText}>{billing === 'yearly' ? '📅 Yıllık' : '💳 Aylık'}</Text></View>
                <View style={[st.stripChip, { backgroundColor: `${selectedPlan.color}15`, borderColor: `${selectedPlan.color}30` }]}>
                  <Text style={[st.stripText, { color: selectedPlan.color, fontWeight: '800' }]}>{amount.toLocaleString('tr-TR')} ₺</Text>
                </View>
              </View>

              <TouchableOpacity activeOpacity={0.9} onPress={handleSubmit} disabled={sending || !canSubmit} style={{ marginTop: 10, opacity: (!canSubmit || sending) ? 0.45 : 1 }}>
                <LinearGradient colors={selectedPlan.gradient} style={st.submitBtn}>
                  {sending ? <ActivityIndicator color="#fff" size="small" /> : (
                    <><Ionicons name="cart" size={18} color="#fff" /><Text style={st.submitText}>Sipariş Gönder</Text><Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.6)" /></>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={st.trustRow}>
                {['🛡️ Güvenli', '⚡ 24s Onay', '📞 7/24 Destek'].map((t, i) => (
                  <Text key={i} style={{ fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)' }}>{t}</Text>
                ))}
              </View>
            </>
          )}

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 54 : 36, paddingHorizontal: 14, paddingBottom: 2, gap: 10 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#f1f5f9', textAlign: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 6 },

  sec: { fontSize: 12, fontWeight: '800', color: '#a78bfa', letterSpacing: 0.3, marginBottom: 8 },

  pCard: { width: (width - 56) / 2.3, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, overflow: 'hidden', alignItems: 'center' },
  pBadge: { position: 'absolute', top: 0, right: 0, left: 0, alignItems: 'center', paddingVertical: 2, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
  pBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  pName: { fontSize: 13, fontWeight: '800', color: '#f1f5f9', marginTop: 4 },
  pPrice: { fontSize: 18, fontWeight: '900', color: '#f1f5f9' },
  pPeriod: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  pFeat: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  pCheck: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  billBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center', gap: 2 },
  billLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  billSub: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.6)' },
  discBadge: { backgroundColor: 'rgba(239,68,68,0.15)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginTop: 2 },
  discText: { fontSize: 7, fontWeight: '900', color: '#ef4444', letterSpacing: 0.3 },

  formCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 6 },
  formRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  formInput: { flex: 1, fontSize: 13, fontWeight: '500', color: '#f1f5f9' },
  formDiv: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.06)' },
  formLine: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.04)', marginLeft: 22 },

  hostBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)' },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 7, height: 7, borderRadius: 3.5 },
  hostLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },

  logoPicker: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', borderStyle: 'dashed' as any },
  logoPreview: { width: 50, height: 50, borderRadius: 12 },
  logoPlaceholder: { width: 50, height: 50, borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.08)', alignItems: 'center', justifyContent: 'center', gap: 2 },
  logoPlaceholderText: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.3)' },
  logoInfo: { flex: 1 },
  logoRemoveBtn: { padding: 4 },

  codeBox: { marginTop: 10, alignItems: 'center', paddingVertical: 12, backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)' },
  codeLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5 },
  codeValue: { fontSize: 22, fontWeight: '900', color: '#a78bfa', letterSpacing: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 2 },

  strip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  stripChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 0.5, borderColor: 'rgba(99,102,241,0.15)' },
  stripText: { fontSize: 11, fontWeight: '600', color: '#a78bfa' },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 16, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  submitText: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },

  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 10 },

  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  successTitle: { fontSize: 22, fontWeight: '900', color: '#f1f5f9', marginTop: 12, textAlign: 'center' },
  successSub: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: 6 },
});
