// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(app)/pengajuan.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ FIXED V3: 
//    - X button with confirmation dialog
//    - Scroll up to show tab bar
//    - Uses RPC for submit
// ===========================================================

import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  FileText,
  ChevronRight,
  Check,
  Upload,
  AlertCircle,
  X,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useUserData, useLeaveTypes } from "@/hooks/useUserData";
import { useTabBarStore } from "@/hooks/useTabBarStore";
import { submitLeaveRequest} from "@/services/leaveService";
import { formatDateID } from "@/utils/formatters";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";

cssInterop(LinearGradient, { className: "style" });

type Step = 1 | 2 | 3;

export default function PengajuanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { session } = useAuth();
  const { refetch, getLeaveBalanceUI } = useUserData();
  const { leaveTypes, loading: loadingTypes } = useLeaveTypes();

  // ✅ NEW: Tab bar visibility control
  const setIsVisible = useTabBarStore((state) => state.setIsVisible);
  const lastScrollY = useRef(0);

  // Form state
  const [step, setStep] = useState<Step>(1);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [reason, setReason] = useState("");
  const [document, setDocument] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Date picker visibility
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Get selected leave type details
  const selectedLeaveType = useMemo(() => {
    return leaveTypes.find(lt => lt.id === selectedLeaveTypeId);
  }, [leaveTypes, selectedLeaveTypeId]);

  // Get leave balance
  const balanceUI = useMemo(() => getLeaveBalanceUI(), [getLeaveBalanceUI]);

  // Calculate days
  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  // ✅ NEW: Scroll handler to show/hide tab bar
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    // Threshold to avoid jitter
    if (Math.abs(diff) > 15) {
      if (diff < 0) {
        // Scrolling Up -> Show tab bar
        setIsVisible(true);
      } else if (diff > 0 && currentY > 30) {
        // Scrolling Down -> Hide tab bar
        setIsVisible(false);
      }
      lastScrollY.current = currentY;
    }
  }, [setIsVisible]);

  // ✅ NEW: Close with confirmation
  const handleClose = useCallback(() => {
    // Check if form has any data
    const hasData = selectedLeaveTypeId || reason.trim() || document;
    
    if (hasData) {
      Alert.alert(
        "Batalkan Pengajuan?",
        "Data yang sudah Anda isi akan hilang. Apakah Anda yakin ingin keluar?",
        [
          { text: "Tetap di Sini", style: "cancel" },
          { 
            text: "Ya, Keluar", 
            style: "destructive",
            onPress: () => {
              setIsVisible(true); // Show tab bar before leaving
              router.replace("/(app)/home");
            }
          },
        ]
      );
    } else {
      setIsVisible(true); // Show tab bar before leaving
      router.replace("/(app)/home");
    }
  }, [selectedLeaveTypeId, reason, document, router, setIsVisible]);

  // Handle back button
  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep((s) => (s - 1) as Step);
    } else {
      handleClose();
    }
  }, [step, handleClose]);

  // Handle next button
  const handleNext = useCallback(() => {
    if (step === 1 && !selectedLeaveTypeId) {
      Alert.alert("Pilih Jenis Cuti", "Silakan pilih jenis cuti terlebih dahulu");
      return;
    }
    if (step === 2) {
      if (totalDays <= 0) {
        Alert.alert("Tanggal Tidak Valid", "Tanggal akhir harus sama atau setelah tanggal mulai");
        return;
      }
      if (selectedLeaveType?.is_quota_deduction && totalDays > balanceUI.remaining) {
        Alert.alert("Saldo Tidak Cukup", `Anda hanya memiliki ${balanceUI.remaining} hari sisa cuti`);
        return;
      }
    }
    if (step < 3) {
      setStep((s) => (s + 1) as Step);
    }
  }, [step, selectedLeaveTypeId, totalDays, selectedLeaveType, balanceUI]);

  // Handle document pick
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        setDocument(result.assets[0]);
      }
    } catch (err) {
      console.error("Error picking document:", err);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!session?.user?.id) {
      Alert.alert("Error", "Session tidak valid. Silakan login ulang.");
      return;
    }

    if (!selectedLeaveTypeId) {
      Alert.alert("Error", "Pilih jenis cuti terlebih dahulu");
      return;
    }

    if (!reason.trim()) {
      Alert.alert("Error", "Masukkan alasan pengajuan cuti");
      return;
    }

    // Check if document is required
    if (selectedLeaveType?.requires_file && !document) {
      Alert.alert("Dokumen Diperlukan", `Jenis cuti ${selectedLeaveType.name} memerlukan dokumen pendukung`);
      return;
    }

    try {
      setSubmitting(true);

      const result = await submitLeaveRequest({
        userId: session.user.id,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        reason: reason.trim(),
        leaveTypeId: selectedLeaveTypeId,
        documentUrl: document?.uri || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Gagal mengajukan cuti");
      }

      await refetch();

      Alert.alert(
        "Berhasil",
        "Pengajuan cuti Anda telah berhasil dikirim dan menunggu persetujuan.",
        [
          {
            text: "OK",
            onPress: () => {
              setIsVisible(true); // Show tab bar
              router.replace("/(app)/home");
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View>
            <Text className={`${isDarkMode ? "text-white" : "text-gray-900"} text-lg font-bold mb-4`}>
              Pilih Jenis Cuti
            </Text>
            
            {loadingTypes ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <View className="gap-3">
                {leaveTypes.map((leaveType) => (
                  <TouchableOpacity
                    key={leaveType.id}
                    onPress={() => setSelectedLeaveTypeId(leaveType.id)}
                    className={`p-4 rounded-xl border-2 ${
                      selectedLeaveTypeId === leaveType.id
                        ? "border-blue-500 bg-blue-50"
                        : isDarkMode
                        ? "border-gray-700 bg-gray-800"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <View className="flex-row justify-between items-center">
                      <View className="flex-1">
                        <Text className={`font-bold ${
                          selectedLeaveTypeId === leaveType.id
                            ? "text-blue-600"
                            : isDarkMode
                            ? "text-white"
                            : "text-gray-900"
                        }`}>
                          {leaveType.name}
                        </Text>
                        {leaveType.description && (
                          <Text className="text-gray-500 text-sm mt-1">
                            {leaveType.description}
                          </Text>
                        )}
                        <View className="flex-row items-center mt-2 gap-3">
                          <Text className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Max: {leaveType.max_days || '-'} hari
                          </Text>
                          {leaveType.requires_file && (
                            <Text className="text-xs text-orange-500">
                              • Perlu Lampiran
                            </Text>
                          )}
                          {leaveType.is_quota_deduction && (
                            <Text className="text-xs text-red-500">
                              • Potong Saldo
                            </Text>
                          )}
                        </View>
                      </View>
                      {selectedLeaveTypeId === leaveType.id && (
                        <View className="w-6 h-6 bg-blue-500 rounded-full items-center justify-center">
                          <Check color="white" size={16} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );

      case 2:
        return (
          <View>
            <Text className={`${isDarkMode ? "text-white" : "text-gray-900"} text-lg font-bold mb-4`}>
              Pilih Tanggal
            </Text>

            {/* Start Date */}
            <View className="mb-4">
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-2`}>
                Tanggal Mulai
              </Text>
              <TouchableOpacity
                onPress={() => setShowStartPicker(true)}
                className={`p-4 rounded-xl flex-row items-center justify-between ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                } border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
              >
                <View className="flex-row items-center">
                  <Calendar color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
                  <Text className={`ml-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    {formatDateID(startDate.toISOString())}
                  </Text>
                </View>
                <ChevronRight color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              </TouchableOpacity>
            </View>

            {/* End Date */}
            <View className="mb-4">
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-2`}>
                Tanggal Selesai
              </Text>
              <TouchableOpacity
                onPress={() => setShowEndPicker(true)}
                className={`p-4 rounded-xl flex-row items-center justify-between ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                } border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
              >
                <View className="flex-row items-center">
                  <Calendar color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
                  <Text className={`ml-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                    {formatDateID(endDate.toISOString())}
                  </Text>
                </View>
                <ChevronRight color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              </TouchableOpacity>
            </View>

            {/* Duration */}
            <View className={`p-4 rounded-xl ${isDarkMode ? "bg-blue-900/30" : "bg-blue-50"}`}>
              <View className="flex-row justify-between items-center">
                <Text className={`${isDarkMode ? "text-blue-200" : "text-blue-800"}`}>
                  Total Hari Cuti
                </Text>
                <Text className={`${isDarkMode ? "text-blue-200" : "text-blue-800"} font-bold text-lg`}>
                  {totalDays} hari
                </Text>
              </View>
              {selectedLeaveType?.is_quota_deduction && (
                <View className="flex-row justify-between items-center mt-2">
                  <Text className={`${isDarkMode ? "text-blue-300" : "text-blue-600"} text-sm`}>
                    Sisa Saldo Setelah
                  </Text>
                  <Text className={`${isDarkMode ? "text-blue-300" : "text-blue-600"} font-medium`}>
                    {balanceUI.remaining - totalDays} hari
                  </Text>
                </View>
              )}
            </View>

            {/* Date Pickers */}
            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, date) => {
                  setShowStartPicker(false);
                  if (date) {
                    setStartDate(date);
                    if (date > endDate) setEndDate(date);
                  }
                }}
                minimumDate={new Date()}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, date) => {
                  setShowEndPicker(false);
                  if (date) setEndDate(date);
                }}
                minimumDate={startDate}
              />
            )}
          </View>
        );

      case 3:
        return (
          <View>
            <Text className={`${isDarkMode ? "text-white" : "text-gray-900"} text-lg font-bold mb-4`}>
              Detail Pengajuan
            </Text>

            {/* Reason */}
            <View className="mb-4">
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-2`}>
                Alasan Cuti *
              </Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Masukkan alasan pengajuan cuti..."
                placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className={`p-4 rounded-xl ${
                  isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
                } border ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
                style={{ minHeight: 100 }}
              />
            </View>

            {/* Document Upload */}
            <View className="mb-4">
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-2`}>
                Dokumen Pendukung {selectedLeaveType?.requires_file ? "*" : "(Opsional)"}
              </Text>
              <TouchableOpacity
                onPress={handlePickDocument}
                className={`p-4 rounded-xl border-2 border-dashed ${
                  isDarkMode ? "border-gray-700" : "border-gray-300"
                } items-center`}
              >
                {document ? (
                  <View className="items-center">
                    <FileText color="#10B981" size={32} />
                    <Text className={`mt-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                      {document.name}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      Ketuk untuk ganti
                    </Text>
                  </View>
                ) : (
                  <View className="items-center">
                    <Upload color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={32} />
                    <Text className={`mt-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                      Ketuk untuk upload dokumen
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      PDF, JPG, PNG (Max 5MB)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Summary */}
            <View className={`p-4 rounded-xl ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
              <Text className={`${isDarkMode ? "text-white" : "text-gray-900"} font-bold mb-3`}>
                Ringkasan Pengajuan
              </Text>
              
              <View className="gap-2">
                <View className="flex-row justify-between">
                  <Text className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Jenis Cuti</Text>
                  <Text className={`${isDarkMode ? "text-white" : "text-gray-900"} font-medium`}>
                    {selectedLeaveType?.name || "-"}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Tanggal</Text>
                  <Text className={`${isDarkMode ? "text-white" : "text-gray-900"} font-medium`}>
                    {formatDateID(startDate.toISOString())} - {formatDateID(endDate.toISOString())}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className={`${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>Total Hari</Text>
                  <Text className={`${isDarkMode ? "text-white" : "text-gray-900"} font-medium`}>
                    {totalDays} hari
                  </Text>
                </View>
              </View>
            </View>

            {selectedLeaveType?.requires_file && !document && (
              <View className="flex-row items-center mt-4 p-3 bg-orange-100 rounded-lg">
                <AlertCircle color="#F97316" size={20} />
                <Text className="text-orange-700 ml-2 flex-1">
                  Jenis cuti ini memerlukan dokumen pendukung
                </Text>
              </View>
            )}
          </View>
        );
    }
  };

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-[#F7F7F7]"}`}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ["#1E3A8A", "#1E40AF"] : ["#3B82F6", "#60A5FA"]}
        className="px-6 pb-6 rounded-b-3xl"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={handleBack} className="mr-4 p-1">
              <ArrowLeft color="white" size={24} />
            </TouchableOpacity>
            <View>
              <Text className="text-white text-xl font-bold">Pengajuan Cuti</Text>
              <Text className="text-blue-100 text-sm mt-1">
                Langkah {step} dari 3
              </Text>
            </View>
          </View>
          
          {/* ✅ NEW: X button with confirmation */}
          <TouchableOpacity 
            onPress={handleClose} 
            className="bg-white/20 p-2 rounded-full"
          >
            <X color="white" size={22} />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View className="flex-row mt-4 gap-2">
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              className={`flex-1 h-1 rounded-full ${
                s <= step ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {renderStepContent()}
      </ScrollView>

      {/* Bottom Action - Now with safe spacing from tab bar */}
      <View 
        className={`px-6 py-4 ${isDarkMode ? "bg-gray-900" : "bg-[#F7F7F7]"}`}
        style={{ paddingBottom: insets.bottom + 80 }} // Extra padding for tab bar
      >
        <View className="flex-row gap-3">
          {step > 1 && (
            <TouchableOpacity
              onPress={handleBack}
              className={`flex-1 py-4 rounded-xl flex-row items-center justify-center ${
                isDarkMode ? "bg-gray-800" : "bg-gray-200"
              }`}
            >
              <ArrowLeft color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              <Text className={`ml-2 font-bold ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                Kembali
              </Text>
            </TouchableOpacity>
          )}
          
          {step < 3 ? (
            <TouchableOpacity
              onPress={handleNext}
              className="flex-1 py-4 bg-blue-500 rounded-xl flex-row items-center justify-center"
            >
              <Text className="text-white font-bold mr-2">Lanjut</Text>
              <ArrowRight color="white" size={20} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              className={`flex-1 py-4 rounded-xl flex-row items-center justify-center ${
                submitting ? "bg-gray-400" : "bg-green-500"
              }`}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Check color="white" size={20} />
                  <Text className="text-white font-bold ml-2">Kirim Pengajuan</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
