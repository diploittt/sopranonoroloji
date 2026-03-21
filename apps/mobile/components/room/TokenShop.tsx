/* ═══════════════════════════════════════════════════════════
   SopranoChat Mobil — TokenShop (iyzico WebView Entegrasyonu)
   Jeton paketleri satın alma + iyzico ile ödeme
   ═══════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Modal,
  StyleSheet, Pressable, ActivityIndicator, Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import useStore from '../../store';
import { realtimeService } from '../../services/realtimeService';
import config from '../../config';

// ── Tipler ──
interface TokenPackage {
  id: string;
  name: string;
  tokenAmount: number;
  price: number;
  currency: string;
  emoji: string;
  description?: string;
}

interface PendingOrder {
  id: string;
  packageName: string;
  packageEmoji: string;
  tokenAmount: number;
  price: number;
  status: string;
  createdAt: string;
}

type PaymentState = 'idle' | 'loading' | 'webview' | 'success' | 'error';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function TokenShop({ visible, onClose }: Props) {
  const { balance, points, token } = useStore();
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);

  // Ödeme akışı durumu
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentHtml, setPaymentHtml] = useState<string | null>(null);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<string>('');
  const [selectedPkg, setSelectedPkg] = useState<TokenPackage | null>(null);
  const [webviewProgress, setWebviewProgress] = useState(0);

  // Manuel ödeme mesajı
  const [manualMsg, setManualMsg] = useState<string | null>(null);

  // Animasyonlar
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Bakiye listener zaten store'da mevcut (gift:balance)
  // Ek olarak payment:success listener ekleyelim
  useEffect(() => {
    if (!visible) return;
    realtimeService.emit('token:packages');

    const onResponse = (data: any) => {
      setPackages(data.packages || []);
      setPendingOrders(data.pendingOrders || []);
    };

    realtimeService.on('token:packagesResponse', onResponse);
    return () => { realtimeService.off('token:packagesResponse', onResponse); };
  }, [visible]);

  // Giriş animasyonu
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      resetPayment();
    }
  }, [visible]);

  const resetPayment = useCallback(() => {
    setPaymentState('idle');
    setPaymentUrl(null);
    setPaymentHtml(null);
    setPaymentOrderId(null);
    setPaymentMessage('');
    setSelectedPkg(null);
    setManualMsg(null);
  }, []);

  // ═══════════ iyzico ÖDEME BAŞLAT ═══════════
  const handleIyzicoBuy = async (pkg: TokenPackage) => {
    setSelectedPkg(pkg);
    setPaymentState('loading');
    setManualMsg(null);

    try {
      const response = await fetch(`${config.API_BASE_URL}/api/payment/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId: pkg.id }),
      });

      const result = await response.json();

      if (result.success && (result.paymentPageUrl || result.checkoutFormContent)) {
        setPaymentOrderId(result.orderId);
        if (result.paymentPageUrl) {
          setPaymentUrl(result.paymentPageUrl);
        }
        if (result.checkoutFormContent) {
          // iyzico checkout HTML embed
          setPaymentHtml(buildCheckoutHtml(result.checkoutFormContent));
        }
        setPaymentState('webview');
      } else {
        setPaymentState('error');
        setPaymentMessage(result.message || result.error || 'Ödeme başlatılamadı.');
      }
    } catch (err: any) {
      setPaymentState('error');
      setPaymentMessage(err.message || 'Bağlantı hatası. Tekrar deneyin.');
    }
  };

  // ═══════════ MANUEL SİPARİŞ (Fallback) ═══════════
  const handleManualBuy = (pkg: TokenPackage) => {
    setManualMsg(null);
    const socket = realtimeService.getSocket();
    if (!socket) {
      setManualMsg('❌ Bağlantı yok');
      return;
    }

    socket.emit('token:buy', { packageId: pkg.id }, (res: any) => {
      if (res?.success) {
        setManualMsg(res.message || '✅ Sipariş oluşturuldu!');
        realtimeService.emit('token:packages');
      } else {
        setManualMsg(`❌ ${res?.error || 'Sipariş oluşturulamadı'}`);
      }
    });
  };

  // ═══════════ WEBVIEW CALLBACK YAKALAMA ═══════════
  const handleWebViewNavigationChange = (navState: any) => {
    const url = navState.url || '';

    // iyzico callback URL'ini yakala
    if (url.includes('/api/payment/callback')) {
      // Callback backend'e gidiyor — sonucu bekle
      // WebView callback sonrası success/error HTML sayfası gösterecek
    }

    // Başarılı ödeme sayfası tespiti
    if (url.includes('payment-success') || url.includes('odeme-basarili')) {
      handlePaymentSuccess();
    }

    // Başarısız ödeme
    if (url.includes('payment-error') || url.includes('odeme-hatasi')) {
      handlePaymentError('Ödeme işlemi başarısız oldu.');
    }
  };

  // WebView içindeki sayfanın HTML içeriğini kontrol et
  const INJECTED_JS = `
    (function() {
      // iyzico callback sonrası sayfadaki içeriği kontrol et
      var checkContent = function() {
        var body = document.body ? document.body.innerText : '';
        if (body.includes('Ödeme Başarılı') || body.includes('jetonlarınız yüklendi')) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success' }));
        } else if (body.includes('Ödeme Hatası') || body.includes('başarısız')) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: body }));
        }
      };
      // Sayfa yüklendiğinde ve her mutation'da kontrol et
      checkContent();
      var observer = new MutationObserver(checkContent);
      if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    })();
    true;
  `;

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'success') {
        handlePaymentSuccess();
      } else if (data.type === 'error') {
        handlePaymentError(data.message || 'Ödeme başarısız.');
      }
    } catch { /* JSON parse hatası — ignore */ }
  };

  const handlePaymentSuccess = () => {
    setPaymentState('success');
    setPaymentMessage('Ödeme başarılı! Jetonlarınız yükleniyor...');
    // Bakiye widget'ını güncelle — store zaten gift:balance listener ile güncelliyor
    realtimeService.emit('gift:balance');
    // Paket listesini yenile
    setTimeout(() => {
      realtimeService.emit('token:packages');
    }, 1000);
  };

  const handlePaymentError = (msg: string) => {
    setPaymentState('error');
    setPaymentMessage(msg);
  };

  // ═══════════ CHECKOUT HTML BUILDER ═══════════
  const buildCheckoutHtml = (formContent: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 16px; background: #0f1628; font-family: -apple-system, sans-serif; }
        #iyzipay-checkout-form { min-height: 300px; }
      </style>
    </head>
    <body>
      ${formContent}
    </body>
    </html>
  `;

  if (!visible) return null;

  // ═══════════ WEBVIEW MODAL ═══════════
  if (paymentState === 'webview') {
    return (
      <Modal transparent={false} visible animationType="slide" onRequestClose={() => resetPayment()}>
        <View style={s.webviewContainer}>
          {/* Header */}
          <View style={s.webviewHeader}>
            <TouchableOpacity onPress={resetPayment} style={s.webviewBackBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.webviewTitle}>💳 Ödeme</Text>
              {selectedPkg && (
                <Text style={s.webviewSubtitle}>
                  {selectedPkg.emoji} {selectedPkg.name} — {selectedPkg.tokenAmount.toLocaleString()} jeton
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={resetPayment} style={s.webviewCloseBtn}>
              <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          {webviewProgress < 1 && (
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${webviewProgress * 100}%` }]} />
            </View>
          )}

          {/* WebView */}
          <WebView
            source={paymentUrl ? { uri: paymentUrl } : paymentHtml ? { html: paymentHtml } : undefined}
            style={{ flex: 1, backgroundColor: '#0f1628' }}
            onNavigationStateChange={handleWebViewNavigationChange}
            onMessage={handleWebViewMessage}
            injectedJavaScript={INJECTED_JS}
            onLoadProgress={({ nativeEvent }) => setWebviewProgress(nativeEvent.progress)}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={s.webviewLoading}>
                <ActivityIndicator size="large" color="#818cf8" />
                <Text style={s.webviewLoadingText}>Ödeme sayfası yükleniyor...</Text>
              </View>
            )}
            onError={() => handlePaymentError('Sayfa yüklenemedi. Tekrar deneyin.')}
            onHttpError={() => handlePaymentError('Sunucu hatası. Tekrar deneyin.')}
          />
        </View>
      </Modal>
    );
  }

  // ═══════════ BAŞARI EKRANI ═══════════
  if (paymentState === 'success') {
    return (
      <Modal transparent visible animationType="fade" onRequestClose={resetPayment}>
        <View style={s.resultOverlay}>
          <View style={s.resultCard}>
            <Text style={{ fontSize: 56 }}>✅</Text>
            <Text style={s.resultTitle}>Ödeme Başarılı!</Text>
            <Text style={s.resultMessage}>
              {selectedPkg
                ? `${selectedPkg.tokenAmount.toLocaleString()} jeton hesabınıza yüklendi.`
                : 'Jetonlarınız yüklendi.'}
            </Text>
            <View style={s.resultBalanceBox}>
              <Text style={{ fontSize: 16 }}>🪙</Text>
              <Text style={s.resultBalanceValue}>{balance.toLocaleString()}</Text>
              <Text style={s.resultBalanceLabel}>jeton</Text>
            </View>
            <TouchableOpacity style={s.resultBtn} onPress={resetPayment}>
              <Text style={s.resultBtnText}>Tamam</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // ═══════════ HATA EKRANI ═══════════
  if (paymentState === 'error') {
    return (
      <Modal transparent visible animationType="fade" onRequestClose={resetPayment}>
        <View style={s.resultOverlay}>
          <View style={[s.resultCard, s.resultErrorCard]}>
            <Text style={{ fontSize: 56 }}>❌</Text>
            <Text style={[s.resultTitle, { color: '#f87171' }]}>Ödeme Başarısız</Text>
            <Text style={s.resultMessage}>{paymentMessage}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[s.resultBtn, s.retryBtn]} onPress={() => {
                if (selectedPkg) handleIyzicoBuy(selectedPkg);
                else resetPayment();
              }}>
                <Ionicons name="refresh" size={16} color="#fff" />
                <Text style={s.resultBtnText}>Tekrar Dene</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.resultBtn, s.cancelBtn]} onPress={resetPayment}>
                <Text style={[s.resultBtnText, { color: '#94a3b8' }]}>İptal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ═══════════ LOADING EKRANI ═══════════
  if (paymentState === 'loading') {
    return (
      <Modal transparent visible animationType="fade" onRequestClose={onClose}>
        <View style={s.resultOverlay}>
          <View style={s.resultCard}>
            <ActivityIndicator size="large" color="#818cf8" />
            <Text style={s.resultTitle}>Ödeme Hazırlanıyor...</Text>
            <Text style={s.resultMessage}>
              {selectedPkg?.emoji} {selectedPkg?.name} — {selectedPkg?.price} {selectedPkg?.currency || 'TL'}
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  // ═══════════ ANA LİSTELEME EKRANI ═══════════
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Animated.View
          style={[s.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={{ fontSize: 22 }}>🏪</Text>
              <View>
                <Text style={s.headerTitle}>Jeton Mağazası</Text>
                <Text style={s.headerSub}>Jeton paketleri satın al</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          {/* Balance */}
          <View style={s.balanceRow}>
            <View style={s.balanceItem}>
              <Text style={{ fontSize: 14 }}>🪙</Text>
              <Text style={s.balanceVal}>{balance.toLocaleString()}</Text>
              <Text style={s.balanceLabel}>jeton</Text>
            </View>
            <View style={s.divider} />
            <View style={s.balanceItem}>
              <Text style={{ fontSize: 14 }}>⭐</Text>
              <Text style={[s.balanceVal, { color: '#a855f7' }]}>{points.toLocaleString()}</Text>
              <Text style={s.balanceLabel}>puan</Text>
            </View>
          </View>

          {/* Manuel sipariş mesajı */}
          {manualMsg && (
            <View style={[s.msgBox, manualMsg.startsWith('❌') ? s.msgError : s.msgSuccess]}>
              <Text style={[s.msgText, manualMsg.startsWith('❌') ? { color: '#f87171' } : { color: '#4ade80' }]}>
                {manualMsg}
              </Text>
            </View>
          )}

          {/* Packages */}
          <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent}>
            {packages.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={{ fontSize: 32 }}>📦</Text>
                <Text style={s.emptyText}>Henüz jeton paketi tanımlanmamış.</Text>
              </View>
            ) : (
              <View style={s.pkgGrid}>
                {packages.map(pkg => (
                  <View key={pkg.id} style={s.pkgCard}>
                    <Text style={s.pkgEmoji}>{pkg.emoji || '💎'}</Text>
                    <Text style={s.pkgName}>{pkg.name}</Text>
                    <Text style={s.pkgAmount}>
                      {pkg.tokenAmount.toLocaleString()} <Text style={s.pkgAmountLabel}>jeton</Text>
                    </Text>
                    {pkg.description && (
                      <Text style={s.pkgDesc} numberOfLines={1}>{pkg.description}</Text>
                    )}

                    {/* Ödeme Butonları */}
                    <View style={s.pkgBtnRow}>
                      {/* iyzico ile ödeme */}
                      <TouchableOpacity
                        style={s.iyzicoBtn}
                        onPress={() => handleIyzicoBuy(pkg)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.iyzicoBtnText}>💳 {pkg.price} {pkg.currency || 'TL'}</Text>
                      </TouchableOpacity>

                      {/* Manuel sipariş (yedek) */}
                      <TouchableOpacity
                        style={s.manualBtn}
                        onPress={() => handleManualBuy(pkg)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="receipt-outline" size={12} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Pending Orders */}
            {pendingOrders.length > 0 && (
              <View style={s.pendingSection}>
                <Text style={s.pendingTitle}>⏳ Bekleyen Siparişler</Text>
                {pendingOrders.map(order => (
                  <View key={order.id} style={s.pendingCard}>
                    <View style={s.pendingLeft}>
                      <Text style={{ fontSize: 16 }}>{order.packageEmoji}</Text>
                      <View>
                        <Text style={s.pendingName}>{order.packageName}</Text>
                        <Text style={s.pendingDetail}>
                          {order.tokenAmount.toLocaleString()} jeton • {order.price} TL
                        </Text>
                      </View>
                    </View>
                    <View style={s.pendingBadge}>
                      <Text style={s.pendingBadgeText}>Bekliyor</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.footerText}>
              💳 Kartla anında öde veya 📋 sipariş oluştur (admin onayı gerekir)
            </Text>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ═══════════ STILLER ═══════════
const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  container: {
    width: '92%', maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(148,163,184,0.15)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 25 }, shadowOpacity: 0.15, shadowRadius: 60,
    elevation: 30,
  },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(148,163,184,0.12)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  headerSub: { fontSize: 10, color: '#64748b', marginTop: 1 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: 'rgba(148,163,184,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Balance
  balanceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginTop: 12,
    padding: 10, borderRadius: 12,
    backgroundColor: 'rgba(99,102,241,0.04)',
  },
  balanceItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceVal: { fontSize: 14, fontWeight: '700', color: '#fbbf24' },
  balanceLabel: { fontSize: 10, color: '#94a3b8' },
  divider: { width: 1, height: 16, backgroundColor: 'rgba(148,163,184,0.15)' },

  // Messages
  msgBox: { marginHorizontal: 16, marginTop: 8, padding: 8, borderRadius: 8 },
  msgError: { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.2)' },
  msgSuccess: { backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 0.5, borderColor: 'rgba(34,197,94,0.2)' },
  msgText: { fontSize: 12 },

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: { padding: 14 },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 12, color: '#64748b' },

  // Package Grid
  pkgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pkgCard: {
    width: '47%', padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(99,102,241,0.06)',
    borderWidth: 0.5, borderColor: 'rgba(99,102,241,0.15)',
    position: 'relative', overflow: 'hidden',
  },
  pkgEmoji: { fontSize: 28, marginBottom: 8 },
  pkgName: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginBottom: 2 },
  pkgAmount: { fontSize: 18, fontWeight: '800', color: '#fbbf24', marginBottom: 4 },
  pkgAmountLabel: { fontSize: 10, fontWeight: '500', color: '#94a3b8' },
  pkgDesc: { fontSize: 9, color: '#64748b', marginBottom: 6 },

  // Butonlar
  pkgBtnRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  iyzicoBtn: {
    flex: 1, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8,
    backgroundColor: 'rgba(99,102,241,0.25)',
    alignItems: 'center',
  },
  iyzicoBtnText: { fontSize: 11, fontWeight: '700', color: '#818cf8' },
  manualBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: 'rgba(148,163,184,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Pending
  pendingSection: { marginTop: 18 },
  pendingTitle: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 8 },
  pendingCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 10, borderRadius: 10, marginBottom: 6,
    backgroundColor: 'rgba(245,158,11,0.05)',
    borderWidth: 0.5, borderColor: 'rgba(245,158,11,0.1)',
  },
  pendingLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingName: { fontSize: 12, fontWeight: '600', color: '#fbbf24' },
  pendingDetail: { fontSize: 9, color: '#64748b' },
  pendingBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    backgroundColor: 'rgba(245,158,11,0.2)',
  },
  pendingBadgeText: { fontSize: 8, fontWeight: '600', color: '#fbbf24' },

  // Footer
  footer: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 0.5, borderTopColor: 'rgba(148,163,184,0.1)',
    alignItems: 'center',
  },
  footerText: { fontSize: 9, color: '#64748b', textAlign: 'center' },

  // ════ WebView ════
  webviewContainer: { flex: 1, backgroundColor: '#f8fafc' },
  webviewHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(148,163,184,0.15)',
  },
  webviewBackBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(148,163,184,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  webviewCloseBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  webviewTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  webviewSubtitle: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  progressBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.05)' },
  progressFill: { height: 3, backgroundColor: '#818cf8', borderRadius: 2 },
  webviewLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#0f1628',
  },
  webviewLoadingText: { fontSize: 12, color: '#94a3b8', marginTop: 12 },

  // ════ Sonuç Ekranları ════
  resultOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  resultCard: {
    width: '85%', padding: 32, borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)',
    alignItems: 'center', gap: 12,
  },
  resultErrorCard: { borderColor: 'rgba(239,68,68,0.2)' },
  resultTitle: { fontSize: 20, fontWeight: '800', color: '#4ade80' },
  resultMessage: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  resultBalanceBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderWidth: 0.5, borderColor: 'rgba(251,191,36,0.2)',
    marginTop: 4,
  },
  resultBalanceValue: { fontSize: 22, fontWeight: '800', color: '#fbbf24' },
  resultBalanceLabel: { fontSize: 12, color: '#94a3b8' },
  resultBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(99,102,241,0.25)',
    marginTop: 8,
  },
  resultBtnText: { fontSize: 14, fontWeight: '700', color: '#818cf8' },
  retryBtn: { backgroundColor: 'rgba(99,102,241,0.25)' },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.05)' },
});
