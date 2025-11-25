import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import statisticsApi from '../../api/statisticsApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Alert from '../../components/ui/Alert';

const StatisticsPage = () => {
  const [dashboardStats, setDashboardStats] = useState(null);
  const [gradingStats, setGradingStats] = useState(null);
  const [examStats, setExamStats] = useState([]);
  const [examinerPerformance, setExaminerPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAllStats();
  }, []);

  const fetchAllStats = async () => {
    try {
      setLoading(true);
      const [dashboardRes, gradingRes, examRes, performanceRes] = await Promise.all([
        statisticsApi.getDashboardStats(),
        statisticsApi.getGradingStats(),
        statisticsApi.getExamStats(),
        statisticsApi.getExaminerPerformance()
      ]);

      setDashboardStats(dashboardRes.data);
      setGradingStats(gradingRes.data);
      setExamStats(examRes.data || []);
      setExaminerPerformance(performanceRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      setExporting(true);
      const response = await statisticsApi.exportReport(format);
      
      // Create download link
      const blob = new Blob([response.data], { 
        type: format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bao-cao-cham-thi.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Không thể xuất báo cáo');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Báo Cáo & Thống Kê</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Xuất CSV
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={exporting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            Xuất Excel
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Tổng quan' },
            { id: 'grading', label: 'Tiến độ chấm thi' },
            { id: 'exams', label: 'Theo kỳ thi' },
            { id: 'examiners', label: 'Theo cán bộ chấm' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && dashboardStats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Tổng kỳ thi"
              value={dashboardStats.total_exams || 0}
              icon="📋"
              color="blue"
            />
            <StatCard
              title="Thí sinh"
              value={dashboardStats.total_candidates || 0}
              icon="👥"
              color="green"
            />
            <StatCard
              title="Cán bộ chấm"
              value={dashboardStats.total_examiners || 0}
              icon="✍️"
              color="purple"
            />
            <StatCard
              title="Bài đã chấm"
              value={dashboardStats.graded_count || 0}
              icon="✅"
              color="orange"
            />
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grading Progress */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Tiến độ chấm thi</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Tổng tiến độ</span>
                    <span className="font-medium">{dashboardStats.grading_progress || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 rounded-full h-3 transition-all duration-500"
                      style={{ width: `${dashboardStats.grading_progress || 0}%` }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{dashboardStats.pending_count || 0}</div>
                    <div className="text-sm text-gray-500">Chờ chấm</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{dashboardStats.in_progress_count || 0}</div>
                    <div className="text-sm text-gray-500">Đang chấm</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{dashboardStats.graded_count || 0}</div>
                    <div className="text-sm text-gray-500">Hoàn thành</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Hoạt động gần đây</h3>
              {dashboardStats.recent_activities && dashboardStats.recent_activities.length > 0 ? (
                <div className="space-y-3">
                  {dashboardStats.recent_activities.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{activity.description}</p>
                        <p className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleString('vi-VN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Chưa có hoạt động nào</p>
              )}
            </div>
          </div>

          {/* Score Distribution */}
          {dashboardStats.score_distribution && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Phân bổ điểm</h3>
              <div className="flex items-end justify-between h-48 px-4">
                {Object.entries(dashboardStats.score_distribution).map(([range, count]) => {
                  const maxCount = Math.max(...Object.values(dashboardStats.score_distribution));
                  const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={range} className="flex flex-col items-center">
                      <div className="text-sm font-medium text-gray-600 mb-1">{count}</div>
                      <div
                        className="w-12 bg-blue-500 rounded-t transition-all duration-500"
                        style={{ height: `${height}%`, minHeight: count > 0 ? '20px' : '4px' }}
                      />
                      <div className="text-xs text-gray-500 mt-2">{range}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grading Tab */}
      {activeTab === 'grading' && gradingStats && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Tổng số block"
              value={gradingStats.total_blocks || 0}
              icon="📦"
              color="blue"
            />
            <StatCard
              title="Cần chấm lại"
              value={gradingStats.need_third_grader || 0}
              icon="⚠️"
              color="yellow"
            />
            <StatCard
              title="Hoàn thành"
              value={gradingStats.completed_blocks || 0}
              icon="✅"
              color="green"
            />
          </div>

          {/* Grading Details Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Chi tiết tiến độ chấm</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kỳ thi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng block</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đã chấm 1 lần</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đã chấm 2 lần</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cần chấm 3</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoàn thành</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiến độ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gradingStats.by_exam?.map((exam, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exam.exam_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exam.total_blocks}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exam.graded_once}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exam.graded_twice}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{exam.need_third}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{exam.completed}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-green-500 rounded-full h-2"
                              style={{ width: `${exam.progress || 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{exam.progress || 0}%</span>
                        </div>
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500">Chưa có dữ liệu</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Exams Tab */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          {examStats.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              Chưa có dữ liệu kỳ thi
            </div>
          ) : (
            examStats.map((exam, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">{exam.exam_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      exam.status === 'completed' ? 'bg-green-100 text-green-800' :
                      exam.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {exam.status === 'completed' ? 'Hoàn thành' : 
                       exam.status === 'in_progress' ? 'Đang diễn ra' : 'Chưa bắt đầu'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{exam.total_candidates}</div>
                      <div className="text-sm text-gray-500">Thí sinh</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{exam.total_examiners}</div>
                      <div className="text-sm text-gray-500">Cán bộ chấm</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{exam.avg_score?.toFixed(2) || 'N/A'}</div>
                      <div className="text-sm text-gray-500">Điểm TB</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{exam.pass_rate?.toFixed(1) || 0}%</div>
                      <div className="text-sm text-gray-500">Tỷ lệ đạt</div>
                    </div>
                  </div>
                  
                  <Link 
                    to={`/admin/statistics/exam/${exam.exam_id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Xem chi tiết →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Examiners Tab */}
      {activeTab === 'examiners' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Hiệu suất cán bộ chấm thi</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cán bộ chấm</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số bài được giao</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đã chấm</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đang chấm</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Điểm TB cho</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Độ lệch TB</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoàn thành</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {examinerPerformance.length > 0 ? (
                  examinerPerformance.map((examiner, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium mr-3">
                            {examiner.name?.charAt(0)?.toUpperCase() || 'E'}
                          </div>
                          <div className="text-sm font-medium text-gray-900">{examiner.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{examiner.assigned_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{examiner.completed_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{examiner.in_progress_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{examiner.avg_score_given?.toFixed(2) || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{examiner.avg_deviation?.toFixed(2) || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-blue-500 rounded-full h-2"
                              style={{ width: `${examiner.completion_rate || 0}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{examiner.completion_rate?.toFixed(0) || 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">Chưa có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatisticsPage;
