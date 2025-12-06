// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(app)/home.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ V9: Recent Events = notifications + activity_logs (approval chain filtered)
//        Max 3 events, with date & time display
// ===========================================================

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { useNotifications, useUserData } from "@/hooks/useUserData";
import { supabase } from "@/lib/supabase";
import {
  formatDateShort,
  getLeaveTypeColor,
  getStatusColor,
  getStatusLabel
} from "@/utils/formatters";
import { useScrollToTop } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertCircle,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  History,
  Plus,
  Repeat,
  TrendingUp,
  XCircle
} from "lucide-react-native";
import { cssInterop } from "nativewind";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

cssInterop(LinearGradient, { className: "style" });

const { width: SCREEN_WIDTH } = Dimensions.get('window');
void SCREEN_WIDTH;
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=900&auto=format&fit=crop&q=60";

// Helper function for greeting
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Selamat Pagi";
  if (hour < 15) return "Selamat Siang";
  if (hour < 18) return "Selamat Sore";
  return "Selamat Malam";
}

// Format date and time for events
function formatEventDateTime(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Event type for Recent Events
type EventType = 'approved' | 'rejected' | 'pending' | 'policy' | 'conversion' | 'info' | 'activity';

interface RecentEvent {
  id: string;
  title: string;
  message: string;
  type: EventType;
  dateTime: string;
  rawDate: Date;
  isRead: boolean;
  source: 'notification' | 'activity_log';
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { onScroll } = useScrollHandler();
  const { session } = useAuth();

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const { employee, history, loading, refetch, getLeaveBalanceUI } = useUserData();
  const { notifications, unreadCount, refetch: refetchNotifications } = useNotifications();
  void notifications;
  
  const [refreshing, setRefreshing] = useState(false);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Get leave balance
  const leaveBalance = useMemo(() => getLeaveBalanceUI(), [getLeaveBalanceUI]);

  // Fetch recent events (notifications + activity_logs filtered by approval chain)
  const fetchRecentEvents = useCallback(async () => {
    if (!session?.user?.id || !employee) return;

    setLoadingEvents(true);
    const events: RecentEvent[] = [];

    try {
      // 1. Get user's manager info for approval chain filtering
      let managerEmail: string | null = null;
      let managerName: string | null = null;
      void managerName;
      
      if (employee.manager_id) {
        const { data: managerData } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', employee.manager_id)
          .single();
        
        if (managerData) {
          managerEmail = managerData.email;
          managerName = managerData.full_name;
        }
      }

      // 2. Fetch notifications for current user
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (notifData) {
        notifData.forEach(notif => {
          let type: EventType = 'info';
          const content = `${notif.title} ${notif.message}`.toLowerCase();
          
          if (content.includes('disetujui') || content.includes('approved') || content.includes('✅')) {
            type = 'approved';
          } else if (content.includes('ditolak') || content.includes('rejected') || content.includes('❌')) {
            type = 'rejected';
          } else if (content.includes('pending') || content.includes('menunggu') || content.includes('proses')) {
            type = 'pending';
          } else if (content.includes('kebijakan') || content.includes('policy') || content.includes('peraturan')) {
            type = 'policy';
          } else if (content.includes('konversi') || content.includes('encashment') || content.includes('tukar')) {
            type = 'conversion';
          }

          events.push({
            id: notif.id,
            title: notif.title,
            message: notif.message,
            type,
            dateTime: formatEventDateTime(notif.created_at),
            rawDate: new Date(notif.created_at),
            isRead: notif.is_read,
            source: 'notification',
          });
        });
      }

      // 3. Fetch activity_logs filtered by approval chain
      // - Activities that mention current user's name (actions done to their requests)
      // - Activities done by their manager (approval actions from manager)
      
      let activityQuery = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      void activityQuery;

      // Build OR filter for activity logs
      const filters: string[] = [];
      
      // Filter: description contains user's name (actions mentioning this user)
      if (employee.full_name) {
        filters.push(`description.ilike.%${employee.full_name}%`);
      }
      
      // Filter: activities done by manager (approval chain - up)
      if (managerEmail) {
        filters.push(`user_email.eq.${managerEmail}`);
      }

      // Filter: activities done by current user (their own actions)
      if (employee.email) {
        filters.push(`user_email.eq.${employee.email}`);
      }

      if (filters.length > 0) {
        const { data: activityData } = await supabase
          .from('activity_logs')
          .select('*')
          .or(filters.join(','))
          .order('created_at', { ascending: false })
          .limit(10);

        if (activityData) {
          activityData.forEach(log => {
            let type: EventType = 'activity';
            const actionType = log.action_type?.toUpperCase() || '';
            
            if (actionType.includes('APPROVE')) {
              type = 'approved';
            } else if (actionType.includes('REJECT')) {
              type = 'rejected';
            } else if (actionType.includes('CREATE')) {
              type = 'pending';
            }

            // Format title from action_type
            let title = 'Aktivitas Sistem';
            if (actionType.includes('APPROVE')) {
              title = 'Pengajuan Diproses';
            } else if (actionType.includes('REJECT')) {
              title = 'Pengajuan Ditolak';
            } else if (actionType.includes('CREATE')) {
              title = 'Pengajuan Baru';
            }

            events.push({
              id: log.id,
              title: title,
              message: log.description || '',
              type,
              dateTime: formatEventDateTime(log.created_at),
              rawDate: new Date(log.created_at),
              isRead: true, // Activity logs are always "read"
              source: 'activity_log',
            });
          });
        }
      }

      // 4. Sort all events by date (newest first) and deduplicate by similar content
      const sortedEvents = events
        .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
        .filter((event, index, self) => {
          // Remove duplicates with very similar content within 1 minute
          return index === self.findIndex(e => 
            Math.abs(e.rawDate.getTime() - event.rawDate.getTime()) < 60000 &&
            e.type === event.type &&
            e.message.substring(0, 30) === event.message.substring(0, 30)
          );
        })
        .slice(0, 3); // Take only top 3

      setRecentEvents(sortedEvents);
    } catch (error) {
      console.error('Error fetching recent events:', error);
    } finally {
      setLoadingEvents(false);
    }
  }, [session?.user?.id, employee]);

  // Fetch events when employee data is available
  useEffect(() => {
    if (employee) {
      fetchRecentEvents();
    }
  }, [employee, fetchRecentEvents]);

  // Get upcoming leaves (pending or approved, in the future)
  const upcomingLeaves = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return history
      .filter(req => {
        const startDate = new Date(req.start_date);
        return startDate >= today && (req.status === 'pending' || req.status === 'approved');
      })
      .slice(0, 3);
  }, [history]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchNotifications(), fetchRecentEvents()]);
    setRefreshing(false);
  }, [refetch, refetchNotifications, fetchRecentEvents]);

  const avatar = employee?.avatar_url || DEFAULT_AVATAR;
  const greeting = getGreeting();

  // Get event icon
  const getEventIcon = (type: EventType) => {
    switch (type) {
      case 'approved':
        return <CheckCircle color="#10B981" size={20} />;
      case 'rejected':
        return <XCircle color="#EF4444" size={20} />;
      case 'pending':
        return <Clock color="#F59E0B" size={20} />;
      case 'policy':
        return <Briefcase color="#8B5CF6" size={20} />;
      case 'conversion':
        return <Repeat color="#3B82F6" size={20} />;
      case 'activity':
        return <History color="#6B7280" size={20} />;
      default:
        return <AlertCircle color="#6B7280" size={20} />;
    }
  };

  // Get event background color
  const getEventBgColor = (type: EventType) => {
    if (isDarkMode) {
      switch (type) {
        case 'approved': return 'rgba(16, 185, 129, 0.15)';
        case 'rejected': return 'rgba(239, 68, 68, 0.15)';
        case 'pending': return 'rgba(245, 158, 11, 0.15)';
        case 'policy': return 'rgba(139, 92, 246, 0.15)';
        case 'conversion': return 'rgba(59, 130, 246, 0.15)';
        case 'activity': return 'rgba(107, 114, 128, 0.15)';
        default: return 'rgba(107, 114, 128, 0.15)';
      }
    } else {
      switch (type) {
        case 'approved': return '#D1FAE5';
        case 'rejected': return '#FEE2E2';
        case 'pending': return '#FEF3C7';
        case 'policy': return '#EDE9FE';
        case 'conversion': return '#DBEAFE';
        case 'activity': return '#F3F4F6';
        default: return '#F3F4F6';
      }
    }
  };

  if (loading && !employee) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View className={`${isDarkMode ? "bg-gray-900" : "bg-gray-100"} flex-1`}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ["#1E3A8A", "#1E40AF"] : ["#3B82F6", "#2563EB"]}
        className="pb-8 rounded-b-3xl"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="px-5">
          {/* Top Row: Avatar + Greeting + Notification */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => router.push("/(app)/profile")}>
                <Image
                  source={{ uri: avatar }}
                  className="w-12 h-12 rounded-full border-2 border-white/30"
                />
              </TouchableOpacity>
              <View className="ml-3">
                <Text className="text-blue-100 text-sm">{greeting} 👋</Text>
                <Text className="text-white text-lg font-bold">
                  {employee?.full_name || "User"}
                </Text>
              </View>
            </View>

            {/* Notification Bell */}
            <TouchableOpacity
              onPress={() => router.push("/(modals)/notifications")}
              className="relative p-2"
            >
              <Bell color="white" size={24} />
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[20px] h-5 items-center justify-center px-1">
                  <Text className="text-white text-xs font-bold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Leave Balance Card */}
          <View className="mt-6 bg-white/15 rounded-2xl p-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-blue-100 text-sm">Sisa Cuti Tahunan</Text>
                <View className="flex-row items-baseline mt-1">
                  <Text className="text-white text-4xl font-bold">
                    {leaveBalance.remaining}
                  </Text>
                  <Text className="text-blue-200 text-lg ml-2">
                    / {leaveBalance.total} hari
                  </Text>
                </View>
              </View>
              <View className="bg-white/20 rounded-full p-3">
                <Calendar color="white" size={28} />
              </View>
            </View>

            {/* Progress Bar */}
            <View className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
              <View
                className="h-full bg-white rounded-full"
                style={{
                  width: `${Math.min(100, (leaveBalance.used / leaveBalance.total) * 100)}%`,
                }}
              />
            </View>
            <View className="flex-row justify-between mt-2">
              <Text className="text-blue-100 text-xs">
                {leaveBalance.used} hari terpakai
              </Text>
              <Text className="text-blue-100 text-xs">
                {leaveBalance.remaining} hari tersisa
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Scrollable Content */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 -mt-4"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDarkMode ? "#fff" : "#3B82F6"}
          />
        }
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Quick Actions */}
        <View className="px-5 mt-6">
          <Text className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
            Aksi Cepat
          </Text>
          
          <View className="flex-row gap-4">
            {/* Pengajuan Cuti */}
            <TouchableOpacity
              className={`flex-1 rounded-2xl p-5 ${isDarkMode ? "bg-gray-800" : "bg-white"} shadow-sm`}
              onPress={() => router.push("/(app)/pengajuan")}
              activeOpacity={0.7}
            >
              <View className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-xl items-center justify-center mb-3">
                <Plus color="#3B82F6" size={24} />
              </View>
              <Text className={`font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                Ajukan Cuti
              </Text>
              <Text className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Buat pengajuan baru
              </Text>
            </TouchableOpacity>

            {/* Konversi Cuti */}
            <TouchableOpacity
              className={`flex-1 rounded-2xl p-5 ${isDarkMode ? "bg-gray-800" : "bg-white"} shadow-sm`}
              onPress={() => router.push("/(app)/konversi")}
              activeOpacity={0.7}
            >
              <View className="bg-green-100 dark:bg-green-900/30 w-12 h-12 rounded-xl items-center justify-center mb-3">
                <Repeat color="#10B981" size={24} />
              </View>
              <Text className={`font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                Konversi Cuti
              </Text>
              <Text className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Tukar jadi uang
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upcoming Leaves */}
        {upcomingLeaves.length > 0 && (
          <View className="px-5 mt-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                Cuti Mendatang
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(modals)/leave-history")}
                className="flex-row items-center"
              >
                <Text className="text-blue-500 text-sm font-medium mr-1">Lihat Semua</Text>
                <ChevronRight color="#3B82F6" size={16} />
              </TouchableOpacity>
            </View>

            {upcomingLeaves.map((leave) => (
              <TouchableOpacity
                key={leave.id}
                className={`rounded-xl p-4 mb-3 ${isDarkMode ? "bg-gray-800" : "bg-white"} shadow-sm`}
                onPress={() => router.push(`/(modals)/reminder-detail?id=${leave.id}`)}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <View
                    className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                    style={{ backgroundColor: getLeaveTypeColor(leave.leave_types?.code || 'CT') + '20' }}
                  >
                    <Calendar color={getLeaveTypeColor(leave.leave_types?.code || 'CT')} size={24} />
                  </View>
                  <View className="flex-1">
                    <Text className={`font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                      {leave.leave_types?.name || "Cuti"}
                    </Text>
                    <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {formatDateShort(leave.start_date)} - {formatDateShort(leave.end_date)}
                    </Text>
                  </View>
                  <View
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: getStatusColor(leave.status).bg + '20' }}
                  >
                    <Text style={{ color: getStatusColor(leave.status).text }} className="text-xs font-medium">
                      {getStatusLabel(leave.status)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Events - Max 3 with Date & Time */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
              Aktivitas Terbaru
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(modals)/notifications")}
              className="flex-row items-center"
            >
              <Text className="text-blue-500 text-sm font-medium mr-1">Semua</Text>
              <ChevronRight color="#3B82F6" size={16} />
            </TouchableOpacity>
          </View>

          <View className={`rounded-2xl overflow-hidden ${isDarkMode ? "bg-gray-800" : "bg-white"} shadow-sm`}>
            {loadingEvents ? (
              <View className="p-6 items-center">
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text className={`mt-2 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Memuat aktivitas...
                </Text>
              </View>
            ) : recentEvents.length === 0 ? (
              <View className="p-6 items-center">
                <Bell color="#9CA3AF" size={40} />
                <Text className={`mt-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Belum ada aktivitas
                </Text>
              </View>
            ) : (
              recentEvents.map((event, index) => (
                <TouchableOpacity
                  key={`${event.source}-${event.id}`}
                  className={`flex-row items-start p-4 ${
                    index < recentEvents.length - 1 
                      ? `border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}` 
                      : ""
                  }`}
                  onPress={() => router.push("/(modals)/notifications")}
                  activeOpacity={0.7}
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3 mt-0.5"
                    style={{ backgroundColor: getEventBgColor(event.type) }}
                  >
                    {getEventIcon(event.type)}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text 
                        className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"} ${!event.isRead ? "font-bold" : ""}`}
                        numberOfLines={1}
                        style={{ flex: 1 }}
                      >
                        {event.title}
                      </Text>
                      {!event.isRead && (
                        <View className="w-2 h-2 rounded-full bg-blue-500 ml-2" />
                      )}
                    </View>
                    <Text 
                      className={`text-sm mt-0.5 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
                      numberOfLines={2}
                    >
                      {event.message}
                    </Text>
                    {/* Date & Time */}
                    <View className="flex-row items-center mt-2">
                      <Clock color={isDarkMode ? "#6B7280" : "#9CA3AF"} size={12} />
                      <Text className={`text-xs ml-1 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
                        {event.dateTime}
                      </Text>
                      {event.source === 'activity_log' && (
                        <View className="ml-2 px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700">
                          <Text className={`text-[10px] ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                            Log
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Statistics Card */}
        <View className="px-5 mt-6">
          <View className={`rounded-2xl p-5 ${isDarkMode ? "bg-gray-800" : "bg-white"} shadow-sm`}>
            <View className="flex-row items-center mb-4">
              <TrendingUp color="#3B82F6" size={20} />
              <Text className={`text-lg font-bold ml-2 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                Ringkasan Tahun Ini
              </Text>
            </View>
            
            <View className="flex-row">
              <View className="flex-1 items-center">
                <Text className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                  {leaveBalance.used}
                </Text>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Hari Terpakai
                </Text>
              </View>
              <View className={`w-px ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`} />
              <View className="flex-1 items-center">
                <Text className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                  {leaveBalance.remaining}
                </Text>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Hari Tersisa
                </Text>
              </View>
              <View className={`w-px ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`} />
              <View className="flex-1 items-center">
                <Text className={`text-3xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                  {history.filter(h => h.status === 'pending').length}
                </Text>
                <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Pending
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
