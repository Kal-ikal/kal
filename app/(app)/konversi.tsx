// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(app)/konversi.tsx
// 📝 Aksi: REPLACE file yang sudah ada
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
import { formatIDR } from "@/utils/formatters";

cssInterop(LinearGradient, { className: "style" });

// ===========================
// TYPE DEFINITIONS
// ===========================
type LeaveBalanceDisplay = {
  type: string;
  days: number;
  used: number;
  eligible: number;
  ratePerDay: number; // IDR per hari
};

type TaxBracket = {
  min: number;
  max: number | string;
  rate: number;
};

// ===========================
// CONSTANTS
// ===========================
// Rate konversi per hari berdasarkan gaji (akan dihitung dari basic_salary)
const ENCASHMENT_RATE_MULTIPLIER = 1 / 22; // 1/22 dari gaji bulanan per hari
const TAX_RATE = 0.15; // 15% pajak
const MIN_KEEP_DAYS = 5; // Minimal hari yang harus disimpan

export default function LeaveConversionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode: isDark } = useTheme();
  const { user } = useAuth();
  const { employee, getLeaveBalanceUI, loading } = useUserData();
  const { onScroll } = useScrollHandler();

  const [conversionRequested, setConversionRequested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // Reset state saat fokus
  useFocusEffect(
    useCallback(() => {
      setConversionRequested(false);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      return () => {};
    }, [])
  );

  // ===========================
  // COMPUTED DATA
  // ===========================

  // Calculate leave balances untuk konversi
  const leaveBalances: LeaveBalanceDisplay[] = useMemo(() => {
    if (!employee) return [];

    const balanceUI = getLeaveBalanceUI();
    const dailyRate = (employee.basic_salary || 0) * ENCASHMENT_RATE_MULTIPLIER;

    return balanceUI.map((balance) => {
      // Hanya Annual Leave yang bisa dikonversi
      const isAnnual = balance.type === "Annual";
      const eligibleDays = isAnnual 
        ? Math.max(0, balance.remaining - MIN_KEEP_DAYS) 
        : 0;

      return {
        type: balance.type,
        days: balance.total,
        used: balance.used,
        eligible: eligibleDays,
        ratePerDay: isAnnual ? dailyRate : 0,
      };
    });
  }, [employee, getLeaveBalanceUI]);

  // Tax brackets (demo)
  const taxBrackets: TaxBracket[] = useMemo(
    () => [
      { min: 0, max: 60000000, rate: 5 },
      { min: 60000001, max: 250000000, rate: 15 },
      { min: 250000001, max: 500000000, rate: 25 },
      { min: 500000001, max: "∞", rate: 30 },
    ],
    []
  );

  // Eligibility criteria
  const eligibilityCriteria = useMemo(
    () => [
      `Minimal menyisakan ${MIN_KEEP_DAYS} hari cuti tahunan`,
      "Maksimal 10 hari dapat dikonversi per tahun kalender",
      "Request diproses dalam 5 hari kerja",
      "Hasil konversi akan ditambahkan ke gaji bulan berikutnya",
    ],
    []
  );

  // Calculations
  const calculations = useMemo(() => {
    const totalEligibleDays = leaveBalances.reduce(
      (sum, leave) => sum + leave.eligible,
      0
    );

    const totalAmountBeforeTax = leaveBalances.reduce(
      (sum, leave) => sum + leave.eligible * leave.ratePerDay,
      0
    );

    const taxAmount = totalAmountBeforeTax * TAX_RATE;
    const netAmount = totalAmountBeforeTax - taxAmount;

    // Daily rate untuk display
    const dailyRate = employee?.basic_salary 
      ? employee.basic_salary * ENCASHMENT_RATE_MULTIPLIER 
      : 0;

    return {
      totalEligibleDays,
      totalAmountBeforeTax,
      taxAmount,
      netAmount,
      dailyRate,
    };
  }, [leaveBalances, employee]);

  // ===========================
  // HANDLERS
  // ===========================

  const handleRequestConversion = useCallback(async () => {
    if (calculations.totalEligibleDays <= 0) {
      Alert.alert(
        "Tidak Memenuhi Syarat",
        `Anda tidak memiliki hari cuti yang dapat dikonversi. Minimal harus menyisakan ${MIN_KEEP_DAYS} hari cuti.`
      );
      return;
    }

    if (!user?.id || !employee) {
      Alert.alert("Error", "Data pengguna tidak ditemukan. Silakan reload aplikasi.");
      return;
    }

    Alert.alert(
      "Konfirmasi Konversi Cuti",
      `Anda akan mengkonversi ${calculations.totalEligibleDays} hari cuti dengan nilai bersih ${formatIDR(calculations.netAmount)}. Tindakan ini tidak dapat dibatalkan.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Konfirmasi",
          onPress: async () => {
            try {
              setIsSubmitting(true);

              // ✅ PERUBAHAN: Pakai service baru
              const result = await submitEncashmentRequest({
                userId: user.id,
                daysToConvert: calculations.totalEligibleDays,
                userRole: employee.role,
                managerId: employee.manager_id,
              });

              if (!result.success) {
                throw new Error(result.error || "Gagal mengajukan konversi");
              }

              setConversionRequested(true);

              Alert.alert(
                "Pengajuan Berhasil",
                "Pengajuan konversi cuti Anda telah dikirim dan sedang menunggu persetujuan.",
                [{ text: "OK", onPress: () => router.replace("/(app)/home") }]
              );
            } catch (e: any) {
              Alert.alert("Error", e.message || "Gagal mengajukan konversi");
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  }, [calculations, router, user, employee]);

  // ===========================
  // RENDER
  // ===========================

  if (loading) {
    return (
      <View className={`flex-1 justify-center items-center ${isDark ? "bg-gray-900" : "bg-[#F7F7F7]"}`}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View className={`${isDark ? "bg-gray-900" : "bg-[#F7F7F7]"} flex-1`}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={isDark ? ["#1E3A8A", "#1E40AF"] : ["#3B82F6", "#60A5FA"]}
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
        {/* Eligible Days */}
        <View className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className={`${isDark ? "text-white" : "text-[#1A1D23]"} text-lg font-bold`}>
              Hari yang Dapat Dikonversi
            </Text>
            <Info color={isDark ? "#9CA3AF" : "#6B7280"} size={20} />
          </View>

          <View className="flex-row flex-wrap gap-4 mb-6">
            {leaveBalances.map((leave, index) => (
              <View
                key={`${leave.type}-${index}`}
                className={`${isDark ? "bg-gray-700" : "bg-gray-100"} rounded-lg p-4 flex-1 min-w-[45%]`}
              >
                <Text className={`${isDark ? "text-gray-300" : "text-gray-600"} text-sm mb-1`}>
                  {leave.type === "Annual" ? "Cuti Tahunan" : leave.type === "Sick" ? "Cuti Sakit" : "Cuti Khusus"}
                </Text>
                <Text className={`${isDark ? "text-white" : "text-[#1A1D23]"} text-2xl font-bold`}>
                  {leave.eligible}
                </Text>
                <Text className="text-gray-500 text-xs mt-1">
                  {leave.used} terpakai / {leave.days} total
                </Text>
                {leave.type !== "Annual" && (
                  <Text className="text-orange-500 text-xs mt-1">Tidak dapat dikonversi</Text>
                )}
              </View>
            ))}
          </View>

          <View className={`${isDark ? "bg-blue-900/30" : "bg-blue-50"} rounded-xl p-4`}>
            <View className="flex-row justify-between">
              <Text className={`${isDark ? "text-blue-200" : "text-blue-800"} font-medium`}>
                Total Hari Eligible
              </Text>
              <Text className={`${isDark ? "text-blue-200" : "text-blue-800"} font-bold text-lg`}>
                {calculations.totalEligibleDays} hari
              </Text>
            </View>
          </View>
        </View>

        {/* Monetary Value - PAKAI IDR */}
        <View className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className={`${isDark ? "text-white" : "text-[#1A1D23]"} text-lg font-bold`}>
              Nilai Konversi
            </Text>
            <DollarSign color={isDark ? "#10B981" : "#059669"} size={20} />
          </View>

          <View className="mb-4">
            <View className={`flex-row justify-between py-3 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <Text className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
                Nilai Kotor
              </Text>
              <Text className={`${isDark ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                {formatIDR(calculations.totalAmountBeforeTax)}
              </Text>
            </View>

            <View className={`flex-row justify-between py-3 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              <Text className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
                Potongan Pajak (15%)
              </Text>
              <Text className={`${isDark ? "text-red-400" : "text-red-600"} font-medium`}>
                -{formatIDR(calculations.taxAmount)}
              </Text>
            </View>

            <View className="flex-row justify-between py-3">
              <Text className={`${isDark ? "text-white" : "text-[#1A1D23]"} font-bold`}>
                Nilai Bersih
              </Text>
              <Text className={`${isDark ? "text-white" : "text-[#1A1D23]"} font-bold text-lg`}>
                {formatIDR(calculations.netAmount)}
              </Text>
            </View>
          </View>

          <View className={`${isDark ? "bg-green-900/30" : "bg-green-50"} rounded-xl p-4`}>
            <View className="flex-row justify-between">
              <Text className={`${isDark ? "text-green-200" : "text-green-800"} font-medium`}>
                Rate per Hari
              </Text>
              <Text className={`${isDark ? "text-green-200" : "text-green-800"} font-bold`}>
                {formatIDR(calculations.dailyRate)}
              </Text>
            </View>
          </View>
        </View>

        {/* Tax Info */}
        <View className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
          <View className="flex-row justify-between items-center mb-4">
            <Text className={`${isDark ? "text-white" : "text-[#1A1D23]"} text-lg font-bold`}>
              Informasi Pajak
            </Text>
            <Calculator color={isDark ? "#9CA3AF" : "#6B7280"} size={20} />
          </View>

          <Text className={`${isDark ? "text-gray-300" : "text-gray-600"} mb-4`}>
            Potongan pajak dihitung berdasarkan bracket pajak penghasilan. Konversi cuti dianggap sebagai penghasilan tambahan.
          </Text>

          <Text className={`${isDark ? "text-white" : "text-[#1A1D23]"} font-medium mb-3`}>
            Bracket Pajak Anda: 15%
          </Text>

          <View className={`${isDark ? "bg-gray-700" : "bg-gray-100"} rounded-lg p-4`}>
            <Text className={`${isDark ? "text-gray-300" : "text-gray-600"} text-sm mb-2`}>
              Bracket Pajak Penghasilan
            </Text>
            {taxBrackets.map((bracket, index) => (
              <View key={`tax-${index}`} className="flex-row justify-between py-2">
                <Text className={`${isDark ? "text-gray-400" : "text-gray-500"} text-sm`}>
                  {formatIDR(bracket.min)} - {typeof bracket.max === 'number' ? formatIDR(bracket.max) : bracket.max}
                </Text>
                <Text className={`${isDark ? "text-gray-400" : "text-gray-500"} text-sm`}>
                  {bracket.rate}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Eligibility */}
        <View className={`${isDark ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
          <Text className={`${isDark ? "text-white" : "text-[#1A1D23]"} text-lg font-bold mb-4`}>
            Kriteria Kelayakan
          </Text>

          <View className="space-y-3">
            {eligibilityCriteria.map((text, i) => (
              <View key={`criteria-${i}`} className="flex-row items-start mb-3">
                <CheckCircle
                  color={isDark ? "#10B981" : "#059669"}
                  size={20}
                  style={{ marginTop: 2 }}
                />
                <Text className={`${isDark ? "text-gray-300" : "text-gray-600"} ml-3 flex-1`}>
                  {text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Button */}
        <TouchableOpacity
          className={`rounded-xl p-4 mb-6 ${
            conversionRequested ? "bg-green-500" : "bg-blue-500"
          } shadow-md ${isSubmitting ? "opacity-50" : ""}`}
          onPress={handleRequestConversion}
          disabled={conversionRequested || isSubmitting}
          activeOpacity={0.7}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-white text-center font-bold text-lg">
              {conversionRequested ? "Pengajuan Terkirim" : "Ajukan Konversi"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
