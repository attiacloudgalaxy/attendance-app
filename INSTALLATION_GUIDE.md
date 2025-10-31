# 🚀 Attendance Management System - One-Click Installation

This repository contains a complete attendance management system with automated installation scripts for any environment.

## 📋 Features

- **Complete Attendance Tracking**: Clock in/out, break management, 8-hour daily tracking
- **Two-Factor Authentication**: Email-based 2FA security
- **Admin Portal**: User management, reports, manual time logging
- **Modern UI**: Baby blue theme with glass morphism design
- **Real-time Updates**: Live progress tracking and notifications
- **Comprehensive Reporting**: Weekly/monthly attendance reports
- **Multi-Database Support**: MySQL with optimized schema

## 🎯 One-Click Installation

### For Any Environment (Ubuntu, macOS, etc.)
```bash
curl -fsSL https://raw.githubusercontent.com/attiacloudgalaxy/attendance-app/main/install.sh | bash
```

### For GitHub Codespaces (Quick Setup)
```bash
curl -fsSL https://raw.githubusercontent.com/attiacloudgalaxy/attendance-app/main/codespaces-setup.sh | bash
```

### Manual Installation
```bash
# Clone the repository
git clone https://github.com/attiacloudgalaxy/attendance-app.git
cd attendance-app

# Make installation script executable
chmod +x install.sh

# Run the installer
./install.sh
```

## 🌟 What the Installer Does

The installation script automatically:

1. **Detects your operating system** (Ubuntu, macOS, etc.)
2. **Installs all prerequisites**:
   - Node.js 18
   - MySQL Server
   - Git and build tools
   - System packages
3. **Sets up the database**:
   - Creates `attendance_system` database
   - Runs all schema migrations
   - Inserts default users
4. **Configures the application**:
   - Backend API with environment variables
   - Frontend React app with proper settings
   - SSL certificates for production
5. **Creates startup scripts**:
   - `start-all.sh` - Starts complete system
   - `start-backend.sh` - Backend only
   - `start-frontend.sh` - Frontend only
6. **Provides access credentials** and URLs

## 🔗 Access Information

After installation, you'll have access to:

### Application URLs
- **Frontend (Main App)**: http://localhost:3111
- **Admin Portal**: http://localhost:3111/admin
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs

### Default Login Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@company.com | admin123 |
| Employee | basim@company.com | basim123 |
| Employee | sara@company.com | sara123 |
| Employee | ahmed@company.com | ahmed123 |

### Database Access
- **Host**: localhost
- **Database**: attendance_system
- **Username**: root
- **Password**: attendance123
- **Port**: 3306

## 🚀 Quick Start

After installation, start the system:

```bash
# Start everything (recommended)
./start-all.sh

# Or start services individually
./start-backend.sh    # Start backend API
./start-frontend.sh   # Start frontend app
```

## 📱 Features Overview

### Employee Features
- ✅ Clock In/Out with timestamp tracking
- ✅ Break time management
- ✅ Daily hours calculation (8-hour target)
- ✅ Personal attendance history
- ✅ Real-time status updates
- ✅ Two-factor authentication

### Admin Features
- 👥 User management (add, edit, delete employees)
- 📊 Comprehensive reporting (daily, weekly, monthly)
- ⏰ Manual time logging and corrections
- 📈 Attendance analytics and insights
- 🔒 System configuration and settings
- 📋 Export reports (PDF, Excel)

### System Features
- 🔐 JWT-based authentication
- 📧 Email-based 2FA
- 🎨 Modern responsive UI
- 📱 Mobile-friendly design
- 🔄 Real-time updates
- 📊 Advanced reporting
- 🛡️ Security features (rate limiting, input validation)

## 🔧 Configuration

### Email Configuration (2FA)
Edit `backend/.env` to configure email for 2FA:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Database Configuration
Edit `backend/.env` for database settings:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=attendance123
DB_NAME=attendance_system
```

### Frontend Configuration
Edit `frontend/.env` for frontend settings:
```env
REACT_APP_API_URL=http://localhost:3001
PORT=3111
```

## 🐳 Docker Support

For containerized deployment:

```bash
# Build and run with Docker Compose
docker-compose up -d

# Access the application
# Frontend: http://localhost:3111
# Backend: http://localhost:3001
```

## 📊 API Documentation

The system includes comprehensive API documentation:

- **Interactive Docs**: http://localhost:3001/api/docs
- **Postman Collection**: Available in `/docs` folder
- **curl Examples**: See `API_TESTING_DOCUMENTATION.md`

### Key API Endpoints
```bash
# Authentication
POST /api/auth/login           # User login
POST /api/auth/verify-2fa      # 2FA verification
POST /api/auth/logout          # User logout

# Attendance
POST /api/attendance/clock-in  # Clock in
POST /api/attendance/clock-out # Clock out
GET  /api/attendance/today     # Today's attendance
GET  /api/attendance/history   # Attendance history

# Admin
GET  /api/admin/users         # Get all users
POST /api/admin/users         # Create user
GET  /api/admin/reports       # Generate reports
```

## 🔍 Troubleshooting

### Common Issues

1. **Port already in use**:
   ```bash
   # Kill existing processes
   pkill -f "node.*server.js"
   pkill -f "react-scripts start"
   ```

2. **Database connection failed**:
   ```bash
   # Restart MySQL
   sudo service mysql restart
   # Or on macOS
   brew services restart mysql
   ```

3. **Permission denied**:
   ```bash
   # Make scripts executable
   chmod +x *.sh
   ```

### System Requirements
- **OS**: Ubuntu 18.04+, macOS 10.15+, or GitHub Codespaces
- **Memory**: 2GB RAM minimum
- **Storage**: 1GB free space
- **Node.js**: 18.x (automatically installed)
- **MySQL**: 8.0+ (automatically installed)

## 📁 Project Structure

```
attendance-app/
├── backend/                 # Node.js/Express API
│   ├── config/             # Database configuration
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   ├── utils/              # Utility functions
│   └── server.js           # Main server file
├── frontend/               # React application
│   ├── public/             # Static files
│   ├── src/                # React source code
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   └── utils/          # Frontend utilities
│   └── package.json        # Frontend dependencies
├── database/               # Database files
│   └── schema.sql          # Database schema
├── docs/                   # Documentation
├── install.sh              # Main installation script
├── codespaces-setup.sh     # GitHub Codespaces setup
└── start-all.sh            # System startup script
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

1. **Documentation**: Check the `/docs` folder
2. **Issues**: Create a GitHub issue
3. **API Testing**: Use the provided curl examples
4. **Configuration**: Review the `.env` files

## 🏆 System Highlights

- **Zero-Configuration**: One command setup
- **Production-Ready**: Includes security features, rate limiting, and SSL
- **Cross-Platform**: Works on Ubuntu, macOS, and GitHub Codespaces  
- **Modern Stack**: React 18, Node.js 18, MySQL 8.0
- **Professional UI**: Baby blue theme with glass morphism
- **Comprehensive**: Attendance tracking, reporting, and admin features
- **Secure**: JWT authentication, 2FA, input validation
- **Scalable**: Optimized database schema and caching

---

🎉 **Ready to get started?** Run the installation command and you'll have a complete attendance management system running in minutes!