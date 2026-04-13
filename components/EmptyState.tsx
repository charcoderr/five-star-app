import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colours } from '../utils/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  icon: IconName;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export function EmptyState({ icon, title, subtitle, ctaLabel, onCtaPress }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconBubble}>
        <Ionicons name={icon} size={34} color={colours.gold} />
      </View>
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
  iconBubble: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colours.gold + '18',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 18, fontWeight: '700', color: colours.textPrimary, textAlign: 'center' },
  sub: { fontSize: 14, color: colours.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22, maxWidth: 300 },
  cta: { marginTop: 20, backgroundColor: colours.gold, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 10 },
  ctaText: { fontSize: 14, fontWeight: '700', color: colours.charcoalDark },
});
