#!/bin/bash

# Quick Android Setup Verification Script
# Run this to verify your Android development environment is ready

echo "🔍 Verifying Android Setup..."
echo ""

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the frontend directory"
    exit 1
fi

# Check Node modules
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Run: npm install"
else
    echo "✅ node_modules found"
fi

# Check for react-native-safe-area-context
if npm list react-native-safe-area-context > /dev/null 2>&1; then
    echo "✅ react-native-safe-area-context installed"
else
    echo "❌ react-native-safe-area-context not found"
fi

# Check for react-native-ble-plx
if npm list react-native-ble-plx > /dev/null 2>&1; then
    echo "✅ react-native-ble-plx installed"
else
    echo "❌ react-native-ble-plx not found"
fi

echo ""
echo "📱 Checking Android configuration..."

# Check app.json
if grep -q '"android"' app.json; then
    echo "✅ Android config found in app.json"
else
    echo "❌ Android config missing in app.json"
fi

# Check AndroidManifest.xml
if [ -f "android/app/src/main/AndroidManifest.xml" ]; then
    echo "✅ AndroidManifest.xml exists"
    
    # Check for BLE permissions
    if grep -q "BLUETOOTH" android/app/src/main/AndroidManifest.xml; then
        echo "✅ BLE permissions found in AndroidManifest.xml"
    else
        echo "⚠️  BLE permissions not found in AndroidManifest.xml"
    fi
    
    # Check for location permissions
    if grep -q "LOCATION" android/app/src/main/AndroidManifest.xml; then
        echo "✅ Location permissions found in AndroidManifest.xml"
    else
        echo "⚠️  Location permissions not found in AndroidManifest.xml"
    fi
else
    echo "⚠️  AndroidManifest.xml not found (run: npx expo prebuild)"
fi

echo ""
echo "🔧 Checking build tools..."

# Check if Android SDK is available
if command -v adb &> /dev/null; then
    echo "✅ Android SDK tools found (adb)"
    ADB_VERSION=$(adb version | head -n 1)
    echo "   $ADB_VERSION"
else
    echo "⚠️  Android SDK tools not found in PATH"
fi

# Check if Java is available
if command -v java &> /dev/null; then
    echo "✅ Java found"
    JAVA_VERSION=$(java -version 2>&1 | head -n 1)
    echo "   $JAVA_VERSION"
else
    echo "⚠️  Java not found"
fi

# Check if Android device/emulator is connected
if command -v adb &> /dev/null; then
    DEVICES=$(adb devices | grep -v "List" | grep "device" | wc -l | tr -d ' ')
    if [ "$DEVICES" -gt 0 ]; then
        echo "✅ Android device/emulator connected ($DEVICES device(s))"
        adb devices
    else
        echo "⚠️  No Android device/emulator connected"
        echo "   Start an emulator or connect a device"
    fi
fi

echo ""
echo "📋 Quick Code Checks..."

# Check for SafeAreaView from react-native (should be migrated)
SAFEAREA_IMPORTS=$(grep -r "SafeAreaView.*from.*react-native" app/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$SAFEAREA_IMPORTS" -eq 0 ]; then
    echo "✅ No SafeAreaView imports from react-native (migration complete)"
else
    echo "⚠️  Found $SAFEAREA_IMPORTS SafeAreaView imports from react-native"
    echo "   These should be migrated to react-native-safe-area-context"
fi

# Check for SafeAreaView from react-native-safe-area-context
SAFEAREA_CONTEXT_IMPORTS=$(grep -r "SafeAreaView.*from.*react-native-safe-area-context" app/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$SAFEAREA_CONTEXT_IMPORTS" -gt 0 ]; then
    echo "✅ Found $SAFEAREA_CONTEXT_IMPORTS SafeAreaView imports from react-native-safe-area-context"
else
    echo "⚠️  No SafeAreaView imports from react-native-safe-area-context found"
fi

# Check for Pedometer.getStepCountAsync usage with platform checks
PEDOMETER_CALLS=$(grep -r "getStepCountAsync" app/services/healthService.ts 2>/dev/null | wc -l | tr -d ' ')
if [ "$PEDOMETER_CALLS" -gt 0 ]; then
    PLATFORM_CHECKS=$(grep -r "Platform.OS.*android" app/services/healthService.ts 2>/dev/null | wc -l | tr -d ' ')
    if [ "$PLATFORM_CHECKS" -gt 0 ]; then
        echo "✅ Pedometer calls have platform checks"
    else
        echo "⚠️  Pedometer calls found but platform checks may be missing"
    fi
fi

echo ""
echo "✨ Setup verification complete!"
echo ""
echo "Next steps:"
echo "1. Run: npx expo prebuild --clean"
echo "2. Run: npx expo run:android"
echo "3. Check TESTING_GUIDE.md for detailed testing instructions"

