// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/types/database.ts
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ COMPLETE: All types matching Supabase schema
// ===========================================================

// ===========================================================
// ENUMS
// ===========================================================

export type UserRole = 'employee' | 'manager' | 'dfd' | 'hrd';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalStage = 'manager' | 'dfd' | 'hrd' | 'completed';
export type ProfileStatus = 'active' | 'inactive';
export type PayrollStatus = 'draft' | 'processed' | 'paid';

// ===========================================================
// BASE TYPES - Match Supabase Tables
// ===========================================================

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  department: string | null;
  role: UserRole;
  manager_id: string | null;
  created_at: string;
  leave_balance: number | null;
  join_date: string | null;
  status: ProfileStatus;
  avatar_url: string | null;
  phone: string | null;
  basic_salary: number | null;
  bank_account: string | null;
  position_allowance: number | null;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  head_id: string | null;
  created_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  is_quota_deduction: boolean;
  requires_file: boolean;
  badge_color: string | null;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: LeaveStatus;
  current_stage: ApprovalStage;
  approved_by_manager: boolean;
  approved_by_dfd: boolean;
  approved_by_hrd: boolean;
  created_at: string;
  leave_type_id: string;
  document_url?: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Payroll {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  status: PayrollStatus;
  created_at: string;
}

export interface PublicHoliday {
  id: string;
  date: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_email: string;
  action_type: string;
  description: string;
  created_at: string;
  metadata?: Record<string, any>;
}

// ===========================================================
// JOINED/EXTENDED TYPES
// ===========================================================

export interface LeaveRequestWithType extends LeaveRequest {
  leave_types: LeaveType | null;
}

export interface LeaveRequestWithUser extends LeaveRequest {
  profiles: Profile | null;
}

export interface LeaveRequestFull extends LeaveRequest {
  leave_types: LeaveType | null;
  profiles: Profile | null;
}

export interface ProfileWithManager extends Profile {
  manager: Profile | null;
}

// ===========================================================
// INSERT/UPDATE TYPES
// ===========================================================

export interface LeaveRequestInsert {
  user_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  leave_type_id: string;
  status?: LeaveStatus;
  current_stage?: ApprovalStage;
  document_url?: string;
}

export interface NotificationInsert {
  user_id: string;
  title: string;
  message: string;
  is_read?: boolean;
}

export interface ProfileUpdate {
  full_name?: string;
  department?: string;
  phone?: string;
  avatar_url?: string;
  leave_balance?: number;
  basic_salary?: number;
  position_allowance?: number;
}

// ===========================================================
// UI HELPER TYPES
// ===========================================================

/**
 * Leave balance for UI display
 * SIMPLE VERSION - just 3 numbers
 */
export interface LeaveBalanceUI {
  map(arg0: (balance: any) => { type: any; days: any; used: any; eligible: number; ratePerDay: number; }): any;
  total: number;
  used: number;
  remaining: number;
}

/**
 * Upcoming leave item for UI
 */
export interface UpcomingLeaveUI {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  color: string;
}

/**
 * Pending approval item for managers
 */
export interface PendingApprovalItem {
  id: string;
  employeeName: string;
  employeeDepartment: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  currentStage: ApprovalStage;
  createdAt: string;
}

// ===========================================================
// RPC PARAMETER TYPES
// ===========================================================

/**
 * Parameters for rpc_submit_leave_request
 */
export interface SubmitLeaveRequestParams {
  p_start_date: string;
  p_end_date: string;
  p_reason: string;
  p_leave_type_id: string;
  p_document_url?: string | null;
}

/**
 * Parameters for approve_leave_request
 */
export interface ApproveLeaveRequestParams {
  request_id: string;
  user_uuid: string;
}

// ===========================================================
// ROUTE TYPES - For type-safe navigation
// ===========================================================

/**
 * App routes for type-safe navigation
 */
export type AppRoute = 
  | '/'
  | '/(app)/home'
  | '/(app)/profile'
  | '/(app)/pengajuan'
  | '/(app)/konversi'
  | '/(app)/settings'
  | '/(modals)/notifications'
  | '/(modals)/leave-history'
  | '/(modals)/notification-detail'
  | '/(modals)/reminder-detail';

// ===========================================================
// LEGACY COMPATIBILITY
// ===========================================================

/**
 * Legacy LeaveBalance type for backward compatibility
 * @deprecated Use LeaveBalanceUI instead
 */
export interface LeaveBalance {
  annual: number;
  sick: number;
  personal: number;
}
