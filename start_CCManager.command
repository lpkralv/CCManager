#!/bin/bash
# start_CCManager.command — Double-click to start the CCManager server
# Detects and kills any already-running instance before launching a new one.

PROJECT_DIR="/Volumes/Sheridan/sandbox/ClaudeCodeManager"
PORT=3000
NODE="/usr/local/bin/node"
SERVER="$PROJECT_DIR/dist/server/index.js"

cd "$PROJECT_DIR" || { echo "ERROR: Cannot access $PROJECT_DIR"; read -p "Press Enter to close..."; exit 1; }

echo "╔══════════════════════════════════════╗"
echo "║       CCManager Server Launcher      ║"
echo "╚══════════════════════════════════════╝"
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

# Create logs directory if needed
mkdir -p "$PROJECT_DIR/logs"
LOG_FILE="$PROJECT_DIR/logs/ccmanager.log"

# Start the server in the background with output to log file
nohup "$NODE" "$SERVER" >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!

# Wait for server to come up (poll health endpoint)
echo "  Waiting for server..."
for i in $(seq 1 10); do
    sleep 1
    if curl -s "http://localhost:$PORT/api/health" > /dev/null 2>&1; then
        echo ""
        echo "  Server is running! (PID: $SERVER_PID)"
        echo "  URL:  http://localhost:$PORT"
        echo "  Logs: $LOG_FILE"
        echo "  Stop: double-click stop_CCManager.command"
        echo ""
        echo "  You can close this window."
        exit 0
    fi
    printf "."
done

# If we get here, server didn't start
echo ""
echo "  WARNING: Server may not have started correctly."
echo "  Check logs: $LOG_FILE"
echo ""
read -p "  Press Enter to close..."
