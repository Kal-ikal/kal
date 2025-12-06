/* eslint-disable @typescript-eslint/no-unused-vars */
// ===========================================================
// 📁 Lokasi: annualbenefit/app/(app)/settings.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ V10: Fixed 2FA QR Code using react-native-qrcode-svg
//         Fixed scroll behavior
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
} from "react-native";
import { useRouter } from "expo-router";
import {
  Bell,
  User,
  Shield,
  FileText,
  Sun,
  Moon,
  LogOut,
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
import QRCode from "react-native-qrcode-svg";
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
import {
  formatDateID,
  getRoleLabel,
  getLeaveTypeColor,
} from "@/utils/formatters";
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
      // Filter only verified factors
      const verifiedFactors = (data?.totp || []).filter((f: any) => f.status === 'verified');
      setMfaFactors(verifiedFactors);
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

  const handleCancel2FAEnrollment = () => {
    setEnrollmentData(null);
    setVerificationCode("");
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
        colors={isDarkMode ? ["#1E3A8A", "#1E40AF"] : ["#3B82F6", "#2563EB"]}
        className="pb-6 rounded-b-3xl"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="px-6">
          <Text className="text-white text-2xl font-bold">Pengaturan</Text>
          <Text className="text-blue-100 mt-1">Kelola akun dan preferensi</Text>
        </View>
      </LinearGradient>

      <ScrollView
        ref={scrollRef}
        className="flex-1 px-5 -mt-2"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Profile Section */}
        <View className={`mt-4 rounded-2xl p-5 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <View className="flex-row items-center mb-4">
            <User color="#3B82F6" size={20} />
            <Text className={`text-lg font-bold ml-2 ${isDarkMode ? "text-white" : "text-[#1A1D23]"}`}>
              Informasi Akun
            </Text>
          </View>

          <SettingRow label="Nama" value={profile?.full_name} isDarkMode={isDarkMode} />
          <SettingRow label="Email" value={profile?.email} isDarkMode={isDarkMode} />
          <SettingRow label="Departemen" value={profile?.department} isDarkMode={isDarkMode} />
          <SettingRow label="Role" value={getRoleLabel(profile?.role || "")} isDarkMode={isDarkMode} />
          <SettingRow 
            label="Bergabung" 
            value={profile?.join_date ? formatDateID(profile.join_date) : "-"} 
            isDarkMode={isDarkMode} 
            isLast 
          />
        </View>

        {/* Security Section */}
        <View className={`mt-4 rounded-2xl p-5 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <View className="flex-row items-center mb-4">
            <Shield color="#3B82F6" size={20} />
            <Text className={`text-lg font-bold ml-2 ${isDarkMode ? "text-white" : "text-[#1A1D23]"}`}>
              Keamanan
            </Text>
          </View>

          {/* Change Password */}
          <TouchableOpacity
            className={`flex-row items-center justify-between py-3 border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}
            onPress={() => setShowPasswordModal(true)}
          >
            <View className="flex-row items-center">
              <Key color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={18} />
              <Text className={`ml-3 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                Ubah Password
              </Text>
            </View>
            <ChevronRight color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={18} />
          </TouchableOpacity>

          {/* 2FA */}
          <TouchableOpacity
            className="flex-row items-center justify-between py-3"
            onPress={() => setShow2FAModal(true)}
          >
            <View className="flex-row items-center">
              <Smartphone color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={18} />
              <Text className={`ml-3 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                Autentikasi 2 Faktor
              </Text>
            </View>
            <View className="flex-row items-center">
              {has2FA && (
                <View className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 mr-2">
                  <Text className="text-green-600 dark:text-green-400 text-xs font-medium">Aktif</Text>
                </View>
              )}
              <ChevronRight color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={18} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View className={`mt-4 rounded-2xl p-5 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <View className="flex-row items-center mb-4">
            <Bell color="#3B82F6" size={20} />
            <Text className={`text-lg font-bold ml-2 ${isDarkMode ? "text-white" : "text-[#1A1D23]"}`}>
              Notifikasi
            </Text>
          </View>

          <NotificationToggle
            label="Email"
            value={notifications.email}
            onToggle={() => toggleNotification("email")}
            isDarkMode={isDarkMode}
          />
          <NotificationToggle
            label="Push Notification"
            value={notifications.push}
            onToggle={() => toggleNotification("push")}
            isDarkMode={isDarkMode}
          />
          <NotificationToggle
            label="SMS"
            value={notifications.sms}
            onToggle={() => toggleNotification("sms")}
            isDarkMode={isDarkMode}
            isLast
          />
        </View>

        {/* Appearance Section */}
        <View className={`mt-4 rounded-2xl p-5 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <View className="flex-row items-center mb-4">
            {isDarkMode ? <Moon color="#3B82F6" size={20} /> : <Sun color="#3B82F6" size={20} />}
            <Text className={`text-lg font-bold ml-2 ${isDarkMode ? "text-white" : "text-[#1A1D23]"}`}>
              Tampilan
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className={isDarkMode ? "text-gray-300" : "text-gray-700"}>
              Mode Gelap
            </Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
              thumbColor={isDarkMode ? "#fff" : "#fff"}
            />
          </View>
        </View>

        {/* Leave Types Section */}
        <View className={`mt-4 rounded-2xl p-5 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
          <View className="flex-row items-center mb-4">
            <FileText color="#3B82F6" size={20} />
            <Text className={`text-lg font-bold ml-2 ${isDarkMode ? "text-white" : "text-[#1A1D23]"}`}>
              Jenis Cuti
            </Text>
          </View>

          {typesLoading ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            leaveTypes.map((lt, idx) => (
              <LeaveTypeItem
                key={lt.id}
                leaveType={lt}
                isLast={idx === leaveTypes.length - 1}
                isDarkMode={isDarkMode}
              />
            ))
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          className="mt-4 mb-8 rounded-2xl py-4 bg-red-500 items-center flex-row justify-center"
          onPress={handleLogout}
        >
          <LogOut color="white" size={20} />
          <Text className="text-white font-bold ml-2">Keluar dari Akun</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide" onRequestClose={() => setShowPasswordModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-t-3xl p-6`} style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Ubah Password</Text>
              <TouchableOpacity onPress={() => { setShowPasswordModal(false); resetPasswordForm(); }}>
                <X color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={24} />
              </TouchableOpacity>
            </View>

            {/* Current Password */}
            <View className="mb-4">
              <Text className={`mb-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Password Saat Ini</Text>
              <View className={`flex-row items-center px-4 rounded-xl ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                <TextInput
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  placeholder="Masukkan password saat ini"
                  placeholderTextColor="#9CA3AF"
                  className={`flex-1 py-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}
                />
                <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                  {showCurrentPassword ? <EyeOff color="#9CA3AF" size={20} /> : <Eye color="#9CA3AF" size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password */}
            <View className="mb-4">
              <Text className={`mb-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Password Baru</Text>
              <View className={`flex-row items-center px-4 rounded-xl ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  placeholder="Minimal 6 karakter"
                  placeholderTextColor="#9CA3AF"
                  className={`flex-1 py-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                  {showNewPassword ? <EyeOff color="#9CA3AF" size={20} /> : <Eye color="#9CA3AF" size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View className="mb-6">
              <Text className={`mb-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Konfirmasi Password</Text>
              <View className={`flex-row items-center px-4 rounded-xl ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Ulangi password baru"
                  placeholderTextColor="#9CA3AF"
                  className={`flex-1 py-3 ${isDarkMode ? "text-white" : "text-gray-900"}`}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff color="#9CA3AF" size={20} /> : <Eye color="#9CA3AF" size={20} />}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={changingPassword}
              className={`py-4 rounded-xl items-center ${changingPassword ? "bg-gray-400" : "bg-blue-500"}`}
            >
              {changingPassword ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Simpan Password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2FA Modal - ✅ FIXED: Use react-native-qrcode-svg */}
      <Modal visible={show2FAModal} transparent animationType="slide" onRequestClose={() => setShow2FAModal(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-t-3xl p-6`} style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>2-Factor Auth</Text>
              <TouchableOpacity onPress={() => { setShow2FAModal(false); handleCancel2FAEnrollment(); }}>
                <X color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={24} />
              </TouchableOpacity>
            </View>

            {mfaLoading ? (
              <ActivityIndicator size="large" color="#3B82F6" className="py-8" />
            ) : has2FA && !enrollmentData ? (
              // 2FA is active
              <View>
                <View className={`p-4 rounded-xl mb-4 ${isDarkMode ? "bg-green-900/30" : "bg-green-50"}`}>
                  <View className="flex-row items-center">
                    <Check color="#10B981" size={24} />
                    <Text className="text-green-600 dark:text-green-400 font-medium ml-3">2FA Aktif</Text>
                  </View>
                  <Text className={`mt-2 text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                    Akun Anda dilindungi dengan autentikasi 2 faktor.
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => handleDisable2FA(mfaFactors[0]?.id)} 
                  className="py-4 rounded-xl items-center bg-red-500"
                >
                  <Text className="text-white font-bold text-lg">Nonaktifkan 2FA</Text>
                </TouchableOpacity>
              </View>
            ) : enrollmentData ? (
              // Enrollment in progress - show QR code
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className={`mb-4 text-center ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Scan QR code ini dengan aplikasi Authenticator (Google Authenticator, Authy, dll):
                </Text>
                
                {/* ✅ FIXED: QR Code using react-native-qrcode-svg */}
                {enrollmentData.totp?.uri && (
                  <View className="items-center mb-4 bg-white p-4 rounded-xl self-center">
                    <QRCode
                      value={enrollmentData.totp.uri}
                      size={180}
                      backgroundColor="white"
                      color="black"
                    />
                  </View>
                )}

                {/* Secret Key (manual entry) */}
                <Text className={`text-sm text-center mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Atau masukkan kode ini secara manual:
                </Text>
                <View className={`p-3 rounded-xl mb-4 flex-row justify-between items-center ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                  <Text 
                    className={`font-mono text-sm flex-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}
                    selectable
                  >
                    {enrollmentData.totp?.secret}
                  </Text>
                  <TouchableOpacity onPress={() => copyToClipboard(enrollmentData.totp?.secret || "")}>
                    <Copy color="#3B82F6" size={20} />
                  </TouchableOpacity>
                </View>

                {/* Verification Code Input */}
                <Text className={`mb-2 font-medium ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Masukkan kode dari Authenticator:
                </Text>
                <TextInput
                  value={verificationCode}
                  onChangeText={(text) => setVerificationCode(text.replace(/\D/g, ""))}
                  placeholder="000000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={6}
                  className={`p-4 rounded-xl text-center text-2xl font-bold tracking-widest mb-4 ${isDarkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"}`}
                />
                
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={handleCancel2FAEnrollment}
                    className={`flex-1 py-4 rounded-xl items-center ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}
                  >
                    <Text className={`font-bold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>Batal</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={handleVerify2FA}
                    disabled={verifying || verificationCode.length !== 6}
                    className={`flex-1 py-4 rounded-xl items-center ${
                      verifying || verificationCode.length !== 6 ? "bg-gray-400" : "bg-blue-500"
                    }`}
                  >
                    {verifying ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-bold">Verifikasi</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              // 2FA not active - show enable option
              <View>
                <Text className={`mb-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Tingkatkan keamanan akun Anda dengan autentikasi 2 faktor. Setiap login akan memerlukan kode dari aplikasi Authenticator.
                </Text>
                <TouchableOpacity 
                  onPress={handleEnable2FA} 
                  className="py-4 rounded-xl items-center bg-blue-500"
                >
                  <Text className="text-white font-bold text-lg">Aktifkan 2FA</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <LogoutModal 
        visible={showLogoutModal} 
        onClose={() => setShowLogoutModal(false)} 
        onConfirm={onConfirmLogout} 
        isDarkMode={isDarkMode} 
      />
    </View>
  );
}

// Helper Components

function SettingRow({ label, value, isDarkMode, isLast }: any) {
  return (
    <View className={`mb-4 ${!isLast ? "" : ""}`}>
      <Text className={`${isDarkMode ? "text-gray-400" : "text-gray-500"} text-sm mb-1`}>{label}</Text>
      <Text className={`${isDarkMode ? "text-white" : "text-[#1A1D23]"} font-medium`}>{value || "-"}</Text>
    </View>
  );
}

function NotificationToggle({ label, value, onToggle, isDarkMode, isLast }: any) {
  return (
    <View className={`flex-row items-center justify-between py-3 ${!isLast ? `border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}` : ""}`}>
      <Text className={isDarkMode ? "text-gray-300" : "text-gray-700"}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
        thumbColor="#fff"
      />
    </View>
  );
}

function LeaveTypeItem({ leaveType, isLast, isDarkMode }: { leaveType: LeaveType; isLast: boolean; isDarkMode: boolean }) {
  const badgeColor = getLeaveTypeColor(leaveType.code);
  return (
    <View className={`py-3 ${!isLast ? `border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}` : ""}`}>
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
            Maks: {leaveType.max_days || "-"} hari
          </Text>
        </View>
        <View className="flex-row items-center">
          <Clock color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={14} style={{ marginRight: 8 }} />
          <Text className={`${isDarkMode ? "text-gray-400" : "text-gray-500"} text-sm`}>
            {leaveType.is_quota_deduction ? "Potong kuota" : "Tidak potong kuota"}
          </Text>
        </View>
      </View>
    </View>
  );
}
