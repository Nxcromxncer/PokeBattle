#!/bin/bash
set -e

echo "🎮 Starting Pokémon Battle Simulator Backend..."
echo ""

cd "$(dirname "$0")"

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate
source venv/bin/activate

# Install deps
echo "📦 Installing dependencies..."
pip install -r requirements.txt -q

# Copy env if not exists
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "⚠️  .env created — add your GROQ_API_KEY for AI narration (optional)"
fi

# Load env
export $(grep -v '^#' .env | xargs) 2>/dev/null || true

echo ""
echo "✅ Backend starting at http://localhost:8000"
echo "📖 API Docs at http://localhost:8000/docs"
echo ""

uvicorn main:app --reload --host 0.0.0.0 --port 8000
