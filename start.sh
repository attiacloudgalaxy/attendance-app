#!/bin/bash
echo "🚀 Starting Attendance Management System..."

# Start MySQL if not running
sudo service mysql start

# Kill any existing processes
pkill -f "node.*server.js" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true

# Start backend
echo "📡 Starting backend..."
cd backend && npm start &

# Wait and start frontend
sleep 3
echo "🌐 Starting frontend..."
cd ../frontend && npm start &

echo ""
echo "✅ System starting up..."
echo "🔗 Frontend: http://localhost:3111"
echo "🔗 Backend API: http://localhost:3001"
echo "🔑 Admin: admin@company.com / admin123"
echo ""
echo "Press Ctrl+C to stop"
wait
