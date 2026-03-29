#!/bin/bash
set -e

echo "🎮 Starting Pokémon Battle Simulator Frontend..."
echo ""

cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

echo ""
echo "✅ Frontend starting at http://localhost:3000"
echo ""

npm run dev
