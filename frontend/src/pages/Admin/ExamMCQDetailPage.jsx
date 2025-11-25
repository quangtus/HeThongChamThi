import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import ExamInfoView from '../../components/exam/ExamInfoView';
import PrintPreview from '../../components/exam/PrintPreview';
import { examCMQ } from '../../api/examCMQ';

const ExamMCQDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const loadExam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await examCMQ.getExamById(id);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Không thể tải đề thi');
      }
      setExamData(res.data);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Không thể tải dữ liệu đề thi');
      navigate('/admin/exam-mcq');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-8 text-center">
        Đang tải đề thi...
      </div>
    );
  }

  if (!examData) {
    return (
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-8 text-center">
        Không tìm thấy đề thi.
      </div>
    );
  }

  const editId = examData.mcq_id ?? examData.id ?? id;
  const hasPdf = Boolean(examData.linkPdf);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="tw-admin-header bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-xl">
        <h2 className="tw-admin-title">Chi tiết đề thi: {examData.title}</h2>
        <p className="text-white/80 text-sm mt-1">
          Xem thông tin tổng quan, file PDF (nếu có) và danh sách câu hỏi của đề thi.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="tw-btn tw-btn-secondary"
            onClick={() => navigate('/admin/exam-mcq')}
          >
            Quay lại danh sách
          </button>
          <button
            type="button"
            className="tw-btn tw-btn-primary"
            onClick={() => hasPdf ? navigate(`/admin/exam-mcq/${editId}/pdfedit`) : navigate(`/admin/exam-mcq/${editId}/edit`)}
          >
            Chỉnh sửa đề thi
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <ExamInfoView
          exam={examData}
          allowPrint={!hasPdf}
          onPrint={() => setShowPrintPreview(true)}
        />
      </div>

      {!hasPdf && showPrintPreview && (
        <PrintPreview exam={examData} onClose={() => setShowPrintPreview(false)} />
      )}
    </div>
  );
};

export default ExamMCQDetailPage;
