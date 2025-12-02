import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export type UserProfile = {
  id: string; // user_id
  full_name: string;
  department: string;
  role: string;
  leave_balance: number;
  basic_salary: number;
  join_date: string;
  status: string;
  avatar_url?: string;
  email?: string; // Optional, usually from auth
};

export type LeaveRequest = {
  id: string;
  user_id: string;
  leave_type: string; // or joined object
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  leave_types?: {
    name: string;
    code: string;
    badge_color: string;
  };
};

export const useUserData = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setProfile(null);
      } else {
        setProfile({ ...profileData, email: user.email });
      }

      // 2. Fetch History (Requests)
      // Note: We join leave_types to get color and name if needed
      const { data: histData, error: histError } = await supabase
        .from('leave_requests')
        .select('*, leave_types(name, code, badge_color)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (histError) {
        console.error('Error fetching history:', histError);
      } else {
        setHistory(histData || []);
      }

    } catch (err) {
      console.error('Unexpected error in useUserData:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  return {
    profile,
    history,
    loading,
    refetch: fetchUserData,
  };
};
