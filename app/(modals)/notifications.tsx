// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(modals)/notifications.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ FIXED V4: Better contrast colors for readability
// ===========================================================

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Check,
  Trash2,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { formatRelativeTime } from "@/utils/formatters";
import type { Notification } from "@/types/database";

type IconType = 'success' | 'error' | 'pending' | 'info';

interface NotificationItem extends Notification {
  icon: IconType;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { session } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch notifications from Supabase
  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      // Transform notifications with icon type
      const transformed: NotificationItem[] = (data || []).map(notif => ({
        ...notif,
        icon: getIconType(notif.title, notif.message),
      }));

      setNotifications(transformed);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  // Determine icon type based on title/message content
  const getIconType = (title: string, message: string): IconType => {
    const content = `${title} ${message}`.toLowerCase();
    
    if (content.includes('disetujui') || content.includes('approved') || content.includes('✅') || content.includes('berhasil')) {
      return 'success';
    }
    if (content.includes('ditolak') || content.includes('rejected') || content.includes('❌') || content.includes('gagal')) {
      return 'error';
    }
    if (content.includes('pending') || content.includes('menunggu') || content.includes('proses') || content.includes('review')) {
      return 'pending';
    }
    return 'info';
  };

  // ✅ FIX: Get icon component with DARKER colors for better contrast
  const getIcon = (type: IconType) => {
    switch (type) {
      case 'success':
        return <CheckCircle color="#059669" size={24} />; // Darker green
      case 'error':
        return <XCircle color="#DC2626" size={24} />; // Darker red
      case 'pending':
        return <Clock color="#D97706" size={24} />; // Darker orange
      default:
        return <AlertCircle color="#2563EB" size={24} />; // Darker blue
    }
  };

  // ✅ FIX: Get icon background with BETTER contrast
  const getIconBgColor = (type: IconType): string => {
    switch (type) {
      case 'success':
        return isDarkMode ? 'bg-green-900/50' : 'bg-green-100';
      case 'error':
        return isDarkMode ? 'bg-red-900/50' : 'bg-red-100';
      case 'pending':
        return isDarkMode ? 'bg-amber-900/50' : 'bg-amber-100';
      default:
        return isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100';
    }
  };

  // ✅ NEW: Get accent color for unread indicator
  const getAccentColor = (type: IconType): string => {
    switch (type) {
      case 'success':
        return '#059669'; // green-600
      case 'error':
        return '#DC2626'; // red-600
      case 'pending':
        return '#D97706'; // amber-600
      default:
        return '#2563EB'; // blue-600
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Setup realtime subscription
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, fetchNotifications]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  // Mark single notification as read
  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!session?.user?.id) return;

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // Count unread
  const unreadCount = notifications.filter(n => !n.is_read).length;

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
            <View className="flex-row items-center">
              <Text
                className={`text-2xl font-bold ${
                  isDarkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Notifikasi
              </Text>
              {unreadCount > 0 && (
                <View className="bg-red-500 rounded-full px-2 py-0.5 ml-2">
                  <Text className="text-white text-xs font-bold">{unreadCount}</Text>
                </View>
              )}
            </View>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              className="flex-row items-center"
            >
              <Check color="#3B82F6" size={16} />
              <Text className="text-blue-500 text-sm ml-1">Tandai Semua</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 px-4 py-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : notifications.length === 0 ? (
          <View className="py-20 items-center">
            <Bell color="#9CA3AF" size={48} />
            <Text
              className={`mt-4 text-center ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Tidak ada notifikasi
            </Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              className={`rounded-xl p-4 mb-3 ${
                notif.is_read
                  ? isDarkMode
                    ? "bg-gray-800"
                    : "bg-white"
                  : isDarkMode
                  ? "bg-gray-800"
                  : "bg-white"
              }`}
              style={
                !notif.is_read
                  ? { borderLeftWidth: 4, borderLeftColor: getAccentColor(notif.icon) }
                  : undefined
              }
              onPress={() => {
                if (!notif.is_read) markAsRead(notif.id);
              }}
              activeOpacity={0.7}
            >
              <View className="flex-row">
                {/* ✅ FIX: Icon with better background contrast */}
                <View
                  className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${getIconBgColor(notif.icon)}`}
                >
                  {getIcon(notif.icon)}
                </View>

                <View className="flex-1">
                  <View className="flex-row items-start justify-between mb-1">
                    {/* ✅ FIX: Title with proper text color */}
                    <Text
                      className={`font-semibold flex-1 mr-2 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                      numberOfLines={2}
                    >
                      {notif.title}
                    </Text>
                    <TouchableOpacity
                      onPress={() => deleteNotification(notif.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Trash2 color={isDarkMode ? "#6B7280" : "#9CA3AF"} size={16} />
                    </TouchableOpacity>
                  </View>

                  {/* ✅ FIX: Message with better readable color */}
                  <Text
                    className={`text-sm mb-2 ${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                    numberOfLines={3}
                  >
                    {notif.message}
                  </Text>

                  {/* ✅ FIX: Timestamp with visible color */}
                  <Text
                    className={`text-xs ${
                      isDarkMode ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    {formatRelativeTime(notif.created_at)}
                  </Text>
                </View>
              </View>

              {/* Unread badge */}
              {!notif.is_read && (
                <View 
                  className="absolute top-3 right-3 w-3 h-3 rounded-full"
                  style={{ backgroundColor: getAccentColor(notif.icon) }}
                />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
