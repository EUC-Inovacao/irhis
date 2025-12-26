#!/bin/bash
# Clean build script for iOS development client

set -e

echo "🧹 Cleaning caches and build artifacts..."

cd frontend

# Clean Metro bundler cache
echo "Cleaning Metro cache..."
rm -rf .expo
rm -rf node_modules/.cache

# Clean iOS build folder
echo "Cleaning iOS build artifacts..."
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock

# Clean watchman
echo "Cleaning watchman..."
watchman watch-del-all 2>/dev/null || true

# Clean npm cache
echo "Cleaning npm cache..."
npm cache clean --force

echo "✅ Cleanup complete!"
echo ""
echo "📦 Rebuilding native code..."
npx expo prebuild --clean

echo ""
echo "🔨 Building and installing on device..."
npx expo run:ios --device

