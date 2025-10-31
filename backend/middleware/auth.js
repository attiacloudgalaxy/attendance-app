const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if session is still active in database
        const sessionQuery = `
            SELECT s.*, u.is_active, u.email, u.first_name, u.last_name, u.is_admin
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.session_token = ? AND s.is_active = TRUE AND s.expires_at > NOW()
        `;
        
        const sessions = await executeQuery(sessionQuery, [token]);
        
        if (sessions.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired session'
            });
        }

        const session = sessions[0];
        
        if (!session.is_active) {
            return res.status(401).json({
                success: false,
                message: 'User account is inactive'
            });
        }

        req.user = {
            id: decoded.userId,
            email: session.email,
            firstName: session.first_name,
            lastName: session.last_name,
            isAdmin: session.is_admin,
            sessionId: session.id
        };
        
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(403).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Admin authorization middleware
const requireAdmin = (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Admin privileges required'
        });
    }
    next();
};

// Self or admin authorization (user can access own data, admin can access any)
const requireSelfOrAdmin = (req, res, next) => {
    const targetUserId = parseInt(req.params.userId || req.body.userId);
    
    if (req.user.isAdmin || req.user.id === targetUserId) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Insufficient permissions'
        });
    }
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requireSelfOrAdmin
};