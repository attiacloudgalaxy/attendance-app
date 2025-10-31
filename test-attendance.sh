#!/bin/bash

# Test script for attendance flow debugging
echo "🔍 Testing Attendance System Flow"
echo "================================="

# Step 1: Login to get token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}')

echo "Login Response: $LOGIN_RESPONSE"

# Check if 2FA is required
if echo "$LOGIN_RESPONSE" | grep -q "requiresTwoFA"; then
    echo "2FA required, getting MFA code..."
    
    MFA_RESPONSE=$(curl -s -X GET http://localhost:3001/api/auth/dev/get-mfa-code/1)
    echo "MFA Response: $MFA_RESPONSE"
    
    # Extract token from MFA response
    TOKEN=$(echo "$MFA_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "MFA Token: $TOKEN"
    
    # Complete 2FA
    echo "3. Completing 2FA..."
    AUTH_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/verify-2fa \
      -H "Content-Type: application/json" \
      -d "{\"userId\":1,\"token\":\"$TOKEN\"}")
    
    echo "Auth Response: $AUTH_RESPONSE"
    
    # Extract JWT token
    JWT_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "JWT Token: $JWT_TOKEN"
else
    # Extract token directly if no 2FA
    JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$JWT_TOKEN" ]; then
    echo "❌ Failed to get authentication token"
    exit 1
fi

echo "✅ Authentication successful"
echo ""

# Step 2: Check current attendance status
echo "2. Checking attendance status..."
STATUS_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/attendance/status" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "Status Response: $STATUS_RESPONSE"
echo ""

# Step 3: Try to clock in
echo "3. Attempting to clock in..."
CLOCKIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/attendance/clock-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"notes":"Test clock in"}')

echo "Clock In Response: $CLOCKIN_RESPONSE"
echo ""

# Step 4: Check status after clock in
echo "4. Checking status after clock in..."
STATUS_RESPONSE2=$(curl -s -X GET "http://localhost:3001/api/attendance/status" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "Status Response 2: $STATUS_RESPONSE2"
echo ""

# Step 5: Try to clock out
echo "5. Attempting to clock out..."
CLOCKOUT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/attendance/clock-out \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"notes":"Test clock out"}')

echo "Clock Out Response: $CLOCKOUT_RESPONSE"
echo ""

# Step 6: Final status check
echo "6. Final status check..."
STATUS_RESPONSE3=$(curl -s -X GET "http://localhost:3001/api/attendance/status" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "Final Status Response: $STATUS_RESPONSE3"
echo ""

echo "🏁 Test Complete!"