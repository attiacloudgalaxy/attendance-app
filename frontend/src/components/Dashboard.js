import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { attendanceAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import moment from 'moment';
import Header from './Header';
import AttendanceProgressClock from './AttendanceProgressClock';
import LiveProgressTracker from './LiveProgressTracker';
import { 
  Clock, 
  Play, 
  Pause, 
  Square, 
  Coffee, 
  CheckCircle,
  AlertCircle,
  Timer,
  Sparkles,
  TrendingUp
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [currentTime, setCurrentTime] = useState(moment());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendanceStatus();
    
    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(moment());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadAttendanceStatus = async () => {
    try {
      const response = await attendanceAPI.getStatus();
      setAttendanceStatus(response.data.status);
    } catch (error) {
      console.error('Failed to load attendance status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      setLoading(true);
      await attendanceAPI.clockIn();
      toast.success('Clocked in successfully!');
      loadAttendanceStatus();
    } catch (error) {
      toast.error('Failed to clock in');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setLoading(true);
      await attendanceAPI.clockOut();
      toast.success('Clocked out successfully!');
      loadAttendanceStatus();
    } catch (error) {
      toast.error('Failed to clock out');
    } finally {
      setLoading(false);
    }
  };

  const handleStartBreak = async () => {
    try {
      setLoading(true);
      await attendanceAPI.startBreak();
      toast.success('Break started');
      loadAttendanceStatus();
    } catch (error) {
      toast.error('Failed to start break');
    } finally {
      setLoading(false);
    }
  };

  const handleEndBreak = async () => {
    try {
      setLoading(true);
      await attendanceAPI.endBreak();
      toast.success('Break ended');
      loadAttendanceStatus();
    } catch (error) {
      toast.error('Failed to end break');
    } finally {
      setLoading(false);
    }
  };

  const getWorkingHours = () => {
    if (!attendanceStatus?.checkInTime) return '00:00:00';
    
    const checkIn = moment(`${attendanceStatus.date} ${attendanceStatus.checkInTime}`);
    const now = attendanceStatus.checkOutTime 
      ? moment(`${attendanceStatus.date} ${attendanceStatus.checkOutTime}`)
      : moment();
    
    const duration = moment.duration(now.diff(checkIn));
    const breakDuration = moment.duration((attendanceStatus.breakDuration || 0) * 60 * 60 * 1000);
    const workingDuration = moment.duration(duration.asMilliseconds() - breakDuration.asMilliseconds());
    
    const hours = Math.floor(workingDuration.asHours()).toString().padStart(2, '0');
    const minutes = workingDuration.minutes().toString().padStart(2, '0');
    const seconds = workingDuration.seconds().toString().padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
  };

  const getStatusBadge = () => {
    if (!attendanceStatus?.isClockedIn) {
      return <span className="status-badge bg-gray-100 text-gray-800">Not Started</span>;
    }
    
    if (attendanceStatus.isOnBreak) {
      return <span className="status-badge status-partial">On Break</span>;
    }
    
    if (attendanceStatus.checkOutTime) {
      return <span className="status-badge status-present">Completed</span>;
    }
    
    return <span className="status-badge status-present">Working</span>;
  };

  if (loading && !attendanceStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-background)' }}>
        <div className="modern-card p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--primary-500)' }}></div>
            <div className="text-gray-600 font-medium">Loading your dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-background)' }}>
      {/* Header with logout */}
      <Header />
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.firstName}!
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {moment().format('dddd, MMMM Do YYYY')}
            </p>
          </div>
          
          {/* Admin Quick Access */}
          {user?.isAdmin && (
            <div className="flex items-center space-x-3">
              <a
                href="/admin"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transform hover:scale-105 transition-all duration-200"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 2.676-.732 5.162-2.168 7.162-4.122 1.245-1.22 2.24-2.618 2.938-4.162A11.955 11.955 0 0021 9a12.02 12.02 0 00-.382-5.016z" />
                </svg>
                Admin Panel
              </a>
            </div>
          )}
        </div>
        {/* Current Time */}
        <div className="text-center mb-8">
          <div className="text-6xl font-mono font-bold text-gray-900">
            {currentTime.format('HH:mm:ss')}
          </div>
          <div className="text-xl text-gray-600 mt-2">
            {currentTime.format('dddd, MMMM Do YYYY')}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Attendance Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Progress Tracker */}
            <LiveProgressTracker userId={user?.id} />
            
            {/* Progress Clock */}
            <AttendanceProgressClock attendanceStatus={attendanceStatus} />
            
            {/* Attendance Controls */}
            <div>
            <div className="modern-card p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Sparkles className="h-6 w-6 mr-2 text-primary-500" />
                  Attendance Controls
                </h2>
                {getStatusBadge()}
              </div>

              {/* Clock In/Out Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={handleClockIn}
                  disabled={loading || attendanceStatus?.isClockedIn}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-4"
                  style={{ background: attendanceStatus?.isClockedIn ? 'var(--gray-300)' : 'var(--gradient-accent)' }}
                >
                  <Play className="h-5 w-5 mr-2" />
                  Clock In
                </button>

                <button
                  onClick={handleClockOut}
                  disabled={loading || !attendanceStatus?.isClockedIn || attendanceStatus?.checkOutTime}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-4"
                  style={{ background: (!attendanceStatus?.isClockedIn || attendanceStatus?.checkOutTime) ? 'var(--gray-300)' : 'linear-gradient(135deg, var(--error-500) 0%, var(--error-600) 100%)' }}
                >
                  <Square className="h-5 w-5 mr-2" />
                  Clock Out
                </button>
              </div>

              {/* Break Controls */}
              {attendanceStatus?.isClockedIn && !attendanceStatus?.checkOutTime && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleStartBreak}
                    disabled={loading || attendanceStatus?.isOnBreak}
                    className="flex items-center justify-center px-6 py-3 bg-warning-600 hover:bg-warning-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                  >
                    <Coffee className="h-5 w-5 mr-2" />
                    Start Break
                  </button>

                  <button
                    onClick={handleEndBreak}
                    disabled={loading || !attendanceStatus?.isOnBreak}
                    className="flex items-center justify-center px-6 py-3 bg-warning-600 hover:bg-warning-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                  >
                    <Pause className="h-5 w-5 mr-2" />
                    End Break
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Today's Summary */}
          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Summary</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    Check In
                  </span>
                  <span className="font-mono text-sm">
                    {attendanceStatus?.checkInTime || '--:--'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    Check Out
                  </span>
                  <span className="font-mono text-sm">
                    {attendanceStatus?.checkOutTime || '--:--'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-gray-600">
                    <Timer className="h-4 w-4 mr-2" />
                    Working Hours
                  </span>
                  <span className="font-mono text-sm font-medium">
                    {getWorkingHours()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center text-sm text-gray-600">
                    <Coffee className="h-4 w-4 mr-2" />
                    Break Duration
                  </span>
                  <span className="font-mono text-sm">
                    {attendanceStatus?.breakDuration ? 
                      `${(attendanceStatus.breakDuration).toFixed(1)}h` : '0.0h'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-success-500 mr-3" />
                  <span className="text-sm">8h minimum daily target</span>
                </div>
                
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-warning-500 mr-3" />
                  <span className="text-sm">
                    {attendanceStatus?.totalHours >= 8 ? 'Target achieved!' : 'Working towards target'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;