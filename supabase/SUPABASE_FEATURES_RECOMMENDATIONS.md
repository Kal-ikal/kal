# 🚀 Rekomendasi Fitur Supabase untuk Annual & Benefit HRIS

Fitur-fitur Supabase yang cocok dan akan mempercepat/meningkatkan UX aplikasi ini.

---

## 🔴 1. REALTIME SUBSCRIPTIONS (HIGHLY RECOMMENDED)

### **Manfaat:**
- ✅ Notifikasi muncul LANGSUNG tanpa refresh
- ✅ Status approval update real-time
- ✅ Dashboard manager update otomatis saat ada pengajuan baru
- ✅ UX seperti WhatsApp/Slack (instant updates)

### **Use Cases:**

#### **A. Real-time Notifications**
User langsung dapat notifikasi tanpa perlu pull-to-refresh:

```typescript
// hooks/useRealtimeNotifications.ts
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeNotifications(userId: string, onNewNotification: (notif: any) => void) {
  useEffect(() => {
    // Subscribe to new notifications for this user
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New notification received!', payload.new);
          onNewNotification(payload.new);

          // Show toast immediately
          showToast({
            type: 'info',
            title: payload.new.title,
            message: payload.new.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
```

**Implementasi di app:**
```typescript
// app/(modals)/notifications.tsx
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);

  // Real-time updates
  useRealtimeNotifications(session.user.id, (newNotif) => {
    setNotifications(prev => [newNotif, ...prev]);
  });

  // ...
}
```

---

#### **B. Real-time Leave Request Status**
User langsung tahu saat pengajuan disetujui/ditolak:

```typescript
// hooks/useRealtimeLeaveStatus.ts
export function useRealtimeLeaveStatus(userId: string) {
  useEffect(() => {
    const channel = supabase
      .channel('leave_requests')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leave_requests',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const oldStatus = payload.old.status;
          const newStatus = payload.new.status;

          if (oldStatus !== newStatus) {
            // Status changed! Show immediate feedback
            if (newStatus === 'approved') {
              showToast({
                type: 'success',
                title: '🎉 Disetujui!',
                message: 'Pengajuan cuti Anda telah disetujui',
              });
            } else if (newStatus === 'rejected') {
              showToast({
                type: 'error',
                title: '❌ Ditolak',
                message: 'Pengajuan cuti Anda ditolak',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
```

---

#### **C. Real-time Dashboard for Manager/HRD**
Manager langsung tahu ada pengajuan baru:

```typescript
// app/(app)/approvals.tsx
useEffect(() => {
  const channel = supabase
    .channel('pending_approvals')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'leave_requests',
      },
      (payload) => {
        // New leave request! Refresh list
        fetchRequests();

        // Show notification badge
        showBadge(true);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## 📊 2. DATABASE FUNCTIONS (RPC) - Custom Business Logic

### **Manfaat:**
- ✅ Perhitungan kompleks di server (lebih cepat)
- ✅ Reduce network calls
- ✅ Atomic operations (transaction safety)

### **Use Cases:**

#### **A. Get Dashboard Statistics**
Satu RPC call untuk semua stats, bukan 5+ queries:

```sql
-- supabase/migrations/20250106_create_dashboard_functions.sql

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_stats JSON;
BEGIN
  SELECT json_build_object(
    'leave_balance', (SELECT leave_balance FROM profiles WHERE id = p_user_id),
    'pending_requests', (SELECT COUNT(*) FROM leave_requests WHERE user_id = p_user_id AND status = 'pending'),
    'approved_this_year', (SELECT COUNT(*) FROM leave_requests WHERE user_id = p_user_id AND status = 'approved' AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())),
    'total_days_used', (
      SELECT COALESCE(SUM(DATE(end_date) - DATE(start_date) + 1), 0)
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.user_id = p_user_id
      AND lr.status = 'approved'
      AND lt.is_quota_deduction = true
      AND EXTRACT(YEAR FROM lr.created_at) = EXTRACT(YEAR FROM NOW())
    ),
    'unread_notifications', (SELECT COUNT(*) FROM notifications WHERE user_id = p_user_id AND is_read = false),
    'upcoming_leaves', (
      SELECT json_agg(json_build_object(
        'id', id,
        'start_date', start_date,
        'end_date', end_date,
        'leave_type', (SELECT name FROM leave_types WHERE id = leave_type_id)
      ))
      FROM leave_requests
      WHERE user_id = p_user_id
      AND status = 'approved'
      AND start_date > NOW()
      ORDER BY start_date
      LIMIT 3
    )
  ) INTO v_stats;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Penggunaan:**
```typescript
// Before: 6 separate queries
const balance = await supabase.from('profiles').select('leave_balance')...
const pending = await supabase.from('leave_requests').select()...
// ...

// After: 1 RPC call
const { data: stats } = await supabase.rpc('get_dashboard_stats', {
  p_user_id: userId,
});

console.log(stats);
// {
//   leave_balance: 12,
//   pending_requests: 2,
//   approved_this_year: 5,
//   total_days_used: 8,
//   unread_notifications: 3,
//   upcoming_leaves: [...]
// }
```

---

#### **B. Bulk Approve Leaves**
Manager approve multiple requests sekaligus:

```sql
CREATE OR REPLACE FUNCTION bulk_approve_leaves(
  p_request_ids UUID[],
  p_approver_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_approved INT := 0;
  v_failed INT := 0;
  v_request_id UUID;
BEGIN
  FOREACH v_request_id IN ARRAY p_request_ids
  LOOP
    BEGIN
      -- Approve logic here (same as single approve)
      UPDATE leave_requests
      SET status = 'approved', current_stage = 'completed'
      WHERE id = v_request_id;

      v_approved := v_approved + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN json_build_object(
    'approved', v_approved,
    'failed', v_failed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## ⏰ 3. PG_CRON - Scheduled Tasks (VERY USEFUL)

### **Manfaat:**
- ✅ Auto-send reminders
- ✅ Auto-cleanup old data
- ✅ Generate monthly reports
- ✅ Birthday notifications

### **Use Cases:**

#### **A. Daily Leave Balance Reminder**
Kirim notifikasi setiap Senin pagi untuk user dengan sisa cuti < 5 hari:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule: Every Monday at 9 AM
SELECT cron.schedule(
  'weekly-leave-balance-reminder',
  '0 9 * * 1',
  $$
  INSERT INTO notifications (user_id, title, message, type, is_read)
  SELECT
    id,
    '⚠️ Sisa Cuti Menipis',
    'Sisa cuti Anda tinggal ' || leave_balance || ' hari. Segera ajukan cuti sebelum hangus!',
    'reminder',
    false
  FROM profiles
  WHERE leave_balance < 5
  AND leave_balance > 0
  AND status = 'active';
  $$
);
```

---

#### **B. Cleanup Old Notifications**
Auto-delete notifikasi yang sudah dibaca > 90 hari (setiap hari jam 2 pagi):

```sql
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 2 * * *',
  $$
  DELETE FROM notifications
  WHERE is_read = true
  AND created_at < NOW() - INTERVAL '90 days';
  $$
);
```

---

#### **C. Birthday Notifications**
Kirim ucapan selamat ulang tahun setiap hari jam 8 pagi:

```sql
-- First, add birthday column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Schedule birthday notifications
SELECT cron.schedule(
  'birthday-notifications',
  '0 8 * * *',
  $$
  INSERT INTO notifications (user_id, title, message, type, is_read)
  SELECT
    id,
    '🎉 Selamat Ulang Tahun!',
    'Selamat ulang tahun, ' || full_name || '! Semoga panjang umur dan sehat selalu.',
    'announcement',
    false
  FROM profiles
  WHERE EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE)
  AND status = 'active';
  $$
);
```

---

#### **D. Monthly Leave Balance Reset**
Reset cuti tahunan setiap tanggal 1 Januari:

```sql
SELECT cron.schedule(
  'annual-leave-reset',
  '0 0 1 1 *', -- Every Jan 1 at midnight
  $$
  -- Reset all employees to 12 days
  UPDATE profiles
  SET leave_balance = 12
  WHERE status = 'active';

  -- Notify all employees
  INSERT INTO notifications (user_id, title, message, type, is_read)
  SELECT
    id,
    '🎊 Cuti Tahunan Direset',
    'Saldo cuti tahunan Anda telah direset menjadi 12 hari. Selamat tahun baru!',
    'announcement',
    false
  FROM profiles
  WHERE status = 'active';
  $$
);
```

---

## 🔍 4. DATABASE VIEWS - Complex Queries Made Easy

### **Manfaat:**
- ✅ Simplify complex queries
- ✅ Better performance (pre-computed)
- ✅ Reusable across app

### **Use Cases:**

#### **A. Leave Request Summary View**
```sql
CREATE OR REPLACE VIEW leave_request_summary AS
SELECT
  lr.id,
  lr.user_id,
  p.full_name,
  p.email,
  p.department,
  lt.name AS leave_type,
  lt.code AS leave_type_code,
  lt.badge_color,
  lr.start_date,
  lr.end_date,
  (DATE(lr.end_date) - DATE(lr.start_date) + 1) AS days,
  lr.status,
  lr.current_stage,
  lr.reason,
  lr.document_url,
  lr.created_at,
  -- Manager info
  m.full_name AS manager_name,
  m.email AS manager_email
FROM leave_requests lr
JOIN profiles p ON lr.user_id = p.id
JOIN leave_types lt ON lr.leave_type_id = lt.id
LEFT JOIN profiles m ON p.manager_id = m.id;

-- Usage in app:
-- const { data } = await supabase.from('leave_request_summary').select('*');
```

---

#### **B. Employee Dashboard View**
```sql
CREATE OR REPLACE VIEW employee_dashboard AS
SELECT
  p.id,
  p.full_name,
  p.department,
  p.leave_balance,
  -- Pending requests
  (SELECT COUNT(*) FROM leave_requests WHERE user_id = p.id AND status = 'pending') AS pending_count,
  -- Approved this year
  (SELECT COUNT(*) FROM leave_requests WHERE user_id = p.id AND status = 'approved' AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())) AS approved_this_year,
  -- Unread notifications
  (SELECT COUNT(*) FROM notifications WHERE user_id = p.id AND is_read = false) AS unread_notifications
FROM profiles p
WHERE p.status = 'active';
```

---

## 🔐 5. SUPABASE AUTH HOOKS - Custom Auth Logic

### **Manfaat:**
- ✅ Auto-assign role based on email domain
- ✅ Send welcome notification on signup
- ✅ Validate email domain

### **Use Cases:**

#### **A. Auto-assign Role Based on Email**
```sql
-- Create auth hook function
CREATE OR REPLACE FUNCTION assign_role_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- If email ends with @hrd.company.com, assign HRD role
  IF NEW.email LIKE '%@hrd.company.com' THEN
    UPDATE profiles SET role = 'hrd' WHERE id = NEW.id;
  -- If email ends with @manager.company.com, assign Manager role
  ELSIF NEW.email LIKE '%@manager.company.com' THEN
    UPDATE profiles SET role = 'manager' WHERE id = NEW.id;
  -- Default: employee
  ELSE
    UPDATE profiles SET role = 'employee' WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profile creation
CREATE TRIGGER trigger_assign_role
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION assign_role_on_signup();
```

---

#### **B. Welcome Notification on Signup**
Already implemented in `20250104_additional_triggers.sql`, but can enhance:

```sql
-- Enhance create_profile_for_new_user to send welcome notification
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (...)
  VALUES (...)
  RETURNING id INTO v_profile_id;

  -- Send welcome notification
  INSERT INTO notifications (user_id, title, message, type, is_read)
  VALUES (
    v_profile_id,
    '👋 Selamat Datang!',
    'Terima kasih telah bergabung dengan Annual & Benefit. Mulai ajukan cuti Anda sekarang!',
    'announcement',
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📈 6. SUPABASE ANALYTICS (Optional, but useful)

### **Manfaat:**
- ✅ Track user behavior
- ✅ Monitor app usage
- ✅ Identify bottlenecks

**Enable in Supabase Dashboard → Settings → Analytics**

---

## 🎯 PRIORITY RECOMMENDATIONS

### **MUST IMPLEMENT (High Impact):**
1. ✅ **Realtime Subscriptions** - Instant notifications, real-time updates
2. ✅ **Database Functions (RPC)** - Faster dashboard, better performance
3. ✅ **pg_cron** - Auto-reminders, cleanup, birthday notifications

### **NICE TO HAVE:**
4. ⭐ **Database Views** - Simplify complex queries
5. ⭐ **Auth Hooks** - Auto-assign roles, welcome notifications

### **OPTIONAL:**
6. 💡 **Analytics** - Usage tracking (Supabase Pro feature)

---

## 📦 IMPLEMENTATION PLAN

### **Phase 1: Realtime (Week 1)**
```
[ ] Create hooks/useRealtimeNotifications.ts
[ ] Create hooks/useRealtimeLeaveStatus.ts
[ ] Integrate in notifications screen
[ ] Integrate in home screen
[ ] Test real-time updates
```

### **Phase 2: RPC Functions (Week 2)**
```
[ ] Create get_dashboard_stats function
[ ] Create bulk_approve_leaves function
[ ] Update home screen to use RPC
[ ] Update approvals screen to use bulk approve
[ ] Test performance improvement
```

### **Phase 3: Cron Jobs (Week 3)**
```
[ ] Enable pg_cron extension
[ ] Create leave balance reminder (weekly)
[ ] Create cleanup old notifications (daily)
[ ] Create birthday notifications (daily)
[ ] Create annual leave reset (yearly)
[ ] Test all cron jobs
```

---

## 💰 COST ANALYSIS

**Supabase Free Tier Limits:**
- ✅ Realtime: 200 concurrent connections (more than enough)
- ✅ Database Functions: Unlimited
- ✅ pg_cron: Unlimited
- ✅ Database Views: Unlimited
- ✅ Storage: 1 GB (already using for avatars/documents)

**All recommended features are FREE in Supabase Free Tier! 🎉**

---

## 📞 SUPPORT

If you need help implementing any of these features, refer to:
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- Database Functions: https://supabase.com/docs/guides/database/functions
- pg_cron: https://supabase.com/docs/guides/database/extensions/pg_cron

---

**Next Steps**: Pilih fitur mana yang mau diimplementasi dulu? Saya rekomendasikan mulai dari **Realtime Subscriptions** karena impact-nya paling besar untuk UX! 🚀
