import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { X, Bell, Calendar } from "lucide-react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Notification = {
  id: number;
  message: string;
  created_at: string;
  is_read: boolean;
  link_to?: string;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: number) => {
    // Optimistic update
    setNotifications(
      notifications.map((notif) =>
        notif.id === id ? { ...notif, is_read: true } : notif
      )
    );

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) console.error("Error marking read:", error);
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(notifications.map((notif) => ({ ...notif, is_read: true })));
    if (!user) return;

    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id);
    } catch (e) {
      console.error(e);
    }
  };

  const clearAll = async () => {
    setNotifications([]);
    if (!user) return;
    try {
      await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // seconds

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleDateString();
  };

  const getTitle = (message: string) => {
    if (message.toLowerCase().includes("disetujui") || message.toLowerCase().includes("approved")) return "Leave Approved";
    if (message.toLowerCase().includes("ditolak") || message.toLowerCase().includes("rejected")) return "Leave Rejected";
    if (message.toLowerCase().includes("mengajukan")) return "New Request";
    return "Notification";
  };

  return (
    <SafeAreaView className="flex-1 bg-blue-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-6 py-4 bg-white border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">Notifications</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <X color="#6B7280" size={24} />
        </TouchableOpacity>
      </View>

      {/* Controls */}
      <View className="flex-row justify-between items-center px-6 py-3 bg-white">
        <TouchableOpacity onPress={markAllAsRead}>
          <Text className="text-blue-500 font-medium">Mark all as read</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={clearAll}>
          <Text className="text-red-500 font-medium">Clear all</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <ScrollView className="flex-1 px-4 pt-4">
        {loading ? (
           <View className="py-20">
             <ActivityIndicator size="large" color="#3B82F6" />
           </View>
        ) : notifications.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Bell color="#9CA3AF" size={48} />
            <Text className="text-gray-500 mt-4 text-center">
              No notifications yet
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              className={`${
                notification.is_read ? "bg-white" : "bg-blue-100"
              } rounded-xl p-4 mb-3 shadow-sm border border-gray-200`}
              onPress={() => markAsRead(notification.id)}
            >
              <View className="flex-row">
                <View className="p-3 rounded-full bg-blue-100 mr-3">
                  <Calendar color="#3B82F6" size={20} />
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between">
                    <Text className="font-bold text-gray-900">
                      {getTitle(notification.message)}
                    </Text>
                    {!notification.is_read && (
                      <View className="bg-blue-500 w-2 h-2 rounded-full mt-2" />
                    )}
                  </View>
                  <Text className="text-gray-600 mt-1">
                    {notification.message}
                  </Text>
                  <Text className="text-gray-400 text-xs mt-2">
                    {formatTime(notification.created_at)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}