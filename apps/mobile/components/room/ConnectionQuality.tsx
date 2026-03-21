import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Quality = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';

function getQualityInfo(q: Quality) {
  switch (q) {
    case 'excellent': return { icon: 'wifi' as const, color: '#00ff88', label: 'Mükemmel', bars: 4 };
    case 'good': return { icon: 'wifi' as const, color: '#4ade80', label: 'İyi', bars: 3 };
    case 'fair': return { icon: 'wifi' as const, color: '#ffb800', label: 'Orta', bars: 2 };
    case 'poor': return { icon: 'wifi' as const, color: '#ef4444', label: 'Zayıf', bars: 1 };
    case 'disconnected': return { icon: 'cloud-offline-outline' as const, color: '#ef4444', label: 'Bağlantı Yok', bars: 0 };
  }
}

export default function ConnectionQuality({
  quality = 'good',
  latency,
  compact = false,
}: {
  quality?: Quality;
  latency?: number;
  compact?: boolean;
}) {
  const info = getQualityInfo(quality);

  if (compact) {
    return (
      <View style={s.compactWrap}>
        {/* Signal bars */}
        <View style={s.barsRow}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[
              s.bar,
              { height: 4 + i * 3 },
              i <= info.bars ? { backgroundColor: info.color } : { backgroundColor: 'rgba(255,255,255,0.1)' },
            ]} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <View style={s.barsRow}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={[
            s.bar,
            { height: 4 + i * 3 },
            i <= info.bars ? { backgroundColor: info.color } : { backgroundColor: 'rgba(255,255,255,0.1)' },
          ]} />
        ))}
      </View>
      {latency != null && (
        <Text style={[s.latencyText, { color: info.color }]}>{latency}ms</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 4,
  },
  compactWrap: {
    flexDirection: 'row', alignItems: 'flex-end',
  },
  barsRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 1.5,
  },
  bar: {
    width: 3, borderRadius: 1.5,
  },
  latencyText: {
    fontSize: 8, fontWeight: '700',
  },
});
