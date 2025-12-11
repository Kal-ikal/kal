-- ===========================================================
-- 📊 SUPABASE MIGRATION
-- 📁 Lokasi: supabase/migrations/20250105_fix_notifications_schema.sql
-- 📝 Aksi: Add missing 'type' column to notifications table
-- ✅ Fix schema inconsistency
-- ===========================================================

-- Add type column to notifications table (if not exists)
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'info';

-- Add check constraint for valid notification types
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN ('success', 'error', 'warning', 'info', 'leave_status', 'announcement', 'reminder'));

-- Add index for faster filtering by type
CREATE INDEX IF NOT EXISTS idx_notifications_type
ON notifications(type);

-- Add comment to column
COMMENT ON COLUMN notifications.type IS 'Notification type: success, error, warning, info, leave_status, announcement, reminder';

-- Update existing notifications to have a default type
UPDATE notifications
SET type = 'info'
WHERE type IS NULL;
