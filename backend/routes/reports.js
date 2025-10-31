const express = require('express');
const moment = require('moment');
const { param, query } = require('express-validator');
const { executeQuery } = require('../config/database');
const { authenticateToken, requireAdmin, requireSelfOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get attendance summary for a user
router.get('/attendance/:userId?', [
    param('userId').optional().isInt()
], requireSelfOrAdmin, async (req, res) => {
    try {
        const userId = req.params.userId || req.user.id;
        const { startDate, endDate, period = 'month' } = req.query;

        let start, end;
        
        if (startDate && endDate) {
            start = moment(startDate);
            end = moment(endDate);
        } else {
            // Default to current period
            switch (period) {
                case 'week':
                    start = moment().startOf('week');
                    end = moment().endOf('week');
                    break;
                case 'month':
                    start = moment().startOf('month');
                    end = moment().endOf('month');
                    break;
                case 'year':
                    start = moment().startOf('year');
                    end = moment().endOf('year');
                    break;
                default:
                    start = moment().startOf('month');
                    end = moment().endOf('month');
            }
        }

        // Get attendance records for the period
        const records = await executeQuery(
            `SELECT * FROM attendance_records 
             WHERE user_id = ? AND date BETWEEN ? AND ?
             ORDER BY date ASC`,
            [userId, start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')]
        );

        // Get system settings
        const settings = await executeQuery(
            "SELECT setting_key, setting_value FROM system_settings WHERE setting_key IN ('min_daily_hours', 'working_days_per_week')"
        );
        
        const minDailyHours = parseFloat(settings.find(s => s.setting_key === 'min_daily_hours')?.setting_value || 8);
        const workingDaysPerWeek = parseInt(settings.find(s => s.setting_key === 'working_days_per_week')?.setting_value || 5);

        // Calculate statistics
        const stats = {
            totalDays: records.length,
            presentDays: records.filter(r => r.status === 'present').length,
            absentDays: records.filter(r => r.status === 'absent').length,
            partialDays: records.filter(r => r.status === 'partial').length,
            lateDays: records.filter(r => r.status === 'late').length,
            totalHours: records.reduce((sum, r) => sum + (parseFloat(r.total_hours) || 0), 0),
            totalOvertimeHours: records.reduce((sum, r) => sum + (parseFloat(r.overtime_hours) || 0), 0),
            averageHoursPerDay: 0,
            expectedWorkingDays: 0,
            attendancePercentage: 0
        };

        // Calculate expected working days (excluding weekends)
        let current = start.clone();
        while (current.isSameOrBefore(end, 'day')) {
            if (current.day() !== 0 && current.day() !== 6) { // Not Sunday or Saturday
                stats.expectedWorkingDays++;
            }
            current.add(1, 'day');
        }

        stats.averageHoursPerDay = stats.totalDays > 0 ? stats.totalHours / stats.totalDays : 0;
        stats.attendancePercentage = stats.expectedWorkingDays > 0 ? (stats.presentDays / stats.expectedWorkingDays) * 100 : 0;

        // Get user info
        const users = await executeQuery(
            'SELECT first_name, last_name, employee_id, department FROM users WHERE id = ?',
            [userId]
        );

        res.json({
            success: true,
            period: {
                startDate: start.format('YYYY-MM-DD'),
                endDate: end.format('YYYY-MM-DD'),
                type: period
            },
            user: users[0] || null,
            statistics: stats,
            records: records.map(record => ({
                date: record.date,
                checkInTime: record.check_in_time,
                checkOutTime: record.check_out_time,
                totalHours: parseFloat(record.total_hours || 0),
                overtimeHours: parseFloat(record.overtime_hours || 0),
                breakDuration: parseFloat(record.break_duration || 0),
                status: record.status,
                notes: record.notes
            }))
        });

    } catch (error) {
        console.error('Get attendance report error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get team attendance summary (admin only)
router.get('/team/attendance', requireAdmin, async (req, res) => {
    try {
        const { startDate, endDate, department, period = 'month' } = req.query;

        let start, end;
        
        if (startDate && endDate) {
            start = moment(startDate);
            end = moment(endDate);
        } else {
            // Default to current month
            start = moment().startOf('month');
            end = moment().endOf('month');
        }

        let departmentFilter = '';
        let queryParams = [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')];
        
        if (department) {
            departmentFilter = 'AND u.department = ?';
            queryParams.push(department);
        }

        const query = `
            SELECT 
                u.id,
                u.employee_id,
                u.first_name,
                u.last_name,
                u.department,
                u.position,
                COUNT(ar.id) as total_records,
                SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
                SUM(CASE WHEN ar.status = 'partial' THEN 1 ELSE 0 END) as partial_days,
                SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late_days,
                COALESCE(SUM(ar.total_hours), 0) as total_hours,
                COALESCE(SUM(ar.overtime_hours), 0) as total_overtime_hours,
                COALESCE(AVG(ar.total_hours), 0) as avg_daily_hours
            FROM users u
            LEFT JOIN attendance_records ar ON u.id = ar.user_id 
                AND ar.date BETWEEN ? AND ?
            WHERE u.is_active = TRUE ${departmentFilter}
            GROUP BY u.id, u.employee_id, u.first_name, u.last_name, u.department, u.position
            ORDER BY u.department, u.first_name, u.last_name
        `;

        const teamData = await executeQuery(query, queryParams);

        // Calculate expected working days
        let expectedWorkingDays = 0;
        let current = start.clone();
        while (current.isSameOrBefore(end, 'day')) {
            if (current.day() !== 0 && current.day() !== 6) {
                expectedWorkingDays++;
            }
            current.add(1, 'day');
        }

        // Format response
        const report = teamData.map(employee => ({
            userId: employee.id,
            employeeId: employee.employee_id,
            name: `${employee.first_name} ${employee.last_name}`,
            department: employee.department,
            position: employee.position,
            statistics: {
                totalRecords: employee.total_records,
                presentDays: employee.present_days,
                absentDays: employee.absent_days,
                partialDays: employee.partial_days,
                lateDays: employee.late_days,
                totalHours: parseFloat(employee.total_hours),
                totalOvertimeHours: parseFloat(employee.total_overtime_hours),
                avgDailyHours: parseFloat(employee.avg_daily_hours),
                attendancePercentage: expectedWorkingDays > 0 ? (employee.present_days / expectedWorkingDays) * 100 : 0
            }
        }));

        res.json({
            success: true,
            period: {
                startDate: start.format('YYYY-MM-DD'),
                endDate: end.format('YYYY-MM-DD'),
                expectedWorkingDays: expectedWorkingDays
            },
            department: department || 'All Departments',
            employees: report
        });

    } catch (error) {
        console.error('Get team attendance report error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get daily attendance summary (admin only)
router.get('/daily/:date?', requireAdmin, async (req, res) => {
    try {
        const date = req.params.date || moment().format('YYYY-MM-DD');
        
        // Validate date format
        if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        // Log report generation
        await executeQuery(
            'INSERT INTO report_generations (report_type, report_date, generated_by, parameters) VALUES (?, ?, ?, ?)',
            ['daily_attendance', date, req.user.id, JSON.stringify({ date, requestedBy: req.user.email })]
        );

        // Get total generation count for this report type
        const countResult = await executeQuery(
            'SELECT COUNT(*) as total_generations FROM report_generations WHERE report_type = ?',
            ['daily_attendance']
        );

        const query = `
            SELECT 
                u.id,
                u.employee_id,
                u.first_name,
                u.last_name,
                u.department,
                u.position,
                ar.id as record_id,
                ar.check_in_time,
                ar.check_out_time,
                ar.break_start_time,
                ar.break_end_time,
                ar.total_hours,
                ar.break_duration,
                ar.overtime_hours,
                ar.status,
                ar.notes,
                CASE 
                    WHEN ar.check_in_time IS NOT NULL AND ar.check_out_time IS NULL THEN 'clocked_in'
                    WHEN ar.check_in_time IS NOT NULL AND ar.check_out_time IS NOT NULL THEN 'completed'
                    ELSE 'not_started'
                END as current_status
            FROM users u
            LEFT JOIN attendance_records ar ON u.id = ar.user_id AND ar.date = ?
            WHERE u.is_active = TRUE
            ORDER BY ar.check_in_time DESC, u.first_name, u.last_name
        `;

        const records = await executeQuery(query, [date]);

        const summary = {
            totalEmployees: records.length,
            present: records.filter(r => r.current_status !== 'not_started').length,
            absent: records.filter(r => r.current_status === 'not_started').length,
            currentlyClockedIn: records.filter(r => r.current_status === 'clocked_in').length,
            completed: records.filter(r => r.current_status === 'completed').length
        };

        res.json({
            success: true,
            date: date,
            summary: summary,
            reportGeneration: {
                totalGenerations: countResult[0].total_generations,
                generatedAt: new Date().toISOString(),
                generatedBy: req.user.email
            },
            employees: records.map(record => ({
                userId: record.id,
                employeeId: record.employee_id,
                name: `${record.first_name} ${record.last_name}`,
                department: record.department,
                position: record.position,
                attendance: {
                    recordId: record.record_id,
                    checkInTime: record.check_in_time,
                    checkOutTime: record.check_out_time,
                    breakStartTime: record.break_start_time,
                    breakEndTime: record.break_end_time,
                    totalHours: parseFloat(record.total_hours || 0),
                    breakDuration: parseFloat(record.break_duration || 0),
                    overtimeHours: parseFloat(record.overtime_hours || 0),
                    status: record.status,
                    currentStatus: record.current_status,
                    notes: record.notes
                }
            }))
        });

    } catch (error) {
        console.error('Get daily report error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get departments list
router.get('/departments', requireAdmin, async (req, res) => {
    try {
        const departments = await executeQuery(
            'SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND is_active = TRUE ORDER BY department'
        );

        res.json({
            success: true,
            departments: departments.map(d => d.department)
        });

    } catch (error) {
        console.error('Get departments error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;