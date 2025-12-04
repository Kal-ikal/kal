import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Bell,
  User,
  Shield,
  FileText,
  Sun,
  Moon,
  LogOut,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useUserData } from '@/hooks/useUserData';
import { useScrollHandler } from "@/hooks/useScrollHandler";
import LogoutModal from '@/components/LogoutModal';

cssInterop(LinearGradient, { className: "style" });
cssInterop(Switch, { className: false });

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const { profile } = useUserData(); // Changed from employee to profile
  const { onScroll } = useScrollHandler();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });

  // Data is now fetched via useUserData, but fallback to placeholders if loading/null
  const userData = {
    name: profile?.full_name || "User",
    email: profile?.email || "email@example.com",
    phone: "Not Provided", // Not in UserProfile type currently
    department: profile?.department || "General",
    employeeId: profile?.id || "N/A",
    joinDate: profile?.join_date || "N/A",
  };

  const leavePolicy = [
    { type: "Annual Leave", days: 15, carryOver: 5, maxConsecutive: 10 },
    { type: "Sick Leave", days: 10, carryOver: 0, maxConsecutive: 5 },
    { type: "Special Leave", days: 5, carryOver: 0, maxConsecutive: 3 },
    { type: "Maternity Leave", days: 90, carryOver: 0, maxConsecutive: 90 },
    { type: "Paternity Leave", days: 10, carryOver: 0, maxConsecutive: 10 },
  ];

  const handleToggleTheme = () => {
    toggleTheme();
  };

  const toggleNotification = (type: "email" | "push" | "sms") => {
    setNotifications((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const onConfirmLogout = async () => {
    try {
      setShowLogoutModal(false);
      await signOut();
      // AuthGuard will handle redirection
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to logout");
    }
  };

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
            <Text className="text-white text-xl font-bold">Settings</Text>
            <Text className="text-blue-100 text-sm mt-1">
              Manage your preferences
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View className="px-4 mt-6">
          
          {/* Account */}
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
            <View className="flex-row items-center mb-4">
              <User color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold ml-2`}>
                Account
              </Text>
            </View>
            <View className="mb-4">
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-1`}>
                Name
              </Text>
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                {userData.name}
              </Text>
            </View>
            <View className="mb-4">
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-1`}>
                Email
              </Text>
              <View className="flex-row items-center">
                <Mail color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={16} style={{ marginRight: 8 }} />
                <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                  {userData.email}
                </Text>
              </View>
            </View>
            <View className="mb-4">
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-1`}>
                Department
              </Text>
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                {userData.department}
              </Text>
            </View>
            <View>
              <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"} text-sm mb-1`}>
                Employee ID (UUID)
              </Text>
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium text-xs`}>
                {userData.employeeId}
              </Text>
            </View>
          </View>

          {/* Appearance */}
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
            <View className="flex-row items-center mb-4">
              <Sun color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold ml-2`}>
                Appearance
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-3">
              <View className="flex-row items-center">
                {isDarkMode ? (
                  <Moon color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
                ) : (
                  <Sun color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
                )}
                <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium ml-3`}>
                  {isDarkMode ? "Dark Mode" : "Light Mode"}
                </Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={handleToggleTheme}
                  trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                  thumbColor={isDarkMode ? "#3B82F6" : "#3B82F6"}
              />
            </View>
          </View>

          {/* Notifications */}
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
            <View className="flex-row items-center mb-4">
              <Bell color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold ml-2`}>
                Notifications
              </Text>
            </View>
            {(["email", "push", "sms"] as const).map((type, i) => (
              <View
                key={type}
                className={`flex-row justify-between items-center py-3 ${
                  i !== 2 ? "border-b" : ""
                }`}
                style={{ borderColor: isDarkMode ? "#374151" : "#E5E7EB" }}
              >
                <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                  {type.charAt(0).toUpperCase() + type.slice(1)} Notifications
                </Text>
                <Switch
                  value={notifications[type]}
                  onValueChange={() => toggleNotification(type)}
                  trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                  thumbColor={isDarkMode ? "#3B82F6" : "#3B82F6"}
                />
              </View>
            ))}
          </View>

          {/* Leave Policy */}
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
            <View className="flex-row items-center mb-4">
              <FileText color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold ml-2`}>
                Leave Policy
              </Text>
            </View>
            {leavePolicy.map((policy, index) => (
              <View
                key={index}
                className={`py-3 ${
                  index !== leavePolicy.length - 1 ? "border-b" : ""
                }`}
                style={{ borderColor: isDarkMode ? "#374151" : "#E5E7EB" }}
              >
                <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium mb-1`}>
                  {policy.type}
                </Text>
                <View className="flex-row">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1">
                      <Calendar color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={14} style={{ marginRight: 8 }} />
                      <Text className={`${isDarkMode ? "text-gray-400" : "text-gray-500"} text-sm`}>
                        {policy.days} days/year
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Clock color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={14} style={{ marginRight: 8 }} />
                      <Text className={`${isDarkMode ? "text-gray-400" : "text-gray-500"} text-sm`}>
                        Max {policy.maxConsecutive} consecutive days
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <MapPin color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={14} style={{ marginRight: 8 }} />
                    <Text className={`${isDarkMode ? "text-gray-400" : "text-gray-500"} text-sm`}>
                      Carry over: {policy.carryOver} days
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Security */}
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
            <View className="flex-row items-center mb-4">
              <Shield color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold ml-2`}>
                Security
              </Text>
            </View>
            <TouchableOpacity className="py-3">
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                Change Password
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="py-3 border-t" style={{ borderColor: isDarkMode ? "#374151" : "#E5E7EB" }}>
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                Two-Factor Authentication
              </Text>
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity
            className={`rounded-xl p-4 mb-6 flex-row justify-center items-center ${
              isDarkMode ? "bg-red-700" : "bg-red-500"
            } shadow-md`}
            onPress={handleLogout}
          >
            <LogOut color="white" size={20} style={{ marginRight: 8 }} />
            <Text className="text-white text-center font-bold text-lg">
              Logout
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={onConfirmLogout}
        isDarkMode={isDarkMode}
      />
    </View>
  );
}
