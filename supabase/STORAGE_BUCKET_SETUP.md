# 🗄️ Supabase Storage Bucket Setup Guide

**CRITICAL FOR PRODUCTION**: Storage buckets and policies must be created manually in Supabase Dashboard.

---

## 📦 Required Storage Buckets

### **1. `avatars` Bucket (Public)**
For user profile pictures.

### **2. `documents` Bucket (Private)**
For leave request documents and other sensitive files.

---

## 🔧 Setup Instructions

### **Step 1: Create Storage Buckets**

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**

#### **Create `avatars` bucket:**
```
Bucket name: avatars
Public bucket: ✅ Yes (checked)
File size limit: 5 MB
Allowed MIME types: image/jpeg, image/png, image/webp
```

#### **Create `documents` bucket:**
```
Bucket name: documents
Public bucket: ❌ No (unchecked)
File size limit: 10 MB
Allowed MIME types: image/jpeg, image/png, application/pdf
```

---

## 🔐 Step 2: Create Storage Policies

### **For `avatars` Bucket:**

Go to **Storage** → **avatars** → **Policies** → **New Policy** → **Create a custom policy**

#### **Policy 1: Users can upload own avatar**
```sql
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### **Policy 2: Anyone can view avatars**
```sql
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

#### **Policy 3: Users can update own avatar**
```sql
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### **Policy 4: Users can delete own avatar**
```sql
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

### **For `documents` Bucket:**

Go to **Storage** → **documents** → **Policies** → **New Policy** → **Create a custom policy**

#### **Policy 1: Users can upload own documents**
```sql
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### **Policy 2: Users can view own documents**
```sql
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### **Policy 3: Managers can view direct reports documents**
```sql
CREATE POLICY "Managers can view direct reports documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id::text FROM profiles WHERE manager_id = auth.uid()
  )
);
```

#### **Policy 4: DFD and HRD can view all documents**
```sql
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
```

#### **Policy 5: Users can update own documents**
```sql
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

#### **Policy 6: Users can delete own documents**
```sql
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

---

## 🧪 Testing Storage Policies

### **Test 1: Upload Avatar**
```typescript
// Should succeed: Upload to own folder
const { data, error } = await supabase.storage
  .from('avatars')
  .upload(`${userId}/avatar.jpg`, file);

// Should fail: Upload to another user's folder
const { error } = await supabase.storage
  .from('avatars')
  .upload(`${otherUserId}/avatar.jpg`, file);
```

### **Test 2: View Documents**
```typescript
// Should succeed: View own documents
const { data } = await supabase.storage
  .from('documents')
  .list(`${userId}`);

// Should fail (for employee): View other user's documents
const { data } = await supabase.storage
  .from('documents')
  .list(`${otherUserId}`);

// Should succeed (for manager): View direct report's documents
const { data } = await supabase.storage
  .from('documents')
  .list(`${directReportUserId}`);
```

---

## 📁 File Naming Convention

### **Avatars:**
```
{user_id}/avatar.jpg
{user_id}/avatar.png
```

### **Documents (Leave Requests):**
```
{user_id}/{timestamp}-{random}.pdf
{user_id}/{timestamp}-{random}.jpg

Example:
abc123-def456-789/1704556800000-x7k9m2.pdf
```

---

## 🚨 Common Issues

### **Error: "new row violates row-level security policy"**
**Cause**: Trying to upload to wrong folder or bucket doesn't exist.
**Fix**: Ensure file path starts with `{user_id}/`

### **Error: "Bucket not found"**
**Cause**: Storage bucket not created yet.
**Fix**: Create bucket in Supabase Dashboard → Storage

### **Error: "policy does not exist"**
**Cause**: Storage policies not created.
**Fix**: Run all storage policy SQL commands above in Dashboard

---

## 🔒 Security Best Practices

1. **Always use user-specific folders**: `{user_id}/*`
2. **Never use service_role key on client side** (bypasses all policies)
3. **Set file size limits** to prevent abuse
4. **Restrict MIME types** to only what's needed
5. **Enable antivirus scanning** (Supabase Pro feature)

---

## ✅ Production Checklist

```
[ ] avatars bucket created (public: true)
[ ] documents bucket created (public: false)
[ ] All 4 policies created for avatars bucket
[ ] All 6 policies created for documents bucket
[ ] File size limits configured
[ ] Allowed MIME types configured
[ ] Tested upload as employee
[ ] Tested upload to wrong folder (should fail)
[ ] Tested manager viewing direct report's documents
[ ] Tested HRD viewing all documents
[ ] Tested employee viewing other's documents (should fail)
```

---

## 📞 Support

If storage policies are not working:
1. Check if RLS is enabled on `storage.objects`
2. Verify policies in: **Storage** → **Policies** tab
3. Test with different user roles
4. Check browser console for detailed error messages

---

**Last Updated**: December 2024
**Supabase Version**: Latest
