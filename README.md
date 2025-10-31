# Attendance Management System

# Attendance Management System

A comprehensive attendance and absence tracking system built with React frontend, Node.js/Express backend, and MySQL database.

## Features

### Core Functionality
- 🎯 **8-Hour Daily Tracking**: Automatic calculation of daily work hours with 8-hour minimum requirement
- 🔐 **Two-Factor Authentication**: Email-based 2FA for enhanced security
- 👤 **User Management**: Complete user registration and profile management
- 📊 **Real-Time Dashboard**: Live progress tracking and attendance visualization
- 📈 **Comprehensive Reports**: Generate detailed attendance reports with date ranges

### Advanced Features
- 🎨 **Modern Theme**: Beautiful baby blue theme with glass morphism design
- ⏰ **Live Progress Tracker**: Real-time tracking of hours worked out of 8 with 30-second updates
- 🔄 **Manual Attendance**: Admin capability to manually log attendance records
- 👑 **Admin Portal**: Separate admin interface with distinctive purple theme
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices

### Security & Performance
- 🛡️ **JWT Authentication**: Secure token-based authentication
- 🔒 **Password Encryption**: Bcrypt hashing for password security
- 🚦 **Rate Limiting**: API protection with configurable rate limits
- 🔍 **Input Validation**: Comprehensive data validation and sanitization

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL 9.5.0
- **Authentication**: JWT + Bcrypt
- **Email**: Nodemailer with enterprise email support
- **Security**: Helmet, CORS, Rate limiting

### Frontend
- **Framework**: React 18
- **Styling**: Tailwind CSS + Custom CSS
- **State Management**: Context API
- **HTTP Client**: Axios
- **Port**: 3111

### Database Schema
- `users` - User profiles and authentication
- `attendance_records` - Daily attendance tracking
- `auth_tokens` - 2FA token management
- `user_sessions` - Session management
- `report_generations` - Report tracking with counters

## Installation

### Prerequisites
- Node.js (v16+)
- MySQL (v8+)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd attendance-app
   ```

2. **Database Setup**
   ```bash
   # Create MySQL database
   mysql -u root -p
   CREATE DATABASE attendance_system;
   
   # Run schema
   mysql -u root -p attendance_system < database/schema.sql
   ```

3. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Configure environment
   cp .env.example .env
   # Edit .env with your database and email settings
   
   # Run migrations
   node scripts/migrate.js
   ```

4. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

## Configuration

### Environment Variables

**Backend (.env)**
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=attendance_system
JWT_SECRET=your_jwt_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
NODE_ENV=development
```

**Frontend (.env)**
```env
REACT_APP_API_URL=http://localhost:3001
PORT=3111
```

## Running the Application

### Development Mode

1. **Start Backend**
   ```bash
   cd backend
   npm start
   # Server runs on http://localhost:3001
   ```

2. **Start Frontend**
   ```bash
   cd frontend
   npm start
   # App runs on http://localhost:3111
   ```

### Production Mode

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start Production Server**
   ```bash
   cd backend
   NODE_ENV=production npm start
   ```

## Default Users

The system comes with pre-configured test users:

### Admin User
- **Email**: admin@company.com
- **Password**: admin123
- **Role**: Administrator

### Regular Users
- **Email**: basim@company.com, **Password**: basim123
- **Email**: sara@company.com, **Password**: sara123
- **Email**: ahmed@company.com, **Password**: ahmed123

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (sends 2FA)
- `POST /api/auth/verify-2fa` - Verify 2FA token
- `POST /api/auth/logout` - User logout

### Attendance
- `GET /api/attendance/records` - Get user attendance
- `POST /api/attendance/clock-in` - Clock in
- `POST /api/attendance/clock-out` - Clock out
- `GET /api/attendance/status` - Current status
- `GET /api/attendance/progress` - Live progress data

### Admin
- `GET /api/users` - List all users (Admin)
- `POST /api/attendance/manual` - Manual attendance (Admin)
- `GET /api/reports/daily` - Generate reports (Admin)

## Theme System

The application features a modern theme system with:

### User Interface
- **Primary Colors**: Baby blue gradients (#87ceeb to #4682b4)
- **Accent Colors**: Sky blue (#0ea5e9)
- **Design**: Glass morphism with subtle shadows and blur effects

### Admin Interface
- **Primary Colors**: Purple/Magenta gradients (#d946ef to #701a75)
- **Accent Colors**: Violet (#a855f7)
- **Design**: Distinctive styling to differentiate admin functions

### Features
- Custom scrollbars with themed colors
- Smooth transitions and hover effects
- Responsive gradient backgrounds
- Modern card-based layouts

## Security Features

1. **Password Security**: Bcrypt hashing with salt rounds
2. **JWT Tokens**: Secure authentication with expiration
3. **2FA**: Email-based two-factor authentication
4. **Rate Limiting**: Configurable API rate limits
5. **Input Validation**: Comprehensive data validation
6. **CORS**: Configured cross-origin resource sharing
7. **Session Management**: Secure session handling

## Performance Optimizations

1. **Live Updates**: Real-time progress tracking every 30 seconds
2. **Efficient Queries**: Optimized database queries with indexes
3. **Caching**: Strategic caching for better performance
4. **Lazy Loading**: Component-based loading for faster initial load
5. **Responsive Design**: Mobile-optimized interface

## Deployment

### Production Checklist
- [ ] Configure production database
- [ ] Set up SSL certificates
- [ ] Configure environment variables
- [ ] Set up reverse proxy (nginx/Apache)
- [ ] Configure email service (Office365/Gmail)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

### Recommended Production Setup
- **Database**: MySQL 8.0+ with proper indexing
- **Email**: Office365 or Google Workspace for enterprise email
- **Server**: Ubuntu 20.04+ with PM2 for process management
- **Proxy**: Nginx with SSL termination
- **Monitoring**: Log aggregation and health checks

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the documentation for common solutions

---

Built with ❤️ using modern web technologies for efficient attendance management.

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