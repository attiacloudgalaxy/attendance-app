const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/database');
const { 
    generateTwoFactorToken, 
    send2FAEmail, 
    store2FAToken, 
    verify2FAToken,
    sendPasswordResetEmail 
} = require('../utils/email');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Login - Step 1: Email and password verification
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user by email
        const users = await executeQuery(
            'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate and send 2FA token
        const twoFAToken = generateTwoFactorToken();
        const tokenStored = await store2FAToken(user.id, twoFAToken, 'login');
        
        if (!tokenStored) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate authentication code'
            });
        }

        const emailSent = await send2FAEmail(user.email, twoFAToken, user.first_name);
        
        if (!emailSent) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send authentication code'
            });
        }

        res.json({
            success: true,
            message: 'Authentication code sent to your email',
            userId: user.id,
            requiresTwoFA: true
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Login - Step 2: Two-factor authentication verification
router.post('/verify-2fa', [
    body('userId').isInt(),
    body('token').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { userId, token } = req.body;

        // Verify 2FA token
        const isValidToken = await verify2FAToken(userId, token, 'login');
        
        if (!isValidToken) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired authentication code'
            });
        }

        // Get user details
        const users = await executeQuery(
            'SELECT id, employee_id, email, first_name, last_name, department, position, is_admin FROM users WHERE id = ? AND is_active = TRUE',
            [userId]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        // Generate JWT token
        const jwtToken = jwt.sign(
            { 
                userId: user.id,
                email: user.email,
                isAdmin: user.is_admin
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        // Create session record
        const sessionExpiry = new Date();
        sessionExpiry.setHours(sessionExpiry.getHours() + 24); // 24 hours from now

        await executeQuery(
            `INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent) 
             VALUES (?, ?, ?, ?, ?)`,
            [
                user.id,
                jwtToken,
                sessionExpiry,
                req.ip,
                req.get('User-Agent') || ''
            ]
        );

        // Return user data and token
        res.json({
            success: true,
            message: 'Login successful',
            token: jwtToken,
            user: {
                id: user.id,
                employeeId: user.employee_id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                department: user.department,
                position: user.position,
                isAdmin: user.is_admin
            }
        });

    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // Deactivate the session
        await executeQuery(
            'UPDATE user_sessions SET is_active = FALSE WHERE id = ?',
            [req.user.sessionId]
        );

        res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Request password reset
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email } = req.body;

        // Find user by email
        const users = await executeQuery(
            'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
            [email]
        );

        // Always return success to prevent email enumeration
        if (users.length === 0) {
            return res.json({
                success: true,
                message: 'If an account with that email exists, a reset code has been sent'
            });
        }

        const user = users[0];

        // Generate and send reset token
        const resetToken = generateTwoFactorToken();
        const tokenStored = await store2FAToken(user.id, resetToken, 'password_reset');
        
        if (tokenStored) {
            await sendPasswordResetEmail(user.email, resetToken, user.first_name);
        }

        res.json({
            success: true,
            message: 'If an account with that email exists, a reset code has been sent'
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Reset password
router.post('/reset-password', [
    body('email').isEmail().normalizeEmail(),
    body('token').isLength({ min: 6, max: 6 }).isNumeric(),
    body('newPassword').isLength({ min: 8 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, token, newPassword } = req.body;

        // Find user by email
        const users = await executeQuery(
            'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
            [email]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        // Verify reset token
        const isValidToken = await verify2FAToken(user.id, token, 'password_reset');
        
        if (!isValidToken) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired reset code'
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

        // Update password
        await executeQuery(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, user.id]
        );

        // Deactivate all existing sessions for security
        await executeQuery(
            'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ?',
            [user.id]
        );

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const users = await executeQuery(
            `SELECT id, employee_id, email, first_name, last_name, department, 
                    position, hire_date, phone, is_admin, created_at 
             FROM users WHERE id = ?`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                employeeId: user.employee_id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                department: user.department,
                position: user.position,
                hireDate: user.hire_date,
                phone: user.phone,
                isAdmin: user.is_admin,
                createdAt: user.created_at
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Validate token (for frontend route protection)
router.get('/validate', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Token is valid',
        user: req.user
    });
});

module.exports = router;