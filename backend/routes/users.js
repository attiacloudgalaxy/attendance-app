const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken, requireAdmin, requireSelfOrAdmin } = require('../middleware/auth');
const bcrypt = require('bcrypt');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Simple test endpoint
router.get('/test', requireAdmin, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Users endpoint is working',
            user: req.user
        });
    } catch (error) {
        console.error('Test error:', error);
        res.status(500).json({
            success: false,
            message: 'Test failed'
        });
    }
});

// Get all users (admin only) - simplified version
router.get('/', requireAdmin, async (req, res) => {
    try {
        console.log('Users endpoint hit by user:', req.user);
        
        // Simple query to get all users
        const users = await executeQuery(
            'SELECT id, employee_id, email, first_name, last_name, department, position, is_active, is_admin FROM users WHERE is_active = 1 ORDER BY first_name, last_name'
        );

        console.log('Users found:', users.length);

        res.json({
            success: true,
            users: users,
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalUsers: users.length,
                limit: 50
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get user by ID
router.get('/:userId', [
    param('userId').isInt()
], requireSelfOrAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const users = await executeQuery(
            `SELECT id, employee_id, email, first_name, last_name, department, 
                    position, hire_date, phone, is_active, is_admin, created_at, updated_at
             FROM users WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: users[0]
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Create new user (admin only)
router.post('/', requireAdmin, [
    body('employeeId').isLength({ min: 3, max: 20 }).matches(/^[A-Z0-9]+$/),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('firstName').isLength({ min: 1, max: 100 }),
    body('lastName').isLength({ min: 1, max: 100 }),
    body('department').optional().isLength({ max: 100 }),
    body('position').optional().isLength({ max: 100 }),
    body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/),
    body('hireDate').optional().isISO8601().toDate(),
    body('isAdmin').optional().isBoolean()
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

        const { 
            employeeId, email, password, firstName, lastName, 
            department, position, phone, hireDate, isAdmin 
        } = req.body;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);

        // Insert user
        const result = await executeQuery(
            `INSERT INTO users 
             (employee_id, email, password_hash, first_name, last_name, department, position, phone, hire_date, is_admin)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [employeeId, email, hashedPassword, firstName, lastName, department || null, 
             position || null, phone || null, hireDate || null, isAdmin || false]
        );

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            userId: result.insertId
        });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Employee ID or email already exists'
            });
        }
        
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update user
router.put('/:userId', [
    param('userId').isInt(),
    body('firstName').optional().isLength({ min: 1, max: 100 }),
    body('lastName').optional().isLength({ min: 1, max: 100 }),
    body('department').optional().isLength({ max: 100 }),
    body('position').optional().isLength({ max: 100 }),
    body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/),
    body('isActive').optional().isBoolean(),
    body('isAdmin').optional().isBoolean()
], requireSelfOrAdmin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { userId } = req.params;
        const updates = req.body;

        // If not admin, remove admin-only fields
        if (!req.user.isAdmin) {
            delete updates.isActive;
            delete updates.isAdmin;
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        // Build dynamic update query
        const fields = [];
        const values = [];
        
        Object.keys(updates).forEach(key => {
            const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            fields.push(`${dbField} = ?`);
            values.push(updates[key]);
        });

        values.push(userId);

        await executeQuery(
            `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            values
        );

        res.json({
            success: true,
            message: 'User updated successfully'
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Change password
router.put('/:userId/password', [
    param('userId').isInt(),
    body('currentPassword').isLength({ min: 1 }),
    body('newPassword').isLength({ min: 8 })
], requireSelfOrAdmin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { userId } = req.params;
        const { currentPassword, newPassword } = req.body;

        // Get user's current password
        const users = await executeQuery(
            'SELECT password_hash FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password (skip if admin changing another user's password)
        if (!req.user.isAdmin || req.user.id === parseInt(userId)) {
            const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
            if (!isValidPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 12);

        // Update password
        await executeQuery(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedPassword, userId]
        );

        // Deactivate all sessions for this user
        await executeQuery(
            'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Deactivate user (admin only)
router.delete('/:userId', [
    param('userId').isInt()
], requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        // Cannot deactivate self
        if (parseInt(userId) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot deactivate your own account'
            });
        }

        await executeQuery(
            'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [userId]
        );

        // Deactivate all sessions
        await executeQuery(
            'UPDATE user_sessions SET is_active = FALSE WHERE user_id = ?',
            [userId]
        );

        res.json({
            success: true,
            message: 'User deactivated successfully'
        });

    } catch (error) {
        console.error('Deactivate user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;