// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/utils/formatters.ts
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ V5: Type-safe formatters with proper null handling
// ===========================================================

import type { LeaveStatus, UserRole, ApprovalStage } from '@/types/database';

// ===========================================================
// DATE FORMATTERS
// ===========================================================

/**
 * Format date to Indonesian locale (e.g., "28 November 2025")
 * Handles null/undefined safely
 */
export function formatDateID(date: string | null | undefined): string {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

/**
 * Format date to short format (e.g., "28 Nov 2025")
 */
export function formatDateShort(date: string | null | undefined): string {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

/**
 * Format date to ISO format (e.g., "2025-11-28")
 */
export function formatDateISO(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

/**
 * Format relative time (e.g., "2 jam yang lalu", "kemarin")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return formatDateID(dateString);
  } catch {
    return '-';
  }
}

/**
 * Calculate years of service from join date
 */
export function getYearsOfService(joinDate: string | null | undefined): string {
  if (!joinDate) return '-';
  
  try {
    const start = new Date(joinDate);
    if (isNaN(start.getTime())) return '-';
    
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    
    if (years < 0) return '-';
    if (years < 1) return '< 1';
    
    return years.toFixed(1);
  } catch {
    return '-';
  }
}

/**
 * Calculate number of days between two dates (inclusive)
 */
export function calculateDays(
  startDate: string | null | undefined, 
  endDate: string | null | undefined
): number {
  if (!startDate || !endDate) return 0;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    const diffMs = end.getTime() - start.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
  } catch {
    return 0;
  }
}

// ===========================================================
// CURRENCY FORMATTERS
// ===========================================================

/**
 * Format number to IDR currency (e.g., "Rp 4.000.000")
 */
export function formatIDR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'Rp 0';
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with thousand separators (e.g., "4.000.000")
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  
  return new Intl.NumberFormat('id-ID').format(value);
}

// ===========================================================
// PHONE FORMATTERS
// ===========================================================

/**
 * Format phone number for display (e.g., "0812-3456-7890")
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '-';
  
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length < 10) return phone;
  
  // Format as 0812-3456-7890
  if (digits.startsWith('62')) {
    const local = '0' + digits.slice(2);
    return formatPhoneLocal(local);
  }
  
  return formatPhoneLocal(digits);
}

function formatPhoneLocal(digits: string): string {
  if (digits.length === 10) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  if (digits.length === 12) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  return digits;
}

// ===========================================================
// VALUE FORMATTERS
// ===========================================================

/**
 * Safe value formatter - returns "-" for null/undefined/empty
 */
export function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

/**
 * Format leave balance for display
 */
export function formatLeaveBalance(balance: number | null | undefined): string {
  if (balance === null || balance === undefined) return '0 hari';
  return `${balance} hari`;
}

// ===========================================================
// STATUS FORMATTERS
// ===========================================================

/**
 * Get Indonesian label for leave status
 */
export function getStatusLabel(status: LeaveStatus | string | null | undefined): string {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'Menunggu';
    case 'approved':
      return 'Disetujui';
    case 'rejected':
      return 'Ditolak';
    default:
      return status || '-';
  }
}

/**
 * Get colors for status badge
 */
export function getStatusColor(status: LeaveStatus | string | null | undefined): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status?.toLowerCase()) {
    case 'pending':
      return {
        bg: '#FEF3C7',
        text: '#D97706',
        border: '#F59E0B',
      };
    case 'approved':
      return {
        bg: '#D1FAE5',
        text: '#059669',
        border: '#10B981',
      };
    case 'rejected':
      return {
        bg: '#FEE2E2',
        text: '#DC2626',
        border: '#EF4444',
      };
    default:
      return {
        bg: '#F3F4F6',
        text: '#6B7280',
        border: '#9CA3AF',
      };
  }
}

/**
 * Get Indonesian label for user role
 */
export function getRoleLabel(role: UserRole | string | null | undefined): string {
  switch (role?.toLowerCase()) {
    case 'employee':
      return 'Karyawan';
    case 'manager':
      return 'Manager';
    case 'dfd':
      return 'Direktur';
    case 'hrd':
      return 'HRD';
    default:
      return role || '-';
  }
}

/**
 * Get Indonesian label for approval stage
 */
export function getStageLabel(stage: ApprovalStage | string | null | undefined): string {
  switch (stage?.toLowerCase()) {
    case 'manager':
      return 'Manager';
    case 'dfd':
      return 'Direktur';
    case 'hrd':
      return 'HRD';
    case 'completed':
      return 'Selesai';
    default:
      return stage || '-';
  }
}

// ===========================================================
// LEAVE TYPE HELPERS
// ===========================================================

/**
 * Get badge color for leave type
 */
export function getLeaveTypeColor(code: string | null | undefined): string {
  switch (code?.toUpperCase()) {
    case 'CT':
      return '#3B82F6'; // blue
    case 'SK':
      return '#EF4444'; // red
    case 'MAT':
      return '#8B5CF6'; // purple
    case 'UNPD':
      return '#F97316'; // orange
    default:
      return '#6B7280'; // gray
  }
}

/**
 * Get background color for leave type badge
 */
export function getLeaveTypeBgColor(code: string | null | undefined, isDark: boolean = false): string {
  const baseColors: Record<string, { light: string; dark: string }> = {
    CT: { light: '#DBEAFE', dark: '#1E3A5F' },
    SK: { light: '#FEE2E2', dark: '#5F1E1E' },
    MAT: { light: '#EDE9FE', dark: '#3B1E5F' },
    UNPD: { light: '#FFEDD5', dark: '#5F3B1E' },
  };
  
  const colors = baseColors[code?.toUpperCase() || ''] || { light: '#F3F4F6', dark: '#374151' };
  return isDark ? colors.dark : colors.light;
}
