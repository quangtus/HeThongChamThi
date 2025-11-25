import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QuestionList from "../../components/exam/QuestionFill";
import { toast } from 'react-toastify';
import api from '../../api/axios';
import uploadApi from '../../api/upload';
import { examCMQ } from '../../api/examCMQ';

function EditAnswerPDF() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [examData, setExamData] = useState(null);
    const [questionCount, setQuestionCount] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const loadExamData = async () => {
            try {
                setLoading(true);
                const res = await examCMQ.getExamById(id);
                if (res.success && res.data) {
                    setExamData(res.data);
                    setQuestionCount(res.data.totalQuestions);
                    if (res.data.questions && res.data.questions.length > 0) {
                        setQuestions(res.data.questions.map(q => ({
                            type: q.type,
                            options: q.options ? q.options.map(opt => opt.text || '') : ['', ''],
                            correctAnswer: q.correctAnswer ,
                            correctAnswers:  q.correctAnswers,
                            points: q.score ,
                            question: q.question,
                            pdfLabelType: (q.options && q.options.length && /^\d+$/.test(String(q.options[0] ?? ''))) ? '123' : 'ABC',
                            pdfOptionCount: (q.options && q.options.length) ? q.options.length : 4,
                        })));
                    }
                } else {
                    console.error('API Response unsuccessful:', res);
                    toast.error(res.message || 'Không thể tải dữ liệu đề thi');
                    navigate('/admin/exam-mcq');
                }
            } catch (error) {
                console.error('Load exam error:', error);
                toast.error('Lỗi khi tải dữ liệu đề thi');
                navigate('/admin/exam-mcq');
            } finally {
                setLoading(false);
            }
        };
        loadExamData();
    }, [id]);

    // Sign the PDF URL for viewing
    const [viewerUrl, setViewerUrl] = useState('');
    useEffect(() => {
        let mounted = true;
        (async () => {
            const url = examData?.linkPdf;
            if (!url) return;
            try {
                const res = await uploadApi.getSignedGetUrl({ url });
                if (mounted && res?.success && res.url) setViewerUrl(res.url);
                else if (mounted) setViewerUrl(url);
            } catch {
                if (mounted) setViewerUrl(url);
            }
        })();
        return () => { mounted = false; };
    }, [examData?.linkPdf]);

    useEffect(() => {
        if (!examData || !questionCount) return;
        // Đồng bộ questions khi questionCount thay đổi
        setQuestions(currentQuestions => {
            let newQuestions = [...currentQuestions];
            const diff = questionCount - newQuestions.length;
            const total = Number(examData.totalScore || 0);
            const basePoint = questionCount > 0 ? Number((total / questionCount).toFixed(2)) : 0;

            if (diff > 0) {
                for (let i = 0; i < diff; i++) {
                    newQuestions.push({
                        type: 'single',
                        options: ['', ''],
                        correctAnswer: 0,
                        correctAnswers: [],
                        question: '',
                        points: basePoint,
                    });
                }
            } else if (diff < 0) {
                newQuestions = newQuestions.slice(0, questionCount);
            }

            // Update points for all questions and fix last one to match total
            return newQuestions.map((q, idx) => {
                let point = basePoint;
                if (questionCount > 0 && idx === questionCount - 1) {
                    const others = basePoint * (questionCount - 1);
                    point = Number((total - others).toFixed(2));
                }
                return { ...q, points: point };
            });
        });
    }, [questionCount, examData]); // Add examData as dependency

    // Handle question updates from each form - Hàm này giờ đã hoàn hảo
    const handleQuestionUpdate = (index, questionData, changedField) => {
        setQuestions(prev => {
            let newQuestions = [...prev];
            newQuestions[index] = questionData;
            if (changedField === 'points') {
                const n = Math.max(questionCount || newQuestions.length || 1, 1);
                const total = Number(examData?.totalScore || 0);
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

    // per-question format is handled inside QuestionForm in PDF mode

    const handleSubmit = async () => {
        if (!examData || !questionCount) return;
        setIsSubmitting(true);
        const t = toast.loading('Đang lưu...');
        try {
            // Chuẩn hóa dữ liệu trước khi gửi để bảo toàn đáp án đúng
            const normalisedQuestions = (questions || []).slice(0, questionCount).map((q) => {
                const base = {
                    type: q.type || 'single',
                    question: q.question || '',
                    score: Number(q.points) || Number(q.score) || 1,
                };
                if (q.type === 'single' || q.type === 'multiple') {
                    const options = (Array.isArray(q.options) && q.options.length ? q.options : ['A','B','C','D'])
                        .map((t) => (typeof t === 'string' ? { text: t } : { text: String(t?.text ?? t) }));
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
                        ],
                    };
                }
                if (q.type === 'truefalse_many') {
                    const count = Array.isArray(q.statements) ? q.statements.length : 0;
                    const statements = Array.from({ length: count || 1 }, (_, i) => ({ text: `Phát biểu ${i + 1}` }));
                    const correctAnswers = Array.from({ length: statements.length }, (_, i) => !!q.correctAnswers?.[i]);
                    return {
                        ...base,
                        statements,
                        correctAnswers,
                    };
                }
                return base;
            });

            const body = {
                questions: normalisedQuestions,
                totalQuestions: questionCount,
            };
            // Gọi API trực tiếp để tránh chuẩn hóa lại lần nữa
            const res = await api.put(`/exam-mcq/${id}`, body);
            toast.dismiss(t);
            if (res.data?.success) {
                toast.success('Lưu đề thành công');
                try { navigate(-1); } catch { navigate(`/admin/exam-mcq/${id}`); }
            } else {
                toast.error(res.data?.message || 'Lưu câu hỏi thất bại');
            }
        } catch (error) {
            console.error('Submit error:', error);
            toast.dismiss(t);
            toast.error('Lỗi khi lưu câu hỏi');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }
    return (
        <div className="w-full h-screen bg-gray-100 flex flex-col">
            <div className='flex justify-between items-center bg-white shadow-md px-6 py-4'>
                <div className="flex flex-col">
                    <h1 className="text-2xl font-bold text-blue-700">
                        Sửa câu hỏi từ PDF
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        {examData.title}
                    </p>
                    <p className="text-sm text-gray-500">
                        {examData.subject?.subject_name ? `Môn: ${examData.subject.subject_name}` : ''}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => { try { navigate(-1); } catch { navigate('/admin/exam-mcq'); } }}
                        className="px-4 py-2 tw-btn tw-btn-secondary"
                    >
                        Quay lại
                    </button>
                    
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

                        disabled={loading}
                        onClick={handleSubmit}
                        className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Đang lưu...' : 'Sửa đề'}
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
export default EditAnswerPDF;
