import React from 'react';

const typeLabels = {
  single: 'Một đáp án',
  multiple: 'Nhiều đáp án',
  truefalse: 'Đúng/Sai',
  truefalse_many: 'Đúng/Sai (nhiều)'
};

const ExamInfoView = ({ exam, allowPrint = false, onPrint = () => {} }) => {
  if (!exam) return null;
  const hasPdf = Boolean(exam.linkPdf);
  const questions = Array.isArray(exam.questions) ? exam.questions : [];
  const renderQuestionList = ({ scrollable = true } = {}) => (
    <div className={`space-y-3 ${scrollable ? 'max-h-[520px] overflow-y-auto pr-1' : ''}`}>
      {questions.map((q, idx) => {
        const questionType = typeLabels[q.type] || 'Một đáp án';
        return (
          <div key={q.id ?? idx} className="p-3 border rounded-xl bg-white shadow-sm">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="font-semibold text-slate-800">
                  Câu {idx + 1}: {q.question}
                </div>
                <div className="text-xs text-slate-500 flex gap-2 mt-1">
                  <span>{questionType}</span>
                  <span>• {Number(q.score ?? 1)} điểm</span>
                </div>
              </div>
              {q.imageUrl && (
                <img
                  src={q.imageUrl}
                  alt={`Hình câu hỏi ${idx + 1}`}
                  className="max-h-32 rounded border object-contain"
                />
              )}
            </div>

            {q.explanation && (
              <div className="mt-2 text-xs text-slate-500 italic">
                Giải thích: {q.explanation}
              </div>
            )}

            {q.type === 'truefalse_many' && Array.isArray(q.statements) && (
              <div className="mt-3 space-y-2 text-sm">
                {q.statements.map((stmt, stmtIdx) => (
                  <div key={stmt.id ?? stmtIdx} className="flex items-start gap-3">
                    <span className={stmt.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {stmt.isCorrect ? 'Đúng' : 'Sai'}
                    </span>
                    <div className="flex-1">
                      <div>{stmt.text}</div>
                      {stmt.imageUrl && (
                        <img
                          src={stmt.imageUrl}
                          alt={`Phát biểu ${stmtIdx + 1}`}
                          className="mt-2 max-h-24 rounded border object-contain"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(q.type === 'single' || q.type === 'multiple') && Array.isArray(q.options) && (
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {q.options.map((opt, optIdx) => {
                  const isCorrect = q.type === 'single'
                    ? q.correctAnswer === optIdx || opt.isCorrect
                    : (Array.isArray(q.correctAnswers) && q.correctAnswers.includes(optIdx)) || opt.isCorrect;
                  return (
                    <div
                      key={opt.id ?? optIdx}
                      className={`flex items-start gap-3 rounded-md border p-2 ${isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}
                    >
                      <div className="font-semibold min-w-[2rem]">
                        {String.fromCharCode(65 + optIdx)}.
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>{opt.text}</div>
                        {opt.imageUrl && (
                          <img
                            src={opt.imageUrl}
                            alt={`Đáp án ${optIdx + 1}`}
                            className="max-h-24 rounded border object-contain"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {q.type === 'truefalse' && (
              <div className="mt-2 text-sm text-green-600 font-semibold">
                Đáp án đúng: {q.correctAnswer ? 'Đúng' : 'Sai'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="p-4 border rounded bg-slate-50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg">{exam.title}</h3>
            <p className="text-sm text-slate-600 space-x-2">
              <span>Mã đề: {exam.id}</span>
              <span>• {exam.subject?.subject_name || '-'}</span>
              <span>• {exam.duration} phút</span>
              <span>• {exam.totalQuestions ?? exam.questions?.length ?? 0} câu</span>
              <span>• {exam.totalScore ?? 0} điểm</span>
            </p>
          </div>
          {allowPrint && (
            <button
              type="button"
              className="tw-btn tw-btn-secondary whitespace-nowrap"
              onClick={onPrint}
            >
              In đề
            </button>
          )}
        </div>
        {exam.description && <p className="mt-2">{exam.description}</p>}
        {hasPdf && (
          <div className="mt-4 bg-white border rounded-lg p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <div className="text-sm text-slate-500 font-semibold uppercase tracking-wide">File PDF đề thi</div>
                <div className="text-xs text-slate-600 truncate" title={exam.linkPdf}>
                  {exam.linkPdf}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={exam.linkPdf}
                  className="tw-btn tw-btn-secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mở PDF
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasPdf ? (
        <div className="border rounded-xl bg-white overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
            Xem đề thi từ PDF
          </div>
          <div className="flex flex-col lg:flex-row">
            <div className="lg:w-2/3 h-[600px] lg:h-[700px] border-b lg:border-b-0 lg:border-r">
              <iframe
                title="exam-pdf-preview"
                src={exam.linkPdf}
                className="w-full h-full border-0"
              />
            </div>
            <div className="lg:w-1/3 bg-slate-50 p-4 h-[320px] lg:h-[700px] overflow-y-auto">
              <h4 className="tw-label mb-3">Danh sách câu hỏi</h4>
              {questions.length > 0 ? (
                renderQuestionList({ scrollable: false })
              ) : (
                <div className="text-sm text-slate-500">Chưa có câu hỏi cho đề thi này.</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h4 className="tw-label mb-2">Danh sách câu hỏi</h4>
          {questions.length > 0 ? (
            renderQuestionList({ scrollable: false })
          ) : (
            <div className="text-sm text-slate-500">Chưa có câu hỏi cho đề thi này.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExamInfoView;
