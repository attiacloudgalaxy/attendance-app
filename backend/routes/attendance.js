const express = require('express');
const moment = require('moment');
const { body, validationResult, param } = require('express-validator');
const { executeQuery, executeTransaction } = require('../config/database');
const { authenticateToken, requireSelfOrAdmin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Clock in
router.post('/clock-in', [
    body('userId').optional().isInt(),
    body('notes').optional().isLength({ max: 500 })
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

        const userId = req.body.userId || req.user.id;
        const { notes } = req.body;
        
        // Check authorization
        if (userId !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        const today = moment().format('YYYY-MM-DD');
        const currentTime = moment().format('HH:mm:ss');

        // Check if already clocked in today
        const existingRecords = await executeQuery(
            'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?',
            [userId, today]
        );

        if (existingRecords.length > 0 && existingRecords[0].check_in_time) {
            return res.status(400).json({
                success: false,
                message: 'Already clocked in today',
                record: existingRecords[0]
            });
        }

        let record;
        if (existingRecords.length > 0) {
            // Update existing record
            await executeQuery(
                'UPDATE attendance_records SET check_in_time = ?, notes = ?, status = "present", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [currentTime, notes || null, existingRecords[0].id]
            );
            record = { ...existingRecords[0], check_in_time: currentTime };
        } else {
            // Create new record
            const result = await executeQuery(
                'INSERT INTO attendance_records (user_id, date, check_in_time, notes, status) VALUES (?, ?, ?, ?, "present")',
                [userId, today, currentTime, notes || null]
            );
            
            const newRecords = await executeQuery(
                'SELECT * FROM attendance_records WHERE id = ?',
                [result.insertId]
            );
            record = newRecords[0];
        }

        res.json({
            success: true,
            message: 'Clocked in successfully',
            record: {
                id: record.id,
                date: record.date,
                checkInTime: record.check_in_time,
                checkOutTime: record.check_out_time,
                totalHours: record.total_hours,
                status: record.status,
                notes: record.notes
            }
        });

    } catch (error) {
        console.error('Clock in error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Clock out
router.post('/clock-out', [
    body('userId').optional().isInt(),
    body('notes').optional().isLength({ max: 500 })
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

        const userId = req.body.userId || req.user.id;
        const { notes } = req.body;
        
        // Check authorization
        if (userId !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        const today = moment().format('YYYY-MM-DD');
        const currentTime = moment().format('HH:mm:ss');

        // Find today's record
        const records = await executeQuery(
            'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?',
            [userId, today]
        );

        if (records.length === 0 || !records[0].check_in_time) {
            return res.status(400).json({
                success: false,
                message: 'No clock-in record found for today'
            });
        }

        const record = records[0];

        if (record.check_out_time) {
            return res.status(400).json({
                success: false,
                message: 'Already clocked out today',
                record: record
            });
        }

        // Calculate total hours
        const checkInMoment = moment(`${today} ${record.check_in_time}`);
        const checkOutMoment = moment(`${today} ${currentTime}`);
        const breakDuration = record.break_duration || 0;
        
        const totalMinutes = checkOutMoment.diff(checkInMoment, 'minutes') - (breakDuration * 60);
        const totalHours = Math.max(0, totalMinutes / 60);
        
        // Get minimum daily hours from settings
        const settings = await executeQuery(
            "SELECT setting_value FROM system_settings WHERE setting_key = 'min_daily_hours'"
        );
        const minDailyHours = parseFloat(settings[0]?.setting_value || 8);
        
        // Calculate overtime
        const overtimeHours = Math.max(0, totalHours - minDailyHours);
        
        // Determine status
        let status = 'present';
        if (totalHours < minDailyHours) {
            status = 'partial';
        }

        // Update record
        await executeQuery(
            `UPDATE attendance_records 
             SET check_out_time = ?, total_hours = ?, overtime_hours = ?, 
                 status = ?, notes = CONCAT(COALESCE(notes, ''), CASE WHEN notes IS NOT NULL THEN '\n' ELSE '' END, COALESCE(?, '')),
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [currentTime, totalHours.toFixed(2), overtimeHours.toFixed(2), status, notes || '', record.id]
        );

        // Get updated record
        const updatedRecords = await executeQuery(
            'SELECT * FROM attendance_records WHERE id = ?',
            [record.id]
        );

        res.json({
            success: true,
            message: 'Clocked out successfully',
            record: {
                id: updatedRecords[0].id,
                date: updatedRecords[0].date,
                checkInTime: updatedRecords[0].check_in_time,
                checkOutTime: updatedRecords[0].check_out_time,
                totalHours: parseFloat(updatedRecords[0].total_hours),
                overtimeHours: parseFloat(updatedRecords[0].overtime_hours),
                breakDuration: parseFloat(updatedRecords[0].break_duration),
                status: updatedRecords[0].status,
                notes: updatedRecords[0].notes
            }
        });

    } catch (error) {
        console.error('Clock out error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Start break
router.post('/break-start', [
    body('userId').optional().isInt()
], async (req, res) => {
    try {
        const userId = req.body.userId || req.user.id;
        
        // Check authorization
        if (userId !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        const today = moment().format('YYYY-MM-DD');
        const currentTime = moment().format('HH:mm:ss');

        // Find today's record
        const records = await executeQuery(
            'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?',
            [userId, today]
        );

        if (records.length === 0 || !records[0].check_in_time || records[0].check_out_time) {
            return res.status(400).json({
                success: false,
                message: 'No active clock-in session found'
            });
        }

        const record = records[0];

        if (record.break_start_time && !record.break_end_time) {
            return res.status(400).json({
                success: false,
                message: 'Break already started'
            });
        }

        // Update record with break start time
        await executeQuery(
            'UPDATE attendance_records SET break_start_time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [currentTime, record.id]
        );

        res.json({
            success: true,
            message: 'Break started successfully',
            breakStartTime: currentTime
        });

    } catch (error) {
        console.error('Break start error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// End break
router.post('/break-end', [
    body('userId').optional().isInt()
], async (req, res) => {
    try {
        const userId = req.body.userId || req.user.id;
        
        // Check authorization
        if (userId !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        const today = moment().format('YYYY-MM-DD');
        const currentTime = moment().format('HH:mm:ss');

        // Find today's record
        const records = await executeQuery(
            'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?',
            [userId, today]
        );

        if (records.length === 0 || !records[0].check_in_time || !records[0].break_start_time) {
            return res.status(400).json({
                success: false,
                message: 'No active break session found'
            });
        }

        const record = records[0];

        if (record.break_end_time) {
            return res.status(400).json({
                success: false,
                message: 'Break already ended'
            });
        }

        // Calculate break duration
        const breakStart = moment(`${today} ${record.break_start_time}`);
        const breakEnd = moment(`${today} ${currentTime}`);
        const breakMinutes = breakEnd.diff(breakStart, 'minutes');
        const newBreakDuration = (record.break_duration || 0) + (breakMinutes / 60);

        // Update record
        await executeQuery(
            'UPDATE attendance_records SET break_end_time = ?, break_duration = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [currentTime, newBreakDuration.toFixed(2), record.id]
        );

        res.json({
            success: true,
            message: 'Break ended successfully',
            breakEndTime: currentTime,
            totalBreakDuration: newBreakDuration.toFixed(2)
        });

    } catch (error) {
        console.error('Break end error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get attendance status for today
router.get('/status/:userId?', [
    param('userId').optional().isInt()
], requireSelfOrAdmin, async (req, res) => {
    try {
        const userId = req.params.userId || req.user.id;
        const today = moment().format('YYYY-MM-DD');

        // Get today's attendance record
        const records = await executeQuery(
            'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?',
            [userId, today]
        );

        if (records.length === 0) {
            return res.json({
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
        }

        const record = records[0];
        const isOnBreak = record.break_start_time && !record.break_end_time;

        res.json({
            success: true,
            status: {
                id: record.id,
                date: record.date,
                isClockedIn: !!record.check_in_time && !record.check_out_time,
                isOnBreak: isOnBreak,
                checkInTime: record.check_in_time,
                checkOutTime: record.check_out_time,
                breakStartTime: record.break_start_time,
                breakEndTime: record.break_end_time,
                totalHours: parseFloat(record.total_hours || 0),
                breakDuration: parseFloat(record.break_duration || 0),
                overtimeHours: parseFloat(record.overtime_hours || 0),
                status: record.status,
                notes: record.notes
            }
        });

    } catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get attendance records for a date range
router.get('/records/:userId?', [
    param('userId').optional().isInt()
], requireSelfOrAdmin, async (req, res) => {
    try {
        const userId = req.params.userId || req.user.id;
        const { startDate, endDate, page = 1, limit = 30 } = req.query;
        
        let whereClause = 'WHERE user_id = ?';
        let queryParams = [userId];

        if (startDate && endDate) {
            whereClause += ' AND date BETWEEN ? AND ?';
            queryParams.push(startDate, endDate);
        } else if (startDate) {
            whereClause += ' AND date >= ?';
            queryParams.push(startDate);
        } else if (endDate) {
            whereClause += ' AND date <= ?';
            queryParams.push(endDate);
        }

        // Calculate offset for pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM attendance_records ${whereClause}`;
        const countResult = await executeQuery(countQuery, queryParams);
        const totalRecords = countResult[0].total;

        // Get records with pagination
        const recordsQuery = `
            SELECT ar.*, u.first_name, u.last_name, u.employee_id
            FROM attendance_records ar
            JOIN users u ON ar.user_id = u.id
            ${whereClause}
            ORDER BY ar.date DESC, ar.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const records = await executeQuery(recordsQuery, [...queryParams, parseInt(limit), offset]);

        res.json({
            success: true,
            records: records.map(record => ({
                id: record.id,
                userId: record.user_id,
                employeeId: record.employee_id,
                employeeName: `${record.first_name} ${record.last_name}`,
                date: record.date,
                checkInTime: record.check_in_time,
                checkOutTime: record.check_out_time,
                breakStartTime: record.break_start_time,
                breakEndTime: record.break_end_time,
                totalHours: parseFloat(record.total_hours || 0),
                breakDuration: parseFloat(record.break_duration || 0),
                overtimeHours: parseFloat(record.overtime_hours || 0),
                status: record.status,
                notes: record.notes,
                createdAt: record.created_at,
                updatedAt: record.updated_at
            })),
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalRecords / parseInt(limit)),
                totalRecords: totalRecords,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get records error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Admin: Get all employees' attendance for today
router.get('/today/all', requireAdmin, async (req, res) => {
    try {
        const today = moment().format('YYYY-MM-DD');

        const query = `
            SELECT 
                u.id as user_id,
                u.employee_id,
                u.first_name,
                u.last_name,
                u.department,
                u.position,
                ar.id as record_id,
                ar.date,
                ar.check_in_time,
                ar.check_out_time,
                ar.break_start_time,
                ar.break_end_time,
                ar.total_hours,
                ar.break_duration,
                ar.overtime_hours,
                ar.status,
                ar.notes
            FROM users u
            LEFT JOIN attendance_records ar ON u.id = ar.user_id AND ar.date = ?
            WHERE u.is_active = TRUE
            ORDER BY u.first_name, u.last_name
        `;

        const records = await executeQuery(query, [today]);

        res.json({
            success: true,
            date: today,
            employees: records.map(record => ({
                userId: record.user_id,
                employeeId: record.employee_id,
                employeeName: `${record.first_name} ${record.last_name}`,
                department: record.department,
                position: record.position,
                attendance: record.record_id ? {
                    id: record.record_id,
                    date: record.date,
                    checkInTime: record.check_in_time,
                    checkOutTime: record.check_out_time,
                    breakStartTime: record.break_start_time,
                    breakEndTime: record.break_end_time,
                    totalHours: parseFloat(record.total_hours || 0),
                    breakDuration: parseFloat(record.break_duration || 0),
                    overtimeHours: parseFloat(record.overtime_hours || 0),
                    status: record.status,
                    notes: record.notes,
                    isClockedIn: !!record.check_in_time && !record.check_out_time,
                    isOnBreak: !!record.break_start_time && !record.break_end_time
                } : null
            }))
        });

    } catch (error) {
        console.error('Get all today attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Manual attendance logging (Admin only)
router.post('/manual', [
    requireAdmin,
    body('userId').isInt(),
    body('date').isDate(),
    body('checkInTime').isLength({ min: 1 }),
    body('checkOutTime').optional(),
    body('breakStartTime').optional(),
    body('breakEndTime').optional(),
    body('status').isIn(['present', 'absent', 'partial', 'late']),
    body('notes').optional().isLength({ max: 1000 })
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
            userId,
            date,
            checkInTime,
            checkOutTime,
            breakStartTime,
            breakEndTime,
            status,
            notes
        } = req.body;

        // Check if user exists
        const users = await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if attendance record already exists for this date
        const existingRecords = await executeQuery(
            'SELECT * FROM attendance_records WHERE user_id = ? AND date = ?',
            [userId, date]
        );

        if (existingRecords.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Attendance record already exists for this date'
            });
        }

        // Calculate total hours and break duration
        let totalHours = 0;
        let breakDuration = 0;
        let overtimeHours = 0;

        if (checkInTime && checkOutTime) {
            const checkInMoment = moment(`${date} ${checkInTime}`);
            const checkOutMoment = moment(`${date} ${checkOutTime}`);
            
            // Calculate break duration if break times are provided
            if (breakStartTime && breakEndTime) {
                const breakStartMoment = moment(`${date} ${breakStartTime}`);
                const breakEndMoment = moment(`${date} ${breakEndTime}`);
                breakDuration = breakEndMoment.diff(breakStartMoment, 'minutes') / 60;
            }
            
            const totalMinutes = checkOutMoment.diff(checkInMoment, 'minutes') - (breakDuration * 60);
            totalHours = Math.max(0, totalMinutes / 60);
            
            // Calculate overtime (assuming 8 hours is standard)
            overtimeHours = Math.max(0, totalHours - 8);
        }

        // Insert the manual attendance record
        const result = await executeQuery(
            `INSERT INTO attendance_records 
             (user_id, date, check_in_time, check_out_time, break_start_time, break_end_time, 
              total_hours, break_duration, overtime_hours, status, notes, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
                userId,
                date,
                checkInTime,
                checkOutTime || null,
                breakStartTime || null,
                breakEndTime || null,
                totalHours.toFixed(2),
                breakDuration.toFixed(2),
                overtimeHours.toFixed(2),
                status,
                `${notes || ''}\n[Manual entry by admin: ${req.user.firstName} ${req.user.lastName}]`
            ]
        );

        // Get the created record
        const newRecord = await executeQuery(
            'SELECT * FROM attendance_records WHERE id = ?',
            [result.insertId]
        );

        res.json({
            success: true,
            message: 'Manual attendance record created successfully',
            record: {
                id: newRecord[0].id,
                userId: newRecord[0].user_id,
                date: newRecord[0].date,
                checkInTime: newRecord[0].check_in_time,
                checkOutTime: newRecord[0].check_out_time,
                breakStartTime: newRecord[0].break_start_time,
                breakEndTime: newRecord[0].break_end_time,
                totalHours: parseFloat(newRecord[0].total_hours),
                breakDuration: parseFloat(newRecord[0].break_duration),
                overtimeHours: parseFloat(newRecord[0].overtime_hours),
                status: newRecord[0].status,
                notes: newRecord[0].notes
            }
        });

    } catch (error) {
        console.error('Manual attendance logging error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;