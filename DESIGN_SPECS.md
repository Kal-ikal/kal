# 🎨 App Icon & Splash Screen Design Specifications

## Project: Annual & Benefit HRIS App

---

## 1️⃣ APP ICON (icon2.png)

### Design Brief:
**Concept:** Calendar with dollar sign (representing annual leave & benefits)
- Primary Element: Calendar icon
- Secondary Element: Dollar sign ($)
- Color Scheme: Blue gradient (#4A90E2 to #2563EB)
- Style: Modern, flat, professional

### Technical Specs:
- **Size:** 1024x1024 px
- **Format:** PNG
- **Color Mode:** RGB
- **Background:** Solid color (NO transparency for iOS)
- **Safe Area:** Keep important elements 10% from edges
- **File:** `./assets/images/icon2.png`

### Design Guidelines:
```
┌─────────────────────────────────────┐
│   Safe Area (10% padding)           │
│   ┌─────────────────────────────┐   │
│   │                             │   │
│   │   [Calendar Icon]           │   │
│   │         with                │   │
│   │    [$ Dollar Sign]          │   │
│   │                             │   │
│   │   Blue Gradient Background  │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Colors:**
- Background: Linear Gradient
  - Start: #4A90E2 (Light Blue)
  - End: #2563EB (Dark Blue)
- Icon Elements: White (#FFFFFF)
- Accent: Light Blue (#EFF6FF)

---

## 2️⃣ SPLASH SCREEN (splash-icon.png)

### Design Brief:
**Same as App Icon** but optimized for vertical screen

### Technical Specs:
- **Size:** 1284x2778 px (iPhone 14 Pro Max resolution)
- **Format:** PNG with transparency
- **Color Mode:** RGBA
- **Background:** Transparent (will use backgroundColor from app.json)
- **Content Area:** Center 512x512 px
- **File:** `./assets/images/splash-icon.png`

### Design Guidelines:
```
┌──────────────────────────┐
│                          │
│      (Empty Space)       │
│                          │
│   ┌──────────────────┐   │
│   │                  │   │
│   │  [Calendar Icon] │   │
│   │       with       │   │
│   │  [$ Dollar Sign] │   │
│   │                  │   │
│   │   512x512 px     │   │
│   │                  │   │
│   └──────────────────┘   │
│                          │
│      (Empty Space)       │
│                          │
└──────────────────────────┘
```

**Background:**
- Light Mode: #EFF6FF (configured in app.json)
- Dark Mode: #000000 (configured in app.json)

**Logo:** Same calendar + $ icon (white color)

---

## 3️⃣ NOTIFICATION ICON (notification-icon.png)

### Design Brief:
**Simplified WHITE SILHOUETTE** of calendar + $ icon

### Technical Specs:
- **Size:** 96x96 px (xxxhdpi)
- **Format:** PNG with transparency
- **Color:** White (#FFFFFF) ONLY
- **Background:** Transparent
- **Style:** Simple silhouette (NO gradients, NO colors)
- **File:** `./assets/images/notification-icon.png`

### Design Guidelines:
```
┌────────────────────────┐
│  Transparent BG        │
│                        │
│    ┌──────────┐        │
│    │  [📅$]   │        │  ← Simple white silhouette
│    │  White   │        │     No gradients
│    │  Simple  │        │     No shadows
│    └──────────┘        │
│                        │
│  96x96 px              │
└────────────────────────┘
```

**Important:**
- MUST be white on transparent
- No colors, no gradients
- Simple shapes only
- Will be tinted by Android system

---

## 4️⃣ ANDROID ADAPTIVE ICONS

### A) Foreground (android-icon-foreground.png)

**Technical Specs:**
- **Size:** 1024x1024 px
- **Format:** PNG with transparency
- **Safe Area:** 432x432 px center (circle mask)
- **File:** `./assets/images/android-icon-foreground.png`

**Content:** Same calendar + $ icon (centered, 432x432 px)

```
┌─────────────────────────────────────┐
│  Transparent (296px padding)        │
│   ┌─────────────────────────────┐   │
│   │   Safe Circle Area          │   │
│   │   (432x432 px)              │   │
│   │                             │   │
│   │   [Calendar + $ Icon]       │   │
│   │      White Color            │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

---

### B) Background (android-icon-background.png)

**Technical Specs:**
- **Size:** 1024x1024 px
- **Format:** PNG (solid color, no transparency)
- **Color:** #E6F4FE (Light Blue)
- **File:** `./assets/images/android-icon-background.png`

**Content:** Solid color background

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                                     │
│         Solid Color                 │
│         #E6F4FE                     │
│         (Light Blue)                │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

---

### C) Monochrome (android-icon-monochrome.png)

**Technical Specs:**
- **Size:** 1024x1024 px
- **Format:** PNG with transparency
- **Color:** White (#FFFFFF) or Black (#000000)
- **File:** `./assets/images/android-icon-monochrome.png`

**Content:** Same as foreground but monochrome (for Android 13+ themed icons)

---

## 📐 SIZE REFERENCE TABLE

| Asset | Size | Format | Transparency | File Name |
|-------|------|--------|--------------|-----------|
| App Icon (iOS/Android) | 1024x1024 | PNG | No (solid BG) | icon2.png |
| Splash Screen | 1284x2778 | PNG | Yes | splash-icon.png |
| Notification Icon | 96x96 | PNG | Yes (white only) | notification-icon.png |
| Adaptive Foreground | 1024x1024 | PNG | Yes | android-icon-foreground.png |
| Adaptive Background | 1024x1024 | PNG | No (solid color) | android-icon-background.png |
| Adaptive Monochrome | 1024x1024 | PNG | Yes | android-icon-monochrome.png |

---

## 🎨 COLOR PALETTE

```
Primary Blue Gradient:
- Light: #4A90E2
- Dark: #2563EB

Background:
- Light Mode: #EFF6FF
- Dark Mode: #000000
- Adaptive BG: #E6F4FE

Icons:
- Primary: White (#FFFFFF)
- Notification: White (#FFFFFF)
```

---

## 📱 PREVIEW MOCKUPS

### iOS Home Screen:
- Icon shows: Calendar + $ on blue gradient
- Corners: Rounded by iOS automatically
- Shadow: Added by iOS

### Android Home Screen:
- Adaptive icon: Foreground calendar + background blue
- Shape: Circle, squircle, or square (user choice)
- Monochrome: For themed icons (Android 13+)

### Notification Panel:
- Small white icon: Simple calendar + $ silhouette
- Tinted by system: White on dark notification, dark on light

---

## ✅ CHECKLIST FOR DESIGNER

```
App Icon:
[ ] 1024x1024 px PNG
[ ] Blue gradient background (#4A90E2 to #2563EB)
[ ] White calendar + dollar sign icon
[ ] No transparency
[ ] Safe area 10% from edges

Splash Screen:
[ ] 1284x2778 px PNG
[ ] Transparent background
[ ] Center logo 512x512 px
[ ] Same icon as app icon (white)

Notification Icon:
[ ] 96x96 px PNG
[ ] White silhouette ONLY
[ ] Transparent background
[ ] Simple shapes (no gradients)

Adaptive Icons (Android):
[ ] Foreground: 1024x1024, transparent, icon in 432x432 safe area
[ ] Background: 1024x1024, solid #E6F4FE
[ ] Monochrome: 1024x1024, white/black silhouette

Export Settings:
[ ] PNG format
[ ] RGB color mode (RGBA for transparent)
[ ] No compression (lossless)
[ ] Exact pixel dimensions
[ ] Correct file names
```

---

## 🔗 HELPFUL RESOURCES

**Icon Design Inspiration:**
- Dribbble: https://dribbble.com/search/calendar-app-icon
- Behance: https://www.behance.net/search/projects?search=app+icon+finance

**Icon Generators (if not using custom design):**
- Icon Kitchen: https://icon.kitchen/
- App Icon Generator: https://www.appicon.co/
- Android Asset Studio: https://romannurik.github.io/AndroidAssetStudio/

**Testing Icons:**
- iOS: Upload to App Store Connect → View in simulator
- Android: Build with EAS → Install on device

---

## 📞 NEED HELP?

Contact designer with:
1. This specification document
2. Reference image (calendar + dollar sign concept)
3. Color palette above
4. Example apps for inspiration (finance/HRIS apps)

**Estimated Design Time:** 2-4 hours for all assets

---

**Last Updated:** December 2024
**App:** Annual & Benefit HRIS
**Version:** 1.0.0
