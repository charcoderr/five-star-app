import { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, ScrollView, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { colours } from '../../utils/theme';
import { useAdminRestaurants, useCreateRestaurant } from '../../hooks/useAdmin';
import { StatusPill } from '../../components/StatusPill';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { SearchFilterBar } from '../../components/SearchFilterBar';
import { SUBSCRIPTION_STATUS, getStatus } from '../../utils/statusColors';

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <Text style={styles.noRating}>No rating yet</Text>;
  const full = Math.round(rating);
  return (
    <Text style={styles.stars}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      <Text style={styles.ratingNum}> {rating.toFixed(1)}</Text>
    </Text>
  );
}

const STATUS_FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'active',   label: 'Active' },
  { key: 'trial',    label: 'Trial' },
  { key: 'inactive', label: 'Inactive' },
];

export default function AdminRestaurants() {
  const { data: restaurants, isLoading, refetch, isRefetching } = useAdminRestaurants();
  const createRestaurant = useCreateRestaurant();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [query, setQuery] = useState('');
  const [statusKey, setStatusKey] = useState('all');

  const filtered = useMemo(() => {
    const list = restaurants ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((r: any) => {
      if (statusKey !== 'all' && r.subscription_status !== statusKey) return false;
      if (!q) return true;
      return (
        r.name?.toLowerCase().includes(q)
        || r.cuisine_type?.toLowerCase().includes(q)
        || r.address?.toLowerCase().includes(q)
        || r.contact_email?.toLowerCase().includes(q)
      );
    });
  }, [restaurants, query, statusKey]);

  async function handleCreate() {
    if (!name || !address || !contactEmail) {
      Alert.alert('Please fill in all required fields');
      return;
    }
    try {
      await createRestaurant.mutateAsync({ name, address, cuisine_type: cuisineType, contact_email: contactEmail });
      setShowCreate(false);
      setName(''); setAddress(''); setCuisineType(''); setContactEmail('');
      Alert.alert('Restaurant added!');
    } catch {
      Alert.alert('Error', 'Could not add restaurant. Please try again.');
    }
  }

  if (isLoading) return <View style={styles.centered}><ActivityIndicator color={colours.gold} size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Restaurants</Text>
          <Text style={styles.headerSub}>
            {filtered.length} of {restaurants?.length ?? 0} shown
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <SearchFilterBar
        query={query}
        onQueryChange={setQuery}
        placeholder="Search by name, cuisine, address..."
        chips={STATUS_FILTERS}
        activeKey={statusKey}
        onChipPress={setStatusKey}
      />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />}
        ListEmptyComponent={
          <EmptyState
            icon="restaurant-outline"
            title={query || statusKey !== 'all' ? 'No matches' : 'No restaurants yet'}
            subtitle={
              query || statusKey !== 'all'
                ? 'Try a different search or filter.'
                : 'Tap "+ Add" to add your first client restaurant.'
            }
            ctaLabel={!query && statusKey === 'all' ? '+ Add Restaurant' : undefined}
            onCtaPress={!query && statusKey === 'all' ? () => setShowCreate(true) : undefined}
          />
        }
        renderItem={({ item }) => {
          const sub = getStatus(SUBSCRIPTION_STATUS, item.subscription_status);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: '/(admin)/restaurant/[restaurantId]',
                  params: { restaurantId: item.id },
                })
              }
            >
              <View style={styles.cardRow}>
                <Avatar name={item.name} size={48} tone="gold" />
                <View style={styles.cardInfo}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  {item.cuisine_type ? (
                    <Text style={styles.detail}>{item.cuisine_type}</Text>
                  ) : null}
                  <Text style={styles.detail} numberOfLines={1}>{item.address}</Text>
                  <StarRating rating={item.avg_rating} />
                </View>
                <View style={styles.cardRight}>
                  <StatusPill status={sub} size="sm" />
                  <Text style={styles.openCta}>View →</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={overlayStyles.overlay}>
          <ScrollView contentContainerStyle={overlayStyles.sheet}>
            <Text style={overlayStyles.title}>Add Restaurant</Text>
            <Text style={overlayStyles.label}>Restaurant Name *</Text>
            <TextInput style={overlayStyles.input} placeholder="e.g. Buck's Bar Glasgow" value={name} onChangeText={setName} placeholderTextColor={colours.textMuted} />
            <Text style={overlayStyles.label}>Address *</Text>
            <TextInput style={overlayStyles.input} placeholder="Full address" value={address} onChangeText={setAddress} placeholderTextColor={colours.textMuted} />
            <Text style={overlayStyles.label}>Cuisine Type</Text>
            <TextInput style={overlayStyles.input} placeholder="e.g. American, Italian..." value={cuisineType} onChangeText={setCuisineType} placeholderTextColor={colours.textMuted} />
            <Text style={overlayStyles.label}>Contact Email *</Text>
            <TextInput style={overlayStyles.input} placeholder="manager@restaurant.com" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colours.textMuted} />
            <TouchableOpacity style={overlayStyles.createBtn} onPress={handleCreate} disabled={createRestaurant.isPending}>
              {createRestaurant.isPending ? <ActivityIndicator color={colours.charcoalDark} /> : <Text style={overlayStyles.createBtnText}>Add Restaurant</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCreate(false)} style={overlayStyles.cancelBtn}>
              <Text style={overlayStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: colours.white, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colours.textPrimary },
  headerSub: { fontSize: 13, color: colours.textSecondary, marginTop: 2 },
  addBtn: { backgroundColor: colours.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { fontSize: 14, fontWeight: '700', color: colours.charcoalDark },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  card: { backgroundColor: colours.white, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardInfo: { flex: 1, gap: 2 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  openCta: { fontSize: 11, fontWeight: '700', color: colours.gold },
  name: { fontSize: 16, fontWeight: '700', color: colours.textPrimary },
  detail: { fontSize: 13, color: colours.textSecondary },
  stars: { fontSize: 14, color: colours.gold, marginTop: 4 },
  ratingNum: { fontSize: 12, color: colours.textSecondary },
  noRating: { fontSize: 12, color: colours.textMuted, marginTop: 4, fontStyle: 'italic' },
});

const overlayStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colours.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28, paddingBottom: 48 },
  title: { fontSize: 20, fontWeight: '700', color: colours.textPrimary, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colours.textSecondary, marginBottom: 6 },
  input: { backgroundColor: colours.offWhite, borderWidth: 1, borderColor: colours.border, borderRadius: 10, padding: 13, fontSize: 15, color: colours.textPrimary, marginBottom: 16 },
  createBtn: { backgroundColor: colours.gold, borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 8 },
  createBtnText: { fontSize: 15, fontWeight: '700', color: colours.charcoalDark },
  cancelBtn: { alignItems: 'center', padding: 14 },
  cancelText: { fontSize: 14, color: colours.textMuted },
});
