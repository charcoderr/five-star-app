import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, ScrollView, RefreshControl,
} from 'react-native';
import { colours } from '../../utils/theme';
import { useAdminRestaurants, useCreateRestaurant } from '../../hooks/useAdmin';

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

const SUB_CONFIG: Record<string, { label: string; colour: string }> = {
  active:   { label: 'Active',  colour: colours.scoreGood },
  inactive: { label: 'Inactive', colour: colours.error },
  trial:    { label: 'Trial',   colour: colours.scoreFair },
};

export default function AdminRestaurants() {
  const { data: restaurants, isLoading, refetch, isRefetching } = useAdminRestaurants();
  const createRestaurant = useCreateRestaurant();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [contactEmail, setContactEmail] = useState('');

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
          <Text style={styles.headerSub}>{restaurants?.length ?? 0} total</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={restaurants}
        keyExtractor={item => item.id}
        contentContainerStyle={restaurants?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyTitle}>No restaurants yet</Text>
            <Text style={styles.emptySub}>Tap "+ Add" to add your first client restaurant.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const sub = SUB_CONFIG[item.subscription_status] ?? SUB_CONFIG.inactive;
          return (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.detail}>{item.cuisine_type}</Text>
                  <Text style={styles.detail} numberOfLines={1}>{item.address}</Text>
                  <StarRating rating={item.avg_rating} />
                </View>
                <View style={[styles.subBadge, { backgroundColor: sub.colour + '22', borderColor: sub.colour }]}>
                  <Text style={[styles.subText, { color: sub.colour }]}>{sub.label}</Text>
                </View>
              </View>
            </View>
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
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: colours.white, borderBottomWidth: 1, borderBottomColor: colours.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colours.textPrimary },
  headerSub: { fontSize: 13, color: colours.textSecondary, marginTop: 2 },
  addBtn: { backgroundColor: colours.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { fontSize: 14, fontWeight: '700', color: colours.charcoalDark },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colours.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: 14, color: colours.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  card: { backgroundColor: colours.white, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 10 },
  name: { fontSize: 16, fontWeight: '700', color: colours.textPrimary },
  detail: { fontSize: 13, color: colours.textSecondary, marginTop: 2 },
  stars: { fontSize: 15, color: colours.gold, marginTop: 6 },
  ratingNum: { fontSize: 13, color: colours.textSecondary },
  noRating: { fontSize: 12, color: colours.textMuted, marginTop: 6, fontStyle: 'italic' },
  subBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, alignSelf: 'flex-start' },
  subText: { fontSize: 11, fontWeight: '700' },
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
