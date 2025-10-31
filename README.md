# Attendance Management System

A comprehensive attendance and absence management system built with Node.js/Express backend and React frontend, featuring two-factor authentication via email.

## Features

### Core Functionality
- **Employee Clock In/Out System**: Real-time attendance tracking with precise time logging
- **Break Management**: Start/stop break tracking with automatic duration calculation
- **Daily Hours Calculation**: Automatic calculation of working hours (minimum 8 hours daily)
- **Weekly/Monthly Reports**: Comprehensive attendance analytics and reporting
- **Overtime Tracking**: Automatic overtime calculation beyond standard hours

### Security Features
- **Two-Factor Authentication (2FA)**: Email-based verification for enhanced security
- **JWT Token Authentication**: Secure session management
- **Password Encryption**: Bcrypt password hashing
- **Rate Limiting**: API endpoint protection against abuse
- **Input Validation**: Comprehensive data validation and sanitization

### User Management
- **Role-Based Access Control**: Admin and employee roles
- **User Profile Management**: Employee information and settings
- **Leave Request System**: Submit and manage absence requests
- **Department Organization**: Team-based user organization

### Reporting & Analytics
- **Daily Attendance Summary**: Real-time attendance status
- **Individual Reports**: Personal attendance history and statistics
- **Team Reports**: Manager dashboard with team analytics
- **Export Functionality**: Data export capabilities

## Tech Stack

### Backend
- **Node.js** with Express.js framework
- **MySQL** database with connection pooling
- **JWT** for authentication
- **Bcrypt** for password hashing
- **Nodemailer** for email notifications
- **Moment.js** for date/time handling

### Frontend
- **React 18** with functional components and hooks
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Axios** for API communication
- **React Hot Toast** for notifications
- **Lucide React** for icons

## Installation

### Prerequisites
- Node.js 16 or higher
- MySQL 8.0 or higher
- npm or yarn package manager

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Attendance App"
   ```

2. **Run the deployment script**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

3. **Configure environment variables**
   
   Edit `backend/.env` with your settings:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=attendance_system

   # Email Configuration (for 2FA)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password

   # Security
   JWT_SECRET=your-super-secret-jwt-key
   ```

4. **Start the services**
   
   Backend:
   ```bash
   cd backend
   npm start
   ```
   
   Frontend:
   ```bash
   cd frontend
   npm start
   ```

### Docker Deployment (Alternative)

```bash
# Set environment variables
export DB_PASSWORD=your_mysql_password

# Start all services
docker-compose up -d
```

## Usage

### Default Admin Account
- **Email**: admin@company.com
- **Password**: admin123
- **⚠️ Change this password after first login**

### Employee Workflow
1. **Login** with email and password
2. **Enter 2FA code** sent to email
3. **Clock In** when starting work
4. **Take breaks** as needed
5. **Clock Out** at end of day
6. **View reports** and attendance history

### Admin Features
- **User Management**: Create, edit, deactivate employees
- **Attendance Monitoring**: Real-time team attendance dashboard
- **Leave Management**: Approve/reject leave requests
- **Reports**: Generate team and individual reports

## API Endpoints

### Authentication
- `POST /api/auth/login` - Initial login
- `POST /api/auth/verify-2fa` - Two-factor verification
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get user profile

### Attendance
- `POST /api/attendance/clock-in` - Clock in
- `POST /api/attendance/clock-out` - Clock out
- `POST /api/attendance/break-start` - Start break
- `POST /api/attendance/break-end` - End break
- `GET /api/attendance/status/:userId` - Get current status
- `GET /api/attendance/records/:userId` - Get attendance records

### Users (Admin)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PUT /api/users/:userId` - Update user
- `DELETE /api/users/:userId` - Deactivate user

### Reports
- `GET /api/reports/attendance/:userId` - Individual report
- `GET /api/reports/team/attendance` - Team report
- `GET /api/reports/daily/:date` - Daily summary

## Configuration

### System Settings
The application includes configurable settings in the database:
- Minimum daily hours (default: 8)
- Maximum daily hours (default: 12)
- Grace period for late check-in (default: 15 minutes)
- Working days per week (default: 5)

### Email Configuration
Set up SMTP settings for 2FA emails:
1. Use Gmail: Enable 2-factor authentication and create an app password
2. Update EMAIL_* variables in .env
3. Test email configuration using the health check endpoint

## Security Best Practices

### Production Deployment
1. **Change default passwords**
2. **Use strong JWT secrets**
3. **Enable HTTPS/SSL**
4. **Configure firewall rules**
5. **Regular security updates**
6. **Database backups**

### Environment Security
- Store sensitive data in environment variables
- Use different secrets for different environments
- Regularly rotate JWT secrets and passwords
- Monitor failed login attempts

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify MySQL is running
- Check database credentials in .env
- Ensure database exists and is accessible

**Email 2FA Not Working**
- Verify SMTP settings
- Check email credentials
- Ensure "less secure apps" is enabled (Gmail)

**Frontend Build Errors**
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License - see the package.json file for details.

## Support

For support and questions:
- Check the troubleshooting section
- Review the API documentation
- Create an issue on the repository