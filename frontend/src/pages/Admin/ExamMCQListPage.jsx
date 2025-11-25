import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { examCMQ } from '../../api/examCMQ';
import '../../styles/admin.css';
import '../../styles/admin.tw.css';
import ExamCard from '../../components/exam/ExamCard';

const ExamMCQListPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 9;

  // Server-side load with pagination + search
  const load = async (p = page) => {
    try {
      setLoading(true);
      const res = await examCMQ.getExams({ page: p, limit, q: query });
      if (res.success) {
        setExams(res.data || []);
        setTotalPages(res.pagination?.totalPages || 1);
      } else {
        toast.error(res.message || 'Không thể tải danh sách đề thi');
      }
    } catch (e) {
      console.error(e);
      toast.error('Lỗi khi tải danh sách đề thi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa đề thi này? Hành động không thể hoàn tác.')) return;
    const t = toast.loading('Đang xóa...');
    const res = await examCMQ.deleteExamCMQ(id);
    toast.dismiss(t);
    if (res.success) {
      toast.success('Đã xóa đề thi');
      // reload current page after delete
      load(page);
    } else {
      toast.error(res.message || 'Xóa thất bại');
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow p-8 space-y-6">
      <div className="tw-admin-header bg-gradient-to-r from-indigo-500 to-purple-600 mb-6 p-6 rounded-xl">
        <h2 className="tw-admin-title">Đề thi trắc nghiệm</h2>
        <div className="flex justify-center gap-3">
          <div className="px-4 py-2 rounded-full text-sm font-medium bg-white text-indigo-600">Danh sách</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tiêu đề, mã đề, môn..."
          className="tw-input flex-1"
        />
        <button className="tw-btn tw-btn-primary" onClick={() => navigate('/admin/create-exam-mcq')}>+ Tạo đề</button>
      </div>

      <div className="">
        {loading && (
          <div className="p-4 text-center border rounded-xl">Đang tải...</div>
        )}
        {!loading && exams.length === 0 && (
          <div className="p-4 text-center border rounded-xl">Không có dữ liệu</div>
        )}
        {!loading && exams.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((x, idx) => (
              <ExamCard
                key={x?.id ?? x?.mcq_id ?? x?.exam_code ?? idx}
                exam={x}
                onEdit={(id, hasPdf) => {
                  if (hasPdf) {
                    navigate(`/admin/exam-mcq/${id}/pdfedit`);
                  } else {
                    navigate(`/admin/exam-mcq/${id}/edit`);
                  }
                }}
                onPreview={(id) => navigate(`/admin/exam-mcq/${id}`)}
                onDelete={(id) => handleDelete(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1 rounded border text-sm ${
                p === page ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamMCQListPage;
