import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { enableScreens, enableFreeze } from "react-native-screens";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useCustomBackHandler } from '../hooks/useCustomBackHandler';
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";
import { AuthGuard } from "../components/AuthGuard";
import { ToastProvider } from "../context/NotificationToastContext"; 

import "./global.css";

enableScreens(true);
enableFreeze(true);

function NavigationBarConfig() { return null; }

// Wrapper komponen baru untuk akses useTheme & Toast
function ToastProviderWrapper({ children }: { children: React.ReactNode }) {
  const { isDarkMode } = useTheme();
  return (
    <ToastProvider isDarkMode={isDarkMode}>
      {children}
    </ToastProvider>
  );
}

// Wrapper komponen untuk akses useTheme (Navigasi Utama)
function RootLayoutNav() {
  const { isDarkMode } = useTheme();

  return (
    <>
      <NavigationBarConfig />
      <StatusBar translucent backgroundColor="transparent" style={isDarkMode ? "light" : "dark"} />
      
      <Stack
        screenOptions={{
          headerShown: false,
          // FIX WHITE FLASH: Ubah background container sesuai tema
          contentStyle: { backgroundColor: isDarkMode ? "#111827" : "#EFF6FF" },
          freezeOnBlur: true,
          // Animasi Default: Fade (untuk transisi halaman utama yang mulus)
          animation: "fade", 
          gestureEnabled: true,
          gestureDirection: "horizontal",
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen name="index" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
        <Stack.Screen name="(app)" options={{ animation: "fade", gestureEnabled: false }} />
        
        {/* FIX MODAL ANIMATION: Override fade dengan slide_from_bottom */}
        <Stack.Screen 
          name="(modals)" 
          options={{ 
            presentation: "modal", 
            animation: "slide_from_bottom",
            // Pastikan gesture swipe-down aktif untuk menutup modal
            gestureEnabled: true,
            gestureDirection: "vertical",
            // Fix background transparan untuk modal blur
            contentStyle: { backgroundColor: 'transparent' } 
          }} 
        />
      </Stack>
      
      <AuthGuard />
    </>
  );
}

export default function RootLayout() {
  useCustomBackHandler();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            {/* ToastProviderWrapper disisipkan di sini, di dalam ThemeProvider */}
            <ToastProviderWrapper>
              <RootLayoutNav />
            </ToastProviderWrapper>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}