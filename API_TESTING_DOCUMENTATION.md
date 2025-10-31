# API Testing Documentation

This document contains all the curl commands used during the development and testing of the Attendance Management System. These commands demonstrate how to interact with the API endpoints and can be used for testing, integration, and debugging purposes.

## Table of Contents
- [Authentication Endpoints](#authentication-endpoints)
- [Health Check Endpoints](#health-check-endpoints)
- [Testing Notes](#testing-notes)
- [Common Response Codes](#common-response-codes)

## Authentication Endpoints

### 1. User Login (Initiates 2FA Process)

**Command:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}'
```

**Purpose:** 
- Authenticates user credentials
- Initiates the two-factor authentication process
- Sends a 2FA token via email to the user

**Request Details:**
- **Method:** POST
- **Endpoint:** `/api/auth/login`
- **Headers:** Content-Type: application/json
- **Body:** JSON object containing email and password

**Expected Response:**
```json
{
  "message": "2FA token sent to email",
  "userId": 1,
  "requiresVerification": true
}
```

**Test Credentials:**
- **Admin User:** admin@company.com / admin123
- **Regular Users:** 
  - basim@company.com / basim123
  - sara@company.com / sara123
  - ahmed@company.com / ahmed123

### 2. 2FA Token Verification

**Command:**
```bash
curl -X POST http://localhost:3001/api/auth/verify-2fa \
  -H "Content-Type: application/json" \
  -d '{"userId":1,"token":"217427"}' \
  -s
```

**Purpose:**
- Verifies the 2FA token sent to user's email
- Completes the authentication process
- Returns JWT token for subsequent requests

**Request Details:**
- **Method:** POST
- **Endpoint:** `/api/auth/verify-2fa`
- **Headers:** Content-Type: application/json
- **Body:** JSON object containing userId and 6-digit token
- **Flags:** `-s` for silent mode (suppresses progress meter)

**Expected Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@company.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

**Notes:**
- Token is a 6-digit number sent via email
- Token expires after a short time (typically 5-10 minutes)
- userId must match the user who requested the login

## Health Check Endpoints

### 3. Frontend Application Health Check

**Command:**
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3111 || echo "Frontend not responding"
```

**Purpose:**
- Checks if the React frontend application is running
- Returns HTTP status code only
- Used for monitoring and debugging

**Request Details:**
- **Method:** GET (default)
- **Endpoint:** `http://localhost:3111` (root path)
- **Flags:** 
  - `-s` for silent mode
  - `-o /dev/null` to discard response body
  - `-w "%{http_code}"` to output only HTTP status code
- **Fallback:** Displays "Frontend not responding" if curl fails

**Expected Response:**
- **200** - Frontend is running correctly
- **Connection refused** - Frontend is not running
- **Other codes** - Various issues (404, 500, etc.)

## Testing Notes

### Development Environment Setup
- **Backend URL:** http://localhost:3001
- **Frontend URL:** http://localhost:3111
- **Database:** MySQL running locally
- **Email Service:** Configured for 2FA token delivery

### Authentication Flow Testing
1. **Step 1:** Use login endpoint to initiate authentication
2. **Step 2:** Check email for 6-digit 2FA token
3. **Step 3:** Use verify-2fa endpoint with received token
4. **Step 4:** Use returned JWT token in Authorization header for protected endpoints

### Protected Endpoint Usage
For endpoints requiring authentication, include the JWT token:
```bash
curl -X GET http://localhost:3001/api/protected-endpoint \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

## Common Response Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required or failed |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error occurred |

## Rate Limiting

The API implements rate limiting:
- **Development:** 1000 requests per 15 minutes
- **Production:** 100 requests per 15 minutes
- **Headers:** Response includes rate limit information

## Security Considerations

1. **HTTPS in Production:** Always use HTTPS in production environments
2. **JWT Token Security:** Store JWT tokens securely (not in localStorage in production)
3. **2FA Tokens:** 6-digit tokens are time-sensitive and single-use
4. **Rate Limiting:** Be mindful of rate limits during automated testing
5. **CORS:** Frontend and backend must be configured for cross-origin requests

## Additional API Endpoints

While not shown in the curl history, the system includes these additional endpoints:

### Attendance Management
- `GET /api/attendance/records` - Get user attendance records
- `POST /api/attendance/clock-in` - Clock in
- `POST /api/attendance/clock-out` - Clock out
- `GET /api/attendance/status` - Get current attendance status
- `GET /api/attendance/progress` - Get live progress data

### Admin Endpoints
- `GET /api/users` - List all users (Admin only)
- `POST /api/attendance/manual` - Manual attendance logging (Admin only)
- `GET /api/reports/daily` - Generate attendance reports (Admin only)

### User Management
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

## Testing Script Example

```bash
#!/bin/bash
# Quick API test script

echo "Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}')

echo "Login Response: $LOGIN_RESPONSE"

echo "Testing frontend health..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3111)

echo "Frontend Status: $FRONTEND_STATUS"

if [ "$FRONTEND_STATUS" = "200" ]; then
  echo "✅ Frontend is running"
else
  echo "❌ Frontend is not responding"
fi
```

## Troubleshooting

### Common Issues and Solutions

1. **Connection Refused:**
   ```bash
   curl: (7) Failed to connect to localhost port 3001: Connection refused
   ```
   - **Solution:** Start the backend server with `npm start`

2. **CORS Issues:**
   ```bash
   Access to fetch at 'http://localhost:3001/api/...' from origin 'http://localhost:3111' has been blocked by CORS policy
   ```
   - **Solution:** Ensure CORS is properly configured in backend

3. **Invalid 2FA Token:**
   ```json
   {"error": "Invalid or expired token"}
   ```
   - **Solution:** Check email for new token, ensure token is entered correctly

4. **Rate Limit Exceeded:**
   ```json
   {"error": "Too many requests, please try again later"}
   ```
   - **Solution:** Wait for rate limit window to reset (15 minutes)

---

*This documentation was generated from actual curl commands used during development and testing of the Attendance Management System.*