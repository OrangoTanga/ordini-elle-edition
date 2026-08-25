#!/bin/bash
# ============================================================
# Avvia Ordini Elly Edition (pannello Windows/Electron) in prova
# Doppio click in Finder oppure:  ./avvia-prova.command
# ============================================================

echo "=== Avvio Ordini Elly Edition (prova) ==="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/windows-app"

if [ ! -d "$APP_DIR/node_modules" ]; then
    echo "[1/3] Installazione dipendenze (prima volta, può richiedere un po')..."
    cd "$APP_DIR"
    npm install || { echo "❌ npm install fallito"; read -n 1 -s -r -p "Premi un tasto per chiudere"; exit 1; }
else
    echo "[1/3] Dipendenze già presenti ✔"
fi

echo "[2/3] Compilazione main + renderer..."
cd "$APP_DIR"
npm run build > /tmp/ordini-build.log 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Build fallita. Ultime righe del log:"
    tail -30 /tmp/ordini-build.log
    read -n 1 -s -r -p "Premi un tasto per chiudere"
    exit 1
fi

echo "[3/3] Avvio app in prova..."
echo ""
echo "L'app si sta aprendo... (per chiudere: chiudi la finestra oppure Ctrl+C qui)"
echo ""

npm start

echo ""
echo "=== App chiusa ==="
read -n 1 -s -r -p "Premi un tasto per chiudere la finestra"
