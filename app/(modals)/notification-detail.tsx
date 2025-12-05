// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(modals)/notification-detail.tsx
// 📝 Aksi: BUAT BARU
// ===========================================================

import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ChevronLeft,  FileText, CheckCircle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import {  formatDateID, calculateDays, getStatusLabel, getStatusColor, getStageLabel } from "@/utils/formatters";
import type { LeaveRequestFull } from "@/types/database";

export default function NotificationDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<LeaveRequestFull | null>(null);

  useEffect(() => {
    if (id) {
      fetchRequestDetail();
    }
  }, [id]);

  const fetchRequestDetail = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types (*),
          profiles!leave_requests_user_id_fkey (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setRequest(data);
    } catch (error) {
      console.error('Error fetching request detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!request) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <Text className={isDarkMode ? "text-white" : "text-gray-800"}>Data tidak ditemukan</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-blue-500">Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColors = getStatusColor(request.status);
  const days = calculateDays(request.start_date, request.end_date);
  const leaveTypeName = request.leave_types?.name || 'Cuti';
  const statusLabel = getStatusLabel(request.status);

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Header */}
      <View 
        className="py-4 px-4"
        style={{ 
          paddingTop: insets.top + 16,
          backgroundColor: statusColors.bg 
        }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 -ml-2">
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Detail Pengajuan</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-4 py-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Title Section */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-sm mb-5`}>
          <Text className={`text-sm font-medium uppercase ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
            LEAVE REQUEST
          </Text>
          <Text className={`text-2xl font-bold mt-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            {leaveTypeName}
          </Text>
          <Text className={`mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            {formatDateID(request.created_at)}
          </Text>

          {/* Divider */}
          <View className={`h-px my-4 ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`} />

          {/* Duration Section */}
          <View className="flex-row items-center justify-between">
            <Text className={`text-lg ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Durasi Cuti
            </Text>
            <Text className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {days} Hari
            </Text>
          </View>

          <View className="mt-3 self-start">
            <View 
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: statusColors.bg }}
            >
              <Text 
                className="text-sm font-medium"
                style={{ color: statusColors.text }}
              >
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Request Information */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-sm mb-5`}>
          <Text className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Informasi Pengajuan
          </Text>

          <View className={`h-px mb-4 ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`} />

          <View className="space-y-4">
            <View className="flex-row justify-between items-center">
              <Text className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Request ID</Text>
              <Text className={`font-medium text-right flex-1 ml-4 text-xs ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {request.id.substring(0, 18)}...
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Pemohon</Text>
              <Text className={`font-medium text-right flex-1 ml-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {request.profiles?.full_name || '-'}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Departemen</Text>
              <Text className={`font-medium text-right flex-1 ml-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {request.profiles?.department || '-'}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Jenis Cuti</Text>
              <Text className={`font-medium text-right flex-1 ml-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {leaveTypeName}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Tanggal Mulai</Text>
              <Text className={`font-medium text-right flex-1 ml-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {formatDateID(request.start_date)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className={isDarkMode ? "text-gray-400" : "text-gray-600"}>Tanggal Selesai</Text>
              <Text className={`font-medium text-right flex-1 ml-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {formatDateID(request.end_date)}
              </Text>
            </View>
          </View>
        </View>

        {/* Reason */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-sm mb-5`}>
          <View className="flex-row items-center mb-3">
            <FileText size={20} color="#3B82F6" />
            <Text className={`text-lg font-semibold ml-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              Alasan
            </Text>
          </View>
          <Text className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
            {request.reason || '-'}
          </Text>
        </View>

        {/* Approval Status */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-sm mb-5`}>
          <Text className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Status Persetujuan
          </Text>

          <View className={`h-px mb-4 ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`} />

          <View className="space-y-4">
            {/* Manager Approval */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                  request.approved_by_manager 
                    ? "bg-green-100 dark:bg-green-900/30" 
                    : isDarkMode ? "bg-gray-700" : "bg-gray-100"
                }`}>
                  <CheckCircle 
                    size={16} 
                    color={request.approved_by_manager ? "#10B981" : "#9CA3AF"} 
                  />
                </View>
                <Text className={isDarkMode ? "text-gray-300" : "text-gray-700"}>Manager</Text>
              </View>
              <Text className={`font-medium ${
                request.approved_by_manager 
                  ? "text-green-500" 
                  : isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}>
                {request.approved_by_manager ? "Disetujui" : "Menunggu"}
              </Text>
            </View>

            {/* DFD Approval */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                  request.approved_by_dfd 
                    ? "bg-green-100 dark:bg-green-900/30" 
                    : isDarkMode ? "bg-gray-700" : "bg-gray-100"
                }`}>
                  <CheckCircle 
                    size={16} 
                    color={request.approved_by_dfd ? "#10B981" : "#9CA3AF"} 
                  />
                </View>
                <Text className={isDarkMode ? "text-gray-300" : "text-gray-700"}>DFD</Text>
              </View>
              <Text className={`font-medium ${
                request.approved_by_dfd 
                  ? "text-green-500" 
                  : isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}>
                {request.approved_by_dfd ? "Disetujui" : "Menunggu"}
              </Text>
            </View>

            {/* HRD Approval */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${
                  request.approved_by_hrd 
                    ? "bg-green-100 dark:bg-green-900/30" 
                    : isDarkMode ? "bg-gray-700" : "bg-gray-100"
                }`}>
                  <CheckCircle 
                    size={16} 
                    color={request.approved_by_hrd ? "#10B981" : "#9CA3AF"} 
                  />
                </View>
                <Text className={isDarkMode ? "text-gray-300" : "text-gray-700"}>HRD</Text>
              </View>
              <Text className={`font-medium ${
                request.approved_by_hrd 
                  ? "text-green-500" 
                  : isDarkMode ? "text-gray-500" : "text-gray-400"
              }`}>
                {request.approved_by_hrd ? "Disetujui" : "Menunggu"}
              </Text>
            </View>
          </View>

          {/* Current Stage */}
          <View className={`mt-4 p-3 rounded-lg ${isDarkMode ? "bg-blue-900/30" : "bg-blue-50"}`}>
            <Text className={`text-center font-medium ${isDarkMode ? "text-blue-200" : "text-blue-800"}`}>
              {getStageLabel(request.current_stage)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
