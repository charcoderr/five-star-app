import { View, Text, StyleSheet } from 'react-native';
import { colours } from '../utils/theme';

interface Props {
  name: string | null | undefined;
  size?: number;
  tone?: 'gold' | 'charcoal' | 'neutral';
}

const TONE_MAP = {
  gold:     { bg: colours.gold,         fg: colours.charcoalDark },
  charcoal: { bg: colours.charcoalDark, fg: colours.gold },
  neutral:  { bg: colours.offWhite,     fg: colours.textPrimary },
} as const;

export function Avatar({ name, size = 40, tone = 'gold' }: Props) {
  const initial = (name ?? '?').trim().charAt(0).toUpperCase() || '?';
  const { bg, fg } = TONE_MAP[tone];
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.initial, { color: fg, fontSize: Math.round(size * 0.42) }]}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontWeight: '700' },
});
