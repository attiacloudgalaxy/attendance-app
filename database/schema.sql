-- Attendance Management System Database Schema
-- Created: 2025-10-31

CREATE DATABASE IF NOT EXISTS attendance_system;
USE attendance_system;

-- Users table for employee information
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee_id (employee_id),
    INDEX idx_email (email)
);

-- Two-Factor Authentication tokens
CREATE TABLE auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(6) NOT NULL,
    token_type ENUM('login', 'password_reset') DEFAULT 'login',
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_token (user_id, token)
);

-- Attendance records for check-in/check-out
CREATE TABLE attendance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    break_start_time TIME,
    break_end_time TIME,
    total_hours DECIMAL(4,2) DEFAULT 0,
    break_duration DECIMAL(4,2) DEFAULT 0,
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    status ENUM('present', 'absent', 'partial', 'late') DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_date (date),
    INDEX idx_user_date (user_id, date)
);

-- Leave/Absence requests
CREATE TABLE leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    leave_type ENUM('sick', 'vacation', 'personal', 'emergency', 'other') NOT NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_dates (user_id, start_date, end_date),
    INDEX idx_status (status)
);

-- System settings for configuration
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User sessions for login management
CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_user_session (user_id, is_active)
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('min_daily_hours', '8.0', 'Minimum required daily working hours'),
('max_daily_hours', '12.0', 'Maximum allowed daily working hours'),
('overtime_threshold', '8.0', 'Hours after which overtime calculation begins'),
('grace_period_minutes', '15', 'Grace period for late check-in (in minutes)'),
('email_smtp_host', '', 'SMTP server host for email notifications'),
('email_smtp_port', '587', 'SMTP server port'),
('email_username', '', 'SMTP username for authentication'),
('email_password', '', 'SMTP password for authentication'),
('company_name', 'Your Company', 'Company name for system branding'),
('working_days_per_week', '5', 'Standard working days per week');

-- Create default admin user (password: admin123)
INSERT INTO users (employee_id, email, password_hash, first_name, last_name, department, position, hire_date, is_admin) VALUES
('ADMIN001', 'admin@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewimDSWGdj7SEK.G', 'System', 'Administrator', 'IT', 'System Admin', CURDATE(), TRUE);

-- Create some sample employees
INSERT INTO users (employee_id, email, password_hash, first_name, last_name, department, position, hire_date) VALUES
('EMP001', 'john.doe@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewimDSWGdj7SEK.G', 'John', 'Doe', 'Engineering', 'Software Developer', '2024-01-15'),
('EMP002', 'jane.smith@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewimDSWGdj7SEK.G', 'Jane', 'Smith', 'Marketing', 'Marketing Manager', '2024-02-01'),
('EMP003', 'bob.johnson@company.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewimDSWGdj7SEK.G', 'Bob', 'Johnson', 'Sales', 'Sales Representative', '2024-03-10');