import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colours } from '../utils/theme';

// Root entry — AuthGuard in _layout.tsx redirects on first render based
// on session/role. This screen is shown for the brief bridge between
// native splash and the first authenticated route.
//
// When the final logo asset arrives, replace the wordmark <Text> block
// with <Image source={require('../assets/logo.png')} />.
export default function Index() {
  return (
    <View style={styles.container}>
      <View style={styles.brandBlock}>
        <Text style={styles.wordmark}>5StarX</Text>
        <Text style={styles.tagline}>MYSTERY DINING</Text>
      </View>
      <ActivityIndicator size="small" color={colours.gold} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.charcoalDark,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 40,
  },
  wordmark: {
    fontSize: 48,
    fontWeight: '800',
    color: colours.gold,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    color: colours.charcoalLight,
    letterSpacing: 4,
    marginTop: 8,
  },
  spinner: { marginTop: 8 },
});
