import { View, Text, StyleSheet } from 'react-native';

export default function DinerHome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Available Dines</Text>
      <Text style={styles.subtitle}>Browse this month's slots</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', color: '#222' },
  subtitle: { fontSize: 16, color: '#777', marginTop: 8 },
});
