import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Platform, ToastAndroid, Alert } from 'react-native';
import { usePathname, router } from 'expo-router';
import { useSmartNavigation } from './useSmartNavigation';

export function useCustomBackHandler() {
  const pathname = usePathname();
  const { backToRoot, navigateToRoot } = useSmartNavigation();

  // Ref to track double-back exit state
  const canExitRef = useRef(false);

  const backHandler = useCallback(() => {
    // ✅ Case 1: Jika di landing page (root) - exit app
    if (pathname === '/' || pathname === '/index') {
      BackHandler.exitApp();
      return true;
    }

    // ✅ Case 2: Jika di login page - selalu kembali ke root
    if (pathname === '/(auth)/login') {
      backToRoot();
      return true;
    }

    // ✅ Case 3: Jika di forgot-password - back ke login
    if (pathname === '/(auth)/forgot-password') {
      if (router.canGoBack()) {
        router.back();
      } else {
        navigateToRoot();
      }
      return true;
    }

    // ✅ Case 4: Jika di Dashboard (Home) - Double Tap to Exit
    // Centralized logic here to prevent conflicts with default fallback
    if (pathname === '/home' || pathname === '/(app)/home') {
        if (canExitRef.current) {
            BackHandler.exitApp();
            return true;
        }

        canExitRef.current = true;
        if (Platform.OS === 'android') {
            ToastAndroid.show("Tekan sekali lagi untuk keluar", ToastAndroid.SHORT);
        } else {
            Alert.alert("Keluar Aplikasi", "Tekan sekali lagi untuk keluar");
        }

        setTimeout(() => {
            canExitRef.current = false;
        }, 2000);

        return true;
    }

    // ✅ Case 5: Jika di modal - dismiss
    if (pathname.startsWith('/(modals)/')) {
      if (router.canGoBack()) {
        router.back();
      } else {
        navigateToRoot();
      }
      return true;
    }

    // ✅ Default: Normal back behavior
    if (router.canGoBack()) {
      router.back();
      return true;
    } else {
      // Fallback: ke root
      navigateToRoot();
      return true;
    }
  }, [pathname, backToRoot, navigateToRoot]);

  useEffect(() => {
    // Add event listener - returns subscription object
    const subscription = BackHandler.addEventListener('hardwareBackPress', backHandler);

    // Cleanup - remove subscription
    return () => {
      subscription.remove();
    };
  }, [backHandler]);

  return { backHandler };
}