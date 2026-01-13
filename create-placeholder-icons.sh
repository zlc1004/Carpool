#!/bin/bash

# Create placeholder icons for development until AppIcon.icon is available
# This allows the app to run without errors

echo "🎨 Creating placeholder icons for development..."

# Create assets directory if it doesn't exist
mkdir -p assets/images

# Create a simple placeholder icon using ImageMagick (if available) or download a placeholder
if command -v convert >/dev/null 2>&1; then
    echo "📱 Creating placeholder icons with ImageMagick..."
    
    # Create a simple blue square with "CS" text for CarpSchool
    convert -size 1024x1024 xc:'#1e3a8a' \
            -gravity center \
            -pointsize 300 \
            -fill white \
            -font Arial-Bold \
            -annotate +0+0 'CS' \
            ./assets/images/icon.png
    
    # Create smaller versions
    convert ./assets/images/icon.png -resize 192x192 ./assets/images/favicon.png
    convert ./assets/images/icon.png -resize 432x432 ./assets/images/adaptive-icon.png
    
    # Create splash screen with logo centered
    convert -size 1284x2778 xc:'#ffffff' \
            -gravity center \
            ./assets/images/icon.png -resize 400x400 \
            -composite ./assets/images/splash.png
    
    echo "✅ Placeholder icons created successfully!"
else
    echo "⚠️  ImageMagick not found. Creating simple placeholder files..."
    
    # Create simple text placeholders if ImageMagick is not available
    echo "Placeholder Icon" > ./assets/images/icon.png.txt
    echo "Placeholder Favicon" > ./assets/images/favicon.png.txt
    echo "Placeholder Splash" > ./assets/images/splash.png.txt
    echo "Placeholder Adaptive" > ./assets/images/adaptive-icon.png.txt
    
    echo "ℹ️  Text placeholders created. Install ImageMagick or provide AppIcon.icon for actual images."
fi

echo ""
echo "🚀 Development setup complete!"
echo "   To generate final icons from AppIcon.icon, run: ./generate-icons.sh"
