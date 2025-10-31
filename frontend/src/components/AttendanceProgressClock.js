import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { 
  Clock, 
  Target, 
  Timer, 
  TrendingUp, 
  Zap, 
  Award, 
  Coffee,
  Play,
  RotateCcw
} from 'lucide-react';

const AttendanceProgressClock = ({ attendanceStatus }) => {
  const [currentTime, setCurrentTime] = useState(moment());
  const [workingTime, setWorkingTime] = useState(0);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    // Update every second with smooth animation
    const timer = setInterval(() => {
      setCurrentTime(moment());
      setAnimationKey(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (attendanceStatus?.checkInTime && attendanceStatus?.isClockedIn) {
      calculateWorkingTime();
    }
  }, [currentTime, attendanceStatus]);

  const calculateWorkingTime = () => {
    if (!attendanceStatus?.checkInTime || !attendanceStatus?.isClockedIn) {
      setWorkingTime(0);
      return;
    }

    const checkInMoment = moment(`${attendanceStatus.date} ${attendanceStatus.checkInTime}`);
    const now = currentTime;
    
    // Calculate break time if on break
    let totalBreakTime = attendanceStatus?.breakDuration || 0;
    if (attendanceStatus?.isOnBreak && attendanceStatus?.breakStartTime) {
      const breakStart = moment(`${attendanceStatus.date} ${attendanceStatus.breakStartTime}`);
      const currentBreakTime = now.diff(breakStart, 'minutes') / 60;
      totalBreakTime += currentBreakTime;
    }

    const totalMinutes = now.diff(checkInMoment, 'minutes');
    const workingMinutes = totalMinutes - (totalBreakTime * 60);
    const workingHours = Math.max(0, workingMinutes / 60);
    
    setWorkingTime(workingHours);
  };

  const targetHours = 8;
  const progressPercentage = Math.min((workingTime / targetHours) * 100, 100);
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  const formatTime = (hours) => {
    const totalMinutes = Math.floor(hours * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  };

  const getProgressColor = () => {
    if (progressPercentage < 50) return '#ef4444'; // Red
    if (progressPercentage < 75) return '#f59e0b'; // Orange
    if (progressPercentage < 100) return '#10b981'; // Green
    return '#8b5cf6'; // Purple for overtime
  };

  const getStatusMessage = () => {
    if (!attendanceStatus?.isClockedIn) return 'Not clocked in';
    if (attendanceStatus?.isOnBreak) return 'On break';
    if (workingTime >= targetHours) return 'Target achieved!';
    const remaining = targetHours - workingTime;
    return `${formatTime(remaining)} remaining`;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Timer className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Today's Progress</h3>
        </div>
        <div className="text-sm text-gray-500">
          {currentTime.format('HH:mm:ss')}
        </div>
      </div>

      <div className="flex items-center justify-center mb-4">
        <div className="relative">
          <svg className="transform -rotate-90 w-32 h-32">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="transparent"
              className="opacity-25"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke={getProgressColor()}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-300 ease-in-out drop-shadow-sm"
              style={{
                filter: 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.3))'
              }}
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(progressPercentage)}%
              </div>
              <div className="text-xs text-gray-500">
                {formatTime(workingTime)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status and target info */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Status</span>
          </div>
          <span className={`text-sm font-medium ${
            attendanceStatus?.isClockedIn 
              ? attendanceStatus?.isOnBreak 
                ? 'text-yellow-600' 
                : 'text-green-600'
              : 'text-gray-500'
          }`}>
            {getStatusMessage()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Target</span>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {targetHours} hours
          </span>
        </div>

        {workingTime >= targetHours && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Overtime</span>
            </div>
            <span className="text-sm font-medium text-purple-600">
              +{formatTime(workingTime - targetHours)}
            </span>
          </div>
        )}
      </div>

      {/* Visual indicators */}
      <div className="mt-4 flex justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-gray-500">0-4h</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span className="text-gray-500">4-6h</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-gray-500">6-8h</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span className="text-gray-500">8h+</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceProgressClock;