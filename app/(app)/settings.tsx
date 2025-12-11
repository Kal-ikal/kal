// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(app)/settings.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ Phase 4: Position-aware toast + 2FA QR code + LogoutModal
// ===========================================================

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/NotificationToastContext";
import { useTheme } from "@/context/ThemeContext";
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { supabase } from "@/lib/supabase";
import {
  BiometricStatus,
  disableBiometric,
  enableBiometric,
  getBiometricLabel,
  getBiometricStatus,
} from "@/services/biometricService";
import { useScrollToTop } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Bell,
  Check,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Fingerprint,
  Key,
  Lock,
  LogOut,
  Moon,
  Shield,
  Smartphone,
  Sun,
  X,
} from "lucide-react-native";
import { cssInterop } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  GestureResponderEvent,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoutModal from "@/components/LogoutModal";

cssInterop(LinearGradient, { className: "style" });

interface MFAFactor {
  id: string;
  status: string;
  friendly_name?: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  void Smartphone; void Lock;
  const insets = useSafeAreaInsets();
  const { isDarkMode, toggleTheme } = useTheme();
  const { signOut, session } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();
  const { onScroll } = useScrollHandler();

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loadingBiometric, setLoadingBiometric] = useState(false);

  // 2FA State
  const [mfaFactors, setMfaFactors] = useState<MFAFactor[]>([]);
  const [loading2FA, setLoading2FA] = useState(true);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Logout Modal state
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Fetch biometric status
  useEffect(() => {
    const fetchBiometricStatus = async () => {
      const status = await getBiometricStatus();
      setBiometricStatus(status);
      setBiometricEnabled(status.isEnabled);
    };
    fetchBiometricStatus();
  }, []);

  // Fetch 2FA status
  const fetch2FAStatus = useCallback(async () => {
    setLoading2FA(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      // Get all verified factors (not just totp)
      const verifiedFactors = data?.all?.filter(f => f.status === 'verified') || [];
      setMfaFactors(verifiedFactors);

      console.log('2FA Status:', { all: data?.all, verified: verifiedFactors });
    } catch (error) {
      console.error("Error fetching 2FA status:", error);
      // On error, assume no 2FA
      setMfaFactors([]);
    } finally {
      setLoading2FA(false);
    }
  }, []);

  useEffect(() => {
    fetch2FAStatus();
  }, [fetch2FAStatus]);

  // Handle biometric toggle
  const handleBiometricToggle = async (value: boolean, event: GestureResponderEvent) => {
    if (!biometricStatus?.isAvailable) {
      showError("Tidak Tersedia", "Perangkat tidak mendukung biometrik", event);
      return;
    }

    setLoadingBiometric(true);
    try {
      if (value) {
        // Enable biometric (password already stored from first login)
        const userEmail = session?.user?.email;
        if (!userEmail) {
          showError("Error", "Sesi tidak valid, silakan login ulang", event);
          setLoadingBiometric(false);
          return;
        }

        // Verify with biometric first
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Verifikasi untuk Aktifkan Biometric',
          fallbackLabel: 'Batal',
          cancelLabel: 'Batal',
        });

        if (!result.success) {
          showError("Dibatalkan", "Verifikasi biometrik dibatalkan", event);
          setLoadingBiometric(false);
          return;
        }

        // Check if credentials already stored (from initial login)
        const credentialsStr = await SecureStore.getItemAsync('user_credentials');
        if (!credentialsStr) {
          showInfo("Info", "Silakan login ulang dengan password terlebih dahulu", event);
          setLoadingBiometric(false);
          return;
        }

        // Enable biometric
        await SecureStore.setItemAsync('biometric_enabled', 'true');
        setBiometricEnabled(true);
        showSuccess("Berhasil", "Biometrik diaktifkan", event);
      } else {
        const success = await disableBiometric();
        if (success) {
          setBiometricEnabled(false);
          showSuccess("Berhasil", "Biometrik dinonaktifkan", event);
        }
      }
    } catch (error) {
      console.error('Biometric toggle error:', error);
      showError("Gagal", "Tidak dapat mengubah pengaturan biometrik", event);
    } finally {
      setLoadingBiometric(false);
    }
  };

  // Handle 2FA enable
  const handleEnable2FA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });

      if (error) throw error;
      
      setEnrollmentData(data);
      setShow2FAModal(true);
    } catch (error: any) {
      showError("Gagal", error.message || "Tidak dapat mengaktifkan 2FA");
    }
  };

  // Cancel 2FA enrollment
  const handleCancel2FAEnrollment = () => {
    setEnrollmentData(null);
    setVerificationCode("");
    setShow2FAModal(false);
  };

  // Verify 2FA
  const handleVerify2FA = async (event: GestureResponderEvent) => {
    if (!verificationCode || verificationCode.length !== 6 || !enrollmentData) {
      showError("Error", "Masukkan kode 6 digit", event);
      return;
    }

    setVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollmentData.id,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollmentData.id,
        challengeId: challengeData.id,
        code: verificationCode,
      });

      if (verifyError) throw verifyError;

      showSuccess("Berhasil", "2FA berhasil diaktifkan", event);
      setShow2FAModal(false);
      setEnrollmentData(null);
      setVerificationCode("");
      fetch2FAStatus();
    } catch (error: any) {
      showError("Gagal", error.message || "Kode verifikasi salah", event);
    } finally {
      setVerifying(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = (event: GestureResponderEvent) => {
    Alert.alert(
      "Nonaktifkan 2FA?",
      "Akun Anda akan kurang aman tanpa autentikasi dua faktor.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Nonaktifkan",
          style: "destructive",
          onPress: async () => {
            try {
              // Unenroll all factors
              for (const factor of mfaFactors) {
                const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
                if (error) throw error;
              }

              // Clear local state immediately
              setMfaFactors([]);

              // Refresh from server
              await fetch2FAStatus();

              showSuccess("Berhasil", "2FA berhasil dinonaktifkan", event);
            } catch (error: any) {
              console.error("Error disabling 2FA:", error);
              showError("Gagal", error.message || "Tidak dapat menonaktifkan 2FA", event);
              // Refresh status even on error
              fetch2FAStatus();
            }
          },
        },
      ]
    );
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string | undefined, event: GestureResponderEvent) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    showSuccess("Tersalin!", "Secret key berhasil disalin", event);
  };

  // Handle password change
  const handleChangePassword = async (event: GestureResponderEvent) => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showError("Error", "Semua field harus diisi", event);
      return;
    }

    if (newPassword !== confirmPassword) {
      showError("Error", "Password baru tidak cocok", event);
      return;
    }

    if (newPassword.length < 6) {
      showError("Error", "Password minimal 6 karakter", event);
      return;
    }

    setChangingPassword(true);
    try {
      // Step 1: Re-authenticate dengan current password
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error("User email not found");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Password saat ini salah");
      }

      // Step 2: Update password (setelah re-authenticate)
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      showSuccess("Berhasil", "Password berhasil diubah", event);
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      showError("Gagal", error.message || "Tidak dapat mengubah password", event);
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle logout dengan LogoutModal
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  // Handle konfirmasi logout dari modal
  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);
    await signOut();
    router.replace("/(auth)/login");
  };

  const is2FAEnabled = mfaFactors.length > 0;

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ["#1E3A8A", "#1E40AF"] : ["#3B82F6", "#2563EB"]}
        className="pb-6 rounded-b-3xl"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="px-6">
          <Text className="text-white text-2xl font-bold">Pengaturan</Text>
          <Text className="text-blue-100 mt-1">Kelola preferensi aplikasi</Text>
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
        {/* Appearance Section */}
        <View className="mt-6">
          <Text className={`text-sm font-medium mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            TAMPILAN
          </Text>
          <View className={`rounded-2xl overflow-hidden ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
            <TouchableOpacity
              className={`flex-row items-center justify-between p-4 border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}
              onPress={(event) => {
                toggleTheme();
                showInfo("Tema", isDarkMode ? "Mode terang diaktifkan" : "Mode gelap diaktifkan", event);
              }}
            >
              <View className="flex-row items-center">
                <View className={`w-10 h-10 rounded-xl items-center justify-center ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                  {isDarkMode ? <Moon color="#3B82F6" size={20} /> : <Sun color="#F59E0B" size={20} />}
                </View>
                <View className="ml-3">
                  <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                    Mode Gelap
                  </Text>
                  <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {isDarkMode ? "Aktif" : "Nonaktif"}
                  </Text>
                </View>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleTheme}
                trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
                thumbColor="#FFFFFF"
              />
            </TouchableOpacity>

            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center">
                <View className={`w-10 h-10 rounded-xl items-center justify-center ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                  <Bell color="#10B981" size={20} />
                </View>
                <View className="ml-3">
                  <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                    Notifikasi
                  </Text>
                  <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {notificationsEnabled ? "Aktif" : "Nonaktif"}
                  </Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#D1D5DB", true: "#10B981" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View className="mt-6">
          <Text className={`text-sm font-medium mb-3 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            KEAMANAN
          </Text>
          <View className={`rounded-2xl overflow-hidden ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
            {/* Biometric */}
            {biometricStatus?.isAvailable && (
              <View className={`flex-row items-center justify-between p-4 border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}>
                <View className="flex-row items-center">
                  <View className={`w-10 h-10 rounded-xl items-center justify-center ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                    <Fingerprint color="#8B5CF6" size={20} />
                  </View>
                  <View className="ml-3">
                    <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                      Login {getBiometricLabel(biometricStatus.biometricType)}
                    </Text>
                    <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                      {biometricEnabled ? "Aktif" : "Nonaktif"}
                    </Text>
                  </View>
                </View>
                {loadingBiometric ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Switch
                    value={biometricEnabled}
                    onValueChange={(value) => {
                      // Can't get event from Switch, use default position
                      handleBiometricToggle(value, {} as GestureResponderEvent);
                    }}
                    trackColor={{ false: "#D1D5DB", true: "#8B5CF6" }}
                    thumbColor="#FFFFFF"
                  />
                )}
              </View>
            )}

            {/* 2FA */}
            <TouchableOpacity
              className={`flex-row items-center justify-between p-4 border-b ${isDarkMode ? "border-gray-700" : "border-gray-100"}`}
              onPress={(event) => (is2FAEnabled ? handleDisable2FA(event) : handleEnable2FA())}
            >
              <View className="flex-row items-center">
                <View className={`w-10 h-10 rounded-xl items-center justify-center ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                  <Shield color="#3B82F6" size={20} />
                </View>
                <View className="ml-3">
                  <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                    Autentikasi 2 Faktor
                  </Text>
                  <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {loading2FA ? "Memuat..." : is2FAEnabled ? "Aktif" : "Nonaktif"}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center">
                {is2FAEnabled && (
                  <View className="bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full mr-2">
                    <Text className="text-green-600 dark:text-green-400 text-xs font-medium">Aktif</Text>
                  </View>
                )}
                <ChevronRight color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
              </View>
            </TouchableOpacity>

            {/* Change Password */}
            <TouchableOpacity
              className="flex-row items-center justify-between p-4"
              onPress={() => setShowPasswordModal(true)}
            >
              <View className="flex-row items-center">
                <View className={`w-10 h-10 rounded-xl items-center justify-center ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                  <Key color="#F59E0B" size={20} />
                </View>
                <View className="ml-3">
                  <Text className={`font-medium ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                    Ubah Password
                  </Text>
                  <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Perbarui password akun
                  </Text>
                </View>
              </View>
              <ChevronRight color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          className="mt-6 bg-red-500 rounded-2xl p-4 flex-row items-center justify-center"
          onPress={handleLogout}
        >
          <LogOut color="white" size={20} />
          <Text className="text-white font-bold ml-2">Keluar</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text className={`text-center mt-6 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>
          HRIS Mobile v1.0.0
        </Text>
      </ScrollView>

      {/* 2FA Setup Modal */}
      <Modal
        visible={show2FAModal}
        transparent
        animationType="slide"
        onRequestClose={handleCancel2FAEnrollment}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-t-3xl p-6`}
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                Aktifkan 2FA
              </Text>
              <TouchableOpacity onPress={handleCancel2FAEnrollment}>
                <X color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={24} />
              </TouchableOpacity>
            </View>

            <Text className={`mb-4 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Scan QR code ini dengan aplikasi Authenticator Anda (Google Authenticator, Authy, dll):
            </Text>

            {/* QR Code */}
            {enrollmentData?.totp?.uri && (
              <View className="items-center mb-4 bg-white p-4 rounded-xl self-center">
                <QRCode
                  value={enrollmentData.totp.uri}
                  size={180}
                  backgroundColor="white"
                  color="black"
                />
              </View>
            )}

            {/* Secret Key */}
            <Text className={`text-sm mb-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Atau masukkan kode ini secara manual:
            </Text>
            <View className={`p-3 rounded-xl mb-4 flex-row justify-between items-center ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
              <Text className={`font-mono text-sm flex-1 ${isDarkMode ? "text-white" : "text-gray-800"}`} selectable>
                {enrollmentData?.totp?.secret}
              </Text>
              <TouchableOpacity
                onPress={(event) => copyToClipboard(enrollmentData?.totp?.secret, event)}
                className="ml-2 p-2"
              >
                <Copy color="#3B82F6" size={20} />
              </TouchableOpacity>
            </View>

            {/* Verification Input */}
            <Text className={`mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Masukkan kode verifikasi 6 digit:
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
                className={`flex-1 py-4 rounded-xl items-center ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}
                onPress={handleCancel2FAEnrollment}
              >
                <Text className={`font-bold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Batal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 py-4 rounded-xl items-center ${verifying || verificationCode.length !== 6 ? "bg-gray-400" : "bg-blue-500"}`}
                onPress={handleVerify2FA}
                disabled={verifying || verificationCode.length !== 6}
              >
                {verifying ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold">Verifikasi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-t-3xl p-6`}
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                Ubah Password
              </Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <X color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={24} />
              </TouchableOpacity>
            </View>

            {/* Current Password */}
            <Text className={`mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Password Saat Ini
            </Text>
            <View className={`flex-row items-center rounded-xl mb-4 ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showCurrentPassword}
                className={`flex-1 p-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}
              />
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} className="p-4">
                {showCurrentPassword ? <EyeOff color="#9CA3AF" size={20} /> : <Eye color="#9CA3AF" size={20} />}
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <Text className={`mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Password Baru
            </Text>
            <View className={`flex-row items-center rounded-xl mb-4 ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Minimal 6 karakter"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showNewPassword}
                className={`flex-1 p-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} className="p-4">
                {showNewPassword ? <EyeOff color="#9CA3AF" size={20} /> : <Eye color="#9CA3AF" size={20} />}
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <Text className={`mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Konfirmasi Password Baru
            </Text>
            <View className={`flex-row items-center rounded-xl mb-4 ${isDarkMode ? "bg-gray-700" : "bg-gray-100"}`}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Ulangi password baru"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                className={`flex-1 p-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}
              />
              {confirmPassword && newPassword === confirmPassword && (
                <View className="p-4">
                  <Check color="#10B981" size={20} />
                </View>
              )}
            </View>

            <TouchableOpacity
              className={`py-4 rounded-xl items-center ${changingPassword ? "bg-gray-400" : "bg-blue-500"}`}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold">Simpan Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Logout Modal */}
      <LogoutModal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
        isDarkMode={isDarkMode}
      />
    </View>
  );
}