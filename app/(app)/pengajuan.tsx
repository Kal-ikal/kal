
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  BackHandler,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  Check,
  Upload,
  X,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { DocumentPickerAsset } from "expo-document-picker";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useUserData } from "@/hooks/useUserData";
// ✅ FIX: Menggunakan Store Zustand, bukan Context
import { useTabBarStore } from "@/hooks/useTabBarStore";
import { useToast } from "@/context/NotificationToastContext";
import { supabase } from "@/lib/supabase";
import { submitLeaveRequest } from "@/services/leaveService";
import { formatDateID } from "@/utils/formatters";

cssInterop(LinearGradient, { className: "style" });

type Step = 1 | 2 | 3;

interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  max_days: number;
  is_active: boolean; // Pastikan field ini ada di DB atau hapus filter di bawah
  is_quota_deduction: boolean;
  requires_file: boolean;
}

export default function PengajuanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { session } = useAuth();
  const { getLeaveBalanceUI, refetch } = useUserData();
  
  // ✅ FIX: Menggunakan Selector Zustand
  const setIsVisible = useTabBarStore((state) => state.setIsVisible);
  
  const { showSuccess, showError } = useToast();
  const lastScrollY = useRef(0);

  // Form state
  const [step, setStep] = useState<Step>(1);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [reason, setReason] = useState("");
  const [document, setDocument] = useState<DocumentPickerAsset | null>(null);

  // UI state
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Data state
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loadingLeaveTypes, setLoadingLeaveTypes] = useState(true);

  const balanceUI = useMemo(() => getLeaveBalanceUI(), [getLeaveBalanceUI]);

  const resetFormState = useCallback(() => {
    setStep(1);
    setSelectedLeaveTypeId(null);
    setStartDate(new Date());
    setEndDate(new Date());
    setReason("");
    setDocument(null);
    setShowStartPicker(false);
    setShowEndPicker(false);
    setSubmitting(false);
  }, []);

  // Check if form has data
  const hasFormData = useMemo(() => {
    return selectedLeaveTypeId !== null || reason.trim().length > 0 || document !== null;
  }, [selectedLeaveTypeId, reason, document]);

  // Scroll Handler for TabBar visibility
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;

    if (Math.abs(diff) > 15) {
      if (diff < 0) {
        setIsVisible(true);
      } else if (diff > 0 && currentY > 30) {
        setIsVisible(false);
      }
      lastScrollY.current = currentY;
    }
  }, [setIsVisible]);

  const handleClose = useCallback(() => {
    if (hasFormData) {
      Alert.alert(
        "Batalkan Pengajuan?",
        "Data yang sudah Anda isi akan hilang.",
        [
          { text: "Tetap di Sini", style: "cancel" },
          {
            text: "Ya, Keluar",
            style: "destructive",
            onPress: () => {
              resetFormState();
              setIsVisible(true);
              router.replace("/(app)/home");
            },
          },
        ]
      );
    } else {
      resetFormState();
      setIsVisible(true);
      router.replace("/(app)/home");
    }
  }, [hasFormData, resetFormState, setIsVisible, router]);

  // Fetch Leave Types
  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        setLoadingLeaveTypes(true);
        // Hapus filter is_active jika kolom tidak ada di DB
        const { data, error } = await supabase
          .from("leave_types")
          .select("*")
          .order("name");

        if (error) throw error;
        setLeaveTypes(data || []);
      } catch (error) {
        console.error("Error fetching leave types:", error);
        showError("Error", "Gagal memuat jenis cuti");
      } finally {
        setLoadingLeaveTypes(false);
      }
    };

    fetchLeaveTypes();
  }, [showError]);

  useFocusEffect(
    useCallback(() => {
      resetFormState();
      setIsVisible(false); // Hide tab bar on enter

      return () => {
        // resetFormState(); // Optional: reset on leave
        setIsVisible(true); // Show tab bar on leave
      };
    }, [resetFormState, setIsVisible])
  );

  useEffect(() => {
    const backAction = () => {
      handleClose();
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [handleClose]);

  const selectedLeaveType = useMemo(() => {
    return leaveTypes.find((lt) => lt.id === selectedLeaveTypeId);
  }, [leaveTypes, selectedLeaveTypeId]);

  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      if (selectedDate > endDate) {
        setEndDate(selectedDate);
      }
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) {
      if (selectedDate >= startDate) {
        setEndDate(selectedDate);
      } else {
        Alert.alert("Error", "Tanggal selesai harus setelah tanggal mulai");
      }
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setDocument(result.assets[0]);
      }
    } catch (error) {
      console.error("Document picker error:", error);
      showError("Error", "Gagal memilih dokumen");
    }
  };

  const handleNext = () => {
    if (step === 1 && !selectedLeaveTypeId) {
      Alert.alert("Pilih Jenis Cuti", "Silakan pilih jenis cuti terlebih dahulu");
      return;
    }
    if (step === 2) {
        if(totalDays <= 0) {
            Alert.alert("Error", "Tanggal akhir harus sama atau setelah tanggal mulai");
            return;
        }
        if (selectedLeaveType?.is_quota_deduction && totalDays > balanceUI.remaining) {
             Alert.alert("Saldo Tidak Cukup", `Anda hanya memiliki ${balanceUI.remaining} hari sisa cuti`);
             return;
        }
    }
    if (step < 3) {
      setStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step);
    } else {
      handleClose();
    }
  };

  const handleSubmit = async () => {
    if (!session?.user?.id || !selectedLeaveTypeId) {
      showError("Error", "Data tidak lengkap");
      return;
    }

    if(selectedLeaveType?.requires_file && !document) {
        Alert.alert("Dokumen Diperlukan", "Jenis cuti ini memerlukan lampiran dokumen.");
        return;
    }

    try {
      setSubmitting(true);
      const formatDateForDB = (date: Date) => date.toISOString().split("T")[0];

      const result = await submitLeaveRequest({
        userId: session.user.id,
        leaveTypeId: selectedLeaveTypeId,
        startDate: formatDateForDB(startDate),
        endDate: formatDateForDB(endDate),
        reason: reason.trim(),
        documentUrl: document?.uri || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Gagal mengajukan cuti");
      }

      await refetch();
      showSuccess("Berhasil", "Pengajuan cuti berhasil dikirim");

      setTimeout(() => {
        resetFormState();
        setIsVisible(true);
        router.replace("/(app)/home");
      }, 1000);
    } catch (error: any) {
      console.error("Submit error:", error);
      showError("Gagal", error.message || "Gagal mengajukan cuti");
    } finally {
      setSubmitting(false);
    }
  };

  // ... (Render functions remain largely the same, just ensuring imports are clean)
  // RENDER HELPERS
  const renderStepIndicator = () => (
    <View className="flex-row items-center justify-center mb-6">
      {[1, 2, 3].map((s) => (
        <React.Fragment key={s}>
          <View className={`w-8 h-8 rounded-full items-center justify-center ${s <= step ? "bg-blue-500" : isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}>
            {s < step ? <Check color="white" size={16} /> : <Text className={`font-bold ${s <= step ? "text-white" : isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{s}</Text>}
          </View>
          {s < 3 && <View className={`w-12 h-1 mx-1 ${s < step ? "bg-blue-500" : isDarkMode ? "bg-gray-700" : "bg-gray-200"}`} />}
        </React.Fragment>
      ))}
    </View>
  );

  const renderStep1 = () => (
      <View>
          <Text className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Pilih Jenis Cuti</Text>
          {loadingLeaveTypes ? (
              <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '80%' }}>
                  {leaveTypes.map((type) => (
                      <TouchableOpacity key={type.id} onPress={() => setSelectedLeaveTypeId(type.id)} className={`p-4 rounded-xl mb-3 border-2 ${selectedLeaveTypeId === type.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : isDarkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}>
                          <View className="flex-row justify-between items-center">
                              <View className="flex-1">
                                  <Text className={`font-bold text-base ${isDarkMode ? "text-white" : "text-gray-900"}`}>{type.name}</Text>
                                  <View className="flex-row flex-wrap mt-1">
                                     {type.max_days && <Text className="text-xs text-blue-500 mr-2">Max: {type.max_days} hari</Text>}
                                     {type.is_quota_deduction && <Text className="text-xs text-red-500 mr-2">• Potong Saldo</Text>}
                                     {type.requires_file && <Text className="text-xs text-orange-500">• Perlu Dokumen</Text>}
                                  </View>
                              </View>
                              {selectedLeaveTypeId === type.id && <Check color="#3B82F6" size={20} />}
                          </View>
                      </TouchableOpacity>
                  ))}
              </ScrollView>
          )}
      </View>
  );

  const renderStep2 = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
       <Text className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Tanggal & Alasan</Text>
       
       {/* Balance Info */}
       <View className={`p-4 rounded-xl mb-4 ${isDarkMode ? "bg-blue-900/30" : "bg-blue-50"}`}>
            <Text className={`text-sm ${isDarkMode ? "text-blue-300" : "text-blue-700"}`}>Sisa cuti tahunan: {balanceUI.remaining} hari</Text>
       </View>

       {/* Dates */}
       <View className="mb-4">
           <Text className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Tanggal Mulai</Text>
           <TouchableOpacity onPress={() => setShowStartPicker(true)} className={`p-4 rounded-xl flex-row items-center ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border`}>
               <Calendar color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
               <Text className={`ml-3 flex-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{formatDateID(startDate.toISOString())}</Text>
           </TouchableOpacity>
       </View>
       <View className="mb-4">
           <Text className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Tanggal Selesai</Text>
           <TouchableOpacity onPress={() => setShowEndPicker(true)} className={`p-4 rounded-xl flex-row items-center ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border`}>
               <Calendar color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={20} />
               <Text className={`ml-3 flex-1 ${isDarkMode ? "text-white" : "text-gray-900"}`}>{formatDateID(endDate.toISOString())}</Text>
           </TouchableOpacity>
       </View>

       <View className={`p-4 rounded-xl mb-4 ${isDarkMode ? "bg-gray-800" : "bg-gray-100"}`}>
           <Text className={`text-center font-bold text-lg ${totalDays > balanceUI.remaining && selectedLeaveType?.is_quota_deduction ? "text-red-500" : isDarkMode ? "text-white" : "text-gray-900"}`}>Total: {totalDays} hari</Text>
           {totalDays > balanceUI.remaining && selectedLeaveType?.is_quota_deduction && (
               <Text className="text-center text-red-500 text-sm mt-1">Melebihi saldo cuti</Text>
           )}
       </View>

       {/* Date Pickers */}
       {showStartPicker && (
           <DateTimePicker value={startDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={new Date()} onChange={onStartDateChange} />
       )}
       {showEndPicker && (
           <DateTimePicker value={endDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={startDate} onChange={onEndDateChange} />
       )}
    </ScrollView>
  );

  const renderStep3 = () => (
      <ScrollView showsVerticalScrollIndicator={false}>
          <Text className={`text-lg font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>Detail Pengajuan</Text>
          
          <View className="mb-4">
              <Text className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Alasan Cuti *</Text>
              <TextInput value={reason} onChangeText={setReason} placeholder="Jelaskan alasan cuti..." placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"} multiline numberOfLines={4} textAlignVertical="top" className={`p-4 rounded-xl min-h-[120px] ${isDarkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-200"} border`} />
          </View>

          <View className="mb-4">
              <Text className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Dokumen Pendukung {selectedLeaveType?.requires_file ? "*" : "(Opsional)"}</Text>
              {document ? (
                  <View className={`p-4 rounded-xl flex-row items-center ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border`}>
                      <FileText color="#3B82F6" size={24} />
                      <Text className={`flex-1 mx-3 ${isDarkMode ? "text-white" : "text-gray-900"}`} numberOfLines={1}>{document.name}</Text>
                      <TouchableOpacity onPress={() => setDocument(null)}><X color="#EF4444" size={20} /></TouchableOpacity>
                  </View>
              ) : (
                  <TouchableOpacity onPress={handlePickDocument} className={`p-4 rounded-xl flex-row items-center justify-center border-2 border-dashed ${isDarkMode ? "border-gray-700" : "border-gray-300"}`}>
                      <Upload color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={24} />
                      <Text className={`ml-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Upload File/Gambar</Text>
                  </TouchableOpacity>
              )}
          </View>
      </ScrollView>
  );

  return (
    <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-[#F7F7F7]"}`}>
      <StatusBar style="light" />
      <LinearGradient colors={isDarkMode ? ["#1E3A8A", "#1E40AF"] : ["#3B82F6", "#60A5FA"]} className="px-6 pb-6 rounded-b-3xl" start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top + 16 }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={handleBack} className="p-2 -ml-2"><ChevronLeft color="white" size={24} /></TouchableOpacity>
          <Text className="text-white text-xl font-bold">Pengajuan Cuti</Text>
          <TouchableOpacity onPress={handleClose} className="bg-white/20 p-2 rounded-full"><X color="white" size={22} /></TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={16}>
        {renderStepIndicator()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        <View className="h-24" />
      </ScrollView>

      <View className={`px-6 py-4 ${isDarkMode ? "bg-gray-800" : "bg-white"} border-t ${isDarkMode ? "border-gray-700" : "border-gray-200"}`} style={{ paddingBottom: insets.bottom + 16 }}>
         {step < 3 ? (
             <TouchableOpacity onPress={handleNext} disabled={!selectedLeaveTypeId && step===1} className={`py-4 rounded-xl flex-row items-center justify-center ${(!selectedLeaveTypeId && step===1) ? "bg-gray-400" : "bg-blue-500"}`}>
                 <Text className="text-white font-bold text-lg mr-2">Lanjut</Text>
                 <ChevronRight color="white" size={20} />
             </TouchableOpacity>
         ) : (
             <TouchableOpacity onPress={handleSubmit} disabled={submitting} className={`py-4 rounded-xl flex-row items-center justify-center ${submitting ? "bg-gray-400" : "bg-green-500"}`}>
                 {submitting ? <ActivityIndicator color="white" /> : <><Check color="white" size={20} /><Text className="text-white font-bold text-lg ml-2">Kirim Pengajuan</Text></>}
             </TouchableOpacity>
         )}
      </View>
    </View>
  );
}
