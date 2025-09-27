#!/bin/bash

# Script to fix macOS Gatekeeper issues for TimeCatcher
# This script removes quarantine attributes that may prevent the app from running

APP_PATH="/Applications/TimeCatcher.app"

echo "🔧 TimeCatcher macOS Permission Fix"
echo "=================================="

if [ ! -d "$APP_PATH" ]; then
    echo "❌ TimeCatcher.app not found in /Applications/"
    echo "   Please make sure TimeCatcher is installed in your Applications folder"
    exit 1
fi

echo "📍 Found TimeCatcher at: $APP_PATH"
echo "🧹 Removing quarantine attributes..."

if xattr -cr "$APP_PATH" 2>/dev/null; then
    echo "✅ Successfully removed quarantine attributes"
    echo "🚀 TimeCatcher should now launch without Gatekeeper warnings"
else
    echo "⚠️  Could not remove quarantine attributes"
    echo "   You may need to run this script with elevated permissions:"
    echo "   sudo $0"
fi

echo ""
echo "Alternative solutions:"
echo "1. Right-click TimeCatcher.app → Open"
echo "2. System Settings → Privacy & Security → Click 'Open Anyway'"