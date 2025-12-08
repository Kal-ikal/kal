# 🚀 Production Build Guide - Annual & Benefit HRIS App

Complete guide untuk build production-ready native app seperti WhatsApp/YouTube level.

---

## 📋 File Configuration yang Sudah Dibuat

```
✅ eas.json                - EAS Build configuration (development, preview, production)
✅ app.json                - Complete app config dengan permissions lengkap
✅ app.json.backup         - Backup original app.json
```

---

## 🔧 STEP-BY-STEP SETUP

### **STEP 1: Get Expo Project ID**

```bash
# Method 1: Via Expo CLI
npx expo login
npx expo whoami

# Lalu dapatkan project ID:
eas project:info
# Atau buat project baru:
eas project:init
```

**Update di 2 tempat:**

**File 1: `app.json`** (line 126 & 133)
```json
"extra": {
  "eas": {
    "projectId": "PASTE_PROJECT_ID_HERE"  // ← Ganti ini
  }
},
"updates": {
  "url": "https://u.expo.dev/PASTE_PROJECT_ID_HERE"  // ← Ganti ini juga
}
```

**File 2: `.env`**
```env
EXPO_PUBLIC_PROJECT_ID=PASTE_PROJECT_ID_HERE
```

---

### **STEP 2: Install EAS CLI**

```bash
npm install -g eas-cli

# Verify installation
eas --version

# Login to Expo
eas login
```

---

### **STEP 3: Configure EAS Build**

```bash
# Link project (kalau belum)
eas project:init

# Configure builds
eas build:configure
```

---

## 📱 PERMISSIONS YANG SUDAH DIKONFIGURASI

### **iOS (via Info.plist):**
- ✅ Camera - Untuk foto profil & upload dokumen
- ✅ Photo Library - Untuk pilih foto dari galeri
- ✅ Face ID / Touch ID - Untuk secure login
- ✅ Notifications - Untuk push notifications
- ✅ Location (When In Use) - Untuk attendance check-in

### **Android (via AndroidManifest.xml):**
- ✅ CAMERA - Untuk foto profil & upload dokumen
- ✅ READ_MEDIA_IMAGES - Untuk akses foto (Android 13+)
- ✅ READ_MEDIA_VIDEO - Untuk akses video
- ✅ READ/WRITE_EXTERNAL_STORAGE - Untuk storage (Android <13)
- ✅ NOTIFICATIONS - Untuk push notifications
- ✅ VIBRATE - Untuk notification vibration
- ✅ USE_BIOMETRIC / USE_FINGERPRINT - Untuk fingerprint login
- ✅ ACCESS_FINE_LOCATION - Untuk attendance check-in
- ❌ RECORD_AUDIO - Blocked (tidak dipakai)

---

## 🏗️ BUILD COMMANDS

### **Development Build (Internal Testing)**

```bash
# Android APK
eas build --profile development --platform android

# iOS Simulator
eas build --profile development --platform ios
```

**Kegunaan:** Testing di physical device dengan developer mode enabled.

---

### **Preview Build (Beta Testing)**

```bash
# Android APK (untuk distribusi internal)
eas build --profile preview --platform android

# iOS (TestFlight)
eas build --profile preview --platform ios
```

**Kegunaan:**
- Share APK ke team untuk testing
- Upload ke TestFlight untuk beta testers (iOS)

---

### **Production Build (App Store Release)**

```bash
# Android AAB (Google Play Store)
eas build --profile production --platform android

# iOS (App Store)
eas build --profile production --platform ios
```

**Kegunaan:** Submit ke Google Play Store / Apple App Store

---

## 📦 BUILD PROCESS FLOW

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Development Build (Testing di Device)                   │
│    eas build --profile development --platform android       │
│    → APK untuk testing fitur baru                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Preview Build (Beta Testing)                             │
│    eas build --profile preview --platform android           │
│    → Share ke QA team / beta testers                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Production Build (Store Release)                         │
│    eas build --profile production --platform android        │
│    → Upload ke Google Play Store                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 CREDENTIAL MANAGEMENT

### **Android - Google Play Store**

**1. Generate Upload Keystore (First Time Only):**
```bash
eas credentials
# Select: Android → Production → Keystore: Set up a new keystore
```

**2. Service Account untuk Auto Submit:**
- Buka Google Play Console → Setup → API Access
- Create Service Account
- Download JSON key
- Save as: `google-play-service-account.json` (di root project)
- Update `eas.json` line 26

**3. Auto Submit ke Google Play:**
```bash
eas submit --platform android --profile production
```

---

### **iOS - App Store**

**1. Apple Developer Account Requirements:**
- Apple Developer Membership ($99/year)
- App Store Connect App ID
- Bundle Identifier: `com.tecnodev.annualbenefit`

**2. Configure Credentials:**
```bash
eas credentials
# Select: iOS → Production → Distribution Certificate
```

**3. Update `eas.json`:**
```json
"ios": {
  "appleId": "your-apple-id@email.com",       // ← Apple ID
  "ascAppId": "1234567890",                    // ← App Store Connect App ID
  "appleTeamId": "ABCD123456"                  // ← Team ID
}
```

**4. Submit to App Store:**
```bash
eas submit --platform ios --profile production
```

---

## 📝 VERSION MANAGEMENT

### **Update Version untuk Release Baru:**

**1. Update `app.json`:**
```json
{
  "expo": {
    "version": "1.0.1",        // ← Semantic versioning (major.minor.patch)
    "ios": {
      "buildNumber": "2"        // ← iOS build number (integer, increment setiap build)
    },
    "android": {
      "versionCode": 2          // ← Android version code (integer, increment setiap build)
    }
  }
}
```

**2. Commit Changes:**
```bash
git add app.json
git commit -m "Bump version to 1.0.1"
git push
```

**3. Build New Version:**
```bash
eas build --profile production --platform all
```

---

## 🎨 ASSETS REQUIREMENTS

### **App Icon (icon2.png):**
- Size: 1024x1024 px
- Format: PNG (no transparency for iOS)
- Location: `./assets/images/icon2.png`

### **Splash Screen (splash-icon.png):**
- Size: 1284x2778 px (or any high-res)
- Format: PNG
- Location: `./assets/images/splash-icon.png`

### **Notification Icon (Android Only):**
- Size: 96x96 px
- Format: PNG (silhouette, white on transparent)
- Location: `./assets/images/notification-icon.png`

**Generate notification icon:**
```bash
# Kalau belum ada, copy dari app icon:
cp ./assets/images/icon2.png ./assets/images/notification-icon.png
```

### **Adaptive Icon (Android):**
- Foreground: `./assets/images/android-icon-foreground.png` (1024x1024)
- Background: `./assets/images/android-icon-background.png` (1024x1024)
- Monochrome: `./assets/images/android-icon-monochrome.png` (1024x1024)

---

## 🧪 TESTING CHECKLIST

Sebelum production release, test semua permissions:

```
[ ] Camera Permission
    - Buka app → Profile → Edit Photo → Take Photo
    - Verify: Camera permission dialog muncul dengan message yang jelas

[ ] Photo Library Permission
    - Buka app → Profile → Edit Photo → Choose from Library
    - Verify: Photo library permission dialog muncul

[ ] Push Notifications
    - Login → Allow notifications
    - Send test notification via admin panel
    - Verify: Notification muncul di notification panel

[ ] Biometric Authentication (Face ID / Fingerprint)
    - Settings → Enable Biometric Login
    - Logout → Login lagi
    - Verify: Face ID / Fingerprint prompt muncul

[ ] Location (Attendance Check-in)
    - Attendance → Check In
    - Verify: Location permission dialog muncul

[ ] Deep Links
    - Test: anb://profile
    - Verify: App opens ke profile screen

[ ] Offline Mode
    - Turn off internet
    - Verify: App masih bisa buka (cached data)

[ ] Background Notifications
    - App di background
    - Send push notification
    - Verify: Notification muncul & tap buka app
```

---

## 🚨 COMMON ISSUES & SOLUTIONS

### **Error: "Keystore not found"**
```bash
# Solution: Generate keystore
eas credentials
# Select: Android → Production → Generate new keystore
```

### **Error: "Bundle identifier already exists"**
```bash
# Solution: Change bundle identifier di app.json
# iOS: com.tecnodev.annualbenefit → com.yourcompany.annualbenefit
# Android: com.tecnodev.annualbenefit → com.yourcompany.annualbenefit
```

### **Error: "Missing notification icon"**
```bash
# Solution: Create notification icon
cp ./assets/images/icon2.png ./assets/images/notification-icon.png
```

### **Push notifications not working in production**
```bash
# Checklist:
1. ✅ Edge Function deployed?
2. ✅ Migration SQL sudah dijalankan?
3. ✅ EXPO_PUBLIC_PROJECT_ID sudah diset?
4. ✅ Build dengan EAS (bukan npx expo run)?
5. ✅ Test di physical device (bukan emulator)?
```

---

## 📊 BUILD STATUS MONITORING

```bash
# Check build status
eas build:list

# View build details
eas build:view [BUILD_ID]

# Download build
eas build:download [BUILD_ID]

# Cancel build
eas build:cancel [BUILD_ID]
```

---

## 🎯 PRODUCTION RELEASE CHECKLIST

```
Setup:
[ ] EXPO_PUBLIC_PROJECT_ID added to .env and app.json
[ ] Bundle identifier unique (iOS & Android)
[ ] Version & build numbers updated
[ ] All assets present (icon, splash, notification icon)
[ ] Privacy policy URL (if required by store)

Testing:
[ ] All permissions tested & working
[ ] Push notifications working
[ ] Biometric login working
[ ] Deep links working
[ ] Offline mode working
[ ] No console errors/warnings

Build:
[ ] Development build tested
[ ] Preview build tested by QA team
[ ] Production build created successfully
[ ] APK/IPA downloaded & verified

Store:
[ ] Google Play Store listing created (Android)
[ ] App Store Connect listing created (iOS)
[ ] Screenshots prepared (phone + tablet)
[ ] Store description written
[ ] Privacy policy published
[ ] Terms of service published

Credentials:
[ ] Android keystore generated & stored securely
[ ] iOS distribution certificate generated
[ ] Service account JSON (Android) configured
[ ] Apple ID & Team ID (iOS) configured

Deployment:
[ ] Submit to Google Play (internal track first)
[ ] Submit to App Store (TestFlight first)
[ ] Beta testing completed
[ ] Final production release approved
```

---

## 🔗 USEFUL LINKS

- EAS Build Docs: https://docs.expo.dev/build/introduction/
- App Store Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play Guidelines: https://play.google.com/about/developer-content-policy/
- Expo Permissions: https://docs.expo.dev/guides/permissions/

---

## 📞 SUPPORT

Kalau ada masalah saat build atau deploy, cek:
1. EAS Build logs: `eas build:view [BUILD_ID]`
2. Expo Discord: https://chat.expo.dev
3. Expo Forums: https://forums.expo.dev

---

**Last Updated:** December 2024
**App Version:** 1.0.0
**Min iOS:** 13.4
**Min Android:** 6.0 (API 23)
