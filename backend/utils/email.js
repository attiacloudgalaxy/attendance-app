const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { executeQuery } = require('../config/database');

// Create email transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false
        },
        // Office 365 specific settings
        requireTLS: true,
        connectionTimeout: 60000,
        greetingTimeout: 30000,
        socketTimeout: 60000
    });
};

// Generate 2FA token
const generateTwoFactorToken = () => {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit number
};

// Send 2FA email
const send2FAEmail = async (email, token, firstName) => {
    try {
        // Check if email is properly configured
        if (!process.env.EMAIL_USER || 
            process.env.EMAIL_USER === 'your-email@gmail.com' || 
            process.env.EMAIL_USER === 'your-email@yourcompany.com' ||
            !process.env.EMAIL_PASS || 
            process.env.EMAIL_PASS === 'your-app-password') {
            console.log(`\n🔐 2FA CODE FOR ${email}: ${token}\n`);
            console.log('📧 Email not configured. Using console output for testing.');
            return true; // Return success for testing
        }

        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_FROM,
            to: email,
            subject: '🔐 Attendance System - Login Verification Code',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                    <div style="background: #0078d4; padding: 20px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🏢 Attendance System</h1>
                    </div>
                    <div style="padding: 30px;">
                        <h2 style="color: #323130; margin-top: 0;">Secure Login Verification</h2>
                        <p>Hello <strong>${firstName}</strong>,</p>
                        <p>To complete your login to the Attendance System, please use this verification code:</p>
                        
                        <div style="background: #f3f2f1; border: 2px solid #0078d4; border-radius: 8px; padding: 25px; text-align: center; margin: 25px 0;">
                            <div style="font-size: 36px; font-weight: bold; color: #0078d4; letter-spacing: 8px; font-family: 'Courier New', monospace;">${token}</div>
                        </div>
                        
                        <div style="background: #fff4ce; border-left: 4px solid #ffb900; padding: 15px; margin: 20px 0;">
                            <p style="margin: 0; color: #323130;"><strong>⏱️ Important:</strong> This code expires in <strong>15 minutes</strong></p>
                        </div>
                        
                        <p style="color: #605e5c;">If you didn't attempt to log in, please contact your IT administrator immediately.</p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #edebe9;">
                            <p style="color: #8a8886; font-size: 12px; margin: 0;">
                                📧 This is an automated security message from the Attendance System.<br>
                                🕒 Sent on ${new Date().toLocaleString()}<br>
                                🔒 For security reasons, do not share this code with anyone.
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