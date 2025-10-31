#!/bin/bash

# Attendance Management System - Main Startup Script
# This script starts MySQL, backend, and frontend services

set -e

echo "🚀 Starting Attendance Management System..."

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    pkill -f "node.*server.js" 2>/dev/null || true
    pkill -f "react-scripts start" 2>/dev/null || true
    echo "✅ Cleanup complete"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start MySQL if not running
echo "📦 Checking MySQL..."
if ! systemctl is-active --quiet mysql 2>/dev/null; then
    echo "Starting MySQL..."
    sudo service mysql start
    sleep 2
fi

# Verify MySQL connection
if ! mysql -u root -pattendance123 -e "SELECT 1" >/dev/null 2>&1; then
    echo "❌ MySQL connection failed. Please run: sudo mysql -e \"ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'attendance123'; FLUSH PRIVILEGES;\""
    exit 1
fi

echo "✅ MySQL is running"

# Kill any existing processes
echo "🧹 Cleaning up old processes..."
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
sleep 1

# Start backend
echo "📡 Starting backend server..."
cd backend && npm start > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:3001/api/health >/dev/null 2>&1; then
        echo "✅ Backend is ready (port 3001)"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend failed to start. Check /tmp/backend.log for details"
        tail -20 /tmp/backend.log
        exit 1
    fi
    sleep 1
done

# Start frontend
echo "🌐 Starting frontend..."
cd frontend && npm start > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ System started successfully!"
echo ""
echo "📊 Service Status:"
echo "   MySQL:    ✅ Running"
echo "   Backend:  ✅ Running (PID: $BACKEND_PID)"
echo "   Frontend: ✅ Running (PID: $FRONTEND_PID)"
echo ""
echo "🔗 Access URLs:"
echo "   Frontend:    http://localhost:3111"
echo "   Backend API: http://localhost:3001"
echo ""
echo "🔑 Login Credentials:"
echo "   Email:    admin@company.com"
echo "   Password: admin123"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""
echo "Press Ctrl+C to stop all services"
wait
