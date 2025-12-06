// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(modals)/reminder-detail.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ V9: Original UI + Real data + Working features
//        - Cancel Leave Request (if pending)
//        - View Full Details
//        - View Leave History
// ===========================================================

import React, { useEffect, useState, useCallback } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { 
  ChevronLeft, 
  Calendar, 
  Clock, 
  Bell, 
  User, 
  FileText,
  Trash2,
  History,
  AlertTriangle,
  Edit3,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/NotificationToastContext";
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
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<LeaveRequestFull | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Fetch request detail - wrapped in useCallback
  const fetchRequestDetail = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          *,
          leave_types (*),
          profiles!leave_requests_user_id_fkey (*)
        `)
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

  // Call fetch on mount
  useEffect(() => {
    fetchRequestDetail();
  }, [fetchRequestDetail]);

  // Calculate days remaining until leave starts
  const getDaysRemaining = useCallback(() => {
    if (!request?.start_date) return 0;
    const start = new Date(request.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [request?.start_date]);

  // Handle cancel leave request
  const handleCancelRequest = useCallback(async () => {
    if (!request) return;

    if (request.status !== 'pending') {
      showWarning("Tidak Bisa Dibatalkan", "Hanya pengajuan dengan status pending yang bisa dibatalkan.");
      return;
    }

    Alert.alert(
      "Batalkan Pengajuan?",
      "Pengajuan cuti ini akan dibatalkan dan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan.",
      [
        { text: "Tidak", style: "cancel" },
        {
          text: "Ya, Batalkan",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              const { error } = await supabase
                .from('leave_requests')
                .delete()
                .eq('id', request.id);

              if (error) throw error;

              showSuccess("Berhasil", "Pengajuan cuti berhasil dibatalkan.");
              router.back();
            } catch (error: any) {
              console.error("Error cancelling request:", error);
              showError("Gagal", error.message || "Gagal membatalkan pengajuan.");
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  }, [request, router, showSuccess, showError, showWarning]);

  // Handle modify dates (show info - modification requires admin)
  const handleModifyDates = useCallback(() => {
    if (!request) return;

    if (request.status !== 'pending') {
      showWarning("Tidak Bisa Diubah", "Hanya pengajuan dengan status pending yang bisa diubah.");
      return;
    }

    Alert.alert(
      "Ubah Tanggal Cuti",
      "Untuk mengubah tanggal cuti, silakan batalkan pengajuan ini dan buat pengajuan baru dengan tanggal yang diinginkan.\n\nAtau hubungi HRD untuk bantuan.",
      [
        { text: "Mengerti", style: "default" },
        { 
          text: "Batalkan & Buat Baru", 
          style: "destructive",
          onPress: handleCancelRequest,
        },
      ]
    );
  }, [request, handleCancelRequest, showWarning]);

  // Handle set reminder (info only - not implemented)
  const handleSetReminder = useCallback(() => {
    showInfo(
      "Fitur Dalam Pengembangan", 
      "Pengingat otomatis akan dikirim 3 hari sebelum tanggal cuti dimulai."
    );
  }, [showInfo]);

  // Loading state
  if (loading) {
    return (
      <View className={`flex-1 items-center justify-center ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text className={`mt-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
          Memuat detail...
        </Text>
      </View>
    );
  }

  // Not found state
  if (!request) {
    return (
      <View className={`flex-1 items-center justify-center ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
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

  // Derived data
  const daysRemaining = getDaysRemaining();
  const leaveDays = calculateDays(request.start_date, request.end_date);
  const leaveTypeName = request.leave_types?.name || "Cuti";
  const approverName = request.profiles?.full_name || "Manager";
  const isPending = request.status === 'pending';
  const isUpcoming = daysRemaining > 0;
  const isToday = daysRemaining === 0;
  const isPast = daysRemaining < 0;

  // Get days remaining text
  const getDaysRemainingText = () => {
    if (isUpcoming) return `${daysRemaining} Hari Lagi`;
    if (isToday) return "Dimulai Hari Ini!";
    if (isPast && Math.abs(daysRemaining) <= leaveDays) return "Sedang Berlangsung";
    return "Sudah Selesai";
  };

  // Get days remaining color
  const getDaysRemainingColor = () => {
    if (isUpcoming && daysRemaining <= 3) return isDarkMode ? "text-red-300" : "text-red-600";
    if (isToday) return isDarkMode ? "text-green-300" : "text-green-600";
    return isDarkMode ? "text-yellow-200" : "text-yellow-800";
  };

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <StatusBar style="light" />

      {/* Header - Original Yellow Style */}
      <View 
        className="bg-yellow-500 py-4 px-4"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-2 -ml-2"
          >
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Leave Reminder</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-4 py-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Reminder Header - Original Layout */}
        <View className={`rounded-xl p-5 shadow-sm mb-5 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <View className="flex-row items-center mb-3">
            <View className={`p-2 rounded-full mr-3 ${isDarkMode ? "bg-yellow-900/50" : "bg-yellow-100"}`}>
              <Bell color="#F59E0B" size={20} />
            </View>
            <Text className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              Upcoming Leave Reminder
            </Text>
          </View>
          
          <Text className={`text-2xl font-bold mt-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            {leaveTypeName}
          </Text>
          
          <View className="flex-row mt-4">
            <View className="flex-row items-center mr-4">
              <Calendar color="#6B7280" size={16} />
              <Text className={`text-sm ml-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                {formatDateID(request.start_date)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Clock color="#6B7280" size={16} />
              <Text className={`text-sm ml-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                {leaveDays} Hari
              </Text>
            </View>
          </View>
          
          {/* Days Counter - Original Style with Dynamic Text */}
          <View className={`mt-5 p-4 rounded-lg ${isDarkMode ? "bg-yellow-900/20" : "bg-yellow-50"}`}>
            <Text className={`text-center font-bold ${getDaysRemainingColor()}`}>
              {getDaysRemainingText()}
            </Text>
          </View>
        </View>

        {/* Leave Details - Original Layout */}
        <View className={`rounded-xl p-5 shadow-sm mb-5 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <Text className={`text-lg font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Leave Details
          </Text>
          
          <View className={`h-px my-3 ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`} />
          
          <View className="space-y-4">
            <DetailRow label="Start Date" value={formatDateID(request.start_date)} isDarkMode={isDarkMode} />
            <DetailRow label="End Date" value={formatDateID(request.end_date)} isDarkMode={isDarkMode} />
            <DetailRow label="Duration" value={`${leaveDays} Days`} isDarkMode={isDarkMode} />
            <DetailRow label="Reason" value={request.reason || "Annual Vacation"} isDarkMode={isDarkMode} />
            
            {/* Approver with icon */}
            <View className="flex-row">
              <Text className={`w-32 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Approver
              </Text>
              <View className="flex-row items-center flex-1">
                <View className={`w-6 h-6 rounded-full items-center justify-center mr-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                  <User color="#6B7280" size={14} />
                </View>
                <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  {approverName}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions - Working Features */}
        <View className={`rounded-xl p-5 shadow-sm mb-5 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <Text className={`text-lg font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Quick Actions
          </Text>
          
          <View className={`h-px my-3 ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`} />
          
          {/* Action: View Full Details */}
          <TouchableOpacity 
            className={`py-3 border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}
            onPress={() => router.push(`/(modals)/notification-detail?id=${id}`)}
          >
            <View className="flex-row items-center">
              <FileText color="#3B82F6" size={20} />
              <Text className="text-blue-500 font-medium ml-3">
                Lihat Detail Lengkap
              </Text>
            </View>
          </TouchableOpacity>

          {/* Action: Modify Dates (only if pending) */}
          {isPending && (
            <TouchableOpacity 
              className={`py-3 border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}
              onPress={handleModifyDates}
            >
              <View className="flex-row items-center">
                <Edit3 color="#8B5CF6" size={20} />
                <Text className="text-purple-500 font-medium ml-3">
                  Ubah Tanggal Cuti
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Action: Cancel Request (only if pending) */}
          {isPending && (
            <TouchableOpacity 
              className={`py-3 border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}
              onPress={handleCancelRequest}
              disabled={cancelling}
            >
              <View className="flex-row items-center">
                {cancelling ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Trash2 color="#EF4444" size={20} />
                )}
                <Text className="text-red-500 font-medium ml-3">
                  {cancelling ? "Membatalkan..." : "Batalkan Pengajuan"}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Action: Set Reminder */}
          <TouchableOpacity 
            className={`py-3 border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}
            onPress={handleSetReminder}
          >
            <View className="flex-row items-center">
              <Bell color="#F59E0B" size={20} />
              <Text className="text-yellow-600 font-medium ml-3">
                Pengingat Otomatis
              </Text>
              <View className="ml-auto px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30">
                <Text className="text-xs text-yellow-700 dark:text-yellow-300">Aktif</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Action: View Leave History */}
          <TouchableOpacity 
            className="py-3"
            onPress={() => router.push("/(modals)/leave-history")}
          >
            <View className="flex-row items-center">
              <History color="#3B82F6" size={20} />
              <Text className="text-blue-500 font-medium ml-3">
                Lihat Riwayat Cuti
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <View className={`rounded-xl p-5 shadow-sm ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <Text className={`text-lg font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Status Persetujuan
          </Text>
          
          <View className="flex-row items-center">
            <View 
              className="px-3 py-1.5 rounded-full"
              style={{ 
                backgroundColor: request.status === 'approved' 
                  ? '#D1FAE5' 
                  : request.status === 'rejected'
                  ? '#FEE2E2'
                  : '#FEF3C7'
              }}
            >
              <Text 
                style={{ 
                  color: request.status === 'approved' 
                    ? '#059669' 
                    : request.status === 'rejected'
                    ? '#DC2626'
                    : '#D97706'
                }}
                className="font-medium"
              >
                {getStatusLabel(request.status)}
              </Text>
            </View>
          </View>

          {/* Approval Progress */}
          <View className={`mt-4 p-3 rounded-lg ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
            <Text className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Tahapan Persetujuan
            </Text>
            <View className="flex-row items-center">
              <View className={`h-2 flex-1 rounded-full overflow-hidden ${isDarkMode ? "bg-gray-600" : "bg-gray-200"}`}>
                <View 
                  className="h-full bg-green-500 rounded-full"
                  style={{ 
                    width: request.status === 'approved' 
                      ? '100%' 
                      : request.approved_by_hrd 
                      ? '100%'
                      : request.approved_by_dfd 
                      ? '66%' 
                      : request.approved_by_manager 
                      ? '33%' 
                      : '0%' 
                  }}
                />
              </View>
            </View>
            <View className="flex-row justify-between mt-2">
              <Text className={`text-xs ${request.approved_by_manager ? "text-green-500" : isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                Manager {request.approved_by_manager && "✓"}
              </Text>
              <Text className={`text-xs ${request.approved_by_dfd ? "text-green-500" : isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                DFD {request.approved_by_dfd && "✓"}
              </Text>
              <Text className={`text-xs ${request.approved_by_hrd ? "text-green-500" : isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                HRD {request.approved_by_hrd && "✓"}
              </Text>
            </View>
          </View>

          {/* Warning for pending requests */}
          {isPending && (
            <View className={`flex-row items-start mt-4 p-3 rounded-lg ${isDarkMode ? "bg-yellow-900/20" : "bg-yellow-50"}`}>
              <AlertTriangle color="#D97706" size={18} />
              <Text className={`ml-2 text-sm flex-1 ${isDarkMode ? "text-yellow-200" : "text-yellow-700"}`}>
                Pengajuan masih menunggu persetujuan. Anda dapat membatalkan pengajuan ini jika diperlukan.
              </Text>
            </View>
          )}
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
}

function DetailRow({ label, value, isDarkMode }: DetailRowProps) {
  return (
    <View className="flex-row">
      <Text className={`w-32 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
        {label}
      </Text>
      <Text className={`flex-1 font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
        {value}
      </Text>
    </View>
  );
}
