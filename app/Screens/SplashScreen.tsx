import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View
} from 'react-native';
// 1. Import useRouter from expo-router
import { clearAuthData, getUser } from '@/src/utils/storage';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

const { height, width } = Dimensions.get('window');

const SplashScreen = () => {
  const router = useRouter(); // Initialize the router
  const [loadingProgress] = useState(new Animated.Value(0));
  const { loading, isAuthenticated } = useAuth();
  // Animation values
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(20)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textSpacing = useRef(new Animated.Value(10)).current;
  const splashTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Initial Logo Entrance
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Text Reveal
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(textSpacing, {
          toValue: 0,
          duration: 1200,
          easing: Easing.out(Easing.exp),
          useNativeDriver: false,
        }),
      ]),
    ]).start();

    // 3. Progress Bar Simulation
    Animated.timing(loadingProgress, {
      toValue: 1,
      duration: 3000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        // 4. Slide up splash screen and then NAVIGATE
        setTimeout(() => {
          Animated.timing(splashTranslateY, {
            toValue: -height,
            duration: 800,
            easing: Easing.inOut(Easing.exp),
            useNativeDriver: true,
          }).start(async () => {
            clearAuthData();
            // 5. Trigger Navigation to your onboarding route
            // Replace '/onboarding' with your actual file path in (tabs) or app folder
            console.log('🔹 Navigation Triggered. Authenticated:', isAuthenticated);
            var getuserdata = await getUser();
            if (isAuthenticated) {
              if (getuserdata?.businessId != null && getuserdata?.businessId != "") {
                router.replace('../(tabs)/Dashboard');
              }
              else {
                router.replace('/Screens/BusinessSetupScreen'); // ✅ Logged in
              }

            } else {
              router.replace('/Auth/Onboarding'); // ✅ Not logged in
            }
            //router.replace('./Auth/Onboarding'); 
          });
        }, 500);
      }
    });

  }, [isAuthenticated]);

  const progressWidth = loadingProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      

      <Animated.View
        style={[
          styles.splashOverlay,
          { transform: [{ translateY: splashTranslateY }] }
        ]}
      >
        <View style={styles.topPadding} />

        <View style={styles.centerArea}>
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [
                  { scale: logoScale },
                  { translateY: logoTranslateY }
                ]
              }
            ]}
          >
            <View style={styles.logoBox}>
              <View style={styles.zapIcon}>
                <View style={styles.zapTop} />
                <View style={styles.zapBottom} />
              </View>
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: textOpacity }}>
            <Animated.Text
              style={[
                styles.brandText,
                { letterSpacing: textSpacing }
              ]}
            >
              Pro<Text style={styles.brandAccent}>SaaS</Text>
            </Animated.Text>
          </Animated.View>
        </View>

        <View style={styles.bottomArea}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
          </View>

          <View style={styles.footerInfo}>
            <Text style={styles.tagline}>THE OPERATING SYSTEM FOR FIELD PROS</Text>
            <Text style={styles.version}>Version 2.4.0</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  topPadding: { height: 100 },
  centerArea: { alignItems: 'center', gap: 24 },
  logoContainer: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  logoBox: {
    width: 96,
    height: 96,
    backgroundColor: '#2563EB',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zapIcon: { width: 40, height: 50 },
  zapTop: {
    width: 0, height: 0,
    borderStyle: 'solid',
    borderLeftWidth: 15,
    borderRightWidth: 10,
    borderBottomWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'white',
    position: 'absolute',
    top: 0, right: 0,
  },
  zapBottom: {
    width: 0, height: 0,
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 15,
    borderTopWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
    position: 'absolute',
    bottom: 0, left: 0,
  },
  brandText: { fontSize: 40, fontWeight: '900', color: '#1e293b' },
  brandAccent: { color: '#2563EB' },
  bottomArea: {
    width: '100%',
    paddingHorizontal: 48,
    paddingBottom: 80,
    alignItems: 'center',
    gap: 24,
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: '#2563EB' },
  footerInfo: { alignItems: 'center', gap: 4 },
  tagline: { fontSize: 10, fontWeight: '900', color: '#cbd5e1', letterSpacing: 2 },
  version: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
});

export default SplashScreen;