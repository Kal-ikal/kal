#!/bin/bash

# ===========================================================
# Generate Placeholder Icons untuk Development
# ===========================================================

echo "🎨 Generating placeholder icons..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not installed!"
    echo "Install: sudo apt-get install imagemagick (Linux)"
    echo "Install: brew install imagemagick (Mac)"
    exit 1
fi

# Create directory if not exists
mkdir -p ./assets/images

# Colors
BG_COLOR="#4A90E2"
TEXT_COLOR="white"

# 1. App Icon (1024x1024) - Blue with "AB" text
echo "📱 Creating app icon (icon2.png)..."
convert -size 1024x1024 \
    xc:"$BG_COLOR" \
    -gravity center \
    -pointsize 420 \
    -font "Arial-Bold" \
    -fill "$TEXT_COLOR" \
    -annotate +0+0 "AB" \
    ./assets/images/icon2.png

# 2. Splash Screen (1284x2778) - Transparent with "AB" text
echo "🌅 Creating splash screen (splash-icon.png)..."
convert -size 1284x2778 \
    xc:transparent \
    -gravity center \
    -pointsize 280 \
    -font "Arial-Bold" \
    -fill "$TEXT_COLOR" \
    -annotate +0+0 "AB" \
    ./assets/images/splash-icon.png

# 3. Notification Icon (96x96) - White silhouette
echo "🔔 Creating notification icon (notification-icon.png)..."
convert -size 96x96 \
    xc:transparent \
    -gravity center \
    -pointsize 60 \
    -font "Arial-Bold" \
    -fill "white" \
    -annotate +0+0 "AB" \
    ./assets/images/notification-icon.png

# 4. Android Adaptive Foreground (1024x1024)
echo "🤖 Creating adaptive foreground (android-icon-foreground.png)..."
convert -size 1024x1024 \
    xc:transparent \
    -gravity center \
    -pointsize 360 \
    -font "Arial-Bold" \
    -fill "white" \
    -annotate +0+0 "AB" \
    ./assets/images/android-icon-foreground.png

# 5. Android Adaptive Background (1024x1024)
echo "🎨 Creating adaptive background (android-icon-background.png)..."
convert -size 1024x1024 \
    xc:"#E6F4FE" \
    ./assets/images/android-icon-background.png

# 6. Android Monochrome (1024x1024)
echo "⚫ Creating monochrome icon (android-icon-monochrome.png)..."
convert -size 1024x1024 \
    xc:transparent \
    -gravity center \
    -pointsize 360 \
    -font "Arial-Bold" \
    -fill "white" \
    -annotate +0+0 "AB" \
    ./assets/images/android-icon-monochrome.png

echo ""
echo "✅ All placeholder icons generated!"
echo ""
echo "📁 Files created:"
echo "   - ./assets/images/icon2.png"
echo "   - ./assets/images/splash-icon.png"
echo "   - ./assets/images/notification-icon.png"
echo "   - ./assets/images/android-icon-foreground.png"
echo "   - ./assets/images/android-icon-background.png"
echo "   - ./assets/images/android-icon-monochrome.png"
echo ""
echo "⚠️  These are PLACEHOLDER icons with 'AB' text."
echo "    Replace with final design from designer!"
echo ""
