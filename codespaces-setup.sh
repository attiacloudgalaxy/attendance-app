#!/usr/bin/env bash

# =============================================================================
# Attendance Management System - GitHub Codespaces Quick Setup
# =============================================================================
# Optimized for GitHub Codespaces with pre-installed tools
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}🚀 Setting up Attendance Management System in GitHub Codespaces...${NC}"

# Configuration
DB_NAME="attendance_system"
DB_USER="root"
DB_PASSWORD="attendance123"

# Install MySQL if not present
if ! command -v mysql >/dev/null 2>&1; then
    echo -e "${BLUE}📦 Installing MySQL...${NC}"
    sudo apt-get update
    sudo apt-get install -y mysql-server
fi

# Start MySQL
sudo service mysql start

# Configure MySQL
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$DB_PASSWORD';" || true
sudo mysql -e "FLUSH PRIVILEGES;" || true

# Setup database
echo -e "${BLUE}🗄️  Setting up database...${NC}"
mysql -u $DB_USER -p$DB_PASSWORD -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;"

# Run database schema (assuming schema.sql exists)
if [[ -f "database/schema.sql" ]]; then
    mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < database/schema.sql
else
    # Create minimal schema
    mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF'
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('employee', 'admin') DEFAULT 'employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    clock_in_time DATETIME,
    clock_out_time DATETIME,
    total_hours DECIMAL(4,2) DEFAULT 0.00,
    status ENUM('present', 'absent', 'partial') DEFAULT 'absent',
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@company.com', '$2b$10$8K1p/a0dRzZuyFJGWWdone.2YoxPOFjg4PAKKgGgEuU4ncTqxs0w.', 'admin'),
('Test Employee', 'employee@company.com', '$2b$10$8K1p/a0dRzZuyFJGWWdone.2YoxPOFjg4PAKKgGgEuU4ncTqxs0w.', 'employee')
ON DUPLICATE KEY UPDATE name=VALUES(name);
EOF
fi

# Setup backend
echo -e "${BLUE}🔧 Configuring backend...${NC}"
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
DB_HOST=localhost
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-for-development
FRONTEND_URL=http://localhost:3111
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EOF

cd ..

# Setup frontend
echo -e "${BLUE}🎨 Configuring frontend...${NC}"
cd frontend

# Install dependencies  
npm install

# Create .env file
cat > .env << EOF
REACT_APP_API_URL=http://localhost:3001
PORT=3111
EOF

cd ..

# Create startup script
cat > start.sh << 'EOF'
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
EOF

chmod +x start.sh

echo -e "${GREEN}✅ Setup complete!${NC}"
echo -e "${YELLOW}Run: ./start.sh${NC}"
echo -e "${CYAN}Access: http://localhost:3111${NC}"
echo -e "${CYAN}Login: admin@company.com / admin123${NC}"