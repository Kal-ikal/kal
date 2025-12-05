// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(modals)/leave-history.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ FIXED: Route type assertion
// ===========================================================

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { JSX, useMemo, useState } from "react";
import { useUserData } from "@/hooks/useUserData";
import { formatDateID, calculateDays, getStatusLabel, getStatusColor } from "@/utils/formatters";

interface LeaveItem {
  id: string;
  type: string;
  typeName: string;
  startDate: string;
  endDate: string;
  status: string;
  statusLabel: string;
  duration: number;
  badgeColor: string;
}

export default function LeaveHistoryScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<string>("Semua");
  const { history, loading } = useUserData();

  const filters = ["Semua", "Disetujui", "Dalam Proses", "Ditolak"];

  // ✅ Transform data dengan relasi leave_types
  const leaveHistory: LeaveItem[] = useMemo(() => {
    return history.map((req) => {
      const days = calculateDays(req.start_date, req.end_date);
      const statusLabel = getStatusLabel(req.status);

      return {
        id: req.id,
        type: req.leave_types?.code || 'CT',
        typeName: req.leave_types?.name || 'Cuti',
        startDate: req.start_date,
        endDate: req.end_date,
        status: req.status,
        statusLabel: statusLabel,
        duration: days,
        badgeColor: req.leave_types?.badge_color || '#3B82F6',
      };
    });
  }, [history]);

  const getStatusStyles = useMemo(() => {
    return (status: string) => {
      const colors = getStatusColor(status);
      return {
        bg: colors.bg,
        text: colors.text,
      };
    };
  }, []);

  const getStatusIcon = (status: string): JSX.Element => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === 'approved' || normalizedStatus === 'disetujui') {
      return <CheckCircle color="#10B981" size={20} />;
    }
    if (normalizedStatus === 'rejected' || normalizedStatus === 'ditolak') {
      return <XCircle color="#EF4444" size={20} />;
    }
    if (normalizedStatus === 'pending' || normalizedStatus === 'dalam proses') {
      return <Clock color="#F59E0B" size={20} />;
    }
    return <Calendar color="#6B7280" size={20} />;
  };

  const filteredHistory = leaveHistory.filter((item) => {
    if (activeFilter === "Semua") return true;
    return item.statusLabel === activeFilter;
  });

  // ✅ Navigate to detail - using type assertion to bypass strict route checking
  const navigateToDetail = (id: string) => {
    router.push({
      pathname: "/(modals)/notification-detail" as any,
      params: { id },
    });
  };

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" />
      <BlurView intensity={50} className="flex-1">
        <View className="flex-1 bg-white/80 dark:bg-gray-900/80">
          <View className="flex-row items-center p-6 pt-12 border-b border-gray-200 dark:border-gray-800">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft color="#6B7280" size={24} />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              Riwayat Cuti
            </Text>
          </View>

          {/* Filters */}
          <View className="px-6 py-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
              contentContainerStyle={{ paddingRight: 24 }}
            >
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  className={`px-6 py-3 rounded-full mr-3 ${
                    activeFilter === filter
                      ? "bg-blue-500"
                      : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-medium ${
                      activeFilter === filter
                        ? "text-white"
                        : "text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* List */}
          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {loading ? (
              <View className="py-20">
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : filteredHistory.length === 0 ? (
              <View className="flex-1 justify-center items-center py-20">
                <Calendar color="#9CA3AF" size={48} />
                <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
                  Tidak ada riwayat cuti ditemukan
                </Text>
              </View>
            ) : (
              filteredHistory.map((leave) => {
                const statusStyles = getStatusStyles(leave.status);
                
                return (
                  <TouchableOpacity
                    key={leave.id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-700"
                    activeOpacity={0.7}
                    onPress={() => navigateToDetail(leave.id)}
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <View 
                            className="w-3 h-3 rounded-full mr-2" 
                            style={{ backgroundColor: leave.badgeColor }} 
                          />
                          <Text className="text-lg font-bold text-gray-900 dark:text-white">
                            {leave.typeName}
                          </Text>
                        </View>
                        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {formatDateID(leave.startDate)} - {formatDateID(leave.endDate)}
                        </Text>
                      </View>

                      <View 
                        className="px-3 py-1 rounded-full"
                        style={{ backgroundColor: statusStyles.bg }}
                      >
                        <Text 
                          className="text-xs font-medium"
                          style={{ color: statusStyles.text }}
                        >
                          {leave.statusLabel}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center pt-3 border-t border-gray-100 dark:border-gray-700">
                      <View className="flex-row items-center flex-1">
                        {getStatusIcon(leave.status)}
                        <Text className="text-gray-600 dark:text-gray-300 ml-2">
                          Durasi: {leave.duration} hari
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </BlurView>
    </View>
  );
}
