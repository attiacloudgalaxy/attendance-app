import React, { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import moment from 'moment';
import { 
  Clock, 
  TrendingUp, 
  Target, 
  CheckCircle, 
  AlertCircle,
  Coffee,
  Play,
  Pause,
  Award
} from 'lucide-react';

const LiveProgressTracker = ({ userId }) => {
  const [currentProgress, setCurrentProgress] = useState({
    hoursWorked: 0,
    targetHours: 8,
    status: 'not_started',
    checkInTime: null,
    lastBreakStart: null,
    isOnBreak: false,
    totalBreakTime: 0,
    progressPercentage: 0,
    timeRemaining: 0,
    estimatedEndTime: null,
    currentSession: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchCurrentProgress();
      // Update every 30 seconds for live tracking
      const interval = setInterval(fetchCurrentProgress, 30000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  const fetchCurrentProgress = async () => {
    try {
      setIsLoading(true);
      const response = await attendanceAPI.getStatus(userId);
      const data = response.data;

      if (data.currentRecord) {
        const record = data.currentRecord;
        const checkInMoment = moment(`${record.date} ${record.check_in_time}`);
        const now = moment();
        
        // Calculate current session time (excluding breaks)
        let currentSessionMinutes = now.diff(checkInMoment, 'minutes');
        
        // Subtract break time if currently on break
        if (record.break_start_time && !record.break_end_time) {
          const breakStart = moment(`${record.date} ${record.break_start_time}`);
          currentSessionMinutes = breakStart.diff(checkInMoment, 'minutes');
        }
        
        // Add previous completed work time and subtract total break time
        const totalMinutes = currentSessionMinutes - (parseFloat(record.break_duration) * 60 || 0);
        const hoursWorked = Math.max(0, totalMinutes / 60);
        
        // Calculate progress percentage
        const progressPercentage = Math.min((hoursWorked / 8) * 100, 100);
        
        // Calculate time remaining
        const timeRemaining = Math.max(8 - hoursWorked, 0);
        
        // Estimate end time
        let estimatedEndTime = null;
        if (hoursWorked > 0 && timeRemaining > 0) {
          estimatedEndTime = moment().add(timeRemaining, 'hours');
        }

        setCurrentProgress({
          hoursWorked: hoursWorked,
          targetHours: 8,
          status: record.status || 'present',
          checkInTime: checkInMoment.format('HH:mm'),
          isOnBreak: !!(record.break_start_time && !record.break_end_time),
          totalBreakTime: parseFloat(record.break_duration) || 0,
          progressPercentage: progressPercentage,
          timeRemaining: timeRemaining,
          estimatedEndTime: estimatedEndTime,
          currentSession: currentSessionMinutes / 60
        });
      } else {
        // No active session
        setCurrentProgress(prev => ({
          ...prev,
          hoursWorked: 0,
          status: 'not_started',
          checkInTime: null,
          isOnBreak: false,
          progressPercentage: 0,
          timeRemaining: 8,
          estimatedEndTime: null,
          currentSession: 0
        }));
      }
      
      setLastUpdated(moment());
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (hours) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const getStatusColor = () => {
    if (currentProgress.hoursWorked >= 8) return 'var(--success-500)';
    if (currentProgress.hoursWorked >= 6) return 'var(--warning-500)';
    if (currentProgress.hoursWorked >= 3) return 'var(--primary-500)';
    return 'var(--gray-400)';
  };

  const getStatusIcon = () => {
    if (currentProgress.status === 'not_started') return <Play className="h-5 w-5" />;
    if (currentProgress.isOnBreak) return <Coffee className="h-5 w-5" />;
    if (currentProgress.hoursWorked >= 8) return <Award className="h-5 w-5" />;
    if (currentProgress.status === 'present') return <TrendingUp className="h-5 w-5" />;
    return <Clock className="h-5 w-5" />;
  };

  const getStatusMessage = () => {
    if (currentProgress.status === 'not_started') return "Ready to start your day!";
    if (currentProgress.isOnBreak) return "Currently on break";
    if (currentProgress.hoursWorked >= 8) return "Daily target achieved! 🎉";
    if (currentProgress.hoursWorked >= 7) return "Almost there, keep going!";
    if (currentProgress.hoursWorked >= 5) return "Great progress today!";
    if (currentProgress.hoursWorked >= 2) return "Building momentum...";
    return "Just getting started";
  };

  if (isLoading) {
    return (
      <div className="modern-card p-6 animate-pulse-modern">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-card p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${getStatusColor()}20`, color: getStatusColor() }}
          >
            {getStatusIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Today's Progress</h3>
            <p className="text-sm text-gray-600">{getStatusMessage()}</p>
          </div>
        </div>
        {lastUpdated && (
          <div className="text-xs text-gray-500">
            Updated {lastUpdated.format('HH:mm:ss')}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            {formatTime(currentProgress.hoursWorked)} / {currentProgress.targetHours}h
          </span>
          <span className="text-sm text-gray-500">
            {currentProgress.progressPercentage.toFixed(1)}%
          </span>
        </div>
        
        <div className="progress-container h-3">
          <div 
            className="progress-bar h-3 transition-all duration-1000 ease-out"
            style={{ 
              width: `${currentProgress.progressPercentage}%`,
              background: `linear-gradient(90deg, ${getStatusColor()} 0%, ${getStatusColor()}CC 100%)`
            }}
          ></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Time Started */}
        {currentProgress.checkInTime && (
          <div className="glass p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Started</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {currentProgress.checkInTime}
            </p>
          </div>
        )}

        {/* Time Remaining */}
        <div className="glass p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Remaining</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {currentProgress.timeRemaining > 0 ? formatTime(currentProgress.timeRemaining) : "Complete"}
          </p>
        </div>

        {/* Break Time */}
        {currentProgress.totalBreakTime > 0 && (
          <div className="glass p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Coffee className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Break Time</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {formatTime(currentProgress.totalBreakTime)}
            </p>
          </div>
        )}

        {/* Estimated End Time */}
        {currentProgress.estimatedEndTime && currentProgress.timeRemaining > 0 && (
          <div className="glass p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Est. End</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {currentProgress.estimatedEndTime.format('HH:mm')}
            </p>
          </div>
        )}
      </div>

      {/* Status Indicators */}
      {currentProgress.isOnBreak && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Pause className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">Currently on break</span>
          </div>
        </div>
      )}

      {currentProgress.hoursWorked >= 8 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Award className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Daily target achieved! Great work! 🎉
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveProgressTracker;