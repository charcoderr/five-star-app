import { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { colours } from '../utils/theme';
import { useAuthStore } from '../stores/authStore';

export default function Index() {
  const { setSplashComplete } = useAuthStore();
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    // Failsafe: if the video errors or takes too long, complete the splash
    // after 6 seconds so the user isn't stuck.
    const timeout = setTimeout(() => setSplashComplete(true), 6000);
    return () => clearTimeout(timeout);
  }, []);

  function handlePlaybackStatus(status: AVPlaybackStatus) {
    if (status.isLoaded && status.didJustFinish) {
      setSplashComplete(true);
    }
  }

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={require('../assets/splash-animation.mp4')}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.white ?? '#FFFFFF',
  },
  video: {
    width: 300,
    height: 300,
  },
});
