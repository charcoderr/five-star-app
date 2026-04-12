import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colours } from '../utils/theme';

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export function EmptyState({ icon, title, subtitle, ctaLabel, onCtaPress }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      {ctaLabel && onCtaPress ? (
        <TouchableOpacity style={styles.cta} onPress={onCtaPress}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', padding: 40 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: colours.textPrimary, textAlign: 'center' },
  sub: { fontSize: 14, color: colours.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  cta: { marginTop: 20, backgroundColor: colours.gold, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  ctaText: { fontSize: 14, fontWeight: '700', color: colours.charcoalDark },
});
