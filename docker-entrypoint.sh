#!/bin/bash
set -e

cleanup() {
    echo "Shutting down..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

trap cleanup SIGTERM SIGINT

echo "Starting Xvfb..."
Xvfb $DISPLAY -screen 0 1280x1024x24 &
sleep 1

echo "Starting Fluxbox window manager..."
fluxbox &
sleep 1

echo "Starting x11vnc..."
x11vnc -display $DISPLAY -forever -shared -rfbport 5900 -nopw -q &
sleep 1

echo "Starting websockify on port 6080..."
websockify --web /usr/share/novnc 6080 localhost:5900 &
sleep 1

echo "Starting application server..."
cd /app

echo ""
echo "============================================"
echo "Application:  http://localhost:${PORT}"
echo "============================================"
echo ""

exec node dist/server.js

