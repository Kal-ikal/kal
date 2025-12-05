// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(app)/konversi.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ V6: User can select how many days to convert (slider/stepper)
// ===========================================================

import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import {
  ChevronLeft,
  Info,
  DollarSign,
  Calculator,
  CheckCircle,
  AlertTriangle,
  Minus,
  Plus,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useUserData } from "@/hooks/useUserData";
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { submitEncashmentRequest } from "@/services/leaveService";
import { formatIDR, getLeaveTypeColor } from "@/utils/formatters";
import { useToast } from "@/context/NotificationToastContext";
import Slider from "@react-native-community/slider";

cssInterop(LinearGradient, { className: "style" });

// Constants
const ENCASHMENT_RATE_MULTIPLIER = 1 / 22;
const TAX_RATE = 0.15;
const MIN_KEEP_DAYS = 5;
const MAX_CONVERT_PER_YEAR = 10;

interface LeaveBalanceDisplay {
  id: string;
  type: string;
  code: string;
  days: number;
  used: number;
  eligible: number;
  ratePerDay: number;
  isQuotaDeduction: boolean;
}

interface TaxBracket {
  min: number;
  max: number | string;
  rate: number;
}

export default function LeaveConversionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const { employee, getLeaveBalanceArray, loading, refetch } = useUserData();
  const { onScroll } = useScrollHandler();
  const { showSuccess, showError, showWarning} = useToast();

  const [conversionRequested, setConversionRequested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ✅ NEW: State for selected days to convert
  const [selectedDays, setSelectedDays] = useState(0);

  const scrollRef = useRef<ScrollView>(null);

  // Reset state on focus
  useFocusEffect(
    useCallback(() => {
      setConversionRequested(false);
      setSelectedDays(0);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Calculate leave balances from master data
  const leaveBalances: LeaveBalanceDisplay[] = useMemo(() => {
    if (!employee) return [];

    const balanceArray = getLeaveBalanceArray();
    const dailyRate = (employee.basic_salary || 0) * ENCASHMENT_RATE_MULTIPLIER;

    return balanceArray.map((balance) => {
      const canConvert = balance.isQuotaDeduction;
      const eligibleDays = canConvert 
        ? Math.max(0, balance.remaining - MIN_KEEP_DAYS) 
        : 0;

      return {
        id: balance.id,
        type: balance.type,
        code: balance.code,
        days: balance.total,
        used: balance.used,
        eligible: eligibleDays,
        ratePerDay: canConvert ? dailyRate : 0,
        isQuotaDeduction: balance.isQuotaDeduction,
      };
    });
  }, [employee, getLeaveBalanceArray]);

  // Total eligible days
  const totalEligibleDays = useMemo(() => {
    return Math.min(
      leaveBalances.reduce((sum, leave) => sum + leave.eligible, 0),
      MAX_CONVERT_PER_YEAR
    );
  }, [leaveBalances]);

  // ✅ NEW: Initialize selectedDays when eligible days change
  useMemo(() => {
    if (selectedDays === 0 && totalEligibleDays > 0) {
      setSelectedDays(totalEligibleDays);
    }
  }, [selectedDays, totalEligibleDays]);

  // Daily rate
  const dailyRate = useMemo(() => {
    return employee?.basic_salary 
      ? employee.basic_salary * ENCASHMENT_RATE_MULTIPLIER 
      : 0;
  }, [employee]);

  // ✅ NEW: Calculations based on SELECTED days (not total eligible)
  const calculations = useMemo(() => {
    const daysToConvert = Math.min(selectedDays, totalEligibleDays);
    const amountBeforeTax = daysToConvert * dailyRate;
    const taxAmount = amountBeforeTax * TAX_RATE;
    const netAmount = amountBeforeTax - taxAmount;

    return {
      daysToConvert,
      amountBeforeTax,
      taxAmount,
      netAmount,
      dailyRate,
    };
  }, [selectedDays, totalEligibleDays, dailyRate]);

  // Tax brackets
  const taxBrackets: TaxBracket[] = useMemo(() => [
    { min: 0, max: 60000000, rate: 5 },
    { min: 60000001, max: 250000000, rate: 15 },
    { min: 250000001, max: 500000000, rate: 25 },
    { min: 500000001, max: "∞", rate: 30 },
  ], []);

  // Eligibility criteria
  const eligibilityCriteria = useMemo(() => [
    `Minimal menyisakan ${MIN_KEEP_DAYS} hari cuti tahunan`,
    `Maksimal ${MAX_CONVERT_PER_YEAR} hari dapat dikonversi per tahun kalender`,
    "Request diproses dalam 5 hari kerja",
    "Hasil konversi akan ditambahkan ke gaji bulan berikutnya",
  ], []);

  // ✅ NEW: Increment/Decrement handlers
  const incrementDays = useCallback(() => {
    setSelectedDays(prev => Math.min(prev + 1, totalEligibleDays));
  }, [totalEligibleDays]);

  const decrementDays = useCallback(() => {
    setSelectedDays(prev => Math.max(prev - 1, 1));
  }, []);

  // Handle slider change
  const handleSliderChange = useCallback((value: number) => {
    setSelectedDays(Math.round(value));
  }, []);

  // Handle conversion request
  const handleRequestConversion = useCallback(async () => {
    if (calculations.daysToConvert <= 0) {
      showWarning(
        "Tidak Memenuhi Syarat",
        `Minimal harus menyisakan ${MIN_KEEP_DAYS} hari cuti.`
      );
      return;
    }

    if (!user?.id || !employee) {
      showError("Error", "Data pengguna tidak ditemukan. Silakan reload aplikasi.");
      return;
    }

    Alert.alert(
      "Konfirmasi Konversi Cuti",
      `Anda akan mengkonversi ${calculations.daysToConvert} hari cuti dengan nilai bersih ${formatIDR(calculations.netAmount)}.\n\nTindakan ini tidak dapat dibatalkan.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Konfirmasi",
          onPress: async () => {
            try {
              setIsSubmitting(true);

              const result = await submitEncashmentRequest({
                userId: user.id,
                daysToConvert: calculations.daysToConvert,
                amount: calculations.netAmount,
              });

              if (!result.success) {
                throw new Error(result.error || "Gagal mengajukan konversi");
              }

              setConversionRequested(true);
              await refetch();

              showSuccess("Pengajuan Berhasil", "Pengajuan konversi cuti Anda sedang menunggu persetujuan.");

              setTimeout(() => {
                router.replace("/(app)/home");
              }, 1500);

            } catch (e) {
              const message = e instanceof Error ? e.message : "Gagal mengajukan konversi";
              showError("Error", message);
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  }, [calculations, router, user, employee, refetch, showSuccess, showError, showWarning]);

  if (loading) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? "bg-gray-900" : "bg-[#F7F7F7]"}`}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View className={`${isDarkMode ? "bg-gray-900" : "bg-[#F7F7F7]"} flex-1`}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ["#1E3A8A", "#1E40AF"] : ["#3B82F6", "#60A5FA"]}
        className="px-6 pb-6 rounded-b-3xl"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 24 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-xl font-bold">Konversi Cuti</Text>
            <Text className="text-blue-100 text-sm mt-1">
              Konversi sisa cuti menjadi uang tunai
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4 mt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Eligible Days Overview */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold`}>
              Hari yang Dapat Dikonversi
            </Text>
            <Info color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
          </View>

          {leaveBalances.length === 0 ? (
            <Text className={`text-center py-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Tidak ada data jenis cuti
            </Text>
          ) : (
            <>
              <View className="flex-row flex-wrap gap-3 mb-4">
                {leaveBalances.map((leave) => (
                  <View
                    key={leave.id}
                    className={`${isDarkMode ? "bg-gray-700" : "bg-gray-100"} rounded-lg p-4 flex-1 min-w-[45%]`}
                  >
                    <View className="flex-row items-center mb-1">
                      <View 
                        className="px-2 py-0.5 rounded"
                        style={{ backgroundColor: getLeaveTypeColor(leave.code) }}
                      >
                        <Text className="text-white text-xs font-bold">{leave.code}</Text>
                      </View>
                    </View>
                    
                    <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-1`}>
                      {leave.type}
                    </Text>
                    
                    <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-2xl font-bold`}>
                      {leave.eligible}
                    </Text>
                    
                    <Text className="text-gray-500 text-xs mt-1">
                      {leave.used} terpakai / {leave.days} total
                    </Text>
                    
                    {!leave.isQuotaDeduction && (
                      <View className="flex-row items-center mt-2">
                        <AlertTriangle color="#F59E0B" size={12} style={{ marginRight: 4 }} />
                        <Text className="text-amber-500 text-xs font-medium">
                          Tidak dapat dikonversi
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              <View className={`${isDarkMode ? "bg-blue-900/30" : "bg-blue-50"} rounded-xl p-4`}>
                <View className="flex-row justify-between">
                  <Text className={`${isDarkMode ? "text-blue-200" : "text-blue-800"} font-medium`}>
                    Total Eligible
                  </Text>
                  <Text className={`${isDarkMode ? "text-blue-200" : "text-blue-800"} font-bold text-lg`}>
                    {totalEligibleDays} hari
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ✅ NEW: Days Selector */}
        {totalEligibleDays > 0 && (
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold`}>
                Pilih Jumlah Hari
              </Text>
            </View>

            {/* Stepper Controls */}
            <View className="flex-row items-center justify-center mb-4">
              <TouchableOpacity
                onPress={decrementDays}
                disabled={selectedDays <= 1}
                className={`w-12 h-12 rounded-full items-center justify-center ${
                  selectedDays <= 1 
                    ? isDarkMode ? "bg-gray-700" : "bg-gray-200"
                    : isDarkMode ? "bg-blue-600" : "bg-blue-500"
                }`}
              >
                <Minus color={selectedDays <= 1 ? "#9CA3AF" : "white"} size={24} />
              </TouchableOpacity>

              <View className="mx-8 items-center">
                <Text className={`text-5xl font-bold ${isDarkMode ? "text-white" : "text-[#1A1D23]"}`}>
                  {selectedDays}
                </Text>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  hari
                </Text>
              </View>

              <TouchableOpacity
                onPress={incrementDays}
                disabled={selectedDays >= totalEligibleDays}
                className={`w-12 h-12 rounded-full items-center justify-center ${
                  selectedDays >= totalEligibleDays 
                    ? isDarkMode ? "bg-gray-700" : "bg-gray-200"
                    : isDarkMode ? "bg-blue-600" : "bg-blue-500"
                }`}
              >
                <Plus color={selectedDays >= totalEligibleDays ? "#9CA3AF" : "white"} size={24} />
              </TouchableOpacity>
            </View>

            {/* Slider */}
            {totalEligibleDays > 1 && (
              <View className="px-2">
                <Slider
                  minimumValue={1}
                  maximumValue={totalEligibleDays}
                  step={1}
                  value={selectedDays}
                  onValueChange={handleSliderChange}
                  minimumTrackTintColor="#3B82F6"
                  maximumTrackTintColor={isDarkMode ? "#374151" : "#E5E7EB"}
                  thumbTintColor="#3B82F6"
                />
                <View className="flex-row justify-between mt-1">
                  <Text className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    1 hari
                  </Text>
                  <Text className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                    {totalEligibleDays} hari
                  </Text>
                </View>
              </View>
            )}

            {/* Quick Select Buttons */}
            {totalEligibleDays > 2 && (
              <View className="flex-row justify-center gap-2 mt-4">
                {[1, Math.ceil(totalEligibleDays / 2), totalEligibleDays].map((days) => (
                  <TouchableOpacity
                    key={days}
                    onPress={() => setSelectedDays(days)}
                    className={`px-4 py-2 rounded-full ${
                      selectedDays === days
                        ? "bg-blue-500"
                        : isDarkMode ? "bg-gray-700" : "bg-gray-200"
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      selectedDays === days
                        ? "text-white"
                        : isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                      {days === totalEligibleDays ? "Semua" : `${days} hari`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Monetary Value - Updated to use selected days */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold`}>
              Nilai Konversi
            </Text>
            <DollarSign color="#059669" size={20} />
          </View>

          <View className="mb-4">
            <View className={`flex-row justify-between py-3 border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                Hari yang akan dikonversi
              </Text>
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-bold`}>
                {calculations.daysToConvert} hari
              </Text>
            </View>

            <View className={`flex-row justify-between py-3 border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                Nilai Kotor
              </Text>
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                {formatIDR(calculations.amountBeforeTax)}
              </Text>
            </View>

            <View className={`flex-row justify-between py-3 border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                Potongan Pajak (15%)
              </Text>
              <Text className="text-red-500 font-medium">
                -{formatIDR(calculations.taxAmount)}
              </Text>
            </View>

            <View className="flex-row justify-between py-3">
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-bold`}>
                Nilai Bersih
              </Text>
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-bold text-xl`}>
                {formatIDR(calculations.netAmount)}
              </Text>
            </View>
          </View>

          <View className={`${isDarkMode ? "bg-green-900/30" : "bg-green-50"} rounded-xl p-4`}>
            <View className="flex-row justify-between">
              <Text className={`${isDarkMode ? "text-green-200" : "text-green-800"} font-medium`}>
                Rate per Hari
              </Text>
              <Text className={`${isDarkMode ? "text-green-200" : "text-green-800"} font-bold`}>
                {formatIDR(calculations.dailyRate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Tax Info */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold`}>
              Informasi Pajak
            </Text>
            <Calculator color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
          </View>

          {taxBrackets.map((bracket, index) => (
            <View
              key={index}
              className={`flex-row justify-between py-2 ${
                index !== taxBrackets.length - 1 ? "border-b" : ""
              } ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}
            >
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm`}>
                {formatIDR(bracket.min)} - {typeof bracket.max === "number" ? formatIDR(bracket.max) : bracket.max}
              </Text>
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                {bracket.rate}%
              </Text>
            </View>
          ))}
        </View>

        {/* Eligibility Criteria */}
        <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold`}>
              Syarat dan Ketentuan
            </Text>
            <Info color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
          </View>

          {eligibilityCriteria.map((criteria, index) => (
            <View key={index} className="flex-row items-start mb-3">
              <CheckCircle color="#059669" size={16} style={{ marginTop: 2, marginRight: 12 }} />
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} flex-1`}>
                {criteria}
              </Text>
            </View>
          ))}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleRequestConversion}
          disabled={isSubmitting || conversionRequested || calculations.daysToConvert <= 0}
          className={`rounded-xl p-4 mb-6 ${
            isSubmitting || conversionRequested || calculations.daysToConvert <= 0
              ? "bg-gray-400"
              : "bg-blue-500"
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-bold text-lg">
              {conversionRequested
                ? "Pengajuan Terkirim"
                : calculations.daysToConvert <= 0
                ? "Tidak Ada Cuti Eligible"
                : `Ajukan Konversi ${calculations.daysToConvert} Hari`}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
