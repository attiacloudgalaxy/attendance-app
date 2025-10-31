# 🔗 Attendance System - Complete URL Reference

## 🌐 **Main Access Links**

### **🎨 Frontend Application (Port 3111)**
- **Main Login Portal:** http://localhost:3111
- **Admin Dashboard:** http://localhost:3111/dashboard (after login)
- **Employee Portal:** http://localhost:3111 (same login, different permissions)

---

## 🔐 **Authentication Endpoints (Port 3001)**

### **🔑 Login Process (2FA Required)**

**Step 1 - Email/Password Login:**
```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "admin123"
}
```

**Step 2 - MFA Code Verification:**
```bash
POST http://localhost:3001/api/auth/verify-2fa
Content-Type: application/json

{
  "userId": 1,
  "token": "123456"
}
```

### **📧 MFA Code Location:**
- **Current Method:** Check backend console/terminal
- **Command to get code:** `tail -5 "/Users/dr.attia.cloud.dragon/Downloads/Attendance App/backend/nohup.out"`
- **Real-time:** Login triggers new code display in backend console

---

## 👥 **User Access Levels**

### **🔧 Admin Portal Access:**
- **URL:** http://localhost:3111
- **Login:** admin@company.com / admin123
- **Features:** Full system access, user management, reports, settings

### **👤 Employee Portal Access:**
- **URL:** http://localhost:3111 (same as admin)
- **Login:** [Employee email] / [Employee password]
- **Features:** Clock in/out, view attendance, request leave

---

## 🛠️ **API Endpoints Reference**

### **🔐 Authentication APIs:**
- `POST /api/auth/login` - Initial login (returns 2FA requirement)
- `POST /api/auth/verify-2fa` - Verify MFA code
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### **👥 User Management APIs (Admin Only):**
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### **⏰ Attendance APIs:**
- `POST /api/attendance/clock-in` - Clock in
- `POST /api/attendance/clock-out` - Clock out
- `GET /api/attendance/my-records` - Get user's attendance
- `GET /api/attendance/all-records` - Get all attendance (Admin)

### **📊 Reports APIs (Admin Only):**
- `GET /api/reports/daily` - Daily attendance report
- `GET /api/reports/weekly` - Weekly attendance report
- `GET /api/reports/monthly` - Monthly attendance report

---

## 🔧 **System Health & Status**

### **🩺 Health Check:**
- **URL:** http://localhost:3001/api/health
- **Method:** GET
- **Response:** System status and features

### **📊 System Info:**
```bash
curl http://localhost:3001/api/health
```

---

## 📱 **Quick Access Commands**

### **Get Current MFA Code:**
```bash
# Check backend console for latest 2FA code
tail -10 "/Users/dr.attia.cloud.dragon/Downloads/Attendance App/backend/nohup.out"
```

### **Generate New MFA Code:**
```bash
# Trigger new login to get fresh code
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}'
```

### **Complete Login Flow:**
```bash
# Step 1: Login (get MFA code from console)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}'

# Step 2: Verify MFA (replace 123456 with actual code)
curl -X POST http://localhost:3001/api/auth/verify-2fa \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"token":"123456"}'
```

---

## 🎯 **Current Live System**

### **✅ Active Services:**
- **Frontend:** http://localhost:3111 ✅ Running
- **Backend API:** http://localhost:3001 ✅ Running
- **Database:** MySQL on localhost:3306 ✅ Connected

### **🔐 Default Admin Account:**
- **Email:** admin@company.com
- **Password:** admin123
- **Role:** System Administrator
- **Employee ID:** ADMIN001

### **📧 Current MFA Setup:**
- **Method:** Console output (development mode)
- **Location:** Backend terminal/nohup.out file
- **Ready for:** Office 365 integration

---

## 🚀 **Quick Start Guide**

1. **Open Admin Portal:** http://localhost:3111
2. **Enter Credentials:** admin@company.com / admin123
3. **Get MFA Code:** Check backend console or run:
   ```bash
   tail -5 "/Users/dr.attia.cloud.dragon/Downloads/Attendance App/backend/nohup.out"
   ```
4. **Enter MFA Code:** Complete login
5. **Access Dashboard:** Full admin features available

---

**💡 All URLs use the updated port 3111 for frontend and 3001 for backend API!** 🌐