// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/hooks/useUserData.ts
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ FIXED V4: 
//    - Uses master data from database for leave types
//    - getLeaveBalanceArray uses actual leave_types from DB
//    - Handles departments dynamically
// ===========================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { 
  Profile, 
  LeaveType, 
  LeaveRequestWithType,
  Notification,
  LeaveBalanceUI 
} from '@/types/database';

// Type for array version (used by konversi.tsx)
export interface LeaveBalanceItem {
  id: string;
  type: string;
  code: string;
  total: number;
  used: number;
  remaining: number;
  isQuotaDeduction: boolean;
  maxDays: number | null;
}

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

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setError(profileError.message);
      } else {
        setEmployee(profileData);
      }

      // Fetch leave types from MASTER DATA
      const { data: typesData, error: typesError } = await supabase
        .from('leave_types')
        .select('*')
        .order('name');

      if (typesError) {
        console.error('Error fetching leave types:', typesError);
      } else {
        setLeaveTypes(typesData || []);
      }

      // Fetch leave history with types
      const { data: historyData, error: historyError } = await supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (historyError) {
        console.error('Error fetching history:', historyError);
      } else {
        setHistory(historyData || []);
      }
    } catch (err: any) {
      console.error('Unexpected error in fetchData:', err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // =========================================================
  // Calculate leave balance for UI - returns SINGLE OBJECT
  // Used by: home.tsx
  // =========================================================
  const getLeaveBalanceUI = useCallback((): LeaveBalanceUI => {
    // Default values
    const defaultBalance: LeaveBalanceUI = { total: 12, used: 0, remaining: 12 };
    
    if (!employee) {
      return defaultBalance;
    }

    // Get current year approved requests with quota deduction
    const currentYear = new Date().getFullYear();
    const approvedWithQuota = history.filter(req => {
      const isApproved = req.status?.toLowerCase() === 'approved';
      const isThisYear = new Date(req.start_date).getFullYear() === currentYear;
      const deductsQuota = req.leave_types?.is_quota_deduction === true;
      return isApproved && isThisYear && deductsQuota;
    });

    // Calculate days used
    const daysUsed = approvedWithQuota.reduce((sum, req) => {
      const start = new Date(req.start_date);
      const end = new Date(req.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

    // Use leave_balance from profile as remaining (already deducted by triggers)
    const remaining = employee.leave_balance ?? 12;
    const total = remaining + daysUsed;

    // Return object matching LeaveBalanceUI interface exactly
    const result: LeaveBalanceUI = {
      total: total,
      used: daysUsed,
      remaining: remaining,
    };

    return result;
  }, [employee, history]);

  // =========================================================
  // Calculate leave balance ARRAY - for konversi.tsx
  // ✅ FIXED: Uses actual leave_types from master data
  // =========================================================
  const getLeaveBalanceArray = useCallback((): LeaveBalanceItem[] => {
    if (!employee) {
      return [];
    }

    const currentYear = new Date().getFullYear();
    const result: LeaveBalanceItem[] = [];

    // Process each leave type from master data
    leaveTypes.forEach(leaveType => {
      // Calculate used days for this specific leave type
      const usedDays = history.filter(req => {
        const isApproved = req.status?.toLowerCase() === 'approved';
        const isThisYear = new Date(req.start_date).getFullYear() === currentYear;
        const isThisType = req.leave_type_id === leaveType.id;
        return isApproved && isThisYear && isThisType;
      }).reduce((sum, req) => {
        const start = new Date(req.start_date);
        const end = new Date(req.end_date);
        return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }, 0);

      // For quota deduction types (like CT/Annual), use actual balance from profile
      // For non-quota types, use max_days as total
      let total: number;
      let remaining: number;

      if (leaveType.is_quota_deduction) {
        // This is the main annual leave - use profile's leave_balance
        remaining = employee.leave_balance ?? 12;
        total = remaining + usedDays;
      } else {
        // Non-quota types (sick, maternity, etc) - use max_days
        total = leaveType.max_days ?? 0;
        remaining = total - usedDays;
      }

      result.push({
        id: leaveType.id,
        type: leaveType.name,
        code: leaveType.code,
        total: total,
        used: usedDays,
        remaining: Math.max(0, remaining),
        isQuotaDeduction: leaveType.is_quota_deduction,
        maxDays: leaveType.max_days,
      });
    });

    return result;
  }, [employee, history, leaveTypes]);

  // Return both 'employee' and 'profile' for backward compatibility
  return {
    // Primary export
    employee,
    // Alias for backward compatibility (settings.tsx uses 'profile')
    profile: employee,
    // Other data
    leaveTypes,
    history,
    loading,
    error,
    refetch: fetchData,
    // Single object version (for home.tsx)
    getLeaveBalanceUI,
    // Array version (for konversi.tsx) - now uses master data
    getLeaveBalanceArray,
  };
}

// ===========================================================
// ADDITIONAL HOOKS
// ===========================================================

/**
 * Hook untuk fetch leave types saja (from master data)
 */
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaveTypes();
  }, [fetchLeaveTypes]);

  return { leaveTypes, loading, error, refetch: fetchLeaveTypes };
}

/**
 * Hook untuk fetch departments (from master data)
 */
export function useDepartments() {
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return { departments, loading, error, refetch: fetchDepartments };
}

/**
 * Hook untuk pending approvals (untuk manager/dfd/hrd)
 */
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
      
      // Fetch user's role first
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
            id,
            full_name,
            email,
            department
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Filter based on role and current_stage
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchApprovals();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('pending-approvals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
        },
        () => {
          fetchApprovals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchApprovals]);

  return { approvals, loading, error, refetch: fetchApprovals };
}

/**
 * Hook untuk notifications
 */
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
        setNotifications(data || []);
        setUnreadCount((data || []).filter(n => !n.is_read).length);
      }
    } catch (err: any) {
      setError(err.message);
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

    // Subscribe to realtime changes
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
