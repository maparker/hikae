#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT="$SCRIPT_DIR/Hikae/Hikae/Hikae.xcodeproj"
SCHEME="Hikae"
BUILD_DIR="$SCRIPT_DIR/build"
APP="$BUILD_DIR/Hikae.app"

echo "→ Building Hikae (Release)…"

xcodebuild \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO \
  CONFIGURATION_BUILD_DIR="$BUILD_DIR" \
  -derivedDataPath "$BUILD_DIR/.derived" \
  -quiet \
  build

echo "→ Signing…"
xattr -cr "$APP"
codesign --force --deep --sign - "$APP"

echo "✓ Built: $APP"

if [[ "${1:-}" == "--install" ]]; then
  echo "→ Installing to /Applications…"
  pkill -x Hikae 2>/dev/null || true
  sleep 0.5
  rm -rf /Applications/Hikae.app
  cp -r "$APP" /Applications/
  echo "✓ Installed. Launch: open /Applications/Hikae.app"
fi
