const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken, requireAdmin, requireSelfOrAdmin } = require('../middleware/auth');
const bcrypt = require('bcrypt');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, department, active = 'true' } = req.query;
        
        let whereClause = 'WHERE 1=1';
        let queryParams = [];

        if (search) {
            whereClause += ` AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR employee_id LIKE ?)`;
            const searchPattern = `%${search}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }

        if (department) {
            whereClause += ' AND department = ?';
            queryParams.push(department);
        }

        if (active !== 'all') {
            whereClause += ' AND is_active = ?';
            queryParams.push(active === 'true');
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
        const countResult = await executeQuery(countQuery, queryParams);
        const totalUsers = countResult[0].total;

        // Get users with pagination
        const usersQuery = `
            SELECT id, employee_id, email, first_name, last_name, department, 
                   position, hire_date, phone, is_active, is_admin, created_at
            FROM users 
            ${whereClause}
            ORDER BY first_name, last_name
            LIMIT ? OFFSET ?
        `;
        
        const users = await executeQuery(usersQuery, [...queryParams, parseInt(limit), offset]);

        res.json({
            success: true,
            users: users,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalUsers / parseInt(limit)),
                totalUsers: totalUsers,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
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