// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(app)/home.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ V5: All TypeScript warnings fixed, proper null handling
// ===========================================================

import React, { useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Bell,
  Calendar,
  Plus,
  ChevronRight,
  Clock,
  TrendingUp,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/context/ThemeContext";
import { useUserData, useNotifications } from "@/hooks/useUserData";
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { useScrollToTop } from "@react-navigation/native";
import { 
  formatDateShort, 
  getStatusColor, 
  getStatusLabel,
  calculateDays,
  getLeaveTypeColor,
} from "@/utils/formatters";
import type { LeaveRequestWithType } from "@/types/database";

cssInterop(LinearGradient, { className: "style" });

Dimensions.get('window');
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=900&auto=format&fit=crop&q=60";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { onScroll } = useScrollHandler();

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const { employee, history, loading, getLeaveBalanceUI } = useUserData();
  const { unreadCount } = useNotifications();

  // Get leave balance
  const leaveBalance = useMemo(() => getLeaveBalanceUI(), [getLeaveBalanceUI]);

  // Get upcoming leaves (pending or approved, in the future)
  const upcomingLeaves = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return history
      .filter(req => {
        const startDate = new Date(req.start_date);
        return startDate >= today && (req.status === 'pending' || req.status === 'approved');
      })
      .slice(0, 3);
  }, [history]);

  // Get recent history
  const recentHistory = useMemo(() => history.slice(0, 5), [history]);

  const avatar = employee?.avatar_url || DEFAULT_AVATAR;
  const greeting = getGreeting();

  if (loading && !employee) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View className={`${isDarkMode ? "bg-gray-900" : "bg-gray-100"} flex-1`}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ["#1E3A8A", "#1E40AF"] : ["#3B82F6", "#60A5FA"]}
        className="px-6 pb-6 rounded-b-3xl"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => router.push("/(app)/profile")}>
              <Image
                source={{ uri: avatar }}
                className="w-12 h-12 rounded-full border-2 border-white"
              />
            </TouchableOpacity>
            <View className="ml-3 flex-1">
              <Text className="text-blue-100 text-sm">{greeting}</Text>
              <Text className="text-white text-lg font-bold" numberOfLines={1}>
                {employee?.full_name || 'User'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(modals)/notifications")}
            className="relative p-2"
          >
            <Bell color="white" size={24} />
            {unreadCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
                <Text className="text-white text-xs font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Leave Balance Card */}
        <View className="bg-white/20 rounded-2xl p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-white font-medium">Sisa Cuti Tahunan</Text>
            <TouchableOpacity 
              onPress={() => router.push("/(app)/konversi")}
              className="flex-row items-center"
            >
              <TrendingUp color="white" size={16} />
              <Text className="text-white text-sm ml-1">Konversi</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-white text-4xl font-bold">
                {leaveBalance.remaining}
              </Text>
              <Text className="text-blue-100 text-sm">hari tersisa</Text>
            </View>

            <View className="items-end">
              <Text className="text-blue-100 text-sm">
                {leaveBalance.used} terpakai
              </Text>
              <Text className="text-blue-100 text-sm">
                dari {leaveBalance.total} total
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View className="mt-3 h-2 bg-white/30 rounded-full overflow-hidden">
            <View 
              className="h-full bg-white rounded-full"
              style={{ 
                width: `${leaveBalance.total > 0 
                  ? (leaveBalance.remaining / leaveBalance.total) * 100 
                  : 0}%` 
              }}
            />
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
        {/* Quick Actions */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            onPress={() => router.push("/(app)/pengajuan")}
            className={`flex-1 ${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-4 shadow-md`}
          >
            <View className="bg-blue-100 w-10 h-10 rounded-full items-center justify-center mb-2">
              <Plus color="#3B82F6" size={24} />
            </View>
            <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
              Ajukan Cuti
            </Text>
            <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Buat pengajuan baru
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(modals)/leave-history" as never)}
            className={`flex-1 ${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-4 shadow-md`}
          >
            <View className="bg-green-100 w-10 h-10 rounded-full items-center justify-center mb-2">
              <Calendar color="#10B981" size={24} />
            </View>
            <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
              Riwayat
            </Text>
            <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Lihat semua pengajuan
            </Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Leaves */}
        {upcomingLeaves.length > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                Cuti Mendatang
              </Text>
              <TouchableOpacity 
                onPress={() => router.push("/(modals)/leave-history" as never)}
                className="flex-row items-center"
              >
                <Text className="text-blue-500 text-sm">Lihat Semua</Text>
                <ChevronRight color="#3B82F6" size={16} />
              </TouchableOpacity>
            </View>

            {upcomingLeaves.map((leave) => (
              <UpcomingLeaveCard 
                key={leave.id} 
                leave={leave} 
                isDarkMode={isDarkMode} 
              />
            ))}
          </View>
        )}

        {/* Recent History */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
              Riwayat Terbaru
            </Text>
          </View>

          {recentHistory.length === 0 ? (
            <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-6 items-center`}>
              <Clock color="#9CA3AF" size={32} />
              <Text className={`mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Belum ada riwayat pengajuan
              </Text>
            </View>
          ) : (
            recentHistory.map((item) => (
              <HistoryItem 
                key={item.id} 
                item={item} 
                isDarkMode={isDarkMode} 
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ===========================================================
// Helper Components
// ===========================================================

interface UpcomingLeaveCardProps {
  leave: LeaveRequestWithType;
  isDarkMode: boolean;
}

function UpcomingLeaveCard({ leave, isDarkMode }: UpcomingLeaveCardProps) {
  const days = calculateDays(leave.start_date, leave.end_date);
  const typeColor = getLeaveTypeColor(leave.leave_types?.code);
  const statusColors = getStatusColor(leave.status);

  return (
    <View 
      className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-4 mb-3 shadow-md`}
      style={{ borderLeftWidth: 4, borderLeftColor: typeColor }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View 
            className="px-2 py-0.5 rounded mr-2"
            style={{ backgroundColor: typeColor }}
          >
            <Text className="text-white text-xs font-bold">
              {leave.leave_types?.code || 'CT'}
            </Text>
          </View>
          <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
            {leave.leave_types?.name || 'Cuti'}
          </Text>
        </View>
        <View 
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: statusColors.bg }}
        >
          <Text style={{ color: statusColors.text }} className="text-xs font-medium">
            {getStatusLabel(leave.status)}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Calendar color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={14} />
          <Text className={`ml-2 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            {formatDateShort(leave.start_date)} - {formatDateShort(leave.end_date)}
          </Text>
        </View>
        <Text className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
          {days} hari
        </Text>
      </View>
    </View>
  );
}

interface HistoryItemProps {
  item: LeaveRequestWithType;
  isDarkMode: boolean;
}

function HistoryItem({ item, isDarkMode }: HistoryItemProps) {
  const statusColors = getStatusColor(item.status);
  const days = calculateDays(item.start_date, item.end_date);

  return (
    <View 
      className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-4 mb-3 shadow-sm`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
          {item.leave_types?.name || 'Cuti'}
        </Text>
        <View 
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: statusColors.bg }}
        >
          <Text style={{ color: statusColors.text }} className="text-xs font-medium">
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          {formatDateShort(item.start_date)} - {formatDateShort(item.end_date)}
        </Text>
        <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
          {days} hari
        </Text>
      </View>
    </View>
  );
}

// ===========================================================
// Helper Functions
// ===========================================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}
