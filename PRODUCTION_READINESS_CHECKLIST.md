# 🚀 Production Readiness Checklist - Annual & Benefit HRIS App

Complete checklist untuk memastikan aplikasi siap production. **WAJIB** dijalankan sebelum deploy ke App Store / Play Store.

---

## 📋 OVERVIEW

**Last Updated**: December 11, 2024
**App Version**: 1.0.0
**Min iOS**: 13.4
**Min Android**: 6.0 (API 23)

---

## 🗄️ 1. DATABASE SETUP

### **A. Run All Migrations**

```bash
# Jalankan migrations secara berurutan di Supabase Dashboard → SQL Editor
```

✅ **Migration Checklist:**
```
[ ] 20250101_add_expo_push_token.sql - Add push token column
[ ] 20250102_trigger_push_notifications.sql - Push notification trigger
[ ] 20250103_enable_rls_policies.sql - Row Level Security policies
[ ] 20250104_additional_triggers.sql - Business logic triggers
[ ] 20250105_fix_notifications_schema.sql - Add type column to notifications
```

**Verification:**
```sql
-- Check if all migrations ran successfully
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC;

-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- Expected: All tables should show rowsecurity = true

-- Check if all triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
-- Expected: 7+ triggers
```

---

### **B. Enable Required Extensions**

Go to **Supabase Dashboard → Database → Extensions**

```
[ ] pg_net - Required for push notification trigger (http_post function)
[ ] uuid-ossp - UUID generation (usually enabled by default)
```

---

### **C. Create Storage Buckets**

See `STORAGE_BUCKET_SETUP.md` for detailed instructions.

Go to **Supabase Dashboard → Storage**

**Bucket 1: avatars**
```
[ ] Bucket created
[ ] Public: Yes (checked)
[ ] File size limit: 5 MB
[ ] Allowed MIME types: image/jpeg, image/png, image/webp
[ ] 4 policies created (upload, view, update, delete own avatar)
```

**Bucket 2: documents**
```
[ ] Bucket created
[ ] Public: No (unchecked)
[ ] File size limit: 10 MB
[ ] Allowed MIME types: image/jpeg, image/png, application/pdf
[ ] 6 policies created (upload own, view own, manager view, DFD/HRD view, update/delete own)
```

**Test Storage:**
```typescript
// Test avatar upload
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file);

// Test document upload
const { data, error } = await supabase.storage
  .from('documents')
  .upload(`${userId}/doc.pdf`, file);
```

---

### **D. Set Environment Variables**

Go to **Supabase Dashboard → Settings → API**

**Required for Edge Functions:**
```
[ ] app.supabase_url - Copy from API Settings
[ ] app.supabase_service_role_key - Copy Service Role Key (keep secret!)
```

Set these in **Supabase Dashboard → Edge Functions → Settings**:
```bash
# Via Supabase CLI:
supabase secrets set app.supabase_url="https://xxxxx.supabase.co"
supabase secrets set app.supabase_service_role_key="eyJhbGc..."
```

---

### **E. Deploy Edge Functions**

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Link project
supabase link --project-ref YOUR_PROJECT_REF

# 4. Deploy edge function
supabase functions deploy send-push-notification
```

**Verification:**
```bash
# Test edge function
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notification' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-uuid",
    "title": "Test",
    "body": "Test notification"
  }'
```

---

## 🔐 2. SECURITY & POLICIES

### **A. Row Level Security (RLS)**

```sql
-- Verify RLS is enabled on ALL tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected output:**
```
[ ] profiles - rowsecurity: t (true)
[ ] departments - rowsecurity: t
[ ] leave_types - rowsecurity: t
[ ] leave_requests - rowsecurity: t
[ ] notifications - rowsecurity: t
[ ] payrolls - rowsecurity: t
[ ] public_holidays - rowsecurity: t
[ ] activity_logs - rowsecurity: t
```

---

### **B. Test RLS Policies**

**Test as Employee:**
```sql
-- Set session as employee user
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims.sub TO 'EMPLOYEE_USER_UUID';

-- Should only see own profile
SELECT * FROM profiles;

-- Should only see own leave requests
SELECT * FROM leave_requests;

-- Should NOT see payrolls of others (should be empty or error)
SELECT * FROM payrolls WHERE user_id != 'EMPLOYEE_USER_UUID';
```

**Test as Manager:**
```sql
SET LOCAL request.jwt.claims.sub TO 'MANAGER_USER_UUID';

-- Should see direct reports' leave requests
SELECT * FROM leave_requests WHERE user_id IN (
  SELECT id FROM profiles WHERE manager_id = 'MANAGER_USER_UUID'
);
```

**Test as HRD:**
```sql
SET LOCAL request.jwt.claims.sub TO 'HRD_USER_UUID';

-- Should see ALL leave requests
SELECT COUNT(*) FROM leave_requests;

-- Should see ALL profiles
SELECT COUNT(*) FROM profiles;

-- Should see ALL payrolls
SELECT COUNT(*) FROM payrolls;
```

---

### **C. Verify Storage Policies**

**Test as Employee:**
```typescript
// Should succeed: Upload to own folder
await supabase.storage.from('avatars').upload(`${myUserId}/avatar.jpg`, file);

// Should fail: Upload to another user's folder
await supabase.storage.from('avatars').upload(`${otherUserId}/avatar.jpg`, file);
// Expected: Error "new row violates row-level security policy"
```

---

### **D. API Keys Security**

```
[ ] Anon key is used in mobile app (public, safe to expose)
[ ] Service Role key is ONLY used in Edge Functions (never in mobile app!)
[ ] Service Role key stored in Supabase Secrets (not in code)
[ ] .env.local added to .gitignore (prevent leak to GitHub)
```

---

## 📱 3. MOBILE APP CONFIGURATION

### **A. Environment Variables**

**File: `.env`**
```bash
[ ] EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
[ ] EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
[ ] EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
```

**Verification:**
```typescript
// Test in app
console.log('Supabase URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('Project ID:', process.env.EXPO_PUBLIC_PROJECT_ID);
```

---

### **B. App Configuration (app.json)**

```json
[ ] name: "Annual & Benefit"
[ ] slug: "annual-benefit"
[ ] version: "1.0.0"
[ ] orientation: "portrait"
[ ] icon: "./assets/images/icon2.png" (1024x1024)
[ ] splash.image: "./assets/images/splash-icon.png"
[ ] ios.bundleIdentifier: "com.tecnodev.annualbenefit"
[ ] ios.buildNumber: "1"
[ ] android.package: "com.tecnodev.annualbenefit"
[ ] android.versionCode: 1
[ ] extra.eas.projectId: "YOUR_EXPO_PROJECT_ID"
[ ] updates.url: "https://u.expo.dev/YOUR_EXPO_PROJECT_ID"
```

---

### **C. Permissions Configuration**

**iOS Permissions (Info.plist):**
```
[ ] NSCameraUsageDescription - "This app uses the camera to take photos for profile pictures and document uploads."
[ ] NSPhotoLibraryUsageDescription - "This app accesses your photos to let you choose profile pictures and upload documents."
[ ] NSFaceIDUsageDescription - "This app uses Face ID to provide secure and convenient login to your account."
[ ] NSLocationWhenInUseUsageDescription - "This app uses your location to verify attendance check-in."
```

**Android Permissions (AndroidManifest.xml):**
```
[ ] CAMERA
[ ] READ_MEDIA_IMAGES (Android 13+)
[ ] READ_MEDIA_VIDEO
[ ] READ_EXTERNAL_STORAGE (Android <13)
[ ] WRITE_EXTERNAL_STORAGE (Android <13)
[ ] NOTIFICATIONS
[ ] VIBRATE
[ ] USE_BIOMETRIC
[ ] USE_FINGERPRINT
[ ] ACCESS_FINE_LOCATION
[ ] INTERNET (auto-included)
```

**Blocked Permissions:**
```
[ ] RECORD_AUDIO - Not used, blocked
```

---

### **D. Push Notifications Setup**

```
[ ] expo-notifications plugin configured in app.json
[ ] Notification icon created (96x96, white silhouette)
[ ] Push notification permissions requested on first launch
[ ] Expo push token saved to profiles.expo_push_token
[ ] Edge function deployed for sending push notifications
[ ] Database trigger created for auto-send on notification insert
```

**Test Push Notification:**
```bash
# Send test notification via Expo API
curl -X POST https://exp.host/--/api/v2/push/send \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "ExponentPushToken[xxxxxx]",
    "title": "Test",
    "body": "Test notification",
    "sound": "default"
  }'
```

---

## 🏗️ 4. BUILD CONFIGURATION

### **A. EAS Build Setup**

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login
eas login

# 3. Configure project
eas project:init

# 4. Configure builds
eas build:configure
```

**File: `eas.json`**
```
[ ] development profile configured (APK, internal testing)
[ ] preview profile configured (APK/IPA, beta testing)
[ ] production profile configured (AAB/IPA, store release)
```

---

### **B. Android Build**

**Requirements:**
```
[ ] Google Play Console account created
[ ] App created in Play Console
[ ] Bundle ID: com.tecnodev.annualbenefit
[ ] Keystore generated (via eas credentials)
[ ] Service account JSON created (for auto-submit)
```

**Build Commands:**
```bash
# Development (APK)
eas build --profile development --platform android

# Preview (APK for beta testing)
eas build --profile preview --platform android

# Production (AAB for Play Store)
eas build --profile production --platform android
```

---

### **C. iOS Build**

**Requirements:**
```
[ ] Apple Developer account ($99/year)
[ ] App ID created in App Store Connect
[ ] Bundle ID: com.tecnodev.annualbenefit
[ ] Distribution certificate generated (via eas credentials)
[ ] Apple ID and Team ID configured in eas.json
```

**Build Commands:**
```bash
# Development (Simulator)
eas build --profile development --platform ios

# Preview (TestFlight)
eas build --profile preview --platform ios

# Production (App Store)
eas build --profile production --platform ios
```

---

## 🧪 5. TESTING CHECKLIST

### **A. Authentication Testing**

```
[ ] Sign up new user → Profile auto-created
[ ] Sign in with email/password
[ ] Enable biometric login (Face ID/Fingerprint)
[ ] Login with biometric (no password required)
[ ] Enable 2FA → QR code shown
[ ] Login with 2FA code
[ ] Disable 2FA → Code not required anymore
[ ] Change password with re-authentication
[ ] Logout
```

---

### **B. Leave Request Flow**

**As Employee:**
```
[ ] View leave balance on home screen
[ ] Submit leave request (with document upload)
[ ] View pending leave requests
[ ] Receive notification when approved/rejected
[ ] Check leave balance updated after approval
```

**As Manager:**
```
[ ] View pending approvals from direct reports
[ ] Approve leave request → Next stage (DFD)
[ ] Reject leave request → Employee notified
```

**As DFD:**
```
[ ] View pending approvals from managers
[ ] Approve leave request → Next stage (HRD)
```

**As HRD:**
```
[ ] View all pending leave requests
[ ] Approve final stage → Status = approved, balance deducted
[ ] View all profiles and payrolls
```

---

### **C. Permissions Testing**

```
[ ] Camera permission dialog shown with clear message
[ ] Photo library permission dialog shown
[ ] Notification permission requested on first launch
[ ] Face ID/Fingerprint permission shown when enabling
[ ] Location permission shown on attendance check-in
[ ] App still works if permission denied (graceful fallback)
```

---

### **D. Push Notification Testing**

```
[ ] Receive notification when app is in foreground
[ ] Receive notification when app is in background
[ ] Receive notification when app is closed
[ ] Notification shown in system tray
[ ] Tap notification → App opens to correct screen
[ ] Notification badge counter updates
[ ] Mark notification as read
[ ] Mark all notifications as read
```

---

### **E. Data Security Testing**

```
[ ] Employee cannot view other employee's profile details
[ ] Employee cannot view other's leave requests
[ ] Employee cannot approve own leave request
[ ] Employee cannot view/edit payrolls
[ ] Manager can only view direct reports' leave requests
[ ] Manager cannot view DFD/HRD stage approvals
[ ] DFD/HRD can view all data
[ ] Storage: Cannot upload to other user's folder
[ ] Storage: Cannot view other user's documents
```

---

### **F. Error Handling Testing**

```
[ ] No internet connection → Show offline message
[ ] Supabase down → Show error message
[ ] Invalid credentials → Show clear error
[ ] Insufficient leave balance → Cannot approve (trigger prevents)
[ ] Upload file too large → Show error
[ ] Invalid file type → Show error
[ ] Edge function error → Notification still created
```

---

### **G. Performance Testing**

```
[ ] App loads within 3 seconds
[ ] Image uploads complete within 10 seconds
[ ] Leave request submission < 5 seconds
[ ] Notification appears within 2 seconds of trigger
[ ] No memory leaks during extended use
[ ] No crashes during normal operation
```

---

## 📊 6. MONITORING & ANALYTICS

### **A. Error Tracking**

```
[ ] Sentry or similar error tracking setup (optional)
[ ] Console logs removed from production build
[ ] Error boundaries implemented for critical screens
```

---

### **B. Database Monitoring**

Go to **Supabase Dashboard → Database → Logs**

```
[ ] Monitor query performance (slow queries)
[ ] Monitor connection pool usage
[ ] Set up alerts for high error rate
```

---

### **C. Edge Function Monitoring**

Go to **Supabase Dashboard → Edge Functions → Logs**

```
[ ] Monitor send-push-notification success rate
[ ] Check for 4xx/5xx errors
[ ] Verify response times < 1s
```

---

## 📝 7. DOCUMENTATION

```
[ ] README.md updated with setup instructions
[ ] PRODUCTION_BUILD_GUIDE.md reviewed
[ ] STORAGE_BUCKET_SETUP.md reviewed
[ ] PRIVACY_POLICY.md published (required for App Store)
[ ] Terms of Service created (optional but recommended)
[ ] API documentation for edge functions (optional)
```

---

## 🚀 8. DEPLOYMENT

### **A. Pre-Deployment**

```
[ ] All migrations run successfully
[ ] All RLS policies tested and working
[ ] Storage buckets created with policies
[ ] Edge functions deployed and tested
[ ] Environment variables set correctly
[ ] All tests passed
[ ] No critical errors in logs
```

---

### **B. Build & Submit**

**Android:**
```bash
# 1. Build production AAB
eas build --profile production --platform android

# 2. Download build
eas build:download [BUILD_ID]

# 3. Submit to Play Store (internal track first)
eas submit --platform android --profile production

# 4. Beta testing (internal track → closed testing → open testing)
# 5. Promote to production
```

**iOS:**
```bash
# 1. Build production IPA
eas build --profile production --platform ios

# 2. Submit to App Store (TestFlight first)
eas submit --platform ios --profile production

# 3. Beta testing via TestFlight
# 4. Submit for App Store review
# 5. Release to production
```

---

### **C. Post-Deployment Monitoring**

```
[ ] Monitor crash reports (first 24 hours critical)
[ ] Check user reviews/feedback
[ ] Monitor database performance
[ ] Monitor edge function logs
[ ] Check push notification delivery rate
[ ] Monitor API error rates
```

---

## 🔄 9. ROLLBACK PLAN

**If critical issues found in production:**

```bash
# Option 1: Rollback to previous version (Play Store / App Store)
# - Go to console → Select previous version → Promote to production

# Option 2: Push hotfix update
# 1. Fix critical bug
# 2. Bump version (e.g., 1.0.0 → 1.0.1)
# 3. Build and submit emergency update
# 4. Request expedited review (iOS) or use production track (Android)

# Option 3: OTA Update (for non-native code changes)
eas update --branch production --message "Hotfix: [description]"
```

---

## ✅ FINAL SIGN-OFF

**Before releasing to production, confirm:**

```
[ ] All items in this checklist completed
[ ] Tested on both iOS and Android physical devices
[ ] Tested with different user roles (employee, manager, DFD, HRD)
[ ] No critical bugs or security issues
[ ] Database backups enabled
[ ] Team notified of release
[ ] Support channel ready (email/chat)
[ ] Privacy policy and terms accessible from app
```

---

## 📞 SUPPORT & TROUBLESHOOTING

### **Common Issues:**

**1. Push notifications not working**
- Check: pg_net extension enabled?
- Check: Edge function deployed?
- Check: expo_push_token saved in database?
- Check: Test on physical device (not emulator)

**2. RLS errors ("new row violates row-level security policy")**
- Check: Policies created correctly?
- Check: Using anon key (not service role) in app?
- Test: Run verification queries from section 2B

**3. Storage upload fails**
- Check: Bucket created?
- Check: Policies created?
- Check: File path format: `{user_id}/filename.ext`

**4. Edge function errors**
- Check: Environment variables set?
- Check: Function deployed successfully?
- Check: Logs in Supabase Dashboard

---

## 📚 RESOURCES

- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- EAS Build: https://docs.expo.dev/build/introduction/
- Expo Push Notifications: https://docs.expo.dev/push-notifications/overview/
- App Store Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play Guidelines: https://play.google.com/about/developer-content-policy/

---

**🎉 Selamat! Aplikasi siap production jika semua checklist terpenuhi.**

**Last Updated**: December 11, 2024
**Version**: 1.0.0
