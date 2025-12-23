import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userApi } from '../../api/userApi';
import statisticsApi from '../../api/statisticsApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';

// Simple Bar Chart Component
const SimpleBarChart = ({ data, dataKey, labelKey, color = 'bg-blue-500', title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        Chưa có dữ liệu
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d[dataKey] || 0), 1);

  return (
    <div className="p-4">
      {title && (
        <h4 className="mb-4 text-sm text-gray-700 font-semibold">
          {title}
        </h4>
      )}
      <div className="flex flex-col gap-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-20 text-xs text-gray-500 text-right flex-shrink-0">
              {item[labelKey]}
            </div>
            <div className="flex-1 h-6 bg-gray-200 rounded overflow-hidden">
              <div
                className={`h-full ${color} rounded transition-all duration-500 flex items-center justify-end pr-2`}
                style={{ width: `${(item[dataKey] / maxValue) * 100}%` }}
              >
                <span className="text-xs text-white font-medium">
                  {item[dataKey]}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Simple Line Chart Component for Daily Stats
const SimpleDailyChart = ({ data, title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        Chưa có dữ liệu
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.graded_count || 0), 1);
  const chartHeight = 200;

  return (
    <div className="p-4">
      {title && (
        <h4 className="mb-4 text-sm text-gray-700 font-semibold">
          {title}
        </h4>
      )}
      <div className="flex items-end gap-2" style={{ height: `${chartHeight}px` }}>
        {data.map((item, index) => {
          const height = (item.graded_count / maxValue) * (chartHeight - 40);
          const dateStr = new Date(item.date).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit' });
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-700 font-medium">
                {item.graded_count}
              </span>
              <div
                className={`w-full max-w-[40px] rounded-t transition-all duration-500 ${item.graded_count > 0 ? 'bg-blue-500' : 'bg-gray-200'}`}
                style={{ height: `${Math.max(height, 4)}px` }}
              />
              <span className="text-[10px] text-gray-500 text-center">
                {dateStr}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Score Distribution Component
const SimpleScoreDistribution = ({ data, title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        Chưa có dữ liệu phân bố điểm
      </div>
    );
  }

  const colorMap = {
    'A (9-10)': 'bg-emerald-500',
    'B (7-8.9)': 'bg-blue-500',
    'C (5-6.9)': 'bg-amber-500',
    'D (3-4.9)': 'bg-orange-500',
    'F (0-2.9)': 'bg-red-500'
  };

  const total = data.reduce((sum, item) => sum + (item.count || 0), 0);

  return (
    <div className="p-4">
      {title && (
        <h4 className="mb-4 text-sm text-gray-700 font-semibold">
          {title}
        </h4>
      )}
      <div className="flex flex-col gap-2">
        {data.map((item, index) => {
          const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
          const bgColor = colorMap[item.grade_range] || 'bg-gray-500';
          return (
            <div key={index} className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-sm ${bgColor}`} />
              <div className="w-20 text-sm text-gray-700">
                {item.grade_range}
              </div>
              <div className="flex-1 h-5 bg-gray-200 rounded overflow-hidden">
                <div
                  className={`h-full ${bgColor} rounded transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="w-20 text-xs text-gray-500 text-right">
                {item.count} ({percentage}%)
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-center text-sm text-gray-500">
        Tổng: {total} bài thi
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, isAdmin, isExaminer, isCandidate } = useAuth();
  const [statistics, setStatistics] = useState(null);
  const [gradingStats, setGradingStats] = useState(null);
  const [gradingByDay, setGradingByDay] = useState([]);
  const [avgScoreByExaminer, setAvgScoreByExaminer] = useState([]);
  const [scoreDistribution, setScoreDistribution] = useState([]);
  const [gradingProgressBySubject, setGradingProgressBySubject] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAdmin || isExaminer) {
      loadStatistics();
    } else {
      setLoading(false);
    }
  }, [isAdmin, isExaminer]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        userResponse,
        gradingResponse,
        gradingByDayResponse,
        avgScoreResponse,
        scoreDistResponse,
        progressBySubjectResponse
      ] = await Promise.all([
        userApi.getUserStatistics().catch(err => ({ data: null })),
        statisticsApi.getDashboardStats().catch(err => ({ data: null })),
        statisticsApi.getGradingByDay({ days: 7 }).catch(err => ({ data: { data: [] } })),
        statisticsApi.getAvgScoreByExaminer({ limit: 5 }).catch(err => ({ data: { data: [] } })),
        statisticsApi.getScoreDistributionOverall().catch(err => ({ data: { data: [] } })),
        statisticsApi.getGradingProgressBySubject().catch(err => ({ data: { data: [] } }))
      ]);

      setStatistics(userResponse.data);
      setGradingStats(gradingResponse.data?.data || gradingResponse.data);
      setGradingByDay(gradingByDayResponse.data?.data || []);
      setAvgScoreByExaminer(avgScoreResponse.data?.data || []);
      setScoreDistribution(scoreDistResponse.data?.data || []);
      setGradingProgressBySubject(progressBySubjectResponse.data?.data || []);

    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Lỗi khi tải thống kê: ' + (err.message || 'Lỗi server'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Error state
  if (error && (isAdmin || isExaminer)) {
    return (
      <div className="p-5 text-center">
        <div className="bg-red-100 text-red-600 p-4 rounded-lg border border-red-200">
          {error}
        </div>
        <button 
          onClick={loadStatistics}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        >
          Thử lại
        </button>
      </div>
    );
  }

  // =============================================
  // CANDIDATE DASHBOARD
  // =============================================
  if (isCandidate) {
    return (
      <div className="p-5 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🎓 Xin chào, {user?.full_name || 'Thí sinh'}!
          </h1>
          <p className="text-gray-500">
            Chào mừng bạn đến với hệ thống thi trực tuyến
          </p>
        </div>

        <div className="bg-sky-50 p-12 rounded-2xl border border-sky-200 text-center">
          <div className="text-7xl mb-5">🚧</div>
          <h2 className="text-2xl font-semibold text-sky-700 mb-4">
            Hệ thống đang được phát triển
          </h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Vui lòng quay lại sau!
          </p>
        </div>
      </div>
    );
  }

  // =============================================
  // EXAMINER DASHBOARD
  // =============================================
  if (isExaminer && !isAdmin) {
    return (
      <div className="p-5 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ✍️ Dashboard - Cán bộ chấm thi
          </h1>
          <p className="text-gray-500">
            Xin chào, {user?.full_name || 'Giám khảo'}! Đây là tổng quan công việc chấm thi của bạn.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-amber-100 p-6 rounded-xl text-center border border-amber-300">
            <div className="text-4xl font-bold text-amber-600">
              {gradingStats?.my_pending || 0}
            </div>
            <div className="text-sm text-amber-800 mt-1">🕐 Bài chờ chấm</div>
          </div>

          <div className="bg-blue-100 p-6 rounded-xl text-center border border-blue-300">
            <div className="text-4xl font-bold text-blue-600">
              {gradingStats?.my_in_progress || 0}
            </div>
            <div className="text-sm text-blue-800 mt-1">⏳ Đang chấm</div>
          </div>

          <div className="bg-emerald-100 p-6 rounded-xl text-center border border-emerald-300">
            <div className="text-4xl font-bold text-emerald-600">
              {gradingStats?.my_completed || 0}
            </div>
            <div className="text-sm text-emerald-800 mt-1">✅ Đã hoàn thành</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Thao tác nhanh</h3>
          <div className="flex gap-3 flex-wrap">
            <Link
              to="/examiner/grading"
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition flex items-center gap-2"
            >
              ✍️ Chấm bài tự luận
            </Link>
          </div>
        </div>

        {/* Guide */}
        <div className="bg-sky-50 p-6 rounded-xl border border-sky-200">
          <h3 className="text-base font-semibold text-sky-700 mb-3">📋 Hướng dẫn chấm bài</h3>
          <ul className="list-disc pl-5 text-gray-700 space-y-2">
            <li>Nhấn "Chấm bài tự luận" để xem danh sách bài được phân công</li>
            <li>Chấm điểm theo thang điểm và đáp án mẫu có sẵn</li>
            <li>Thêm nhận xét chi tiết cho từng câu hỏi</li>
            <li>Hoàn thành chấm tất cả bài được giao đúng hạn</li>
          </ul>
        </div>
      </div>
    );
  }

  // =============================================
  // ADMIN DASHBOARD
  // =============================================
  const totalPending = gradingStats?.pending_count || gradingStats?.grading?.pending_assignments || 0;
  const totalInProgress = gradingStats?.in_progress_count || gradingStats?.grading?.in_progress || 0;
  const totalCompleted = gradingStats?.graded_count || gradingStats?.grading?.completed || 0;
  const totalAssignments = gradingStats?.grading?.total_assignments || (totalPending + totalInProgress + totalCompleted);
  const gradingProgress = totalAssignments > 0 ? Math.round((totalCompleted / totalAssignments) * 100) : 0;

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'from-emerald-500 to-emerald-600';
    if (progress >= 50) return 'from-amber-500 to-amber-600';
    return 'from-red-500 to-red-600';
  };

  const getProgressTextColor = (progress) => {
    if (progress >= 80) return 'text-emerald-500';
    if (progress >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="p-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          📊 Dashboard - Tổng quan chấm thi
        </h1>
        <p className="text-gray-500">
          Xin chào, {user?.full_name || 'Admin'}! Đây là tổng quan công việc chấm thi.
        </p>
      </div>

      {/* Section 1: Overview */}
      <div className="mb-6 bg-sky-50 p-6 rounded-xl border border-sky-200">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-semibold text-sky-700">📋 Tổng quan khối bài thi</h2>
          <Link to="/admin/statistics" className="text-sm text-sky-700 font-medium hover:underline">
            Xem chi tiết →
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl text-center shadow-sm border-l-4 border-amber-500">
            <div className="text-3xl font-bold text-amber-500">{totalPending}</div>
            <div className="text-sm text-gray-500 mt-1">🕐 Chờ chấm</div>
          </div>

          <div className="bg-white p-5 rounded-xl text-center shadow-sm border-l-4 border-blue-500">
            <div className="text-3xl font-bold text-blue-500">{totalInProgress}</div>
            <div className="text-sm text-gray-500 mt-1">⏳ Đang chấm</div>
          </div>

          <div className="bg-white p-5 rounded-xl text-center shadow-sm border-l-4 border-emerald-500">
            <div className="text-3xl font-bold text-emerald-500">{totalCompleted}</div>
            <div className="text-sm text-gray-500 mt-1">✅ Đã hoàn thành</div>
          </div>

          <div className="bg-white p-5 rounded-xl text-center shadow-sm border-l-4 border-violet-500">
            <div className="text-3xl font-bold text-violet-500">{totalAssignments}</div>
            <div className="text-sm text-gray-500 mt-1">📊 Tổng số khối</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white p-5 rounded-xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-700">📈 Mức độ hoàn thành công việc chấm thi</h3>
            <span className={`text-2xl font-bold ${getProgressTextColor(gradingProgress)}`}>
              {gradingProgress}%
            </span>
          </div>
          <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${getProgressColor(gradingProgress)} rounded-full transition-all duration-500`}
              style={{ width: `${gradingProgress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>0%</span>
            <span>Đã chấm: {totalCompleted}/{totalAssignments} khối</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Section 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            📅 Số khối bài đã chấm theo ngày (7 ngày gần nhất)
          </h3>
          <SimpleDailyChart data={gradingByDay} />
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            🎯 Phân bố điểm trung bình các bài thi
          </h3>
          <SimpleScoreDistribution data={scoreDistribution} />
        </div>
      </div>

      {/* Section 3: Examiner & Subject Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Examiners */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            👨‍🏫 Điểm trung bình theo giám khảo (Top 5)
          </h3>
          {avgScoreByExaminer.length > 0 ? (
            <div className="flex flex-col gap-3">
              {avgScoreByExaminer.map((examiner, index) => {
                const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-pink-500'];
                const avgScore = parseFloat(examiner.avg_score || 0);
                const scoreColor = avgScore >= 7 ? 'text-emerald-500' : avgScore >= 5 ? 'text-amber-500' : 'text-red-500';
                
                return (
                  <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg gap-3">
                    <div className={`w-8 h-8 rounded-full ${colors[index]} text-white flex items-center justify-center font-bold text-sm`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">{examiner.examiner_name}</div>
                      <div className="text-xs text-gray-500">{examiner.total_graded} bài đã chấm</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-lg ${scoreColor}`}>{avgScore.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">Điểm TB</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">Chưa có dữ liệu giám khảo</div>
          )}
        </div>

        {/* Subject Progress */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            📚 Tiến độ chấm theo môn thi
          </h3>
          {gradingProgressBySubject.length > 0 ? (
            <div className="flex flex-col gap-4">
              {gradingProgressBySubject.map((subject, index) => {
                const progress = parseFloat(subject.progress_percent) || 0;
                const barColor = progress >= 80 ? 'bg-emerald-500' : progress >= 50 ? 'bg-blue-500' : 'bg-amber-500';
                
                return (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{subject.subject_name}</span>
                      <span className="text-sm text-gray-500">
                        {subject.completed || 0}/{subject.total_assignments || 0} ({progress}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">Chưa có dữ liệu tiến độ theo môn</div>
          )}
        </div>
      </div>

      {/* Section 4: Quick Actions */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">⚡ Thao tác nhanh</h3>
        <div className="flex gap-3 flex-wrap">
          <Link
            to="/admin/grading/assignments"
            className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition flex items-center gap-2"
          >
            📋 Quản lý phân công
          </Link>
          <Link
            to="/admin/grading/comparison"
            className="px-5 py-2.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition flex items-center gap-2"
          >
            🔍 So sánh kết quả chấm
          </Link>
          <Link
            to="/admin/statistics"
            className="px-5 py-2.5 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition flex items-center gap-2"
          >
            📊 Báo cáo thống kê
          </Link>
          <Link
            to="/admin/exam-essays"
            className="px-5 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition flex items-center gap-2"
          >
            📝 Quản lý đề thi
          </Link>
        </div>
      </div>

      {/* Section 5: User Stats */}
      {statistics && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">👥 Thống kê người dùng hệ thống</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-sky-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-sky-700">{statistics.total_users || 0}</div>
              <div className="text-sm text-gray-500">Tổng người dùng</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.active_users || 0}</div>
              <div className="text-sm text-gray-500">Đang hoạt động</div>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-amber-600">{gradingStats?.users?.examiner_count || 0}</div>
              <div className="text-sm text-gray-500">Giám khảo</div>
            </div>
            <div className="p-4 bg-pink-50 rounded-lg text-center">
              <div className="text-2xl font-bold text-pink-600">{gradingStats?.users?.candidate_count || 0}</div>
              <div className="text-sm text-gray-500">Thí sinh</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
