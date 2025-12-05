// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/hooks/useUserData.ts
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ FIXED: Proper types, exports both 'employee' and 'profile'
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

      // Fetch leave types
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

  // Calculate leave balance for UI - returns LeaveBalanceUI type
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
    getLeaveBalanceUI,
  };
}

// ===========================================================
// ADDITIONAL HOOKS
// ===========================================================

/**
 * Hook untuk fetch leave types saja
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

      // First get user's role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      // Build query based on role
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types (*),
          profiles!leave_requests_user_id_fkey (*)
        `)
        .eq('status', 'pending');

      // Filter by current_stage based on role
      switch (profile.role) {
        case 'manager':
          query = query.eq('current_stage', 'manager');
          break;
        case 'dfd':
          query = query.eq('current_stage', 'dfd');
          break;
        case 'hrd':
          query = query.eq('current_stage', 'hrd');
          break;
        default:
          // Regular employees don't have pending approvals to review
          setApprovals([]);
          setLoading(false);
          return;
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: true });

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
  }, [fetchApprovals]);

  // Setup realtime subscription
  useEffect(() => {
    if (!userId) return;

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
          // Refetch on any change to leave_requests
          fetchApprovals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchApprovals]);

  return { approvals, loading, error, refetch: fetchApprovals };
}

/**
 * Hook untuk notifications dengan realtime
 */
export function useNotifications() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
      } else {
        setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.is_read).length || 0);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications-hook')
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
  }, [userId, fetchNotifications]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    loading,
    unreadCount,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}

// ===========================================================
// LEGACY EXPORTS FOR BACKWARD COMPATIBILITY
// ===========================================================

/**
 * Legacy LeaveBalance type for backward compatibility
 */
export interface LeaveBalance {
  annual: number;
  sick: number;
  personal: number;
}

// Default export
export default useUserData;
