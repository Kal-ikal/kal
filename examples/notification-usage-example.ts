// ===========================================================
// 📱 CONTOH PENGGUNAAN NOTIFICATION SERVICE
// 📁 Lokasi: examples/notification-usage-example.ts
// 📝 Real-world examples untuk berbagai use cases
// ===========================================================

import { createNotificationWithPush, createBulkNotificationWithPush } from '@/services/notificationService';
import { supabase } from '@/lib/supabase';

// ========================================
// EXAMPLE 1: Leave Request Approved
// ========================================
export async function notifyLeaveApproved(employeeId: string, leaveId: string) {
  await createNotificationWithPush({
    userId: employeeId,
    title: 'Leave Approved ✅',
    message: 'Your leave request has been approved',
    type: 'success',
    data: {
      screen: '/leave/details',
      leaveId: leaveId,
    }
  });
}

// ========================================
// EXAMPLE 2: Leave Request Rejected
// ========================================
export async function notifyLeaveRejected(
  employeeId: string,
  leaveId: string,
  reason?: string
) {
  await createNotificationWithPush({
    userId: employeeId,
    title: 'Leave Rejected',
    message: reason || 'Your leave request has been rejected',
    type: 'error',
    data: {
      screen: '/leave/details',
      leaveId: leaveId,
    }
  });
}

// ========================================
// EXAMPLE 3: Reminder - Leave Balance Low
// ========================================
export async function notifyLowLeaveBalance(employeeId: string, remainingDays: number) {
  await createNotificationWithPush({
    userId: employeeId,
    title: 'Leave Balance Low',
    message: `You have only ${remainingDays} leave days remaining`,
    type: 'warning',
    data: {
      screen: '/leave/balance',
    }
  });
}

// ========================================
// EXAMPLE 4: Manager - New Leave Request Pending
// ========================================
export async function notifyManagerNewLeaveRequest(
  managerId: string,
  employeeName: string,
  leaveId: string
) {
  await createNotificationWithPush({
    userId: managerId,
    title: 'New Leave Request',
    message: `${employeeName} has submitted a leave request`,
    type: 'info',
    data: {
      screen: '/manager/approvals',
      leaveId: leaveId,
    }
  });
}

// ========================================
// EXAMPLE 5: Bulk Announcement to All Employees
// ========================================
export async function sendCompanyAnnouncement(
  title: string,
  message: string
) {
  // Get all employee IDs
  const { data: employees } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'employee');

  if (!employees || employees.length === 0) {
    console.log('No employees found');
    return;
  }

  const employeeIds = employees.map(e => e.id);

  // Send bulk notifications
  const result = await createBulkNotificationWithPush(
    employeeIds,
    title,
    message,
    'info',
    { screen: '/announcements' }
  );

  console.log(`Announcement sent to ${result.successful} employees`);
  return result;
}

// ========================================
// EXAMPLE 6: Birthday Reminder to Manager
// ========================================
export async function notifyManagerEmployeeBirthday(
  managerId: string,
  employeeName: string,
  employeeId: string
) {
  await createNotificationWithPush({
    userId: managerId,
    title: '🎂 Birthday Today',
    message: `${employeeName}'s birthday is today!`,
    type: 'info',
    data: {
      screen: `/employee/${employeeId}`,
    }
  });
}

// ========================================
// EXAMPLE 7: Overtime Request Notification
// ========================================
export async function notifyOvertimeApproved(
  employeeId: string,
  overtimeId: string,
  hours: number
) {
  await createNotificationWithPush({
    userId: employeeId,
    title: 'Overtime Approved',
    message: `Your ${hours} hours overtime request has been approved`,
    type: 'success',
    data: {
      screen: '/overtime/details',
      overtimeId: overtimeId,
    }
  });
}

// ========================================
// EXAMPLE 8: Document Upload Notification
// ========================================
export async function notifyDocumentUploaded(
  employeeId: string,
  documentType: string,
  documentId: string
) {
  await createNotificationWithPush({
    userId: employeeId,
    title: 'Document Uploaded',
    message: `Your ${documentType} has been uploaded successfully`,
    type: 'success',
    data: {
      screen: '/documents',
      documentId: documentId,
    }
  });
}

// ========================================
// EXAMPLE 9: Payslip Available
// ========================================
export async function notifyPayslipAvailable(
  employeeId: string,
  month: string,
  year: number
) {
  await createNotificationWithPush({
    userId: employeeId,
    title: 'Payslip Available',
    message: `Your payslip for ${month} ${year} is now available`,
    type: 'info',
    data: {
      screen: '/payslip',
      month,
      year,
    }
  });
}

// ========================================
// EXAMPLE 10: Performance Review Reminder
// ========================================
export async function notifyPerformanceReview(
  employeeId: string,
  deadline: string
) {
  await createNotificationWithPush({
    userId: employeeId,
    title: 'Performance Review',
    message: `Please complete your self-assessment by ${deadline}`,
    type: 'warning',
    data: {
      screen: '/performance',
    }
  });
}
