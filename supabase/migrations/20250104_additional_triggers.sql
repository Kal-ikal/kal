-- ===========================================================
-- 📊 SUPABASE MIGRATION
-- 📁 Lokasi: supabase/migrations/20250104_additional_triggers.sql
-- 📝 Aksi: Create Additional Triggers for Production
-- ✅ Auto-update timestamps, audit logs, and business logic
-- ===========================================================

-- ===========================================================
-- 1. AUTO-UPDATE updated_at TIMESTAMP
-- ===========================================================

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for leave_requests table
DROP TRIGGER IF EXISTS trigger_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER trigger_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for payrolls table
DROP TRIGGER IF EXISTS trigger_payrolls_updated_at ON payrolls;
CREATE TRIGGER trigger_payrolls_updated_at
  BEFORE UPDATE ON payrolls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON FUNCTION update_updated_at_column() IS 'Auto-update updated_at timestamp on record updates';

-- ===========================================================
-- 2. AUTO-CREATE PROFILE ON AUTH USER REGISTRATION
-- ===========================================================

-- Function to create profile when new auth user is created
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    department,
    role,
    created_at,
    leave_balance,
    status,
    basic_salary,
    position_allowance,
    address
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'General', -- Default department
    'employee', -- Default role
    NOW(),
    12, -- Default annual leave balance
    'active',
    0, -- Default salary (to be updated by HRD)
    0, -- Default allowance
    '' -- Empty address
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users table
DROP TRIGGER IF EXISTS trigger_create_profile_on_signup ON auth.users;
CREATE TRIGGER trigger_create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_new_user();

COMMENT ON FUNCTION create_profile_for_new_user() IS 'Automatically create profile when new user signs up';

-- ===========================================================
-- 3. ACTIVITY LOG TRIGGERS (Audit Trail)
-- ===========================================================

-- Function to log leave request changes
CREATE OR REPLACE FUNCTION log_leave_request_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_action_type TEXT;
  v_description TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email FROM profiles WHERE id = NEW.user_id;

  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    v_action_type := 'LEAVE_REQUEST_CREATED';
    v_description := format('Leave request created by %s', v_user_email);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check what changed
    IF OLD.status != NEW.status THEN
      v_action_type := format('LEAVE_REQUEST_%s', UPPER(NEW.status));
      v_description := format('Leave request %s by approver', NEW.status);
    ELSE
      v_action_type := 'LEAVE_REQUEST_UPDATED';
      v_description := format('Leave request updated by %s', v_user_email);
    END IF;
  END IF;

  -- Insert activity log
  INSERT INTO activity_logs (user_email, action_type, description, created_at)
  VALUES (v_user_email, v_action_type, v_description, NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for leave_requests
DROP TRIGGER IF EXISTS trigger_log_leave_request_changes ON leave_requests;
CREATE TRIGGER trigger_log_leave_request_changes
  AFTER INSERT OR UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION log_leave_request_changes();

COMMENT ON FUNCTION log_leave_request_changes() IS 'Log all leave request changes for audit trail';

-- ===========================================================
-- 4. AUTO-UPDATE LEAVE BALANCE ON APPROVAL
-- ===========================================================

-- Function to update leave balance when leave is approved
CREATE OR REPLACE FUNCTION update_leave_balance_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_days_requested INT;
  v_is_quota_deduction BOOLEAN;
BEGIN
  -- Only process if status changed to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN

    -- Check if this leave type deducts quota
    SELECT is_quota_deduction INTO v_is_quota_deduction
    FROM leave_types
    WHERE id = NEW.leave_type_id;

    -- Only deduct if quota deduction is enabled
    IF v_is_quota_deduction THEN
      -- Calculate days requested
      v_days_requested := (DATE(NEW.end_date) - DATE(NEW.start_date)) + 1;

      -- Update user's leave balance
      UPDATE profiles
      SET leave_balance = leave_balance - v_days_requested
      WHERE id = NEW.user_id;

      -- Log the balance change
      INSERT INTO activity_logs (user_email, action_type, description, created_at)
      VALUES (
        (SELECT email FROM profiles WHERE id = NEW.user_id),
        'LEAVE_BALANCE_DEDUCTED',
        format('Leave balance deducted: %s days', v_days_requested),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for leave_requests
DROP TRIGGER IF EXISTS trigger_update_leave_balance ON leave_requests;
CREATE TRIGGER trigger_update_leave_balance
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
  EXECUTE FUNCTION update_leave_balance_on_approval();

COMMENT ON FUNCTION update_leave_balance_on_approval() IS 'Auto-deduct leave balance when leave request is approved';

-- ===========================================================
-- 5. AUTO-CREATE NOTIFICATION ON LEAVE STATUS CHANGE
-- ===========================================================

-- Function to create notification when leave status changes
CREATE OR REPLACE FUNCTION notify_user_on_leave_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_notification_title TEXT;
  v_notification_message TEXT;
  v_leave_type_name TEXT;
BEGIN
  -- Only notify if status changed
  IF OLD.status != NEW.status THEN

    -- Get leave type name
    SELECT name INTO v_leave_type_name FROM leave_types WHERE id = NEW.leave_type_id;

    -- Build notification based on new status
    IF NEW.status = 'approved' THEN
      v_notification_title := 'Pengajuan Cuti Disetujui ✅';
      v_notification_message := format('Pengajuan %s Anda telah disetujui', v_leave_type_name);
    ELSIF NEW.status = 'rejected' THEN
      v_notification_title := 'Pengajuan Cuti Ditolak ❌';
      v_notification_message := format('Pengajuan %s Anda ditolak', v_leave_type_name);
    ELSE
      RETURN NEW; -- Skip other status changes
    END IF;

    -- Insert notification (will trigger push notification automatically)
    INSERT INTO notifications (user_id, title, message, type, is_read, created_at)
    VALUES (
      NEW.user_id,
      v_notification_title,
      v_notification_message,
      'leave_status',
      false,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for leave_requests
DROP TRIGGER IF EXISTS trigger_notify_leave_status_change ON leave_requests;
CREATE TRIGGER trigger_notify_leave_status_change
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_user_on_leave_status_change();

COMMENT ON FUNCTION notify_user_on_leave_status_change() IS 'Auto-create notification when leave request status changes';

-- ===========================================================
-- 6. PREVENT NEGATIVE LEAVE BALANCE
-- ===========================================================

-- Function to prevent leave requests if insufficient balance
CREATE OR REPLACE FUNCTION check_leave_balance_before_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_current_balance INT;
  v_days_requested INT;
  v_is_quota_deduction BOOLEAN;
BEGIN
  -- Only check when approving a leave request
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN

    -- Check if this leave type deducts quota
    SELECT is_quota_deduction INTO v_is_quota_deduction
    FROM leave_types
    WHERE id = NEW.leave_type_id;

    IF v_is_quota_deduction THEN
      -- Get current leave balance
      SELECT leave_balance INTO v_current_balance
      FROM profiles
      WHERE id = NEW.user_id;

      -- Calculate days requested
      v_days_requested := (DATE(NEW.end_date) - DATE(NEW.start_date)) + 1;

      -- Check if sufficient balance
      IF v_current_balance < v_days_requested THEN
        RAISE EXCEPTION 'Insufficient leave balance. Current: %, Requested: %',
          v_current_balance, v_days_requested;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for leave_requests (BEFORE UPDATE to prevent approval)
DROP TRIGGER IF EXISTS trigger_check_leave_balance ON leave_requests;
CREATE TRIGGER trigger_check_leave_balance
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
  EXECUTE FUNCTION check_leave_balance_before_approval();

COMMENT ON FUNCTION check_leave_balance_before_approval() IS 'Prevent approval if user has insufficient leave balance';

-- ===========================================================
-- 7. AUTO-DELETE OLD NOTIFICATIONS (Cleanup)
-- ===========================================================

-- Function to auto-delete old read notifications (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications
  WHERE is_read = true
  AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_notifications() IS 'Delete read notifications older than 90 days (run via cron job)';

-- Note: To run this automatically, set up a Supabase Edge Function with cron:
-- https://supabase.com/docs/guides/functions/schedule-functions

-- ===========================================================
-- VERIFICATION QUERIES
-- ===========================================================

-- Test 1: List all triggers
-- SELECT trigger_name, event_object_table, action_timing, event_manipulation
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
-- ORDER BY event_object_table, trigger_name;

-- Test 2: List all functions
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_type = 'FUNCTION'
-- ORDER BY routine_name;

-- ===========================================================
-- IMPORTANT NOTES
-- ===========================================================

/*
1. The push notification trigger (20250102_trigger_push_notifications.sql)
   requires pg_net extension to be enabled:
   - Go to Supabase Dashboard → Database → Extensions
   - Enable "pg_net" extension

2. Test all triggers with different scenarios before production:
   - Create leave request → Check if activity log created
   - Approve leave request → Check if balance deducted & notification sent
   - Try to approve with insufficient balance → Should fail

3. The cleanup function should be called periodically via cron job:
   - Set up Supabase Edge Function with cron schedule
   - Or use pg_cron extension (if available)

4. Monitor trigger performance in production:
   - If triggers slow down operations, consider async processing
   - Use AFTER triggers instead of BEFORE when possible

5. Trigger execution order:
   - BEFORE triggers → Validation and checks
   - AFTER triggers → Notifications and logging
*/
