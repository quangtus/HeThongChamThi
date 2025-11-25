import React, { useEffect, useState } from 'react';


// Helper: build fixed labels for choices
const buildLabels = (mode = 'ABC', count = 4) => {
  if (mode === '123') {
    return Array.from({ length: count }, (_, i) => String(i + 1));
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  return Array.from({ length: count }, (_, i) => alphabet[i] || String(i + 1));
};

function QuestionForm({ index, questionData, onQuestionChange, onRemove, isPdfMode = false }) {
  // State 'q' giờ là state nội bộ, chỉ dành cho form này
  const [q, setQ] = useState(questionData);

  // Sử dụng useEffect chỉ để đồng bộ với questionData từ props
  useEffect(() => {
    if (JSON.stringify(questionData) !== JSON.stringify(q)) {
      setQ(questionData);
    }
  }, [questionData]);

  // Handle any changes to the question data
  const handleQuestionChange = (newData) => {
    setQ(newData);
    onQuestionChange(index, newData);
  };


  const addOption = () => {
    if (isPdfMode) return; // fixed choices in PDF mode
    const newData = { ...q, options: [...q.options, ''] };
    handleQuestionChange(newData);
  };

  const addStatement = () => {
    const newData = {
      ...q,
      statements: [...q.statements, ''],
      correctAnswers: [...(q.correctAnswers || []), false]
    };
    handleQuestionChange(newData);
  };

  const removeStatement = (idx) => {
    const minStatements = 2;
    const currentCount = (q.statements || []).length;
    if (currentCount <= minStatements) return; // keep at least two
    const newStatements = q.statements.filter((_, i) => i !== idx);
    const newCorrect = (q.correctAnswers || []).filter((_, i) => i !== idx);
    handleQuestionChange({ ...q, statements: newStatements, correctAnswers: newCorrect });
  };

  // Keep options in sync with chosen label mode + count for PDF flows (per question)
  useEffect(() => {
    if (!isPdfMode) return;
    if (q.type !== 'single' && q.type !== 'multiple') return;
    const mode = q.pdfLabelType || 'ABC';
    const baseCount = (Array.isArray(q.options) && q.options.length) ? q.options.length : 4;
    const count = Math.max(2, Math.min(Number(q.pdfOptionCount ?? baseCount), 10));
    const labels = buildLabels(mode, count);
    const current = Array.isArray(q.options) ? q.options : [];
    // Only update if different to avoid loops
    const needUpdate = current.length !== count || current.some((v, i) => v !== labels[i]);
    if (needUpdate) {
      const adjusted = { ...q, options: labels, pdfLabelType: mode, pdfOptionCount: count };
      if (q.type === 'single') {
        const idx = Number(q.correctAnswer || 0);
        adjusted.correctAnswer = Math.max(0, Math.min(idx, count - 1));
      } else if (q.type === 'multiple') {
        const arr = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
        adjusted.correctAnswers = arr.filter((i) => i < count).sort();
      }
      handleQuestionChange(adjusted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPdfMode, q.type, q.pdfLabelType, q.pdfOptionCount]);

  return (
    <div className="bg-white rounded-xl p-4 mb-6 shadow-md w-full border border-gray-200">
      <div className='flex justify-between mb-4'>
        <div className="text-lg font-semibold items-center text-gray-700">Câu hỏi {index + 1}</div>
        <div className='flex items-center gap-4'>
          <p className="font-medium">Điểm:</p>
          <input
            type="number"
            
            step={0.25}
            value={q.points}
            onChange={(e) => {
              const value = e.target.value.replace(',', '.');
              const numValue = value === '' ? 0 : parseFloat(value);
              onQuestionChange(index, { ...q, points: numValue }, 'points');

            }}
            className="w-24 p-2 border rounded"
            placeholder="Điểm"
          />
          {isPdfMode && (
            <button
              type="button"
              onClick={() => onRemove?.(index)}
              className="px-3 py-2 text-red-600 hover:text-red-700"
              title="Xóa câu hỏi"
            >
              Xóa
            </button>
          )}
        </div>
      </div>
      <select
        value={q.type}
        onChange={(e) => {
          const newData = {
            type: e.target.value,
            options: isPdfMode ? buildLabels(q.pdfLabelType || 'ABC', q.pdfOptionCount || 4) : ['', ''],
            correctAnswer: 0,
            correctAnswers: [],
            statements: ['', ''],
            points: q.points || 1
          };
          handleQuestionChange(newData);
        }}
        className="w-full p-2 rounded-md border mb-4 bg-gray-50"
      >
        <option value="single">Một đáp án</option>
        <option value="multiple">Nhiều đáp án</option>
        <option value="truefalse">Đúng / Sai (1 câu)</option>
        <option value="truefalse_many">Đúng / Sai (nhiều câu)</option>
      </select>

      {isPdfMode && (q.type === 'single' || q.type === 'multiple') && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-sm text-gray-700">Định dạng đáp án</label>
            <select
              value={q.pdfLabelType || 'ABC'}
              onChange={(e) => handleQuestionChange({ ...q, pdfLabelType: e.target.value })}
              className="w-full p-2 rounded-md border bg-gray-50"
            >
              <option value="ABC">A, B, C...</option>
              <option value="123">1, 2, 3...</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700">Số lựa chọn</label>
            <input
              type="number"
              min={2}
              max={10}
              value={q.pdfOptionCount || 4}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                const safe = Number.isFinite(n) ? Math.max(2, Math.min(n, 10)) : 4;
                handleQuestionChange({ ...q, pdfOptionCount: safe });
              }}
              className="w-full p-2 rounded-md border"
            />
          </div>
        </div>
      )}

      {/* Phần tiêu đề câu hỏi chung */}
      {/* {(q.type === 'single' || q.type === 'multiple' || q.type === 'truefalse') && (
         <textarea
            value={q.question}
            onChange={(e) => setQ(prev => ({ ...prev, question: e.target.value }))}
            className="w-full p-2 border rounded mb-4"
            placeholder={`Nội dung câu hỏi ${index + 1}...`}
            rows={3}
        />
      )} */}

      {q.type === 'truefalse_many' && (
        <div className="space-y-2 mb-4">
          {q.statements.map((statement, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <select
                value={q.correctAnswers[idx] ? 'true' : 'false'}
                onChange={(e) => {
                  const newAnswers = [...q.correctAnswers];
                  newAnswers[idx] = e.target.value === 'true';
                  handleQuestionChange({ ...q, correctAnswers: newAnswers });
                }}
                className="p-2 border rounded w-24 bg-gray-50"
              >
                <option value="true">Đúng</option>
                <option value="false">Sai</option>
              </select>
              {isPdfMode ? (
                <div className="flex-1 p-2 border rounded bg-gray-100 text-gray-500">
                  {`Phát biểu ${idx + 1}`}
                </div>
              ) : (
                <input
                  value={statement}
                  onChange={(e) => {
                    const newStatements = [...q.statements];
                    newStatements[idx] = e.target.value;
                    handleQuestionChange({ ...q, statements: newStatements });
                  }}
                  className="flex-1 p-2 border rounded"
                  placeholder={`Phát biểu ${idx + 1}...`}
                />
              )}
              {isPdfMode && (
                <button
                  type="button"
                  onClick={() => removeStatement(idx)}
                  disabled={(q.statements || []).length <= 2}
                  className={`px-3 py-2 ${((q.statements || []).length <= 2) ? 'text-gray-300' : 'text-red-600 hover:text-red-700'}`}
                  title="Xóa phát biểu"
                >
                  Xóa
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addStatement} className="text-blue-600 text-sm mt-2">
            + Thêm phát biểu
          </button>
        </div>
      )}

      {(q.type === 'single' || q.type === 'multiple') && (
        <div className="space-y-2 mb-4">
          {q.options.map((opt, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type={q.type === 'single' ? 'radio' : 'checkbox'}
                name={`question_${index}`} // Quan trọng cho radio button
                checked={
                  q.type === 'single'
                    ? q.correctAnswer === idx
                    : (q.correctAnswers || []).includes(idx)
                }
                onChange={() => {
                  if (q.type === 'single') {
                    handleQuestionChange({ ...q, correctAnswer: idx });
                  } else {
                    const cur = q.correctAnswers || [];
                    const newAnswers = cur.includes(idx)
                      ? cur.filter((x) => x !== idx)
                      : [...cur, idx];
                    handleQuestionChange({ ...q, correctAnswers: newAnswers.sort() });
                  }
                }}
              />
              {isPdfMode ? (
                <div className="flex-1 p-2 border rounded bg-gray-100 text-gray-700">
                  {`Đáp án ${q.pdfLabelType === '123' ? (idx + 1) : String.fromCharCode(65 + idx)}`}
                </div>
              ) : (
                <input
                  value={opt}
                  onChange={(e) => {
                    const newOptions = [...q.options];
                    newOptions[idx] = e.target.value;
                    handleQuestionChange({ ...q, options: newOptions });
                  }}
                  className="flex-1 p-2 border rounded"
                  placeholder={`Lựa chọn ${idx + 1}`}
                />
              )}
            </div>
          ))}
          {!isPdfMode && (
            <button type="button" onClick={addOption} className="text-blue-600 text-sm mt-2">
              + Thêm lựa chọn
            </button>
          )}
        </div>
      )}

      {q.type === 'truefalse' && (
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`question_${index}`} // Quan trọng cho radio button
              checked={q.correctAnswer === true}
              onChange={() => handleQuestionChange({ ...q, correctAnswer: true })}
            />
            Đúng
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`question_${index}`}
              checked={q.correctAnswer === false}
              onChange={() => handleQuestionChange({ ...q, correctAnswer: false })}
            />
            Sai
          </label>
        </div>
      )}
    </div>
  );
}


// ====================================================================
// QuestionList Component (Rất đơn giản)
// ====================================================================
function QuestionList({ questionCount, questions, onQuestionChange, onRemoveQuestion, isPdfMode = false }) {

  // Không cần state hay useEffect ở đây nữa!
  // Component này chỉ nhận props và render ra danh sách.

  // Tạo một mảng tạm thời để render dựa trên questionCount
  const itemsToRender = Array(questionCount).fill(null);

  return (
    <div className="w-full overflow-y-auto">
      {itemsToRender.map((_, idx) => (
        <QuestionForm
          key={idx}
          index={idx}
          // Lấy dữ liệu câu hỏi từ prop `questions`, nếu không có thì tạo mặc định
          questionData={questions[idx] || {
            type: 'single',
            options: isPdfMode ? ['A','B','C','D'] : ['', ''],
            correctAnswer: 0,
            correctAnswers: [],
            statements: [''],
            points: 1,
            pdfLabelType: 'ABC',
            pdfOptionCount: 4,
          }}
          // Truyền thẳng hàm onQuestionChange xuống
          onQuestionChange={onQuestionChange}
          onRemove={onRemoveQuestion}
          isPdfMode={isPdfMode}
        />
      ))}
    </div>
  );
}

export default QuestionList;
