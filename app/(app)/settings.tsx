import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  User,
  Sun,
  Moon,
  Bell,
  FileText,
  LogOut,
  Calendar,
  Clock,
  Info,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useUserData, useLeaveTypes } from "@/hooks/useUserData";
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { useScrollToTop } from "@react-navigation/native";
import {
  formatValue,
  formatPhoneDisplay,
  getRoleLabel,
  formatDateID,
  getLeaveTypeColor,
} from "@/utils/formatters";
import type { LeaveType } from "@/types/database";

// IMPORT MODAL DI SINI (Sesuaikan path-nya)
import LogoutModal from "@/components/LogoutModal"; 

cssInterop(LinearGradient, { className: "style" });

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const { onScroll } = useScrollHandler();

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // Fetch user data
  const { profile, loading: profileLoading } = useUserData();

  // Fetch leave types from master data
  const { leaveTypes, loading: typesLoading } = useLeaveTypes();

  // STATE UNTUK MODAL LOGOUT
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const toggleNotification = (type: "email" | "push" | "sms") => {
    setNotifications((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  // 1. Trigger Modal Open
  const handleLogoutPress = () => {
    setShowLogoutModal(true);
  };

  // 2. Logic Logout Sebenarnya
  const handleConfirmLogout = async () => {
    // Tutup modal dulu agar UX terasa responsif
    setShowLogoutModal(false);
    
    // Lakukan proses sign out
    await signOut();
    
    // Redirect ke halaman login/awal
    router.replace("/");
  };

  const loading = profileLoading || typesLoading;

  if (loading) {
    return (
      <View
        className={`flex-1 justify-center items-center ${
          isDarkMode ? "bg-gray-900" : "bg-[#F7F7F7]"
        }`}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View className={`${isDarkMode ? "bg-gray-900" : "bg-[#F7F7F7]"} flex-1`}>
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
            <Text className="text-white text-xl font-bold">Pengaturan</Text>
            <Text className="text-blue-100 text-sm mt-1">
              Kelola preferensi dan informasi akun
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4 mt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Account Info - From Database */}
        <View
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-xl p-5 shadow-md mb-6`}
        >
          <View className="flex-row items-center mb-4">
            <User color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
            <Text
              className={`${
                isDarkMode ? "text-white" : "text-[#1A1D23]"
              } text-lg font-bold ml-2`}
            >
              Informasi Akun
            </Text>
          </View>

          <View className="mb-4">
            <Text
              className={`${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              } text-sm mb-1`}
            >
              Nama Lengkap
            </Text>
            <Text
              className={`${
                isDarkMode ? "text-white" : "text-[#1A1D23]"
              } font-medium`}
            >
              {formatValue(profile?.full_name)}
            </Text>
          </View>

          <View className="mb-4">
            <Text
              className={`${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              } text-sm mb-1`}
            >
              Email
            </Text>
            <Text
              className={`${
                isDarkMode ? "text-white" : "text-[#1A1D23]"
              } font-medium`}
            >
              {formatValue(profile?.email)}
            </Text>
          </View>

          <View className="mb-4">
            <Text
              className={`${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              } text-sm mb-1`}
            >
              Telepon
            </Text>
            <Text
              className={`${
                isDarkMode ? "text-white" : "text-[#1A1D23]"
              } font-medium`}
            >
              {formatPhoneDisplay(profile?.phone)}
            </Text>
          </View>

          <View className="mb-4">
            <Text
              className={`${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              } text-sm mb-1`}
            >
              Departemen
            </Text>
            <Text
              className={`${
                isDarkMode ? "text-white" : "text-[#1A1D23]"
              } font-medium`}
            >
              {formatValue(profile?.department)}
            </Text>
          </View>

          <View className="mb-4">
            <Text
              className={`${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              } text-sm mb-1`}
            >
              Role
            </Text>
            <Text
              className={`${
                isDarkMode ? "text-white" : "text-[#1A1D23]"
              } font-medium`}
            >
              {getRoleLabel(profile?.role)}
            </Text>
          </View>

          <View className="mb-4">
            <Text
              className={`${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              } text-sm mb-1`}
            >
              Tanggal Bergabung
            </Text>
            <Text
              className={`${
                isDarkMode ? "text-white" : "text-[#1A1D23]"
              } font-medium`}
            >
              {formatDateID(profile?.join_date)}
            </Text>
          </View>

          <View>
            <Text
              className={`${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              } text-sm mb-1`}
            >
              Sisa Cuti Tahunan
            </Text>
            <Text
              className={`${
                isDarkMode ? "text-white" : "text-[#1A1D23]"
              } font-medium`}
            >
              {profile?.leave_balance ?? 0} hari
            </Text>
          </View>
        </View>

        {/* Appearance */}
        <View
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-xl p-5 shadow-md mb-6`}
        >
          <View className="flex-row items-center mb-4">
            <Sun color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
            <Text
              className={`${
                isDarkMode ? "text-white" : "text-[#1A1D23]"
                } text-lg font-bold ml-2`}
            >
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
              <Text
                className={`${
                  isDarkMode ? "text-white" : "text-[#1A1D23]"
                } font-medium ml-3`}
              >
                {isDarkMode ? "Mode Gelap" : "Mode Terang"}
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={handleToggleTheme}
              trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
              thumbColor="#3B82F6"
            />
          </View>
        </View>

        {/* Notifications */}
        <View
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-xl p-5 shadow-md mb-6`}
        >
          <View className="flex-row items-center mb-4">
            <Bell color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
            <Text
              className={`${
                isDarkMode ? "text-white" : "text-[#1A1D23]"
              } text-lg font-bold ml-2`}
            >
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
              <Text
                className={`${
                  isDarkMode ? "text-white" : "text-[#1A1D23]"
                } font-medium`}
              >
                {type === "email" ? "Email" : type === "push" ? "Push" : "SMS"}
              </Text>
              <Switch
                value={notifications[type]}
                onValueChange={() => toggleNotification(type)}
                trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                thumbColor="#3B82F6"
              />
            </View>
          ))}
        </View>

        {/* Leave Policy - From Master Data */}
        <View
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-xl p-5 shadow-md mb-6`}
        >
          <View className="flex-row items-center mb-4">
            <FileText color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
            <Text
              className={`${
                isDarkMode ? "text-white" : "text-[#1A1D23]"
              } text-lg font-bold ml-2`}
            >
              Kebijakan Cuti
            </Text>
          </View>

          {leaveTypes.length === 0 ? (
            <Text
              className={`${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              } text-center py-4`}
            >
              Tidak ada data kebijakan cuti
            </Text>
          ) : (
            leaveTypes.map((leaveType, index) => (
              <LeaveTypeItem
                key={leaveType.id}
                leaveType={leaveType}
                isLast={index === leaveTypes.length - 1}
                isDarkMode={isDarkMode}
              />
            ))
          )}
        </View>

        {/* App Info */}
        <View
          className={`${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } rounded-xl p-5 shadow-md mb-6`}
        >
          <View className="flex-row items-center mb-4">
            <Info color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
            <Text
              className={`${
                isDarkMode ? "text-white" : "text-[#1A1D23]"
              } text-lg font-bold ml-2`}
            >
              Informasi Aplikasi
            </Text>
          </View>

          <View className="flex-row justify-between py-2">
            <Text
              className={`${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              Versi
            </Text>
            <Text
              className={`${
                isDarkMode ? "text-white" : "text-[#1A1D23]"
              } font-medium`}
            >
              1.0.0
            </Text>
          </View>

          <View className="flex-row justify-between py-2">
            <Text
              className={`${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
            >
              Platform
            </Text>
            <Text
              className={`${
                isDarkMode ? "text-white" : "text-[#1A1D23]"
              } font-medium`}
            >
              Expo + React Native
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        {/* Mengubah handler ke handleLogoutPress untuk membuka modal */}
        <TouchableOpacity
          onPress={handleLogoutPress}
          className="bg-red-500 rounded-xl p-4 mb-6 flex-row items-center justify-center"
        >
          <LogOut color="white" size={20} />
          <Text className="text-white font-bold ml-2">Keluar</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL COMPONENT */}
      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        isDarkMode={isDarkMode}
      />
    </View>
  );
}

// ===========================================================
// Leave Type Item Component
// ===========================================================

interface LeaveTypeItemProps {
  leaveType: LeaveType;
  isLast: boolean;
  isDarkMode: boolean;
}

function LeaveTypeItem({ leaveType, isLast, isDarkMode }: LeaveTypeItemProps) {
  const badgeColor = getLeaveTypeColor(leaveType.code);

  return (
    <View
      className={`py-3 ${!isLast ? "border-b" : ""}`}
      style={{ borderColor: isDarkMode ? "#374151" : "#E5E7EB" }}
    >
      {/* Header with badge */}
      <View className="flex-row items-center mb-2">
        <View
          className="px-2 py-0.5 rounded mr-2"
          style={{ backgroundColor: badgeColor }}
        >
          <Text className="text-white text-xs font-bold">{leaveType.code}</Text>
        </View>
        <Text
          className={`${
            isDarkMode ? "text-white" : "text-[#1A1D23]"
          } font-medium flex-1`}
        >
          {leaveType.name}
        </Text>
      </View>

      {/* Details */}
      <View className="ml-1">
        <View className="flex-row items-center mb-1">
          <Calendar
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            size={14}
            style={{ marginRight: 8 }}
          />
          <Text
            className={`${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            } text-sm`}
          >
            {leaveType.max_days
              ? `${leaveType.max_days} hari/tahun`
              : "Tidak terbatas"}
          </Text>
        </View>

        <View className="flex-row items-center mb-1">
          <Clock
            color={isDarkMode ? "#9CA3AF" : "#6B7280"}
            size={14}
            style={{ marginRight: 8 }}
          />
          <Text
            className={`${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            } text-sm`}
          >
            {leaveType.is_quota_deduction
              ? "Potong Saldo"
              : "Tidak Potong Saldo"}
          </Text>
        </View>

        {leaveType.requires_file && (
          <View className="flex-row items-center">
            <FileText
              color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              size={14}
              style={{ marginRight: 8 }}
            />
            <Text
              className={`${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              } text-sm`}
            >
              Wajib Lampiran
            </Text>
          </View>
        )}

        {leaveType.description && (
          <Text
            className={`${
              isDarkMode ? "text-gray-500" : "text-gray-400"
            } text-xs mt-1 italic`}
          >
            {leaveType.description}
          </Text>
        )}
      </View>
    </View>
  );
}