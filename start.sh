#!/bin/bash

# Exit on any error
set -e

echo "🚀 Starting deployment..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd api
npm install --production=false

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../client
npm install --production=false

# Build frontend
echo "🏗️ Building frontend..."
npm run build

# Start backend in background
echo "🔧 Starting backend server..."
cd ../api
npm run start &
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 5

# Start frontend in background
echo "🎨 Starting frontend server..."
cd ../client
npm run start &
FRONTEND_PID=$!

echo "✅ Both services started!"
echo "Backend running (PID: $BACKEND_PID)"
echo "Frontend running (PID: $FRONTEND_PID)"

# Function to handle graceful shutdown
cleanup() {
    echo "🛑 Shutting down services..."
    [ ! -z "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null || true
    [ ! -z "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# Trap signals for graceful shutdown
trap cleanup SIGTERM SIGINT

# Keep script running and wait for processes
wait

