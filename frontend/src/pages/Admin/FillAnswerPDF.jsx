import React, { useState, useEffect } from 'react';
// Thêm lại useBlocker
import { useNavigate, useLocation, useBlocker } from 'react-router-dom';
import QuestionList from "../../components/exam/QuestionFill";
import { toast } from 'react-toastify';
import api from '../../api/axios';
import uploadApi from '../../api/upload';

function PDFWithAnswers() {
  const state = useLocation().state;
  const navigate = useNavigate();
  const [questionCount, setQuestionCount] = useState(state.data.totalQuestions || 1);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // useEffect để đồng bộ questions và points với questionCount
  useEffect(() => {
    setQuestions(currentQuestions => {
      let newQuestions = [...currentQuestions];
      const diff = questionCount - newQuestions.length;
      const total = Number(state.data.totalScore || 0);
      const basePoint = questionCount > 0 ? Number((total / questionCount).toFixed(2)) : 0;
      // Add new questions if needed
      if (diff > 0) {
        for (let i = 0; i < diff; i++) {
          newQuestions.push({
            type: 'single',
            options: ['A','B','C','D'],
            correctAnswer: 0,
            correctAnswers: [],
            statements: [''],
            points: basePoint,
            pdfLabelType: 'ABC',
            pdfOptionCount: 4,
          });
        }
      } else if (diff < 0) {
        newQuestions = newQuestions.slice(0, questionCount);
      }
      // Update points for all questions with exact sum matching total
      return newQuestions.map((q, idx) => {
        let point = basePoint;
        if (questionCount > 0 && idx === questionCount - 1) {
          const others = basePoint * (questionCount - 1);
          point = Number((total - others).toFixed(2));
        }
        return { ...q, points: point };
      });
    });
  }, [questionCount]);

  // 2. Xử lý việc rời khỏi trang (đóng tab, refresh)
  useEffect(() => {
    const handleBeforeUnload = async (event) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        await api.delete('/delete-file', { key: state.key }).catch(() => { });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isSubmitting]); // Phụ thuộc vào hasUnsavedChanges

  // 3. Xử lý việc chuyển trang trong ứng dụng (dùng hook useBlocker)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !isSubmitting && currentLocation.pathname !== nextLocation.pathname,
    async () => {
      const loadingToast = toast.loading('Đang xoá file pdf ...');
      await api.delete('/delete-file', { key: state.key }).catch(() => { });
      toast.dismiss(loadingToast);
    }
  );


  // Handle question updates from each form - Hàm này giờ đã hoàn hảo
  const handleQuestionUpdate = (index, questionData, changedField) => {
    setQuestions(prev => {
      let newQuestions = [...prev];
      newQuestions[index] = questionData;

      if (changedField === 'points') {
        const n = Math.max(questionCount || newQuestions.length || 1, 1);
        const total = Number(state?.data?.totalScore || 0);
        if (n <= 1) {
          newQuestions[0].points = total;
          return newQuestions;
        }
        const edited = Number(questionData.points || 0);
        const othersCount = n - 1;
        const base = Number(((total - edited) / othersCount).toFixed(2));
        let remainder = Number((total - edited - base * (othersCount)).toFixed(2));
        for (let i = 0, seen = 0; i < n; i++) {
          if (i === index) continue;
          let val = base;
          if (seen === othersCount - 1) {
            val = Number((base + remainder).toFixed(2));
          }
          newQuestions[i] = { ...newQuestions[i], points: val };
          seen++;
        }
      }
      return newQuestions;
    });
  };

  const handleRemoveQuestion = (index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
    setQuestionCount(prev => Math.max(0, prev - 1));
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Với đề từ PDF: không validate nội dung; chỉ đảm bảo điểm tổng hợp
    const sliced = (questions || []).slice(0, questionCount);
    const sum = Number(sliced.reduce((a, b) => a + Number(b.points || 0), 0).toFixed(2));
    const total = Number(state.data.totalScore || 0);
    if (Math.abs(sum - total) > 0.01) {
      toast.error('Tổng điểm các câu hỏi không khớp với tổng điểm đề thi!');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Đang lưu đề thi...');

    try {
      const curUser = (() => {
        try {
          return JSON.parse(localStorage.getItem('user'));
        } catch {
          return null;
        }
      })();

      // Chuẩn hóa dữ liệu câu hỏi theo định dạng backend
      const payloadQuestions = sliced.map((q) => {
        const base = {
          type: q.type || 'single',
          question: '',
          score: Number(q.points) || 1,
        };
        if (q.type === 'single' || q.type === 'multiple') {
          const options = (Array.isArray(q.options) && q.options.length
            ? q.options
            : (q.pdfLabelType === '123' ? ['1','2','3','4'] : ['A','B','C','D']))
            .map((t) => ({ text: t }));
          return {
            ...base,
            options,
            correctAnswer: q.type === 'single' ? Number(q.correctAnswer || 0) : undefined,
            correctAnswers: q.type === 'multiple' ? (q.correctAnswers || []) : undefined,
          };
        }
        if (q.type === 'truefalse') {
          return {
            ...base,
            correctAnswer: !!q.correctAnswer,
            answers: [
              { text: 'Đúng', isCorrect: !!q.correctAnswer },
              { text: 'Sai', isCorrect: !q.correctAnswer },
            ]
          };
        }
        if (q.type === 'truefalse_many') {
          const count = Array.isArray(q.statements) ? q.statements.length : 0;
          const statements = Array.from({ length: count || 1 }, (_, i) => ({ text: `Phát biểu ${i + 1}` }));
          const correctAnswers = Array.from({ length: statements.length }, (_, i) => !!q.correctAnswers?.[i]);
          return {
            ...base,
            statements,
            correctAnswers
          };
        }
        return base;
      });

      const finalData = {
        ...state.data,
        link_pdf: state.address,
        questions: payloadQuestions,
        questionCount: payloadQuestions.length,
        createdDate: new Date().toISOString().slice(0, 10),
        created_by: curUser?.user_id || curUser?.userId || undefined,
      };

      const response = await api.post('/exam-mcq', finalData);

      if (response.data.success) {
        toast.dismiss(loadingToast);
        toast.success('Đề thi đã được tạo thành công!');
        // Tắt blocker
        setIsSubmitting(true);
        blocker.reset;
        navigate('/admin/exam-mcq');

      } else {
        throw new Error(response.data.message || 'Không thể tạo đề thi');
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error submitting exam:', error);
      toast.error('Có lỗi xảy ra khi lưu đề thi: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const [viewerUrl, setViewerUrl] = useState(state?.address || '');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await uploadApi.getSignedGetUrl({ key: state?.key, url: state?.address });
        if (mounted && res?.success && res.url) setViewerUrl(res.url);
      } catch {}
    })();
    return () => { mounted = false; };
  }, [state?.key, state?.address]);

  return (
    <div className="w-full h-screen bg-gray-100 flex flex-col">
      {/* --- Modal xác nhận rời đi --- */}
      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Bạn có chắc chắn muốn rời đi?</h2>
            <p className="text-gray-600 mb-6">
              Những thay đổi bạn đã thực hiện có thể không được lưu.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => blocker.reset()}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Ở lại
              </button>
              <button
                onClick={async () => {
                  if (state?.key) {
                    console.log('Deleting file from S3:', state.key);
                    await api.delete('/delete-file', { data: { key: state.key } }).catch(err =>
                      console.error('Error deleting file:', err)
                    );
                  }
                  blocker.proceed();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Rời đi
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- Kết thúc Modal --- */}

      <div className='flex justify-between items-center bg-white shadow-md px-6 py-4'>
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-blue-700">
            Tạo câu hỏi từ PDF
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {state?.data?.title || 'Đang tải...'}
          </p>
          <p className="text-sm text-gray-500">
            {state?.data?.subject?.subject_name ? `Môn: ${state.data.subject.subject_name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <label className="text-sm mr-2 text-gray-600">Số câu hỏi:</label>
            <input
              type="number"
              value={questionCount}
              min={0}
              onChange={(e) => {
                try {
                  const value = parseInt(e.target.value);
                  if (isNaN(value)) throw new Error('Invalid number');
                  setQuestionCount(value);
                } catch (error) {
                  toast.error('không được bỏ trống số câu hỏi');
                }
              }}
              className="w-20 p-2 border rounded-md"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Đang lưu...' : 'Tạo đề'}
          </button>
        </div>
      </div>


      <div className="flex flex-1 overflow-hidden">
        {/* PDF Viewer Left */}
        <div className="w-2/3 h-full border shadow-lg">
          <iframe
            src={viewerUrl}
            title="PDF Viewer"
            className="w-full h-full"
          />
        </div>

        {/* Answer Inputs Right */}
        <div className="w-1/3 bg-gray-50 border-l shadow-lg p-4 flex flex-col justify-start space-y-4 overflow-y-auto">
          <QuestionList
            questionCount={questionCount}
            questions={questions}
            onQuestionChange={handleQuestionUpdate}
            onRemoveQuestion={handleRemoveQuestion}
            isPdfMode={true}
          />
        </div>
      </div>
    </div>
  );
}

export default PDFWithAnswers;
