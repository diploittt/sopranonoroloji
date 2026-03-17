import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Notif = { id: string; type: string; title: string; desc: string; time: string; read: boolean };

const SAMPLE_NOTIFS: Notif[] = [
  { id: '1', type: 'message', title: 'Yeni Mesaj', desc: 'Genel Sohbet odasında yeni mesajlar var', time: '2dk', read: false },
  { id: '2', type: 'invite', title: 'Oda Daveti', desc: 'VIP Lounge odasına davet edildiniz', time: '15dk', read: false },
  { id: '3', type: 'system', title: 'Hoş Geldiniz', desc: 'SopranoChat\'e hoş geldiniz!', time: '1s', read: true },
];

export default function NotificationsScreen() {
  const [notifs, setNotifs] = useState<Notif[]>(SAMPLE_NOTIFS);

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return { name: 'chatbubble' as const, color: '#5ec8c8' };
      case 'invite': return { name: 'mail' as const, color: '#fbbf24' };
      case 'friend': return { name: 'person-add' as const, color: '#34d399' };
      default: return { name: 'notifications' as const, color: '#7b9fef' };
    }
  };

  const markRead = (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const renderNotif = ({ item }: { item: Notif }) => {
    const icon = getIcon(item.type);
    return (
      <TouchableOpacity style={[st.notifCard, !item.read && st.notifUnread]} onPress={() => markRead(item.id)}>
        <View style={[st.iconCircle, { backgroundColor: `${icon.color}15` }]}>
          <Ionicons name={icon.name} size={18} color={icon.color} />
        </View>
        <View style={st.notifContent}>
          <Text style={st.notifTitle}>{item.title}</Text>
          <Text style={st.notifDesc}>{item.desc}</Text>
        </View>
        <View style={st.notifMeta}>
          <Text style={st.notifTime}>{item.time}</Text>
          {!item.read && <View style={st.unreadDot} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={st.root}>
      <View style={st.header}>
        <Ionicons name="notifications" size={16} color="#5ec8c8" />
        <Text style={st.headerTitle}>BİLDİRİMLER</Text>
        <TouchableOpacity onPress={() => setNotifs(prev => prev.map(n => ({ ...n, read: true })))}>
          <Text style={st.markAll}>Tümünü Okundu İşaretle</Text>
        </TouchableOpacity>
      </View>

      {notifs.length === 0 ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Ionicons name="notifications-off-outline" size={40} color="#334155" />
          <Text style={{ color: '#4a5568', fontSize: 13, marginTop: 10 }}>Bildirim yok</Text>
        </View>
      ) : (
        <FlatList data={notifs} renderItem={renderNotif}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false} />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2d3548' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  headerTitle: { flex: 1, fontSize: 13, fontWeight: '900', color: '#e2e8f0', letterSpacing: 2 },
  markAll: { fontSize: 11, color: '#5ec8c8', fontWeight: '600' },

  notifCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
    padding: 14, borderRadius: 14,
    backgroundColor: 'rgba(15,20,35,0.85)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  notifUnread: { borderColor: 'rgba(94,200,200,0.15)', backgroundColor: 'rgba(15,20,35,0.95)' },

  iconCircle: {
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
  },
  notifContent: { flex: 1, gap: 2 },
  notifTitle: { fontSize: 13, fontWeight: '700', color: '#e2e8f0' },
  notifDesc: { fontSize: 11, color: '#64748b', fontWeight: '500' },

  notifMeta: { alignItems: 'flex-end', gap: 4 },
  notifTime: { fontSize: 10, color: '#4a5568', fontWeight: '600' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5ec8c8' },
});
