-- ===========================================================
-- 📊 SUPABASE MIGRATION
-- 📁 Lokasi: supabase/migrations/20250101_add_expo_push_token.sql
-- 📝 Aksi: Add expo_push_token column to profiles table
-- ✅ Untuk: Push Notifications dengan Expo
-- ===========================================================

-- Add expo_push_token column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_expo_push_token
ON profiles(expo_push_token)
WHERE expo_push_token IS NOT NULL;

-- Add comment to column
COMMENT ON COLUMN profiles.expo_push_token IS 'Expo push notification token for mobile app';
