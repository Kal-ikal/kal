//konversi.tsx
import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
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
import { supabase } from '@/lib/supabase';
import { useScrollHandler } from "@/hooks/useScrollHandler";

cssInterop(LinearGradient, { className: "style" });

// ✅ Type definitions
type LeaveBalance = {
  type: string;
  days: number;
  used: number;
  eligible: number;
  rate: number;
};

type TaxBracket = {
  min: number;
  max: number | string;
  rate: number;
};

export default function LeaveConversionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode: isDark } = useTheme();
  const [conversionRequested, setConversionRequested] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const { onScroll } = useScrollHandler();
  // Removed unused isLoading state

  // ✅ Ref untuk ScrollView
  const scrollRef = useRef<ScrollView>(null);

  // ✅ useFocusEffect untuk RESET state dan FETCH data
  useFocusEffect(
    useCallback(() => {
      setConversionRequested(false);
      scrollRef.current?.scrollTo({ y: 0, animated: false }); // Reset scroll position on focus
      fetchLeaveBalances();

      return () => {};
    }, [])
  );

  const fetchLeaveBalances = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!employee) return;

      // Fetch real balances - assuming simple schema or mocking 'eligible' logic
      // Since I don't see a complex leave_balances schema with eligible days, I will simulate it
      // based on the logic from home.tsx (improvisation)

      // Fetch requests to calculate used
      const { data: requests } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('employee_id', employee.id)
          .eq('status', 'Disetujui');

      let annualUsed = 0;
      let sickUsed = 0;
      let specialUsed = 0;

      if (requests) {
        requests.forEach((req: any) => {
            const startDate = new Date(req.start_date);
            const endDate = new Date(req.end_date);
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            const typeLower = req.leave_type.toLowerCase();
            if (typeLower.includes('tahunan') || typeLower.includes('annual')) {
                 annualUsed += days;
            } else if (typeLower.includes('sakit') || typeLower.includes('sick')) {
                 sickUsed += days;
            } else {
                 specialUsed += days;
            }
        });
      }

      // Defaults (allocations)
      const annualAlloc = 15;
      const sickAlloc = 10;
      const specialAlloc = 5;

      // Eligibility logic (Improvisation)
      // Only Annual leave is eligible for conversion usually
      const annualEligible = Math.max(0, annualAlloc - annualUsed - 5); // Must keep 5 days? Just an example logic

      setLeaveBalances([
        { type: "Annual", days: annualAlloc, used: annualUsed, eligible: annualEligible, rate: 150 }, // $150 per day
        { type: "Sick", days: sickAlloc, used: sickUsed, eligible: 0, rate: 100 },
        { type: "Special", days: specialAlloc, used: specialUsed, eligible: 0, rate: 200 },
      ]);

    } catch (error) {
      console.error("Error fetching conversion data:", error);
    } finally {
      // No loading state to toggle
    }
  };

  // ✅ Data pajak (mock) - useMemo untuk performa
  const taxBrackets: TaxBracket[] = useMemo(
    () => [
      { min: 0, max: 5000, rate: 10 },
      { min: 5001, max: 10000, rate: 15 },
      { min: 10001, max: 20000, rate: 20 },
      { min: 20001, max: "Infinity", rate: 25 },
    ],
    []
  );

  // ✅ Eligibility criteria - useMemo untuk performa
  const eligibilityCriteria = useMemo(
    () => [
      "Annual leave days must be unused for at least 6 months",
      "Maximum 10 days can be converted per calendar year",
      "Conversion requests are processed within 5 business days",
      "Converted amounts will be added to your next paycheck",
    ],
    []
  );

  // ✅ Kalkulasi dengan useMemo untuk performa
  const calculations = useMemo(() => {
    const totalEligibleDays = leaveBalances.reduce(
      (sum, leave) => sum + leave.eligible,
      0
    );
    const totalAmountBeforeTax = leaveBalances.reduce(
      (sum, leave) => sum + leave.eligible * leave.rate,
      0
    );
    const taxAmount = totalAmountBeforeTax * 0.15; // 15% pajak demo
    const netAmount = totalAmountBeforeTax - taxAmount;

    return {
      totalEligibleDays,
      totalAmountBeforeTax,
      taxAmount,
      netAmount,
    };
  }, [leaveBalances]);

  // ✅ Handler dengan useCallback
  const handleRequestConversion = useCallback(async () => {
    if (calculations.totalEligibleDays <= 0) {
        Alert.alert("Not Eligible", "You do not have any eligible days to convert.");
        return;
    }

    Alert.alert(
      "Leave Conversion Request",
      `You are requesting to convert ${calculations.totalEligibleDays} days for a net amount of $${calculations.netAmount.toFixed(
        2
      )}. This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Not authenticated");

                const { data: employee } = await supabase.from('employees').select('id').eq('user_id', user.id).single();
                if (!employee) throw new Error("Employee not found");

                // Insert into leave_requests as a 'Konversi Cuti' type since we are improvising database compatibility
                const { error } = await supabase.from('leave_requests').insert({
                    employee_id: employee.id,
                    leave_type: 'Konversi Cuti',
                    start_date: new Date().toISOString(),
                    end_date: new Date().toISOString(),
                    reason: `Conversion of ${calculations.totalEligibleDays} days. Net: $${calculations.netAmount}`,
                    status: 'Dalam Proses',
                    user_id: user.id
                });

                if (error) throw error;

                setConversionRequested(true);

                Alert.alert(
                "Conversion Requested",
                "Your leave conversion request has been submitted successfully. You will receive a confirmation email shortly.",
                [
                    {
                    text: "OK",
                    onPress: () => {
                        router.replace("/(app)/home");
                    },
                    },
                ]
                );
            } catch (e: any) {
                Alert.alert("Error", e.message || "Failed to request conversion");
            }
          },
        },
      ]
    );
  }, [calculations, router]);

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
            <Text className="text-white text-xl font-bold">
              Leave Conversion
            </Text>
            <Text className="text-blue-100 text-sm mt-1">
              Convert unused leave days to cash
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4 mt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} // Increased padding
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Eligible Days */}
        <View
          className={`${
            isDark ? "bg-gray-800" : "bg-white"
          } rounded-xl p-5 shadow-md mb-6`}
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text
              className={`${
                isDark ? "text-white" : "text-[#1A1D23]"
              } text-lg font-bold`}
            >
              Eligible Days for Conversion
            </Text>
            <Info color={isDark ? "#9CA3AF" : "#6B7280"} size={20} />
          </View>

          <View className="flex-row flex-wrap gap-4 mb-6">
            {leaveBalances.length > 0 ? leaveBalances.map((leave, index) => (
              <View
                key={`${leave.type}-${index}`}
                className={`${
                  isDark ? "bg-gray-700" : "bg-gray-100"
                } rounded-lg p-4 flex-1 min-w-[45%]`}
              >
                <Text
                  className={`${
                    isDark ? "text-gray-300" : "text-gray-600"
                  } text-sm mb-1`}
                >
                  {leave.type} Leave
                </Text>
                <Text
                  className={`${
                    isDark ? "text-white" : "text-[#1A1D23]"
                  } text-2xl font-bold`}
                >
                  {leave.eligible}
                </Text>
                <Text className="text-gray-500 text-xs mt-1">
                  {leave.used} used / {leave.days} total
                </Text>
              </View>
            )) : (
                <Text className="text-gray-500">Loading balances...</Text>
            )}
          </View>

          <View
            className={`${
              isDark ? "bg-blue-900/30" : "bg-blue-50"
            } rounded-xl p-4`}
          >
            <View className="flex-row justify-between">
              <Text
                className={`${
                  isDark ? "text-blue-200" : "text-blue-800"
                } font-medium`}
              >
                Total Eligible Days
              </Text>
              <Text
                className={`${
                  isDark ? "text-blue-200" : "text-blue-800"
                } font-bold text-lg`}
              >
                {calculations.totalEligibleDays} days
              </Text>
            </View>
          </View>
        </View>

        {/* Monetary Value */}
        <View
          className={`${
            isDark ? "bg-gray-800" : "bg-white"
          } rounded-xl p-5 shadow-md mb-6`}
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text
              className={`${
                isDark ? "text-white" : "text-[#1A1D23]"
              } text-lg font-bold`}
            >
              Monetary Value
            </Text>
            <DollarSign color={isDark ? "#10B981" : "#059669"} size={20} />
          </View>

          <View className="mb-4">
            <View
              className={`flex-row justify-between py-3 border-b ${
                isDark ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <Text className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
                Gross Amount
              </Text>
              <Text
                className={`${
                  isDark ? "text-white" : "text-[#1A1D23]"
                } font-medium`}
              >
                ${calculations.totalAmountBeforeTax.toFixed(2)}
              </Text>
            </View>

            <View
              className={`flex-row justify-between py-3 border-b ${
                isDark ? "border-gray-700" : "border-gray-200"
              }`}
            >
              <Text className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
                Tax Deduction (Demo 15%)
              </Text>
              <Text
                className={`${isDark ? "text-red-400" : "text-red-600"} font-medium`}
              >
                -${calculations.taxAmount.toFixed(2)}
              </Text>
            </View>

            <View className="flex-row justify-between py-3">
              <Text
                className={`${isDark ? "text-white" : "text-[#1A1D23]"} font-bold`}
              >
                Net Amount
              </Text>
              <Text
                className={`${
                  isDark ? "text-white" : "text-[#1A1D23]"
                } font-bold text-lg`}
              >
                ${calculations.netAmount.toFixed(2)}
              </Text>
            </View>
          </View>

          <View
            className={`${
              isDark ? "bg-green-900/30" : "bg-green-50"
            } rounded-xl p-4`}
          >
            <View className="flex-row justify-between">
              <Text
                className={`${
                  isDark ? "text-green-200" : "text-green-800"
                } font-medium`}
              >
                Conversion Rate
              </Text>
              <Text
                className={`${
                  isDark ? "text-green-200" : "text-green-800"
                } font-bold`}
              >
                (Varies by leave type)
              </Text>
            </View>
          </View>
        </View>

        {/* Tax Info */}
        <View
          className={`${
            isDark ? "bg-gray-800" : "bg-white"
          } rounded-xl p-5 shadow-md mb-6`}
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text
              className={`${
                isDark ? "text-white" : "text-[#1A1D23]"
              } text-lg font-bold`}
            >
              Tax Information
            </Text>
            <Calculator color={isDark ? "#9CA3AF" : "#6B7280"} size={20} />
          </View>

          <Text className={`${isDark ? "text-gray-300" : "text-gray-600"} mb-4`}>
            The tax deduction is calculated based on your current tax bracket.
            Unused leave days are treated as additional income.
          </Text>

          <Text
            className={`${isDark ? "text-white" : "text-[#1A1D23]"} font-medium mb-3`}
          >
            Your Tax Bracket: 15% (Demo)
          </Text>

          <View
            className={`${isDark ? "bg-gray-700" : "bg-gray-100"} rounded-lg p-4`}
          >
            <Text
              className={`${
                isDark ? "text-gray-300" : "text-gray-600"
              } text-sm mb-2`}
            >
              Current Tax Brackets
            </Text>
            {taxBrackets.map((bracket, index) => (
              <View key={`tax-${index}`} className="flex-row justify-between py-2">
                <Text
                  className={`${isDark ? "text-gray-400" : "text-gray-500"} text-sm`}
                >
                  {'$${bracket.min} - $${bracket.max}'}
                </Text>
                <Text
                  className={`${isDark ? "text-gray-400" : "text-gray-500"} text-sm`}
                >
                  {bracket.rate}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Eligibility */}
        <View
          className={`${
            isDark ? "bg-gray-800" : "bg-white"
          } rounded-xl p-5 shadow-md mb-6`}
        >
          <Text
            className={`${isDark ? "text-white" : "text-[#1A1D23]"} text-lg font-bold mb-4`}
          >
            Eligibility Criteria
          </Text>

          <View className="space-y-3">
            {eligibilityCriteria.map((text, i) => (
              <View key={`criteria-${i}`} className="flex-row items-start mb-3">
                <CheckCircle
                  color={isDark ? "#10B981" : "#059669"}
                  size={20}
                  style={{ marginTop: 2 }}
                />
                <Text
                  className={`${
                    isDark ? "text-gray-300" : "text-gray-600"
                  } ml-3 flex-1`}
                >
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
          } shadow-md`}
          onPress={handleRequestConversion}
          disabled={conversionRequested}
          activeOpacity={0.7} // ✅ Feedback visual
        >
          <Text className="text-white text-center font-bold text-lg">
            {conversionRequested ? "Conversion Requested" : "Request Conversion"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}