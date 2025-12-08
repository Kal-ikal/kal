// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(auth)/login.tsx
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ Phase 4: Biometric login + 2FA enforcement
// ===========================================================

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/NotificationToastContext";
import { supabase } from "@/lib/supabase";
import {
  authenticateWithBiometric,
  enableBiometric,
  getBiometricLabel,
  getBiometricStatus,
} from "@/services/biometricService";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Eye, EyeOff, Fingerprint, Lock, Mail, X } from "lucide-react-native";
import { cssInterop } from "nativewind";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

cssInterop(LinearGradient, { className: "style" });

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  void signIn;
  const { showSuccess, showError, showInfo } = useToast();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Biometric state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'facial' | 'iris' | 'none'>('none');

  // 2FA state
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [verifying2FA, setVerifying2FA] = useState(false);

  // Check biometric status on mount
  useEffect(() => {
    const checkBiometric = async () => {
      const status = await getBiometricStatus();
      setBiometricAvailable(status.isAvailable);
      setBiometricEnabled(status.isEnabled);
      setBiometricType(status.biometricType);
    };
    checkBiometric();
  }, []);

  // Complete login and navigate
  const completeLogin = useCallback(async (loginEmail: string, loginPassword: string) => {
    try {
      // Check if biometric should be enabled
      if (biometricAvailable && !biometricEnabled) {
        // Offer to enable biometric for next time
        await enableBiometric(loginEmail, loginPassword);
        showInfo("Biometrik", `${getBiometricLabel(biometricType)} diaktifkan untuk login berikutnya`);
      }

      showSuccess("Berhasil", "Login berhasil!");
      router.replace("/(app)/home");
    } catch (error) {
      console.error("Complete login error:", error);
    } finally {
      setLoading(false);
    }
  }, [biometricAvailable, biometricEnabled, biometricType, showInfo, showSuccess, router]);

  // Handle regular login
  const handleLogin = useCallback(async (loginEmail?: string, loginPassword?: string) => {
    const emailToUse = loginEmail || email;
    const passwordToUse = loginPassword || password;

    if (!emailToUse || !passwordToUse) {
      showError("Error", "Email dan password harus diisi");
      return;
    }

    setLoading(true);

    try {
      // Attempt sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: passwordToUse,
      });
      void data;

      if (error) throw error;

      // Check if 2FA is required
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];

      if (verifiedFactors.length > 0) {
        // 2FA is enabled, need to verify
        setMfaFactorId(verifiedFactors[0].id);
        setShow2FAModal(true);
        setLoading(false);
        return;
      }

      // No 2FA, proceed with login
      await completeLogin(emailToUse, passwordToUse);
    } catch (error: any) {
      console.error("Login error:", error);
      showError("Login Gagal", error.message || "Email atau password salah");
      setLoading(false);
    }
  }, [email, password, showError, completeLogin]);

  // Handle biometric login
  const handleBiometricLogin = useCallback(async () => {
    if (!biometricEnabled) {
      showInfo("Info", "Login biometrik belum diaktifkan");
      return;
    }

    const result = await authenticateWithBiometric();
    
    if (!result.success) {
      if (result.error !== 'Dibatalkan') {
        showError("Gagal", result.error || "Autentikasi biometrik gagal");
      }
      return;
    }

    if (result.credentials) {
      setEmail(result.credentials.email);
      setPassword(result.credentials.password);
      // Auto-submit
      handleLogin(result.credentials.email, result.credentials.password);
    }
  }, [biometricEnabled, showError, showInfo, handleLogin]);

  // Handle 2FA verification
  const handle2FAVerify = useCallback(async () => {
    if (!mfaFactorId || totpCode.length !== 6) {
      return;
    }

    setVerifying2FA(true);

    try {
      // Create challenge and verify TOTP code
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });

      if (challengeError) throw challengeError;

      // Verify the challenge
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData?.id || '',
        code: totpCode,
      });

      if (verifyError) throw verifyError;

      // 2FA verified, complete login
      setShow2FAModal(false);
      await completeLogin(email, password);
    } catch (error: any) {
      console.error("2FA verify error:", error);
      showError("Gagal", "Kode verifikasi salah");
    } finally {
      setVerifying2FA(false);
    }
  }, [totpCode, mfaFactorId, email, password, showError, completeLogin]);

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <LinearGradient
            colors={["#3B82F6", "#2563EB"]}
            className="pt-20 pb-16 px-6 rounded-b-[40px]"
            style={{ paddingTop: insets.top + 60 }}
          >
            <View className="items-center">
              <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-4">
                <Image
                  source={require("@/assets/images/icon.png")}
                  className="w-14 h-14"
                  resizeMode="contain"
                />
              </View>
              <Text className="text-white text-2xl font-bold">HRIS Mobile</Text>
              <Text className="text-blue-100 mt-1">Human Resource Information System</Text>
            </View>
          </LinearGradient>

          {/* Form */}
          <View className="flex-1 px-6 pt-8">
            <Text className="text-2xl font-bold text-gray-800 mb-2">Masuk</Text>
            <Text className="text-gray-500 mb-8">Silakan login untuk melanjutkan</Text>

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Email</Text>
              <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
                <Mail color="#9CA3AF" size={20} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email@company.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="flex-1 py-4 px-3 text-gray-900"
                />
              </View>
            </View>

            {/* Password Input */}
            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Password</Text>
              <View className="flex-row items-center bg-gray-100 rounded-xl px-4">
                <Lock color="#9CA3AF" size={20} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  className="flex-1 py-4 px-3 text-gray-900"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff color="#9CA3AF" size={20} />
                  ) : (
                    <Eye color="#9CA3AF" size={20} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              onPress={() => handleLogin()}
              disabled={loading}
              className={`py-4 rounded-xl items-center ${loading ? "bg-gray-400" : "bg-blue-500"}`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">Masuk</Text>
              )}
            </TouchableOpacity>

            {/* Biometric Login */}
            {biometricAvailable && biometricEnabled && (
              <TouchableOpacity
                onPress={handleBiometricLogin}
                className="mt-4 py-4 rounded-xl items-center border border-blue-500 flex-row justify-center"
              >
                <Fingerprint color="#3B82F6" size={24} />
                <Text className="text-blue-500 font-bold text-lg ml-2">
                  Login dengan {getBiometricLabel(biometricType)}
                </Text>
              </TouchableOpacity>
            )}

            {/* Footer */}
            <View className="mt-auto pb-8 pt-6">
              <Text className="text-center text-gray-400 text-sm">
                © 2025 HRIS Mobile App
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 2FA Modal */}
      <Modal
        visible={show2FAModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShow2FAModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-6">
          <View className="bg-white rounded-2xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-900">Verifikasi 2FA</Text>
              <TouchableOpacity onPress={() => {
                setShow2FAModal(false);
                setTotpCode("");
                setLoading(false);
              }}>
                <X color="#6B7280" size={24} />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 mb-4">
              Masukkan kode dari aplikasi Authenticator Anda:
            </Text>

            <TextInput
              value={totpCode}
              onChangeText={(text) => setTotpCode(text.replace(/\D/g, ""))}
              placeholder="000000"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={6}
              className="bg-gray-100 p-4 rounded-xl text-center text-2xl font-bold tracking-widest mb-4 text-gray-900"
            />

            <TouchableOpacity
              onPress={handle2FAVerify}
              disabled={verifying2FA || totpCode.length !== 6}
              className={`py-4 rounded-xl items-center ${
                verifying2FA || totpCode.length !== 6 ? "bg-gray-400" : "bg-blue-500"
              }`}
            >
              {verifying2FA ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">Verifikasi</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
