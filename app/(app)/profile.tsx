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

cssInterop(LinearGradient, { className: "style" });

// Helper for empty state
const formatValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { onScroll } = useScrollHandler();

  // Scroll Ref for Persistent Scroll & Scroll-To-Top
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // Real Data
  const { employee, history, loading} = useUserData();

  // State for modals
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

  const openFullImage = () => {
    setShowFullImage(true);
  };

  const closeFullImage = () => {
    previewAnim.value = withTiming(0, { duration: 200 });
    setTimeout(() => setShowFullImage(false), 200);
  };

  const bgStyle = useAnimatedStyle(() => ({
    opacity: previewAnim.value,
  }));

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
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} // Added padding for tab bar
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Profile Block */}
        <View
          className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 mb-6 shadow-md`}
        >
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
            <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              {formatValue(employee?.position)}
            </Text>
          </View>

          {/* Stats */}
          <View className="flex-row justify-around border-t pt-6" style={{ borderColor: isDarkMode ? "#374151" : "#E5E7EB" }}>
            <View className="items-center">
              <Text className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                {getYearsOfService(employee?.join_date)}
              </Text>
              <Text className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Years</Text>
            </View>

            <View className="items-center">
              <Text className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                {formatValue(employee?.department)}
              </Text>
              <Text className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Department</Text>
            </View>

            <View className="items-center">
              <Text className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                {/* Formatting ID to be shorter or just showing it */}
                {employee?.id ? employee.id.substring(0, 8) : "-"}
              </Text>
              <Text className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>ID</Text>
            </View>
          </View>
        </View>

        {/* Personal Info */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 mb-6 shadow-md`}>
          <Text className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-800"}`}>Personal Information</Text>

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
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Phone</Text>
                <Text className={isDarkMode ? "text-white" : "text-gray-800"}>{formatValue(employee?.phone_number)}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <MapPin size={20} color="#3B82F6" style={{ marginRight: 12 }} />
              <View>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Address</Text>
                <Text className={isDarkMode ? "text-white" : "text-gray-800"}>{formatValue(employee?.address)}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <Calendar size={20} color="#3B82F6" style={{ marginRight: 12 }} />
              <View>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Join Date</Text>
                <Text className={isDarkMode ? "text-white" : "text-gray-800"}>{formatValue(employee?.join_date)}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <Building size={20} color="#3B82F6" style={{ marginRight: 12 }} />
              <View>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Department</Text>
                <Text className={isDarkMode ? "text-white" : "text-gray-800"}>{formatValue(employee?.department)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Leave History */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-2xl p-6 shadow-md`}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>Leave History</Text>
            <TouchableOpacity onPress={() => router.push('/(modals)/leave-history')}>
              <Text className="text-blue-500 font-medium">View All</Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-4">
            {history.slice(0, 5).map((leave, index) => (
              <View key={leave.id} className={`flex-row justify-between items-center pb-4 ${index !== Math.min(history.length, 5) - 1 ? "border-b" : ""}`} style={{ borderColor: isDarkMode ? "#374151" : "#E5E7EB" }}>
                <View>
                  <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>{leave.leave_type}</Text>
                  <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{leave.start_date} to {leave.end_date}</Text>
                </View>

                <View>
                  <Text className={`px-3 py-1 rounded-full text-sm font-medium ${leave.status === "Disetujui" ? isDarkMode ? "bg-green-900 text-green-200" : "bg-green-100 text-green-800" : leave.status === "Dalam Proses" ? isDarkMode ? "bg-yellow-900 text-yellow-200" : "bg-yellow-100 text-yellow-800" : isDarkMode ? "bg-red-900 text-red-200" : "bg-red-100 text-red-800"}`}>{leave.status}</Text>
                </View>
              </View>
            ))}
            {history.length === 0 && (
                <Text className={`text-center py-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>No leave history found</Text>
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
          {/* BLUR BACKDROP */}
          <Animated.View style={[StyleSheet.absoluteFillObject, bgStyle]} />
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={closeFullImage} />

          {/* CLOSE BUTTON */}
          <TouchableOpacity
            onPress={closeFullImage}
            style={{
              position: "absolute",
              top: insets.top + 20,
              right: 20,
              zIndex: 20,
            }}
          >
            <X size={32} color={isDarkMode ? "white" : "black"} />
          </TouchableOpacity>

          {/* IMAGE PREVIEW */}
          <Animated.View style={[imgStyle, { alignSelf: "center", justifyContent: "center", alignItems: "center", flex: 1 }]}>
            <Image
              source={{ uri: avatar }}
              style={{
                width: "95%",
                height: "75%",
                resizeMode: "contain",
                borderRadius: 20,
              }}
            />
          </Animated.View>
        </View>
      )}
    </View>
  );
}