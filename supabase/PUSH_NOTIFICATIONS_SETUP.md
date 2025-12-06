# 📱 Push Notifications Setup Guide

Panduan lengkap setup Push Notifications untuk HRIS Mobile App menggunakan Expo + Supabase.

## 📋 Daftar Isi

1. [Prerequisites](#prerequisites)
2. [Setup Database](#setup-database)
3. [Deploy Edge Function](#deploy-edge-function)
4. [Configure App](#configure-app)
5. [Testing](#testing)

---

## Prerequisites

✅ Dependencies sudah terinstall:
- `expo-notifications` (v0.32.14)
- `expo-device` (v8.0.10)

✅ File yang sudah dibuat:
- `hooks/usePushNotifications.ts` - Hook untuk handle notifications
- `supabase/functions/send-push-notification/index.ts` - Edge Function
- `supabase/migrations/20250101_add_expo_push_token.sql` - Migration kolom
- `supabase/migrations/20250102_trigger_push_notifications.sql` - Trigger function

---

## Setup Database

### 1. Jalankan Migration untuk Kolom `expo_push_token`

Buka **Supabase Dashboard** → **SQL Editor** → Paste dan jalankan:

```sql
-- File: supabase/migrations/20250101_add_expo_push_token.sql

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_expo_push_token
ON profiles(expo_push_token)
WHERE expo_push_token IS NOT NULL;

COMMENT ON COLUMN profiles.expo_push_token IS 'Expo push notification token for mobile app';
```

### 2. Enable `pg_net` Extension (untuk Trigger)

Buka **Supabase Dashboard** → **Database** → **Extensions** → Enable **pg_net**

### 3. Setup Database Trigger (Optional)

Jika ingin otomatis kirim push saat insert ke table `notifications`:

```sql
-- File: supabase/migrations/20250102_trigger_push_notifications.sql

CREATE OR REPLACE FUNCTION send_push_notification_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := NEW.user_id;

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

DROP TRIGGER IF EXISTS trigger_send_push_notification ON notifications;

CREATE TRIGGER trigger_send_push_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION send_push_notification_on_insert();
```

---

## Deploy Edge Function

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login ke Supabase

```bash
supabase login
```

### 3. Link Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Deploy Edge Function

```bash
supabase functions deploy send-push-notification
```

### 5. Set Environment Variables (di Supabase Dashboard)

Buka **Edge Functions** → **send-push-notification** → **Settings** → **Secrets**

Tidak perlu tambah secret khusus karena sudah otomatis ada:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Configure App

### 1. Tambah `EXPO_PUBLIC_PROJECT_ID` di `.env`

```env
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
```

**Cara dapatkan Project ID:**
1. Buka file `app.json` → lihat `extra.eas.projectId`
2. Atau jalankan: `npx expo config --type public` → cari `projectId`

### 2. Update `app.json` (jika belum ada)

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#ffffff"
        }
      ]
    ]
  }
}
```

### 3. Build App dengan EAS (untuk Production)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build untuk Android
eas build --platform android --profile preview

# Build untuk iOS
eas build --platform ios --profile preview
```

**Note:** Push notifications **hanya bekerja di physical device**, tidak di simulator/emulator.

---

## Testing

### Method 1: Manual Insert ke Table `notifications`

Jika sudah setup trigger, cukup insert data ke table `notifications`:

```sql
INSERT INTO notifications (user_id, title, message, type)
VALUES (
  'USER_UUID_HERE',
  'Test Notification',
  'Ini adalah test push notification!',
  'info'
);
```

### Method 2: Call Edge Function Langsung

Via **curl**:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USER_UUID_HERE",
    "title": "Test Notification",
    "body": "Ini adalah test push notification!",
    "data": {
      "screen": "/profile"
    }
  }'
```

Via **JavaScript** (dari admin panel):

```typescript
const { data, error } = await supabase.functions.invoke('send-push-notification', {
  body: {
    user_id: 'USER_UUID_HERE',
    title: 'Test Notification',
    body: 'Ini adalah test push notification!',
    data: {
      screen: '/profile'
    }
  }
})

console.log(data, error)
```

### Method 3: Test dari App

Tambahkan tombol test di admin panel:

```typescript
import { supabase } from '@/lib/supabase'

async function sendTestNotification(userId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: userId,
        title: 'Test Notification',
        body: 'Ini adalah test push notification!',
        data: { screen: '/profile' }
      }
    })

    if (error) throw error
    console.log('Notification sent:', data)
  } catch (error) {
    console.error('Error sending notification:', error)
  }
}
```

---

## Troubleshooting

### ❌ "Must use physical device for Push Notifications"

**Solusi:** Push notifications tidak bekerja di emulator/simulator. Gunakan physical device.

### ❌ Token tidak tersimpan di database

**Cek:**
1. User sudah login?
2. Permission notification sudah granted?
3. Console log di `usePushNotifications.ts` untuk debug

### ❌ Edge Function error 500

**Cek:**
1. `pg_net` extension sudah enabled?
2. User memiliki `expo_push_token` di database?
3. Edge Function log di Supabase Dashboard → Edge Functions → Logs

### ❌ Notification tidak muncul di device

**Cek:**
1. Token valid? Cek di table `profiles.expo_push_token`
2. App permission notification aktif di device settings?
3. Cek Expo Push Response di Edge Function logs

---

## Custom Navigation dari Notification

Edit di `hooks/usePushNotifications.ts`:

```typescript
responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data;

  // Custom navigation
  if (data.screen) {
    router.push(data.screen); // Contoh: router.push('/profile')
  }

  if (data.notification_id) {
    // Mark notification as read
    supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', data.notification_id)
  }
});
```

---

## 🎉 Done!

Push Notifications sudah siap digunakan. Setiap kali ada INSERT ke table `notifications`, user akan otomatis terima push notification di device mereka.

**File yang sudah dibuat:**
- ✅ `hooks/usePushNotifications.ts`
- ✅ `supabase/functions/send-push-notification/index.ts`
- ✅ `supabase/migrations/20250101_add_expo_push_token.sql`
- ✅ `supabase/migrations/20250102_trigger_push_notifications.sql`
- ✅ Integrasi di `app/_layout.tsx`
