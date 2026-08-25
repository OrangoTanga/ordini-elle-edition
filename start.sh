#!/bin/bash

echo "=== Avvio Ordini Elly Edition ==="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKER_URL="https://ordini-elly-worker.elly-order.workers.dev"

echo "[1/2] Test connessione Worker..."
if curl -sf "$WORKER_URL/health" > /dev/null 2>&1; then
    echo "  ✅ Worker raggiungibile"
else
    echo "  ⚠️  Worker non risponde"
fi

echo ""
echo "[2/2] Avvio app..."
echo ""

# Android app in nuova finestra terminale
osascript -e "tell app \"Terminal\" to do script \"cd '$SCRIPT_DIR/android-app' && npx expo start\""

sleep 3

# Windows app in background
cd "$SCRIPT_DIR/windows-app"
npm run dev > /tmp/ordini-windows.log 2>&1 &
WINDOWS_PID=$!

echo ""
echo "=== Avviate ==="
echo "Android: finestra terminale con Expo QR"
echo "Windows: finestra Electron (log: /tmp/ordini-windows.log)"
echo ""
echo "Per fermare tutto:"
echo "  pkill -f 'expo start'"
echo "  kill $WINDOWS_PID"
