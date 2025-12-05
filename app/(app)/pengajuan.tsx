// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(app)/pengajuan.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ FIXED: Menggunakan RPC untuk submit leave request
// ===========================================================

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  FileText,
  ChevronRight,
  Check,
  Upload,
  AlertCircle,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useUserData, useLeaveTypes } from "@/hooks/useUserData";
import { submitLeaveRequest, calculateWorkingDays } from "@/services/leaveService";
import { formatDateFullID } from "@/utils/formatters";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";

type Step = 1 | 2 | 3;

export default function PengajuanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { session } = useAuth();
  const { employee, refetch } = useUserData();
  const { leaveTypes, loading: loadingTypes } = useLeaveTypes();

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

  // Calculate days
  const [workingDays, setWorkingDays] = useState<number>(1);
  const calculateDays = async () => {
    const days = await calculateWorkingDays(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
    setWorkingDays(days);
  };

  // Recalculate when dates change
  React.useEffect(() => {
    calculateDays();
  }, [startDate, endDate]);

  // Step validation
  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return selectedLeaveTypeId !== null;
      case 2:
        return startDate <= endDate && reason.trim().length > 0;
      case 3:
        // If requires file, must have document
        if (selectedLeaveType?.requires_file && !document) {
          return false;
        }
        return true;
      default:
        return false;
    }
  }, [step, selectedLeaveTypeId, startDate, endDate, reason, document, selectedLeaveType]);

  // Handle date change
  const onStartDateChange = (event: any, date?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (date) {
      setStartDate(date);
      if (date > endDate) {
        setEndDate(date);
      }
    }
  };

  const onEndDateChange = (event: any, date?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (date) {
      setEndDate(date);
    }
  };

  // Handle document pick
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        setDocument(result.assets[0]);
      }
    } catch (err) {
      console.error('Document picker error:', err);
    }
  };

  // Submit handler - USING RPC
  const handleSubmit = async () => {
    if (!session?.user?.id || !selectedLeaveTypeId) {
      Alert.alert('Error', 'Data tidak lengkap');
      return;
    }

    try {
      setSubmitting(true);

      // ✅ MENGGUNAKAN RPC untuk submit
      const result = await submitLeaveRequest({
        userId: session.user.id,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        reason: reason,
        leaveTypeId: selectedLeaveTypeId,
        documentUrl: document?.uri || undefined,
      });

      if (result.success) {
        Alert.alert(
          'Berhasil',
          'Pengajuan cuti berhasil dikirim. Menunggu persetujuan.',
          [
            {
              text: 'OK',
              onPress: () => {
                refetch(); // Refresh data
                router.back();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Gagal mengajukan cuti');
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      Alert.alert('Error', err.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
    }
  };

  // Step 1: Select Leave Type
  const renderStep1 = () => (
    <View className="px-6 py-4">
      <Text className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
        Pilih Jenis Cuti
      </Text>

      {loadingTypes ? (
        <ActivityIndicator size="large" color="#3B82F6" />
      ) : (
        leaveTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            className={`p-4 rounded-xl mb-3 border-2 ${
              selectedLeaveTypeId === type.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : isDarkMode
                ? "border-gray-700 bg-gray-800"
                : "border-gray-200 bg-white"
            }`}
            onPress={() => setSelectedLeaveTypeId(type.id)}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View
                  className="w-3 h-3 rounded-full mr-3"
                  style={{ backgroundColor: type.badge_color || '#3B82F6' }}
                />
                <View className="flex-1">
                  <Text
                    className={`font-semibold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {type.name}
                  </Text>
                  <View className="flex-row mt-1">
                    {type.is_quota_deduction && (
                      <View className="bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded mr-2">
                        <Text className="text-yellow-700 dark:text-yellow-300 text-xs">
                          Potong Saldo
                        </Text>
                      </View>
                    )}
                    {type.requires_file && (
                      <View className="bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">
                        <Text className="text-red-700 dark:text-red-300 text-xs">
                          Butuh Dokumen
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              {selectedLeaveTypeId === type.id && (
                <Check color="#3B82F6" size={24} />
              )}
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  // Step 2: Date and Reason
  const renderStep2 = () => (
    <View className="px-6 py-4">
      <Text className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
        Tanggal & Alasan
      </Text>

      {/* Start Date */}
      <View className="mb-4">
        <Text className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
          Tanggal Mulai
        </Text>
        <TouchableOpacity
          className={`p-4 rounded-xl flex-row items-center justify-between ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          }`}
          onPress={() => setShowStartPicker(true)}
        >
          <View className="flex-row items-center">
            <Calendar color="#3B82F6" size={20} />
            <Text className={`ml-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {formatDateFullID(startDate.toISOString())}
            </Text>
          </View>
          <ChevronRight color="#9CA3AF" size={20} />
        </TouchableOpacity>
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            minimumDate={new Date()}
            onChange={onStartDateChange}
          />
        )}
      </View>

      {/* End Date */}
      <View className="mb-4">
        <Text className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
          Tanggal Selesai
        </Text>
        <TouchableOpacity
          className={`p-4 rounded-xl flex-row items-center justify-between ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          }`}
          onPress={() => setShowEndPicker(true)}
        >
          <View className="flex-row items-center">
            <Calendar color="#3B82F6" size={20} />
            <Text className={`ml-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {formatDateFullID(endDate.toISOString())}
            </Text>
          </View>
          <ChevronRight color="#9CA3AF" size={20} />
        </TouchableOpacity>
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            minimumDate={startDate}
            onChange={onEndDateChange}
          />
        )}
      </View>

      {/* Duration Info */}
      <View className={`p-4 rounded-xl mb-4 ${isDarkMode ? "bg-blue-900/20" : "bg-blue-50"}`}>
        <Text className={`text-center font-semibold ${isDarkMode ? "text-blue-200" : "text-blue-800"}`}>
          Durasi: {workingDays} hari kerja
        </Text>
      </View>

      {/* Reason */}
      <View className="mb-4">
        <Text className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
          Alasan
        </Text>
        <TextInput
          className={`p-4 rounded-xl ${
            isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
          }`}
          placeholder="Masukkan alasan cuti..."
          placeholderTextColor="#9CA3AF"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </View>
  );

  // Step 3: Review & Submit
  const renderStep3 = () => (
    <View className="px-6 py-4">
      <Text className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
        Konfirmasi Pengajuan
      </Text>

      {/* Summary Card */}
      <View className={`p-4 rounded-xl mb-4 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
        <View className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Jenis Cuti
          </Text>
          <Text className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            {selectedLeaveType?.name}
          </Text>
        </View>

        <View className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Tanggal
          </Text>
          <Text className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            {formatDateFullID(startDate.toISOString())} - {formatDateFullID(endDate.toISOString())}
          </Text>
          <Text className={`text-sm ${isDarkMode ? "text-blue-300" : "text-blue-600"}`}>
            {workingDays} hari kerja
          </Text>
        </View>

        <View className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Alasan
          </Text>
          <Text className={`${isDarkMode ? "text-white" : "text-gray-900"}`}>
            {reason}
          </Text>
        </View>

        {/* Document Upload */}
        {selectedLeaveType?.requires_file && (
          <View>
            <Text className={`text-sm mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Dokumen Pendukung
            </Text>
            <TouchableOpacity
              className={`p-4 rounded-xl border-2 border-dashed flex-row items-center justify-center ${
                document
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              onPress={pickDocument}
            >
              {document ? (
                <>
                  <Check color="#10B981" size={20} />
                  <Text className="text-green-600 dark:text-green-400 ml-2">
                    {document.name}
                  </Text>
                </>
              ) : (
                <>
                  <Upload color="#9CA3AF" size={20} />
                  <Text className={`ml-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Upload Dokumen
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Warning if quota deduction */}
        {selectedLeaveType?.is_quota_deduction && (
          <View className="mt-4 p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex-row items-center">
            <AlertCircle color="#F59E0B" size={20} />
            <Text className="text-yellow-700 dark:text-yellow-300 ml-2 flex-1 text-sm">
              Cuti ini akan memotong saldo cuti Anda sebanyak {workingDays} hari
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Header */}
      <View
        className={`px-6 pb-4 border-b ${
          isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        }`}
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 -ml-2">
              <ArrowLeft color={isDarkMode ? "#fff" : "#000"} size={24} />
            </TouchableOpacity>
            <Text
              className={`text-2xl font-bold ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}
            >
              Ajukan Cuti
            </Text>
          </View>
          <Text className={`${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            {step}/3
          </Text>
        </View>

        {/* Progress Bar */}
        <View className="flex-row mt-4">
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              className={`flex-1 h-1 rounded-full mx-1 ${
                s <= step ? "bg-blue-500" : isDarkMode ? "bg-gray-700" : "bg-gray-200"
              }`}
            />
          ))}
        </View>
      </View>

      {/* Content */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>

      {/* Footer Buttons */}
      <View
        className={`px-6 py-4 border-t ${
          isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        }`}
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <View className="flex-row">
          {step > 1 && (
            <TouchableOpacity
              className={`flex-1 py-4 rounded-xl mr-2 ${
                isDarkMode ? "bg-gray-800" : "bg-gray-200"
              }`}
              onPress={() => setStep((step - 1) as Step)}
            >
              <Text
                className={`text-center font-semibold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Kembali
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className={`flex-1 py-4 rounded-xl ${
              canProceed
                ? "bg-blue-500"
                : isDarkMode
                ? "bg-gray-700"
                : "bg-gray-300"
            }`}
            onPress={() => {
              if (step < 3) {
                setStep((step + 1) as Step);
              } else {
                handleSubmit();
              }
            }}
            disabled={!canProceed || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                className={`text-center font-semibold ${
                  canProceed ? "text-white" : isDarkMode ? "text-gray-500" : "text-gray-500"
                }`}
              >
                {step === 3 ? "Kirim Pengajuan" : "Lanjutkan"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
