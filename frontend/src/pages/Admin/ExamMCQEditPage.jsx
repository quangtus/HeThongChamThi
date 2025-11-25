import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ExamInfoView from '../../components/exam/ExamInfoView';
import ExamInfoForm from '../../components/exam/ExamInfoForm';
import QuestionForm from '../../components/exam/QuestionForm';
import QuestionList from '../../components/exam/QuestionList';
import { examCMQ } from '../../api/examCMQ';
import { subjectApi } from '../../api/adminApi';
import uploadApi from '../../api/upload';
import examMapper from '../../utils/examMapper';
import ScoreMismatchModal from '../../components/exam/ScoreMismatchModal';

const numbersDifferent = (a, b, tolerance = 0.0001) => Math.abs(Number(a ?? 0) - Number(b ?? 0)) > tolerance;

const ExamMCQEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [examData, setExamData] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [mismatchOpen, setMismatchOpen] = useState(false);
  const hasPdf = Boolean(examData?.linkPdf);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [examRes, subjectRes] = await Promise.all([
        examCMQ.getExamById(id),
        subjectApi.getSubjects({ limit: 100 })
      ]);

      if (!examRes.success || !examRes.data) {
        throw new Error(examRes.message || 'Không thể tải đề thi');
      }

      const subjects = subjectRes.success ? subjectRes.data : [];
      const mappedExam = {
        ...examRes.data,
        subjectList: subjects,
        linkPdfKey: '',
      };

      setExamData(mappedExam);
      setEditingQuestion(null);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Không thể tải dữ liệu đề thi');
      navigate('/admin/exam-mcq');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const removeQuestion = (questionId) => {
    setExamData(prev => {
      const questions = (prev.questions || []).filter(q => q.id !== questionId);
      const prevCount = (prev.questions || []).length;
      const updatedTotalQuestions =
        (prev.totalQuestions ?? prevCount) === prevCount ? questions.length : prev.totalQuestions;
      const prevScoreSum = examMapper.sumQuestionScores(prev.questions || []);
      const newScoreSum = examMapper.sumQuestionScores(questions);
      const numericPrevTotal = Number(prev.totalScore);
      const updatedTotalScore =
        Number.isFinite(numericPrevTotal) && numericPrevTotal === prevScoreSum
          ? newScoreSum
          : prev.totalScore;
      return {
        ...prev,
        questions,
        totalQuestions: updatedTotalQuestions,
        totalScore: updatedTotalScore
      };
    });
    if (editingQuestion && editingQuestion.id === questionId) {
      setEditingQuestion(null);
    }
  };

  const handleQuestionSubmit = (question) => {
    const nextQuestion = { ...question, id: question.id ?? Date.now() };
    setExamData(prev => {
      const questions = [...(prev.questions || [])];
      const idx = questions.findIndex(item => item.id === nextQuestion.id);
      if (idx >= 0) {
        questions[idx] = nextQuestion;
      } else {
        questions.push(nextQuestion);
      }
      const prevCount = (prev.questions || []).length;
      const updatedTotalQuestions =
        (prev.totalQuestions ?? prevCount) === prevCount ? questions.length : prev.totalQuestions;
      const prevScoreSum = examMapper.sumQuestionScores(prev.questions || []);
      const newScoreSum = examMapper.sumQuestionScores(questions);
      const numericPrevTotal = Number(prev.totalScore);
      const updatedTotalScore =
        Number.isFinite(numericPrevTotal) && numericPrevTotal === prevScoreSum
          ? newScoreSum
          : prev.totalScore;
      return {
        ...prev,
        questions,
        totalQuestions: updatedTotalQuestions,
        totalScore: updatedTotalScore
      };
    });
    setEditingQuestion(null);
    if (!hasPdf) {
      setQuestionModalOpen(false);
    }
  };

  const handleQuestionEdit = (questionId) => {
    const target = examData?.questions?.find(q => q.id === questionId);
    if (target) {
      setEditingQuestion(target);
      if (hasPdf) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setQuestionModalOpen(true);
      }
    }
  };

  const openQuestionModal = () => {
    setEditingQuestion(null);
    setQuestionModalOpen(true);
  };

  const closeQuestionModal = () => {
    setQuestionModalOpen(false);
    setEditingQuestion(null);
  };

  const handleSave = async () => {
    if (!examData) return;
    try {
      setSaving(true);
      const parsedTotalQuestions = Number(examData.totalQuestions);
      const parsedTotalScore = Number(examData.totalScore);

      const questionScoreSum = examMapper.sumQuestionScores(examData.questions);
      if (Number.isFinite(parsedTotalScore) && parsedTotalScore > 0 && numbersDifferent(parsedTotalScore, questionScoreSum)) {
        setMismatchOpen(true);
        setSaving(false);
        return;
      }

      const payload = {
        ...examData,
        totalQuestions: Number.isFinite(parsedTotalQuestions) && parsedTotalQuestions > 0
          ? parsedTotalQuestions
          : examData.questions?.length || 0,
        totalScore: Number.isFinite(parsedTotalScore) && parsedTotalScore > 0
          ? parsedTotalScore
          : (questionScoreSum || examData.questions?.length || 0),
        questions: examData.questions || []
      };

      const mcqId = examData.mcq_id ?? examData.mcqId;
      if (!mcqId) {
        throw new Error('Không xác định được ID đề thi');
      }
      const res = await examCMQ.updateExamCMQ(mcqId, payload);
      if (!res.success) {
        throw new Error(res.message || 'Cập nhật thất bại');
      }
      toast.success('Đã cập nhật đề thi');
      // Quay lại trang trước sau khi lưu
      try { navigate(-1); } catch { /* fall back keep page */ }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Không thể cập nhật đề thi');
    } finally {
      setSaving(false);
    }
  };

  // Xử lý chênh lệch điểm: chia đều hoặc cập nhật tổng
  const distributeScores = (questions, total) => {
    const n = Math.max((questions || []).length || 0, 1);
    const base = Number((Number(total) / n).toFixed(2));
    const arr = (questions || []).map(q => ({ ...q, score: base }));
    const remainder = Number((Number(total) - base * n).toFixed(2));
    if (arr.length) arr[arr.length - 1] = { ...arr[arr.length - 1], score: Number((arr[arr.length - 1].score + remainder).toFixed(2)) };
    return arr;
  };

  const handleMismatchDistribute = async () => {
    const newQuestions = distributeScores(examData.questions, Number(examData.totalScore));
    const payload = {
      ...examData,
      questions: newQuestions,
      totalQuestions: examData.totalQuestions || newQuestions.length,
      totalScore: Number(examData.totalScore)
    };
    setMismatchOpen(false);
    // reuse save flow
    const mcqId = examData.mcq_id ?? examData.mcqId;
    if (!mcqId) return toast.error('Không xác định được ID đề thi');
    try {
      setSaving(true);
      const res = await examCMQ.updateExamCMQ(mcqId, payload);
      if (!res.success) throw new Error(res.message || 'Cập nhật thất bại');
      toast.success('Đã cập nhật đề thi');
      try { navigate(-1); } catch {}
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Không thể cập nhật đề thi');
    } finally {
      setSaving(false);
    }
  };

  const handleMismatchAlignTotal = async () => {
    const sum = examMapper.sumQuestionScores(examData.questions || []);
    const payload = {
      ...examData,
      totalScore: sum,
      totalQuestions: examData.totalQuestions || (examData.questions?.length || 0),
      questions: examData.questions || []
    };
    setMismatchOpen(false);
    const mcqId = examData.mcq_id ?? examData.mcqId;
    if (!mcqId) return toast.error('Không xác định được ID đề thi');
    try {
      setSaving(true);
      const res = await examCMQ.updateExamCMQ(mcqId, payload);
      if (!res.success) throw new Error(res.message || 'Cập nhật thất bại');
      toast.success('Đã cập nhật đề thi');
      try { navigate(-1); } catch {}
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Không thể cập nhật đề thi');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPdf = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Vui lòng chọn tập tin PDF');
      return;
    }
    setUploadingPdf(true);
    try {
      const res = await uploadApi.uploadPdf(file, { examCode: examData.id || examData.exam_code || examData.mcq_id, examTitle: examData.title });
      if (!res.success) {
        throw new Error(res.message || 'Không thể tải PDF');
      }
      toast.success('Đã tải PDF mới');
      setExamData(prev => ({
        ...prev,
        linkPdf: res.url,
        linkPdfKey: res.key
      }));
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Không thể tải PDF');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleRemovePdf = async () => {
    if (!examData?.linkPdf) return;
    if (examData.linkPdfKey) {
      await uploadApi.deleteFile(examData.linkPdfKey);
    }
    setExamData(prev => ({
      ...prev,
      linkPdf: '',
      linkPdfKey: ''
    }));
    toast.info('PDF sẽ được cập nhật sau khi lưu');
  };

  if (loading || !examData) {
    return (
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-8 text-center">
        Đang tải đề thi...
      </div>
    );
  }

  const infoCard = (
    <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-slate-800">Thông tin đề thi</h3>
        <div className="flex items-center gap-3">
          {hasPdf && (
            <label className="tw-btn tw-btn-secondary cursor-pointer">
              {uploadingPdf ? 'Đang tải...' : 'Tải PDF mới'}
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleUploadPdf}
                disabled={uploadingPdf}
              />
            </label>
          )}
          {examData.linkPdf && (
            <button
              type="button"
              className="tw-btn tw-btn-secondary"
              onClick={handleRemovePdf}
            >
              Gỡ PDF
            </button>
          )}
        </div>
      </div>
      <ExamInfoForm examData={examData} setExamData={setExamData} loadingSubjects={false} />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="tw-admin-header bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <h2 className="tw-admin-title">Chỉnh sửa đề thi: {examData.title}</h2>
          <button
            type="button"
            className="tw-btn tw-btn-secondary"
            onClick={() => { try { navigate(-1); } catch { navigate('/admin/exam-mcq'); } }}
          >
            Quay lại
          </button>
        </div>
        <p className="text-white/80 text-sm mt-1">
          Chỉnh sửa thông tin, nội dung câu hỏi và cập nhật file PDF nếu cần
        </p>
      </div>

      {hasPdf ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <ExamInfoView exam={examData} />
          </div>

          <div className="space-y-5">
            {infoCard}

            <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-4">
              <h3 className="font-semibold text-lg text-slate-800">
                {editingQuestion ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}
              </h3>
              <QuestionForm
                key={editingQuestion?.id || 'detail-question-form'}
                initialData={editingQuestion || {}}
                onSubmit={handleQuestionSubmit}
                onCancel={() => setEditingQuestion(null)}
                submitLabel={editingQuestion ? 'Cập nhật câu hỏi' : 'Thêm câu hỏi'}
                uploadCtx={{
                  examId: examData.id || examData.exam_code || examData.mcq_id,
                  examTitle: examData.title,
                  questionNo: (editingQuestion
                    ? Math.max(1, (examData.questions || []).findIndex(q => q.id === editingQuestion.id) + 1)
                    : (examData.questions?.length || 0) + 1)
                }}
              />
            </div>

            <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-4">
              <h3 className="font-semibold text-lg text-slate-800">
                Danh sách câu hỏi ({examData.questions?.length || 0})
              </h3>
              <QuestionList
                questions={examData.questions || []}
                onRemove={removeQuestion}
                onEdit={handleQuestionEdit}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                className="tw-btn tw-btn-primary"
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-260px)]">
          <div className="lg:w-[30%] lg:min-w-[260px] space-y-5">
            {infoCard}
          </div>
          <div className="flex-1 lg:w-[70%] flex flex-col gap-5">
            <div className="bg-white border rounded-2xl shadow-sm p-5 space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-slate-800">
                  Danh sách câu hỏi ({examData.questions?.length || 0})
                </h3>
                <button
                  type="button"
                  className="tw-btn tw-btn-primary"
                  onClick={openQuestionModal}
                >
                  + Thêm câu hỏi
                </button>
              </div>
              <QuestionList
                questions={examData.questions || []}
                onRemove={removeQuestion}
                onEdit={handleQuestionEdit}
                listClassName="flex-1 overflow-y-auto pr-0"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                className="tw-btn tw-btn-primary"
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {mismatchOpen && (
        <ScoreMismatchModal
          open={mismatchOpen}
          onClose={() => setMismatchOpen(false)}
          totalScore={examData.totalScore}
          questionSum={examMapper.sumQuestionScores(examData.questions || [])}
          questionCount={examData.questions?.length || 0}
          onDistribute={handleMismatchDistribute}
          onAlignTotal={handleMismatchAlignTotal}
        />
      )}

      {questionModalOpen && !hasPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-6 relative">
            <button
              type="button"
              className="absolute top-3 right-3 text-slate-500 hover:text-slate-700"
              onClick={closeQuestionModal}
              aria-label="Đóng"
            >
              X
            </button>
            <h3 className="font-semibold text-lg text-slate-800 mb-4">
              {editingQuestion ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi'}
            </h3>
            <QuestionForm
              key={editingQuestion?.id || 'modal-question-form'}
              initialData={editingQuestion || {}}
              onSubmit={handleQuestionSubmit}
              onCancel={closeQuestionModal}
              submitLabel={editingQuestion ? 'Cập nhật câu hỏi' : 'Thêm câu hỏi'}
              uploadCtx={{
                examId: examData.id || examData.exam_code || examData.mcq_id,
                examTitle: examData.title,
                questionNo: (editingQuestion
                  ? Math.max(1, (examData.questions || []).findIndex(q => q.id === editingQuestion.id) + 1)
                  : (examData.questions?.length || 0) + 1)
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamMCQEditPage;
