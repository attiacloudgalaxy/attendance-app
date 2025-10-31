import React, { useState, useEffect } from 'react';
import { reportsAPI, userAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import moment from 'moment';
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Download,
  RefreshCw,
  Filter
} from 'lucide-react';

const DailyAttendanceReport = () => {
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [startDate, setStartDate] = useState(moment().subtract(7, 'days').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [reportType, setReportType] = useState('single'); // 'single' or 'range'
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [reportGeneration, setReportGeneration] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    loadAttendanceReport();
  }, [selectedDate, startDate, endDate, reportType]);

  useEffect(() => {
    filterAttendanceData();
  }, [attendanceData, statusFilter]);

  const loadUsers = async () => {
    try {
      const response = await userAPI.getUsers();
      setUsers(response.data.users || []);
    } catch (error) {
      toast.error('Failed to load users');
    }
  };

  const loadAttendanceReport = async () => {
    setLoading(true);
    try {
      let response;
      let processedData = [];
      
      if (reportType === 'single') {
        response = await reportsAPI.getDailyReport(selectedDate);
        
        // Store report generation info
        setReportGeneration(response.data.reportGeneration);
        
        // Transform the employees data to match expected format
        processedData = response.data.employees?.map(emp => ({
          id: emp.userId,
          employee_id: emp.employeeId,
          first_name: emp.name.split(' ')[0],
          last_name: emp.name.split(' ').slice(1).join(' '),
          department: emp.department,
          position: emp.position,
          check_in_time: emp.attendance.checkInTime,
          check_out_time: emp.attendance.checkOutTime,
          break_start_time: emp.attendance.breakStartTime,
          break_end_time: emp.attendance.breakEndTime,
          total_hours: emp.attendance.totalHours,
          break_duration: emp.attendance.breakDuration,
          overtime_hours: emp.attendance.overtimeHours,
          status: emp.attendance.status || 'absent',
          notes: emp.attendance.notes,
          date: selectedDate
        })) || [];
      } else {
        // For date range reports, we'll use a different API endpoint
        response = await reportsAPI.getAttendanceReport('', {
          startDate: startDate,
          endDate: endDate
        });
        processedData = response.data.records || [];
      }
      
      setAttendanceData(processedData);
      console.log('Loaded attendance data:', processedData.length, 'records');
    } catch (error) {
      console.error('Failed to load attendance report:', error);
      toast.error('Failed to load attendance report');
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAttendanceData = () => {
    if (statusFilter === 'all') {
      setFilteredData(attendanceData);
    } else {
      setFilteredData(attendanceData.filter(record => record.status === statusFilter));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      present: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Present' },
      absent: { color: 'bg-red-100 text-red-800', icon: XCircle, text: 'Absent' },
      partial: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle, text: 'Partial' },
      late: { color: 'bg-orange-100 text-orange-800', icon: Clock, text: 'Late' }
    };
    
    const badge = badges[status] || badges.absent;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {badge.text}
      </span>
    );
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return moment(timeString, 'HH:mm:ss').format('h:mm A');
  };

  const formatHours = (hours) => {
    if (!hours || hours === 0) return '0h 0m';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const exportToCSV = () => {
    const headers = ['Employee ID', 'Name', 'Department', 'Date', 'Check In', 'Check Out', 'Total Hours', 'Status'];
    const csvData = filteredData.map(record => [
      record.employee_id,
      `${record.first_name} ${record.last_name}`,
      record.department,
      moment(record.date).format('YYYY-MM-DD'),
      formatTime(record.check_in_time),
      formatTime(record.check_out_time),
      formatHours(record.total_hours),
      record.status
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const filename = reportType === 'single' 
      ? `attendance-report-${selectedDate}.csv`
      : `attendance-report-${startDate}-to-${endDate}.csv`;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const validateDateRange = (start, end) => {
    const startMoment = moment(start);
    const endMoment = moment(end);
    const maxDate = moment();
    const minDate = moment().subtract(1, 'year');
    
    if (startMoment.isAfter(endMoment)) {
      toast.error('Start date must be before end date');
      return false;
    }
    
    if (endMoment.isAfter(maxDate)) {
      toast.error('End date cannot be in the future');
      return false;
    }
    
    if (startMoment.isBefore(minDate)) {
      toast.error('Date range cannot exceed 1 year from today');
      return false;
    }
    
    const daysDiff = endMoment.diff(startMoment, 'days');
    if (daysDiff > 365) {
      toast.error('Date range cannot exceed 1 year');
      return false;
    }
    
    return true;
  };

  const handleDateRangeChange = (field, value) => {
    if (field === 'startDate') {
      setStartDate(value);
      if (validateDateRange(value, endDate)) {
        // Valid range
      }
    } else if (field === 'endDate') {
      setEndDate(value);
      if (validateDateRange(startDate, value)) {
        // Valid range
      }
    }
  };

  const getSummaryStats = () => {
    const total = filteredData.length;
    const present = filteredData.filter(r => r.status === 'present').length;
    const absent = filteredData.filter(r => r.status === 'absent').length;
    const partial = filteredData.filter(r => r.status === 'partial').length;
    const late = filteredData.filter(r => r.status === 'late').length;
    
    return { total, present, absent, partial, late };
  };

  const stats = getSummaryStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-primary-600" />
              Daily Attendance Report
            </h2>
            {reportGeneration && (
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  <span>Generation #{reportGeneration.totalGenerations}</span>
                </div>
                <div>
                  Generated: {moment(reportGeneration.generatedAt).format('MMM DD, YYYY HH:mm:ss')}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {/* Report Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="single"
                    checked={reportType === 'single'}
                    onChange={(e) => setReportType(e.target.value)}
                    className="mr-2"
                  />
                  Single Date
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="range"
                    checked={reportType === 'range'}
                    onChange={(e) => setReportType(e.target.value)}
                    className="mr-2"
                  />
                  Date Range (up to 1 year)
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Date Inputs */}
              <div className="flex items-end space-x-4">
                {reportType === 'single' ? (
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                      Select Date
                    </label>
                    <input
                      type="date"
                      id="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={moment().format('YYYY-MM-DD')}
                      min={moment().subtract(1, 'year').format('YYYY-MM-DD')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">
                        Start Date
                      </label>
                      <input
                        type="date"
                        id="start-date"
                        value={startDate}
                        onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                        max={moment().format('YYYY-MM-DD')}
                        min={moment().subtract(1, 'year').format('YYYY-MM-DD')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">
                        End Date
                      </label>
                      <input
                        type="date"
                        id="end-date"
                        value={endDate}
                        onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                        max={moment().format('YYYY-MM-DD')}
                        min={startDate}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      />
                    </div>
                  </>
                )}
                
                {/* Status Filter */}
                <div>
                  <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
                    Status Filter
                  </label>
                  <select
                    id="status-filter"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="all">All Status</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="partial">Partial</option>
                    <option value="late">Late</option>
                  </select>
                </div>
              </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={loadAttendanceReport}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              <button
                onClick={exportToCSV}
                disabled={filteredData.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Present</p>
              <p className="text-2xl font-bold text-gray-900">{stats.present}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Absent</p>
              <p className="text-2xl font-bold text-gray-900">{stats.absent}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Partial</p>
              <p className="text-2xl font-bold text-gray-900">{stats.partial}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-orange-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Late</p>
              <p className="text-2xl font-bold text-gray-900">{stats.late}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {reportType === 'single' 
              ? `Attendance Records - ${moment(selectedDate).format('MMMM Do, YYYY')}`
              : `Attendance Records - ${moment(startDate).format('MMM Do')} to ${moment(endDate).format('MMM Do, YYYY')}`
            }
          </h3>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-primary-600 animate-spin" />
            <span className="ml-2 text-gray-600">Loading attendance data...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No attendance records</h3>
            <p className="mt-1 text-sm text-gray-500">
              No attendance records found for the selected date and filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  {reportType === 'range' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((record, index) => (
                  <tr key={record.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {record.first_name?.charAt(0)}{record.last_name?.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {record.first_name} {record.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {record.employee_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.department}
                    </td>
                    {reportType === 'range' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {moment(record.date).format('MMM DD')}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(record.check_in_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(record.check_out_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatHours(record.total_hours)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(record.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default DailyAttendanceReport;