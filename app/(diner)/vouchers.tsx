import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import { colours } from '../../utils/theme';
import { useMyVouchers } from '../../hooks/useVouchers';
import { useMyAssignments } from '../../hooks/useSlots';
import { useUploadReceipt, useReceiptUrl } from '../../hooks/useReceipts';
import { useAuthStore } from '../../stores/authStore';
import { Voucher } from '../../types';
import { formatVoucherExpiry } from '../../utils/voucher';

const STATUS_CONFIG: Record<string, { label: string; colour: string; bg: string }> = {
  issued:   { label: 'Ready to Use',   colour: colours.scoreGood,    bg: colours.scoreGood + '18' },
  redeemed: { label: 'Redeemed',       colour: colours.charcoal,     bg: colours.charcoal + '18' },
  expired:  { label: 'Expired',        colour: colours.error,        bg: colours.error + '18' },
};

function VoucherCard({
  voucher,
  restaurantName,
  onPress,
}: {
  voucher: Voucher & { assignment: any };
  restaurantName: string;
  onPress: () => void;
}) {
  const status = STATUS_CONFIG[voucher.status] ?? STATUS_CONFIG.issued;
  const isActive = voucher.status === 'issued';

  return (
    <TouchableOpacity
      style={[styles.card, !isActive && styles.cardDimmed]}
      onPress={isActive ? onPress : undefined}
      activeOpacity={isActive ? 0.7 : 1}
    >
      {/* Gold header stripe */}
      <View style={styles.cardHeader}>
        <Image source={require('../../assets/logo.png')} style={styles.cardLogo} resizeMode="contain" />
        <View style={[styles.statusBadge, { backgroundColor: status.bg, borderColor: status.colour }]}>
          <Text style={[styles.statusText, { color: status.colour }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.restaurantName}>{restaurantName}</Text>
        <Text style={styles.voucherValue}>£{Number(voucher.value).toFixed(0)}</Text>
        <Text style={styles.voucherLabel}>Dining Voucher</Text>

        <View style={styles.divider} />

        <Text style={styles.codeLabel}>Redemption Code</Text>
        <Text style={styles.code}>{voucher.qr_code}</Text>

        {(voucher as any).expires_at && (
          <Text style={styles.expiry}>
            Valid until {formatVoucherExpiry((voucher as any).expires_at)}
          </Text>
        )}

        {isActive && (
          <Text style={styles.tapHint}>Tap to show QR code at the restaurant →</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function QRModal({
  voucher,
  restaurantName,
  onClose,
}: {
  voucher: (Voucher & { assignment: any }) | null;
  restaurantName: string;
  onClose: () => void;
}) {
  if (!voucher) return null;
  return (
    <Modal visible animationType="slide" transparent>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <Image source={require('../../assets/logo.png')} style={modalStyles.logo} resizeMode="contain" />

          <Text style={modalStyles.restaurant}>{restaurantName}</Text>
          <Text style={modalStyles.value}>£{Number(voucher.value).toFixed(0)}</Text>
          <Text style={modalStyles.valueLabel}>Dining Voucher</Text>

          <View style={modalStyles.qrContainer}>
            <QRCode
              value={voucher.qr_code}
              size={200}
              color={colours.charcoalDark}
              backgroundColor={colours.white}
            />
          </View>

          <Text style={modalStyles.code}>{voucher.qr_code}</Text>

          {(voucher as any).expires_at && (
            <Text style={modalStyles.expiry}>
              Valid until {formatVoucherExpiry((voucher as any).expires_at)}
            </Text>
          )}

          <Text style={modalStyles.instruction}>
            Show this screen to your server when paying.
          </Text>

          <TouchableOpacity style={modalStyles.closeBtn} onPress={onClose}>
            <Text style={modalStyles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function ReceiptCard({ assignment }: { assignment: any }) {
  const uploadReceipt = useUploadReceipt();
  const { data: receiptUrl } = useReceiptUrl(assignment.receipt_path);
  const restaurant = assignment.slot?.restaurant;

  async function handleUpload() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    try {
      await uploadReceipt.mutateAsync({ assignmentId: assignment.id, uri: result.assets[0].uri });
      Alert.alert('Receipt uploaded', 'Wendy will review this alongside your report.');
    } catch {
      Alert.alert('Upload failed', 'Please try again.');
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={receiptStyles.headerLabel}>Receipt — Reimbursement</Text>
        <View style={[styles.statusBadge, { backgroundColor: colours.scoreFair + '18', borderColor: colours.scoreFair }]}>
          <Text style={[styles.statusText, { color: colours.scoreFair }]}>
            {assignment.receipt_path ? 'Uploaded' : 'Pending'}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.restaurantName}>{restaurant?.name ?? 'Restaurant'}</Text>
        {assignment.booking_date && (
          <Text style={receiptStyles.date}>
            Dined {new Date(assignment.booking_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        )}
        {assignment.receipt_path && receiptUrl ? (
          <View style={receiptStyles.previewRow}>
            <Image source={{ uri: receiptUrl }} style={receiptStyles.thumb} />
            <TouchableOpacity style={receiptStyles.replaceBtn} onPress={handleUpload}>
              <Text style={receiptStyles.replaceBtnText}>Replace</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={receiptStyles.uploadBtn} onPress={handleUpload} disabled={uploadReceipt.isPending}>
            {uploadReceipt.isPending
              ? <ActivityIndicator color={colours.charcoalDark} />
              : <Text style={receiptStyles.uploadBtnText}>Upload Receipt Photo</Text>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function DinerVouchers() {
  const { user } = useAuthStore();
  const { data: vouchers, isLoading, refetch, isRefetching } = useMyVouchers(user?.id ?? '');
  const { data: assignments } = useMyAssignments(user?.id ?? '');
  const [selectedVoucher, setSelectedVoucher] = useState<(Voucher & { assignment: any }) | null>(null);

  // Assignments with no voucher (reimbursement flow)
  const voucherIds = new Set((vouchers ?? []).map(v => v.assignment_id));
  const receiptAssignments = (assignments ?? []).filter(
    a => (a.status === 'confirmed' || a.status === 'completed') && !voucherIds.has(a.id)
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colours.gold} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Vouchers</Text>
        <Text style={styles.headerSub}>
          {vouchers?.filter(v => v.status === 'issued').length ?? 0} active
        </Text>
      </View>

      <FlatList
        data={vouchers}
        keyExtractor={item => item.id}
        contentContainerStyle={vouchers?.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colours.gold} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎟️</Text>
            <Text style={styles.emptyTitle}>No vouchers yet</Text>
            <Text style={styles.emptySub}>
              Vouchers are issued when Wendy confirms your assignment. Complete a dine to earn yours.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const restaurantName = item.assignment?.slot?.restaurant?.name ?? 'Restaurant';
          return (
            <VoucherCard
              voucher={item}
              restaurantName={restaurantName}
              onPress={() => setSelectedVoucher(item)}
            />
          );
        }}
      />

      {/* Receipt upload section — dines with no voucher */}
      {receiptAssignments.length > 0 && (
        <View style={receiptStyles.section}>
          <Text style={receiptStyles.sectionTitle}>RECEIPTS</Text>
          <Text style={receiptStyles.sectionSub}>Upload your receipt for dines where no voucher was issued</Text>
          {receiptAssignments.map(a => (
            <ReceiptCard key={a.id} assignment={a} />
          ))}
        </View>
      )}

      {selectedVoucher && (
        <QRModal
          voucher={selectedVoucher}
          restaurantName={selectedVoucher.assignment?.slot?.restaurant?.name ?? 'Restaurant'}
          onClose={() => setSelectedVoucher(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.offWhite },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colours.offWhite },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: colours.white, borderBottomWidth: 1, borderBottomColor: colours.border },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colours.textPrimary },
  headerSub: { fontSize: 14, color: colours.textSecondary, marginTop: 2 },
  list: { padding: 16, gap: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  empty: { alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colours.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: 14, color: colours.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  card: { backgroundColor: colours.white, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  cardDimmed: { opacity: 0.6 },
  cardHeader: { backgroundColor: colours.charcoalDark, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  cardLogo: { width: 100, height: 32, borderRadius: 4 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardBody: { padding: 20 },
  restaurantName: { fontSize: 16, fontWeight: '700', color: colours.textPrimary, marginBottom: 8 },
  voucherValue: { fontSize: 48, fontWeight: '800', color: colours.charcoalDark, lineHeight: 54 },
  voucherLabel: { fontSize: 14, color: colours.textSecondary, marginBottom: 16 },
  divider: { height: 1, backgroundColor: colours.border, marginBottom: 14 },
  codeLabel: { fontSize: 11, fontWeight: '700', color: colours.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  code: { fontSize: 18, fontWeight: '800', color: colours.charcoalDark, letterSpacing: 2, fontVariant: ['tabular-nums'] },
  expiry: { fontSize: 13, color: colours.textSecondary, marginTop: 8 },
  tapHint: { fontSize: 12, color: colours.gold, fontWeight: '600', marginTop: 12 },
});

const receiptStyles = StyleSheet.create({
  section: { paddingHorizontal: 16, paddingBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colours.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: colours.textMuted, marginBottom: 12 },
  headerLabel: { fontSize: 13, fontWeight: '700', color: colours.white },
  date: { fontSize: 13, color: colours.textSecondary, marginBottom: 12 },
  uploadBtn: { backgroundColor: colours.gold, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  uploadBtnText: { fontSize: 15, fontWeight: '700', color: colours.charcoalDark },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  thumb: { width: 80, height: 100, borderRadius: 8, backgroundColor: colours.offWhite },
  replaceBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  replaceBtnText: { fontSize: 13, color: colours.gold, fontWeight: '700' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colours.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, alignItems: 'center', paddingBottom: 48 },
  logo: { width: 70, height: 70, borderRadius: 10, marginBottom: 20 },
  restaurant: { fontSize: 16, fontWeight: '700', color: colours.textPrimary, marginBottom: 4 },
  value: { fontSize: 56, fontWeight: '800', color: colours.charcoalDark, lineHeight: 64 },
  valueLabel: { fontSize: 16, color: colours.textSecondary, marginBottom: 24 },
  qrContainer: { padding: 16, backgroundColor: colours.white, borderRadius: 16, borderWidth: 2, borderColor: colours.border, marginBottom: 20 },
  code: { fontSize: 20, fontWeight: '800', color: colours.charcoalDark, letterSpacing: 3 },
  expiry: { fontSize: 13, color: colours.textSecondary, marginTop: 8, marginBottom: 16 },
  instruction: { fontSize: 14, color: colours.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  closeBtn: { backgroundColor: colours.charcoalDark, borderRadius: 12, paddingHorizontal: 40, paddingVertical: 14 },
  closeBtnText: { fontSize: 15, fontWeight: '700', color: colours.white },
});
