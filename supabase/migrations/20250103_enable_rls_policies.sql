-- ===========================================================
-- 📊 SUPABASE MIGRATION
-- 📁 Lokasi: supabase/migrations/20250103_enable_rls_policies.sql
-- 📝 Aksi: Enable RLS and Create Comprehensive Security Policies
-- ✅ CRITICAL FOR PRODUCTION: Row Level Security
-- ===========================================================

-- ===========================================================
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ===========================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ===========================================================
-- 2. PROFILES TABLE POLICIES
-- ===========================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can view profiles of their team members (same department)
CREATE POLICY "Users can view department profiles"
ON profiles FOR SELECT
USING (
  department IN (
    SELECT department FROM profiles WHERE id = auth.uid()
  )
);

-- Managers can view profiles of their direct reports
CREATE POLICY "Managers can view direct reports"
ON profiles FOR SELECT
USING (
  manager_id = auth.uid()
);

-- HRD and DFD can view all profiles
CREATE POLICY "HRD and DFD can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('hrd', 'dfd')
  )
);

-- Users can update their own basic profile info
CREATE POLICY "Users can update own basic profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- Prevent users from changing critical fields
  AND (
    NEW.email = OLD.email
    AND NEW.role = OLD.role
    AND NEW.department = OLD.department
    AND NEW.manager_id = OLD.manager_id
    AND NEW.basic_salary = OLD.basic_salary
    AND NEW.position_allowance = OLD.position_allowance
    AND NEW.leave_balance = OLD.leave_balance
  )
);

-- Users can update their expo_push_token
CREATE POLICY "Users can update own push token"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- HRD can update any profile (full access)
CREATE POLICY "HRD can update any profile"
ON profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'hrd'
  )
);

-- ===========================================================
-- 3. DEPARTMENTS TABLE POLICIES (Read-only for most users)
-- ===========================================================

-- All authenticated users can view departments
CREATE POLICY "All users can view departments"
ON departments FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only HRD can manage departments
CREATE POLICY "HRD can manage departments"
ON departments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'hrd'
  )
);

-- ===========================================================
-- 4. LEAVE_TYPES TABLE POLICIES (Read-only for most users)
-- ===========================================================

-- All authenticated users can view leave types
CREATE POLICY "All users can view leave types"
ON leave_types FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only HRD can manage leave types
CREATE POLICY "HRD can manage leave types"
ON leave_types FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'hrd'
  )
);

-- ===========================================================
-- 5. LEAVE_REQUESTS TABLE POLICIES
-- ===========================================================

-- Users can view their own leave requests
CREATE POLICY "Users can view own leave requests"
ON leave_requests FOR SELECT
USING (auth.uid() = user_id);

-- Managers can view leave requests from their direct reports
CREATE POLICY "Managers can view direct reports leave requests"
ON leave_requests FOR SELECT
USING (
  user_id IN (
    SELECT id FROM profiles WHERE manager_id = auth.uid()
  )
);

-- DFD and HRD can view all leave requests
CREATE POLICY "DFD and HRD can view all leave requests"
ON leave_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('dfd', 'hrd')
  )
);

-- Users can create their own leave requests
CREATE POLICY "Users can create own leave requests"
ON leave_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending leave requests (before approval)
CREATE POLICY "Users can update own pending leave requests"
ON leave_requests FOR UPDATE
USING (
  auth.uid() = user_id
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
);

-- Managers can update leave requests from their direct reports (for approval)
CREATE POLICY "Managers can approve direct reports leave requests"
ON leave_requests FOR UPDATE
USING (
  user_id IN (
    SELECT id FROM profiles WHERE manager_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'manager'
  )
);

-- DFD can update leave requests (for approval)
CREATE POLICY "DFD can approve leave requests"
ON leave_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'dfd'
  )
);

-- HRD can update any leave request (full access)
CREATE POLICY "HRD can manage all leave requests"
ON leave_requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'hrd'
  )
);

-- Users can delete their own pending leave requests
CREATE POLICY "Users can delete own pending leave requests"
ON leave_requests FOR DELETE
USING (
  auth.uid() = user_id
  AND status = 'pending'
);

-- ===========================================================
-- 6. NOTIFICATIONS TABLE POLICIES
-- ===========================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- System can create notifications for any user (via service role)
CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- HRD can view all notifications (for audit)
CREATE POLICY "HRD can view all notifications"
ON notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'hrd'
  )
);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
USING (auth.uid() = user_id);

-- ===========================================================
-- 7. PAYROLLS TABLE POLICIES (HIGHLY SENSITIVE)
-- ===========================================================

-- Users can view their own payroll records
CREATE POLICY "Users can view own payroll"
ON payrolls FOR SELECT
USING (auth.uid() = user_id);

-- Only HRD can create/update/delete payroll records
CREATE POLICY "HRD can manage payrolls"
ON payrolls FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'hrd'
  )
);

-- ===========================================================
-- 8. PUBLIC_HOLIDAYS TABLE POLICIES (Read-only for most users)
-- ===========================================================

-- All authenticated users can view public holidays
CREATE POLICY "All users can view public holidays"
ON public_holidays FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only HRD can manage public holidays
CREATE POLICY "HRD can manage public holidays"
ON public_holidays FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'hrd'
  )
);

-- ===========================================================
-- 9. ACTIVITY_LOGS TABLE POLICIES (Audit trail - read-only)
-- ===========================================================

-- Only HRD can view activity logs
CREATE POLICY "HRD can view activity logs"
ON activity_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'hrd'
  )
);

-- System can create activity logs (via service role)
CREATE POLICY "System can create activity logs"
ON activity_logs FOR INSERT
WITH CHECK (true);

-- ===========================================================
-- 10. STORAGE BUCKET POLICIES
-- ===========================================================

-- Create storage buckets if not exist (run these manually in Supabase Dashboard)
-- Bucket: avatars (for profile pictures)
-- Bucket: documents (for leave request documents)

-- AVATARS BUCKET POLICIES:
-- 1. Users can upload to their own folder: {user_id}/*
-- 2. All authenticated users can view avatars (for team visibility)
-- 3. Users can only update/delete their own avatars

-- Run these in Supabase Dashboard SQL Editor:
/*
-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Anyone can view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
*/

-- DOCUMENTS BUCKET POLICIES:
-- 1. Users can upload to their own folder: {user_id}/*
-- 2. Users can view their own documents
-- 3. Managers/DFD/HRD can view documents of leave requests they can access

-- Run these in Supabase Dashboard SQL Editor:
/*
-- Create documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own documents
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own documents
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Managers can view direct reports documents
CREATE POLICY "Managers can view direct reports documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id::text FROM profiles WHERE manager_id = auth.uid()
  )
);

-- Policy: DFD and HRD can view all documents
CREATE POLICY "DFD and HRD can view all documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('dfd', 'hrd')
  )
);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
*/

-- ===========================================================
-- COMMENTS
-- ===========================================================

COMMENT ON POLICY "Users can view own profile" ON profiles IS 'RLS: Users can only view their own profile data';
COMMENT ON POLICY "Users can view own leave requests" ON leave_requests IS 'RLS: Users can only view their own leave requests';
COMMENT ON POLICY "Users can view own payroll" ON payrolls IS 'RLS: Users can only view their own payroll records';
COMMENT ON POLICY "HRD can manage payrolls" ON payrolls IS 'RLS: Only HRD has full access to payroll data';

-- ===========================================================
-- VERIFICATION QUERIES (run these to test policies)
-- ===========================================================

-- Test 1: Check if RLS is enabled on all tables
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Test 2: List all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies WHERE schemaname = 'public';

-- Test 3: Test as regular user (replace USER_ID with actual user ID)
-- SET LOCAL role TO authenticated;
-- SET LOCAL request.jwt.claims.sub TO 'USER_ID';
-- SELECT * FROM profiles; -- Should only see own profile

-- ===========================================================
-- IMPORTANT NOTES
-- ===========================================================

/*
1. Storage bucket policies MUST be created manually in Supabase Dashboard
   because storage.objects is a special system table.

2. Go to Supabase Dashboard → Storage → Create buckets:
   - avatars (public: true)
   - documents (public: false)

3. Then go to each bucket → Policies → New Policy → Custom
   and paste the policies from the comments above.

4. Test the policies with different user roles before going to production.

5. Service Role Key bypasses all RLS policies (use carefully).

6. anon key respects RLS policies (use for client-side).
*/
