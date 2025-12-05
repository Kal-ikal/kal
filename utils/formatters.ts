// ===========================================================
// 📱 FRONT-END EXPO
// 📁 Lokasi: annualbenefit/utils/formatters.ts
// 📝 Aksi: REPLACE file yang sudah ada
// ✅ COMPLETE: All formatting utilities
// ===========================================================

/**
 * Format number as Indonesian Rupiah
 */
export const formatIDR = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format date as Indonesian format (DD MMM YYYY)
 */
export const formatDateID = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format date as full Indonesian format (DD MMMM YYYY)
 */
export const formatDateFullID = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Format date range (DD MMM - DD MMM YYYY)
 */
export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startStr = start.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
  
  const endStr = end.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  
  return `${startStr} - ${endStr}`;
};

/**
 * Calculate days between two dates (inclusive)
 */
export const calculateDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

/**
 * Format relative time (e.g., "5 menit yang lalu")
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Baru saja';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} menit yang lalu`;
  } else if (diffHours < 24) {
    return `${diffHours} jam yang lalu`;
  } else if (diffDays === 1) {
    return 'Kemarin';
  } else if (diffDays < 7) {
    return `${diffDays} hari yang lalu`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} minggu yang lalu`;
  } else {
    return formatDateID(dateString);
  }
};

/**
 * Get status color based on status string
 */
export const getStatusColor = (status: string): { bg: string; text: string } => {
  const normalizedStatus = status?.toLowerCase() || '';
  
  if (normalizedStatus === 'approved' || normalizedStatus === 'disetujui') {
    return { bg: '#DEF7EC', text: '#03543F' };
  }
  if (normalizedStatus === 'rejected' || normalizedStatus === 'ditolak') {
    return { bg: '#FDE8E8', text: '#9B1C1C' };
  }
  if (normalizedStatus === 'pending' || normalizedStatus === 'dalam proses') {
    return { bg: '#FEF3C7', text: '#92400E' };
  }
  // Default
  return { bg: '#E5E7EB', text: '#374151' };
};

/**
 * Get status label in Indonesian
 */
export const getStatusLabel = (status: string): string => {
  const normalizedStatus = status?.toLowerCase() || '';
  
  switch (normalizedStatus) {
    case 'approved':
      return 'Disetujui';
    case 'rejected':
      return 'Ditolak';
    case 'pending':
      return 'Dalam Proses';
    case 'completed':
      return 'Selesai';
    default:
      return status || 'Unknown';
  }
};

/**
 * Get approval stage label in Indonesian
 */
export const getStageLabel = (stage: string): string => {
  const normalizedStage = stage?.toLowerCase() || '';
  
  switch (normalizedStage) {
    case 'manager':
      return 'Menunggu Persetujuan Manager';
    case 'dfd':
      return 'Menunggu Persetujuan DFD';
    case 'hrd':
      return 'Menunggu Persetujuan HRD';
    case 'completed':
      return 'Proses Selesai';
    default:
      return stage || 'Unknown';
  }
};

/**
 * Get leave type badge color
 * Falls back to default blue if not specified
 */
export const getLeaveTypeColor = (badgeColor: string | null | undefined): string => {
  if (!badgeColor) return '#3B82F6';
  
  // Map color names to hex if needed
  const colorMap: Record<string, string> = {
    blue: '#3B82F6',
    red: '#EF4444',
    green: '#10B981',
    yellow: '#F59E0B',
    purple: '#8B5CF6',
    orange: '#F97316',
    pink: '#EC4899',
    indigo: '#6366F1',
  };
  
  return colorMap[badgeColor.toLowerCase()] || badgeColor;
};

/**
 * Get role label in Indonesian
 */
export const getRoleLabel = (role: string): string => {
  switch (role?.toLowerCase()) {
    case 'employee':
      return 'Karyawan';
    case 'manager':
      return 'Manager';
    case 'dfd':
      return 'DFD';
    case 'hrd':
      return 'HRD';
    default:
      return role || 'Unknown';
  }
};

/**
 * Format phone number for display
 */
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return '-';
  
  // Simple formatting - add dashes
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length <= 4) return cleaned;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';
  
  const words = name.trim().split(' ');
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};
