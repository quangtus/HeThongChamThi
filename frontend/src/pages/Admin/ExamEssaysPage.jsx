import React, { useState, useEffect } from 'react';
import { examEssayApi, subjectApi } from '../../api/adminApi';
import uploadApi from '../../api/upload';
import Alert from '../../components/ui/Alert';
import { validateExamEssayForm, validateEssayQuestionForm, prettyJSON, safeJSONParse } from '../../utils/formValidation';
import '../../styles/admin.css';
import '../../styles/admin.tw.css';

const ExamEssaysPage = () => {
  // State quản lý
  const [activeTab, setActiveTab] = useState('exams'); // 'exams' hoặc 'questions'
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: 'error', message: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [examFormData, setExamFormData] = useState({
    exam_code: '',
    subject_id: '',
    duration: '',
    total_score: '',
    description: '',
    is_active: true
  });

  const [questionFormData, setQuestionFormData] = useState({
    question_number: '',
    question_text: '',
    max_score: '',
    grading_criteria: '',
    sample_answer: '',
    estimated_time: ''
  });
  const createEmptyCriterion = () => ({ text: '', attachmentUrl: '' });
  const [criteriaList, setCriteriaList] = useState([createEmptyCriterion()]);
  const [criteriaNotes, setCriteriaNotes] = useState('');
  const [criteriaUploading, setCriteriaUploading] = useState({});
  const questionsTotalScore = React.useMemo(() => {
    return questions.reduce((sum, q) => sum + (parseFloat(q.max_score) || 0), 0);
  }, [questions]);
  const totalScoreDifference = selectedExam
    ? Number(selectedExam.total_score || 0) - questionsTotalScore
    : 0;

  // Debounce search term - chỉ gọi API sau khi người dùng ngừng gõ 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset về trang 1 khi tìm kiếm
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

useEffect(() => {
  if (activeTab === 'exams') {
    loadExams();
  }
}, [activeTab, currentPage, debouncedSearchTerm, selectedSubject]);

useEffect(() => {
  if (activeTab === 'exams' && subjects.length === 0) {
    loadSubjects();
  }
}, [activeTab, subjects.length]);

  useEffect(() => {
    if (selectedExam) {
      loadQuestions(selectedExam.essay_id);
    }
  }, [selectedExam]);

  const handleCriterionChange = (index, field, value) => {
    setCriteriaList(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddCriterion = () => {
    setCriteriaList(prev => [...prev, createEmptyCriterion()]);
  };

  const handleRemoveCriterion = (index) => {
    setCriteriaList(prev => {
      if (prev.length === 1) {
        return [createEmptyCriterion()];
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleAttachmentUpload = async(index, file) => {
    if (!file) return;
    setCriteriaUploading(prev => ({ ...prev, [index]: true }));
    try {
      const response = await uploadApi.uploadCriteriaImage(file, {
        questionNo: questionFormData.question_number || index + 1,
        criterionNo: index + 1
      });
      if (!response?.success || !response?.url) {
        throw new Error(response?.message || 'Upload thất bại');
      }
      setCriteriaList(prev =>
        prev.map((item, idx) => (idx === index ? { ...item, attachmentUrl: response.url } : item))
      );
      setAlert({ show: true, type: 'success', message: 'Tải ảnh tiêu chí thành công!' });
    } catch (error) {
      setAlert({ show: true, type: 'error', message: `Không thể tải ảnh: ${error.message}` });
    } finally {
      setCriteriaUploading(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  };

  const handleAttachmentRemove = (index) => {
    setCriteriaList(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, attachmentUrl: '' } : item))
    );
  };

  const loadExams = async () => {
    try {
      setLoading(true);
      const keyword = debouncedSearchTerm.trim();
      const response = await examEssayApi.getExamEssays({
        page: currentPage,
        limit: 10,
        search: keyword || undefined,
        subject_id: selectedSubject || undefined
      });

      if (response.success) {
        setExams(response.data);
        setTotalPages((response.pagination && response.pagination.pages) || 1);
      }
    } catch (error) {
      setAlert({ show: true, type: 'error', message: 'Lỗi khi tải danh sách đề thi: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const response = await subjectApi.getSubjects({ limit: 100 });
      if (response.success) {
        setSubjects(response.data);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadQuestions = async (essayId) => {
    try {
      const response = await examEssayApi.getQuestions(essayId);
      if (response.success) {
        setQuestions(response.data);
      }
    } catch (error) {
      setAlert({ show: true, type: 'error', message: 'Lỗi khi tải câu hỏi: ' + error.message });
    }
  };

  const handleExamSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...examFormData,
        duration: parseInt(examFormData.duration),
        total_score: parseFloat(examFormData.total_score),
        subject_id: parseInt(examFormData.subject_id)
      };

      const response = editingExam
        ? await examEssayApi.updateExamEssay(editingExam.essay_id, payload)
        : await examEssayApi.createExamEssay(payload);

      if (response.success) {
        setAlert({ show: true, type: 'success', message: response.message });
        loadExams();
        handleCloseExamModal();
      }
    } catch (error) {
      setAlert({ show: true, type: 'error', message: (error.response && error.response.data && error.response.data.message) || error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const criteriaObj = {
        criteria: criteriaList
          .map(item => ({
            text: (item?.text || '').trim(),
            attachmentUrl: item?.attachmentUrl || ''
          }))
          .filter(item => item.text || item.attachmentUrl),
        notes: criteriaNotes?.trim() || ''
      };
      const payload = {
        ...questionFormData,
        question_number: parseInt(questionFormData.question_number),
        max_score: parseFloat(questionFormData.max_score),
        grading_criteria: JSON.stringify(criteriaObj),
        estimated_time: questionFormData.estimated_time ? parseInt(questionFormData.estimated_time) : null
      };

      const response = editingQuestion
        ? await examEssayApi.updateQuestion(editingQuestion.question_id, payload)
        : await examEssayApi.addQuestion(selectedExam.essay_id, payload);

      if (response.success) {
        setAlert({ show: true, type: 'success', message: response.message });
        loadQuestions(selectedExam.essay_id);
        handleCloseQuestionModal();
      }
    } catch (error) {
      setAlert({ show: true, type: 'error', message: (error.response && error.response.data && error.response.data.message) || error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (exam) => {
    if (window.confirm(`Bạn có chắc muốn xóa đề thi "${exam.exam_code}"?`)) {
      try {
        const response = await examEssayApi.deleteExamEssay(exam.essay_id);
        if (response.success) {
          setAlert({ show: true, type: 'success', message: response.message });
          loadExams();
        }
      } catch (error) {
        setAlert({ show: true, type: 'error', message: (error.response && error.response.data && error.response.data.message) || error.message });
      }
    }
  };

  const handleDeleteQuestion = async (question) => {
    if (window.confirm(`Bạn có chắc muốn xóa câu hỏi số ${question.question_number}?`)) {
      try {
        const response = await examEssayApi.deleteQuestion(question.question_id);
        if (response.success) {
          setAlert({ show: true, type: 'success', message: response.message });
          loadQuestions(selectedExam.essay_id);
        }
      } catch (error) {
        setAlert({ show: true, type: 'error', message: (error.response && error.response.data && error.response.data.message) || error.message });
      }
    }
  };

  const handleOpenExamModal = (exam = null) => {
    if (exam) {
      setEditingExam(exam);
      setExamFormData({
        exam_code: exam.exam_code,
        subject_id: exam.subject_id,
        duration: exam.time_limit || exam.duration,
        total_score: exam.total_score,
        description: exam.description || '',
        is_active: exam.is_active
      });
    } else {
      setEditingExam(null);
      setExamFormData({
        exam_code: '',
        subject_id: '',
        duration: '',
        total_score: '',
        description: '',
        is_active: true
      });
    }
    setShowExamModal(true);
  };

  const handleCloseExamModal = () => {
    setShowExamModal(false);
    setEditingExam(null);
  };

  const handleOpenQuestionModal = (question = null) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionFormData({
        question_number: question.question_number,
        question_text: question.question_text,
        max_score: question.max_score,
        grading_criteria: question.grading_criteria || '',
        sample_answer: question.sample_answer || '',
        estimated_time: question.estimated_time || ''
      });
      try {
        const parsed = typeof question.grading_criteria === 'string'
          ? JSON.parse(question.grading_criteria || '{}')
          : (question.grading_criteria || {});
        const arr = Array.isArray(parsed.criteria) ? parsed.criteria : [];
        const mapped = arr.map(item => {
          if (typeof item === 'string') {
            return { text: item, attachmentUrl: '' };
          }
          return {
            text: item?.text || '',
            attachmentUrl: item?.attachmentUrl || item?.attachment_url || ''
          };
        });
        setCriteriaList(mapped.length ? mapped : [createEmptyCriterion()]);
        setCriteriaNotes(parsed.notes || '');
      } catch {
        setCriteriaList([createEmptyCriterion()]);
        setCriteriaNotes('');
      }
    } else {
      setEditingQuestion(null);
      setQuestionFormData({
        question_number: '',
        question_text: '',
        max_score: '',
        grading_criteria: '',
        sample_answer: '',
        estimated_time: ''
      });
      setCriteriaList([createEmptyCriterion()]);
      setCriteriaNotes('');
    }
    setShowQuestionModal(true);
  };

  const handleCloseQuestionModal = () => {
    setShowQuestionModal(false);
    setEditingQuestion(null);
    setCriteriaList([createEmptyCriterion()]);
    setCriteriaNotes('');
    setCriteriaUploading({});
  };

  const handleViewQuestions = (exam) => {
    setSelectedExam(exam);
    setActiveTab('questions');
  };

  return (
    <div className="container">
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: 'error', message: '' })}
        />
      )}

      <div className="page-header">
        <h1>📝 Quản lý Đề thi Tự luận</h1>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'exams' ? 'active' : ''}`}
          onClick={() => setActiveTab('exams')}
        >
          Đề thi
        </button>
        <button
          className={`tab-button ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
          disabled={!selectedExam}
        >
          Câu hỏi {selectedExam && `(${selectedExam.exam_code})`}
        </button>
      </div>

      {/* Tab Đề thi */}
      {activeTab === 'exams' && (
        <>
          <div className="toolbar">
            <button className="btn btn-primary" onClick={() => handleOpenExamModal()}>
              + Thêm Đề thi
            </button>
            <div className="search-box">
              <input
                type="text"
                placeholder="Tìm kiếm theo mã đề..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  // Không reset currentPage ở đây nữa vì đã xử lý trong debounce effect
                }}
              />
            </div>
            <div className="search-box">
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Tất cả môn thi</option>
                {subjects.map((subject) => (
                  <option key={subject.subject_id} value={subject.subject_id}>
                    {subject.subject_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading">Đang tải...</div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã đề</th>
                    <th>Môn thi</th>
                    <th>Thời gian (phút)</th>
                    <th>Tổng điểm</th>
                    {/* DB không có cột exam_date */}
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr key={exam.essay_id}>
                      <td><strong>{exam.exam_code}</strong></td>
                      <td>{exam.subject_name}</td>
                      <td>{exam.time_limit}</td>
                      <td>{exam.total_score}</td>
                      <td>
                        <span className={`badge ${exam.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {exam.is_active ? 'Kích hoạt' : 'Vô hiệu'}
                        </span>
                      </td>
                      <td>
                        <button className="btn-icon" onClick={() => handleViewQuestions(exam)} title="Xem câu hỏi">
                          📋
                        </button>
                        <button className="btn-icon" onClick={() => handleOpenExamModal(exam)} title="Sửa">
                          ✏️
                        </button>
                        <button className="btn-icon" onClick={() => handleDeleteExam(exam)} title="Xóa">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="pagination">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Tab Câu hỏi */}
      {activeTab === 'questions' && selectedExam && (
        <>
          <div className="toolbar">
            <button className="btn btn-secondary" onClick={() => setActiveTab('exams')}>
              ← Quay lại
            </button>
            <button className="btn btn-primary" onClick={() => handleOpenQuestionModal()}>
              + Thêm Câu hỏi
            </button>
          </div>
          {Math.abs(totalScoreDifference) > 0.001 && (
            <div className="admin-alert-warning">
              <strong>Cảnh báo:</strong> Tổng điểm các câu hỏi hiện tại là{' '}
              <span style={{ fontWeight: 700 }}>{questionsTotalScore}</span> trong khi tổng điểm đề là{' '}
              <span style={{ fontWeight: 700 }}>{selectedExam.total_score}</span>.{' '}
              {totalScoreDifference > 0
                ? 'Vui lòng thêm điểm cho câu hỏi để đạt đúng tổng.'
                : 'Vui lòng điều chỉnh điểm từng câu để không vượt quá tổng điểm đề.'}
            </div>
          )}

          <table className="data-table">
            <thead>
              <tr>
                <th style={{width: '80px'}}>Câu số</th>
                <th>Nội dung câu hỏi</th>
                <th style={{width: '100px'}}>Điểm tối đa</th>
                <th style={{width: '150px'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => (
                <tr key={question.question_id}>
                  <td><strong>Câu {question.question_number}</strong></td>
                  <td className="text-left">{question.question_text.substring(0, 100)}...</td>
                  <td>{question.max_score}</td>
                  <td>
                    <button className="btn-icon" onClick={() => handleOpenQuestionModal(question)} title="Sửa">
                      ✏️
                    </button>
                    <button className="btn-icon" onClick={() => handleDeleteQuestion(question)} title="Xóa">
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Modal Đề thi */}
      {showExamModal && (
        <div className="modal-overlay" onClick={handleCloseExamModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExam ? 'Sửa Đề thi' : 'Thêm Đề thi mới'}</h2>
              <button className="close-btn" onClick={handleCloseExamModal}>×</button>
            </div>
            <form onSubmit={handleExamSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Mã đề thi *</label>
                  <input
                    type="text"
                    value={examFormData.exam_code}
                    onChange={(e) => setExamFormData({...examFormData, exam_code: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Môn thi *</label>
                  <select
                    value={examFormData.subject_id}
                    onChange={(e) => setExamFormData({...examFormData, subject_id: e.target.value})}
                    required
                  >
                    <option value="">-- Chọn môn --</option>
                    {subjects.map(s => (
                      <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Thời gian (phút) *</label>
                  <input
                    type="number"
                    value={examFormData.duration}
                    onChange={(e) => setExamFormData({...examFormData, duration: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Tổng điểm *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={examFormData.total_score}
                    onChange={(e) => setExamFormData({...examFormData, total_score: e.target.value})}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Trạng thái</label>
                  <select
                    value={examFormData.is_active}
                    onChange={(e) => setExamFormData({...examFormData, is_active: e.target.value === 'true'})}
                  >
                    <option value="true">Kích hoạt</option>
                    <option value="false">Vô hiệu</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  value={examFormData.description}
                  onChange={(e) => setExamFormData({...examFormData, description: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseExamModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Đang xử lý...' : (editingExam ? 'Cập nhật' : 'Thêm mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Câu hỏi */}
      {showQuestionModal && (
        <div className="modal-overlay" onClick={handleCloseQuestionModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingQuestion ? 'Sửa Câu hỏi' : 'Thêm Câu hỏi mới'}</h2>
              <button className="close-btn" onClick={handleCloseQuestionModal}>×</button>
            </div>
            <form onSubmit={handleQuestionSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Số thứ tự *</label>
                  <input
                    type="number"
                    value={questionFormData.question_number}
                    onChange={(e) => setQuestionFormData({...questionFormData, question_number: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Điểm tối đa *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={questionFormData.max_score}
                    onChange={(e) => setQuestionFormData({...questionFormData, max_score: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Nội dung câu hỏi *</label>
                <textarea
                  value={questionFormData.question_text}
                  onChange={(e) => setQuestionFormData({...questionFormData, question_text: e.target.value})}
                  rows="4"
                  required
                />
              </div>
              <div className="form-group">
                <label>Tiêu chí chấm điểm</label>
                <div className="criteria-list">
                  {criteriaList.map((criterion, idx) => (
                    <div key={idx} className="criteria-row">
                      <div className="criteria-row__header">
                        <strong>Tiêu chí #{idx + 1}</strong>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleRemoveCriterion(idx)}
                        >
                          Xóa
                        </button>
                      </div>
                      <input
                        type="text"
                        className="admin-form-input"
                        placeholder={`Nhập mô tả tiêu chí #${idx + 1}`}
                        value={criterion.text}
                        onChange={(e) => handleCriterionChange(idx, 'text', e.target.value)}
                      />
                      <div className="criteria-actions">
                        <input
                          id={`criteria-upload-${idx}`}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              handleAttachmentUpload(idx, file);
                            }
                            event.target.value = '';
                          }}
                        />
                        <label
                          htmlFor={`criteria-upload-${idx}`}
                          className="btn btn-secondary"
                          style={{ cursor: 'pointer' }}
                        >
                          {criteriaUploading[idx] ? 'Đang tải...' : 'Tải ảnh'}
                        </label>
                        {criterion.attachmentUrl && (
                          <>
                            <a
                              href={criterion.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="criteria-link"
                            >
                              Xem ảnh
                            </a>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleAttachmentRemove(idx)}
                            >
                              Xóa ảnh
                            </button>
                            <img
                              src={criterion.attachmentUrl}
                              alt={`Tiêu chí #${idx + 1}`}
                              className="criteria-thumbnail"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className="btn btn-primary" onClick={handleAddCriterion}>
                  + Thêm tiêu chí
                </button>
                <label>Ghi chú (tùy chọn)</label>
                <textarea
                  className="admin-form-textarea"
                  value={criteriaNotes}
                  onChange={(e)=>setCriteriaNotes(e.target.value)}
                  rows="3"
                  placeholder="Ví dụ: yêu cầu thí sinh nêu rõ các bước tính..."
                />
              </div>
              <div className="form-group">
                <label>Gợi ý đáp án (sample_answer)</label>
                <textarea
                  value={questionFormData.sample_answer}
                  onChange={(e) => setQuestionFormData({...questionFormData, sample_answer: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Thời gian dự kiến (phút)</label>
                <input
                  type="number"
                  value={questionFormData.estimated_time}
                  onChange={(e) => setQuestionFormData({...questionFormData, estimated_time: e.target.value})}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseQuestionModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Đang xử lý...' : (editingQuestion ? 'Cập nhật' : 'Thêm mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamEssaysPage;
