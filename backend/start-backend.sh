#!/bin/bash

# Start Backend Server Script
# This script ensures MySQL is running and starts the backend server

set -e

echo "🚀 Starting Backend Server..."

# Check if MySQL is running, start if needed
if ! systemctl is-active --quiet mysql 2>/dev/null; then
    echo "📦 Starting MySQL..."
    sudo service mysql start
    sleep 2
fi

# Check MySQL connection
if ! mysql -u root -pattendance123 -e "SELECT 1" >/dev/null 2>&1; then
    echo "❌ MySQL connection failed. Please check database configuration."
    exit 1
fi

echo "✅ MySQL is running"

# Kill any existing backend process
pkill -f "node.*server.js" 2>/dev/null || true
sleep 1

# Start backend server
echo "📡 Starting backend on port 3001..."
cd "$(dirname "$0")"
npm start
