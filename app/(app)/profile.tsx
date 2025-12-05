// ===========================================================
// 📁 Lokasi: app/(app)/profile.tsx
// 📝 Aksi: REPLACE seluruh file
// ✅ Fitur: Header Konsisten, Posisi Tombol Edit Benar, Fix Error
// ===========================================================

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  StyleSheet,
  Dimensions,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Edit3,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  X,
  ChevronLeft,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { BlurView } from "expo-blur";
import { useTheme } from "@/context/ThemeContext";
import { useUserData } from "@/hooks/useUserData";
import { useAuth } from "@/context/AuthContext";
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { useToast } from "@/context/NotificationToastContext";
import { uploadAvatar, deleteAvatar, getRecentLeaveHistory } from "@/services/profileService";
import { formatDateID, getRoleLabel, formatPhoneDisplay } from "@/utils/formatters";
import EditProfilePhotoModal from "@/components/EditProfilePhotoModal";
import LogoutModal from "@/components/LogoutModal";

// Enable nativewind for LinearGradient
cssInterop(LinearGradient, { className: "style" });

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { session, signOut } = useAuth();
  const { profile, loading: userLoading, refetch } = useUserData();
  const { showSuccess, showError } = useToast();
  
  const { onScroll } = useScrollHandler();

  // State
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  
  // Modal States
  const [showEditPhotoModal, setShowEditPhotoModal] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // 1. Fetch History
  const fetchHistory = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const data = await getRecentLeaveHistory(session.user.id, 3);
      setLeaveHistory(data || []);
    } catch (err) {
      console.error("Failed to fetch history", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // 2. Refresh Handler
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), fetchHistory()]);
    setLocalAvatarUri(null);
    setRefreshing(false);
  };

  // 3. Avatar Handlers
  const handleAvatarChange = async (uri: string) => {
    if (!session?.user?.id) return;
    setLocalAvatarUri(uri);
    try {
      await uploadAvatar(session.user.id, uri);
      await refetch();
      showSuccess("Berhasil", "Foto profil diperbarui");
    } catch (err: any) {
      setLocalAvatarUri(null);
      showError("Gagal", err.message || "Gagal upload");
    }
  };

  const handleDeleteAvatar = async () => {
    if (!session?.user?.id) return;
    try {
      await deleteAvatar(session.user.id);
      setLocalAvatarUri(null);
      await refetch();
      showSuccess("Berhasil", "Foto profil dihapus");
    } catch (err: any) {
      showError("Gagal", err.message);
    }
  };

  // 4. Data Formatting
  const employeeData = useMemo(() => {
    if (!profile) return null;
    
    const joinDateObj = profile.join_date ? new Date(profile.join_date) : new Date();
    const diffTime = Math.abs(new Date().getTime() - joinDateObj.getTime());
    const years = (diffTime / (1000 * 60 * 60 * 24 * 365)).toFixed(1);

    return {
      name: profile.full_name || "User",
      position: getRoleLabel(profile.role),
      department: profile.department || "-",
      employeeId: profile.id ? `EMP-${profile.id.substring(0, 5).toUpperCase()}` : "EMP-00000",
      email: profile.email || "-",
      phone: profile.phone || "-",
      address: profile.address || "-", 
      joinDate: formatDateID(profile.join_date),
      avatar: localAvatarUri || profile.avatar_url,
      yearsOfService: years,
      leaveBalance: profile.leave_balance || 0
    };
  }, [profile, localAvatarUri]);

  if (userLoading && !profile) {
    return (
      <View className={`flex-1 justify-center items-center ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!employeeData) return null;

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}>
      <StatusBar style="light" />
      
      {/* ✅ HEADER BIRU (Konsisten dengan Settings/Konversi) */}
      <LinearGradient
        colors={isDarkMode ? ["#1E3A8A", "#1E40AF"] : ["#3B82F6", "#60A5FA"]}
        className="absolute top-0 left-0 right-0 z-50 rounded-b-3xl px-6 pb-6"
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 24 }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-xl font-bold">Profil Saya</Text>
            <Text className="text-blue-100 text-sm mt-1">Informasi akun Anda</Text>
          </View>
        </View>
      </LinearGradient>

      {/* --- SCROLL CONTENT --- */}
      <ScrollView 
        className="flex-1 px-4"
        // Padding top disesuaikan agar konten muncul tepat di bawah header
        contentContainerStyle={{ paddingTop: insets.top + 100, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDarkMode ? "#fff" : "#3B82F6"} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* --- Profile Card --- */}
        <View className={`rounded-2xl p-6 mb-6 shadow-sm ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          
          <View className="flex-row items-center justify-between mb-6">
            <Text className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
              My Profile
            </Text>
            
            {/* ✅ Tombol Edit Biru DI SINI (Sesuai Request) */}
            <TouchableOpacity
              className="bg-blue-500 rounded-full p-3"
              onPress={() => setShowEditPhotoModal(true)}
            >
              <Edit3 size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View className="items-center mb-6">
            {/* Avatar Image (Klik untuk Zoom) */}
            <TouchableOpacity 
                activeOpacity={0.9}
                onPress={() => employeeData.avatar && setShowZoomModal(true)}
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 5,
                }}
            >
                {employeeData.avatar ? (
                  <Image
                    source={{ uri: employeeData.avatar }}
                    className={`w-32 h-32 rounded-full border-4 ${isDarkMode ? "border-gray-800" : "border-white"}`}
                  />
                ) : (
                  <View className={`w-32 h-32 rounded-full border-4 ${isDarkMode ? "border-gray-800" : "border-white"} bg-gray-200 justify-center items-center`}>
                      <User size={56} color="#9CA3AF" />
                  </View>
                )}
            </TouchableOpacity>
            
            <Text className={`text-2xl font-bold mt-4 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
              {employeeData.name}
            </Text>
            <Text className={`${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              {employeeData.position}
            </Text>
          </View>

          <View className={`flex-row justify-around border-t pt-6 ${isDarkMode ? "border-gray-700" : "border-gray-200"}`}>
            <View className="items-center">
              <Text className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                {employeeData.yearsOfService}
              </Text>
              <Text className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Years
              </Text>
            </View>
            <View className="items-center">
              <Text className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                {employeeData.department}
              </Text>
              <Text className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                Department
              </Text>
            </View>
            <View className="items-center">
              <Text className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                {employeeData.employeeId}
              </Text>
              <Text className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                ID
              </Text>
            </View>
          </View>
        </View>

        {/* --- Personal Information --- */}
        <View className={`rounded-2xl p-6 mb-6 shadow-sm ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <Text className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
            Personal Information
          </Text>

          <View className="space-y-4 gap-4">
            <InfoRow 
                icon={<Mail size={20} color="#3B82F6" />} 
                label="Email" 
                value={employeeData.email} 
                isDarkMode={isDarkMode} 
            />
            <InfoRow 
                icon={<Phone size={20} color="#3B82F6" />} 
                label="Phone" 
                value={formatPhoneDisplay(employeeData.phone)} 
                isDarkMode={isDarkMode} 
            />
            <InfoRow 
                icon={<MapPin size={20} color="#3B82F6" />} 
                label="Address" 
                value={employeeData.address} 
                isDarkMode={isDarkMode} 
            />
            <InfoRow 
                icon={<Calendar size={20} color="#3B82F6" />} 
                label="Join Date" 
                value={employeeData.joinDate} 
                isDarkMode={isDarkMode} 
            />
             <InfoRow 
                icon={<Building size={20} color="#3B82F6" />} 
                label="Department" 
                value={employeeData.department} 
                isDarkMode={isDarkMode} 
            />
          </View>
        </View>

        {/* --- Leave History --- */}
        <View className={`rounded-2xl p-6 shadow-sm ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className={`text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
              Leave History
            </Text>
            <TouchableOpacity onPress={() => router.push("/(modals)/leave-history")}>
              <Text className="text-blue-500 font-medium">View All</Text>
            </TouchableOpacity>
          </View>

          {historyLoading ? (
             <ActivityIndicator color="#3B82F6" />
          ) : leaveHistory.length === 0 ? (
             <Text className={`text-center py-4 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>No leave history available.</Text>
          ) : (
             <View className="space-y-4 gap-4">
                {leaveHistory.map((leave: any) => (
                   <View
                     key={leave.id}
                     className={`flex-row justify-between items-center pb-4 border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}
                   >
                     <View>
                       <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                         {leave.leave_type?.name || "Annual Leave"}
                       </Text>
                       <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                         {formatDateID(leave.start_date)} to {formatDateID(leave.end_date)}
                       </Text>
                     </View>
                     <View>
                        <StatusBadge status={leave.status} />
                     </View>
                   </View>
                ))}
             </View>
          )}
        </View>
      </ScrollView>

      {/* --- MODALS --- */}
      
      <EditProfilePhotoModal
        visible={showEditPhotoModal}
        onClose={() => setShowEditPhotoModal(false)}
        currentAvatar={employeeData.avatar}
        onAvatarChange={handleAvatarChange}
        onDelete={handleDeleteAvatar}
        isDarkMode={isDarkMode}
      />

      <Modal 
        visible={showZoomModal} 
        transparent={true} 
        animationType="fade" 
        onRequestClose={() => setShowZoomModal(false)}
      >
         <BlurView 
            style={StyleSheet.absoluteFill}
            tint={isDarkMode ? "dark" : "light"}
            intensity={25}
            experimentalBlurMethod="dimezisBlurView"
         >
            {/* ✅ FIX: Hapus activeOpacity dari Pressable */}
            <Pressable 
              style={styles.zoomBackdrop} 
              onPress={() => setShowZoomModal(false)}
            >
                {/* Konten Foto (Stop Propagation) */}
                <Pressable 
                    style={styles.zoomContentWrapper}
                    onPress={() => {}} 
                >
                    <View style={styles.zoomImageContainer}>
                       <Image 
                        source={employeeData.avatar ? { uri: employeeData.avatar } : require('@/assets/images/icon.png')} 
                        style={styles.zoomImage} 
                        resizeMode="cover"
                      />
                    </View>
                    
                    <TouchableOpacity 
                      style={[styles.closeZoomBtn, isDarkMode ? { backgroundColor: '#374151' } : { backgroundColor: 'white' }]} 
                      onPress={() => setShowZoomModal(false)}
                    >
                      <X color={isDarkMode ? "white" : "black"} size={24} />
                      <Text style={[styles.closeText, isDarkMode ? { color: 'white' } : { color: 'black' }]}>Close</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
         </BlurView>
      </Modal>
      
      <LogoutModal 
        visible={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        onConfirm={async () => {
            setShowLogoutModal(false);
            await signOut();
        }}
        isDarkMode={isDarkMode}
      />
    </View>
  );
}

// --- Helper Components ---

const InfoRow = ({ icon, label, value, isDarkMode }: any) => (
    <View className="flex-row items-center">
        <View className="mr-3">{icon}</View>
        <View>
            <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                {label}
            </Text>
            <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                {value || "-"}
            </Text>
        </View>
    </View>
);

const StatusBadge = ({ status }: { status: string }) => {
    let bg = "bg-gray-100 dark:bg-gray-700";
    let text = "text-gray-800 dark:text-gray-200";

    const s = status.toLowerCase();

    if (s === 'approved' || s === 'disetujui') {
        bg = "bg-green-100 dark:bg-green-900";
        text = "text-green-800 dark:text-green-200";
    } else if (s === 'pending' || s === 'menunggu') {
        bg = "bg-yellow-100 dark:bg-yellow-900";
        text = "text-yellow-800 dark:text-yellow-200";
    } else if (s === 'rejected' || s === 'ditolak') {
        bg = "bg-red-100 dark:bg-red-900";
        text = "text-red-800 dark:text-red-200";
    }

    return (
        <View className={`px-3 py-1 rounded-full ${bg}`}>
            <Text className={`text-xs font-bold capitalize ${text}`}>{status}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
  zoomBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  zoomContentWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  zoomImageContainer: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
    marginBottom: 20,
  },
  zoomImage: {
    width: '100%',
    height: '100%',
  },
  closeZoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeText: {
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16
  }
});