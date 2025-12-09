-- ===========================================================
-- 📊 SUPABASE SQL UPDATES
-- 📝 Task: Final Production Setup
-- ===========================================================

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. Create 'notifications' table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  data JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view their own notifications') THEN
        CREATE POLICY "Users can view their own notifications"
          ON public.notifications FOR SELECT
          USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update their own notifications (e.g. mark as read)') THEN
        CREATE POLICY "Users can update their own notifications (e.g. mark as read)"
          ON public.notifications FOR UPDATE
          USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can delete their own notifications') THEN
        CREATE POLICY "Users can delete their own notifications"
          ON public.notifications FOR DELETE
          USING (auth.uid() = user_id);
    END IF;
END $$;

-- 3. Add 'expo_push_token' to profiles if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'expo_push_token') THEN
        ALTER TABLE public.profiles ADD COLUMN expo_push_token TEXT;
    END IF;
END $$;

-- 4. Create or Replace Trigger Function for Push Notifications
CREATE OR REPLACE FUNCTION send_push_notification_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_push_token TEXT;
  v_project_url TEXT;
  v_service_key TEXT;
BEGIN
  -- Get user_id from the new notification record
  v_user_id := NEW.user_id;

  -- Check if user has a push token
  SELECT expo_push_token INTO v_push_token
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_push_token IS NULL THEN
     -- User has no token, skip pushing but allow insert
     RETURN NEW;
  END IF;

  -- NOTE: You must replace these placeholders or set them as Secrets in Supabase Dashboard
  -- Recommendation: Use Supabase Secrets and read them via `vault` or specific functions if available,
  -- but for standard triggers, hardcoding the URL (which is static per project) is common if secrets aren't accessible in this context.

  -- Attempt to get secrets from app settings (if configured manually) or fallbacks
  -- Note: `current_setting` throws error if not set. We use a safe approach or instructions.

  -- INSTRUCTION: Replace <PROJECT_REF> with your Supabase project ID (e.g., 'abcdefgh')
  v_project_url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-push-notification';

  -- INSTRUCTION: It is safer to use the internal service role key if available in environment or Vault.
  -- Here we assume the user will replace this or configure `app.supabase_service_role_key` in postgresql.conf (unlikely for cloud)
  -- OR commonly, people hardcode it here for the trigger.
  -- For this script to be "ready to run", we will use a placeholder and comment loudly.
  v_service_key := 'Bearer <SUPABASE_SERVICE_ROLE_KEY>';

  -- Call Edge Function to send push notification
  -- Requires pg_net extension
  PERFORM
    net.http_post(
      url := v_project_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', v_service_key
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

-- 5. Create Trigger
DROP TRIGGER IF EXISTS trigger_send_push_notification ON public.notifications;

CREATE TRIGGER trigger_send_push_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_notification_on_insert();

-- 6. Grant usage on net schema just in case
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;
