import React from 'react';

const typeLabels = {
  single: 'Một đáp án',
  multiple: 'Nhiều đáp án',
  truefalse: 'Đúng/Sai',
  truefalse_many: 'Đúng/Sai (nhiều)'
};

const QuestionItem = ({ q, index, onRemove, onEdit }) => {
  const typeLabel = typeLabels[q.type] || 'Một đáp án';
  const options = Array.isArray(q.options) ? q.options : [];
  const statements = Array.isArray(q.statements) ? q.statements : [];

  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm">
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="font-semibold text-slate-800">
            Câu {index + 1}: {q.question}
          </div>
          <div className="text-xs text-slate-500 flex gap-2 mt-1">
            <span>{typeLabel}</span>
            <span>• {Number(q.score ?? 1)} điểm</span>
          </div>
        </div>
        {q.imageUrl && (
          <img
            src={q.imageUrl}
            alt={`question-${index + 1}`}
            className="max-h-28 rounded border object-contain"
          />
        )}
      </div>

      {q.explanation && (
        <div className="mt-2 text-xs text-slate-500 italic">
          Giải thích: {q.explanation}
        </div>
      )}

      {q.type === 'truefalse_many' && (
        <div className="mt-3 space-y-2 text-sm">
          {statements.map((stmt, stmtIdx) => (
            <div key={stmt.id ?? stmtIdx} className="flex items-start gap-3">
              <span className={stmt.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {stmt.isCorrect ? 'Đúng' : 'Sai'}
              </span>
              <div className="flex-1 space-y-2">
                <div>{stmt.text}</div>
                {stmt.imageUrl && (
                  <img
                    src={stmt.imageUrl}
                    alt={`statement-${stmtIdx + 1}`}
                    className="max-h-24 rounded border object-contain"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(q.type === 'single' || q.type === 'multiple') && (
        <div className="mt-3 space-y-2 text-sm">
          {options.map((opt, optIdx) => {
            const isCorrect = q.type === 'single'
              ? q.correctAnswer === optIdx || opt.isCorrect
              : (Array.isArray(q.correctAnswers) && q.correctAnswers.includes(optIdx)) || opt.isCorrect;
            return (
              <div
                key={opt.id ?? optIdx}
                className={`flex items-start gap-3 rounded border p-2 ${isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}
              >
                <div className="font-semibold min-w-[2rem]">
                  {String.fromCharCode(65 + optIdx)}.
                </div>
                <div className="flex-1 space-y-2">
                  <div>{opt.text}</div>
                  {opt.imageUrl && (
                    <img
                      src={opt.imageUrl}
                      alt={`option-${optIdx + 1}`}
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
          Đáp án: {q.correctAnswer ? 'Đúng' : 'Sai'}
        </div>
      )}

      <div className="flex justify-end mt-3 gap-2">
        {onEdit && (
          <button className="tw-btn tw-btn-secondary" onClick={() => onEdit?.(q.id)}>
            Sửa
          </button>
        )}
        <button className="tw-btn tw-btn-secondary" onClick={() => onRemove?.(q.id)}>
          Xóa
        </button>
      </div>
    </div>
  );
};

const QuestionList = ({ questions, onRemove, onEdit, listClassName }) => {
  const wrapperClass = `space-y-3 ${listClassName ?? 'max-h-80 overflow-y-auto pr-1'}`;
  return (
    <div className={wrapperClass}>
      {(questions || []).map((q, i) => (
        <QuestionItem key={q.id ?? i} q={q} index={i} onRemove={onRemove} onEdit={onEdit} />
      ))}
    </div>
  );
};

export default QuestionList;
