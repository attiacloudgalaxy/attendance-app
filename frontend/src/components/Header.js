import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { LogOut, User, Clock, Settings, Users, BarChart3 } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  return (
    <header className="glass backdrop-blur-xl border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo/Title */}
          <div className="flex items-center space-x-4">
            <div 
              className="flex items-center justify-center w-12 h-12 rounded-xl shadow-lg animate-pulse-modern"
              style={{ background: 'var(--gradient-accent)' }}
            >
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AttendanceApp</h1>
              <p className="text-sm text-gray-200">Modern Employee Management</p>
            </div>
          </div>

          {/* Navigation and user info */}
          <div className="flex items-center space-x-4">
            {/* Admin Navigation */}
            {user?.isAdmin && (
              <div className="flex items-center space-x-2">
                <a
                  href="/dashboard"
                  className="glass-dark text-sm font-medium text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden md:inline">Dashboard</span>
                </a>
                <a
                  href="/admin"
                  className="text-sm font-medium px-4 py-2 rounded-xl transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  style={{ 
                    background: 'var(--gradient-admin)',
                    color: 'white'
                  }}
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden md:inline font-semibold">Admin Portal</span>
                </a>
              </div>
            )}
            
            {/* User info */}
            <div className="flex items-center space-x-3">
              <div 
                className="flex items-center justify-center w-10 h-10 rounded-full shadow-lg ring-2 ring-white/20"
                style={{ background: 'var(--gradient-accent)' }}
              >
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-white">
                  {user?.firstName} {user?.lastName}
                </div>
                <div className="text-xs text-gray-200">
                  {user?.position} • {user?.department}
                </div>
              </div>
            </div>

            {/* Enhanced Logout button */}
            <button
              onClick={handleLogout}
              className="group inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transform hover:scale-105 transition-all duration-200"
              title="Sign Out Securely"
            >
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <LogOut className="h-4 w-4 group-hover:animate-pulse" />
                  <div className="absolute -top-1 -right-1 h-2 w-2 bg-yellow-300 rounded-full animate-ping"></div>
                </div>
                <span className="hidden sm:inline font-semibold">Sign Out</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;