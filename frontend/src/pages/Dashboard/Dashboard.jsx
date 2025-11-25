import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { userApi } from '../../api/userApi';
import statisticsApi from '../../api/statisticsApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';

const Dashboard = () => {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState(null);
  const [gradingStats, setGradingStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const [userResponse, gradingResponse] = await Promise.all([
        userApi.getUserStatistics(),
        statisticsApi.getDashboardStats().catch(() => ({ data: null }))
      ]);
      setStatistics(userResponse.data);
      setGradingStats(gradingResponse.data);
      setError(null);
    } catch (err) {
      setError('Lỗi khi tải thống kê: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #fecaca'
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: 'bold', 
          margin: '0 0 8px 0',
          color: '#111827'
        }}>
          Dashboard
        </h1>
        <p style={{ 
          color: '#6b7280', 
          margin: 0,
          fontSize: '16px'
        }}>
          Tổng quan hệ thống quản lý thi và chấm thi
        </p>
      </div>

      {/* Grading Statistics Section - NEW */}
      {gradingStats && (
        <div style={{
          marginBottom: '32px',
          backgroundColor: '#f0f9ff',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #bae6fd'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#0369a1',
              margin: 0
            }}>
              📊 Tiến độ chấm thi tự luận
            </h2>
            <Link 
              to="/admin/statistics"
              style={{
                color: '#0369a1',
                fontSize: '14px',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Xem chi tiết →
            </Link>
          </div>

          {/* Grading Progress Bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#0369a1' }}>Tiến độ tổng thể</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1' }}>
                {gradingStats.grading_progress || 0}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '12px',
              backgroundColor: '#bae6fd',
              borderRadius: '9999px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${gradingStats.grading_progress || 0}%`,
                height: '100%',
                backgroundColor: '#0369a1',
                borderRadius: '9999px',
                transition: 'width 0.5s ease'
              }} />
            </div>
          </div>

          {/* Grading Stats Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                {gradingStats.pending_count || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Chờ chấm</div>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                {gradingStats.in_progress_count || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Đang chấm</div>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                {gradingStats.graded_count || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Đã hoàn thành</div>
            </div>
            <div style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '8px',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
                {gradingStats.need_review_count || 0}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Cần xét duyệt</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              to="/admin/grading/assignments"
              style={{
                padding: '8px 16px',
                backgroundColor: '#0369a1',
                color: 'white',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Quản lý phân công
            </Link>
            <Link
              to="/admin/grading/comparison"
              style={{
                padding: '8px 16px',
                backgroundColor: 'white',
                color: '#0369a1',
                borderRadius: '6px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
                border: '1px solid #0369a1'
              }}
            >
              So sánh kết quả chấm
            </Link>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Total Users */}
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0 0 8px 0',
                fontWeight: '500'
              }}>
                Tổng số người dùng
              </p>
              <p style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#111827',
                margin: 0
              }}>
                {statistics?.total_users || 0}
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#dbeafe',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '24px', height: '24px', color: '#3b82f6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0 0 8px 0',
                fontWeight: '500'
              }}>
                Người dùng hoạt động
              </p>
              <p style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#059669',
                margin: 0
              }}>
                {statistics?.active_users || 0}
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#dcfce7',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '24px', height: '24px', color: '#16a34a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Inactive Users */}
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0 0 8px 0',
                fontWeight: '500'
              }}>
                Người dùng không hoạt động
              </p>
              <p style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#dc2626',
                margin: 0
              }}>
                {statistics?.inactive_users || 0}
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#fee2e2',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '24px', height: '24px', color: '#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Role Statistics */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        marginBottom: '32px'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 20px 0'
        }}>
          Thống kê theo vai trò
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {statistics?.role_statistics?.map((role, index) => (
            <div key={index} style={{
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                margin: '0 0 8px 0'
              }}>
                {role.role_description}
              </h3>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0 0 4px 0'
              }}>
                Tổng: <span style={{ fontWeight: '500', color: '#111827' }}>{role.count}</span>
              </p>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0
              }}>
                Hoạt động: <span style={{ fontWeight: '500', color: '#059669' }}>{role.active_count}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Logins */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#111827',
          margin: '0 0 20px 0'
        }}>
          Đăng nhập gần đây
        </h2>
        {statistics?.recent_logins?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {statistics.recent_logins.map((login, index) => (
              <div key={index} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#111827',
                    margin: '0 0 4px 0'
                  }}>
                    {login.full_name}
                  </p>
                  <p style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    margin: 0
                  }}>
                    {login.username}
                  </p>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  {new Date(login.last_login).toLocaleString('vi-VN')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{
            color: '#6b7280',
            fontSize: '14px',
            textAlign: 'center',
            margin: 0
          }}>
            Không có dữ liệu đăng nhập gần đây
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;