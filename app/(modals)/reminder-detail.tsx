// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(modals)/reminder-detail.tsx
// 📝 Aksi: BUAT BARU
// ===========================================================

import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Calendar, Clock, Bell, User, Edit, XCircle, BellPlus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { formatDateID, formatDateFullID, calculateDays } from "@/utils/formatters";
import type { LeaveRequestFull } from "@/types/database";

export default function ReminderDetail() {
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

  // Calculate days remaining until leave starts
  const getDaysRemaining = (startDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const diff = start.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleModifyDates = () => {
    Alert.alert(
      "Ubah Tanggal Cuti",
      "Fitur ini akan tersedia dalam update selanjutnya.",
      [{ text: "OK" }]
    );
  };

  const handleCancelRequest = () => {
    Alert.alert(
      "Batalkan Cuti?",
      "Apakah Anda yakin ingin membatalkan pengajuan cuti ini?",
      [
        { text: "Tidak", style: "cancel" },
        { 
          text: "Ya, Batalkan", 
          style: "destructive",
          onPress: async () => {
            // TODO: Implement cancel logic
            Alert.alert("Info", "Fitur pembatalan akan tersedia dalam update selanjutnya.");
          }
        },
      ]
    );
  };

  const handleSetReminder = () => {
    Alert.alert(
      "Atur Pengingat",
      "Fitur pengingat tambahan akan tersedia dalam update selanjutnya.",
      [{ text: "OK" }]
    );
  };

  if (loading) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <ActivityIndicator size="large" color="#F59E0B" />
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

  const leaveTypeName = request.leave_types?.name || 'Cuti';
  const days = calculateDays(request.start_date, request.end_date);
  const daysRemaining = getDaysRemaining(request.start_date);

  // Determine reminder status color
  const getReminderColor = () => {
    if (daysRemaining <= 0) return '#10B981'; // Green - already started or today
    if (daysRemaining <= 3) return '#EF4444'; // Red - very soon
    if (daysRemaining <= 7) return '#F59E0B'; // Yellow - coming up
    return '#3B82F6'; // Blue - still some time
  };

  const actions = [
    { label: "Ubah Tanggal Cuti", icon: Edit, onPress: handleModifyDates },
    { label: "Batalkan Pengajuan", icon: XCircle, onPress: handleCancelRequest },
    { label: "Atur Pengingat Tambahan", icon: BellPlus, onPress: handleSetReminder },
  ];

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <StatusBar style="light" />

      {/* Header */}
      <View 
        className="py-4 px-4"
        style={{ 
          paddingTop: insets.top + 16,
          backgroundColor: '#F59E0B' // Yellow for reminders
        }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2 -ml-2">
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-xl font-bold">Pengingat Cuti</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1 px-4 py-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Reminder Header */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-sm mb-5`}>
          <View className="flex-row items-center mb-3">
            <View className={`p-2 rounded-full mr-3 ${isDarkMode ? "bg-yellow-900/50" : "bg-yellow-100"}`}>
              <Bell color="#F59E0B" size={20} />
            </View>
            <Text className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              Pengingat Cuti Mendatang
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
                {days} Hari
              </Text>
            </View>
          </View>
          
          {/* Days Counter */}
          <View 
            className="mt-5 p-4 rounded-lg"
            style={{ backgroundColor: isDarkMode ? `${getReminderColor()}20` : `${getReminderColor()}15` }}
          >
            <Text 
              className="text-center font-bold"
              style={{ color: getReminderColor() }}
            >
              {daysRemaining <= 0 
                ? (daysRemaining === 0 ? "Hari Ini!" : "Sudah Dimulai")
                : `${daysRemaining} Hari Lagi`
              }
            </Text>
          </View>
        </View>

        {/* Leave Details */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-sm mb-5`}>
          <Text className={`text-lg font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Detail Cuti
          </Text>
          
          <View className={`h-px my-3 ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`} />
          
          <View className="space-y-4">
            <View className="flex-row">
              <Text className={`w-32 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Tanggal Mulai</Text>
              <Text className={`font-medium flex-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {formatDateFullID(request.start_date)}
              </Text>
            </View>
            
            <View className="flex-row">
              <Text className={`w-32 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Tanggal Selesai</Text>
              <Text className={`font-medium flex-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {formatDateFullID(request.end_date)}
              </Text>
            </View>
            
            <View className="flex-row">
              <Text className={`w-32 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Durasi</Text>
              <Text className={`font-medium flex-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {days} Hari
              </Text>
            </View>
            
            <View className="flex-row">
              <Text className={`w-32 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Alasan</Text>
              <Text className={`font-medium flex-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                {request.reason || '-'}
              </Text>
            </View>
            
            <View className="flex-row">
              <Text className={`w-32 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Disetujui Oleh</Text>
              <View className="flex-row items-center flex-1">
                <View className={`w-6 h-6 rounded-full items-center justify-center mr-2 ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                  <User color="#6B7280" size={14} />
                </View>
                <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                  HRD
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-sm`}>
          <Text className={`text-lg font-semibold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Aksi Cepat
          </Text>
          
          <View className={`h-px my-3 ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`} />
          
          {actions.map((action, index) => (
            <TouchableOpacity 
              key={index}
              className={`flex-row items-center py-3 ${
                index !== actions.length - 1 
                  ? `border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}` 
                  : ""
              }`}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <action.icon size={20} color="#3B82F6" />
              <Text className="text-blue-500 font-medium ml-3">{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
