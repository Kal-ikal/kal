// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/app/(app)/approvals.tsx
// 📝 Aksi: CREATE NEW FILE
// ✅ Phase 4: Approval Dashboard for Manager/DFD/HRD
// ===========================================================

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/NotificationToastContext";
import { useTheme } from "@/context/ThemeContext";
import { useScrollHandler } from "@/hooks/useScrollHandler";
import { supabase } from "@/lib/supabase";
import { calculateDays, formatDateID, getRoleLabel, getStatusColor } from "@/utils/formatters";
import { useScrollToTop } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  User,
  X,
  XCircle
} from "lucide-react-native";
import { cssInterop } from "nativewind";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

cssInterop(LinearGradient, { className: "style" });

interface PendingRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  current_stage: string;
  created_at: string;
  leave_types: {
    id: string;
    name: string;
    code: string;
  } | null;
  profiles: {
    id: string;
    full_name: string;
    email: string;
    department: string;
    avatar_url: string | null;
  } | null;
}

interface UserProfile {
  id: string;
  role: string;
  full_name: string;
}

export default function ApprovalsScreen() {
  const router = useRouter();
  void router;
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useTheme();
  const { session } = useAuth();
  const { onScroll } = useScrollHandler();
  const { showSuccess, showError } = useToast();

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PendingRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Fetch user profile
  const fetchProfile = useCallback(async () => {
    if (!session?.user?.id) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", session.user.id)
      .single();

    if (data) {
      setProfile(data);
    }
  }, [session?.user?.id]);

  // Fetch pending requests based on role
  const fetchRequests = useCallback(async () => {
    if (!session?.user?.id || !profile) return;

    try {
      setLoading(true);

      let query = supabase
        .from("leave_requests")
        .select(`
          *,
          leave_types (*),
          profiles!leave_requests_user_id_fkey (
            id, full_name, email, department, avatar_url
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      // Filter by current_stage based on role
      if (profile.role === "manager") {
        // Manager sees requests at 'manager' stage from their direct reports
        query = query.eq("current_stage", "manager");
        
        // Get direct reports (users where manager_id = current user)
        const { data: directReports } = await supabase
          .from("profiles")
          .select("id")
          .eq("manager_id", session.user.id);

        if (directReports && directReports.length > 0) {
          const reportIds = directReports.map(r => r.id);
          query = query.in("user_id", reportIds);
        } else {
          // No direct reports, return empty
          setRequests([]);
          setLoading(false);
          return;
        }
      } else if (profile.role === "dfd") {
        // DFD sees requests at 'dfd' stage
        query = query.eq("current_stage", "dfd");
      } else if (profile.role === "hrd") {
        // HRD sees requests at 'hrd' stage
        query = query.eq("current_stage", "hrd");
      } else {
        // Employee - no approval rights
        setRequests([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, profile]);

  // Initial load
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      fetchRequests();
    }
  }, [profile, fetchRequests]);

  // Realtime subscription
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel("approval-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leave_requests",
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, fetchRequests]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  }, [fetchRequests]);

  // Approve request
  const handleApprove = useCallback(
    async (request: PendingRequest) => {
      if (!profile) return;

      Alert.alert(
        "Setujui Pengajuan?",
        `Anda akan menyetujui pengajuan cuti dari ${request.profiles?.full_name}.`,
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Setujui",
            onPress: async () => {
              setProcessing(request.id);
              try {
                // Determine next stage
                let nextStage = "completed";
                let updates: any = {
                  [`approved_by_${profile.role}`]: true,
                };

                if (profile.role === "manager") {
                  nextStage = "hrd"; // Manager -> HRD (skip DFD for now based on data)
                } else if (profile.role === "dfd") {
                  nextStage = "hrd";
                } else if (profile.role === "hrd") {
                  nextStage = "completed";
                  updates.status = "approved";
                }

                updates.current_stage = nextStage;

                const { error } = await supabase
                  .from("leave_requests")
                  .update(updates)
                  .eq("id", request.id);

                if (error) throw error;

                // Create notification for requester
                await supabase.from("notifications").insert({
                  user_id: request.user_id,
                  title: nextStage === "completed" 
                    ? "✅ Pengajuan Disetujui" 
                    : "📋 Pengajuan Diproses",
                  message: nextStage === "completed"
                    ? `Pengajuan cuti Anda telah disetujui oleh ${getRoleLabel(profile.role)}.`
                    : `Pengajuan cuti Anda telah disetujui oleh ${getRoleLabel(profile.role)} dan diteruskan ke tahap berikutnya.`,
                  is_read: false,
                });

                // Log activity
                await supabase.from("activity_logs").insert({
                  user_email: session?.user?.email || "",
                  action_type: "APPROVE_LEAVE",
                  description: `${profile.role.toUpperCase()} menyetujui cuti ${request.profiles?.full_name}`,
                });

                showSuccess("Berhasil", "Pengajuan berhasil disetujui");
                fetchRequests();
              } catch (error: any) {
                console.error("Error approving:", error);
                showError("Gagal", error.message || "Gagal menyetujui pengajuan");
              } finally {
                setProcessing(null);
              }
            },
          },
        ]
      );
    },
    [profile, session?.user?.email, showSuccess, showError, fetchRequests]
  );

  // Open reject modal
  const openRejectModal = (request: PendingRequest) => {
    setSelectedRequest(request);
    setRejectReason("");
    setShowRejectModal(true);
  };

  // Reject request
  const handleReject = useCallback(async () => {
    if (!selectedRequest || !profile) return;

    setProcessing(selectedRequest.id);
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: "rejected",
          current_stage: "completed",
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      // Create notification for requester
      await supabase.from("notifications").insert({
        user_id: selectedRequest.user_id,
        title: "❌ Pengajuan Ditolak",
        message: rejectReason
          ? `Pengajuan cuti Anda ditolak oleh ${getRoleLabel(profile.role)}. Alasan: ${rejectReason}`
          : `Pengajuan cuti Anda ditolak oleh ${getRoleLabel(profile.role)}.`,
        is_read: false,
      });

      // Log activity
      await supabase.from("activity_logs").insert({
        user_email: session?.user?.email || "",
        action_type: "REJECT_LEAVE",
        description: `${profile.role.toUpperCase()} menolak cuti ${selectedRequest.profiles?.full_name}`,
      });

      showSuccess("Berhasil", "Pengajuan berhasil ditolak");
      setShowRejectModal(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      console.error("Error rejecting:", error);
      showError("Gagal", error.message || "Gagal menolak pengajuan");
    } finally {
      setProcessing(null);
    }
  }, [selectedRequest, profile, rejectReason, session?.user?.email, showSuccess, showError, fetchRequests]);

  // Check if user has approval rights
  const hasApprovalRights = profile?.role && ["manager", "dfd", "hrd"].includes(profile.role);

  if (!hasApprovalRights && !loading) {
    return (
      <View className={`flex-1 ${isDarkMode ? "bg-gray-900" : "bg-gray-100"}`}>
        <StatusBar style="light" />
        <LinearGradient
          colors={isDarkMode ? ["#1E3A8A", "#1E40AF"] : ["#3B82F6", "#2563EB"]}
          className="pb-6 rounded-b-3xl"
          style={{ paddingTop: insets.top + 16 }}
        >
          <View className="px-6">
            <Text className="text-white text-2xl font-bold">Persetujuan</Text>
            <Text className="text-blue-100 mt-1">Kelola pengajuan cuti</Text>
          </View>
        </LinearGradient>

        <View className="flex-1 items-center justify-center px-6">
          <AlertTriangle color="#F59E0B" size={64} />
          <Text className={`text-lg font-bold mt-4 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
            Akses Terbatas
          </Text>
          <Text className={`text-center mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            Anda tidak memiliki hak akses untuk menyetujui pengajuan cuti. Fitur ini hanya tersedia untuk Manager, DFD, dan HRD.
          </Text>
        </View>
      </View>
    );
  }

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
          <Text className="text-white text-2xl font-bold">Persetujuan</Text>
          <Text className="text-blue-100 mt-1">
            {profile?.role ? `${getRoleLabel(profile.role)} - ` : ""}
            {requests.length} pengajuan menunggu
          </Text>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-5 -mt-2"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDarkMode ? "#fff" : "#3B82F6"}
          />
        }
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className={`mt-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Memuat pengajuan...
            </Text>
          </View>
        ) : requests.length === 0 ? (
          <View className="py-20 items-center">
            <CheckCircle color="#10B981" size={64} />
            <Text className={`text-lg font-bold mt-4 ${isDarkMode ? "text-white" : "text-gray-800"}`}>
              Semua Beres!
            </Text>
            <Text className={`text-center mt-2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
              Tidak ada pengajuan yang menunggu persetujuan Anda.
            </Text>
          </View>
        ) : (
          requests.map((request) => (
            <View
              key={request.id}
              className={`mt-4 rounded-2xl p-5 ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
            >
              {/* Header */}
              <View className="flex-row items-center mb-4">
                <View className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center mr-3">
                  <User color="#3B82F6" size={24} />
                </View>
                <View className="flex-1">
                  <Text className={`font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
                    {request.profiles?.full_name || "Unknown"}
                  </Text>
                  <Text className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {request.profiles?.department || "N/A"}
                  </Text>
                </View>
                <View className="px-2 py-1 rounded"
                  style={request.status ? { backgroundColor: getStatusColor(request.status).bg + '20' } : {}}
                >
                  <Text
                    style={request.status ? { color: getStatusColor(request.status).text } : {}}
                    className="text-xs font-medium"
                  >
                    {request.leave_types?.code || "CT"}
                  </Text>
                </View>
              </View>

              {/* Details */}
              <View className={`p-3 rounded-xl mb-4 ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                <View className="flex-row items-center mb-2">
                  <Calendar color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={16} />
                  <Text className={`ml-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    {formatDateID(request.start_date)} - {formatDateID(request.end_date)}
                  </Text>
                </View>
                <View className="flex-row items-center mb-2">
                  <Clock color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={16} />
                  <Text className={`ml-2 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    {calculateDays(request.start_date, request.end_date)} hari
                  </Text>
                </View>
                <View className="flex-row items-start">
                  <FileText color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={16} />
                  <Text className={`ml-2 flex-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                    {request.reason || "Tidak ada alasan"}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-red-500"
                  onPress={() => openRejectModal(request)}
                  disabled={processing === request.id}
                >
                  {processing === request.id ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <XCircle color="white" size={18} />
                      <Text className="text-white font-bold ml-2">Tolak</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-green-500"
                  onPress={() => handleApprove(request)}
                  disabled={processing === request.id}
                >
                  {processing === request.id ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <CheckCircle color="white" size={18} />
                      <Text className="text-white font-bold ml-2">Setujui</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className={`${isDarkMode ? "bg-gray-800" : "bg-white"} rounded-t-3xl p-6`}
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                Tolak Pengajuan
              </Text>
              <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                <X color={isDarkMode ? "#9CA3AF" : "#6B7280"} size={24} />
              </TouchableOpacity>
            </View>

            <Text className={`mb-2 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
              Alasan Penolakan (opsional):
            </Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Contoh: Kuota cuti tidak mencukupi"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              className={`p-4 rounded-xl mb-4 ${isDarkMode ? "bg-gray-700 text-white" : "bg-gray-100 text-gray-900"}`}
              style={{ textAlignVertical: "top", minHeight: 100 }}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                className={`flex-1 py-4 rounded-xl items-center ${isDarkMode ? "bg-gray-700" : "bg-gray-200"}`}
                onPress={() => setShowRejectModal(false)}
              >
                <Text className={`font-bold ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Batal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 py-4 rounded-xl items-center bg-red-500"
                onPress={handleReject}
                disabled={processing !== null}
              >
                {processing !== null ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold">Tolak</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
