import { useEffect, useState, useRef, useCallback } from 'react';
import { useSegments, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";

cssInterop(LinearGradient, {
  className: "style",
});

export function AuthGuard() {
  const { session, loading: authLoading } = useAuth();
  // FIX TYPE: Paksa tipe menjadi string[] dan berikan default array kosong biar tidak crash
  const segments = (useSegments() || []) as string[];
  const router = useRouter();

  // FIX INFINITE LOOP: Ambil segment pertama saja sebagai string primitive untuk dependency check
  const rootSegment = segments[0]; 

  const [status, setStatus] = useState<'HIDDEN' | 'VISIBLE' | 'FADING'>('HIDDEN');

  // Animasi Ref
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Ref untuk memastikan tidak set state pada component yang sudah unmount
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // --- 1. HELPER ANIMASI (useCallback untuk memuaskan Linter) ---
  const startFadeOut = useCallback(async () => {
    // Tunggu sebentar agar halaman di belakangnya (Home) benar-benar sudah ter-render pixel-nya
    // Ini mencegah "Index" page terlihat sekilas
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!isMounted.current) return;

    setStatus('FADING');

    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (isMounted.current) {
        setStatus('HIDDEN');
      }
    });
  }, [containerOpacity]); // Dependency aman

  // --- 2. LOGIKA UTAMA ---
  useEffect(() => {
    if (authLoading) return; // Tunggu Supabase

    const performGuardCheck = async () => {
      // Definisikan logic segment di dalam sini agar aman
      const inAuthGroup = rootSegment === '(auth)';
      const inAppGroup = rootSegment === '(app)';
      // Fix Logic Landing: Cek length dengan aman
      const isLanding = segments.length === 0 || (segments.length === 1 && segments[0] === 'index');

      // --- KASUS 1: GUEST (Belum Login) ---
      if (!session) {
        if (inAppGroup) {
          // User maksa masuk /home padahal belum login -> Tendang ke /
          router.replace('/');
        }
        // Pastikan splash hidden agar Guest langsung lihat Landing Page
        if (isMounted.current) setStatus('HIDDEN');
        return;
      }

      // --- KASUS 2: USER (Sudah Login) ---
      
      // Jika user SUDAH ada di area (app), tugas AuthGuard selesai.
      // Jalankan Fade Out.
      if (inAppGroup) {
        if (status === 'VISIBLE') {
           startFadeOut();
        } 
        // Jika status HIDDEN (misal refresh page langsung di home), biarkan hidden
        return;
      }

      // Jika user masih di Landing/Auth/Login, kita harus pindahkan ke Home.
      // TAPI: Tutup layar dulu dengan Splash Screen (VISIBLE) biar transisi rapi.
      if (isLanding || inAuthGroup) {
        if (isMounted.current) setStatus('VISIBLE');
        
        // A. Tahan sebentar untuk Branding & Mencegah kedip (1.5 detik)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // B. Perintahkan Pindah (Di balik layar)
        router.replace('/(app)/home');
        
        // C. JANGAN panggil startFadeOut disini.
        // Biarkan useEffect ini jalan lagi nanti ketika 'rootSegment' berubah jadi '(app)'.
        // Saat itulah blok "if (inAppGroup)" di atas akan menangani fade out.
      }
    };

    performGuardCheck();

    // DEPENDENCY ARRAY LENGKAP & AMAN:
    // Kita pakai 'rootSegment' (string) bukan 'segments' (array) untuk mencegah loop.
  }, [session, authLoading, rootSegment, startFadeOut, router, status, segments]); 


  // --- 3. ANIMASI LOADER LOOP ---
  useEffect(() => {
    if (status === 'HIDDEN') return; 

    const rotateLoop = Animated.loop(
      Animated.timing(rotationAnim, { toValue: 1, duration: 1500, easing: Easing.linear, useNativeDriver: true })
    );
    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );

    rotateLoop.start();
    scaleLoop.start();

    return () => {
      rotateLoop.stop();
      scaleLoop.stop();
    };
  }, [status, rotationAnim, scaleAnim]); 

  // --- RENDER ---
  if (status === 'HIDDEN') return null;

  const rotate = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View 
      style={[
        StyleSheet.absoluteFill, 
        { 
          zIndex: 99999, 
          elevation: 99999,
          opacity: containerOpacity
        }
      ]}
      pointerEvents="auto" 
    >
      <LinearGradient
        colors={["#3B82F6", "#60A5FA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-1 justify-center items-center"
      >
        <View className="items-center">
          <Animated.View
            className="w-24 h-24 rounded-full border-4 border-white/30 mb-10 items-center justify-center"
            style={{ transform: [{ rotate }, { scale: scaleAnim }] }}
          >
            <View className="w-16 h-16 rounded-full border-4 border-white" />
          </Animated.View>

          <Text className="text-white/90 text-lg font-medium">
            Authenticating...
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}