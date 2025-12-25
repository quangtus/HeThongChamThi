import React, { useRef, useState, useEffect } from 'react';
import { Printer, X, Loader2, FileText, ClipboardList } from 'lucide-react';
import { examEssayApi } from '../../api/adminApi';

/**
 * Component xem trước và xuất PDF đề thi tự luận
 * @param {Object} props
 * @param {Object} props.exam - Đề thi tự luận cần in (chỉ cần essay_id)
 * @param {Function} props.onClose - Callback khi đóng modal
 */
const EssayPrintPreview = ({ exam, onClose }) => {
  const examPrintRef = useRef();
  const criteriaPrintRef = useRef();
  const [showStudentInfo, setShowStudentInfo] = useState(true);
  const [showSampleAnswer, setShowSampleAnswer] = useState(false);
  const [exportingExam, setExportingExam] = useState(false);
  const [exportingCriteria, setExportingCriteria] = useState(false);
  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState(null);
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState('exam'); // 'exam' hoặc 'criteria'

  // Load đầy đủ dữ liệu đề thi kèm câu hỏi
  useEffect(() => {
    const loadExamData = async () => {
      if (!exam?.essay_id) {
        setError('Không có thông tin đề thi');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await examEssayApi.getExamEssayById(exam.essay_id);
        if (response.success && response.data) {
          setExamData(response.data);
        } else {
          setError('Không thể tải dữ liệu đề thi');
        }
      } catch (err) {
        console.error('Error loading exam data:', err);
        setError('Lỗi khi tải dữ liệu đề thi');
      } finally {
        setLoading(false);
      }
    };

    loadExamData();
  }, [exam?.essay_id]);

  // Xuất PDF đề thi
  const handleExportExamPdf = async () => {
    if (!examPrintRef.current || !examData) return;
    
    try {
      setExportingExam(true);
      await new Promise(r => setTimeout(r, 100));
      
      const html2pdf = (await import('html2pdf.js')).default;
      const element = examPrintRef.current;
      const filename = `${(examData.exam_code || 'de_thi').toString().replace(/[^a-zA-Z0-9-_]+/g, '-')}_de_thi.pdf`;
      
      const opt = {
        margin: [15, 15, 15, 15],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], before: '.page-break-before', after: '.page-break-after', avoid: '.avoid-break' }
      };
      
      await html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error('Export PDF error:', e);
      window.print();
    } finally {
      setExportingExam(false);
    }
  };

  // Xuất PDF tiêu chí chấm
  const handleExportCriteriaPdf = async () => {
    if (!criteriaPrintRef.current || !examData) return;
    
    try {
      setExportingCriteria(true);
      await new Promise(r => setTimeout(r, 100));
      
      const html2pdf = (await import('html2pdf.js')).default;
      const element = criteriaPrintRef.current;
      const filename = `${(examData.exam_code || 'de_thi').toString().replace(/[^a-zA-Z0-9-_]+/g, '-')}_tieu_chi_cham.pdf`;
      
      const opt = {
        margin: [15, 15, 15, 15],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], before: '.page-break-before', after: '.page-break-after', avoid: '.avoid-break' }
      };
      
      await html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error('Export PDF error:', e);
      window.print();
    } finally {
      setExportingCriteria(false);
    }
  };

  // Parse grading_criteria từ JSON - hỗ trợ cả 'criteria' và 'items'
  const parseGradingCriteria = (criteria) => {
    if (!criteria) return { items: [], notes: '' };
    
    let parsed = criteria;
    if (typeof criteria === 'string') {
      try {
        parsed = JSON.parse(criteria);
      } catch {
        return { items: [], notes: criteria };
      }
    }
    
    // Hỗ trợ cả key 'criteria' và 'items'
    const items = Array.isArray(parsed.criteria) 
      ? parsed.criteria 
      : (Array.isArray(parsed.items) ? parsed.items : []);
    
    return {
      items: items,
      notes: parsed.notes || ''
    };
  };

  const questions = Array.isArray(examData?.questions) ? examData.questions : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[950px] max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center flex-wrap gap-2">
          <h3 className="font-bold text-lg">Xem trước & Xuất PDF đề thi tự luận</h3>
          <div className="flex gap-2 items-center flex-wrap">
            {/* Toggle xem đề thi / tiêu chí */}
            <div className="flex rounded-lg border overflow-hidden mr-2">
              <button
                onClick={() => setPreviewMode('exam')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  previewMode === 'exam' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                📄 Đề thi
              </button>
              <button
                onClick={() => setPreviewMode('criteria')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  previewMode === 'criteria' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                📋 Tiêu chí chấm
              </button>
            </div>

            {previewMode === 'exam' && (
              <label className="flex items-center gap-1 text-sm mr-2">
                <input
                  type="checkbox"
                  checked={showStudentInfo}
                  onChange={(e) => setShowStudentInfo(e.target.checked)}
                />
                Thông tin thí sinh
              </label>
            )}

            {previewMode === 'criteria' && (
              <label className="flex items-center gap-1 text-sm mr-2">
                <input
                  type="checkbox"
                  checked={showSampleAnswer}
                  onChange={(e) => setShowSampleAnswer(e.target.checked)}
                />
                Đáp án mẫu
              </label>
            )}
            
            {previewMode === 'exam' ? (
              <button 
                onClick={handleExportExamPdf} 
                disabled={loading || exportingExam || !examData}
                className="tw-btn tw-btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {exportingExam ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <FileText size={18} />
                )}
                Xuất đề thi
              </button>
            ) : (
              <button 
                onClick={handleExportCriteriaPdf} 
                disabled={loading || exportingCriteria || !examData}
                className="tw-btn tw-btn-secondary flex items-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: '#10b981', borderColor: '#10b981', color: 'white' }}
              >
                {exportingCriteria ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ClipboardList size={18} />
                )}
                Xuất tiêu chí chấm
              </button>
            )}
            
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded ml-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={40} className="animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600">Đang tải đề thi...</span>
            </div>
          ) : error ? (
            <div className="text-center py-20 text-red-500">{error}</div>
          ) : (
            <>
              {/* === PREVIEW ĐỀ THI === */}
              <div style={{ display: previewMode === 'exam' ? 'block' : 'none' }}>
                <div ref={examPrintRef} className="bg-white p-4" style={{ fontFamily: 'Times New Roman, serif' }}>
                  {/* Header đề thi */}
                  <div className="text-center mb-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-left text-sm">
                        <p className="font-semibold">TRƯỜNG ĐẠI HỌC</p>
                        <p>Khoa: _______________</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold">ĐỀ THI</p>
                        <p>Mã đề: <strong>{examData.exam_code}</strong></p>
                      </div>
                    </div>
                    
                    <h2 className="font-bold text-xl uppercase mt-4">
                      {examData.exam_title || `ĐỀ THI ${examData.exam_code}`}
                    </h2>
                    <p className="text-base mt-1">Môn: <strong>{examData.subject_name || '---'}</strong></p>
                    <p className="text-sm">Thời gian làm bài: <strong>{examData.time_limit || 0}</strong> phút | Tổng điểm: <strong>{examData.total_score || 0}</strong> điểm</p>
                  </div>

                  {/* Hướng dẫn làm bài */}
                  {examData.instructions && (
                    <div className="mb-4 p-2 bg-gray-50 border text-sm">
                      <p className="font-semibold mb-1">Hướng dẫn làm bài:</p>
                      <p className="whitespace-pre-wrap">{examData.instructions}</p>
                    </div>
                  )}

                  {/* Thông tin thí sinh */}
                  {showStudentInfo && (
                    <div className="mb-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm border p-3">
                      <div>Họ và tên: ...............................................</div>
                      <div>Ngày thi: ................................</div>
                      <div>Mã SV/SBD: ........................................</div>
                      <div>Lớp: ......................................</div>
                      <div>Phòng thi: ..........................................</div>
                      <div>Chữ ký GT: ...........................</div>
                    </div>
                  )}

                  {/* Phần câu hỏi */}
                  <div className="mb-4">
                    <h3 className="font-bold text-base border-b-2 border-black pb-1 mb-4">NỘI DUNG ĐỀ THI</h3>
                    
                    {questions.length === 0 ? (
                      <div className="text-center text-gray-500 py-6">
                        Đề thi chưa có câu hỏi nào.
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {questions.map((q, idx) => (
                          <div
                            key={q.question_id || idx}
                            className="avoid-break"
                          >
                            <p className="font-bold mb-2">
                              Câu {q.question_number || idx + 1} ({q.max_score || 0} điểm):
                            </p>
                            <div className="whitespace-pre-wrap pl-4 leading-relaxed">
                              {q.question_text}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-8 pt-3 border-t-2 border-black text-center text-sm">
                    <p className="font-bold">--- HẾT ---</p>
                    <p className="mt-2 italic">Thí sinh không được sử dụng tài liệu. Giám thị không giải thích gì thêm.</p>
                  </div>
                </div>
              </div>

              {/* === PREVIEW TIÊU CHÍ CHẤM === */}
              <div style={{ display: previewMode === 'criteria' ? 'block' : 'none' }}>
                <div ref={criteriaPrintRef} className="bg-white p-4" style={{ fontFamily: 'Times New Roman, serif' }}>
                  {/* Header */}
                  <div className="text-center mb-6">
                    <h2 className="font-bold text-xl uppercase">
                      TIÊU CHÍ CHẤM ĐIỂM
                    </h2>
                    <p className="text-base mt-1">Đề thi: <strong>{examData.exam_code}</strong> - Môn: <strong>{examData.subject_name || '---'}</strong></p>
                    <p className="text-sm">Tổng điểm: <strong>{examData.total_score || 0}</strong> điểm</p>
                  </div>

                  {/* Tiêu chí từng câu */}
                  {questions.length === 0 ? (
                    <div className="text-center text-gray-500 py-6">
                      Đề thi chưa có câu hỏi nào.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {questions.map((q, idx) => {
                        const criteria = parseGradingCriteria(q.grading_criteria);
                        const hasCriteria = criteria.items.length > 0 || criteria.notes;
                        
                        return (
                          <div
                            key={q.question_id || idx}
                            className="border rounded p-4 avoid-break"
                          >
                            <div className="flex justify-between items-start mb-3 border-b pb-2">
                              <p className="font-bold text-blue-700">
                                Câu {q.question_number || idx + 1}
                              </p>
                              <span className="font-semibold text-red-600">
                                {q.max_score || 0} điểm
                              </span>
                            </div>

                            {/* Nội dung câu hỏi (tóm tắt) */}
                            <div className="text-sm text-gray-600 mb-3 italic">
                              <strong>Đề bài:</strong> {q.question_text.length > 150 
                                ? q.question_text.substring(0, 150) + '...' 
                                : q.question_text}
                            </div>

                            {/* Tiêu chí chấm */}
                            {hasCriteria ? (
                              <div className="bg-blue-50 rounded p-3">
                                <p className="font-semibold text-blue-800 mb-2">📋 Tiêu chí chấm điểm:</p>
                                
                                {criteria.items.length > 0 && (
                                  <ul className="space-y-3 text-sm">
                                    {criteria.items.map((item, cIdx) => (
                                      <li key={cIdx} className="flex flex-col gap-2">
                                        <div className="flex items-start gap-2">
                                          <span className="font-medium text-blue-700 min-w-[24px]">{cIdx + 1}.</span>
                                          <span className="flex-1">{typeof item === 'string' ? item : (item.text || '')}</span>
                                        </div>
                                        {item.attachmentUrl && (
                                          <div className="ml-7 mt-1">
                                            <img 
                                              src={item.attachmentUrl} 
                                              alt={`Tiêu chí ${cIdx + 1}`}
                                              className="w-full max-w-[600px] rounded border shadow-sm"
                                              style={{ minHeight: '150px', objectFit: 'contain', backgroundColor: '#fff' }}
                                            />
                                          </div>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                
                                {criteria.notes && (
                                  <div className="mt-2 pt-2 border-t border-blue-200 text-sm">
                                    <span className="font-medium text-blue-700">Ghi chú:</span> {criteria.notes}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-gray-400 italic text-sm">
                                (Chưa có tiêu chí chấm cho câu này)
                              </div>
                            )}

                            {/* Đáp án mẫu */}
                            {showSampleAnswer && q.sample_answer && (
                              <div className="mt-3 p-3 bg-green-50 rounded">
                                <p className="font-semibold text-green-700 mb-1">📝 Đáp án mẫu:</p>
                                <p className="text-sm text-green-800 whitespace-pre-wrap">
                                  {q.sample_answer}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-6 pt-3 border-t text-center text-sm text-gray-500">
                    <p>--- HẾT TIÊU CHÍ CHẤM ---</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EssayPrintPreview;
