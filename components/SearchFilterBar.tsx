import { View, TextInput, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { colours } from '../utils/theme';

export interface FilterChip {
  key: string;
  label: string;
}

interface Props {
  query: string;
  onQueryChange: (v: string) => void;
  placeholder?: string;
  chips?: FilterChip[];
  activeKey?: string;
  onChipPress?: (key: string) => void;
}

export function SearchFilterBar({
  query,
  onQueryChange,
  placeholder = 'Search...',
  chips,
  activeKey,
  onChipPress,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={onQueryChange}
          placeholder={placeholder}
          placeholderTextColor={colours.textMuted}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <TouchableOpacity onPress={() => onQueryChange('')} hitSlop={8}>
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {chips && chips.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {chips.map(chip => {
            const active = chip.key === activeKey;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => onChipPress?.(chip.key)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colours.white, paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: colours.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colours.offWhite, borderRadius: 10, paddingHorizontal: 12, gap: 8, borderWidth: 1, borderColor: colours.border },
  searchIcon: { fontSize: 14 },
  input: { flex: 1, fontSize: 14, color: colours.textPrimary, paddingVertical: 10 },
  clear: { fontSize: 14, color: colours.textMuted, paddingHorizontal: 4 },
  chipRow: { gap: 8, paddingRight: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: colours.border, backgroundColor: colours.white },
  chipActive: { borderColor: colours.gold, backgroundColor: colours.gold },
  chipText: { fontSize: 12, fontWeight: '600', color: colours.textSecondary },
  chipTextActive: { color: colours.charcoalDark },
});
