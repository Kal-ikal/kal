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
  CheckCircle,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from '@/lib/supabase';
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { useUserData } from "@/hooks/useUserData";

cssInterop(LinearGradient, { className: "style" });

// ✅ Type definitions
type LeaveBalance = {
  type: string;
  days: number;
  used: number;
  eligible: number;
  rate: number;
};

export default function LeaveConversionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode: isDark } = useTheme();
  const [conversionRequested, setConversionRequested] = useState(false);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const { onScroll } = useScrollHandler();
  const { profile } = useUserData();

  // ✅ Ref untuk ScrollView
  const scrollRef = useRef<ScrollView>(null);

  // ✅ useFocusEffect untuk RESET state dan FETCH data
  useFocusEffect(
    useCallback(() => {
      setConversionRequested(false);
      scrollRef.current?.scrollTo({ y: 0, animated: false }); // Reset scroll position on focus
      fetchLeaveBalances();

      return () => {};
    }, [profile])
  );

  const fetchLeaveBalances = async () => {
    try {
      if (!profile) return;

      // 1. Get Basic Salary from Profile
      const salary = profile.basic_salary || 0;
      // Note: We use dailyRate only for display per item, but the main calculation follows Admin Panel formula
      const dailyRate = Math.floor(salary / 21);

      // 2. Calculate Used Annual Leave from History
      const { data: requests } = await supabase
          .from('leave_requests')
          .select('*, leave_types(name, code)')
          .eq('user_id', profile.id)
          .eq('status', 'approved');

      let annualUsed = 0;

      if (requests) {
        requests.forEach((req: any) => {
            const code = (req.leave_types?.code || '').toUpperCase();
            if (code === 'CT') {
                 const startDate = new Date(req.start_date);
                 const endDate = new Date(req.end_date);
                 const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
                 const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                 annualUsed += days;
            }
        });
      }

      // 3. Determine Eligibility
      const eligible = profile.leave_balance || 0;

      setLeaveBalances([
        { type: "Cuti Tahunan", days: eligible + annualUsed, used: annualUsed, eligible: eligible, rate: dailyRate },
      ]);

    } catch (error) {
      console.error("Error fetching conversion data:", error);
    }
  };

  // ✅ Eligibility criteria - useMemo untuk performa
  const eligibilityCriteria = useMemo(
    () => [
      "Calculation Formula: (Basic Salary / 21) * Days",
      "Only Annual Leave balance can be converted",
      "Request will be reviewed by HR/Admin",
      "Ensure your bank details are up to date",
    ],
    []
  );

  // ✅ Kalkulasi dengan useMemo untuk performa
  const calculations = useMemo(() => {
    const totalEligibleDays = leaveBalances.reduce(
      (sum, leave) => sum + leave.eligible,
      0
    );

    // Formula from Admin Panel: Math.floor((salary / 21) * leaveBalance)
    const salary = profile?.basic_salary || 0;
    // We calculate total amount based on the SUM of eligible days for all types (though usually only one type is eligible)
    // If there were multiple types, this formula applies to the total days.
    const netAmount = Math.floor((salary / 21) * totalEligibleDays);

    return {
      totalEligibleDays,
      netAmount: netAmount,
    };
  }, [leaveBalances, profile]);

  // ✅ Handler dengan useCallback
  const handleRequestConversion = useCallback(async () => {
    if (calculations.totalEligibleDays <= 0) {
        Alert.alert("Not Eligible", "You do not have any eligible days to convert.");
        return;
    }

    Alert.alert(
      "Leave Conversion Request",
      `You are requesting to convert ${calculations.totalEligibleDays} days for a total of IDR ${calculations.netAmount.toLocaleString('id-ID')}. This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
                if (!profile) throw new Error("Not authenticated");

                const { data: typeData } = await supabase
                    .from('leave_types')
                    .select('id')
                    .eq('code', 'CT')
                    .single();

                let typeId = typeData?.id;

                if (!typeId) {
                     const { data: anyType } = await supabase.from('leave_types').select('id').limit(1).single();
                     typeId = anyType?.id;
                }

                const { error } = await supabase.from('leave_requests').insert({
                    user_id: profile.id,
                    leave_type: typeId,
                    start_date: new Date().toISOString(),
                    end_date: new Date().toISOString(),
                    reason: `REQUEST ENCASHMENT: ${calculations.totalEligibleDays} days. Est: IDR ${calculations.netAmount}`,
                    status: 'pending',
                    current_stage: 'hrd',
                });

                if (error) throw error;

                setConversionRequested(true);

                Alert.alert(
                "Request Submitted",
                "Your conversion request has been sent to HR.",
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
  }, [calculations, router, profile]);

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
              Eligible Days
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
                  {leave.type} Balance
                </Text>
                <Text
                  className={`${
                    isDark ? "text-white" : "text-[#1A1D23]"
                  } text-2xl font-bold`}
                >
                  {leave.eligible}
                </Text>
                <Text className="text-gray-500 text-xs mt-1">
                  Rate: IDR {leave.rate.toLocaleString('id-ID')}/day
                </Text>
              </View>
            )) : (
                <Text className="text-gray-500">Loading balances...</Text>
            )}
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
              Estimated Value
            </Text>
            <DollarSign color={isDark ? "#10B981" : "#059669"} size={20} />
          </View>

          <View className="mb-4">
            <View className="flex-row justify-between py-3">
              <Text
                className={`${isDark ? "text-white" : "text-[#1A1D23]"} font-bold`}
              >
                Total Amount
              </Text>
              <Text
                className={`${
                  isDark ? "text-white" : "text-[#1A1D23]"
                } font-bold text-lg`}
              >
                IDR {calculations.netAmount.toLocaleString('id-ID')}
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
                Note
              </Text>
              <Text
                className={`${
                  isDark ? "text-green-200" : "text-green-800"
                } font-bold`}
              >
                Based on basic salary
              </Text>
            </View>
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
            Info
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
            {conversionRequested ? "Request Sent" : "Request Conversion"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
