const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken, requireAdmin, requireSelfOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Submit leave request
router.post('/', [
    body('startDate').isISO8601().toDate(),
    body('endDate').isISO8601().toDate(),
    body('leaveType').isIn(['sick', 'vacation', 'personal', 'emergency', 'other']),
    body('reason').isLength({ min: 1, max: 1000 })
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

        const { startDate, endDate, leaveType, reason } = req.body;

        // Validate date range
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({
                success: false,
                message: 'Start date must be before end date'
            });
        }

        // Insert leave request
        const result = await executeQuery(
            'INSERT INTO leave_requests (user_id, start_date, end_date, leave_type, reason) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, startDate, endDate, leaveType, reason]
        );

        res.status(201).json({
            success: true,
            message: 'Leave request submitted successfully',
            requestId: result.insertId
        });

    } catch (error) {
        console.error('Submit leave request error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get leave requests
router.get('/', async (req, res) => {
    try {
        const { status, userId, page = 1, limit = 20 } = req.query;
        
        let whereClause = 'WHERE 1=1';
        let queryParams = [];

        // If not admin, can only see own requests
        if (!req.user.isAdmin) {
            whereClause += ' AND lr.user_id = ?';
            queryParams.push(req.user.id);
        } else if (userId) {
            whereClause += ' AND lr.user_id = ?';
            queryParams.push(userId);
        }

        if (status) {
            whereClause += ' AND lr.status = ?';
            queryParams.push(status);
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM leave_requests lr ${whereClause}`;
        const countResult = await executeQuery(countQuery, queryParams);
        const totalRequests = countResult[0].total;

        // Get requests with user details
        const requestsQuery = `
            SELECT lr.*, 
                   u.first_name, u.last_name, u.employee_id, u.department,
                   approver.first_name as approver_first_name, approver.last_name as approver_last_name
            FROM leave_requests lr
            JOIN users u ON lr.user_id = u.id
            LEFT JOIN users approver ON lr.approved_by = approver.id
            ${whereClause}
            ORDER BY lr.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const requests = await executeQuery(requestsQuery, [...queryParams, parseInt(limit), offset]);

        res.json({
            success: true,
            requests: requests.map(req => ({
                id: req.id,
                userId: req.user_id,
                employeeId: req.employee_id,
                employeeName: `${req.first_name} ${req.last_name}`,
                department: req.department,
                startDate: req.start_date,
                endDate: req.end_date,
                leaveType: req.leave_type,
                reason: req.reason,
                status: req.status,
                approvedBy: req.approved_by ? `${req.approver_first_name} ${req.approver_last_name}` : null,
                approvedAt: req.approved_at,
                createdAt: req.created_at,
                updatedAt: req.updated_at
            })),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalRequests / parseInt(limit)),
                totalRequests: totalRequests,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get leave requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Approve/Reject leave request (admin only)
router.put('/:requestId/status', [
    param('requestId').isInt(),
    body('status').isIn(['approved', 'rejected']),
    body('comments').optional().isLength({ max: 500 })
], requireAdmin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { requestId } = req.params;
        const { status, comments } = req.body;

        // Check if request exists and is pending
        const requests = await executeQuery(
            'SELECT * FROM leave_requests WHERE id = ? AND status = "pending"',
            [requestId]
        );

        if (requests.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Leave request not found or already processed'
            });
        }

        // Update request status
        await executeQuery(
            'UPDATE leave_requests SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, req.user.id, requestId]
        );

        res.json({
            success: true,
            message: `Leave request ${status} successfully`
        });

    } catch (error) {
        console.error('Update leave request error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;