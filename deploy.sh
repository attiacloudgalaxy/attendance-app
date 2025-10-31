#!/bin/bash

# Attendance System Deployment Script

echo "🚀 Starting Attendance System Deployment..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

if ! command_exists mysql; then
    echo "⚠️ MySQL client not found. Make sure MySQL is installed and accessible."
fi

# Backend setup
echo "🔧 Setting up backend..."
cd backend

# Install dependencies
echo "📦 Installing backend dependencies..."
npm install

# Check for .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️ Please update the .env file with your configuration before running the application!"
else
    echo "✅ .env file found"
fi

# Run database migration
echo "🗄️ Running database migration..."
npm run migrate

# Frontend setup
echo "🎨 Setting up frontend..."
cd ../frontend

# Install dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Build frontend
echo "🏗️ Building frontend..."
npm run build

echo "✅ Deployment setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Update backend/.env with your database and email configuration"
echo "2. Start the backend: cd backend && npm start"
echo "3. Start the frontend: cd frontend && npm start"
echo "4. Access the application at http://localhost:3000"
echo ""
echo "📚 Default admin credentials:"
echo "Email: admin@company.com"
echo "Password: admin123"
echo ""
echo "🔒 Remember to:"
echo "- Change default passwords"
echo "- Configure email settings for 2FA"
echo "- Set up SSL certificates for production"