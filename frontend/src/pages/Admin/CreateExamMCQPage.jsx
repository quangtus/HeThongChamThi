import React, { useEffect, useState, useCallback } from "react";
import { UploadCloud, FileText, Save, Plus, ArrowLeft, ArrowRight, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from 'react-toastify';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '../../styles/admin.css';
import '../../styles/admin.tw.css';
import { subjectApi } from '../../api/adminApi';
import { examCMQ } from "../../api/examCMQ";

import PrintPreview from "../../components/exam/PrintPreview";
import ScoreMismatchModal from "../../components/exam/ScoreMismatchModal";
import ExamInfoForm from "../../components/exam/ExamInfoForm";
import QuestionForm from "../../components/exam/QuestionForm";
import QuestionList from "../../components/exam/QuestionList";
import ExamInfoView from "../../components/exam/ExamInfoView";
import uploadApi from "../../api/upload";
import examMapper from "../../utils/examMapper";

const numbersDifferent = (a, b, tolerance = 0.0001) => Math.abs(Number(a ?? 0) - Number(b ?? 0)) > tolerance;

const CreateExamMCQPage = ({ onSaveExam }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [mismatchContext, setMismatchContext] = useState('save');
  const [autoDistributeScore, setAutoDistributeScore] = useState(false);
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const previewId = searchParams.get('preview');
  const isEdit = Boolean(editId);

const [examData, setExamData] = useState({
    id: `E${String(Math.floor(Math.random() * 900) + 100)}`,
    title: "",
    subject: {
      subject_id: "",
      subject_name: ""
    },
    subjectList: [],
    duration: 45,
    totalQuestions: 0,
    totalScore: 10,
    linkPdf: "",
    linkPdfKey: "",
    description: "",
    questions: [],
  });
  const [editingQuestion, setEditingQuestion] = useState(null);
  const calculateAutoScore = useCallback((totalScore, questionCount) => {
    const count = Math.max(Number(questionCount) || 0, 1);
    const numericTotal = Number(totalScore);
    if (Number.isFinite(numericTotal) && numericTotal > 0) {
      return Number((numericTotal / count).toFixed(2));
    }
    return 1;
  }, []);

  // Load danh sách môn học
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const response = await subjectApi.getSubjects({ limit: 100 });
        if (response.success) {
          setExamData(prev => ({
            ...prev,
            subjectList: response.data
          }));
        } else {
          toast.error("Không thể tải danh sách môn học!");
        }
      } catch (error) {
        console.error("Error loading subjects:", error);
        toast.error("Lỗi khi tải danh sách môn học!");
      } finally {
        setLoadingSubjects(false);
      }
    };
    loadSubjects();
  }, []);

  // Nếu có editId: tải đề để chỉnh sửa
  useEffect(() => {
    const loadExam = async () => {
      const targetId = (editId || previewId || '').trim();
      if (!targetId || targetId === 'undefined' || targetId === 'null') return;
      try {
        const res = await examCMQ.getExamById(targetId);
        if (res.success && res.data) {
          const e = res.data;
          setExamData(prev => ({
            ...prev,
            id: e.id || prev.id,
            title: e.title || '',
            duration: e.duration ?? 45,
            totalQuestions: e.totalQuestions ?? e.questions?.length ?? prev.totalQuestions,
            totalScore: Number(e.totalScore ?? examMapper.sumQuestionScores(e.questions || [])),
            linkPdf: e.linkPdf || '',
            description: e.description || '',
            subject: e.subject || { subject_id: '', subject_name: '' },
            questions: e.questions || [],
          }));
          if (previewId) setStep(3);
        } else {
          toast.error(res.message || 'Không tìm thấy đề thi');
        }
      } catch (err) {
        console.error(err);
        toast.error('Lỗi khi tải đề thi');
      }
    };
    loadExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, previewId]);

  // Thêm/Xóa/Sửa câu hỏi
  const removeQuestion = (id) => {
    setExamData(prev => {
      const questions = prev.questions.filter(q => q.id !== id);
      const prevCount = prev.questions.length;
      const updatedTotalQuestions =
        (prev.totalQuestions ?? prevCount) === prevCount ? questions.length : prev.totalQuestions;
      const prevScoreSum = examMapper.sumQuestionScores(prev.questions);
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
    if (editingQuestion && editingQuestion.id === id) {
      setEditingQuestion(null);
    }
  };

  const handleQuestionSubmit = (question) => {
    const nextQuestion = { ...question, id: question.id ?? Date.now() };
    setExamData(prev => {
      const questions = [...prev.questions];
      const idx = questions.findIndex(item => item.id === nextQuestion.id);
      if (idx >= 0) {
        questions[idx] = nextQuestion;
      } else {
        questions.push(nextQuestion);
      }
      const prevCount = prev.questions.length;
      const updatedTotalQuestions =
        (prev.totalQuestions ?? prevCount) === prevCount ? questions.length : prev.totalQuestions;
      const prevScoreSum = examMapper.sumQuestionScores(prev.questions);
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
  };

  const handleQuestionEdit = (id) => {
    const target = examData.questions.find(q => q.id === id);
    if (target) {
      setEditingQuestion(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const validateStep = (currentStep) => {
    if (currentStep === 1) {
      if (!examData.title?.trim()) {
        toast.error('Vui lòng nhập tên đề thi!');
        return false;
      }
      if (!examData.subject?.subject_id) {
        toast.error('Vui lòng chọn môn thi!');
        return false;
      }
      if (!Number.isFinite(Number(examData.duration)) || Number(examData.duration) <= 0) {
        toast.error('Vui lòng nhập thời gian làm bài hợp lệ!');
        return false;
      }
      return true;
    }
    if (currentStep === 2) {
      if (!Array.isArray(examData.questions) || examData.questions.length === 0) {
        toast.error('Vui lòng thêm ít nhất một câu hỏi trước khi tiếp tục!');
        return false;
      }
      const sumScores = examMapper.sumQuestionScores(examData.questions);
      const configuredTotal = Number(examData.totalScore);
      if (Number.isFinite(configuredTotal) && configuredTotal > 0 && numbersDifferent(configuredTotal, sumScores)) {
        setMismatchContext('step2');
        setShowMismatchModal(true);
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, 3));
  };

  // Import câu hỏi từ file
  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const name = file.name.toLowerCase();

    try {
      if (name.endsWith(".json")) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
        setExamData((prev) => ({ ...prev, questions: [...prev.questions, ...questions] }));
        return;
      }

      if (name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".csv")) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const mapped = json.map((row, i) => {
          const options = (row.options || "")
            .toString()
            .split("|")
            .map((s) => s.trim())
            .filter(Boolean);
          const type = (row.type || "single").toLowerCase();

          let q = {
            id: Date.now() + i,
            question: row.question || `Câu ${i + 1}`,
            type,
          };

          if (type === "single")
            q = { ...q, options, correctAnswer: Number(row.correct) || 0 };
          if (type === "multiple")
            q = {
              ...q,
              options,
              correctAnswers: (row.correct || "")
                .toString()
                .split(",")
                .map((x) => Number(x.trim())),
            };
          if (type === "truefalse")
            q = { ...q, correctAnswer: (row.correct || "").toLowerCase() === "true" };
          return q;
        });

        setExamData((prev) => ({
          ...prev,
          questions: [...prev.questions, ...mapped],
        }));
        return;
      }

      if (name.endsWith(".pdf")) {
        toast.info("PDF import cần backend để trích text. Vui lòng dùng JSON/XLSX.");
        return;
      }

      toast.error("Định dạng file chưa hỗ trợ.");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi import file.");
    }
  };

  // Lưu đề thi
  const handleFinish = async () => {
    try {
      if (!examData.title?.trim()) {
        toast.error('Vui lòng nhập tên đề thi!');
        return;
      }
      if (!examData.subject?.subject_id) {
        toast.error('Vui lòng chọn môn thi!');
        return;
      }
      if (!examData.questions?.length) {
        toast.error('Vui lòng thêm ít nhất một câu hỏi!');
        return;
      }

      const curUser = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })();
      const questionScoreSum = examMapper.sumQuestionScores(examData.questions);
      const parsedTotalQuestions = Number(examData.totalQuestions);
      const parsedTotalScore = Number(examData.totalScore);
      if (Number.isFinite(parsedTotalScore) && parsedTotalScore > 0 && numbersDifferent(parsedTotalScore, questionScoreSum)) {
        setMismatchContext('save');
        setShowMismatchModal(true);
        return;
      }
      const derivedTotalQuestions = Number.isFinite(parsedTotalQuestions) && parsedTotalQuestions > 0
        ? parsedTotalQuestions
        : examData.questions.length;
      const derivedTotalScore = Number.isFinite(parsedTotalScore) && parsedTotalScore > 0
        ? parsedTotalScore
        : (questionScoreSum || derivedTotalQuestions);

      const final = {
        id: examData.id,
        title: examData.title,
        subject: examData.subject,
        duration: examData.duration,
        description: examData.description,
        linkPdf: examData.linkPdf,
        totalQuestions: derivedTotalQuestions,
        totalScore: derivedTotalScore,
        questions: examData.questions,
        questionCount: examData.questions.length,
        createdDate: new Date().toISOString().slice(0, 10),
        created_by: curUser?.user_id || curUser?.userId || undefined,
      };

      const loadingToast = toast.loading('Đang lưu đề thi...');
      const response = isEdit
        ? await examCMQ.updateExamCMQ(editId, final)
        : await examCMQ.createExamCMQ(final);
      toast.dismiss(loadingToast);

      if (response.success) {
        toast.success(isEdit ? 'Đã cập nhật đề thi!' : 'Đề thi đã được tạo thành công!');
        if (onSaveExam) onSaveExam(final);
        navigate('/admin/exam-mcq');
      } else {
        toast.error(response.message || 'Không thể tạo đề thi!');
      }
    } catch (error) {
      console.error('Error creating exam:', error);
      toast.error('Có lỗi xảy ra khi tạo đề thi!');
    }
  };

  // Helpers for score mismatch
  const distributeScores = (questions, total) => {
    const n = Math.max(questions.length || 0, 1);
    const base = Number((Number(total) / n).toFixed(2));
    const result = questions.map((q, i) => ({ ...q, score: base }));
    const sumBase = base * n;
    const remainder = Number((Number(total) - sumBase).toFixed(2));
    if (n > 0 && remainder !== 0) {
      result[n - 1] = { ...result[n - 1], score: Number((result[n - 1].score + remainder).toFixed(2)) };
    }
    return result;
  };

  const doSave = async (final) => {
    const loadingToast = toast.loading('Đang lưu đề thi...');
    const response = isEdit
      ? await examCMQ.updateExamCMQ(editId, final)
      : await examCMQ.createExamCMQ(final);
    toast.dismiss(loadingToast);
    if (response.success) {
      toast.success(isEdit ? 'Đã cập nhật đề thi!' : 'Đề thi đã được tạo thành công!');
      if (onSaveExam) onSaveExam(final);
      navigate('/admin/exam-mcq');
    } else {
      toast.error(response.message || 'Không thể tạo đề thi!');
    }
  };

  const handleResolveMismatchDistribute = async () => {
    setShowMismatchModal(false);
    const questionScoreSum = examMapper.sumQuestionScores(examData.questions);
    const parsedTotalQuestions = Number(examData.totalQuestions);
    const parsedTotalScore = Number(examData.totalScore);
    const derivedTotalQuestions = Number.isFinite(parsedTotalQuestions) && parsedTotalQuestions > 0
      ? parsedTotalQuestions
      : examData.questions.length;
    const newQuestions = distributeScores(examData.questions, parsedTotalScore || questionScoreSum || derivedTotalQuestions);
    if (mismatchContext === 'step2') {
      setExamData(prev => ({ ...prev, questions: newQuestions }));
      setTimeout(() => setStep(3), 0);
    } else {
      const final = {
        id: examData.id,
        title: examData.title,
        subject: examData.subject,
        duration: examData.duration,
        description: examData.description,
        linkPdf: examData.linkPdf,
        totalQuestions: derivedTotalQuestions,
        totalScore: Number.isFinite(parsedTotalScore) && parsedTotalScore > 0 ? parsedTotalScore : examMapper.sumQuestionScores(newQuestions),
        questions: newQuestions,
        questionCount: newQuestions.length,
      };
      await doSave(final);
    }
  };

  const handleResolveMismatchAlignTotal = async () => {
    setShowMismatchModal(false);
    const sum = examMapper.sumQuestionScores(examData.questions);
    const parsedTotalQuestions = Number(examData.totalQuestions);
    const derivedTotalQuestions = Number.isFinite(parsedTotalQuestions) && parsedTotalQuestions > 0
      ? parsedTotalQuestions
      : examData.questions.length;
    const final = {
      id: examData.id,
      title: examData.title,
      subject: examData.subject,
      duration: examData.duration,
      description: examData.description,
      linkPdf: examData.linkPdf,
      totalQuestions: derivedTotalQuestions,
      totalScore: sum,
      questions: examData.questions,
      questionCount: examData.questions.length,
    };
    await doSave(final);
  };

  // Form thêm câu hỏi nhanh
  const SmallQuestionForm = ({ onAdd }) => {
    const [q, setQ] = useState({
      type: "single",
      question: "",
      options: ["", ""],
      correctAnswer: 0,
      correctAnswers: [],
      statements: ["", "", ""],
    });

    const addOption = () => setQ(prev => ({ ...prev, options: [...prev.options, ""] }));
    const addStatement = () => setQ(prev => ({
      ...prev,
      statements: [...prev.statements, ""],
      correctAnswers: [...prev.correctAnswers, false],
    }));

    const handleSubmit = (e) => {
      e.preventDefault();
      if ((q.type !== "truefalse_many" && !q.question) || 
          (q.type === "truefalse_many" && !q.statements.some(s => s.trim()))) {
        return alert("Vui lòng nhập nội dung câu hỏi!");
      }

      const newQuestion = {
        id: Date.now(),
        type: q.type,
        question: q.question,
      };

      if (q.type === "truefalse") {
        newQuestion.correctAnswer = q.correctAnswer;
      } else if (q.type === "truefalse_many") {
        const validStatements = q.statements.filter(s => s.trim());
        const validAnswers = q.statements.map((_, i) => q.correctAnswers[i] || false)
          .slice(0, validStatements.length);
        
        newQuestion.statements = validStatements;
        newQuestion.correctAnswers = validAnswers;
      } else {
        newQuestion.options = q.options.filter(o => o.trim());
        newQuestion.correctAnswer = q.type === "single" ? q.correctAnswer : undefined;
        newQuestion.correctAnswers = q.type === "multiple" ? q.correctAnswers : undefined;
      }

      onAdd(newQuestion);
      setQ({ 
        type: "single",
        question: "",
        options: ["", ""] ,
        correctAnswer: 0,
        correctAnswers: [],
        statements: ["", "", ""],
      });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-3 bg-gray-50 p-4 rounded-xl border">
        <select
          value={q.type}
          onChange={(e) => setQ(prev => ({ ...prev, type: e.target.value }))}
          className="w-full p-2 border rounded"
        >
          <option value="single">Một đáp án</option>
          <option value="multiple">Nhiều đáp án</option>
          <option value="truefalse">Đúng / Sai (1 câu)</option>
          <option value="truefalse_many">Đúng / Sai (nhiều câu)</option>
        </select>

        {q.type !== "truefalse_many" ? (
          <textarea
            value={q.question}
            onChange={(e) => setQ(prev => ({ ...prev, question: e.target.value }))}
            className="w-full p-2 border rounded"
            placeholder="Nội dung câu hỏi..."
            rows={2}
          />
        ) : (
          <div className="space-y-2">
            <textarea
              value={q.question}
              onChange={(e) => setQ(prev => ({ ...prev, question: e.target.value }))}
              className="w-full p-2 border rounded"
              placeholder="Tiêu đề chung (không bắt buộc)..."
              rows={2}
            />
            {q.statements.map((statement, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  value={q.correctAnswers[idx] ? "true" : "false"}
                  onChange={(e) => {
                    const newAnswers = [...q.correctAnswers];
                    newAnswers[idx] = e.target.value === "true";
                    setQ(prev => ({ ...prev, correctAnswers: newAnswers }));
                  }}
                  className="p-2 border rounded w-24"
                >
                  <option value="true">Đúng</option>
                  <option value="false">Sai</option>
                </select>
                <input
                  value={statement}
                  onChange={(e) => {
                    const newStatements = [...q.statements];
                    newStatements[idx] = e.target.value;
                    setQ(prev => ({ ...prev, statements: newStatements }));
                  }}
                  className="flex-1 p-2 border rounded"
                  placeholder={`Phát biểu ${idx + 1}...`}
                />
              </div>
            ))}
            <button type="button" onClick={addStatement} className="text-blue-600 text-sm">
              + Thêm phát biểu
            </button>
          </div>
        )}

        {(q.type === "single" || q.type === "multiple") && (
          <div className="space-y-2">
            {q.options.map((opt, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type={q.type === "single" ? "radio" : "checkbox"}
                  checked={
                    q.type === "single"
                      ? q.correctAnswer === idx
                      : q.correctAnswers.includes(idx)
                  }
                  onChange={() => {
                    if (q.type === "single") setQ({ ...q, correctAnswer: idx });
                    else {
                      const cur = q.correctAnswers || [];
                      setQ({
                        ...q,
                        correctAnswers: cur.includes(idx)
                          ? cur.filter((x) => x !== idx)
                          : [...cur, idx],
                      });
                    }
                  }}
                />
                <input
                  value={opt}
                  onChange={(e) => {
                    const arr = [...q.options];
                    arr[idx] = e.target.value;
                    setQ({ ...q, options: arr });
                  }}
                  className="flex-1 p-2 border rounded"
                />
              </div>
            ))}
            <button type="button" onClick={addOption} className="text-blue-600 text-sm">
              + Thêm đáp án
            </button>
          </div>
        )}

        {q.type === "truefalse" && (
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={q.correctAnswer === true}
                onChange={() => setQ({ ...q, correctAnswer: true })}
              />
              Đúng
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={q.correctAnswer === false}
                onChange={() => setQ({ ...q, correctAnswer: false })}
              />
              Sai
            </label>
          </div>
        )}

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
          <Plus size={16} /> Thêm câu
        </button>
      </form>
    );
  };

  const QuestionPreview = ({ question, index, onRemove }) => {
    const typeLabel =
      question.type === "truefalse" ? "Đúng/Sai" :
      question.type === "truefalse_many" ? "Đúng/Sai (nhiều)" :
      question.type === "single" ? "Một đáp án" : "Nhiều đáp án";

    return (
      <div className="p-3 border rounded bg-white hover:bg-slate-50 transition">
        <div className="flex justify-between items-center text-sm text-slate-600">
          <span><strong>Câu {index + 1}</strong> • {typeLabel}</span>
          {onRemove && (
            <button className="text-red-600 hover:underline" onClick={() => onRemove(question.id)}>Xóa</button>
          )}
        </div>
        {question.type === "truefalse_many" ? (
          <div className="mt-1">
            {question.question && <div className="font-medium mb-1">{question.question}</div>}
            <div className="space-y-1 text-sm">
              {question.statements?.map((stmt, i) => (
                <div key={i} className="flex gap-2">
                  <span className={question.correctAnswers[i] ? "text-green-600" : "text-red-600"}>
                    {question.correctAnswers[i] ? "Đúng" : "Sai"}
                  </span>
                  <span>{stmt}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-1 text-slate-800">{question.question}</div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-8 space-y-6">
      <div className="tw-admin-header bg-gradient-to-r from-indigo-500 to-purple-600 mb-6 p-6 rounded-xl">
        <h2 className="tw-admin-title">Tạo đề thi trắc nghiệm</h2>
        <div className="flex justify-center gap-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                step === n 
                  ? "bg-white text-indigo-600" 
                  : "bg-white/20 text-white"
              }`}
            >
              Bước {n}
            </div>
          ))}
        </div>
      </div>

      {/* Bước 1: Thông tin đề */}
      {step === 1 && (
        <ExamInfoForm examData={examData} setExamData={setExamData} loadingSubjects={loadingSubjects} />
      )}

      {/* Bước 2: Nhập câu hỏi */} 
      {step === 2 && (
        <div className="space-y-5">
          <div className="flex gap-2">
            <label className="tw-btn tw-btn-secondary flex items-center gap-2 cursor-pointer">
              <UploadCloud size={18} /> Import JSON/CSV/XLSX
              <input
                type="file"
                onChange={handleFileImport}
                accept=".json,.csv,.xls,.xlsx"
                className="hidden"
              />
            </label>
            <label className="tw-btn tw-btn-secondary flex items-center gap-2 cursor-pointer">
              <FileText size={18} /> PDF
              <input
                type="file"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  if (!file.type.includes('pdf')) {
                    toast.error('Vui lòng chọn file PDF');
                    return;
                  }

                  const loadingToast = toast.loading('Đang tải file lên...');
                  try {
                    const response = await uploadApi.uploadPdf(file, { examCode: examData.id, examTitle: examData.title });

                    if (!response.success) {
                      throw new Error(response.message || 'Upload failed');
                    }

                    const nextExamData = {
                      ...examData,
                      linkPdf: response.url,
                      linkPdfKey: response.key
                    };
                    setExamData(prev => ({
                      ...prev,
                      linkPdf: response.url,
                      linkPdfKey: response.key
                    }));

                    toast.dismiss(loadingToast);
                    toast.success('Tải file thành công!');
                    
                    navigate(`/admin/FillAnswerPDF`, { state: { data: nextExamData , address: response.url, key: response.key} });
                  } catch (error) {
                    console.error('Upload error:', error);
                    toast.dismiss(loadingToast);
                    toast.error('Lỗi khi tải file lên: ' + (error.response?.data?.message || error.message));
                  }
                }}
                accept=".pdf"
                className="hidden"
              />
            </label>
          </div>

          <QuestionForm
            key={editingQuestion?.id || 'create-question-form'}
            initialData={editingQuestion || {}}
            onSubmit={handleQuestionSubmit}
            onCancel={() => setEditingQuestion(null)}
            submitLabel={editingQuestion ? 'Cập nhật câu hỏi' : 'Thêm câu hỏi'}
            uploadCtx={{
              examId: examData.id,
              examTitle: examData.title,
              questionNo: (editingQuestion
                ? Math.max(1, (examData.questions || []).findIndex(q => q.id === editingQuestion.id) + 1)
                : (examData.questions?.length || 0) + 1)
            }}
          />

          <div>
            <h4 className="tw-label mb-2">
              Danh sách câu hỏi ({examData.questions.length})
            </h4>
            <QuestionList
              questions={examData.questions}
              onRemove={removeQuestion}
              onEdit={handleQuestionEdit}
            />
          </div>
        </div>
      )}

      {/* Bước 3: Xem lại */}
      {step === 3 && (
        <div className="space-y-5">
          <ExamInfoView exam={examData} />
          <div className="flex gap-4">
            <button
              onClick={() => setShowPrintPreview(true)}
              className="tw-btn tw-btn-secondary flex items-center gap-2"
            >
              <Printer size={18} /> Xem mẫu in
            </button>
          </div>
      {showPrintPreview && (
        <PrintPreview exam={examData} onClose={() => setShowPrintPreview(false)} />
      )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          className={`tw-btn ${step === 1 ? "invisible" : "tw-btn-secondary"}`}
        >
          <ArrowLeft size={16} /> Quay lại
        </button>

        {step < 3 ? (
          <button
            onClick={handleNextStep}
            className="tw-btn tw-btn-primary"
          >
            Tiếp tục <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            className="tw-btn bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Save size={18} /> {isEdit ? 'Cập nhật' : 'Hoàn tất'}
          </button>
        )}
      </div>

      {/* Score mismatch modal should be available on any step */}
      {showMismatchModal && (
        <ScoreMismatchModal
          open={showMismatchModal}
          onClose={() => setShowMismatchModal(false)}
          totalScore={examData.totalScore}
          questionSum={examMapper.sumQuestionScores(examData.questions)}
          questionCount={examData.questions.length}
          onDistribute={handleResolveMismatchDistribute}
          onAlignTotal={mismatchContext === 'save' ? handleResolveMismatchAlignTotal : undefined}
          distributeLabel={mismatchContext === 'step2' ? 'Chia đều tổng điểm cho các câu và tiếp tục' : undefined}
        />
      )}
    </div>
  );
};

export default CreateExamMCQPage;
