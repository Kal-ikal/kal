// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(app)/home.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ FIXED: Removed unused vars, fixed route types
// ===========================================================

import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { 
  Briefcase, 
  TrendingUp, 
  Clock, 
  ChevronRight,
  Bell,
  Plus,
  Sun,
  Moon,
  Wallet
} from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useState, useMemo } from "react";
import { useUserData } from "@/hooks/useUserData";
import { formatDateID, calculateDays } from "@/utils/formatters";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, toggleTheme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Fetch data dari hook - removed 'loading' since not used in UI
  const { 
    employee, 
    history, 
    refetch,
    getLeaveBalanceUI 
  } = useUserData();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // ✅ Gunakan getLeaveBalanceUI untuk data saldo
  const balanceUI = useMemo(() => getLeaveBalanceUI(), [getLeaveBalanceUI]);

  // Get current greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  // ✅ Calculate stats from history with correct status check
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter approved requests - check both 'approved' and 'Disetujui' for backward compatibility
    const approvedRequests = history.filter(req => {
      const status = req.status?.toLowerCase();
      return status === 'approved' || status === 'disetujui';
    });

    // Calculate days used this month
    const thisMonthRequests = approvedRequests.filter(req => {
      const startDate = new Date(req.start_date);
      return startDate.getMonth() === currentMonth && startDate.getFullYear() === currentYear;
    });

    const daysUsedThisMonth = thisMonthRequests.reduce((sum, req) => {
      return sum + calculateDays(req.start_date, req.end_date);
    }, 0);

    // Calculate total days used this year
    const thisYearRequests = approvedRequests.filter(req => {
      const startDate = new Date(req.start_date);
      return startDate.getFullYear() === currentYear;
    });

    const daysUsedThisYear = thisYearRequests.reduce((sum, req) => {
      return sum + calculateDays(req.start_date, req.end_date);
    }, 0);

    // Pending requests count
    const pendingCount = history.filter(req => {
      const status = req.status?.toLowerCase();
      return status === 'pending';
    }).length;

    return {
      thisMonth: daysUsedThisMonth,
      thisYear: daysUsedThisYear,
      pending: pendingCount,
    };
  }, [history]);

  // ✅ Upcoming leaves with correct status check
  const upcomingLeaves = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return history
      .filter(req => {
        const status = req.status?.toLowerCase();
        const isApproved = status === 'approved' || status === 'disetujui';
        const startDate = new Date(req.start_date);
        startDate.setHours(0, 0, 0, 0);
        return isApproved && startDate >= now;
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      .slice(0, 3)
      .map(req => ({
        id: req.id,
        type: req.leave_types?.name || 'Cuti',
        startDate: req.start_date,
        endDate: req.end_date,
        days: calculateDays(req.start_date, req.end_date),
        color: req.leave_types?.badge_color || '#3B82F6',
      }));
  }, [history]);

  // Quick action buttons
  const quickActions = [
    {
      icon: Plus,
      label: "Ajukan Cuti",
      color: "#3B82F6",
      onPress: () => router.push("/(app)/pengajuan"),
    },
    {
      icon: Clock,
      label: "Riwayat",
      color: "#10B981",
      onPress: () => router.push("/(modals)/leave-history"),
    },
    {
      icon: Wallet,
      label: "Konversi",
      color: "#F59E0B",
      onPress: () => router.push("/(app)/konversi"),
    },
  ];

  // ✅ Navigate to reminder detail - using type assertion to bypass strict route checking
  const navigateToReminder = (id: string) => {
    router.push({
      pathname: "/(modals)/reminder-detail" as any,
      params: { id },
    });
  };

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <LinearGradient
          colors={isDarkMode ? ["#1E3A8A", "#1E40AF"] : ["#3B82F6", "#2563EB"]}
          className="px-6 pb-8 rounded-b-3xl"
          style={{ paddingTop: insets.top + 16 }}
        >
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-blue-100 text-sm">{getGreeting()}</Text>
              <Text className="text-white text-xl font-bold">
                {employee?.full_name || "Loading..."}
              </Text>
            </View>
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={toggleTheme}
                className="bg-white/20 p-2 rounded-full mr-3"
              >
                {isDarkMode ? (
                  <Sun color="white" size={20} />
                ) : (
                  <Moon color="white" size={20} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/(modals)/notifications")}
                className="bg-white/20 p-2 rounded-full"
              >
                <Bell color="white" size={20} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Leave Balance Card */}
          <View className="bg-white/20 backdrop-blur-lg rounded-2xl p-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white/90 font-medium">Saldo Cuti Tahunan</Text>
              <View className="bg-white/30 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-medium">
                  {new Date().getFullYear()}
                </Text>
              </View>
            </View>
            
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="text-white text-5xl font-bold">
                  {balanceUI.remaining}
                </Text>
                <Text className="text-white/70 mt-1">hari tersisa</Text>
              </View>
              <View className="items-end">
                <Text className="text-white/80 text-sm">
                  dari {balanceUI.total} hari
                </Text>
                <Text className="text-white/60 text-xs mt-1">
                  Terpakai: {balanceUI.used} hari
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
              <View
                className="h-full bg-white rounded-full"
                style={{
                  width: `${Math.min(100, (balanceUI.remaining / Math.max(1, balanceUI.total)) * 100)}%`,
                }}
              />
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View className="px-6 -mt-4">
          <View
            className={`flex-row justify-around py-4 rounded-2xl shadow-lg ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                className="items-center"
                onPress={action.onPress}
              >
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mb-2"
                  style={{ backgroundColor: `${action.color}15` }}
                >
                  <action.icon color={action.color} size={24} />
                </View>
                <Text
                  className={`text-xs font-medium ${
                    isDarkMode ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats Grid */}
        <View className="px-6 mt-6">
          <Text
            className={`text-lg font-bold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Statistik
          </Text>
          <View className="flex-row flex-wrap justify-between">
            {/* This Month */}
            <View
              className={`w-[48%] p-4 rounded-2xl mb-3 ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <View className="flex-row items-center mb-2">
                <View className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full mr-2">
                  <Briefcase color="#3B82F6" size={16} />
                </View>
                <Text
                  className={`text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Bulan Ini
                </Text>
              </View>
              <Text
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {stats.thisMonth} hari
              </Text>
            </View>

            {/* This Year */}
            <View
              className={`w-[48%] p-4 rounded-2xl mb-3 ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <View className="flex-row items-center mb-2">
                <View className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full mr-2">
                  <TrendingUp color="#10B981" size={16} />
                </View>
                <Text
                  className={`text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Tahun Ini
                </Text>
              </View>
              <Text
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {stats.thisYear} hari
              </Text>
            </View>

            {/* Pending */}
            <View
              className={`w-[48%] p-4 rounded-2xl ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <View className="flex-row items-center mb-2">
                <View className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full mr-2">
                  <Clock color="#F59E0B" size={16} />
                </View>
                <Text
                  className={`text-xs ${
                    isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Pending
                </Text>
              </View>
              <Text
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                {stats.pending}
              </Text>
            </View>
          </View>
        </View>

        {/* Upcoming Leaves */}
        <View className="px-6 mt-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text
              className={`text-lg font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Cuti Mendatang
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(modals)/leave-history")}
              className="flex-row items-center"
            >
              <Text className="text-blue-500 text-sm mr-1">Lihat Semua</Text>
              <ChevronRight color="#3B82F6" size={16} />
            </TouchableOpacity>
          </View>

          {upcomingLeaves.length === 0 ? (
            <View
              className={`p-6 rounded-2xl items-center ${
                isDarkMode ? "bg-gray-800" : "bg-white"
              }`}
            >
              <Clock color="#9CA3AF" size={32} />
              <Text
                className={`mt-2 ${
                  isDarkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Tidak ada cuti mendatang
              </Text>
            </View>
          ) : (
            upcomingLeaves.map((leave) => (
              <TouchableOpacity
                key={leave.id}
                className={`p-4 rounded-2xl mb-3 flex-row items-center ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                }`}
                onPress={() => navigateToReminder(leave.id)}
              >
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-4"
                  style={{ backgroundColor: `${leave.color}20` }}
                >
                  <Briefcase color={leave.color} size={20} />
                </View>
                <View className="flex-1">
                  <Text
                    className={`font-semibold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {leave.type}
                  </Text>
                  <Text
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    {formatDateID(leave.startDate)} - {formatDateID(leave.endDate)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text
                    className={`font-bold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {leave.days} hari
                  </Text>
                  <ChevronRight
                    color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                    size={16}
                  />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
