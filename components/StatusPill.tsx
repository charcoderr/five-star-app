import { View, Text, StyleSheet } from 'react-native';
import { StatusConfig } from '../utils/statusColors';

interface Props {
  status: StatusConfig;
  size?: 'sm' | 'md';
}

export function StatusPill({ status, size = 'md' }: Props) {
  const isSm = size === 'sm';
  return (
    <View
      style={[
        styles.pill,
        isSm && styles.pillSm,
        { backgroundColor: status.colour + '22', borderColor: status.colour },
      ]}
    >
      <Text style={[styles.text, isSm && styles.textSm, { color: status.colour }]}>
        {status.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pillSm: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  text: { fontSize: 11, fontWeight: '700' },
  textSm: { fontSize: 10 },
});
