import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colours } from '../../utils/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const MENU_ITEMS: { label: string; icon: IconName; route: string }[] = [
  { label: 'Reports',      icon: 'document-text-outline', route: '/(admin)/reports' },
  { label: 'Restaurants',   icon: 'restaurant-outline',    route: '/(admin)/restaurants' },
  { label: 'Vouchers',      icon: 'gift-outline',          route: '/(admin)/vouchers' },
  { label: 'T&Cs Editor',   icon: 'create-outline',        route: '/(admin)/tcs-editor' },
];

export default function MoreScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {MENU_ITEMS.map(item => (
          <TouchableOpacity
            key={item.route}
            style={styles.row}
            onPress={() => router.push(item.route as any)}
          >
            <Ionicons name={item.icon} size={22} color={colours.gold} style={styles.icon} />
            <Text style={styles.label}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colours.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: colours.white, borderBottomWidth: 1, borderBottomColor: colours.border },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colours.textPrimary },
  list: { padding: 16, gap: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colours.white, borderRadius: 12,
    padding: 16, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
  },
  icon: { marginRight: 14 },
  label: { flex: 1, fontSize: 16, fontWeight: '600', color: colours.textPrimary },
});
