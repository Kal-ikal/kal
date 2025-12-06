// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(modals)/calendar.tsx
// 📝 Aksi: CREATE NEW FILE
// ✅ Phase 4: Calendar View for leaves
// ===========================================================

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { formatDateID, getStatusColor, getStatusLabel } from "@/utils/formatters";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

interface LeaveEvent {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  leave_types: {
    name: string;
    code: string;
  } | null;
}

interface PublicHoliday {
  id: string;
  name: string;
  date: string;
}

export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { session } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaves, setLeaves] = useState<LeaveEvent[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Get current month info
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch leaves and holidays
  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      // Get first and last day of month for filtering
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startStr = firstDay.toISOString().split("T")[0];
      const endStr = lastDay.toISOString().split("T")[0];

      // Fetch user's leaves
      const { data: leavesData } = await supabase
        .from("leave_requests")
        .select(`
          id,
          start_date,
          end_date,
          status,
          leave_types (name, code)
        `)
        .eq("user_id", session.user.id)
        .or(`start_date.lte.${endStr},end_date.gte.${startStr}`)
        .in("status", ["pending", "approved"]);

      // Normalise `leave_types` — Supabase may return an array for the relationship
      const normalized = (leavesData || []).map((l: any) => ({
        ...l,
        leave_types: Array.isArray(l.leave_types) ? (l.leave_types[0] ?? null) : (l.leave_types ?? null),
      }));

      setLeaves(normalized as LeaveEvent[]);

      // Fetch public holidays
      const { data: holidaysData } = await supabase
        .from("public_holidays")
        .select("*")
        .gte("date", startStr)
        .lte("date", endStr);

      setHolidays(holidaysData || []);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDay = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: (number | null)[] = [];

    // Add empty slots for days before first day
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  }, [year, month]);

  // Check if a date has events
  const getDateEvents = useCallback(
    (day: number) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const date = new Date(dateStr);

      const leaveEvents = leaves.filter((leave) => {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        return date >= start && date <= end;
      });

      const holidayEvents = holidays.filter((h) => h.date === dateStr);

      return { leaveEvents, holidayEvents };
    },
    [leaves, holidays, year, month]
  );

  // Navigate months
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  // Handle date selection
  const handleDatePress = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(selectedDate === dateStr ? null : dateStr);
  };

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return null;
    const day = parseInt(selectedDate.split("-")[2]);
    return getDateEvents(day);
  }, [selectedDate, getDateEvents]);

  // Check if date is today
  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Header */}
      <View
        className={`px-6 pb-4 border-b ${isDarkMode ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft color={isDarkMode ? "#fff" : "#000"} size={24} />
          </TouchableOpacity>
          <Text className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            Kalender Cuti
          </Text>
          <TouchableOpacity onPress={goToToday} className="p-2 -mr-2">
            <CalendarIcon color="#3B82F6" size={24} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Month Navigation */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <TouchableOpacity
            onPress={goToPreviousMonth}
            className={`p-2 rounded-full ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}
          >
            <ChevronLeft color={isDarkMode ? "#fff" : "#000"} size={24} />
          </TouchableOpacity>
          <Text className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            {MONTHS[month]} {year}
          </Text>
          <TouchableOpacity
            onPress={goToNextMonth}
            className={`p-2 rounded-full ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}
          >
            <ChevronRight color={isDarkMode ? "#fff" : "#000"} size={24} />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View className={`mx-4 rounded-2xl overflow-hidden ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          {/* Day Headers */}
          <View className="flex-row">
            {DAYS.map((day, idx) => (
              <View key={day} className="flex-1 py-3 items-center">
                <Text
                  className={`text-sm font-medium ${
                    idx === 0 ? "text-red-500" : isDarkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar Days */}
          {loading ? (
            <View className="py-20 items-center">
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : (
            <View className="flex-row flex-wrap">
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <View key={`empty-${idx}`} className="w-[14.28%] h-14" />;
                }

                const { leaveEvents, holidayEvents } = getDateEvents(day);
                const hasLeave = leaveEvents.length > 0;
                const hasHoliday = holidayEvents.length > 0;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isSelected = selectedDate === dateStr;
                const isSunday = idx % 7 === 0;

                return (
                  <TouchableOpacity
                    key={day}
                    className="w-[14.28%] h-14 items-center justify-center"
                    onPress={() => handleDatePress(day)}
                  >
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center ${
                        isSelected
                          ? "bg-blue-500"
                          : isToday(day)
                          ? isDarkMode
                            ? "bg-gray-600"
                            : "bg-gray-200"
                          : ""
                      }`}
                    >
                      <Text
                        className={`text-base font-medium ${
                          isSelected
                            ? "text-white"
                            : hasHoliday || isSunday
                            ? "text-red-500"
                            : isDarkMode
                            ? "text-white"
                            : "text-gray-800"
                        }`}
                      >
                        {day}
                      </Text>
                    </View>

                    {/* Event Indicators */}
                    {(hasLeave || hasHoliday) && (
                      <View className="flex-row gap-1 mt-0.5">
                        {hasLeave && (
                          <View
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor: getStatusColor(leaveEvents[0].status).text,
                            }}
                          />
                        )}
                        {hasHoliday && <View className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Legend */}
        <View className="flex-row justify-center gap-6 px-6 py-4">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
            <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Disetujui
            </Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
            <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Pending
            </Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full bg-red-500 mr-2" />
            <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Libur
            </Text>
          </View>
        </View>

        {/* Selected Date Details */}
        {selectedDate && selectedDateEvents && (
          <View className="px-4 mt-2">
            <Text className={`text-lg font-bold mb-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {formatDateID(selectedDate)}
            </Text>

            {selectedDateEvents.holidayEvents.length > 0 && (
              <View className="mb-3">
                {selectedDateEvents.holidayEvents.map((holiday) => (
                  <View
                    key={holiday.id}
                    className={`p-4 rounded-xl mb-2 ${isDarkMode ? "bg-red-900/30" : "bg-red-50"}`}
                  >
                    <Text className={`font-medium ${isDarkMode ? "text-red-300" : "text-red-700"}`}>
                      🎉 {holiday.name}
                    </Text>
                    <Text className={`text-sm ${isDarkMode ? "text-red-400" : "text-red-600"}`}>
                      Hari Libur Nasional
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {selectedDateEvents.leaveEvents.length > 0 ? (
              selectedDateEvents.leaveEvents.map((leave) => (
                <TouchableOpacity
                  key={leave.id}
                  className={`p-4 rounded-xl mb-2 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
                  onPress={() => router.push(`/(modals)/notification-detail?id=${leave.id}`)}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: getStatusColor(leave.status).text }}
                      />
                      <View>
                        <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                          {leave.leave_types?.name || "Cuti"}
                        </Text>
                        <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {formatDateID(leave.start_date)} - {formatDateID(leave.end_date)}
                        </Text>
                      </View>
                    </View>
                    <View
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: getStatusColor(leave.status).bg + "20" }}
                    >
                      <Text style={{ color: getStatusColor(leave.status).text }} className="text-xs font-medium">
                        {getStatusLabel(leave.status)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : selectedDateEvents.holidayEvents.length === 0 ? (
              <View className={`p-4 rounded-xl ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
                <Text className={`text-center ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Tidak ada jadwal cuti
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
