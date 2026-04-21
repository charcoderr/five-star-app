import { useEffect } from 'react';
import { View, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { colours } from '../utils/theme';
import { useAuthStore } from '../stores/authStore';

export default function Index() {
  const { setSplashComplete } = useAuthStore();

  useEffect(() => {
    // Show the branded splash for 2 seconds then allow navigation
    const timeout = setTimeout(() => setSplashComplete(true), 2000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="small" color={colours.gold} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 220,
    height: 220,
  },
  spinner: {
    marginTop: 24,
  },
});
