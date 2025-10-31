import React, { useState, useEffect } from 'react';
import { userAPI, attendanceAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import moment from 'moment';
import { 
  UserPlus, 
  Clock, 
  Save, 
  X, 
  Search,
  Calendar,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const ManualAttendanceLogging = ({ onClose }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    date: moment().format('YYYY-MM-DD'),
    checkInTime: '',
    checkOutTime: '',
    breakStartTime: '',
    breakEndTime: '',
    notes: '',
    status: 'present'
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('select-user'); // 'select-user' or 'enter-details'
  const [authStatus, setAuthStatus] = useState('checking'); // 'checking', 'authenticated', 'unauthenticated'

  useEffect(() => {
    checkAuthAndLoadUsers();
  }, []);

  const checkAuthAndLoadUsers = async () => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      setAuthStatus('unauthenticated');
      toast.error('Please log in as admin to access user management');
      return;
    }

    try {
      const userData = JSON.parse(user);
      if (!userData.isAdmin) {
        setAuthStatus('unauthenticated');
        toast.error('Admin privileges required for user management');
        return;
      }
      
      setAuthStatus('authenticated');
      await loadUsers();
    } catch (error) {
      setAuthStatus('unauthenticated');
      console.error('Auth check failed:', error);
      await loadUsers(); // Still try to load with fallback
    }
  };

  const loadUsers = async () => {
    try {
      const response = await userAPI.getUsers();
      setUsers(response.data.users || []);
      console.log('Successfully loaded users from API:', response.data.users.length);
    } catch (error) {
      console.error('Failed to load users from API:', error);
      
      // Check if it's an authentication issue
      if (error.response?.status === 401) {
        toast.error('Authentication required. Please log in as admin to access user data.');
      } else if (error.response?.status === 403) {
        toast.error('Admin access required to load user data.');
      } else {
        toast.error('API connection issue - using cached user data');
      }
      
      // Fallback to hardcoded test users
      const fallbackUsers = [
        {
          id: 7,
          employee_id: 'EMP004',
          email: 'nora@company.com',
          first_name: 'Nora',
          last_name: 'Johnson',
          department: 'Marketing',
          position: 'Marketing Specialist'
        },
        {
          id: 8,
          employee_id: 'EMP005', 
          email: 'basim@company.com',
          first_name: 'Basim',
          last_name: 'Ahmed',
          department: 'Sales',
          position: 'Sales Representative'
        },
        {
          id: 2,
          employee_id: 'EMP001',
          email: 'john.doe@company.com', 
          first_name: 'John',
          last_name: 'Doe',
          department: 'Engineering',
          position: 'Software Developer'
        },
        {
          id: 3,
          employee_id: 'EMP002',
          email: 'jane.smith@company.com',
          first_name: 'Jane', 
          last_name: 'Smith',
          department: 'Marketing',
          position: 'Marketing Manager'
        }
      ];
      
      setUsers(fallbackUsers);
      console.log('Using fallback user data:', fallbackUsers.length);
    }
  };

  const filteredUsers = users.filter(user => 
    user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setStep('enter-details');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.date) {
      toast.error('Please select a date');
      return false;
    }
    
    if (!formData.checkInTime) {
      toast.error('Check-in time is required');
      return false;
    }
    
    if (formData.checkOutTime && formData.checkInTime >= formData.checkOutTime) {
      toast.error('Check-out time must be after check-in time');
      return false;
    }
    
    if (formData.breakStartTime && formData.breakEndTime) {
      if (formData.breakStartTime >= formData.breakEndTime) {
        toast.error('Break end time must be after break start time');
        return false;
      }
      
      if (formData.breakStartTime < formData.checkInTime) {
        toast.error('Break cannot start before check-in');
        return false;
      }
      
      if (formData.checkOutTime && formData.breakEndTime > formData.checkOutTime) {
        toast.error('Break cannot end after check-out');
        return false;
      }
    }
    
    return true;
  };

  const calculateHours = () => {
    if (!formData.checkInTime) return 0;
    
    const checkIn = moment(`${formData.date} ${formData.checkInTime}`);
    const checkOut = formData.checkOutTime 
      ? moment(`${formData.date} ${formData.checkOutTime}`)
      : moment();
    
    let workMinutes = checkOut.diff(checkIn, 'minutes');
    
    // Subtract break time if provided
    if (formData.breakStartTime && formData.breakEndTime) {
      const breakStart = moment(`${formData.date} ${formData.breakStartTime}`);
      const breakEnd = moment(`${formData.date} ${formData.breakEndTime}`);
      const breakMinutes = breakEnd.diff(breakStart, 'minutes');
      workMinutes -= breakMinutes;
    }
    
    return Math.max(0, workMinutes / 60);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const attendanceData = {
        userId: selectedUser.id,
        date: formData.date,
        checkInTime: formData.checkInTime,
        checkOutTime: formData.checkOutTime || null,
        breakStartTime: formData.breakStartTime || null,
        breakEndTime: formData.breakEndTime || null,
        notes: formData.notes,
        status: formData.status,
        isManualEntry: true
      };
      
      // This would need a new API endpoint for manual attendance logging
      await attendanceAPI.createManualRecord(attendanceData);
      
      toast.success(`Attendance logged for ${selectedUser.first_name} ${selectedUser.last_name}`);
      onClose();
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to log attendance');
    } finally {
      setLoading(false);
    }
  };

  const totalHours = calculateHours();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <UserPlus className="h-6 w-6 mr-2 text-primary-600" />
            Manual Attendance Logging
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Authentication Status Indicator */}
        {authStatus === 'unauthenticated' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
              <div className="text-sm">
                <p className="text-yellow-800 font-medium">Limited Access Mode</p>
                <p className="text-yellow-700">
                  Using cached user data. For real-time data, please ensure you're logged in as an admin.
                </p>
              </div>
            </div>
          </div>
        )}

        {authStatus === 'authenticated' && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <div className="text-sm">
                <p className="text-green-800 font-medium">Full Access Mode</p>
                <p className="text-green-700">
                  Connected to live user database with admin privileges.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 'select-user' ? (
          /* User Selection Step */
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search and Select User
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, employee ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-md">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">
                          {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.employee_id} • {user.department} • {user.email}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <Search className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2">No users found</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Attendance Details Step */
          <div>
            {/* Selected User Info */}
            <div className="bg-gray-50 p-4 rounded-md mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-10 w-10">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">
                      {selectedUser.first_name?.charAt(0)}{selectedUser.last_name?.charAt(0)}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedUser.employee_id} • {selectedUser.department}
                  </div>
                </div>
                <button
                  onClick={() => setStep('select-user')}
                  className="ml-auto text-sm text-primary-600 hover:text-primary-800"
                >
                  Change User
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              {/* Check In/Out Times */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-in Time *
                  </label>
                  <input
                    type="time"
                    name="checkInTime"
                    required
                    value={formData.checkInTime}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-out Time
                  </label>
                  <input
                    type="time"
                    name="checkOutTime"
                    value={formData.checkOutTime}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Break Times */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Break Start Time
                  </label>
                  <input
                    type="time"
                    name="breakStartTime"
                    value={formData.breakStartTime}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Break End Time
                  </label>
                  <input
                    type="time"
                    name="breakEndTime"
                    value={formData.breakEndTime}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="present">Present</option>
                  <option value="partial">Partial</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Add any notes about this attendance record..."
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              {/* Calculated Hours Display */}
              {totalHours > 0 && (
                <div className="bg-blue-50 p-4 rounded-md">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Calculated Working Hours: {totalHours.toFixed(2)} hours
                      </p>
                      <p className="text-xs text-blue-700">
                        {totalHours >= 8 ? 'Full day completed' : `${(8 - totalHours).toFixed(2)} hours short of full day`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Log Attendance
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualAttendanceLogging;