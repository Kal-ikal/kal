// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(modals)/notification-detail.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ V9: Original UI + Real data + Working features
//        - Cancel Leave Request (if pending)
//        - View Document (if exists)
// ===========================================================

import { useToast } from "@/context/NotificationToastContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import type { LeaveRequestFull } from "@/types/database";
import {
  calculateDays,
  formatDateID,
  getStatusColor,
  getStatusLabel,
} from "@/utils/formatters";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  Clock,
  ExternalLink,
  FileText,
  Trash2,
  XCircle,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NotificationDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showSuccess, showError, showWarning } = useToast();

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

  // Handle cancel leave request
  const handleCancelRequest = useCallback(async () => {
    if (!request || request.status !== 'pending') {
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
              // Delete the leave request
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

  // Handle view document
  const handleViewDocument = useCallback(async () => {
    if (!request?.document_url) {
      showWarning("Tidak Ada Dokumen", "Pengajuan ini tidak memiliki dokumen pendukung.");
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(request.document_url);
      if (canOpen) {
        await Linking.openURL(request.document_url);
      } else {
        showError("Error", "Tidak dapat membuka dokumen.");
      }
    } catch (error) {
      console.error("Error opening document:", error);
      showError("Error", "Gagal membuka dokumen.");
    }
  }, [request?.document_url, showError, showWarning]);

  // Loading state
  if (loading) {
    return (
      <View className={`flex-1 items-center justify-center ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <ActivityIndicator size="large" color="#3B82F6" />
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
          className="mt-4 px-6 py-2 bg-blue-500 rounded-lg"
        >
          <Text className="text-white font-medium">Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Derived data
  const days = calculateDays(request.start_date, request.end_date);
  const statusLabel = getStatusLabel(request.status);
  const statusColor = getStatusColor(request.status);
  void statusColor;
  const leaveTypeName = request.leave_types?.name || "Cuti";
  const employeeId = request.profiles?.id 
    ? `EMP${request.profiles.id.substring(0, 12).toUpperCase()}`
    : "EMP000000000000";
  const requestId = `LR${request.id.substring(0, 18).toUpperCase()}`;

  // Status badge color classes
  const getStatusBadgeStyle = () => {
    switch (request.status) {
      case 'approved':
        return { bg: 'bg-green-100', text: 'text-green-800' };
      case 'rejected':
        return { bg: 'bg-red-100', text: 'text-red-800' };
      default:
        return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    }
  };

  const badgeStyle = getStatusBadgeStyle();

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <StatusBar style="light" />

      {/* Header - Original Blue Style */}
      <View 
        className="bg-blue-500 py-4 px-4"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-2 -ml-2"
          >
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Request Details</Text>
        </View>
      </View>

      {/* Main Content - Original Layout */}
      <ScrollView 
        className="flex-1 px-4 pt-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View className={`rounded-xl p-5 shadow-sm mb-5 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <Text className={`text-sm font-medium uppercase ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            LEAVE REQUEST
          </Text>
          <Text className={`text-2xl font-bold mt-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            {request.status === 'approved' 
              ? "Leave Request Approved" 
              : request.status === 'rejected'
              ? "Leave Request Rejected"
              : "Leave Request Pending"
            }
          </Text>
          <Text className={`mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            {formatDateID(request.created_at)}
          </Text>

          {/* Divider */}
          <View className={`h-px my-4 ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`} />

          {/* Amount Section */}
          <View className="flex-row items-center justify-between">
            <Text className={`text-lg ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Leave Duration
            </Text>
            <Text className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {days} Days
            </Text>
          </View>

          {/* Status Badge */}
          <View className="mt-3 self-start">
            <View className={`px-3 py-1 rounded-full ${badgeStyle.bg}`}>
              <Text className={`text-sm font-medium ${badgeStyle.text}`}>
                {statusLabel.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Details Section */}
        <View className={`rounded-xl p-5 shadow-sm mb-5 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <Text className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Request Information
          </Text>

          {/* Divider */}
          <View className={`h-px mb-4 ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`} />

          <View className="space-y-4">
            <DetailRow label="Request ID" value={requestId} isDarkMode={isDarkMode} />
            <DetailRow label="Employee ID" value={employeeId} isDarkMode={isDarkMode} />
            <DetailRow label="Leave Type" value={leaveTypeName} isDarkMode={isDarkMode} />
            <DetailRow label="Start Date" value={formatDateID(request.start_date)} isDarkMode={isDarkMode} />
            <DetailRow label="End Date" value={formatDateID(request.end_date)} isDarkMode={isDarkMode} />
            <DetailRow label="Duration" value={`${days} Hari`} isDarkMode={isDarkMode} />
          </View>
        </View>

        {/* Reason Section */}
        <View className={`rounded-xl p-5 shadow-sm mb-5 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <Text className={`text-lg font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Alasan
          </Text>
          <Text className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
            {request.reason || "Tidak ada alasan"}
          </Text>
        </View>

        {/* Document Section (if exists) */}
        {request.document_url && (
          <View className={`rounded-xl p-5 shadow-sm mb-5 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
            <Text className={`text-lg font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              Dokumen Pendukung
            </Text>
            <TouchableOpacity
              className="flex-row items-center py-2"
              onPress={handleViewDocument}
            >
              <FileText color="#3B82F6" size={24} />
              <Text className="ml-3 text-blue-500 font-medium flex-1">
                Lihat Dokumen
              </Text>
              <ExternalLink color="#3B82F6" size={18} />
            </TouchableOpacity>
          </View>
        )}

        {/* Approval Status */}
        <View className={`rounded-xl p-5 shadow-sm mb-5 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <Text className={`text-lg font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Status Persetujuan
          </Text>

          <View className="flex-row items-center">
            {request.status === 'approved' ? (
              <>
                <CheckCircle color="#10B981" size={24} />
                <Text className="ml-3 text-green-600 font-medium">Disetujui</Text>
              </>
            ) : request.status === 'rejected' ? (
              <>
                <XCircle color="#EF4444" size={24} />
                <Text className="ml-3 text-red-600 font-medium">Ditolak</Text>
              </>
            ) : (
              <>
                <Clock color="#F59E0B" size={24} />
                <Text className="ml-3 text-yellow-600 font-medium">Menunggu Persetujuan</Text>
              </>
            )}
          </View>

          {/* Approval Flow Details */}
          <View className={`mt-4 p-3 rounded-lg ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
            <View className="flex-row justify-between mb-2">
              <Text className={isDarkMode ? "text-gray-400" : "text-gray-500"}>Manager</Text>
              <Text className={request.approved_by_manager 
                ? "text-green-500 font-medium" 
                : isDarkMode ? "text-gray-400" : "text-gray-500"
              }>
                {request.approved_by_manager ? "✓ Disetujui" : "Pending"}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className={isDarkMode ? "text-gray-400" : "text-gray-500"}>DFD</Text>
              <Text className={request.approved_by_dfd 
                ? "text-green-500 font-medium" 
                : isDarkMode ? "text-gray-400" : "text-gray-500"
              }>
                {request.approved_by_dfd ? "✓ Disetujui" : "Pending"}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className={isDarkMode ? "text-gray-400" : "text-gray-500"}>HRD</Text>
              <Text className={request.approved_by_hrd 
                ? "text-green-500 font-medium" 
                : isDarkMode ? "text-gray-400" : "text-gray-500"
              }>
                {request.approved_by_hrd ? "✓ Disetujui" : "Pending"}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions Section - Only show if request is pending */}
        {request.status === 'pending' && (
          <View className={`rounded-xl p-5 shadow-sm mb-5 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
            <Text className={`text-lg font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              Aksi
            </Text>

            {/* Warning */}
            <View className={`flex-row items-start p-3 rounded-lg mb-4 ${isDarkMode ? "bg-yellow-900/20" : "bg-yellow-50"}`}>
              <AlertTriangle color="#D97706" size={20} />
              <Text className={`ml-2 text-sm flex-1 ${isDarkMode ? "text-yellow-200" : "text-yellow-700"}`}>
                Pengajuan yang sudah dibatalkan tidak dapat dikembalikan.
              </Text>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              className={`flex-row items-center justify-center py-3 px-4 rounded-xl ${
                cancelling ? "bg-gray-300" : "bg-red-500"
              }`}
              onPress={handleCancelRequest}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Trash2 color="white" size={20} />
                  <Text className="ml-2 text-white font-bold">
                    Batalkan Pengajuan
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
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
    <View className="flex-row justify-between items-center">
      <Text className={isDarkMode ? "text-gray-400" : "text-gray-600"}>
        {label}
      </Text>
      <Text className={`font-medium text-right flex-1 ml-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
        {value}
      </Text>
    </View>
  );
}
