import React from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useStore } from '../../store';

/* ═══════════════════════════════════════════════════════════
   BOTTOM NAV — 5 tab, ortada yükseltilmiş oda oluştur butonu
   ═══════════════════════════════════════════════════════════ */

type TabId = 'home' | 'explore' | 'create' | 'notifications' | 'profile';

interface BottomNavProps {
  /** Aktif sekme */
  active: TabId;
}

const TABS: {
  id: TabId;
  iconFilled: string;
  iconOutline: string;
  label: string;
  route: string | null;
}[] = [
  { id: 'home', iconFilled: 'home', iconOutline: 'home-outline', label: 'Ana Sayfa', route: '/home' },
  { id: 'explore', iconFilled: 'compass', iconOutline: 'compass-outline', label: 'Keşfet', route: '/explore' },
  { id: 'create', iconFilled: 'add', iconOutline: 'add', label: 'Oluştur', route: '/create-room' },
  { id: 'notifications', iconFilled: 'notifications', iconOutline: 'notifications-outline', label: 'Bildirimler', route: '/notifications' },
  { id: 'profile', iconFilled: 'person', iconOutline: 'person-outline', label: 'Profil', route: '/profile' },
];

export default function BottomNav({ active }: BottomNavProps) {
  const router = useRouter();
  const { unreadCount } = useStore();

  const handlePress = (tab: typeof TABS[number]) => {
    if (tab.id === active) return; // Aynı sayfada
    if (tab.route) router.push(tab.route as any);
  };

  return (
    <View style={s.bar}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        const isCenter = tab.id === 'create';

        // Ortadaki yükseltilmiş oda oluştur butonu
        if (isCenter) {
          return (
            <TouchableOpacity
              key={tab.id}
              style={s.centerWrap}
              activeOpacity={0.85}
              onPress={() => handlePress(tab)}
            >
              <LinearGradient
                colors={['#8b5cf6', '#6366f1']}
                style={s.centerBtn}
              >
                <Ionicons name="add" size={26} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={tab.id}
            style={s.tab}
            activeOpacity={0.7}
            onPress={() => handlePress(tab)}
          >
            <View>
              <Ionicons
                name={(isActive ? tab.iconFilled : tab.iconOutline) as any}
                size={22}
                color={isActive ? '#a78bfa' : 'rgba(255,255,255,0.35)'}
              />
              {/* Bildirim badge */}
              {tab.id === 'notifications' && unreadCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                s.label,
                isActive && s.labelActive,
              ]}
            >
              {tab.label}
            </Text>
            {/* Aktif göstergesi */}
            {isActive && <View style={s.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    backgroundColor: 'rgba(10,14,39,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,92,246,0.1)',
    // Glassmorphism
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 20,
  },

  tab: {
    alignItems: 'center',
    gap: 2,
    minWidth: 56,
    paddingVertical: 4,
  },

  label: {
    fontSize: 9,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.3)',
    marginTop: 1,
  },
  labelActive: {
    color: '#a78bfa',
    fontWeight: '700',
  },

  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#a78bfa',
    marginTop: 3,
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },

  // Ortadaki yükseltilmiş buton
  centerWrap: {
    alignItems: 'center',
    marginTop: -18,
  },
  centerBtn: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
    borderColor: 'rgba(139,92,246,0.3)',
  },

  // Bildirim badge
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#ef4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#0a0e27',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
  },
});
