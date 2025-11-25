import React, { useRef } from 'react';
import { Printer, X } from 'lucide-react';

const getOptionLabel = (option, index) => {
  if (!option) return `${String.fromCharCode(65 + index)}.`;
  const label = option.text ?? option.answer_text ?? '';
  return `${String.fromCharCode(65 + index)}. ${label}`;
};

const PrintPreview = ({ exam = {}, onClose }) => {
  const printRef = useRef();
  const [showExplanation, setShowExplanation] = React.useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = React.useState(false);
  const [showStudentInfo, setShowStudentInfo] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);

  const handleExportPdf = async () => {
    if (!printRef.current) return;
    try {
      setExporting(true);
      await new Promise(r => setTimeout(r, 50)); // allow UI to update
      const html2pdf = (await import('html2pdf.js')).default;
      const element = printRef.current;
      const filename = `${(exam?.title || 'de_thi').toString().replace(/[^a-zA-Z0-9-_]+/g, '-')}.pdf`;
      const opt = {
        margin: 10,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css'] }
      };
      await html2pdf().set(opt).from(element).save();
    } catch (e) {
      // Fallback: open print dialog if export fails
      window.print();
    } finally {
      setExporting(false);
    }
  };

  const questions = Array.isArray(exam.questions) ? exam.questions : [];
  const subjectName = exam.subject?.subject_name || exam.subject?.name || '---';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[900px] max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="font-bold text-lg">Mẫu in đề thi</h3>
          <div className="flex gap-3 items-center">
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={showStudentInfo}
                onChange={(e) => setShowStudentInfo(e.target.checked)}
              />
              Hiển thị thông tin thí sinh/ca thi
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={showCorrectAnswers}
                onChange={(e) => setShowCorrectAnswers(e.target.checked)}
              />
              Hiển thị đáp án đúng
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={showExplanation}
                onChange={(e) => setShowExplanation(e.target.checked)}
              />
              Hiển thị giải thích
            </label>
            <button onClick={handleExportPdf} className="tw-btn tw-btn-primary flex items-center gap-2">
              <Printer size={18} /> Xuất PDF
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          <div ref={printRef} className="print:text-black">
            <div className="text-center mb-8 print:mb-4 space-y-1">
              <h2 className="font-bold text-2xl uppercase">{exam.title || 'ĐỀ THI'}</h2>
              <p>Môn: {subjectName}</p>
              <p>Thời gian: {exam.duration || 0} phút</p>
              <p>Mã đề: {exam.id || '---'}</p>
              {exam.totalScore != null && (
                <p>Tổng điểm: {exam.totalScore}</p>
              )}
            </div>

            {showStudentInfo && (
              <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div>
                  Trường: <span className="inline-block align-baseline min-w-[220px] border-b border-dashed">&nbsp;</span>
                </div>
                <div>
                  Ngày thi: <span className="inline-block min-w-[160px] border-b border-dashed">&nbsp;</span>
                </div>
                <div>
                  Họ và tên: <span className="inline-block min-w-[220px] border-b border-dashed">&nbsp;</span>
                </div>
                <div>
                  Lớp/Mã lớp: <span className="inline-block min-w-[160px] border-b border-dashed">&nbsp;</span>
                </div>
                <div>
                  Mã SV/SBD: <span className="inline-block min-w-[180px] border-b border-dashed">&nbsp;</span>
                </div>
                <div>
                  Ca thi/Phòng thi: <span className="inline-block min-w-[180px] border-b border-dashed">&nbsp;</span>
                </div>
                <div className="col-span-2">
                  Chữ ký thí sinh: <span className="inline-block min-w-[260px] border-b border-dashed">&nbsp;</span>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {questions.map((q, idx) => {
                const type = q.type || 'single';
                const options = Array.isArray(q.options) ? q.options : [];
                const statements = Array.isArray(q.statements) ? q.statements : [];
                const answers = Array.isArray(q.answers) ? q.answers : [];

                return (
                  <div
                    key={q.id ?? idx}
                    className={`p-4 border rounded-lg ${exporting ? 'border-0 p-2 rounded-none' : ''}`}
                    style={{ breakInside: 'avoid', pageBreakInside: 'avoid', WebkitColumnBreakInside: 'avoid' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-base">
                          <span>Câu {idx + 1}:</span> {q.question || '(Chưa có nội dung)'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Loại: {type === 'single'
                            ? 'Một đáp án'
                            : type === 'multiple'
                              ? 'Nhiều đáp án'
                              : type === 'truefalse'
                                ? 'Đúng / Sai'
                                : 'Đúng / Sai (nhiều phát biểu)'}
                          {q.score != null && ` • ${q.score} điểm`}
                        </p>
                        {showCorrectAnswers && (() => {
                          const typeLabel = q.type || 'single';
                          if (typeLabel === 'truefalse_many') return null; // tóm tắt theo từng phát biểu bên dưới
                          let summary = '';
                          if (typeLabel === 'single') {
                            let idx = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
                            if ((options || []).length && options.some(o => o?.isCorrect)) {
                              idx = options.findIndex(o => o?.isCorrect);
                              if (idx < 0) idx = 0;
                            }
                            summary = String.fromCharCode(65 + idx);
                          } else if (typeLabel === 'multiple') {
                            let indices = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
                            if (!indices.length && (options || []).length) {
                              indices = options.reduce((acc, opt, i) => opt?.isCorrect ? [...acc, i] : acc, []);
                            }
                            summary = indices.length ? indices.map(i => String.fromCharCode(65 + i)).join(', ') : '-';
                          } else if (typeLabel === 'truefalse') {
                            const value = typeof q.correctAnswer === 'boolean'
                              ? q.correctAnswer
                              : (answers.some(a => a?.isCorrect));
                            summary = value ? 'Đúng' : 'Sai';
                          }
                          return (
                            <div className="text-sm text-emerald-600 font-medium">
                              • Đáp án đúng: {summary}
                            </div>
                          );
                        })()}
                      </div>
                      {q.imageUrl && (
                        <img
                          src={q.imageUrl}
                          alt={`question-${idx + 1}`}
                          className="max-h-28 rounded border ml-4 object-contain"
                        />
                      )}
                    </div>

                    {type === 'truefalse' && (
                      <div className="mt-3 space-x-8">
                        {(answers.length ? answers : [
                          { text: 'Đúng' },
                          { text: 'Sai' }
                        ]).map((ans, ansIdx) => (
                          <label key={ans.id ?? ansIdx} className="inline-flex items-center gap-2">
                            {!exporting && (<input type="radio" name={`q${idx}`} className="print:border" />)}
                            {String.fromCharCode(65 + ansIdx)}. {ans.text ?? ''}
                            {showCorrectAnswers && ans.isCorrect && (
                              <span className="text-emerald-600 font-medium">(Đúng)</span>
                            )}
                          </label>
                        ))}
                      </div>
                    )}

                    {type === 'truefalse_many' && (
                      <div className="mt-3 space-y-3">
                        {statements.map((stmt, stmtIdx) => (
                          <div key={stmt.id ?? stmtIdx} className="flex flex-col gap-1">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">
                                {stmtIdx + 1}. {stmt.text ?? ''}
                              </span>
                            </div>
                            <div className="space-x-6">
                            <label className="inline-flex items-center gap-1">
                              {!exporting && (<input type="radio" name={`q${idx}_${stmtIdx}`} />)} Đúng
                              {showCorrectAnswers && stmt.isCorrect && (
                                <span className="text-emerald-600 font-medium">(Đ)</span>
                              )}
                            </label>
                            <label className="inline-flex items-center gap-1">
                              {!exporting && (<input type="radio" name={`q${idx}_${stmtIdx}`} />)} Sai
                              {showCorrectAnswers && !stmt.isCorrect && (
                                <span className="text-emerald-600 font-medium">(S)</span>
                              )}
                            </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(type === 'single' || type === 'multiple') && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {options.map((option, optionIdx) => (
                          <label key={option.id ?? optionIdx} className="flex items-start gap-2">
                            {!exporting && (
                              <input
                                type={type === 'single' ? 'radio' : 'checkbox'}
                                name={`q${idx}`}
                                className="mt-1"
                              />
                            )}
                            <div className="space-y-1">
                              <span className="font-medium">
                                {getOptionLabel(option, optionIdx)}
                                {showCorrectAnswers && (
                                  (option?.isCorrect || (type === 'single' && Number(q.correctAnswer) === optionIdx) || (type === 'multiple' && Array.isArray(q.correctAnswers) && q.correctAnswers.includes(optionIdx))) && (
                                  <span className="text-emerald-600 font-medium ml-2">(Đáp án đúng)</span>
                                  )
                                )}
                              </span>
                              {option?.imageUrl && (
                                <img
                                  src={option.imageUrl}
                                  alt={`option-${optionIdx + 1}`}
                                  className="max-h-24 rounded border object-contain"
                                />
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    {showExplanation && q.explanation && (
                      <div className={`mt-3 p-3 ${exporting ? '' : 'bg-gray-50 rounded border'} text-sm text-gray-600`}>
                        <strong>Giải thích:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}

              {questions.length === 0 && (
                <div className="text-center text-gray-500 text-sm">
                  Chưa có câu hỏi nào trong đề thi.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintPreview;
