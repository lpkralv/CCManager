#!/bin/bash
# start_CCManager.command -- Double-click to start the CCManager server
# Detects and kills any already-running instance before launching a new one.

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3000
NODE="/usr/local/bin/node"
SERVER="$PROJECT_DIR/dist/server/index.js"

cd "$PROJECT_DIR" || { echo "ERROR: Cannot access $PROJECT_DIR"; read -p "Press Enter to close..."; exit 1; }

echo "+-----------------------------------------+"
echo "|       CCManager Server Launcher          |"
echo "+-----------------------------------------+"
echo ""

# Check if server is already running
EXISTING_PID=$(lsof -ti tcp:$PORT 2>/dev/null)

if [ -n "$EXISTING_PID" ]; then
    echo "  Found existing server on port $PORT (PID: $EXISTING_PID)"
    echo "  Stopping it..."
    kill "$EXISTING_PID" 2>/dev/null
    sleep 1

    # Force kill if still running
    if kill -0 "$EXISTING_PID" 2>/dev/null; then
        kill -9 "$EXISTING_PID" 2>/dev/null
        sleep 1
    fi
    echo "  Stopped."
    echo ""
fi

# Verify node exists
if [ ! -x "$NODE" ]; then
    echo "ERROR: Node.js not found at $NODE"
    read -p "Press Enter to close..."
    exit 1
fi

# Verify server file exists
if [ ! -f "$SERVER" ]; then
    echo "ERROR: Server not found at $SERVER"
    echo "       Run 'npm run build' first."
    read -p "Press Enter to close..."
    exit 1
fi

echo "  Starting CCManager server..."
echo "  URL: http://localhost:$PORT"
echo "  Press Ctrl+C to stop."
echo ""

# Start the server (foreground so the terminal stays open)
"$NODE" "$SERVER"
