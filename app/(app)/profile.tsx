// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(app)/profile.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ===========================================================

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Edit3,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Building,
  ChevronLeft,
  X,
  Briefcase,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/context/ThemeContext";
import EditProfilePhotoModal from "@/components/EditProfilePhotoModal";
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  useSharedValue,
} from "react-native-reanimated";
import { useUserData } from "@/hooks/useUserData";
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { useScrollToTop } from "@react-navigation/native";
import { formatDateID, getStatusLabel, getStatusColor } from "@/utils/formatters";

cssInterop(LinearGradient, { className: "style" });

// Helper for empty state
const formatValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

// ✅ PERUBAHAN: Mapping role ke label yang lebih readable
const getRoleLabel = (role: string | undefined) => {
  switch (role) {
    case 'employee': return 'Karyawan';
    case 'manager': return 'Manager';
    case 'dfd': return 'DFD';
    case 'hrd': return 'HRD';
    default: return role || '-';
  }
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { onScroll } = useScrollHandler();

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // ✅ PERUBAHAN: Pakai hook baru
  const { employee, history, loading } = useUserData();

  const [showEditModal, setShowEditModal] = useState(false);
  const [avatar, setAvatar] = useState("https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=900&auto=format&fit=crop&q=60");

  // Update avatar when employee data loads
  useEffect(() => {
    if (employee?.avatar_url) {
      setAvatar(employee.avatar_url);
    }
  }, [employee]);

  // Calculate years of service
  const getYearsOfService = (joinDate: string | undefined) => {
    if (!joinDate) return "-";
    const start = new Date(joinDate);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const years = diff / (1000 * 60 * 60 * 24 * 365.25);
    return years.toFixed(1);
  };

  // === Full Image Preview ===
  const [showFullImage, setShowFullImage] = useState(false);
  const previewAnim = useSharedValue(0);

  useEffect(() => {
    if (showFullImage) {
      previewAnim.value = withTiming(1, { duration: 250 });
    } else {
      previewAnim.value = withTiming(0, { duration: 200 });
    }
  }, [showFullImage, previewAnim]);

  const openFullImage = () => setShowFullImage(true);

  const closeFullImage = () => {
    previewAnim.value = withTiming(0, { duration: 200 });
    setTimeout(() => setShowFullImage(false), 200);
  };

  const bgStyle = useAnimatedStyle(() => ({ opacity: previewAnim.value }));

  const imgStyle = useAnimatedStyle(() => ({
    opacity: previewAnim.value,
    transform: [{ scale: withSpring(previewAnim.value ? 1 : 0.85) }],
  }));

  if (loading && !employee) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View className={`${isDarkMode ? "bg-gray-900" : "bg-gray-100"} flex-1`}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

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
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">My Profile</Text>
            <Text className="text-blue-100 text-sm mt-1">
              Personal information and leave history
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Main */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4 mt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Profile Block */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 mb-6 shadow-md`}>
          <View className="flex-row items-center justify-between mb-6">
            <Text className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
              My Profile
            </Text>
            <TouchableOpacity
              className={`${isDarkMode ? "bg-blue-600" : "bg-blue-500"} rounded-full p-3`}
              onPress={() => setShowEditModal(true)}
            >
              <Edit3 size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View className="items-center mb-6">
            <TouchableOpacity onPress={openFullImage}>
              <Image
                source={{ uri: avatar }}
                className="w-24 h-24 rounded-full mb-4 border-4 border-blue-500"
              />
            </TouchableOpacity>

            <Text className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
              {formatValue(employee?.full_name)}
            </Text>
            {/* ✅ PERUBAHAN: Tampilkan role bukan position */}
            <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              {getRoleLabel(employee?.role)}
            </Text>
          </View>

          {/* Stats */}
          <View className="flex-row justify-around border-t pt-6" style={{ borderColor: isDarkMode ? "#374151" : "#E5E7EB" }}>
            <View className="items-center">
              <Text className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                {getYearsOfService(employee?.join_date)}
              </Text>
              <Text className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Tahun</Text>
            </View>

            <View className="items-center">
              <Text className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                {formatValue(employee?.leave_balance)}
              </Text>
              <Text className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Sisa Cuti</Text>
            </View>

            <View className="items-center">
              <Text className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                {employee?.status === 'active' ? 'Aktif' : 'Nonaktif'}
              </Text>
              <Text className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Status</Text>
            </View>
          </View>
        </View>

        {/* Personal Info */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 mb-6 shadow-md`}>
          <Text className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
            Informasi Personal
          </Text>

          <View className="space-y-4">
            <View className="flex-row items-center">
              <Mail size={20} color="#3B82F6" style={{ marginRight: 12 }} />
              <View>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Email</Text>
                <Text className={isDarkMode ? "text-white" : "text-gray-800"}>{formatValue(employee?.email)}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <Phone size={20} color="#3B82F6" style={{ marginRight: 12 }} />
              <View>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Telepon</Text>
                {/* ✅ PERUBAHAN: Pakai phone bukan phone_number */}
                <Text className={isDarkMode ? "text-white" : "text-gray-800"}>{formatValue(employee?.phone)}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <Building size={20} color="#3B82F6" style={{ marginRight: 12 }} />
              <View>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Departemen</Text>
                <Text className={isDarkMode ? "text-white" : "text-gray-800"}>{formatValue(employee?.department)}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <Briefcase size={20} color="#3B82F6" style={{ marginRight: 12 }} />
              <View>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Role</Text>
                <Text className={isDarkMode ? "text-white" : "text-gray-800"}>{getRoleLabel(employee?.role)}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <Calendar size={20} color="#3B82F6" style={{ marginRight: 12 }} />
              <View>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Tanggal Bergabung</Text>
                <Text className={isDarkMode ? "text-white" : "text-gray-800"}>
                  {employee?.join_date ? formatDateID(employee.join_date) : '-'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Leave History */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 shadow-md`}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
              Riwayat Cuti
            </Text>
            <TouchableOpacity onPress={() => router.push('/(modals)/leave-history')}>
              <Text className="text-blue-500 font-medium">Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            {history.slice(0, 5).map((leave, index) => {
              // ✅ PERUBAHAN: Ambil nama leave type dari relasi
              const leaveTypeName = leave.leave_types?.name || 'Cuti';
              const statusLabel = getStatusLabel(leave.status);
              const statusColors = getStatusColor(leave.status);

              return (
                <View 
                  key={leave.id} 
                  className={`flex-row justify-between items-center pb-4 ${index !== Math.min(history.length, 5) - 1 ? "border-b" : ""}`} 
                  style={{ borderColor: isDarkMode ? "#374151" : "#E5E7EB" }}
                >
                  <View>
                    <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                      {leaveTypeName}
                    </Text>
                    <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {formatDateID(leave.start_date)} - {formatDateID(leave.end_date)}
                    </Text>
                  </View>

                  <View 
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: statusColors.bg }}
                  >
                    <Text className="text-xs font-medium" style={{ color: statusColors.text }}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>
              );
            })}
            {history.length === 0 && (
              <Text className={`text-center py-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Belum ada riwayat cuti
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* === Edit Photo Modal === */}
      {showEditModal && (
        <EditProfilePhotoModal
          onClose={() => setShowEditModal(false)}
          onSave={(uri) => {
            if (uri) setAvatar(uri);
            setShowEditModal(false);
          }}
        />
      )}

      {/* === FULL IMAGE PREVIEW MODAL === */}
      {showFullImage && (
        <View style={StyleSheet.absoluteFillObject}>
          <Animated.View style={[StyleSheet.absoluteFillObject, bgStyle]} />
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={closeFullImage} />

          <TouchableOpacity
            onPress={closeFullImage}
            style={{ position: "absolute", top: insets.top + 20, right: 20, zIndex: 20 }}
          >
            <X size={32} color={isDarkMode ? "white" : "black"} />
          </TouchableOpacity>

          <Animated.View style={[imgStyle, { alignSelf: "center", justifyContent: "center", alignItems: "center", flex: 1 }]}>
            <Image
              source={{ uri: avatar }}
              style={{ width: "95%", height: "75%", resizeMode: "contain", borderRadius: 20 }}
            />
          </Animated.View>
        </View>
      )}
    </View>
  );
}
