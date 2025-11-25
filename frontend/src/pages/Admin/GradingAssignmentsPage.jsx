import React, { useState, useEffect } from 'react';
import gradingApi from '../../api/gradingApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Alert from '../../components/ui/Alert';

/**
 * GRADING ASSIGNMENTS PAGE
 * Trang quản lý phân công chấm thi tự luận cho Admin
 */
const GradingAssignmentsPage = () => {
  const [assignments, setAssignments] = useState([]);
  const [pendingBlocks, setPendingBlocks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  
  // Auto-assign modal
  const [showAutoAssign, setShowAutoAssign] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState([]);
  const [autoAssignOptions, setAutoAssignOptions] = useState({
    priority: 'MEDIUM',
    examiners_per_block: 2
  });

  useEffect(() => {
    loadData();
  }, [page, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [assignmentsRes, blocksRes, statsRes] = await Promise.all([
        gradingApi.getAssignments({ page, limit: 20, status: statusFilter || undefined }),
        gradingApi.getPendingBlocks({ limit: 100 }),
        gradingApi.getGradingStats()
      ]);

      setAssignments(assignmentsRes.data.data || []);
      setPagination(assignmentsRes.data.pagination);
      setPendingBlocks(blocksRes.data.data || []);
      setStats(statsRes.data.data);
      setError(null);
    } catch (err) {
      setError('Lỗi khi tải dữ liệu: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAutoAssign = async () => {
    if (selectedBlocks.length === 0) {
      setError('Vui lòng chọn ít nhất 1 block để phân công');
      return;
    }

    try {
      setLoading(true);
      const result = await gradingApi.autoAssign({
        block_codes: selectedBlocks,
        ...autoAssignOptions
      });

      if (result.data.success) {
        setSuccess(`Phân công thành công ${result.data.data.success.length} block`);
        setSelectedBlocks([]);
        setShowAutoAssign(false);
        loadData();
      } else {
        setError(result.data.message);
      }
    } catch (err) {
      setError('Lỗi khi phân công: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa phân công này?')) return;

    try {
      await gradingApi.deleteAssignment(id);
      setSuccess('Xóa phân công thành công');
      loadData();
    } catch (err) {
      setError('Lỗi khi xóa: ' + (err.response?.data?.message || err.message));
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      ASSIGNED: { bg: '#dbeafe', color: '#1d4ed8', text: 'Đã phân công' },
      IN_PROGRESS: { bg: '#fef3c7', color: '#d97706', text: 'Đang chấm' },
      COMPLETED: { bg: '#dcfce7', color: '#16a34a', text: 'Hoàn thành' },
      OVERDUE: { bg: '#fee2e2', color: '#dc2626', text: 'Quá hạn' }
    };
    const s = styles[status] || { bg: '#f3f4f6', color: '#6b7280', text: status };
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: '500',
        backgroundColor: s.bg,
        color: s.color
      }}>
        {s.text}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      HIGH: { bg: '#fee2e2', color: '#dc2626', text: 'Cao' },
      MEDIUM: { bg: '#fef3c7', color: '#d97706', text: 'Trung bình' },
      LOW: { bg: '#dcfce7', color: '#16a34a', text: 'Thấp' }
    };
    const s = styles[priority] || styles.MEDIUM;
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '500',
        backgroundColor: s.bg,
        color: s.color
      }}>
        {s.text}
      </span>
    );
  };

  if (loading && assignments.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#111827' }}>
          Phân công chấm thi
        </h1>
        <p style={{ color: '#6b7280', margin: '8px 0 0' }}>
          Quản lý phân công và theo dõi tiến độ chấm thi tự luận
        </p>
      </div>

      {/* Alerts */}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Stats Cards */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <StatCard title="Tổng phân công" value={stats.assignments?.total || 0} color="#3b82f6" />
          <StatCard title="Chờ chấm" value={stats.assignments?.assigned || 0} color="#f59e0b" />
          <StatCard title="Đang chấm" value={stats.assignments?.in_progress || 0} color="#8b5cf6" />
          <StatCard title="Hoàn thành" value={stats.assignments?.completed || 0} color="#10b981" />
          <StatCard title="Block chờ" value={pendingBlocks.length} color="#ef4444" />
        </div>
      )}

      {/* Pending Blocks Section */}
      {pendingBlocks.length > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
              Block chờ phân công ({pendingBlocks.length})
            </h2>
            <button
              onClick={() => setShowAutoAssign(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Phân công tự động
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                    <input
                      type="checkbox"
                      checked={selectedBlocks.length === pendingBlocks.length && pendingBlocks.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBlocks(pendingBlocks.map(b => b.block_code));
                        } else {
                          setSelectedBlocks([]);
                        }
                      }}
                    />
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Mã Block</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Môn thi</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Đề thi</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Câu</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Điểm max</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Đã phân công</th>
                </tr>
              </thead>
              <tbody>
                {pendingBlocks.slice(0, 10).map((block) => (
                  <tr key={block.block_code} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px' }}>
                      <input
                        type="checkbox"
                        checked={selectedBlocks.includes(block.block_code)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBlocks([...selectedBlocks, block.block_code]);
                          } else {
                            setSelectedBlocks(selectedBlocks.filter(b => b !== block.block_code));
                          }
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{block.block_code}</td>
                    <td style={{ padding: '12px' }}>{block.subject_name}</td>
                    <td style={{ padding: '12px' }}>{block.exam_title || block.exam_code}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{block.question_number}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{block.max_score}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: block.assigned_count >= 2 ? '#dcfce7' : '#fef3c7',
                        color: block.assigned_count >= 2 ? '#16a34a' : '#d97706'
                      }}>
                        {block.assigned_count}/2
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assignments List */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            Danh sách phân công
          </h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '14px'
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ASSIGNED">Đã phân công</option>
            <option value="IN_PROGRESS">Đang chấm</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="OVERDUE">Quá hạn</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Block</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Cán bộ chấm</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Vòng</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Ưu tiên</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Trạng thái</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Phân công lúc</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.assignment_id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '500' }}>{assignment.block_code}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {assignment.subject_name} - Câu {assignment.question_number}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '500' }}>{assignment.examiner_name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{assignment.examiner_code}</div>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      backgroundColor: '#e0e7ff',
                      color: '#4338ca'
                    }}>
                      Vòng {assignment.round_number}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {getPriorityBadge(assignment.priority)}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {getStatusBadge(assignment.status)}
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: '#6b7280' }}>
                    {new Date(assignment.assigned_at).toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDeleteAssignment(assignment.assignment_id)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      disabled={assignment.status === 'COMPLETED'}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
              {assignments.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    Chưa có phân công nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: page === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Trước
            </button>
            <span style={{ padding: '8px 12px' }}>
              Trang {page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: page === pagination.pages ? 'not-allowed' : 'pointer'
              }}
            >
              Sau
            </button>
          </div>
        )}
      </div>

      {/* Auto Assign Modal */}
      {showAutoAssign && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            maxWidth: '90vw'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600' }}>
              Phân công tự động
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#6b7280' }}>
                Đã chọn: <strong>{selectedBlocks.length}</strong> block
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Mức ưu tiên
              </label>
              <select
                value={autoAssignOptions.priority}
                onChange={(e) => setAutoAssignOptions({ ...autoAssignOptions, priority: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Số cán bộ chấm/block
              </label>
              <select
                value={autoAssignOptions.examiners_per_block}
                onChange={(e) => setAutoAssignOptions({ ...autoAssignOptions, examiners_per_block: parseInt(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value={2}>2 (mặc định)</option>
                <option value={3}>3</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAutoAssign(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={handleAutoAssign}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Đang xử lý...' : 'Phân công'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, color }) => (
  <div style={{
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb'
  }}>
    <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 8px' }}>{title}</p>
    <p style={{ fontSize: '28px', fontWeight: 'bold', color, margin: 0 }}>{value}</p>
  </div>
);

export default GradingAssignmentsPage;
