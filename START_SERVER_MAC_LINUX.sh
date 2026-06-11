#!/bin/bash

echo ""
echo " ============================================"
echo "  SoundWave Music Player — by Harish Kumar"
echo " ============================================"
echo ""
echo "  Starting local server..."
echo "  Your browser will open automatically."
echo ""
echo "  Press Ctrl+C to stop the server."
echo " ============================================"
echo ""

# Try Python 3
if command -v python3 &>/dev/null; then
    echo "  Using Python3..."
    sleep 1
    open http://localhost:8000 2>/dev/null || xdg-open http://localhost:8000 2>/dev/null
    python3 -m http.server 8000
    exit 0
fi

# Try Python 2
if command -v python &>/dev/null; then
    echo "  Using Python..."
    sleep 1
    open http://localhost:8000 2>/dev/null || xdg-open http://localhost:8000 2>/dev/null
    python -m SimpleHTTPServer 8000
    exit 0
fi

# Try npx serve
if command -v npx &>/dev/null; then
    echo "  Using Node.js..."
    sleep 1
    open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null
    npx serve .
    exit 0
fi

echo ""
echo "  ERROR: Python or Node.js not found."
echo ""
echo "  Install Python from: https://www.python.org/downloads/"
echo "  Or Node.js from:     https://nodejs.org/"
echo ""
