import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Show error message
    const message = error.response?.data?.message || 'An error occurred';
    toast.error(message);
    
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  verify2FA: (userId, token) => api.post('/auth/verify-2fa', { userId, token }),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (email, token, newPassword) => 
    api.post('/auth/reset-password', { email, token, newPassword }),
  getProfile: () => api.get('/auth/me'),
  validateToken: () => api.get('/auth/validate'),
};

// Attendance API calls
export const attendanceAPI = {
  clockIn: (userId, notes) => api.post('/attendance/clock-in', { userId, notes }),
  clockOut: (userId, notes) => api.post('/attendance/clock-out', { userId, notes }),
  startBreak: (userId) => api.post('/attendance/break-start', { userId }),
  endBreak: (userId) => api.post('/attendance/break-end', { userId }),
  getStatus: (userId) => api.get(`/attendance/status/${userId || ''}`),
  getRecords: (userId, params) => api.get(`/attendance/records/${userId || ''}`, { params }),
  getTodayAll: () => api.get('/attendance/today/all'),
};

// User API calls
export const userAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (userId) => api.get(`/users/${userId}`),
  createUser: (userData) => api.post('/users', userData),
  updateUser: (userId, userData) => api.put(`/users/${userId}`, userData),
  changePassword: (userId, passwordData) => 
    api.put(`/users/${userId}/password`, passwordData),
  deactivateUser: (userId) => api.delete(`/users/${userId}`),
};

// Leave API calls
export const leaveAPI = {
  getLeaveRequests: (params) => api.get('/leave', { params }),
  submitLeaveRequest: (requestData) => api.post('/leave', requestData),
  updateLeaveStatus: (requestId, status, comments) => 
    api.put(`/leave/${requestId}/status`, { status, comments }),
};

// Reports API calls
export const reportsAPI = {
  getAttendanceReport: (userId, params) => 
    api.get(`/reports/attendance/${userId || ''}`, { params }),
  getTeamReport: (params) => api.get('/reports/team/attendance', { params }),
  getDailyReport: (date) => api.get(`/reports/daily/${date || ''}`),
  getDepartments: () => api.get('/reports/departments'),
};

export default api;