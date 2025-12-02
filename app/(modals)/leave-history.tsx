import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { JSX, useMemo, useState } from "react";
import { useUserData } from "@/hooks/useUserData";

interface LeaveItem {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string; // Database status
  displayStatus: string; // UI friendly
  duration: string;
}

export default function LeaveHistoryScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<string>("All"); // Filter based on internal code or UI? Let's use internal code
  const { history, loading } = useUserData();

  const filters = [
    { label: "Semua", value: "All" },
    { label: "Disetujui", value: "approved" },
    { label: "Dalam Proses", value: "pending" },
    { label: "Ditolak", value: "rejected" },
  ];

  const mapStatusToDisplay = (status: string) => {
    switch(status) {
      case 'approved': return "Disetujui";
      case 'rejected': return "Ditolak";
      case 'pending': return "Dalam Proses";
      default: return status;
    }
  };

  // Transform Supabase data to UI format
  const leaveHistory: LeaveItem[] = useMemo(() => {
    return history.map((req) => {
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      return {
        id: req.id,
        // Use the joined name if available, otherwise fallback to generic
        type: req.leave_types?.name || "Cuti",
        startDate: start.toLocaleDateString(),
        endDate: end.toLocaleDateString(),
        status: req.status,
        displayStatus: mapStatusToDisplay(req.status),
        duration: `${days} days`,
      };
    });
  }, [history]);

  const getStatusStyles = useMemo(() => {
    return (status: string) => {
      switch (status) {
        case "approved":
          return {
            bg: "bg-green-500",
            text: "text-white",
          };
        case "rejected":
          return {
            bg: "bg-red-500",
            text: "text-white",
          };
        case "pending":
          return {
            bg: "bg-orange-500",
            text: "text-white",
          };
        default:
          return {
            bg: "bg-gray-500",
            text: "text-white",
          };
      }
    };
  }, []);

  const getStatusIcon = (status: string): JSX.Element => {
    switch (status) {
      case "approved":
        return <CheckCircle color="#10B981" size={20} />;
      case "rejected":
        return <XCircle color="#EF4444" size={20} />;
      case "pending":
        return <Clock color="#F59E0B" size={20} />;
      default:
        return <Calendar color="#6B7280" size={20} />;
    }
  };

  const filteredHistory = leaveHistory.filter((item) => {
    if (activeFilter === "All") return true;
    return item.status === activeFilter;
  });

  return (
    <View className="flex-1">
      <StatusBar barStyle="light-content" />
      <BlurView intensity={50} className="flex-1">
        <View className="flex-1 bg-white/80 dark:bg-gray-900/80">
          <View className="flex-row items-center p-6 pt-12 border-b border-gray-200 dark:border-gray-800">
            <TouchableOpacity onPress={() => router.back()} className="mr-4">
              <ArrowLeft color="#6B7280" size={24} />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              Leave History
            </Text>
          </View>

          {/* Filters */}
          <View className="px-6 py-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row"
              contentContainerStyle={{ paddingRight: 24 }}
            >
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter.value}
                  onPress={() => setActiveFilter(filter.value)}
                  className={`px-6 py-3 rounded-full mr-3 ${
                    activeFilter === filter.value
                      ? "bg-blue-500"
                      : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-medium ${
                      activeFilter === filter.value
                        ? "text-white"
                        : "text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* List */}
          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            {loading ? (
              <View className="py-20">
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : filteredHistory.length === 0 ? (
              <View className="flex-1 justify-center items-center py-20">
                <Calendar color="#9CA3AF" size={48} />
                <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
                  No leave history found
                </Text>
              </View>
            ) : (
              filteredHistory.map((leave) => {
                const statusStyles = getStatusStyles(leave.status);
                
                return (
                  <TouchableOpacity
                    key={leave.id}
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-700"
                    activeOpacity={0.7}
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-900 dark:text-white">
                          {leave.type}
                        </Text>
                        <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {leave.startDate} to {leave.endDate}
                        </Text>
                      </View>

                      <View className={`${statusStyles.bg} px-3 py-1 rounded-full`}>
                        <Text className={`${statusStyles.text} text-xs font-medium`}>
                          {leave.displayStatus}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row items-center pt-3 border-t border-gray-100 dark:border-gray-700">
                      <View className="flex-row items-center flex-1">
                        {getStatusIcon(leave.status)}
                        <Text className="text-gray-600 dark:text-gray-300 ml-2">
                          Duration: {leave.duration}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </BlurView>
    </View>
  );
}
