import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  Calendar,
  Clock,
  Bell,
  FileText,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import {
  formatDateID,
  calculateDays,
  getStatusLabel,
} from "@/utils/formatters";
import type { LeaveRequestFull } from "@/types/database";

export default function ReminderDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<LeaveRequestFull | null>(null);

  // Fetch request detail - defined with useCallback before useEffect
  const fetchRequestDetail = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("leave_requests")
        .select(
          `
          *,
          leave_types (*),
          profiles!leave_requests_user_id_fkey (*)
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      setRequest(data);
    } catch (error) {
      console.error("Error fetching request detail:", error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Call fetch on mount and when id changes
  useEffect(() => {
    fetchRequestDetail();
  }, [fetchRequestDetail]);

  // Calculate days remaining until leave starts
  const getDaysRemaining = useCallback(() => {
    if (!request?.start_date) return 0;
    const start = new Date(request.start_date);
    const today = new Date();
    const diff = Math.ceil(
      (start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff > 0 ? diff : 0;
  }, [request?.start_date]);

  if (loading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text
          className={`mt-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}
        >
          Memuat detail...
        </Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <Text className={isDarkMode ? "text-gray-300" : "text-gray-600"}>
          Data tidak ditemukan
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 px-6 py-2 bg-yellow-500 rounded-lg"
        >
          <Text className="text-white font-medium">Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const daysRemaining = getDaysRemaining();
  const leaveDays = calculateDays(request.start_date, request.end_date);

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <StatusBar style="light" />

      {/* Header */}
      <View
        className="bg-yellow-500 pb-6 rounded-b-3xl"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="px-4 flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-2 -ml-2"
          >
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Pengingat Cuti</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Reminder Header */}
        <View
          className={`rounded-xl p-5 mb-4 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm`}
        >
          <View className="flex-row items-center mb-3">
            <View
              className={`p-2 rounded-full mr-3 ${
                isDarkMode ? "bg-yellow-900/50" : "bg-yellow-100"
              }`}
            >
              <Bell color="#F59E0B" size={20} />
            </View>
            <Text
              className={`text-lg font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Cuti yang Akan Datang
            </Text>
          </View>

          <Text
            className={`text-2xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {request.leave_types?.name || "Cuti"}
          </Text>

          <View className="flex-row mt-4">
            <View className="flex-row items-center mr-4">
              <Calendar color="#6B7280" size={16} />
              <Text
                className={`text-sm ml-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {formatDateID(request.start_date)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Clock color="#6B7280" size={16} />
              <Text
                className={`text-sm ml-2 ${
                  isDarkMode ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {leaveDays} hari
              </Text>
            </View>
          </View>

          {/* Days Counter */}
          <View
            className={`mt-5 p-4 rounded-lg ${
              isDarkMode ? "bg-yellow-900/20" : "bg-yellow-50"
            }`}
          >
            <Text
              className={`text-center font-bold ${
                isDarkMode ? "text-yellow-200" : "text-yellow-800"
              }`}
            >
              {daysRemaining > 0
                ? `${daysRemaining} Hari Lagi`
                : daysRemaining === 0
                ? "Hari Ini!"
                : "Sudah Berlalu"}
            </Text>
          </View>
        </View>

        {/* Leave Details */}
        <View
          className={`rounded-xl p-5 mb-4 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm`}
        >
          <Text
            className={`text-lg font-semibold mb-3 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Detail Cuti
          </Text>

          <View className="h-px bg-gray-200 dark:bg-gray-700 mb-4" />

          <View className="space-y-4">
            <DetailRow
              label="Tanggal Mulai"
              value={formatDateID(request.start_date)}
              isDarkMode={isDarkMode}
            />

            <DetailRow
              label="Tanggal Selesai"
              value={formatDateID(request.end_date)}
              isDarkMode={isDarkMode}
            />

            <DetailRow
              label="Durasi"
              value={`${leaveDays} Hari`}
              isDarkMode={isDarkMode}
            />

            <DetailRow
              label="Alasan"
              value={request.reason || "Tidak ada alasan"}
              isDarkMode={isDarkMode}
            />

            <DetailRow
              label="Status"
              value={getStatusLabel(request.status)}
              isDarkMode={isDarkMode}
              valueColor={
                request.status === "approved"
                  ? "text-green-500"
                  : request.status === "pending"
                  ? "text-yellow-500"
                  : "text-red-500"
              }
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View
          className={`rounded-xl p-5 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm`}
        >
          <Text
            className={`text-lg font-semibold mb-3 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Aksi Cepat
          </Text>

          <View className="h-px bg-gray-200 dark:bg-gray-700 mb-3" />

          <TouchableOpacity
            className="py-3 border-b border-gray-100 dark:border-gray-700"
            onPress={() => router.push(`/(modals)/notification-detail?id=${id}`)}
          >
            <View className="flex-row items-center">
              <FileText color="#3B82F6" size={20} />
              <Text className="text-blue-500 font-medium ml-3">
                Lihat Detail Lengkap
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="py-3"
            onPress={() => router.push("./(modals)/leave-history")}
          >
            <View className="flex-row items-center">
              <Calendar color="#3B82F6" size={20} />
              <Text className="text-blue-500 font-medium ml-3">
                Lihat Riwayat Cuti
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Helper component for detail rows
interface DetailRowProps {
  label: string;
  value: string;
  isDarkMode: boolean;
  valueColor?: string;
}

function DetailRow({
  label,
  value,
  isDarkMode,
  valueColor,
}: DetailRowProps) {
  return (
    <View className="flex-row py-2">
      <Text
        className={`w-32 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
      >
        {label}
      </Text>
      <Text
        className={`flex-1 font-medium ${
          valueColor || (isDarkMode ? "text-white" : "text-gray-900")
        }`}
      >
        {value}
      </Text>
    </View>
  );
}