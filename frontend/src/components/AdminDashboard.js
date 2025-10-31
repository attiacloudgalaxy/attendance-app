import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DailyAttendanceReport from './DailyAttendanceReport';
import ManualAttendanceLogging from './ManualAttendanceLogging';
import { 
  Calendar, 
  UserPlus, 
  Users, 
  BarChart3, 
  Settings,
  Shield,
  Clock
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('reports');
  const [showManualLogging, setShowManualLogging] = useState(false);

  // Check if user is admin
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-background)' }}>
        <div className="modern-card p-8 text-center animate-fade-in">
          <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'reports',
      name: 'Daily Reports',
      icon: BarChart3,
      description: 'View and export daily attendance reports'
    },
    {
      id: 'users',
      name: 'User Management',
      icon: Users,
      description: 'Manage employee accounts and settings'
    }
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-background)' }}>
      {/* Admin Header */}
      <div className="glass backdrop-blur-xl border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center animate-fade-in">
                  <div 
                    className="flex items-center justify-center w-10 h-10 rounded-xl mr-3 shadow-lg"
                    style={{ background: 'var(--gradient-admin)' }}
                  >
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  Admin Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-200">
                  Manage attendance and user accounts with powerful admin tools
                </p>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowManualLogging(true)}
                  className="inline-flex items-center px-6 py-3 shadow-xl text-sm font-semibold rounded-xl text-white transform hover:scale-105 transition-all duration-300"
                  style={{ background: 'var(--gradient-admin)' }}
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Log Attendance
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex space-x-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-3 px-6 font-medium text-sm rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  isActive
                    ? 'shadow-lg text-white'
                    : 'glass text-white hover:bg-white/10'
                }`}
                style={isActive ? { background: 'var(--gradient-admin)' } : {}}
              >
                <Icon className={`h-5 w-5 mr-2 ${
                  isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'
                }`} />
                {tab.name}
              </button>
            );
            })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="modern-card p-6 text-white animate-fade-in" style={{ background: 'var(--gradient-accent)' }}>
                <div className="flex items-center">
                  <Users className="h-8 w-8" />
                  <div className="ml-3">
                    <p className="text-blue-100">Total Employees</p>
                    <p className="text-2xl font-bold">6</p>
                  </div>
                </div>
              </div>
              
              <div className="modern-card p-6 text-white animate-fade-in" style={{ background: 'var(--gradient-success)' }}>
                <div className="flex items-center">
                  <Clock className="h-8 w-8" />
                  <div className="ml-3">
                    <p className="text-green-100">Present Today</p>
                    <p className="text-2xl font-bold">-</p>
                  </div>
                </div>
              </div>
              
              <div className="modern-card p-6 text-white animate-fade-in" style={{ background: 'var(--gradient-admin)' }}>
                <div className="flex items-center">
                  <Calendar className="h-8 w-8" />
                  <div className="ml-3">
                    <p className="text-purple-100">Reports Generated</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Reports Component */}
            <DailyAttendanceReport />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="modern-card animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2 text-primary-500" />
                User Management
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Manage employee accounts, roles, and permissions
              </p>
            </div>
            <div className="p-6">
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">User Management</h3>
                <p className="mt-1 text-sm text-gray-500">
                  User management features coming soon. For now, you can manually log attendance for existing users.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowManualLogging(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Log Attendance for User
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Logging Modal */}
      {showManualLogging && (
        <ManualAttendanceLogging onClose={() => setShowManualLogging(false)} />
      )}
    </div>
  );
};

export default AdminDashboard;