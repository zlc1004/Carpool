#!/bin/bash

# CarpSchool Icon Generation Script
# Generates all required icons from AppIcon.icon using Xcode Icon Composer

# Check if AppIcon.icon exists
if [ ! -f "AppIcon.icon" ]; then
    echo "❌ AppIcon.icon not found in current directory"
    echo "Please place the AppIcon.icon file in the CarpSchoolExpo directory"
    exit 1
fi

# Check if ictool exists
ICTOOL="/Applications/Xcode.app/Contents/Applications/Icon Composer.app/Contents/Executables/ictool"
if [ ! -f "$ICTOOL" ]; then
    echo "❌ ictool not found. Please ensure Xcode is installed."
    exit 1
fi

echo "🎨 Generating icons from AppIcon.icon..."

# Create assets directory if it doesn't exist
mkdir -p assets/images

# Generate main app icon (1024x1024 for Expo)
echo "📱 Generating main app icon (1024x1024)..."
"$ICTOOL" AppIcon.icon --export-preview ios light 1024 1024 1x ./assets/images/icon.png

# Generate favicon (192x192 for web)
echo "🌐 Generating favicon (192x192)..."
"$ICTOOL" AppIcon.icon --export-preview ios light 192 192 1x ./assets/images/favicon.png

# Generate splash screen background (1284x2778 for iOS)
echo "🖼️ Generating splash screen (1284x2778)..."
"$ICTOOL" AppIcon.icon --export-preview ios light 1284 2778 1x ./assets/images/splash.png

# Generate additional sizes for various platforms
echo "📐 Generating additional icon sizes..."

# iOS sizes
"$ICTOOL" AppIcon.icon --export-preview ios light 180 180 3x ./assets/images/icon-180.png
"$ICTOOL" AppIcon.icon --export-preview ios light 120 120 2x ./assets/images/icon-120.png
"$ICTOOL" AppIcon.icon --export-preview ios light 167 167 2x ./assets/images/icon-167.png

# Android sizes
"$ICTOOL" AppIcon.icon --export-preview android light 192 192 1x ./assets/images/icon-192.png
"$ICTOOL" AppIcon.icon --export-preview android light 144 144 1x ./assets/images/icon-144.png
"$ICTOOL" AppIcon.icon --export-preview android light 96 96 1x ./assets/images/icon-96.png
"$ICTOOL" AppIcon.icon --export-preview android light 72 72 1x ./assets/images/icon-72.png
"$ICTOOL" AppIcon.icon --export-preview android light 48 48 1x ./assets/images/icon-48.png

# Generate adaptive icon for Android
echo "🤖 Generating adaptive icon for Android..."
"$ICTOOL" AppIcon.icon --export-preview android light 432 432 1x ./assets/images/adaptive-icon.png

echo "✅ Icon generation complete!"
echo ""
echo "Generated files:"
echo "  📱 assets/images/icon.png (1024x1024) - Main app icon"
echo "  🌐 assets/images/favicon.png (192x192) - Web favicon"
echo "  🖼️ assets/images/splash.png (1284x2778) - Splash screen"
echo "  📱 assets/images/icon-*.png - Platform-specific sizes"
echo "  🤖 assets/images/adaptive-icon.png (432x432) - Android adaptive icon"
echo ""
echo "🚀 Ready to use! Run 'npx expo start' to see your new icons."
