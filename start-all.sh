#!/bin/bash
echo "⚔️  Pokémon Battle Simulator"
echo "================================"
echo ""
echo "Starting both services..."
echo ""
echo "Backend → http://localhost:8000"
echo "Frontend → http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both."
echo ""

# Start backend in background
cd backend
bash start.sh &
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 3

# Start frontend
cd ../frontend
bash start.sh &
FRONTEND_PID=$!

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
