// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/hooks/useUserData.ts
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ V5: Fixed all TypeScript warnings, proper null handling
// ===========================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { 
  Profile, 
  LeaveType, 
  LeaveRequestWithType,
  Notification,
  LeaveBalanceUI,
  LeaveBalanceItem,
  Department,
} from '@/types/database';
import { calculateDays } from '@/utils/formatters';

// ===========================================================
// MAIN HOOK: useUserData
// ===========================================================

export function useUserData() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [employee, setEmployee] = useState<Profile | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [history, setHistory] = useState<LeaveRequestWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all user data
  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Parallel fetch for better performance
      const [profileResult, typesResult, historyResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        supabase
          .from('leave_types')
          .select('*')
          .order('name'),
        supabase
          .from('leave_requests')
          .select(`*, leave_types (*)`)
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      if (profileResult.error) {
        console.error('Error fetching profile:', profileResult.error);
        setError(profileResult.error.message);
      } else {
        setEmployee(profileResult.data);
      }

      if (typesResult.error) {
        console.error('Error fetching leave types:', typesResult.error);
      } else {
        setLeaveTypes(typesResult.data || []);
      }

      if (historyResult.error) {
        console.error('Error fetching history:', historyResult.error);
      } else {
        setHistory(historyResult.data || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Unexpected error in fetchData:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // =========================================================
  // Calculate leave balance - SINGLE OBJECT VERSION
  // Used by: home.tsx, profile.tsx
  // =========================================================
  const getLeaveBalanceUI = useCallback((): LeaveBalanceUI => {
    const defaultBalance: LeaveBalanceUI = { total: 12, used: 0, remaining: 12 };
    
    if (!employee) {
      return defaultBalance;
    }

    const currentYear = new Date().getFullYear();
    
    // Get approved requests that deduct quota
    const approvedWithQuota = history.filter(req => {
      const isApproved = req.status === 'approved';
      const isThisYear = new Date(req.start_date).getFullYear() === currentYear;
      const deductsQuota = req.leave_types?.is_quota_deduction === true;
      return isApproved && isThisYear && deductsQuota;
    });

    // Calculate days used
    const daysUsed = approvedWithQuota.reduce((sum, req) => {
      return sum + calculateDays(req.start_date, req.end_date);
    }, 0);

    // Use leave_balance from profile as remaining
    const remaining = employee.leave_balance ?? 12;
    const total = remaining + daysUsed;

    return { total, used: daysUsed, remaining };
  }, [employee, history]);

  // =========================================================
  // Calculate leave balance - ARRAY VERSION
  // Used by: konversi.tsx (maps over leave types from master data)
  // =========================================================
  const getLeaveBalanceArray = useCallback((): LeaveBalanceItem[] => {
    if (!employee || leaveTypes.length === 0) {
      return [];
    }

    const currentYear = new Date().getFullYear();
    const result: LeaveBalanceItem[] = [];

    leaveTypes.forEach(leaveType => {
      // Calculate used days for this specific leave type
      const usedDays = history.filter(req => {
        const isApproved = req.status === 'approved';
        const isThisYear = new Date(req.start_date).getFullYear() === currentYear;
        const isThisType = req.leave_type_id === leaveType.id;
        return isApproved && isThisYear && isThisType;
      }).reduce((sum, req) => {
        return sum + calculateDays(req.start_date, req.end_date);
      }, 0);

      let total: number;
      let remaining: number;

      if (leaveType.is_quota_deduction) {
        // Main annual leave - use profile's leave_balance
        remaining = employee.leave_balance ?? 12;
        total = remaining + usedDays;
      } else {
        // Non-quota types - use max_days
        total = leaveType.max_days ?? 0;
        remaining = Math.max(0, total - usedDays);
      }

      result.push({
        id: leaveType.id,
        type: leaveType.name,
        code: leaveType.code,
        total,
        used: usedDays,
        remaining,
        isQuotaDeduction: leaveType.is_quota_deduction,
        maxDays: leaveType.max_days,
      });
    });

    return result;
  }, [employee, history, leaveTypes]);

  return {
    employee,
    profile: employee, // Alias for backward compatibility
    leaveTypes,
    history,
    loading,
    error,
    refetch: fetchData,
    getLeaveBalanceUI,
    getLeaveBalanceArray,
  };
}

// ===========================================================
// useLeaveTypes - Fetch leave types only
// ===========================================================

export function useLeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaveTypes = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('leave_types')
        .select('*')
        .order('name');

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setLeaveTypes(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaveTypes();
  }, [fetchLeaveTypes]);

  return { leaveTypes, loading, error, refetch: fetchLeaveTypes };
}

// ===========================================================
// useDepartments - Fetch departments from master data
// ===========================================================

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setDepartments(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return { departments, loading, error, refetch: fetchDepartments };
}

// ===========================================================
// usePendingApprovals - For managers/dfd/hrd
// ===========================================================

export function usePendingApprovals() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [approvals, setApprovals] = useState<LeaveRequestWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get user's role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types (*),
          profiles!leave_requests_user_id_fkey (
            id, full_name, email, department
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Filter by role and current_stage
      if (profile.role === 'manager') {
        query = query.eq('current_stage', 'manager');
      } else if (profile.role === 'dfd') {
        query = query.eq('current_stage', 'dfd');
      } else if (profile.role === 'hrd') {
        query = query.eq('current_stage', 'hrd');
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setApprovals(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchApprovals();

    // Realtime subscription
    const channel = supabase
      .channel('pending-approvals')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'leave_requests',
      }, () => {
        fetchApprovals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchApprovals]);

  return { approvals, loading, error, refetch: fetchApprovals };
}

// ===========================================================
// useNotifications
// ===========================================================

export function useNotifications() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        setError(fetchError.message);
      } else {
        const notifs = data || [];
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.is_read).length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    fetchNotifications();
  }, [userId, fetchNotifications]);

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription
    if (userId) {
      const channel = supabase
        .channel('notifications-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, () => {
          fetchNotifications();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [fetchNotifications, userId]);

  return { 
    notifications, 
    loading, 
    error, 
    unreadCount,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
