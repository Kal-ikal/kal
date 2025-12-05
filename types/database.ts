// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/types/database.ts
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ FIXED V4: Proper LeaveBalanceUI type (no map method)
// ===========================================================

// ===========================================================
// ENUMS
// ===========================================================

export type UserRole = 'employee' | 'manager' | 'dfd' | 'hrd';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalStage = 'manager' | 'dfd' | 'hrd' | 'completed';
export type ProfileStatus = 'active' | 'inactive';
export type PayrollStatus = 'draft' | 'finalized';

// ===========================================================
// BASE TYPES (match Supabase tables exactly)
// ===========================================================

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  department: string;
  role: UserRole;
  manager_id: string | null;
  created_at: string;
  leave_balance: number;
  join_date: string | null;
  status: ProfileStatus;
  avatar_url: string | null;
  phone: string | null;
  basic_salary: number;
  bank_account: string | null;
  position_allowance: number;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  max_days: number | null;
  is_quota_deduction: boolean;
  requires_file: boolean;
  badge_color: string | null;
  description: string | null;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatus;
  document_url: string | null;
  current_stage: ApprovalStage;
  approved_by_manager: boolean;
  approved_by_dfd: boolean;
  approved_by_hrd: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  link_to: string | null;
  created_at: string;
}

export interface Payroll {
  id: string;
  user_id: string;
  period: string;
  basic_salary: number;
  position_allowance: number;
  leave_encashment: number;
  deductions: number;
  net_salary: number;
  status: PayrollStatus;
  created_at: string;
  updated_at: string;
}

export interface PublicHoliday {
  id: string;
  date: string;
  name: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_email: string;
  action_type: string;
  description: string;
  created_at: string;
}

// ===========================================================
// JOINED/EXTENDED TYPES
// ===========================================================

export interface LeaveRequestWithType extends LeaveRequest {
  leave_types?: LeaveType | null;
}

export interface LeaveRequestFull extends LeaveRequest {
  leave_types?: LeaveType | null;
  profiles?: Pick<Profile, 'id' | 'full_name' | 'email' | 'department'> | null;
}

export interface ProfileWithManager extends Profile {
  manager?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
}

// ===========================================================
// INSERT/UPDATE TYPES
// ===========================================================

export interface LeaveRequestInsert {
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status?: LeaveStatus;
  document_url?: string | null;
  current_stage?: ApprovalStage;
  approved_by_manager?: boolean;
  approved_by_dfd?: boolean;
  approved_by_hrd?: boolean;
}

export interface NotificationInsert {
  user_id: string;
  title: string;
  message: string;
  is_read?: boolean;
  link_to?: string | null;
}

export interface ProfileUpdate {
  full_name?: string;
  department?: string;
  phone?: string | null;
  avatar_url?: string | null;
  basic_salary?: number;
  bank_account?: string | null;
  position_allowance?: number;
  leave_balance?: number;
}

// ===========================================================
// UI TYPES
// ===========================================================

/**
 * Single object for leave balance display (home.tsx)
 * ✅ FIX: No map method - this is just a simple object
 */
export interface LeaveBalanceUI {
  total: number;
  used: number;
  remaining: number;
}

/**
 * Array item for leave balance (konversi.tsx)
 * Uses data from master data (leave_types table)
 */
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

export interface UpcomingLeaveUI {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveStatus;
}

export interface PendingApprovalItem {
  id: string;
  employeeName: string;
  employeeEmail: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  currentStage: ApprovalStage;
}

// ===========================================================
// RPC TYPES
// ===========================================================

export interface SubmitLeaveRequestParams {
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  leaveTypeId: string;
  documentUrl?: string;
}

export interface ApproveLeaveRequestParams {
  requestId: string;
  approverId: string;
}

export interface RejectLeaveRequestParams {
  requestId: string;
  approverId: string;
  reason?: string;
}

export interface EncashmentRequestParams {
  userId: string;
  daysToConvert: number;
  amount: number;
}

// ===========================================================
// ROUTE TYPES (for type-safe navigation)
// ===========================================================

export type AppRoute = 
  | '/(app)/home'
  | '/(app)/pengajuan'
  | '/(app)/konversi'
  | '/(app)/profile'
  | '/(app)/settings'
  | '/(modals)/notifications'
  | '/(modals)/leave-history'
  | '/(modals)/notification-detail'
  | '/(modals)/reminder-detail';

// ===========================================================
// LEGACY TYPES (backward compatibility)
// ===========================================================

/**
 * @deprecated Use Profile instead
 */
export type UserProfile = Profile;

/**
 * @deprecated Use LeaveBalanceUI instead  
 */
export interface LeaveBalance {
  total: number;
  used: number;
  remaining: number;
}
