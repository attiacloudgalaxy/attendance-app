# Troubleshooting Guide

## Connection Refused on Port 3001

### Problem
The frontend shows "Connection refused" or "Network Error" when trying to connect to the backend API at `http://localhost:3001`.

### Symptoms
- Error message: `connect to 127.0.0.1 port 3001 failed: Connection refused`
- Frontend cannot communicate with backend
- API calls timeout or fail immediately

### Root Cause
The backend Node.js server is not running on port 3001.

### Solution

#### Quick Fix
1. **Check if backend is running:**
   ```bash
   curl http://127.0.0.1:3001/api/health
   ```

2. **If not running, start the backend:**
   ```bash
   cd backend
   npm start
   ```

3. **Or use the startup script:**
   ```bash
   ./start.sh
   ```

#### Automated Health Check
Run the health check script to verify all services:
```bash
./health-check.sh
```

#### Manual Backend Startup
Use the dedicated backend startup script:
```bash
cd backend
./start-backend.sh
```

### Prerequisites

Before starting the backend, ensure:

1. **MySQL is running:**
   ```bash
   sudo service mysql start
   ```

2. **MySQL credentials are configured:**
   - Check `backend/.env` file
   - Default: `DB_USER=root`, `DB_PASSWORD=attendance123`

3. **Database exists:**
   ```bash
   mysql -u root -pattendance123 -e "SHOW DATABASES LIKE 'attendance_system';"
   ```

4. **Dependencies are installed:**
   ```bash
   cd backend
   npm install
   ```

### Verification Steps

1. **Check if port 3001 is listening:**
   ```bash
   netstat -tulpn | grep 3001
   # or
   ss -tulpn | grep 3001
   ```

2. **Test backend health endpoint:**
   ```bash
   curl -s http://127.0.0.1:3001/api/health | jq .
   ```
   
   Expected output:
   ```json
   {
     "status": "ok",
     "timestamp": "2025-10-31T23:11:29.505Z",
     "version": "1.0.0"
   }
   ```

3. **Check backend logs:**
   ```bash
   tail -f /tmp/backend.log
   ```

### Common Issues

#### MySQL Not Running
**Symptom:** Backend fails to start with database connection error

**Solution:**
```bash
sudo service mysql start
```

#### Wrong MySQL Credentials
**Symptom:** `Access denied for user 'root'@'localhost'`

**Solution:**
```bash
mysql -h localhost -u debian-sys-maint -pvuhqrYTTmOtzRkgo -e "
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'attendance123';
FLUSH PRIVILEGES;
"
```

#### Port Already in Use
**Symptom:** `Error: listen EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Find and kill the process using port 3001
lsof -ti:3001 | xargs kill -9
# or
pkill -f "node.*server.js"
```

#### Missing Dependencies
**Symptom:** `Cannot find module 'express'` or similar

**Solution:**
```bash
cd backend
npm install
```

### Automatic Startup

To ensure the backend starts automatically when needed:

1. **Use the main startup script:**
   ```bash
   ./start.sh
   ```
   This script:
   - Starts MySQL if needed
   - Verifies database connection
   - Starts backend and waits for it to be ready
   - Starts frontend
   - Shows service status and logs

2. **Monitor services:**
   ```bash
   # Watch backend logs
   tail -f /tmp/backend.log
   
   # Watch frontend logs
   tail -f /tmp/frontend.log
   ```

### Environment Configuration

Verify your configuration files:

**Backend (.env):**
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=attendance123
DB_NAME=attendance_system
PORT=3001
JWT_SECRET=your-super-secret-jwt-key-for-development
FRONTEND_URL=http://localhost:3111
```

**Frontend (.env):**
```env
PORT=3111
REACT_APP_API_URL=http://localhost:3001/api
```

### Still Having Issues?

1. **Check system logs:**
   ```bash
   journalctl -xe | grep -i mysql
   journalctl -xe | grep -i node
   ```

2. **Verify Node.js version:**
   ```bash
   node --version  # Should be v18.x or higher
   ```

3. **Check available memory:**
   ```bash
   free -h
   ```

4. **Restart everything:**
   ```bash
   # Stop all services
   pkill -f "node.*server.js"
   pkill -f "react-scripts start"
   sudo service mysql restart
   
   # Start fresh
   ./start.sh
   ```

### Getting Help

If the issue persists:
1. Run the health check: `./health-check.sh`
2. Collect logs: `cat /tmp/backend.log`
3. Check MySQL status: `sudo service mysql status`
4. Verify port availability: `netstat -tulpn | grep 3001`

Include this information when seeking help.
