// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(app)/_layout.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ Phase 4: Added Approvals tab
// ===========================================================

import { Tabs } from 'expo-router';
import CustomTabBar from '@/components/CustomTabBar';
import { useTheme } from '@/context/ThemeContext';

export default function AppLayout() {
  const { isDarkMode } = useTheme();
  
  const backgroundColor = isDarkMode ? '#111827' : '#F7F7F7'; 

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: { display: 'none' },
        sceneStyle: { backgroundColor },
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="pengajuan" options={{ title: 'Pengajuan' }} />
      <Tabs.Screen name="approvals" options={{ title: 'Approvals' }} />
      <Tabs.Screen name="konversi" options={{ title: 'Konversi' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
