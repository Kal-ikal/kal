// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/services/leaveService.ts
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ FIXED: Menggunakan RPC functions dari Supabase
// ===========================================================

import { supabase } from '@/lib/supabase';
import type {
  LeaveRequest,
  LeaveType,
  Profile,
  ApprovalStage,
  PublicHoliday,
} from '@/types/database';

// ===========================================================
// TYPES FOR RPC CALLS
// ===========================================================

/**
 * Parameters for rpc_submit_leave_request RPC function
 * Matches Supabase function signature
 */
export interface SubmitLeaveRequestRPCParams {
  p_start_date: string;      // date format: YYYY-MM-DD
  p_end_date: string;        // date format: YYYY-MM-DD
  p_reason: string;
  p_leave_type_id: string;   // UUID of leave type
  p_document_url?: string;   // Optional document URL
}

/**
 * Parameters for approve_leave_request RPC function
 * Matches Supabase function signature
 */
export interface ApproveLeaveRequestRPCParams {
  request_id: string;        // UUID of leave request
  user_uuid: string;         // UUID of approver
  // Additional params might be needed based on your function definition
}

/**
 * Parameters for reject (if using custom logic, not RPC)
 */
export interface RejectLeaveRequestParams {
  requestId: string;
  approverId: string;
  reason?: string;
}

// ===========================================================
// HELPER FUNCTIONS
// ===========================================================

/**
 * Determine initial approval stage based on user role and manager_id
 * This is used for display purposes - actual logic is in RPC
 */
export const determineInitialStage = (profile: Profile): ApprovalStage => {
  switch (profile.role) {
    case 'employee':
      // Employee with manager goes to manager first
      return profile.manager_id ? 'manager' : 'dfd';
    case 'manager':
      // Manager skips manager approval, goes to DFD
      return 'dfd';
    case 'dfd':
      // DFD goes directly to HRD
      return 'hrd';
    case 'hrd':
      // HRD can self-approve (directly completed)
      return 'completed';
    default:
      return 'manager';
  }
};

// ===========================================================
// SUBMIT LEAVE REQUEST - USING RPC
// ===========================================================

/**
 * Submit leave request using Supabase RPC function
 * This calls rpc_submit_leave_request which handles:
 * - Auto-determine current_stage based on user role
 * - Insert to leave_requests table
 * - Return the created request
 */
export const submitLeaveRequest = async (params: {
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  leaveTypeId: string;
  documentUrl?: string;
}): Promise<{ success: boolean; data?: LeaveRequest; error?: string }> => {
  try {
    // Call the RPC function
    const { data, error } = await supabase.rpc('rpc_submit_leave_request', {
      p_start_date: params.startDate,
      p_end_date: params.endDate,
      p_reason: params.reason,
      p_leave_type_id: params.leaveTypeId,
      p_document_url: params.documentUrl || null,
    });

    if (error) {
      console.error('RPC submit error:', error);
      return { success: false, error: error.message };
    }

    // RPC returns jsonb, parse if needed
    const result = typeof data === 'string' ? JSON.parse(data) : data;

    return { success: true, data: result };
  } catch (err: any) {
    console.error('Unexpected error in submitLeaveRequest:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
};

/**
 * Alternative: Direct insert for submit (fallback if RPC not available)
 * Use this only if rpc_submit_leave_request is not working
 */
export const submitLeaveRequestDirect = async (params: {
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  leaveTypeId: string;
  userRole: string;
  managerId?: string | null;
  documentUrl?: string;
}): Promise<{ success: boolean; data?: LeaveRequest; error?: string }> => {
  try {
    // Determine initial stage based on role
    const initialStage = determineInitialStageFromRole(params.userRole, params.managerId);

    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        user_id: params.userId,
        start_date: params.startDate,
        end_date: params.endDate,
        reason: params.reason,
        leave_type_id: params.leaveTypeId,
        status: 'pending',
        current_stage: initialStage,
        approved_by_manager: false,
        approved_by_dfd: false,
        approved_by_hrd: false,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Unexpected error in submitLeaveRequestDirect:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
};

/**
 * Helper to determine stage from role string
 */
const determineInitialStageFromRole = (role: string, managerId?: string | null): ApprovalStage => {
  switch (role) {
    case 'employee':
      return managerId ? 'manager' : 'dfd';
    case 'manager':
      return 'dfd';
    case 'dfd':
      return 'hrd';
    case 'hrd':
      return 'completed';
    default:
      return 'manager';
  }
};

// ===========================================================
// APPROVE LEAVE REQUEST - USING RPC
// ===========================================================

/**
 * Approve leave request using Supabase RPC function
 * This calls approve_leave_request which handles:
 * - Advance current_stage
 * - Update approved_by_* flags
 * - Deduct leave balance if is_quota_deduction
 * - Trigger notification
 */
export const approveLeaveRequest = async (params: {
  requestId: string;
  approverId: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.rpc('approve_leave_request', {
      request_id: params.requestId,
      user_uuid: params.approverId,
    });

    if (error) {
      console.error('RPC approve error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in approveLeaveRequest:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
};

// ===========================================================
// REJECT LEAVE REQUEST
// ===========================================================

/**
 * Reject leave request
 * Note: Using direct update since there's no reject RPC in the list
 */
export const rejectLeaveRequest = async (params: RejectLeaveRequestParams): Promise<{ success: boolean; error?: string }> => {
  try {
    // Update the request status to rejected
    const { error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: 'rejected',
      })
      .eq('id', params.requestId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Log activity (optional - if activity_logs table exists)
    try {
      const { data: approverProfile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', params.approverId)
        .single();

      const { data: request } = await supabase
        .from('leave_requests')
        .select('user_id, reason, profiles!leave_requests_user_id_fkey(full_name)')
        .eq('id', params.requestId)
        .single();

      if (approverProfile) {
        await supabase.from('activity_logs').insert({
          user_email: approverProfile.email,
          action_type: 'REJECT_LEAVE',
          description: `Menolak cuti ${(request?.profiles as any)?.full_name || 'Unknown'}: ${params.reason || request?.reason || '-'}`,
        });
      }
    } catch (logError) {
      // Logging is optional, don't fail the main operation
      console.warn('Failed to log activity:', logError);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in rejectLeaveRequest:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
};

// ===========================================================
// ENCASHMENT REQUEST
// ===========================================================

/**
 * Submit encashment request (special leave type)
 * Uses prefix "ENCASHMENT:" in reason to trigger fn_process_encashment_approval
 */
export const submitEncashmentRequest = async (params: {
  userId: string;
  daysToConvert: number;
  amount: number;
}): Promise<{ success: boolean; data?: LeaveRequest; error?: string }> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get Cuti Tahunan leave type (for encashment)
    const { data: leaveType } = await supabase
      .from('leave_types')
      .select('id')
      .eq('code', 'CT')
      .single();

    if (!leaveType) {
      return { success: false, error: 'Leave type CT not found' };
    }

    // Reason format that triggers encashment processing
    const reason = `ENCASHMENT:${params.daysToConvert}:${params.amount}`;

    // Use direct insert for encashment (HRD approval stage)
    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        user_id: params.userId,
        start_date: today,
        end_date: today,
        reason: reason,
        leave_type_id: leaveType.id,
        status: 'pending',
        current_stage: 'hrd', // Encashment goes directly to HRD
        approved_by_manager: false,
        approved_by_dfd: false,
        approved_by_hrd: false,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Unexpected error in submitEncashmentRequest:', err);
    return { success: false, error: err.message || 'Unknown error' };
  }
};

// ===========================================================
// FETCH HELPERS
// ===========================================================

/**
 * Get public holidays for a date range
 */
export const getPublicHolidays = async (
  startDate: string,
  endDate: string
): Promise<PublicHoliday[]> => {
  try {
    const { data, error } = await supabase
      .from('public_holidays')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching public holidays:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching public holidays:', err);
    return [];
  }
};

/**
 * Calculate working days between two dates
 * Excludes weekends (Saturday, Sunday) and public holidays
 */
export const calculateWorkingDays = async (
  startDate: string,
  endDate: string
): Promise<number> => {
  try {
    const holidays = await getPublicHolidays(startDate, endDate);
    const holidayDates = new Set(holidays.map(h => h.date));

    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;

    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().split('T')[0];

      // Skip weekends (0 = Sunday, 6 = Saturday) and holidays
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
        workingDays++;
      }

      current.setDate(current.getDate() + 1);
    }

    return workingDays;
  } catch (err) {
    console.error('Error calculating working days:', err);
    // Fallback: simple day count
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }
};

/**
 * Get all leave types
 */
export const getLeaveTypes = async (): Promise<LeaveType[]> => {
  try {
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching leave types:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching leave types:', err);
    return [];
  }
};

/**
 * Get user's leave requests with leave type info
 */
export const getUserLeaveRequests = async (userId: string): Promise<LeaveRequest[]> => {
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        leave_types (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leave requests:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching leave requests:', err);
    return [];
  }
};

/**
 * Get single leave request with full details
 */
export const getLeaveRequestById = async (requestId: string) => {
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .select(`
        *,
        leave_types (*),
        profiles!leave_requests_user_id_fkey (*)
      `)
      .eq('id', requestId)
      .single();

    if (error) {
      console.error('Error fetching leave request:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error fetching leave request:', err);
    return null;
  }
};
