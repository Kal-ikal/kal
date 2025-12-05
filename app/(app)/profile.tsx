// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(app)/profile.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ V8: Service Integration & Deprecation Fixes
// ===========================================================

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Edit3,
  Calendar,
  Phone,
  Mail,
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
import { BlurView } from "expo-blur";
import { useUserData } from "@/hooks/useUserData";
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { useScrollToTop } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
// 👇 IMPORT SERVICE
import { uploadUserProfilePhoto } from "@/services/profileService";
import { 
  formatDateID, 
  getStatusLabel, 
  getStatusColor,
  formatValue,
  getRoleLabel,
  getYearsOfService,
  formatPhoneDisplay,
} from "@/utils/formatters";

cssInterop(LinearGradient, { className: "style" });

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=900&auto=format&fit=crop&q=60";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { onScroll } = useScrollHandler();
  const { user } = useAuth(); // Ambil user untuk ID

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // Ambil data user + fungsi refetch
  const { employee, history, loading, refetch } = useUserData();

  const [showEditModal, setShowEditModal] = useState(false);
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [isUploading, setIsUploading] = useState(false); // Loading state saat upload

  // Update avatar lokal saat data employee berubah (misal setelah refetch)
  useEffect(() => {
    if (employee?.avatar_url) {
      setAvatar(employee.avatar_url);
    }
  }, [employee]);

  // === HANDLER: Upload Foto via Service ===
  const handleAvatarUpdate = async (uri: string) => {
    // 1. Update UI dulu (Optimistic)
    setAvatar(uri);
    setShowEditModal(false);

    if (!user?.id) return;

    try {
      setIsUploading(true);
      
      // 2. Panggil Service
      const result = await uploadUserProfilePhoto(user.id, uri);

      if (!result.success) {
        throw new Error(result.error);
      }

      // 3. Refresh data global agar persistent (tersimpan di database)
      await refetch();
      Alert.alert("Berhasil", "Foto profil berhasil diperbarui!");

    } catch (error: any) {
      console.error(error);
      Alert.alert("Gagal", "Gagal mengunggah foto. Periksa koneksi Anda.");
      // Rollback ke foto lama jika gagal
      if (employee?.avatar_url) setAvatar(employee.avatar_url);
    } finally {
      setIsUploading(false);
    }
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
            <Text className="text-white text-xl font-bold">Profil Saya</Text>
            <Text className="text-blue-100 text-sm mt-1">
              Informasi personal dan riwayat cuti
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
              Profil
            </Text>
            <TouchableOpacity
              className={`${isDarkMode ? "bg-blue-600" : "bg-blue-500"} rounded-full p-3`}
              onPress={() => setShowEditModal(true)}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Edit3 size={20} color="white" />
              )}
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
                {employee?.leave_balance ?? 0}
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
            <View className="flex-row items-center mb-3">
              <Mail size={20} color="#3B82F6" style={{ marginRight: 12 }} />
              <View>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Email</Text>
                <Text className={isDarkMode ? "text-white" : "text-gray-800"}>
                  {formatValue(employee?.email)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center mb-3">
              <Phone size={20} color="#3B82F6" style={{ marginRight: 12 }} />
              <View>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Telepon</Text>
                <Text className={isDarkMode ? "text-white" : "text-gray-800"}>
                  {formatPhoneDisplay(employee?.phone)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center mb-3">
              <Building size={20} color="#3B82F6" style={{ marginRight: 12 }} />
              <View>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Departemen</Text>
                <Text className={isDarkMode ? "text-white" : "text-gray-800"}>
                  {formatValue(employee?.department)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center mb-3">
              <Briefcase size={20} color="#3B82F6" style={{ marginRight: 12 }} />
              <View>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Role</Text>
                <Text className={isDarkMode ? "text-white" : "text-gray-800"}>
                  {getRoleLabel(employee?.role)}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <Calendar size={20} color="#3B82F6" style={{ marginRight: 12 }} />
              <View>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Tanggal Bergabung</Text>
                <Text className={isDarkMode ? "text-white" : "text-gray-800"}>
                  {formatDateID(employee?.join_date)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Leave History */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 mb-6 shadow-md`}>
          <Text className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
            Riwayat Cuti Terbaru
          </Text>

          {history.length === 0 ? (
            <Text className={`text-center ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Belum ada riwayat cuti
            </Text>
          ) : (
            history.slice(0, 5).map((item) => {
              const statusColors = getStatusColor(item.status);
              return (
                <View
                  key={item.id}
                  className={`flex-row items-center justify-between py-3 border-b ${
                    isDarkMode ? "border-gray-700" : "border-gray-200"
                  }`}
                >
                  <View className="flex-1">
                    <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                      {item.leave_types?.name || 'Cuti'}
                    </Text>
                    <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {formatDateID(item.start_date)} - {formatDateID(item.end_date)}
                    </Text>
                  </View>
                  <View 
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: statusColors.bg }}
                  >
                    <Text style={{ color: statusColors.text }} className="text-xs font-medium">
                      {getStatusLabel(item.status)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}

          {history.length > 5 && (
            <TouchableOpacity
              className="mt-4 py-2"
              onPress={() => router.push("/(modals)/leave-history" as never)}
            >
              <Text className="text-blue-500 text-center font-medium">
                Lihat Semua Riwayat
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Full Image Preview Modal */}
      <Modal
        visible={showFullImage}
        transparent={true}
        onRequestClose={closeFullImage}
        animationType="fade"
        statusBarTranslucent
      >
        <BlurView
          intensity={25}
          tint={isDarkMode ? 'dark' : 'light'}
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        >
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: isDarkMode ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.2)' }}>
            <TouchableOpacity
              style={{
                position: "absolute",
                top: insets.top + 20,
                right: 20,
                zIndex: 20,
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                padding: 10,
                borderRadius: 30,
              }}
              onPress={closeFullImage}
            >
              <X color={isDarkMode ? "white" : "black"} size={26} />
            </TouchableOpacity>

            <Animated.View style={imgStyle}>
              <Image
                source={{ uri: avatar }}
                style={{
                  width: 300,
                  height: 300,
                  borderRadius: 150,
                  borderWidth: 4,
                  borderColor: isDarkMode ? 'white' : '#3B82F6',
                }}
                resizeMode="cover"
              />
              <Text style={{ 
                color: isDarkMode ? 'white' : 'black', 
                textAlign: 'center', 
                marginTop: 24, 
                fontSize: 20, 
                fontWeight: '700',
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 4
              }}>
                {formatValue(employee?.full_name)}
              </Text>
            </Animated.View>
          </View>
        </BlurView>
      </Modal>

      {/* Edit Modal dengan handler baru */}
      <EditProfilePhotoModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        currentAvatar={avatar}
        onAvatarChange={handleAvatarUpdate} 
        isDarkMode={isDarkMode}
      />
    </View>
  );
}