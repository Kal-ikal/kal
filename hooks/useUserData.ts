import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export type Employee = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  position: string; // Changed from job_title
  department: string;
  join_date: string;
  avatar_url?: string;
  role: string; // Added role
  phone_number?: string; // Added phone_number
  address?: string; // Added address, though we know it might be missing
};

export type LeaveBalance = {
  id: string;
  employee_id: string;
  leave_type: string;
  total_allocation: number;
  used_amount: number;
  remaining_amount: number;
  year: number;
};

export type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'Dalam Proses' | 'Disetujui' | 'Ditolak';
  created_at: string;
};

export const useUserData = () => {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Fetch Employee Profile linked to Auth User
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (empError) {
        console.error('Error fetching employee:', empError);
        // If employee not found, we can't fetch balances/history
        setEmployee(null);
        setBalances([]);
        setHistory([]);
      } else {
        setEmployee(empData);

        if (empData?.id) {
          // 2. Fetch Leave Balances
          const { data: balData, error: balError } = await supabase
            .from('leave_balances')
            .select('*')
            .eq('employee_id', empData.id);

          if (balError) console.error('Error fetching balances:', balError);
          setBalances(balData || []);

          // 3. Fetch Leave History (Requests)
          const { data: histData, error: histError } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('employee_id', empData.id)
            .order('created_at', { ascending: false });

          if (histError) console.error('Error fetching history:', histError);
          setHistory(histData || []);
        }
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
    employee,
    balances,
    history,
    loading,
    refetch: fetchUserData,
  };
};