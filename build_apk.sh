#!/usr/bin/env bash
# Thirunellai — build the debug APK.
# Usage:  bash build_apk.sh            (from the project root)
# Extra args are passed to Gradle, e.g.:  bash build_apk.sh assembleRelease
set -euo pipefail

# --- Toolchain (paths on this machine) -------------------------------------
export PATH="/d/devtools/node-v24.21.0-win-x64:$PATH"
export JAVA_HOME="D:/App/jdk-21"
export ANDROID_HOME="D:/App/StudioAppData"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# --- 1. Assets must exist before prebuild (icon/splash) --------------------
if [ ! -f assets/icon.png ]; then
  echo "==> Generating brand assets"
  node generate_assets.cjs
fi

# --- 2. Native project (skip if already generated) -------------------------
if [ ! -f android/gradlew ]; then
  echo "==> expo prebuild --platform android"
  npx expo prebuild --platform android
fi

# --- 3. Gradle build --------------------------------------------------------
cd android
./gradlew "${@:-assembleDebug}"

APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK" ]; then
  echo ""
  echo "APK ready: $APK"
fi
