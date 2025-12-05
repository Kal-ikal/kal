// ===========================================================
// 📁 Lokasi: annualbenefit/app/(app)/settings.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ FIXED: Integrasi service profile & data cuti dinamis
// ===========================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
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
  Calendar,
  Clock,
  Key,
  Smartphone,
  Eye,
  EyeOff,
  X,
  Check,
  Copy,
  ChevronRight,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useUserData, useLeaveTypes } from "@/hooks/useUserData";
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { useToast } from "@/context/NotificationToastContext";
import LogoutModal from "@/components/LogoutModal";
import { useScrollToTop } from "@react-navigation/native";
import {
  changePassword,
  getMFAFactors,
  enrollTOTP,
  verifyTOTP,
  unenrollMFA,
} from "@/services/profileService";
import { formatValue, getLeaveTypeColor } from "@/utils/formatters";
import type { LeaveType } from "@/types/database";

cssInterop(LinearGradient, { className: "style" });
cssInterop(Switch, { className: "style" });

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const { profile } = useUserData();
  const { leaveTypes, loading: typesLoading } = useLeaveTypes();
  const { onScroll } = useScrollHandler();
  const { showSuccess, showError, showInfo } = useToast();

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // Modal States
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // 2FA state
  const [mfaFactors, setMfaFactors] = useState<any[]>([]);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Load MFA factors
  const loadMFAFactors = useCallback(async () => {
    try {
      setMfaLoading(true);
      const data = await getMFAFactors();
      setMfaFactors(data?.totp || []);
    } catch (error) {
      console.log("MFA not available or error:", error);
    } finally {
      setMfaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMFAFactors();
  }, [loadMFAFactors]);

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
      router.replace("/");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Gagal logout");
    }
  };

  // Password change handlers
  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showError("Error", "Semua field harus diisi");
      return;
    }
    if (newPassword.length < 6) {
      showError("Error", "Password baru minimal 6 karakter");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("Error", "Konfirmasi password tidak cocok");
      return;
    }

    try {
      setChangingPassword(true);
      await changePassword(currentPassword, newPassword);
      showSuccess("Berhasil", "Password berhasil diubah");
      setShowPasswordModal(false);
      resetPasswordForm();
    } catch (error: any) {
      showError("Gagal", error.message || "Gagal mengubah password");
    } finally {
      setChangingPassword(false);
    }
  };

  // 2FA handlers
  const handleEnable2FA = async () => {
    try {
      setMfaLoading(true);
      const data = await enrollTOTP();
      setEnrollmentData(data);
    } catch (error: any) {
      showError("Error", error.message || "Gagal mengaktifkan 2FA");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      showError("Error", "Masukkan kode 6 digit");
      return;
    }
    try {
      setVerifying(true);
      await verifyTOTP(enrollmentData.id, verificationCode);
      showSuccess("Berhasil", "2FA berhasil diaktifkan");
      setEnrollmentData(null);
      setVerificationCode("");
      await loadMFAFactors();
    } catch (error: any) {
      showError("Gagal", "Kode verifikasi salah atau kadaluarsa");
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable2FA = async (factorId: string) => {
    Alert.alert(
      "Nonaktifkan 2FA",
      "Apakah Anda yakin ingin menonaktifkan autentikasi dua faktor?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Nonaktifkan",
          style: "destructive",
          onPress: async () => {
            try {
              setMfaLoading(true);
              await unenrollMFA(factorId);
              showSuccess("Berhasil", "2FA dinonaktifkan");
              await loadMFAFactors();
            } catch (error: any) {
              showError("Gagal", error.message || "Gagal menonaktifkan 2FA");
            } finally {
              setMfaLoading(false);
            }
          },
        },
      ]
    );
  };

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    showInfo("Disalin", "Secret key disalin ke clipboard");
  };

  const has2FA = mfaFactors.length > 0;

  return (
    <View className={`${isDarkMode ? "bg-gray-900" : "bg-[#F7F7F7]"} flex-1`}>
      <StatusBar style="light" />

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
            <Text className="text-white text-xl font-bold">Pengaturan</Text>
            <Text className="text-blue-100 text-sm mt-1">Kelola preferensi akun</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        ref={scrollRef}
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
                Akun
              </Text>
            </View>
            <SettingRow label="Nama" value={profile?.full_name || "-"} isDarkMode={isDarkMode} />
            <SettingRow label="Email" value={profile?.email || "-"} isDarkMode={isDarkMode} />
            <SettingRow label="Departemen" value={profile?.department || "-"} isDarkMode={isDarkMode} />
            <SettingRow label="ID Karyawan" value={profile?.id ? profile.id.substring(0, 8).toUpperCase() : "-"} isDarkMode={isDarkMode} isLast />
          </View>

          {/* Appearance */}
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
            <View className="flex-row items-center mb-4">
              <Sun color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold ml-2`}>
                Tampilan
              </Text>
            </View>
            <View className="flex-row justify-between items-center py-3">
              <View className="flex-row items-center">
                {isDarkMode ? <Moon color="#9CA3AF" size={20} /> : <Sun color="#6B7280" size={20} />}
                <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium ml-3`}>
                  {isDarkMode ? "Mode Gelap" : "Mode Terang"}
                </Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                thumbColor="#3B82F6"
              />
            </View>
          </View>

          {/* Notifications */}
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
            <View className="flex-row items-center mb-4">
              <Bell color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold ml-2`}>
                Notifikasi
              </Text>
            </View>
            {(["email", "push", "sms"] as const).map((type, i) => (
              <View key={type} className={`flex-row justify-between items-center py-3 ${i !== 2 ? "border-b border-gray-100 dark:border-gray-700" : ""}`}>
                <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>
                  Notifikasi {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
                <Switch
                  value={notifications[type]}
                  onValueChange={() => toggleNotification(type)}
                  trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
                  thumbColor="#3B82F6"
                />
              </View>
            ))}
          </View>

          {/* Security */}
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
            <View className="flex-row items-center mb-4">
              <Shield color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold ml-2`}>
                Keamanan
              </Text>
            </View>
            <TouchableOpacity className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700" onPress={() => setShowPasswordModal(true)}>
              <View className="flex-row items-center">
                <Key color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
                <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium ml-3`}>Ubah Password</Text>
              </View>
              <ChevronRight color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between py-3" onPress={() => setShow2FAModal(true)}>
              <View className="flex-row items-center">
                <Smartphone color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
                <View className="ml-3">
                  <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>Autentikasi Dua Faktor</Text>
                  <Text className={`text-sm ${has2FA ? "text-green-500" : "text-gray-500"}`}>{mfaLoading ? "Memuat..." : has2FA ? "Aktif" : "Tidak aktif"}</Text>
                </View>
              </View>
              <ChevronRight color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
            </TouchableOpacity>
          </View>

          {/* Leave Policy (Dynamic) */}
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-xl p-5 shadow-md mb-6`}>
            <View className="flex-row items-center mb-4">
              <FileText color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} text-lg font-bold ml-2`}>
                Kebijakan Cuti
              </Text>
            </View>
            {typesLoading ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : leaveTypes.length === 0 ? (
              <Text className={`text-center py-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Tidak ada data kebijakan cuti</Text>
            ) : (
              leaveTypes.map((policy, index) => (
                <LeaveTypeItem
                  key={policy.id}
                  leaveType={policy}
                  isLast={index === leaveTypes.length - 1}
                  isDarkMode={isDarkMode}
                />
              ))
            )}
          </View>

          {/* Logout */}
          <TouchableOpacity className={`rounded-xl p-4 mb-6 flex-row justify-center items-center ${isDarkMode ? "bg-red-700" : "bg-red-500"} shadow-md`} onPress={handleLogout}>
            <LogOut color="white" size={20} />
            <Text className="text-white text-center font-bold text-lg ml-2">Keluar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODALS */}
      
      {/* Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide" onRequestClose={() => setShowPasswordModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-t-3xl p-6`} style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Ubah Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}><X color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={24} /></TouchableOpacity>
            </View>
            
            <PasswordInput label="Password Saat Ini" value={currentPassword} setValue={setCurrentPassword} show={showCurrentPassword} setShow={setShowCurrentPassword} isDarkMode={isDarkMode} />
            <PasswordInput label="Password Baru" value={newPassword} setValue={setNewPassword} show={showNewPassword} setShow={setShowNewPassword} isDarkMode={isDarkMode} />
            <PasswordInput label="Konfirmasi Password" value={confirmPassword} setValue={setConfirmPassword} show={showConfirmPassword} setShow={setShowConfirmPassword} isDarkMode={isDarkMode} />

            <TouchableOpacity onPress={handleChangePassword} disabled={changingPassword} className={`py-4 rounded-xl items-center mt-4 ${changingPassword ? "bg-gray-400" : "bg-blue-500"}`}>
              {changingPassword ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Simpan Password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2FA Modal */}
      <Modal visible={show2FAModal} transparent animationType="slide" onRequestClose={() => setShow2FAModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-t-3xl p-6`} style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="flex-row justify-between items-center mb-6">
               <Text className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>2-Factor Auth</Text>
               <TouchableOpacity onPress={() => setShow2FAModal(false)}><X color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={24} /></TouchableOpacity>
            </View>

            {mfaLoading ? (
               <ActivityIndicator size="large" color="#3B82F6" className="py-8" />
            ) : has2FA && !enrollmentData ? (
               <View>
                 <View className={`p-4 rounded-xl mb-4 ${isDarkMode ? "bg-green-900/30" : "bg-green-50"}`}>
                   <View className="flex-row items-center">
                     <Check color="#10B981" size={24} />
                     <Text className="text-green-600 dark:text-green-400 font-medium ml-3">2FA Aktif</Text>
                   </View>
                 </View>
                 <TouchableOpacity onPress={() => handleDisable2FA(mfaFactors[0]?.id)} className="py-4 rounded-xl items-center bg-red-500">
                   <Text className="text-white font-bold text-lg">Nonaktifkan</Text>
                 </TouchableOpacity>
               </View>
            ) : enrollmentData ? (
               <ScrollView>
                  <Text className={`mb-4 text-center ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Scan QR ini di aplikasi Authenticator:</Text>
                  {enrollmentData.totp.qr_code && (
                     <View className="items-center mb-4 bg-white p-2 rounded-xl self-center">
                        <Image source={{ uri: enrollmentData.totp.qr_code }} style={{ width: 180, height: 180 }} resizeMode="contain" />
                     </View>
                  )}
                  <View className={`p-3 rounded-xl mb-4 flex-row justify-between items-center ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                     <Text className={`font-mono ${isDarkMode ? "text-white" : "text-gray-900"}`}>{enrollmentData.totp.secret}</Text>
                     <TouchableOpacity onPress={() => copyToClipboard(enrollmentData.totp.secret)}><Copy color="#3B82F6" size={20} /></TouchableOpacity>
                  </View>
                  <TextInput value={verificationCode} onChangeText={setVerificationCode} placeholder="Kode 6 digit" placeholderTextColor="#9CA3AF" keyboardType="number-pad" maxLength={6} className={`p-4 rounded-xl text-center text-2xl font-bold mb-4 ${isDarkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"}`} />
                  <TouchableOpacity onPress={handleVerify2FA} disabled={verifying} className="py-4 rounded-xl items-center bg-blue-500">
                     {verifying ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Verifikasi</Text>}
                  </TouchableOpacity>
               </ScrollView>
            ) : (
               <View>
                  <Text className={`mb-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Tingkatkan keamanan akun dengan 2FA.</Text>
                  <TouchableOpacity onPress={handleEnable2FA} className="py-4 rounded-xl items-center bg-blue-500">
                     <Text className="text-white font-bold text-lg">Aktifkan Sekarang</Text>
                  </TouchableOpacity>
               </View>
            )}
          </View>
        </View>
      </Modal>

      <LogoutModal visible={showLogoutModal} onClose={() => setShowLogoutModal(false)} onConfirm={onConfirmLogout} isDarkMode={isDarkMode} />
    </View>
  );
}

// Helper Components

function SettingRow({ label, value, isDarkMode, isLast }: any) {
  return (
    <View className={`mb-4 ${!isLast ? "" : ""}`}>
      <Text className={`${isDarkMode ? "text-gray-400" : "text-gray-500"} text-sm mb-1`}>{label}</Text>
      <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>{formatValue(value)}</Text>
    </View>
  );
}

function LeaveTypeItem({ leaveType, isLast, isDarkMode }: { leaveType: LeaveType, isLast: boolean, isDarkMode: boolean }) {
  const badgeColor = getLeaveTypeColor(leaveType.code);
  return (
    <View className={`py-3 ${!isLast ? "border-b border-gray-100 dark:border-gray-700" : ""}`}>
      <View className="flex-row items-center mb-2">
        <View className="px-2 py-0.5 rounded mr-2" style={{ backgroundColor: badgeColor }}>
          <Text className="text-white text-xs font-bold">{leaveType.code}</Text>
        </View>
        <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium flex-1`}>{leaveType.name}</Text>
      </View>
      <View className="ml-1">
         <View className="flex-row items-center mb-1">
             <Calendar color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={14} style={{ marginRight: 8 }} />
             <Text className={`${isDarkMode ? "text-gray-400" : "text-gray-500"} text-sm`}>
                {leaveType.max_days ? `${leaveType.max_days} hari/tahun` : "Tidak terbatas"}
             </Text>
         </View>
         <View className="flex-row items-center">
             <Clock color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={14} style={{ marginRight: 8 }} />
             <Text className={`${isDarkMode ? "text-gray-400" : "text-gray-500"} text-sm`}>
                {leaveType.is_quota_deduction ? "Potong Saldo Utama" : "Tidak Potong Saldo"}
             </Text>
         </View>
      </View>
    </View>
  );
}

function PasswordInput({ label, value, setValue, show, setShow, isDarkMode }: any) {
  return (
    <View className="mb-4">
      <Text className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>{label}</Text>
      <View className={`flex-row items-center rounded-xl px-4 ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
        <TextInput value={value} onChangeText={setValue} secureTextEntry={!show} placeholder={label} placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"} className={`flex-1 py-3 ${isDarkMode ? "text-white" : "text-gray-900"}`} />
        <TouchableOpacity onPress={() => setShow(!show)}>
           {show ? <EyeOff color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} /> : <Eye color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}