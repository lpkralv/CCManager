#!/bin/bash
set -euo pipefail

# CCManager launchd service uninstaller
# Unloads and removes the CCManager LaunchAgent

PLIST_NAME="com.lpkralv.ccmanager.plist"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "=== CCManager LaunchAgent Teardown ==="
echo ""

# 1. Unload the service
if [ -f "$PLIST_DST" ]; then
    echo "[1/2] Unloading service..."
    launchctl unload "$PLIST_DST" 2>/dev/null || true
    echo "       Service unloaded"

    # 2. Remove the plist
    echo "[2/2] Removing plist..."
    rm "$PLIST_DST"
    echo "       Removed $PLIST_DST"
else
    echo "       No plist found at $PLIST_DST"
    echo "       Service does not appear to be installed."
fi

echo ""
echo "=== Teardown Complete ==="
echo "CCManager LaunchAgent has been removed."
echo "The server will no longer start automatically at login."
echo ""
