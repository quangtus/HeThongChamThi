import React, { useState, useEffect } from 'react';
import gradingApi from '../../api/gradingApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Alert from '../../components/ui/Alert';

/**
 * GRADING COMPARISON PAGE
 * Trang đối sánh và phê duyệt kết quả chấm thi
 */
const GradingComparisonPage = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      setLoading(true);
      const res = await gradingApi.getResults({ limit: 100, is_final: false });
      setResults(res.data.data || []);
      setError(null);
    } catch (err) {
      setError('Lỗi khi tải dữ liệu: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async (blockCode) => {
    try {
      setLoading(true);
      const res = await gradingApi.compareResults(blockCode);
      setComparison(res.data.data);
      setSelectedBlock(blockCode);
    } catch (err) {
      setError('Lỗi khi so sánh: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedBlock || !comparison) return;

    try {
      setLoading(true);
      await gradingApi.approveScore(selectedBlock, {
        final_score: comparison.final_score
      });
      setSuccess('Phê duyệt điểm thành công');
      setComparison(null);
      setSelectedBlock(null);
      loadResults();
    } catch (err) {
      setError('Lỗi khi phê duyệt: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAssignThirdRound = async () => {
    if (!selectedBlock) return;

    try {
      setLoading(true);
      await gradingApi.assignThirdRound(selectedBlock, { priority: 'HIGH' });
      setSuccess('Đã phân công chấm vòng 3');
      setComparison(null);
      setSelectedBlock(null);
      loadResults();
    } catch (err) {
      setError('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      MATCHED: { bg: '#dcfce7', color: '#16a34a', text: 'Trùng khớp' },
      NEEDS_THIRD_ROUND: { bg: '#fef3c7', color: '#d97706', text: 'Cần vòng 3' },
      RESOLVED_BY_THIRD: { bg: '#dbeafe', color: '#1d4ed8', text: 'Đã có vòng 3' },
      PENDING: { bg: '#f3f4f6', color: '#6b7280', text: 'Chờ chấm' }
    };
    return styles[status] || styles.PENDING;
  };

  // Group results by block_code
  const groupedResults = results.reduce((acc, result) => {
    const key = result.block_code;
    if (!acc[key]) {
      acc[key] = {
        block_code: key,
        exam_title: result.exam_title,
        subject_name: result.subject_name,
        question_number: result.question_number,
        max_score: result.max_score,
        results: []
      };
    }
    acc[key].results.push(result);
    return acc;
  }, {});

  const blocks = Object.values(groupedResults).filter(b => b.results.length >= 1);

  if (loading && results.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#111827' }}>
          Đối sánh kết quả chấm
        </h1>
        <p style={{ color: '#6b7280', margin: '8px 0 0' }}>
          So sánh và phê duyệt kết quả chấm giữa các cán bộ
        </p>
      </div>

      {/* Alerts */}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px' }}>
        {/* Blocks List */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px' }}>
            Danh sách block đã chấm
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Block</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Môn</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Số vòng</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Điểm</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block) => (
                  <tr 
                    key={block.block_code} 
                    style={{ 
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: selectedBlock === block.block_code ? '#eff6ff' : 'white'
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '500' }}>{block.block_code}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Câu {block.question_number}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>{block.subject_name}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        backgroundColor: '#e0e7ff',
                        color: '#4338ca'
                      }}>
                        {block.results.length} vòng
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {block.results.map((r, i) => (
                        <span key={i} style={{ marginRight: '8px' }}>
                          {r.score}/{block.max_score}
                        </span>
                      ))}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleCompare(block.block_code)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        So sánh
                      </button>
                    </td>
                  </tr>
                ))}
                {blocks.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                      Chưa có kết quả chấm nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Comparison Panel */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e5e7eb',
          height: 'fit-content'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px' }}>
            Kết quả đối sánh
          </h2>

          {comparison ? (
            <div>
              {/* Status */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: getStatusStyle(comparison.status).bg,
                  color: getStatusStyle(comparison.status).color
                }}>
                  {getStatusStyle(comparison.status).text}
                </span>
              </div>

              {/* Message */}
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
                {comparison.message}
              </p>

              {/* Scores from each round */}
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                  Điểm từng vòng:
                </h3>
                {comparison.results?.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <span>Vòng {r.round_number} - {r.examiner_name}</span>
                    <span style={{ fontWeight: '600' }}>{r.score}/{comparison.max_score}</span>
                  </div>
                ))}
              </div>

              {/* Difference */}
              {comparison.score_difference !== undefined && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    Chênh lệch: <strong style={{
                      color: comparison.score_difference > 1 ? '#dc2626' : '#16a34a'
                    }}>
                      {comparison.score_difference.toFixed(2)} điểm
                    </strong>
                  </p>
                </div>
              )}

              {/* Final Score */}
              {comparison.final_score !== null && (
                <div style={{
                  padding: '16px',
                  backgroundColor: '#dcfce7',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px' }}>
                    Điểm cuối cùng
                  </p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', margin: 0 }}>
                    {comparison.final_score}/{comparison.max_score}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                {comparison.status === 'NEEDS_THIRD_ROUND' && (
                  <button
                    onClick={handleAssignThirdRound}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Phân công vòng 3
                  </button>
                )}
                {(comparison.status === 'MATCHED' || comparison.status === 'RESOLVED_BY_THIRD') && (
                  <button
                    onClick={handleApprove}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '500'
                    }}
                  >
                    Phê duyệt điểm
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
              <svg style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: '#d1d5db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>Chọn một block để xem kết quả đối sánh</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradingComparisonPage;
