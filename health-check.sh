#!/bin/bash

# Health Check Script for Attendance Management System
# Checks if MySQL and Backend are running properly

set -e

echo "🔍 Checking system health..."

# Check MySQL
echo -n "📦 MySQL: "
if systemctl is-active --quiet mysql 2>/dev/null || service mysql status >/dev/null 2>&1; then
    if mysql -u root -pattendance123 -e "SELECT 1" >/dev/null 2>&1; then
        echo "✅ Running and accessible"
    else
        echo "⚠️  Running but connection failed"
        exit 1
    fi
else
    echo "❌ Not running"
    exit 1
fi

# Check Backend
echo -n "📡 Backend (Port 3001): "
if curl -s http://127.0.0.1:3001/api/health >/dev/null 2>&1; then
    HEALTH_STATUS=$(curl -s http://127.0.0.1:3001/api/health | grep -o '"status":"ok"' || echo "")
    if [ -n "$HEALTH_STATUS" ]; then
        echo "✅ Running and healthy"
    else
        echo "⚠️  Running but unhealthy"
        exit 1
    fi
else
    echo "❌ Not accessible"
    exit 1
fi

echo ""
echo "✅ All systems operational!"
echo "🔗 Backend API: http://localhost:3001"
echo "🔗 Frontend: http://localhost:3111"
