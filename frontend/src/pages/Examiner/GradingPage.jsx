import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import gradingApi from '../../api/gradingApi';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Alert from '../../components/ui/Alert';

const GradingPage = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  
  const [assignments, setAssignments] = useState([]);
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Form state for grading
  const [gradeForm, setGradeForm] = useState({
    score: '',
    comments: '',
    criteria_scores: {}
  });

  // Fetch examiner's assignments
  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await gradingApi.getMyAssignments();
      setAssignments(response.data || []);
      
      // If assignmentId is provided, find and set current assignment
      if (assignmentId) {
        const assignment = response.data?.find(a => a.assignment_id === parseInt(assignmentId));
        if (assignment) {
          setCurrentAssignment(assignment);
          // Initialize criteria scores if available
          if (assignment.grading_criteria) {
            const initialCriteria = {};
            assignment.grading_criteria.forEach(c => {
              initialCriteria[c.id] = '';
            });
            setGradeForm(prev => ({ ...prev, criteria_scores: initialCriteria }));
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách bài chấm');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Handle selecting an assignment to grade
  const handleSelectAssignment = (assignment) => {
    setCurrentAssignment(assignment);
    setGradeForm({
      score: '',
      comments: '',
      criteria_scores: {}
    });
    
    // Initialize criteria scores
    if (assignment.grading_criteria) {
      const initialCriteria = {};
      assignment.grading_criteria.forEach(c => {
        initialCriteria[c.id] = '';
      });
      setGradeForm(prev => ({ ...prev, criteria_scores: initialCriteria }));
    }
    
    navigate(`/examiner/grading/${assignment.assignment_id}`);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setGradeForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle criteria score changes
  const handleCriteriaChange = (criteriaId, value) => {
    setGradeForm(prev => ({
      ...prev,
      criteria_scores: {
        ...prev.criteria_scores,
        [criteriaId]: value
      }
    }));
    
    // Auto-calculate total score
    const newCriteriaScores = {
      ...gradeForm.criteria_scores,
      [criteriaId]: value
    };
    const totalScore = Object.values(newCriteriaScores)
      .filter(v => v !== '')
      .reduce((sum, v) => sum + parseFloat(v || 0), 0);
    
    setGradeForm(prev => ({ ...prev, score: totalScore.toFixed(2) }));
  };

  // Submit grade
  const handleSubmitGrade = async (e) => {
    e.preventDefault();
    
    if (!currentAssignment) return;
    
    // Validate score
    const score = parseFloat(gradeForm.score);
    if (isNaN(score) || score < 0 || score > currentAssignment.max_score) {
      setError(`Điểm phải từ 0 đến ${currentAssignment.max_score}`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      await gradingApi.submitGrade(currentAssignment.assignment_id, {
        score: score,
        comments: gradeForm.comments,
        criteria_scores: gradeForm.criteria_scores
      });
      
      setSuccess('Đã nộp điểm thành công!');
      
      // Refresh assignments
      await fetchAssignments();
      
      // Reset form
      setCurrentAssignment(null);
      setGradeForm({ score: '', comments: '', criteria_scores: {} });
      
      // Navigate back to list
      setTimeout(() => {
        navigate('/examiner/grading');
      }, 1500);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể nộp điểm');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter assignments by status
  const pendingAssignments = assignments.filter(a => a.status === 'pending' || a.status === 'in_progress');
  const completedAssignments = assignments.filter(a => a.status === 'completed');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Chấm Thi Tự Luận</h1>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assignment List */}
        <div className="lg:col-span-1">
          {/* Pending Assignments */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
              <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
              Chờ chấm ({pendingAssignments.length})
            </h2>
            
            {pendingAssignments.length === 0 ? (
              <p className="text-gray-500 text-sm">Không có bài thi cần chấm</p>
            ) : (
              <div className="space-y-2">
                {pendingAssignments.map(assignment => (
                  <div
                    key={assignment.assignment_id}
                    onClick={() => handleSelectAssignment(assignment)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      currentAssignment?.assignment_id === assignment.assignment_id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-800">
                      {assignment.exam_name || `Bài thi #${assignment.block_id}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      Block #{assignment.block_number} - SBD: {assignment.candidate_number}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Thứ tự chấm: {assignment.grader_order === 1 ? 'Người chấm 1' : assignment.grader_order === 2 ? 'Người chấm 2' : 'Người chấm 3'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Assignments */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              Đã chấm ({completedAssignments.length})
            </h2>
            
            {completedAssignments.length === 0 ? (
              <p className="text-gray-500 text-sm">Chưa chấm bài thi nào</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {completedAssignments.map(assignment => (
                  <div
                    key={assignment.assignment_id}
                    className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <div className="font-medium text-gray-700">
                      {assignment.exam_name || `Bài thi #${assignment.block_id}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      Block #{assignment.block_number} - Điểm: {assignment.submitted_score}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Grading Area */}
        <div className="lg:col-span-2">
          {!currentAssignment ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-500">Chọn một bài thi từ danh sách bên trái để bắt đầu chấm</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md">
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                      {currentAssignment.exam_name || `Bài thi #${currentAssignment.block_id}`}
                    </h2>
                    <p className="text-gray-500">
                      Block #{currentAssignment.block_number} | SBD: {currentAssignment.candidate_number}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    currentAssignment.grader_order === 1 
                      ? 'bg-blue-100 text-blue-800'
                      : currentAssignment.grader_order === 2
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-orange-100 text-orange-800'
                  }`}>
                    Người chấm {currentAssignment.grader_order}
                  </span>
                </div>
              </div>

              {/* Answer Image */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-medium text-gray-700 mb-3">Bài làm của thí sinh</h3>
                <div className="bg-gray-100 rounded-lg overflow-hidden">
                  {currentAssignment.image_url ? (
                    <img 
                      src={currentAssignment.image_url} 
                      alt="Bài làm"
                      className="w-full h-auto max-h-96 object-contain"
                    />
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p>Chưa có hình ảnh bài làm</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Grading Form */}
              <form onSubmit={handleSubmitGrade} className="p-4">
                {/* Criteria Scoring (if available) */}
                {currentAssignment.grading_criteria && currentAssignment.grading_criteria.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-700 mb-3">Tiêu chí chấm điểm</h3>
                    <div className="space-y-3">
                      {currentAssignment.grading_criteria.map(criteria => (
                        <div key={criteria.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-gray-700">{criteria.name}</div>
                            <div className="text-sm text-gray-500">{criteria.description}</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              step="0.25"
                              min="0"
                              max={criteria.max_score}
                              value={gradeForm.criteria_scores[criteria.id] || ''}
                              onChange={(e) => handleCriteriaChange(criteria.id, e.target.value)}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0"
                            />
                            <span className="text-gray-500">/ {criteria.max_score}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total Score */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tổng điểm <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      name="score"
                      step="0.25"
                      min="0"
                      max={currentAssignment.max_score || 10}
                      value={gradeForm.score}
                      onChange={handleInputChange}
                      required
                      className="w-32 px-4 py-2 text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                    <span className="text-gray-500 text-lg">/ {currentAssignment.max_score || 10}</span>
                  </div>
                </div>

                {/* Comments */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nhận xét (tùy chọn)
                  </label>
                  <textarea
                    name="comments"
                    value={gradeForm.comments}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Nhập nhận xét về bài làm..."
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentAssignment(null);
                      navigate('/examiner/grading');
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang nộp...
                      </>
                    ) : (
                      'Nộp điểm'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradingPage;
