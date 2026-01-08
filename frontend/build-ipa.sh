#!/bin/bash

# Script to build .ipa file from Xcode project
# Usage: ./build-ipa.sh

set -e

cd "$(dirname "$0")"
cd ios

SCHEME="demoirhisn"
WORKSPACE="demoirhisn.xcworkspace"
CONFIGURATION="Release"
BUILD_DIR="build"
ARCHIVE_PATH="${BUILD_DIR}/${SCHEME}.xcarchive"
EXPORT_PATH="${BUILD_DIR}/export"
IPA_PATH="${EXPORT_PATH}/${SCHEME}.ipa"

echo "🧹 Cleaning build directory..."
rm -rf "${BUILD_DIR}"

echo "📦 Building archive..."
xcodebuild archive \
  -workspace "${WORKSPACE}" \
  -scheme "${SCHEME}" \
  -configuration "${CONFIGURATION}" \
  -archivePath "${ARCHIVE_PATH}" \
  -allowProvisioningUpdates \
  CODE_SIGN_IDENTITY="Apple Development" \
  DEVELOPMENT_TEAM="" \
  PROVISIONING_PROFILE_SPECIFIER=""

echo "📤 Exporting IPA..."
# Create export options plist
cat > "${BUILD_DIR}/ExportOptions.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>teamID</key>
    <string></string>
</dict>
</plist>
EOF

xcodebuild -exportArchive \
  -archivePath "${ARCHIVE_PATH}" \
  -exportPath "${EXPORT_PATH}" \
  -exportOptionsPlist "${BUILD_DIR}/ExportOptions.plist" \
  -allowProvisioningUpdates

if [ -f "${IPA_PATH}" ]; then
    echo "✅ IPA file created successfully!"
    echo "📍 Location: ${IPA_PATH}"
    open "${EXPORT_PATH}"
else
    echo "❌ Failed to create IPA file"
    exit 1
fi


