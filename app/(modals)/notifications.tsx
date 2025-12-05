// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(modals)/notifications.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ V5: Better contrast colors, all warnings fixed
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
  iconType: IconType;
}

// Color definitions for better contrast
const COLORS = {
  success: {
    icon: '#059669',      // green-600
    bgLight: '#D1FAE5',   // green-100
    bgDark: 'rgba(5, 150, 105, 0.2)',
  },
  error: {
    icon: '#DC2626',      // red-600
    bgLight: '#FEE2E2',   // red-100
    bgDark: 'rgba(220, 38, 38, 0.2)',
  },
  pending: {
    icon: '#D97706',      // amber-600
    bgLight: '#FEF3C7',   // amber-100
    bgDark: 'rgba(217, 119, 6, 0.2)',
  },
  info: {
    icon: '#2563EB',      // blue-600
    bgLight: '#DBEAFE',   // blue-100
    bgDark: 'rgba(37, 99, 235, 0.2)',
  },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { session } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Determine icon type based on content
  const getIconType = useCallback((title: string, message: string): IconType => {
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
  }, []);

  // Fetch notifications
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

      const transformed: NotificationItem[] = (data || []).map(notif => ({
        ...notif,
        iconType: getIconType(notif.title, notif.message),
      }));

      setNotifications(transformed);
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, getIconType]);

  // Get icon component
  const getIcon = useCallback((type: IconType) => {
    const color = COLORS[type].icon;
    switch (type) {
      case 'success':
        return <CheckCircle color={color} size={24} />;
      case 'error':
        return <XCircle color={color} size={24} />;
      case 'pending':
        return <Clock color={color} size={24} />;
      default:
        return <AlertCircle color={color} size={24} />;
    }
  }, []);

  // Get background color
  const getIconBgColor = useCallback((type: IconType): string => {
    return isDarkMode ? COLORS[type].bgDark : COLORS[type].bgLight;
  }, [isDarkMode]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${session.user.id}`,
      }, () => {
        fetchNotifications();
      })
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

  // Mark as read
  const markAsRead = useCallback(async (id: string) => {
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
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
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
  }, [session?.user?.id]);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, []);

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
              <Text className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
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
            <TouchableOpacity onPress={markAllAsRead} className="flex-row items-center">
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
            <Text className={`mt-4 text-center ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Tidak ada notifikasi
            </Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              className={`rounded-xl p-4 mb-3 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
              style={
                !notif.is_read
                  ? { borderLeftWidth: 4, borderLeftColor: COLORS[notif.iconType].icon }
                  : undefined
              }
              onPress={() => {
                if (!notif.is_read) markAsRead(notif.id);
              }}
              activeOpacity={0.7}
            >
              <View className="flex-row">
                {/* Icon */}
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-4"
                  style={{ backgroundColor: getIconBgColor(notif.iconType) }}
                >
                  {getIcon(notif.iconType)}
                </View>

                <View className="flex-1">
                  {/* Title & Delete */}
                  <View className="flex-row items-start justify-between mb-1">
                    <Text
                      className={`font-semibold flex-1 mr-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}
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

                  {/* Message */}
                  <Text
                    className={`text-sm mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
                    numberOfLines={3}
                  >
                    {notif.message}
                  </Text>

                  {/* Timestamp */}
                  <Text className={`text-xs ${isDarkMode ? "text-gray-500" : "text-gray-500"}`}>
                    {formatRelativeTime(notif.created_at)}
                  </Text>
                </View>
              </View>

              {/* Unread indicator */}
              {!notif.is_read && (
                <View 
                  className="absolute top-3 right-3 w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[notif.iconType].icon }}
                />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
