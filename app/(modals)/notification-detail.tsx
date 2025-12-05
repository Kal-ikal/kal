import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ChevronLeft, FileText, CheckCircle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import {
  formatDateID,
  calculateDays,
  getStatusLabel,
  getStageLabel,
} from "@/utils/formatters";
import type { LeaveRequestFull } from "@/types/database";

export default function NotificationDetail() {
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

  if (loading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          isDarkMode ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
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
          className="mt-4 px-6 py-2 bg-blue-500 rounded-lg"
        >
          <Text className="text-white font-medium">Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusLabel = getStatusLabel(request.status);
  const stageLabel = getStageLabel(request.current_stage);
  const days = calculateDays(request.start_date, request.end_date);

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <StatusBar style="light" />

      {/* Header */}
      <View
        className="bg-blue-500 pb-6 rounded-b-3xl"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="px-4 flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-2 -ml-2"
          >
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Detail Pengajuan</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Status Card */}
        <View
          className={`rounded-xl p-5 mb-4 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm`}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text
              className={`text-sm font-medium uppercase ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {request.leave_types?.name || "Leave Request"}
            </Text>
            <View
              className={`px-3 py-1 rounded-full ${
                request.status === "approved"
                  ? "bg-green-100 dark:bg-green-900/30"
                  : request.status === "pending"
                  ? "bg-yellow-100 dark:bg-yellow-900/30"
                  : "bg-red-100 dark:bg-red-900/30"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  request.status === "approved"
                    ? "text-green-700 dark:text-green-400"
                    : request.status === "pending"
                    ? "text-yellow-700 dark:text-yellow-400"
                    : "text-red-700 dark:text-red-400"
                }`}
              >
                {statusLabel}
              </Text>
            </View>
          </View>

          <Text
            className={`text-2xl font-bold ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            {days} Hari
          </Text>

          <Text className={`mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            {formatDateID(request.start_date)} - {formatDateID(request.end_date)}
          </Text>

          {request.status === "pending" && (
            <View className="mt-3 flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
              <Text className="text-yellow-600 dark:text-yellow-400 text-sm">
                Menunggu persetujuan {stageLabel}
              </Text>
            </View>
          )}
        </View>

        {/* Request Details */}
        <View
          className={`rounded-xl p-5 mb-4 ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } shadow-sm`}
        >
          <Text
            className={`text-lg font-semibold mb-4 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Informasi Pengajuan
          </Text>

          <View className="h-px bg-gray-200 dark:bg-gray-700 mb-4" />

          <DetailRow
            label="ID Pengajuan"
            value={request.id.substring(0, 8).toUpperCase()}
            isDarkMode={isDarkMode}
          />

          <DetailRow
            label="Jenis Cuti"
            value={request.leave_types?.name || "-"}
            isDarkMode={isDarkMode}
          />

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
            label="Total Hari"
            value={`${days} hari`}
            isDarkMode={isDarkMode}
          />

          <DetailRow
            label="Diajukan Pada"
            value={formatDateID(request.created_at)}
            isDarkMode={isDarkMode}
            isLast
          />
        </View>

        {/* Reason */}
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
            Alasan
          </Text>
          <Text className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
            {request.reason || "Tidak ada alasan"}
          </Text>
        </View>

        {/* Document */}
        {request.document_url && (
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
              Dokumen Pendukung
            </Text>
            <View className="flex-row items-center">
              <FileText color="#3B82F6" size={24} />
              <Text className="ml-3 text-blue-500 font-medium">
                Lihat Dokumen
              </Text>
            </View>
          </View>
        )}

        {/* Approval History */}
        {request.status === "approved" && (
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
              Status Persetujuan
            </Text>
            <View className="flex-row items-center">
              <CheckCircle color="#10B981" size={24} />
              <Text className="ml-3 text-green-600 dark:text-green-400 font-medium">
                Disetujui
              </Text>
            </View>
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
  isLast?: boolean;
}

function DetailRow({ label, value, isDarkMode, isLast = false }: DetailRowProps) {
  return (
    <View
      className={`flex-row justify-between items-center py-3 ${
        !isLast ? "border-b" : ""
      }`}
      style={{ borderColor: isDarkMode ? "#374151" : "#E5E7EB" }}
    >
      <Text className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
        {label}
      </Text>
      <Text
        className={`font-medium text-right flex-1 ml-4 ${
          isDarkMode ? "text-white" : "text-gray-900"
        }`}
      >
        {value}
      </Text>
    </View>
  );
}