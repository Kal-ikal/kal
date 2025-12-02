import { useCallback } from 'react';
import { router } from 'expo-router';
import type { Href } from 'expo-router';

export function useSmartNavigation() {
  const navigate = useCallback((
    path: string | Href,
    options: { 
      replace?: boolean; 
      reset?: boolean;
      dismissAll?: boolean;
    } = {}
  ) => {
    const { replace = false, reset = false, dismissAll = false } = options;
    
    if (dismissAll) {
      // ✅ Try dismissAll but catch potential errors if no stack to dismiss
      try {
        if (router.canDismiss()) {
          router.dismissAll();
        }
      } catch (e) {
        // Ignore POP_TO_TOP errors if already at top
      }
      router.replace(path as any);
      return;
    }
    
    if (reset) {
      // ✅ Reset navigation stack via replace
      router.replace(path as any);
      return;
    }
    
    if (replace) {
      router.replace(path as any);
    } else {
      router.push(path as any);
    }
  }, []);
  
  const navigateWithReset = useCallback((path: string | Href) => {
    router.replace(path as any);
  }, []);
  
  const navigateToRoot = useCallback(() => {
    // Avoid dismissAll if not needed or if it causes issues
    try {
      if (router.canDismiss()) {
        router.dismissAll();
      }
    } catch (e) {
      // ignore
    }
    router.replace('/');
  }, []);
  
  const backToRoot = useCallback(() => {
    try {
      if (router.canDismiss()) {
        router.dismissAll();
      }
    } catch (e) {
      // ignore
    }
    router.replace('/');
  }, []);
  
  const navigateToTab = useCallback((tabName: string) => {
    navigate(`/(app)/${tabName}`, { replace: true });
  }, [navigate]);
  
  const navigateToDetail = useCallback((path: string | Href) => {
    navigate(path, { replace: false });
  }, [navigate]);
  
  const navigateToApp = useCallback(() => {
    navigate('/(app)/home', { reset: true });
  }, [navigate]);
  
  const navigateToAuth = useCallback(() => {
    navigate('/(auth)/login', { reset: true });
  }, [navigate]);
  
  return {
    navigate,
    navigateToTab,
    navigateToDetail,
    navigateToApp,
    navigateToAuth,
    navigateToRoot,
    backToRoot,
    navigateWithReset,
    back: router.back,
    canGoBack: router.canGoBack
  };
}