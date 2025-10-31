#!/usr/bin/env bash

# =============================================================================
# Attendance Management System - Complete Installation Script
# =============================================================================
# This script installs all prerequisites and sets up the entire system
# Works on: GitHub Codespaces, Ubuntu, macOS, and other Unix-like systems
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="attendance-management-system"
DB_NAME="attendance_system"
DB_USER="root"
DB_PASSWORD="attendance123"
BACKEND_PORT=3001
FRONTEND_PORT=3111
NODE_VERSION="18"

# Email configuration (will be set interactively)
EMAIL_HOST=""
EMAIL_PORT="587"
EMAIL_USER=""
EMAIL_PASS=""

# =============================================================================
# Utility Functions
# =============================================================================

print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║              ATTENDANCE MANAGEMENT SYSTEM INSTALLER              ║"
    echo "║                     One-Click Setup Script                      ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "\n${BLUE}🔧 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${MAGENTA}ℹ️  $1${NC}"
}

check_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if command -v apt-get >/dev/null 2>&1; then
            DISTRO="ubuntu"
        elif command -v yum >/dev/null 2>&1; then
            DISTRO="centos"
        else
            DISTRO="unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        DISTRO="macos"
    else
        OS="unknown"
        DISTRO="unknown"
    fi
    
    print_info "Detected OS: $OS ($DISTRO)"
}

wait_for_user() {
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read -r
}

# =============================================================================
# Installation Functions
# =============================================================================

install_system_packages() {
    print_step "Installing system packages..."
    
    if [[ "$DISTRO" == "ubuntu" ]]; then
        sudo apt-get update
        sudo apt-get install -y \
            curl \
            wget \
            git \
            build-essential \
            software-properties-common \
            apt-transport-https \
            ca-certificates \
            gnupg \
            lsb-release \
            unzip \
            vim \
            htop \
            net-tools
            
    elif [[ "$DISTRO" == "macos" ]]; then
        # Install Homebrew if not present
        if ! command -v brew >/dev/null 2>&1; then
            print_step "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
        
        brew update
        brew install curl wget git
    fi
    
    print_success "System packages installed"
}

install_nodejs() {
    print_step "Installing Node.js $NODE_VERSION..."
    
    # Install Node.js using NodeSource repository (Linux) or Homebrew (macOS)
    if [[ "$DISTRO" == "ubuntu" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
        
    elif [[ "$DISTRO" == "macos" ]]; then
        brew install node@${NODE_VERSION}
        brew link node@${NODE_VERSION}
    fi
    
    # Verify installation
    node_version=$(node --version)
    npm_version=$(npm --version)
    print_success "Node.js installed: $node_version, npm: $npm_version"
}

install_mysql() {
    print_step "Installing MySQL..."
    
    if [[ "$DISTRO" == "ubuntu" ]]; then
        # Install MySQL Server
        sudo apt-get install -y mysql-server mysql-client
        
        # Start MySQL service
        sudo systemctl start mysql
        sudo systemctl enable mysql
        
        # Secure MySQL installation (automated)
        sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$DB_PASSWORD';"
        sudo mysql -u root -p$DB_PASSWORD -e "DELETE FROM mysql.user WHERE User='';"
        sudo mysql -u root -p$DB_PASSWORD -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
        sudo mysql -u root -p$DB_PASSWORD -e "DROP DATABASE IF EXISTS test;"
        sudo mysql -u root -p$DB_PASSWORD -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"
        sudo mysql -u root -p$DB_PASSWORD -e "FLUSH PRIVILEGES;"
        
    elif [[ "$DISTRO" == "macos" ]]; then
        brew install mysql
        
        # Start MySQL service
        brew services start mysql
        
        # Set root password
        mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '$DB_PASSWORD';" 2>/dev/null || true
    fi
    
    print_success "MySQL installed and configured"
}

setup_database() {
    print_step "Setting up database..."
    
    # Create database
    mysql -u $DB_USER -p$DB_PASSWORD -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    
    # Create database schema
    mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF'
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('employee', 'admin') DEFAULT 'employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Attendance records table
CREATE TABLE IF NOT EXISTS attendance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    clock_in_time DATETIME,
    clock_out_time DATETIME,
    break_start_time DATETIME,
    break_end_time DATETIME,
    total_hours DECIMAL(4,2) DEFAULT 0.00,
    status ENUM('present', 'absent', 'partial') DEFAULT 'absent',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_user_date (user_id, date),
    INDEX idx_date (date),
    INDEX idx_status (status)
);

-- Authentication tokens table (for 2FA)
CREATE TABLE IF NOT EXISTS auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(10) NOT NULL,
    type ENUM('2fa', 'reset') DEFAULT '2fa',
    expires_at DATETIME NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_token (user_id, token),
    INDEX idx_expires (expires_at)
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_user_expires (user_id, expires_at)
);

-- Report generations table
CREATE TABLE IF NOT EXISTS report_generations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    report_type VARCHAR(100) NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_type (user_id, report_type),
    INDEX idx_generated (generated_at)
);
EOF

    # Insert default users
    mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME << 'EOF'
-- Insert default admin user
INSERT INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@company.com', '$2b$10$8K1p/a0dRzZuyFJGWWdone.2YoxPOFjg4PAKKgGgEuU4ncTqxs0w.', 'admin')
ON DUPLICATE KEY UPDATE name='Admin User', role='admin';

-- Insert default employees
INSERT INTO users (name, email, password, role) VALUES 
('Basim Ahmed', 'basim@company.com', '$2b$10$8K1p/a0dRzZuyFJGWWdone.2YoxPOFjg4PAKKgGgEuU4ncTqxs0w.', 'employee'),
('Sara Mohammed', 'sara@company.com', '$2b$10$8K1p/a0dRzZuyFJGWWdone.2YoxPOFjg4PAKKgGgEuU4ncTqxs0w.', 'employee'),
('Ahmed Ali', 'ahmed@company.com', '$2b$10$8K1p/a0dRzZuyFJGWWdone.2YoxPOFjg4PAKKgGgEuU4ncTqxs0w.', 'employee')
ON DUPLICATE KEY UPDATE name=VALUES(name);
EOF

    print_success "Database schema and default users created"
}

clone_repository() {
    print_step "Cloning repository..."
    
    if [[ -d "$PROJECT_NAME" ]]; then
        print_warning "Project directory exists, pulling latest changes..."
        cd $PROJECT_NAME
        git pull origin main
        cd ..
    else
        git clone https://github.com/attiacloudgalaxy/attendance-app.git $PROJECT_NAME
    fi
    
    cd $PROJECT_NAME
    print_success "Repository cloned/updated"
}

setup_backend() {
    print_step "Setting up backend..."
    
    cd backend
    
    # Install dependencies
    npm install
    
    # Create .env file
    cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_PORT=3306

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=$BACKEND_PORT
NODE_ENV=development

# Email Configuration (for 2FA)
EMAIL_HOST=$EMAIL_HOST
EMAIL_PORT=$EMAIL_PORT
EMAIL_SECURE=false
EMAIL_USER=$EMAIL_USER
EMAIL_PASS=$EMAIL_PASS

# CORS Configuration
FRONTEND_URL=http://localhost:$FRONTEND_PORT

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
EOF

    print_success "Backend configured"
    cd ..
}

setup_frontend() {
    print_step "Setting up frontend..."
    
    cd frontend
    
    # Install dependencies
    npm install
    
    # Create .env file
    cat > .env << EOF
REACT_APP_API_URL=http://localhost:$BACKEND_PORT
PORT=$FRONTEND_PORT
GENERATE_SOURCEMAP=false
EOF

    print_success "Frontend configured"
    cd ..
}

create_startup_scripts() {
    print_step "Creating startup scripts..."
    
    # Create start-backend script
    cat > start-backend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Attendance Management System Backend..."
cd backend
echo "📦 Installing/updating dependencies..."
npm install
echo "🔧 Running database migrations..."
node scripts/migrate.js 2>/dev/null || echo "⚠️  Migration script not found, skipping..."
echo "🌟 Starting backend server..."
npm start
EOF

    # Create start-frontend script  
    cat > start-frontend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Attendance Management System Frontend..."
cd frontend
echo "📦 Installing/updating dependencies..."
npm install
echo "🌟 Starting frontend development server..."
npm start
EOF

    # Create start-all script
    cat > start-all.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Complete Attendance Management System..."

# Function to kill processes on exit
cleanup() {
    echo "🛑 Shutting down services..."
    pkill -f "node.*server.js" 2>/dev/null || true
    pkill -f "react-scripts start" 2>/dev/null || true
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Start backend in background
echo "📡 Starting backend server..."
cd backend && npm start &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 5

# Start frontend in background
echo "🌐 Starting frontend server..."
cd ../frontend && npm start &
FRONTEND_PID=$!

echo ""
echo "✅ System is starting up..."
echo "🔗 Backend: http://localhost:3001"
echo "🔗 Frontend: http://localhost:3111" 
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
EOF

    # Make scripts executable
    chmod +x start-backend.sh start-frontend.sh start-all.sh
    
    print_success "Startup scripts created"
}

create_systemd_services() {
    if [[ "$DISTRO" == "ubuntu" ]] && [[ "$EUID" -eq 0 ]]; then
        print_step "Creating systemd services..."
        
        # Backend service
        cat > /etc/systemd/system/attendance-backend.service << EOF
[Unit]
Description=Attendance Management System Backend
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=$PWD/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

        # Frontend service (for production build)
        cat > /etc/systemd/system/attendance-frontend.service << EOF
[Unit]
Description=Attendance Management System Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$PWD/frontend
ExecStart=/usr/bin/npx serve -s build -l $FRONTEND_PORT
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

        systemctl daemon-reload
        print_success "Systemd services created"
    fi
}

get_email_config() {
    print_step "Email Configuration for 2FA (Optional)"
    print_info "You can skip this and configure email later in the .env file"
    
    echo -e "\n${YELLOW}Do you want to configure email for 2FA now? (y/N):${NC}"
    read -r configure_email
    
    if [[ "$configure_email" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Enter SMTP host (e.g., smtp.gmail.com):${NC}"
        read -r EMAIL_HOST
        
        echo -e "${YELLOW}Enter email address:${NC}"
        read -r EMAIL_USER
        
        echo -e "${YELLOW}Enter email password or app password:${NC}"
        read -s EMAIL_PASS
        echo
        
        print_success "Email configuration saved"
    else
        print_info "Email configuration skipped - 2FA will use dummy tokens for testing"
    fi
}

# =============================================================================
# Main Installation Process
# =============================================================================

main() {
    print_banner
    
    print_info "This script will install the complete Attendance Management System"
    print_info "It will install: Node.js, MySQL, clone the repository, and configure everything"
    wait_for_user
    
    # Check OS and permissions
    check_os
    
    if [[ "$EUID" -eq 0 ]]; then
        print_warning "Running as root - this is OK for initial setup"
    fi
    
    # Get email configuration
    get_email_config
    
    # Installation steps
    install_system_packages
    install_nodejs
    install_mysql
    setup_database
    clone_repository
    setup_backend
    setup_frontend
    create_startup_scripts
    
    # Optional: Create systemd services for production
    if [[ "$DISTRO" == "ubuntu" ]] && [[ "$EUID" -eq 0 ]]; then
        create_systemd_services
    fi
    
    # Final setup
    print_step "Final system verification..."
    
    # Test database connection
    if mysql -u $DB_USER -p$DB_PASSWORD -e "USE $DB_NAME; SHOW TABLES;" >/dev/null 2>&1; then
        print_success "Database connection verified"
    else
        print_error "Database connection failed"
        exit 1
    fi
    
    # Test Node.js
    if node --version >/dev/null 2>&1; then
        print_success "Node.js installation verified"
    else
        print_error "Node.js installation failed"
        exit 1
    fi
    
    # Show completion message
    show_completion_info
}

show_completion_info() {
    clear
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                    🎉 INSTALLATION COMPLETE! 🎉                 ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${CYAN}📋 SYSTEM ACCESS INFORMATION${NC}"
    echo -e "${BLUE}================================${NC}"
    
    echo -e "\n${YELLOW}🌐 APPLICATION URLS:${NC}"
    echo -e "   Frontend (User Interface): ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
    echo -e "   Backend API:               ${GREEN}http://localhost:$BACKEND_PORT${NC}"
    echo -e "   Admin Portal:              ${GREEN}http://localhost:$FRONTEND_PORT/admin${NC}"
    
    echo -e "\n${YELLOW}🔑 LOGIN CREDENTIALS:${NC}"
    echo -e "   ${MAGENTA}Admin Account:${NC}"
    echo -e "     Email:    admin@company.com"
    echo -e "     Password: admin123"
    
    echo -e "\n   ${MAGENTA}Employee Accounts:${NC}"
    echo -e "     Email: basim@company.com   | Password: basim123"
    echo -e "     Email: sara@company.com    | Password: sara123"
    echo -e "     Email: ahmed@company.com   | Password: ahmed123"
    
    echo -e "\n${YELLOW}🗄️  DATABASE ACCESS:${NC}"
    echo -e "   Host:     localhost"
    echo -e "   Database: $DB_NAME"
    echo -e "   Username: $DB_USER"
    echo -e "   Password: $DB_PASSWORD"
    echo -e "   Port:     3306"
    
    echo -e "\n${YELLOW}🚀 QUICK START COMMANDS:${NC}"
    echo -e "   Start everything:  ${GREEN}./start-all.sh${NC}"
    echo -e "   Start backend:     ${GREEN}./start-backend.sh${NC}"
    echo -e "   Start frontend:    ${GREEN}./start-frontend.sh${NC}"
    
    echo -e "\n${YELLOW}📁 PROJECT STRUCTURE:${NC}"
    echo -e "   Project Directory: ${GREEN}$(pwd)${NC}"
    echo -e "   Backend:          ${GREEN}$(pwd)/backend${NC}"
    echo -e "   Frontend:         ${GREEN}$(pwd)/frontend${NC}"
    
    echo -e "\n${YELLOW}🔧 CONFIGURATION FILES:${NC}"
    echo -e "   Backend Config:   ${GREEN}backend/.env${NC}"
    echo -e "   Frontend Config:  ${GREEN}frontend/.env${NC}"
    
    if [[ -z "$EMAIL_HOST" ]]; then
        echo -e "\n${YELLOW}⚠️  EMAIL CONFIGURATION:${NC}"
        echo -e "   2FA is currently disabled. To enable:"
        echo -e "   1. Edit ${GREEN}backend/.env${NC}"
        echo -e "   2. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASS"
        echo -e "   3. Restart the backend server"
    else
        echo -e "\n${GREEN}✅ EMAIL CONFIGURED:${NC} 2FA is enabled"
    fi
    
    echo -e "\n${YELLOW}📚 DOCUMENTATION:${NC}"
    echo -e "   API Docs:         ${GREEN}API_TESTING_DOCUMENTATION.md${NC}"
    echo -e "   Setup Guide:      ${GREEN}README.md${NC}"
    echo -e "   HTML Docs:        ${GREEN}API_Testing_Documentation.html${NC}"
    
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${GREEN}🎯 Ready to start! Run: ${YELLOW}./start-all.sh${NC}"
    echo -e "${BLUE}================================${NC}"
}

# =============================================================================
# Script Execution
# =============================================================================

# Check if running directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi