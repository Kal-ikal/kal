// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/services/leaveService.ts
// 📝 Aksi: CREATE or REPLACE
// ✅ V5: Clean service layer for leave operations
// ===========================================================

import { supabase } from '@/lib/supabase';
import type { 
  ServiceResult, 
  SubmitLeaveRequestParams,
  EncashmentRequestParams,
  LeaveRequest,
} from '@/types/database';

// ===========================================================
// Submit Leave Request
// ===========================================================

export async function submitLeaveRequest(
  params: SubmitLeaveRequestParams
): Promise<ServiceResult<LeaveRequest>> {
  try {
    const { userId, startDate, endDate, reason, leaveTypeId, documentUrl } = params;

    // Get user profile to determine approval flow
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, manager_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Gagal mengambil data profil' };
    }

    // Determine first approval stage based on role
    let currentStage: 'manager' | 'dfd' | 'hrd' = 'manager';
    if (profile.role === 'manager') {
      currentStage = 'dfd';
    } else if (profile.role === 'dfd') {
      currentStage = 'hrd';
    }

    // Insert leave request
    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        user_id: userId,
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        reason: reason,
        status: 'pending',
        current_stage: currentStage,
        document_url: documentUrl || null,
        approved_by_manager: false,
        approved_by_dfd: false,
        approved_by_hrd: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting leave request:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Unexpected error in submitLeaveRequest:', message);
    return { success: false, error: message };
  }
}

// ===========================================================
// Submit Encashment Request (Leave Conversion)
// ===========================================================

export async function submitEncashmentRequest(
  params: EncashmentRequestParams
): Promise<ServiceResult> {
  try {
    const { userId, daysToConvert, amount } = params;

    // Get Cuti Tahunan (CT) leave type
    const { data: leaveType, error: typeError } = await supabase
      .from('leave_types')
      .select('id')
      .eq('code', 'CT')
      .single();

    if (typeError || !leaveType) {
      return { success: false, error: 'Jenis cuti tahunan tidak ditemukan' };
    }

    // Create encashment request as a special leave request
    const today = new Date().toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('leave_requests')
      .insert({
        user_id: userId,
        leave_type_id: leaveType.id,
        start_date: today,
        end_date: today,
        reason: `ENCASHMENT: Request to convert ${daysToConvert} days. Est: ${formatCurrency(amount)}`,
        status: 'pending',
        current_stage: 'hrd', // Encashment goes directly to HRD
        document_url: null,
        approved_by_manager: false,
        approved_by_dfd: false,
        approved_by_hrd: false,
      });

    if (error) {
      console.error('Error submitting encashment request:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Unexpected error in submitEncashmentRequest:', message);
    return { success: false, error: message };
  }
}

// ===========================================================
// Approve Leave Request
// ===========================================================

export async function approveLeaveRequest(
  requestId: string,
  approverId: string
): Promise<ServiceResult> {
  try {
    // Get current request state
    const { data: request, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*, profiles!leave_requests_user_id_fkey(role)')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { success: false, error: 'Pengajuan tidak ditemukan' };
    }

    // Get approver role
    const { data: approver, error: approverError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', approverId)
      .single();

    if (approverError || !approver) {
      return { success: false, error: 'Data approver tidak ditemukan' };
    }

    // Determine next stage and update fields
    const updates: Record<string, unknown> = {};
    
    if (approver.role === 'manager' && request.current_stage === 'manager') {
      updates.approved_by_manager = true;
      updates.current_stage = 'dfd';
    } else if (approver.role === 'dfd' && request.current_stage === 'dfd') {
      updates.approved_by_dfd = true;
      updates.current_stage = 'hrd';
    } else if (approver.role === 'hrd' && request.current_stage === 'hrd') {
      updates.approved_by_hrd = true;
      updates.current_stage = 'completed';
      updates.status = 'approved';
    } else {
      return { success: false, error: 'Anda tidak memiliki wewenang untuk menyetujui permintaan ini' };
    }

    // Update request
    const { error: updateError } = await supabase
      .from('leave_requests')
      .update(updates)
      .eq('id', requestId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// ===========================================================
// Reject Leave Request
// ===========================================================

export async function rejectLeaveRequest(
  requestId: string,
  approverId: string,
  rejectionReason?: string
): Promise<ServiceResult> {
  try {
    // Get approver role
    const { data: approver, error: approverError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', approverId)
      .single();

    if (approverError || !approver) {
      return { success: false, error: 'Data approver tidak ditemukan' };
    }

    // Update request to rejected
    const { error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: 'rejected',
        current_stage: 'completed',
        reason: rejectionReason 
          ? `DITOLAK: ${rejectionReason}` 
          : undefined,
      })
      .eq('id', requestId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// ===========================================================
// Cancel Leave Request (by employee)
// ===========================================================

export async function cancelLeaveRequest(
  requestId: string,
  userId: string
): Promise<ServiceResult> {
  try {
    // Verify ownership
    const { data: request, error: fetchError } = await supabase
      .from('leave_requests')
      .select('user_id, status')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return { success: false, error: 'Pengajuan tidak ditemukan' };
    }

    if (request.user_id !== userId) {
      return { success: false, error: 'Anda tidak dapat membatalkan pengajuan ini' };
    }

    if (request.status !== 'pending') {
      return { success: false, error: 'Hanya pengajuan dengan status pending yang dapat dibatalkan' };
    }

    // Delete the request
    const { error: deleteError } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', requestId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

// ===========================================================
// Helper Functions
// ===========================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
