const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

// Mock user data
const mockUsers = [
    {
        id: 1,
        employeeId: 'ADMIN001',
        email: 'admin@company.com',
        firstName: 'System',
        lastName: 'Administrator',
        department: 'IT',
        position: 'System Admin',
        isAdmin: true
    }
];

// Mock session store
let mockSessions = new Map();
let mockAttendance = new Map();

// Demo login endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (email === 'admin@company.com' && password === 'admin123') {
        res.json({
            success: true,
            requiresTwoFA: true,
            userId: 1,
            message: 'Authentication code sent to your email'
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }
});

// Demo 2FA verification
app.post('/api/auth/verify-2fa', (req, res) => {
    const { userId, token } = req.body;
    
    // Accept any 6-digit code for demo
    if (token && token.length === 6) {
        const mockToken = 'demo-jwt-token-' + Date.now();
        const user = mockUsers[0];
        
        mockSessions.set(mockToken, user);
        
        res.json({
            success: true,
            token: mockToken,
            user: user,
            message: 'Login successful'
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid verification code'
        });
    }
});

// Demo attendance status
app.get('/api/attendance/status/:userId?', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    
    res.json({
        success: true,
        status: {
            date: today,
            isClockedIn: false,
            isOnBreak: false,
            checkInTime: null,
            checkOutTime: null,
            totalHours: 0,
            breakDuration: 0,
            status: 'not_started'
        }
    });
});

// Demo clock-in
app.post('/api/attendance/clock-in', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];
    
    res.json({
        success: true,
        message: 'Clocked in successfully',
        record: {
            id: 1,
            date: today,
            checkInTime: currentTime,
            checkOutTime: null,
            totalHours: 0,
            status: 'present'
        }
    });
});

// Demo clock-out
app.post('/api/attendance/clock-out', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];
    
    res.json({
        success: true,
        message: 'Clocked out successfully',
        record: {
            id: 1,
            date: today,
            checkInTime: '09:00:00',
            checkOutTime: currentTime,
            totalHours: 8.0,
            status: 'present'
        }
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Demo mode - No database required',
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Demo Server running on port ${PORT}`);
    console.log(`📱 Frontend should connect to: http://localhost:${PORT}/api`);
    console.log(`🔑 Demo login: admin@company.com / admin123`);
    console.log(`💡 Use any 6-digit code for 2FA (e.g., 123456)`);
});

module.exports = app;