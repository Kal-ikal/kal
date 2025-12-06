-- ===========================================================
-- 📊 SUPABASE MIGRATION
-- 📁 Lokasi: supabase/migrations/20250102_trigger_push_notifications.sql
-- 📝 Aksi: CREATE TRIGGER & FUNCTION
-- ✅ Trigger untuk otomatis kirim push notification saat insert ke table notifications
-- ===========================================================

-- Create function to send push notification via Edge Function
CREATE OR REPLACE FUNCTION send_push_notification_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id from the new notification record
  v_user_id := NEW.user_id;

  -- Call Edge Function to send push notification
  -- Note: Requires pg_net extension to be enabled
  PERFORM
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
      ),
      body := jsonb_build_object(
        'user_id', v_user_id,
        'title', NEW.title,
        'body', NEW.message,
        'data', jsonb_build_object(
          'notification_id', NEW.id,
          'type', NEW.type,
          'created_at', NEW.created_at
        )
      )
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on notifications table
DROP TRIGGER IF EXISTS trigger_send_push_notification ON notifications;

CREATE TRIGGER trigger_send_push_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_notification_on_insert();

-- Add comment
COMMENT ON FUNCTION send_push_notification_on_insert() IS 'Automatically sends push notification when new notification is inserted';
COMMENT ON TRIGGER trigger_send_push_notification ON notifications IS 'Trigger to send push notification on insert';
