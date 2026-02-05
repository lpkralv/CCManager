#!/bin/bash
# stop_CCManager.command — Double-click to stop the CCManager server
# Exits gracefully with a friendly message if no server is running.

PORT=3000

echo "╔══════════════════════════════════════╗"
echo "║       CCManager Server Shutdown      ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Find process on the port
EXISTING_PID=$(lsof -ti tcp:$PORT 2>/dev/null)

if [ -z "$EXISTING_PID" ]; then
    echo "  No server is running on port $PORT."
    echo "  Nothing to do."
    echo ""
    read -p "  Press Enter to close..."
    exit 0
fi

echo "  Found server on port $PORT (PID: $EXISTING_PID)"
echo "  Stopping..."

kill "$EXISTING_PID" 2>/dev/null
sleep 2

# Check if it stopped
if kill -0 "$EXISTING_PID" 2>/dev/null; then
    echo "  Server didn't stop gracefully, forcing..."
    kill -9 "$EXISTING_PID" 2>/dev/null
    sleep 1
fi

echo "  Server stopped."
echo ""
read -p "  Press Enter to close..."
