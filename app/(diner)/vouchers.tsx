import { View, Text, StyleSheet } from 'react-native';

export default function DinerVouchers() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Vouchers</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', color: '#222' },
});
