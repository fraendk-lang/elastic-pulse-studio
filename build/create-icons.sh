#!/bin/bash

# Script to create icons for Electron app
# Run this from the build directory

echo "Creating icons for Elastic Pulse Studio..."

# Check if we're on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Detected macOS - creating .icns file..."
    
    # Create iconset directory
    mkdir -p icon.iconset
    
    # Create different sizes (required for .icns)
    # We'll use sips to resize the SVG/PNG if available
    if command -v sips &> /dev/null; then
        # Create a temporary PNG from SVG if needed
        if [ ! -f "icon-512.png" ]; then
            echo "Creating 512x512 PNG from SVG..."
            # If we have rsvg-convert or another tool, use it
            # Otherwise, we'll need to manually create the PNG
            echo "Please convert build/icon.png to 512x512 PNG manually or install rsvg-convert"
        fi
        
        # Create all required sizes for .icns
        sizes=(16 32 64 128 256 512 1024)
        for size in "${sizes[@]}"; do
            if [ -f "icon-512.png" ]; then
                sips -z $size $size icon-512.png --out "icon.iconset/icon_${size}x${size}.png"
                # Also create @2x versions
                sips -z $((size*2)) $((size*2)) icon-512.png --out "icon.iconset/icon_${size}x${size}@2x.png"
            fi
        done
        
        # Create .icns file
        iconutil -c icns icon.iconset -o icon.icns
        echo "✅ Created icon.icns"
        rm -rf icon.iconset
    else
        echo "⚠️  sips not found. Please install ImageMagick or use an online converter."
    fi
else
    echo "⚠️  Not on macOS. .icns creation skipped."
fi

# For Windows .ico, we can create a simple multi-size ICO
# This requires ImageMagick or another tool
if command -v convert &> /dev/null; then
    echo "Creating .ico file for Windows..."
    convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
    echo "✅ Created icon.ico"
else
    echo "⚠️  ImageMagick not found. Please install it or use an online converter for .ico"
fi

echo ""
echo "📝 Note: If icons weren't created automatically, you can:"
echo "   1. Use online tools: https://cloudconvert.com/png-to-icns"
echo "   2. Install ImageMagick: brew install imagemagick"
echo "   3. Use the PNG file directly - electron-builder can work with PNG too"

