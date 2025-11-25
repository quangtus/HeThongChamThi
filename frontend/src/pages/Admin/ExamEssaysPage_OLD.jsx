import React, { useState, useEffect } from 'react';
import { examEssayApi, subjectApi } from '../../api/adminApi';
import Alert from '../../components/ui/Alert';
import '../../styles/admin.css';

const ExamEssaysPage = () => {
  // State quáº£n lÃ½
  const [activeTab, setActiveTab] = useState('exams'); // 'exams' hoáº·c 'questions'
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [examFormData, setExamFormData] = useState({
    exam_code: '',
    subject_id: '',
    duration: '',
    total_score: '',
    exam_date: '',
    description: '',
    is_active: true
  });

  const [questionFormData, setQuestionFormData] = useState({
    question_number: '',
    question_text: '',
    max_score: '',
    grading_criteria: '',
    suggested_answer: ''
  });

  useEffect(() => {
    if (activeTab === 'exams') {
      loadExams();
      loadSubjects();
    }
  }, [activeTab, currentPage, searchTerm]);

  useEffect(() => {
    if (selectedExam) {
      loadQuestions(selectedExam.essay_id);
    }
  }, [selectedExam]);

  const loadExams = async () => {
    try {
      setLoading(true);
      const response = await examEssayApi.getExamEssays({
        page: currentPage,
        limit: 10,
        search: searchTerm
      });

      if (response.success) {
        setExams(response.data);
        setTotalPages((response.pagination && response.pagination.pages) || 1);
      }
    } catch (error) {
      setAlert({ show: true, type: 'error', message: 'Lá»—i khi táº£i danh sÃ¡ch Ä‘á» thi: ' + error.message });
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
      setAlert({ show: true, type: 'error', message: 'Lá»—i khi táº£i cÃ¢u há»i: ' + error.message });
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
      const payload = {
        ...questionFormData,
        question_number: parseInt(questionFormData.question_number),
        max_score: parseFloat(questionFormData.max_score),
        grading_criteria: questionFormData.grading_criteria || null
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
    if (window.confirm(`Báº¡n cÃ³ cháº¯c muá»‘n xÃ³a Ä‘á» thi "${exam.exam_code}"?`)) {
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
    if (window.confirm(`Báº¡n cÃ³ cháº¯c muá»‘n xÃ³a cÃ¢u há»i sá»‘ ${question.question_number}?`)) {
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
        duration: exam.duration,
        total_score: exam.total_score,
        exam_date: exam.exam_date || '',
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
        exam_date: '',
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
        suggested_answer: question.suggested_answer || ''
      });
    } else {
      setEditingQuestion(null);
      setQuestionFormData({
        question_number: '',
        question_text: '',
        max_score: '',
        grading_criteria: '',
        suggested_answer: ''
      });
    }
    setShowQuestionModal(true);
  };

  const handleCloseQuestionModal = () => {
    setShowQuestionModal(false);
    setEditingQuestion(null);
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
        <h1>ðŸ“ Quáº£n lÃ½ Äá» thi Tá»± luáº­n</h1>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'exams' ? 'active' : ''}`}
          onClick={() => setActiveTab('exams')}
        >
          Äá» thi
        </button>
        <button
          className={`tab-button ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
          disabled={!selectedExam}
        >
          CÃ¢u há»i {selectedExam && `(${selectedExam.exam_code})`}
        </button>
      </div>

      {/* Tab Äá» thi */}
      {activeTab === 'exams' && (
        <>
          <div className="toolbar">
            <button className="btn btn-primary" onClick={() => handleOpenExamModal()}>
              + ThÃªm Äá» thi
            </button>
            <div className="search-box">
              <input
                type="text"
                placeholder="TÃ¬m kiáº¿m theo mÃ£ Ä‘á», mÃ´n..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading">Äang táº£i...</div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>MÃ£ Ä‘á»</th>
                    <th>MÃ´n thi</th>
                    <th>Thá»i gian (phÃºt)</th>
                    <th>Tá»•ng Ä‘iá»ƒm</th>
                    <th>NgÃ y thi</th>
                    <th>Tráº¡ng thÃ¡i</th>
                    <th>Thao tÃ¡c</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr key={exam.essay_id}>
                      <td><strong>{exam.exam_code}</strong></td>
                      <td>{exam.subject_name}</td>
                      <td>{exam.duration}</td>
                      <td>{exam.total_score}</td>
                      <td>{exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('vi-VN') : '-'}</td>
                      <td>
                        <span className={`badge ${exam.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {exam.is_active ? 'KÃ­ch hoáº¡t' : 'VÃ´ hiá»‡u'}
                        </span>
                      </td>
                      <td>
                        <button className="btn-icon" onClick={() => handleViewQuestions(exam)} title="Xem cÃ¢u há»i">
                          ðŸ“‹
                        </button>
                        <button className="btn-icon" onClick={() => handleOpenExamModal(exam)} title="Sá»­a">
                          âœï¸
                        </button>
                        <button className="btn-icon" onClick={() => handleDeleteExam(exam)} title="XÃ³a">
                          ðŸ—‘ï¸
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

      {/* Tab CÃ¢u há»i */}
      {activeTab === 'questions' && selectedExam && (
        <>
          <div className="toolbar">
            <button className="btn btn-secondary" onClick={() => setActiveTab('exams')}>
              â† Quay láº¡i
            </button>
            <button className="btn btn-primary" onClick={() => handleOpenQuestionModal()}>
              + ThÃªm CÃ¢u há»i
            </button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th style={{width: '80px'}}>CÃ¢u sá»‘</th>
                <th>Ná»™i dung cÃ¢u há»i</th>
                <th style={{width: '100px'}}>Äiá»ƒm tá»‘i Ä‘a</th>
                <th style={{width: '150px'}}>Thao tÃ¡c</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => (
                <tr key={question.question_id}>
                  <td><strong>CÃ¢u {question.question_number}</strong></td>
                  <td className="text-left">{question.question_text.substring(0, 100)}...</td>
                  <td>{question.max_score}</td>
                  <td>
                    <button className="btn-icon" onClick={() => handleOpenQuestionModal(question)} title="Sá»­a">
                      âœï¸
                    </button>
                    <button className="btn-icon" onClick={() => handleDeleteQuestion(question)} title="XÃ³a">
                      ðŸ—‘ï¸
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Modal Äá» thi */}
      {showExamModal && (
        <div className="modal-overlay" onClick={handleCloseExamModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingExam ? 'Sá»­a Äá» thi' : 'ThÃªm Äá» thi má»›i'}</h2>
              <button className="close-btn" onClick={handleCloseExamModal}>Ã—</button>
            </div>
            <form onSubmit={handleExamSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>MÃ£ Ä‘á» thi *</label>
                  <input
                    type="text"
                    value={examFormData.exam_code}
                    onChange={(e) => setExamFormData({...examFormData, exam_code: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>MÃ´n thi *</label>
                  <select
                    value={examFormData.subject_id}
                    onChange={(e) => setExamFormData({...examFormData, subject_id: e.target.value})}
                    required
                  >
                    <option value="">-- Chá»n mÃ´n --</option>
                    {subjects.map(s => (
                      <option key={s.subject_id} value={s.subject_id}>{s.subject_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Thá»i gian (phÃºt) *</label>
                  <input
                    type="number"
                    value={examFormData.duration}
                    onChange={(e) => setExamFormData({...examFormData, duration: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Tá»•ng Ä‘iá»ƒm *</label>
                  <input
                    type="number"
                    step="0.5"
                    value={examFormData.total_score}
                    onChange={(e) => setExamFormData({...examFormData, total_score: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>NgÃ y thi</label>
                  <input
                    type="date"
                    value={examFormData.exam_date}
                    onChange={(e) => setExamFormData({...examFormData, exam_date: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Tráº¡ng thÃ¡i</label>
                  <select
                    value={examFormData.is_active}
                    onChange={(e) => setExamFormData({...examFormData, is_active: e.target.value === 'true'})}
                  >
                    <option value="true">KÃ­ch hoáº¡t</option>
                    <option value="false">VÃ´ hiá»‡u</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>MÃ´ táº£</label>
                <textarea
                  value={examFormData.description}
                  onChange={(e) => setExamFormData({...examFormData, description: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseExamModal}>
                  Há»§y
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Äang xá»­ lÃ½...' : (editingExam ? 'Cáº­p nháº­t' : 'ThÃªm má»›i')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal CÃ¢u há»i */}
      {showQuestionModal && (
        <div className="modal-overlay" onClick={handleCloseQuestionModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingQuestion ? 'Sá»­a CÃ¢u há»i' : 'ThÃªm CÃ¢u há»i má»›i'}</h2>
              <button className="close-btn" onClick={handleCloseQuestionModal}>Ã—</button>
            </div>
            <form onSubmit={handleQuestionSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Sá»‘ thá»© tá»± *</label>
                  <input
                    type="number"
                    value={questionFormData.question_number}
                    onChange={(e) => setQuestionFormData({...questionFormData, question_number: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Äiá»ƒm tá»‘i Ä‘a *</label>
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
                <label>Ná»™i dung cÃ¢u há»i *</label>
                <textarea
                  value={questionFormData.question_text}
                  onChange={(e) => setQuestionFormData({...questionFormData, question_text: e.target.value})}
                  rows="4"
                  required
                />
              </div>
              <div className="form-group">
                <label>TiÃªu chÃ­ cháº¥m Ä‘iá»ƒm (JSONB)</label>
                <textarea
                  value={questionFormData.grading_criteria}
                  onChange={(e) => setQuestionFormData({...questionFormData, grading_criteria: e.target.value})}
                  rows="3"
                  placeholder='VÃ­ dá»¥: {"criteria": ["TrÃ¬nh bÃ y rÃµ rÃ ng", "ÄÃºng cÃ´ng thá»©c"]}'
                />
              </div>
              <div className="form-group">
                <label>Gá»£i Ã½ Ä‘Ã¡p Ã¡n</label>
                <textarea
                  value={questionFormData.suggested_answer}
                  onChange={(e) => setQuestionFormData({...questionFormData, suggested_answer: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseQuestionModal}>
                  Há»§y
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Äang xá»­ lÃ½...' : (editingQuestion ? 'Cáº­p nháº­t' : 'ThÃªm má»›i')}
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

