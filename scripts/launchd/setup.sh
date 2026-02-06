#!/bin/bash
set -euo pipefail

# CCManager launchd service installer
# Installs and loads the CCManager server as a macOS LaunchAgent

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PLIST_NAME="com.lpkralv.ccmanager.plist"
PLIST_SRC="$SCRIPT_DIR/$PLIST_NAME"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME"
HEALTH_URL="http://localhost:3000/api/health"

echo "=== CCManager LaunchAgent Setup ==="
echo ""

# 1. Create logs directory
echo "[1/4] Creating logs directory..."
mkdir -p "$PROJECT_DIR/logs"
echo "       logs/ directory ready at $PROJECT_DIR/logs"

# 2. Copy plist to LaunchAgents
echo "[2/4] Installing plist..."
if [ -f "$PLIST_DST" ]; then
    echo "       Existing plist found. Unloading before replacing..."
    launchctl unload "$PLIST_DST" 2>/dev/null || true
fi
cp "$PLIST_SRC" "$PLIST_DST"
echo "       Installed to $PLIST_DST"

# 3. Load the service
echo "[3/4] Loading service..."
launchctl load "$PLIST_DST"
echo "       Service loaded"

# 4. Verify the service is running
echo "[4/4] Verifying service health..."
sleep 2  # Give the server a moment to start

MAX_RETRIES=5
RETRY_DELAY=2
for i in $(seq 1 $MAX_RETRIES); do
    if curl -s --max-time 5 "$HEALTH_URL" > /dev/null 2>&1; then
        echo ""
        echo "=== Setup Complete ==="
        echo ""
        echo "  CCManager is running at: http://localhost:3000"
        echo "  Dashboard:                http://localhost:3000"
        echo ""
        echo "  Logs:       $PROJECT_DIR/logs/ccmanager.log"
        echo "  Error logs: $PROJECT_DIR/logs/ccmanager-error.log"
        echo ""
        echo "  To stop:    npm run service:uninstall"
        echo "  To check:   npm run service:status"
        echo "  To tail:    npm run service:logs"
        echo ""
        exit 0
    fi
    if [ "$i" -lt "$MAX_RETRIES" ]; then
        echo "       Waiting for server to start (attempt $i/$MAX_RETRIES)..."
        sleep $RETRY_DELAY
    fi
done

echo ""
echo "WARNING: Service was loaded but health check failed after $MAX_RETRIES attempts."
echo "The server may still be starting up. Check the logs:"
echo "  tail -f $PROJECT_DIR/logs/ccmanager.log"
echo "  tail -f $PROJECT_DIR/logs/ccmanager-error.log"
echo ""
echo "Make sure the project is built first: npm run build"
exit 1
