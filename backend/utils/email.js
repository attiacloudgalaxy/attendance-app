const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { executeQuery } = require('../config/database');

// Create email transporter
const createTransporter = () => {
    return nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Generate 2FA token
const generateTwoFactorToken = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit number
};

// Send 2FA email
const send2FAEmail = async (email, token, firstName) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Your Two-Factor Authentication Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Two-Factor Authentication</h2>
                    <p>Hello ${firstName},</p>
                    <p>Your authentication code is:</p>
                    <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                        <h1 style="font-size: 32px; color: #007bff; margin: 0; letter-spacing: 5px;">${token}</h1>
                    </div>
                    <p>This code will expire in 15 minutes.</p>
                    <p>If you didn't request this code, please ignore this email.</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message from ${process.env.COMPANY_NAME || 'Attendance System'}.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
};

// Store 2FA token in database
const store2FAToken = async (userId, token, tokenType = 'login') => {
    try {
        // Delete any existing tokens for this user
        await executeQuery(
            'DELETE FROM auth_tokens WHERE user_id = ? AND token_type = ?',
            [userId, tokenType]
        );

        // Insert new token (expires in 15 minutes)
        await executeQuery(
            'INSERT INTO auth_tokens (user_id, token, token_type, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
            [userId, token, tokenType]
        );

        return true;
    } catch (error) {
        console.error('Token storage error:', error);
        return false;
    }
};

// Verify 2FA token
const verify2FAToken = async (userId, token, tokenType = 'login') => {
    try {
        const tokens = await executeQuery(
            `SELECT * FROM auth_tokens 
             WHERE user_id = ? AND token = ? AND token_type = ? 
             AND expires_at > NOW() AND is_used = FALSE`,
            [userId, token, tokenType]
        );

        if (tokens.length === 0) {
            return false;
        }

        // Mark token as used
        await executeQuery(
            'UPDATE auth_tokens SET is_used = TRUE WHERE id = ?',
            [tokens[0].id]
        );

        return true;
    } catch (error) {
        console.error('Token verification error:', error);
        return false;
    }
};

// Send password reset email
const sendPasswordResetEmail = async (email, token, firstName) => {
    try {
        const transporter = createTransporter();
        
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p>Hello ${firstName},</p>
                    <p>You requested a password reset. Your verification code is:</p>
                    <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                        <h1 style="font-size: 32px; color: #dc3545; margin: 0; letter-spacing: 5px;">${token}</h1>
                    </div>
                    <p>This code will expire in 15 minutes.</p>
                    <p>If you didn't request this reset, please ignore this email.</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">
                        This is an automated message from ${process.env.COMPANY_NAME || 'Attendance System'}.
                    </p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Password reset email error:', error);
        return false;
    }
};

// Test email configuration
const testEmailConfig = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('Email configuration is valid');
        return true;
    } catch (error) {
        console.error('Email configuration error:', error);
        return false;
    }
};

module.exports = {
    generateTwoFactorToken,
    send2FAEmail,
    store2FAToken,
    verify2FAToken,
    sendPasswordResetEmail,
    testEmailConfig
};