import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  BackHandler,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Upload,
  CheckCircle,
  X,
} from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from '@/lib/supabase';
import { useUserData } from '@/hooks/useUserData';
import { useScrollHandler } from "@/hooks/useScrollHandler";

cssInterop(LinearGradient, { className: "style" });

// ===========================
// TYPE DEFINITIONS
// ===========================
type FormData = {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  days: number;
  documents: string[];
};

type LeaveType = {
  id: string;
  name: string;
};

// ===========================
// CONSTANTS
// ===========================
const LEAVE_TYPES: LeaveType[] = [
  { id: "Cuti Tahunan", name: "Annual Leave" },
  { id: "Cuti Sakit", name: "Sick Leave" },
  { id: "Cuti Darurat", name: "Emergency Leave" },
  { id: "Cuti Melahirkan", name: "Maternity Leave" },
  { id: "Cuti Lainnya", name: "Other Leave" },
];

const TOTAL_STEPS = 3;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// ===========================
// COMPONENT
// ===========================
export default function LeaveApplicationForm() {
  // ===========================
  // HOOKS
  // ===========================
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDarkMode: isDark } = useTheme();
  const { employee } = useUserData();
  const { onScroll } = useScrollHandler();

  // ===========================
  // STATE
  // ===========================
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
    days: 0,
    documents: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<"start" | "end">("start");
  const [tempDate, setTempDate] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===========================
  // REFS
  // ===========================
  const scrollRef = useRef<ScrollView>(null);

  // ===========================
  // EFFECTS
  // ===========================

  // Reset form saat screen fokus
  useFocusEffect(
    useCallback(() => {

      setCurrentStep(1);
      setFormData({
        leaveType: "",
        startDate: "",
        endDate: "",
        reason: "",
        days: 0,
        documents: [],
      });
      setErrors({});
      setShowDatePicker(false);
      scrollRef.current?.scrollTo({ y: 0, animated: false });

      return () => {};
    }, [])
  );

  // Handle hardware back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Keyboard.dismiss();

        if (currentStep > 1) {
          setCurrentStep(currentStep - 1);
          setTimeout(() => {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          }, 100);
          return true;
        }

        const hasData =
          formData.leaveType ||
          formData.startDate ||
          formData.endDate ||
          formData.reason ||
          formData.documents.length > 0;

        if (!hasData) {
          router.back();
          return true;
        }

        Alert.alert(
          "Cancel Leave Application?",
          "Your progress will be lost. Are you sure?",
          [
            { text: "Stay", style: "cancel" },
            {
              text: "Yes, Cancel",
              style: "destructive",
              onPress: () => {
                router.back();
              },
            },
          ]
        );
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => backHandler.remove();
    }, [currentStep, formData, router])
  );

  // Calculate leave days
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);

      if (start > end) {
        setFormData((prev) => ({ ...prev, days: 0 }));
        return;
      }

      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      setFormData((prev) => ({ ...prev, days: diffDays + 1 }));
    } else {
      setFormData((prev) => ({ ...prev, days: 0 }));
    }
  }, [formData.startDate, formData.endDate]);

  // ===========================
  // HANDLERS
  // ===========================

  const handleInputChange = useCallback(
    (field: keyof FormData, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value } as FormData));
      
      // Clear error for this field
      setErrors((prev) => {
        if (prev[field]) {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        }
        return prev;
      });
    },
    []
  );

  const validateStep = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1 && !formData.leaveType) {
      newErrors.leaveType = "Please select a leave type";
    }

    if (currentStep === 2) {
      if (!formData.startDate) newErrors.startDate = "Start date is required";
      if (!formData.endDate) newErrors.endDate = "End date is required";
      if (formData.startDate && formData.endDate) {
        const s = new Date(formData.startDate);
        const e = new Date(formData.endDate);
        if (e < s) newErrors.endDate = "End date cannot be before start date";
      }
    }

    if (currentStep === 3 && !formData.reason.trim()) {
      newErrors.reason = "Reason is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, formData.leaveType, formData.startDate, formData.endDate, formData.reason]);

  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return "" as string;
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const formattedStartDate = formatDate(formData.startDate);
    const formattedEndDate = formatDate(formData.endDate);
    const totalDays = formData.days;

    if (!employee?.id) {
      Alert.alert("Error", "User data not found. Please try reloading the app.");
      return;
    }

    Alert.alert(
      "Submit Leave Application?",
      `You are applying for ${totalDays} days of leave from ${formattedStartDate} to ${formattedEndDate}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            try {
              setIsSubmitting(true);

              // 1. Insert into leave_requests
              const { data: requestData, error: insertError } = await supabase
                .from('leave_requests')
                .insert({
                  employee_id: employee.id,
                  leave_type: formData.leaveType,
                  start_date: formData.startDate,
                  end_date: formData.endDate,
                  reason: formData.reason,
                  status: 'Dalam Proses', // Status awal
                  current_step_order: 1, // Step awal
                })
                .select('id') // Retrieve the ID
                .single();

              if (insertError) throw insertError;
              if (!requestData) throw new Error("Failed to retrieve new request ID");

              const newRequestId = requestData.id;

              // 2. Bulk Insert into approval_steps
              // Fixed column names to match database schema
              const approvalSteps = [
                {
                  leave_request_id: newRequestId,
                  step_name: "Handover/Rekan Kerja",
                  approver_role: "manager",
                  step_order: 1,
                  status: "Dalam Proses",
                },
                {
                  leave_request_id: newRequestId,
                  step_name: "DFD",
                  approver_role: "dfd_lead",
                  step_order: 2,
                  status: "Dalam Proses",
                },
                {
                  leave_request_id: newRequestId,
                  step_name: "HRD",
                  approver_role: "hrd",
                  step_order: 3,
                  status: "Dalam Proses",
                },
                {
                  leave_request_id: newRequestId,
                  step_name: "Admin Final",
                  approver_role: "admin",
                  step_order: 4,
                  status: "Dalam Proses",
                },
              ];

              const { error: stepsError } = await supabase
                .from('approval_steps')
                .insert(approvalSteps);

              if (stepsError) {
                console.error("Error inserting steps:", stepsError);
                throw new Error("Failed to initialize approval workflow.");
              }

              Alert.alert(
                "Application Submitted",
                "Your leave application has been submitted successfully and is now pending approval.",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      router.replace("/(app)/home");
                    },
                  },
                ]
              );
            } catch (error: any) {
              console.error("Submit error:", error);
              Alert.alert(
                "Error",
                error.message || "Failed to submit application. Please try again."
              );
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  }, [formData, formatDate, router, employee]);

  const handleNext = useCallback(() => {
    Keyboard.dismiss();

    if (validateStep()) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(currentStep + 1);
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y: 0, animated: true });
        }, 100);
      } else {
        handleSubmit();
      }
    }
  }, [currentStep, validateStep, handleSubmit]);

  const handleSafeBack = useCallback(() => {
    Keyboard.dismiss();

    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
      return;
    }

    // Check if form has data
    setFormData((currentFormData) => {
      const hasData =
        currentFormData.leaveType ||
        currentFormData.startDate ||
        currentFormData.endDate ||
        currentFormData.reason ||
        currentFormData.documents.length > 0;

      if (!hasData) {
        router.back();
        return currentFormData;
      }

      // Confirm before leaving
      Alert.alert(
        "Cancel Leave Application?",
        "Your progress will be lost. Are you sure?",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Yes, Cancel",
            style: "destructive",
            onPress: () => {
              router.back();
            },
          },
        ]
      );
      
      return currentFormData;
    });
  }, [currentStep, router]);

  const handlePrevious = useCallback(() => {
    handleSafeBack();
  }, [handleSafeBack]);

  const showPicker = useCallback(
    (field: "start" | "end") => {
      Keyboard.dismiss();
      setDatePickerField(field);
      const fd: "startDate" | "endDate" =
        field === "start" ? "startDate" : "endDate";
      setTempDate(formData[fd] ? new Date(formData[fd]) : new Date());
      setShowDatePicker(true);
    },
    [formData]
  );

  const onDateChange = useCallback(
    (event: any, selectedDate?: Date) => {
      if (Platform.OS === "android") setShowDatePicker(false);
      if (event.type === "set" && selectedDate) {
        const dateString = selectedDate.toISOString().split("T")[0];
        const fieldName: keyof FormData =
          datePickerField === "start" ? "startDate" : "endDate";
        handleInputChange(fieldName, dateString);
      }
    },
    [datePickerField, handleInputChange]
  );

  const handleDocumentUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const name = asset.name ?? "document";

        if (asset.size && asset.size > MAX_FILE_SIZE) {
          Alert.alert("File too large", "File must be under 2MB");
          return;
        }

        setFormData((p) => ({ ...p, documents: [...p.documents, name] }));
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Error", "Could not pick document.");
    }
  }, []);

  // ===========================
  // COMPUTED VALUES
  // ===========================

  const minimumDate = useMemo(() => {
    if (datePickerField === "end" && formData.startDate) {
      return new Date(formData.startDate);
    }
    return new Date();
  }, [datePickerField, formData.startDate]);

  // ===========================
  // RENDER FUNCTIONS
  // ===========================

  const renderStepOne = useMemo(
    () => (
      <View className="space-y-6">
        <Text
          className={`text-lg font-bold ${
            isDark ? "text-white" : "text-gray-800"
          }`}
        >
          Select Leave Type
        </Text>
        {LEAVE_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            className={`p-4 rounded-xl border ${
              formData.leaveType === type.id
                ? "bg-blue-50 border-blue-500 dark:bg-blue-900/30 dark:border-blue-400"
                : `${
                    isDark
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-gray-200"
                  }`
            }`}
            onPress={() => handleInputChange("leaveType", type.id)}
            activeOpacity={0.7}
          >
            <Text
              className={`text-base ${
                formData.leaveType === type.id
                  ? "text-blue-600 dark:text-blue-300 font-semibold"
                  : isDark
                    ? "text-gray-300"
                    : "text-gray-700"
              }`}
            >
              {type.name}
            </Text>
          </TouchableOpacity>
        ))}
        {errors.leaveType ? (
          <Text className="text-red-500 text-sm">{errors.leaveType}</Text>
        ) : null}
      </View>
    ),
    [formData.leaveType, errors.leaveType, isDark, handleInputChange]
  );

  const renderStepTwo = useMemo(
    () => (
      <View className="space-y-6">
        <Text
          className={`text-lg font-bold ${
            isDark ? "text-white" : "text-gray-800"
          }`}
        >
          Select Date Range
        </Text>

        {/* START DATE */}
        <View>
          <Text className={`mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            Start Date
          </Text>
          <TouchableOpacity
            onPress={() => showPicker("start")}
            className={`flex-row items-center border rounded-xl p-3 ${
              isDark
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-300"
            }`}
            activeOpacity={0.7}
          >
            <Calendar size={20} color="#3B82F6" />
            <Text
              className={`ml-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
            >
              {formData.startDate
                ? formatDate(formData.startDate)
                : "Select start date"}
            </Text>
          </TouchableOpacity>
          {errors.startDate ? (
            <Text className="text-red-500 text-sm mt-1">
              {errors.startDate}
            </Text>
          ) : null}
        </View>

        {/* END DATE */}
        <View>
          <Text className={`mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            End Date
          </Text>
          <TouchableOpacity
            onPress={() => showPicker("end")}
            className={`flex-row items-center border rounded-xl p-3 ${
              isDark
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-300"
            }`}
            activeOpacity={0.7}
          >
            <Calendar size={20} color="#3B82F6" />
            <Text
              className={`ml-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}
            >
              {formData.endDate
                ? formatDate(formData.endDate)
                : "Select end date"}
            </Text>
          </TouchableOpacity>
          {errors.endDate ? (
            <Text className="text-red-500 text-sm mt-1">{errors.endDate}</Text>
          ) : null}
        </View>

        <View
          className={`rounded-xl p-4 ${
            isDark ? "bg-blue-900/30" : "bg-blue-50"
          }`}
        >
          <Text
            className={`text-base font-semibold ${
              isDark ? "text-blue-300" : "text-blue-800"
            }`}
          >
            Total Leave Days: {formData.days}
          </Text>
        </View>
      </View>
    ),
    [
      formData.startDate,
      formData.endDate,
      formData.days,
      errors.startDate,
      errors.endDate,
      isDark,
      showPicker,
      formatDate,
    ]
  );

  const renderStepThree = useMemo(
    () => (
      <View className="space-y-6">
        <Text
          className={`text-lg font-bold ${
            isDark ? "text-white" : "text-gray-800"
          }`}
        >
          Application Details
        </Text>

        <View>
          <Text className={`mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            Reason for Leave
          </Text>
          <TextInput
            multiline
            textAlignVertical="top"
            className={`border rounded-xl p-4 h-32 ${
              isDark
                ? "bg-gray-800 border-gray-700 text-white"
                : "bg-white border-gray-300 text-gray-700"
            }`}
            placeholder="Write your reason..."
            placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
            value={formData.reason}
            onChangeText={(v) => handleInputChange("reason", v)}
            maxLength={500}
          />
          {errors.reason ? (
            <Text className="text-red-500 text-sm mt-1">{errors.reason}</Text>
          ) : null}
        </View>

        <View>
          <Text className={`mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            Supporting Documents (Optional, Max 2MB)
          </Text>
          <TouchableOpacity
            className={`flex-row items-center justify-center border-2 border-dashed rounded-xl p-6 ${
              isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-300"
            }`}
            onPress={handleDocumentUpload}
            activeOpacity={0.7}
          >
            <Upload size={24} color="#3B82F6" />
            <Text className="ml-2 text-blue-600 font-medium">
              Upload Document
            </Text>
          </TouchableOpacity>

          {formData.documents.length > 0 && (
            <View className="mt-3">
              <Text
                className={`text-sm mb-2 ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Uploaded Documents:
              </Text>
              {formData.documents.map((doc, i) => (
                <View
                  key={`doc-${i}`}
                  className={`flex-row items-center rounded-lg p-3 mb-2 ${
                    isDark ? "bg-gray-700" : "bg-gray-100"
                  }`}
                >
                  <CheckCircle size={16} color="#10B981" />
                  <Text
                    className={`ml-2 flex-1 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                    numberOfLines={1}
                  >
                    {doc}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    ),
    [
      formData.reason,
      formData.documents,
      errors.reason,
      isDark,
      handleInputChange,
      handleDocumentUpload,
    ]
  );

  const renderCurrentStep = () => {
    if (currentStep === 1) return renderStepOne;
    if (currentStep === 2) return renderStepTwo;
    return renderStepThree;
  };

  // ===========================
  // JSX RENDER
  // ===========================

  return (
    <View className={`flex-1 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={isDark ? ["#1E3A8A", "#1E40AF"] : ["#3B82F6", "#60A5FA"]}
        className="px-6 pb-6 rounded-b-3xl"
        style={{ paddingTop: insets.top + 24 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={handleSafeBack}
              className="mr-4 p-1"
              activeOpacity={0.7}
            >
              <ChevronLeft color="white" size={24} />
            </TouchableOpacity>
            <View>
              <Text className="text-white text-xl font-bold">
                Leave Application
              </Text>
              <Text className="text-blue-100 text-sm mt-1">
                Step {currentStep} of {TOTAL_STEPS}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSafeBack}
            className="p-1"
            activeOpacity={0.7}
          >
            <X color="white" size={24} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Progress Bar */}
      <View className={`h-1 ${isDark ? "bg-gray-700" : "bg-gray-200"}`}>
        <View
          className="h-1 bg-blue-500 rounded-r"
          style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
        />
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100, minHeight: "101%" }}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        <View className="p-4">
          <View
            className={`rounded-2xl p-5 shadow-sm ${
              isDark ? "bg-gray-800" : "bg-white"
            }`}
          >
            {renderCurrentStep()}
          </View>
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View
        className={`flex-row justify-between p-4 border-t ${
          isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <TouchableOpacity
          onPress={handlePrevious}
          disabled={currentStep === 1}
          className={`flex-row items-center px-5 py-3 rounded-xl ${
            currentStep === 1
              ? isDark
                ? "bg-gray-700"
                : "bg-gray-100"
              : isDark
                ? "bg-gray-600"
                : "bg-gray-200"
          }`}
          activeOpacity={0.7}
        >
          <ChevronLeft
            size={20}
            color={
              currentStep === 1 ? "#9CA3AF" : isDark ? "#FFFFFF" : "#1F2937"
            }
          />
          <Text
            className={`ml-1 font-medium ${
              currentStep === 1
                ? isDark
                  ? "text-gray-500"
                  : "text-gray-500"
                : isDark
                  ? "text-white"
                  : "text-gray-800"
            }`}
          >
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          disabled={isSubmitting}
          className={`flex-row items-center px-5 py-3 bg-blue-500 rounded-xl ${isSubmitting ? 'opacity-50' : ''}`}
          activeOpacity={0.7}
        >
           {isSubmitting ? (
             <ActivityIndicator size="small" color="#FFFFFF" />
           ) : (
            <>
              <Text className="font-medium text-white">
                {currentStep === TOTAL_STEPS ? "Submit" : "Next"}
              </Text>
              <ChevronRight size={20} color="#FFFFFF" />
            </>
           )}
        </TouchableOpacity>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onDateChange}
          minimumDate={minimumDate}
        />
      )}
    </View>
  );
}