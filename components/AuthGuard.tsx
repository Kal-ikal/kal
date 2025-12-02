import { useEffect, useState, useRef, useCallback } from 'react';
import { useSegments, useRouter, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";

cssInterop(LinearGradient, {
  className: "style",
});

export function AuthGuard() {
  const { session, loading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  const rootSegment = segments?.[0] as string | undefined;

  const [status, setStatus] = useState<'HIDDEN' | 'VISIBLE' | 'FADING'>('VISIBLE');
  const isMounted = useRef(true);

  const containerOpacity = useRef(new Animated.Value(1)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const safeNavigate = useCallback((path: string) => {
    if (!isMounted.current) return;
    setTimeout(() => {
      if (isMounted.current) {
        // gunakan cast untuk menghindari ts-ignore
        (router as any).replace(path);
      }
    }, 50);
  }, [router]);

  const startFadeOut = useCallback(async () => {
    if (!isMounted.current) return;
    await new Promise(resolve => setTimeout(resolve, 300));

    if (!isMounted.current) return;
    setStatus('FADING');
    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (isMounted.current) setStatus('HIDDEN');
    });
  }, [containerOpacity]);

  // --- LOGIKA UTAMA GUARD ---
  useEffect(() => {
    if (!navigationState?.key || authLoading) return;

    const performGuardCheck = () => {
      const inAuthGroup = rootSegment === '(auth)';
      const isLanding = !rootSegment || rootSegment === 'index';
      const isPublicRoute = isLanding || inAuthGroup;

      if (session) {
        if (isPublicRoute) {
          if (status === 'HIDDEN' && isMounted.current) {
            setStatus('VISIBLE');
            containerOpacity.setValue(1);
          }
          safeNavigate('/(app)/home');
          return;
        }
        if (status === 'VISIBLE') startFadeOut();
      }

      if (!session) {
        if (rootSegment === '(app)') {
          safeNavigate('/(auth)/login');
          return;
        }
        if (status === 'VISIBLE') startFadeOut();
      }
    };

    performGuardCheck();
    // tambahkan semua deps yang dipakai di atas supaya ESLint tenang
  }, [session, authLoading, rootSegment, navigationState?.key, safeNavigate, startFadeOut, status, containerOpacity]);

  // --- ANIMASI LOADING UI ---
  useEffect(() => {
    if (status === 'HIDDEN') return;

    if (status === 'VISIBLE') {
      rotationAnim.setValue(0);
      scaleAnim.setValue(1);
    }

    const rotateLoop = Animated.loop(
      Animated.timing(rotationAnim, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })
    );
    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    rotateLoop.start();
    scaleLoop.start();
    return () => { rotateLoop.stop(); scaleLoop.stop(); };
  }, [status, rotationAnim, scaleAnim]);

  if (status === 'HIDDEN') return null;

  const rotate = rotationAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View 
      style={[StyleSheet.absoluteFill, { zIndex: 99999, elevation: 99999, opacity: containerOpacity }]}
      pointerEvents={status === 'FADING' ? 'none' : 'auto'} 
    >
      <LinearGradient
        colors={["#3B82F6", "#60A5FA"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        className="flex-1 justify-center items-center"
      >
        <View className="items-center">
          <Animated.View
            className="w-24 h-24 rounded-full border-4 border-white/30 mb-10 items-center justify-center"
            style={{ transform: [{ rotate }, { scale: scaleAnim }] }}
          >
            <View className="w-16 h-16 rounded-full border-4 border-white shadow-lg" />
          </Animated.View>
          <Text className="text-white/90 text-lg font-bold tracking-widest uppercase">
            Loading...
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}
