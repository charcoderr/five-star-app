import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colours } from '../utils/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: colours.border, opacity },
        style,
      ]}
    />
  );
}

// ─── Card skeleton (for list rows) ───────────────────────────────────────────
export function CardSkeleton() {
  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.row}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={cardStyles.lines}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={11} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
}

// ─── List of card skeletons ───────────────────────────────────────────────────
export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={{ padding: 16, gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colours.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lines: { flex: 1 },
});
