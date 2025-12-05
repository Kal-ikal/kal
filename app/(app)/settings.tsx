// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(app)/settings.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ FIXED V3: Connected to real profile data from Supabase
// ===========================================================

import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Bell,
  User,
  Shield,
  FileText,
  Sun,
  Moon,
  LogOut,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Briefcase,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { useScrollHandler } from "@/hooks/useScrollHandler";
import LogoutModal from '@/components/LogoutModal';
import { supabase } from '@/lib/supabase';

cssInterop(LinearGradient, { className: "style" });
cssInterop(Switch, { className: false });

// Helper to format date
const formatDateDisplay = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

// Helper to format phone
const formatPhoneDisplay = (phone: string | null | undefined): string => {
  if (!phone) return "-";
  // Format: 0812-3456-7890
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  }
  return phone;
};

// Helper to get role label
const getRoleLabel = (role: string | null | undefined): string => {
  switch (role) {
    case 'employee': return 'Karyawan';
    case 'manager': return 'Manager';
    case 'dfd': return 'DFD (Direktur)';
    case 'hrd': return 'HRD';
    default: return role || '-';
  }
};

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  // ✅ FIXED: Use profile from useUserData hook
  const { profile, loading } = useUserData();
  const { onScroll } = useScrollHandler();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [leavePolicy, setLeavePolicy] = useState<any[]>([]);
  const [loadingPolicy, setLoadingPolicy] = useState(true);

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });

  // ✅ FIXED: Fetch leave policy from database
  useEffect(() => {
    const fetchLeavePolicy = async () => {
      try {
        setLoadingPolicy(true);
        const { data, error } = await supabase
          .from('leave_types')
          .select('*')
          .order('name');

        if (error) {
          console.error('Error fetching leave types:', error);
          // Fallback to default
          setLeavePolicy([
            { name: "Cuti Tahunan", max_days: 12, description: "Cuti tahunan reguler" },
            { name: "Cuti Sakit", max_days: 10, description: "Cuti karena sakit" },
            { name: "Cuti Khusus", max_days: 5, description: "Cuti untuk keperluan khusus" },
          ]);
        } else {
          setLeavePolicy(data || []);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoadingPolicy(false);
      }
    };

    fetchLeavePolicy();
  }, []);

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const toggleNotification = (type: "email" | "push" | "sms") => {
    setNotifications((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const onConfirmLogout = async () => {
    try {
      setShowLogoutModal(false);
      await signOut();
      // AuthGuard will handle redirection
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to logout");
    }
  };

  if (loading) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? "bg-gray-900" : "bg-[#F7F7F7]"}`}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View className={`${isDarkMode ? "bg-gray-900" : "bg-[#F7F7F7]"} flex-1`}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ["#1E3A8A", "#1E40AF"] : ["#3B82F6", "#60A5FA"]}
        className="px-6 pb-6 rounded-b-3xl"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 24 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-xl font-bold">Pengaturan</Text>
            <Text className="text-blue-100 text-sm mt-1">
              Kelola preferensi akun Anda
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View className="px-4 mt-6">
          
          {/* Account - ✅ FIXED: Using real profile data */}
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
            <View className="flex-row items-center mb-4">
              <User color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold ml-2`}>
                Informasi Akun
              </Text>
            </View>

            {/* Name */}
            <View className="mb-4">
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-1`}>
                Nama Lengkap
              </Text>
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                {profile?.full_name || "-"}
              </Text>
            </View>

            {/* Email */}
            <View className="mb-4">
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-1`}>
                Email
              </Text>
              <View className="flex-row items-center">
                <Mail color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={16} style={{ marginRight: 8 }} />
                <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                  {profile?.email || "-"}
                </Text>
              </View>
            </View>

            {/* Phone - ✅ FIXED: Using real phone from profile */}
            <View className="mb-4">
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-1`}>
                Nomor Telepon
              </Text>
              <View className="flex-row items-center">
                <Phone color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={16} style={{ marginRight: 8 }} />
                <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                  {formatPhoneDisplay(profile?.phone)}
                </Text>
              </View>
            </View>

            {/* Department */}
            <View className="mb-4">
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-1`}>
                Departemen
              </Text>
              <View className="flex-row items-center">
                <Briefcase color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={16} style={{ marginRight: 8 }} />
                <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                  {profile?.department || "-"}
                </Text>
              </View>
            </View>

            {/* Role */}
            <View className="mb-4">
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-1`}>
                Jabatan
              </Text>
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                {getRoleLabel(profile?.role)}
              </Text>
            </View>

            {/* Join Date */}
            <View className="mb-4">
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-1`}>
                Tanggal Bergabung
              </Text>
              <View className="flex-row items-center">
                <Calendar color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={16} style={{ marginRight: 8 }} />
                <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                  {formatDateDisplay(profile?.join_date)}
                </Text>
              </View>
            </View>

            {/* Leave Balance */}
            <View className="mb-4">
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-1`}>
                Sisa Cuti Tahunan
              </Text>
              <Text className={`${isDarkMode ? "text-blue-400" : "text-blue-600"} font-bold text-lg`}>
                {profile?.leave_balance ?? 0} hari
              </Text>
            </View>

            {/* Employee ID */}
            <View>
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-1`}>
                Employee ID
              </Text>
              <Text className={`${isDarkMode ? "text-gray-400" : "text-gray-500"} font-medium text-xs`}>
                {profile?.id || "-"}
              </Text>
            </View>
          </View>

          {/* Appearance */}
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
            <View className="flex-row items-center mb-4">
              <Sun color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold ml-2`}>
                Tampilan
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-3">
              <View className="flex-row items-center">
                {isDarkMode ? (
                  <Moon color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
                ) : (
                  <Sun color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
                )}
                <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium ml-3`}>
                  {isDarkMode ? "Mode Gelap" : "Mode Terang"}
                </Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={handleToggleTheme}
                trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                thumbColor={isDarkMode ? "#3B82F6" : "#3B82F6"}
              />
            </View>
          </View>

          {/* Notifications */}
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
            <View className="flex-row items-center mb-4">
              <Bell color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold ml-2`}>
                Notifikasi
              </Text>
            </View>
            {(["email", "push", "sms"] as const).map((type, i) => (
              <View
                key={type}
                className={`flex-row justify-between items-center py-3 ${
                  i !== 2 ? "border-b" : ""
                }`}
                style={{ borderColor: isDarkMode ? "#374151" : "#E5E7EB" }}
              >
                <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                  {type === "email" ? "Email" : type === "push" ? "Push" : "SMS"} Notifikasi
                </Text>
                <Switch
                  value={notifications[type]}
                  onValueChange={() => toggleNotification(type)}
                  trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                  thumbColor={isDarkMode ? "#3B82F6" : "#3B82F6"}
                />
              </View>
            ))}
          </View>

          {/* Leave Policy - ✅ FIXED: Fetch from database */}
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
            <View className="flex-row items-center mb-4">
              <FileText color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold ml-2`}>
                Kebijakan Cuti
              </Text>
            </View>
            {loadingPolicy ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              leavePolicy.map((policy, index) => (
                <View
                  key={index}
                  className={`py-3 ${
                    index !== leavePolicy.length - 1 ? "border-b" : ""
                  }`}
                  style={{ borderColor: isDarkMode ? "#374151" : "#E5E7EB" }}
                >
                  <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium mb-1`}>
                    {policy.name}
                  </Text>
                  <View className="flex-row items-center">
                    <Calendar color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={14} style={{ marginRight: 8 }} />
                    <Text className={`${isDarkMode ? "text-gray-400" : "text-gray-500"} text-sm`}>
                      {policy.max_days || 0} hari/tahun
                    </Text>
                  </View>
                  {policy.description && (
                    <Text className={`${isDarkMode ? "text-gray-500" : "text-gray-400"} text-xs mt-1`}>
                      {policy.description}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>

          {/* Security */}
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
            <View className="flex-row items-center mb-4">
              <Shield color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold ml-2`}>
                Keamanan
              </Text>
            </View>
            <TouchableOpacity 
              className="py-3"
              onPress={() => Alert.alert("Coming Soon", "Fitur ubah password akan segera tersedia")}
            >
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                Ubah Password
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="py-3 border-t" 
              style={{ borderColor: isDarkMode ? "#374151" : "#E5E7EB" }}
              onPress={() => Alert.alert("Coming Soon", "Fitur 2FA akan segera tersedia")}
            >
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                Autentikasi Dua Faktor
              </Text>
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity
            className={`rounded-xl p-4 mb-6 flex-row justify-center items-center ${
              isDarkMode ? "bg-red-700" : "bg-red-500"
            } shadow-md`}
            onPress={handleLogout}
          >
            <LogOut color="white" size={20} style={{ marginRight: 8 }} />
            <Text className="text-white text-center font-bold text-lg">
              Keluar
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={onConfirmLogout}
        isDarkMode={isDarkMode}
      />
    </View>
  );
}
