import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import uploadApi from '../../api/upload';

const createOption = (source = {}, idx = 0) => ({
  id: source.id ?? source.answer_id ?? `opt-${idx}-${Date.now()}`,
  text: source.text ?? source.answer_text ?? '',
  imageUrl: source.imageUrl ?? source.image_url ?? '',
  imageKey: source.imageKey ?? source.image_key ?? '',
  isCorrect: typeof source.isCorrect === 'boolean'
    ? source.isCorrect
    : !!source.is_correct
});

const createStatement = (source = {}, idx = 0) => ({
  id: source.id ?? source.answer_id ?? `stmt-${idx}-${Date.now()}`,
  text: source.text ?? source.answer_text ?? '',
  imageUrl: source.imageUrl ?? source.image_url ?? '',
  imageKey: source.imageKey ?? source.image_key ?? '',
  isCorrect: typeof source.isCorrect === 'boolean'
    ? source.isCorrect
    : !!source.is_correct
});

const createAnswers = (source) => {
  if (!Array.isArray(source) || !source.length) {
    const stamp = Date.now();
    return [
      { id: `ans-0-${stamp}`, label: 'Đúng', text: 'Đúng', imageUrl: '', imageKey: '', isCorrect: true },
      { id: `ans-1-${stamp}`, label: 'Sai', text: 'Sai', imageUrl: '', imageKey: '', isCorrect: false }
    ];
  }
  return source.map((ans, idx) => ({
    id: ans.id ?? ans.answer_id ?? `ans-${idx}-${Date.now()}`,
    label: ans.label ?? (idx === 0 ? 'Đúng' : 'Sai'),
    text: ans.text ?? ans.answer_text ?? (idx === 0 ? 'Đúng' : 'Sai'),
    imageUrl: ans.imageUrl ?? ans.image_url ?? '',
    imageKey: ans.imageKey ?? ans.image_key ?? '',
    isCorrect: typeof ans.isCorrect === 'boolean'
      ? ans.isCorrect
      : !!ans.is_correct
  }));
};

const buildState = (data = {}) => {
  const type = data.type || 'single';
  const baseOptions = Array.isArray(data.options) && data.options.length
    ? data.options
    : [{}, {}];
  const options = baseOptions.map((opt, idx) => createOption(opt, idx));
  const multipleCorrect = Array.isArray(data.correctAnswers)
    ? data.correctAnswers
        .map(value => (typeof value === 'number' ? value : Number(value)))
        .filter(idx => Number.isFinite(idx))
    : options.reduce((acc, option, idx) => (option.isCorrect ? [...acc, idx] : acc), []);
  const statements = (type === 'truefalse_many'
    ? (Array.isArray(data.statements) && data.statements.length ? data.statements : [{}, {}, {}])
    : []).map((stmt, idx) => {
      const normalised = createStatement(stmt, idx);
      if (Array.isArray(data.correctAnswers) && typeof data.correctAnswers[idx] === 'boolean') {
        normalised.isCorrect = data.correctAnswers[idx];
      }
      return normalised;
    });
  const answers = type === 'truefalse'
    ? createAnswers(data.answers)
    : createAnswers();
  const correctAnswerIndex = typeof data.correctAnswer === 'number'
    ? data.correctAnswer
    : options.findIndex(opt => opt.isCorrect);
  const trueFalseCorrect = typeof data.correctAnswer === 'boolean'
    ? data.correctAnswer
    : answers.some(ans => ans.isCorrect);

  return {
    id: data.id ?? data.question_id,
    type,
    question: data.question || data.question_text || '',
    score: Number(data.score ?? 1) || 1,
    explanation: data.explanation || '',
    imageUrl: data.imageUrl ?? data.image_url ?? '',
    imageKey: data.imageKey ?? data.image_key ?? '',
    options,
    correctAnswer: correctAnswerIndex >= 0 ? correctAnswerIndex : 0,
    correctAnswers: type === 'multiple' ? multipleCorrect : [],
    statements,
    answers,
    trueFalseCorrect
  };
};

const QuestionForm = ({
  initialData = {},
  onSubmit,
  submitLabel = 'Thêm câu hỏi',
  onCancel,
  uploadCtx
}) => {
  const isEditing = Boolean(initialData && (initialData.id ?? initialData.question_id));
  const [q, setQ] = useState(() => buildState(initialData || {}));
  const [uploading, setUploading] = useState({
    question: false,
    option: null,
    statement: null,
    answer: null
  });

  useEffect(() => {
    setQ(buildState(initialData || {}));
  }, [initialData?.id, initialData?.question_id]);

  const mutateQuestion = (updater) => {
    setQ(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return { ...next };
    });
  };

  const ensureImage = async (file, folder, imageNo = 1) => {
    if (!file) return null;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh hợp lệ');
      return null;
    }
    const res = await uploadApi.uploadImage(file, folder, {
      examCode: uploadCtx?.examId || uploadCtx?.examCode,
      examTitle: uploadCtx?.examTitle,
      questionNo: uploadCtx?.questionNo,
      imageNo
    });
    if (!res.success) {
      toast.error(res.message || 'Không thể tải hình ảnh');
      return null;
    }
    return res;
  };

  const handleQuestionImageChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(prev => ({ ...prev, question: true }));
    const uploaded = await ensureImage(file, 'questions', 1);
    setUploading(prev => ({ ...prev, question: false }));
    if (uploaded) {
      mutateQuestion(prev => ({ ...prev, imageUrl: uploaded.url, imageKey: uploaded.key }));
    }
  };

  const removeQuestionImage = async () => {
    if (q.imageKey) await uploadApi.deleteFile(q.imageKey);
    mutateQuestion(prev => ({ ...prev, imageUrl: '', imageKey: '' }));
  };

  const handleOptionImageChange = async (idx, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(prev => ({ ...prev, option: idx }));
    const uploaded = await ensureImage(file, 'answers', idx + 1);
    setUploading(prev => ({ ...prev, option: null }));
    if (uploaded) {
      mutateQuestion(prev => ({
        ...prev,
        options: prev.options.map((opt, optionIdx) =>
          optionIdx === idx
            ? { ...opt, imageUrl: uploaded.url, imageKey: uploaded.key }
            : opt
        )
      }));
    }
  };

  const removeOptionImage = async (idx) => {
    const key = q.options[idx]?.imageKey;
    if (key) await uploadApi.deleteFile(key);
    mutateQuestion(prev => ({
      ...prev,
      options: prev.options.map((opt, optionIdx) =>
        optionIdx === idx ? { ...opt, imageUrl: '', imageKey: '' } : opt
      )
    }));
  };

  const handleStatementImageChange = async (idx, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(prev => ({ ...prev, statement: idx }));
    const uploaded = await ensureImage(file, 'statements', idx + 1);
    setUploading(prev => ({ ...prev, statement: null }));
    if (uploaded) {
      mutateQuestion(prev => ({
        ...prev,
        statements: prev.statements.map((stmt, stmtIdx) =>
          stmtIdx === idx
            ? { ...stmt, imageUrl: uploaded.url, imageKey: uploaded.key }
            : stmt
        )
      }));
    }
  };

  const removeStatementImage = async (idx) => {
    const key = q.statements[idx]?.imageKey;
    if (key) await uploadApi.deleteFile(key);
    mutateQuestion(prev => ({
      ...prev,
      statements: prev.statements.map((stmt, stmtIdx) =>
        stmtIdx === idx ? { ...stmt, imageUrl: '', imageKey: '' } : stmt
      )
    }));
  };

  const handleAnswerImageChange = async (idx, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(prev => ({ ...prev, answer: idx }));
    const uploaded = await ensureImage(file, 'answers', idx + 1);
    setUploading(prev => ({ ...prev, answer: null }));
    if (uploaded) {
      mutateQuestion(prev => ({
        ...prev,
        answers: prev.answers.map((ans, ansIdx) =>
          ansIdx === idx
            ? { ...ans, imageUrl: uploaded.url, imageKey: uploaded.key }
            : ans
        )
      }));
    }
  };

  const removeAnswerImage = async (idx) => {
    const key = q.answers[idx]?.imageKey;
    if (key) await uploadApi.deleteFile(key);
    mutateQuestion(prev => ({
      ...prev,
      answers: prev.answers.map((ans, ansIdx) =>
        ansIdx === idx ? { ...ans, imageUrl: '', imageKey: '' } : ans
      )
    }));
  };

  const addOption = () => {
    mutateQuestion(prev => ({
      ...prev,
      options: [...prev.options, createOption({}, prev.options.length)]
    }));
  };

  const removeOption = (idx) => {
    mutateQuestion(prev => {
      if (prev.options.length <= 2) return prev;
      const options = prev.options.filter((_, optionIdx) => optionIdx !== idx);
      const adjustedCorrect = prev.type === 'single'
        ? Math.max(0, Math.min(prev.correctAnswer, options.length - 1))
        : prev.correctAnswers
            .filter(index => index !== idx)
            .map(index => (index > idx ? index - 1 : index));
      return {
        ...prev,
        options,
        correctAnswer: prev.type === 'single' ? adjustedCorrect : prev.correctAnswer,
        correctAnswers: prev.type === 'multiple' ? adjustedCorrect : prev.correctAnswers
      };
    });
  };

  const addStatement = () => {
    mutateQuestion(prev => ({
      ...prev,
      statements: [...prev.statements, createStatement({}, prev.statements.length)]
    }));
  };

  const removeStatement = (idx) => {
    mutateQuestion(prev => ({
      ...prev,
      statements: prev.statements.filter((_, stmtIdx) => stmtIdx !== idx)
    }));
  };

  const validateQuestion = () => {
    if (q.type !== 'truefalse_many' && !q.question.trim()) {
      toast.error('Vui lòng nhập nội dung câu hỏi');
      return false;
    }
    if ((q.type === 'single' || q.type === 'multiple')) {
      const validOptions = q.options.filter(opt => opt.text.trim() || opt.imageUrl);
      if (validOptions.length < 2) {
        toast.error('Cần tối thiểu 2 đáp án cho câu hỏi lựa chọn');
        return false;
      }
      if (q.type === 'single' && (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0)) {
        toast.error('Vui lòng chọn đáp án đúng');
        return false;
      }
      if (q.type === 'multiple' && !(q.correctAnswers || []).length) {
        toast.error('Vui lòng chọn ít nhất một đáp án đúng');
        return false;
      }
    }
    if (q.type === 'truefalse_many') {
      const validStatements = q.statements.filter(stmt => stmt.text.trim() || stmt.imageUrl);
      if (!validStatements.length) {
        toast.error('Vui lòng nhập ít nhất một phát biểu');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateQuestion()) return;

    const base = {
      id: q.id ?? Date.now(),
      type: q.type,
      question: q.question.trim(),
      score: Number(q.score) || 1,
      explanation: q.explanation.trim(),
      imageUrl: q.imageUrl,
      imageKey: q.imageKey
    };

    let payload = base;

    if (q.type === 'single' || q.type === 'multiple') {
      const options = q.options
        .map((opt, idx) => ({
          id: opt.id,
          text: opt.text.trim(),
          imageUrl: opt.imageUrl,
          imageKey: opt.imageKey,
          isCorrect: q.type === 'single'
            ? idx === q.correctAnswer
            : (q.correctAnswers || []).includes(idx)
        }))
        .filter(opt => opt.text || opt.imageUrl);
      payload = {
        ...base,
        options,
        correctAnswer: q.type === 'single' ? q.correctAnswer : undefined,
        correctAnswers: q.type === 'multiple' ? (q.correctAnswers || []) : undefined
      };
    } else if (q.type === 'truefalse') {
      const answers = q.answers.map((ans, idx) => ({
        id: ans.id,
        text: ans.text || (idx === 0 ? 'Đúng' : 'Sai'),
        imageUrl: ans.imageUrl,
        imageKey: ans.imageKey,
        isCorrect: idx === 0 ? !!q.trueFalseCorrect : !q.trueFalseCorrect
      }));
      payload = {
        ...base,
        answers,
        correctAnswer: !!q.trueFalseCorrect
      };
    } else if (q.type === 'truefalse_many') {
      const statements = q.statements
        .map(stmt => ({
          id: stmt.id,
          text: stmt.text.trim(),
          imageUrl: stmt.imageUrl,
          imageKey: stmt.imageKey,
          isCorrect: !!stmt.isCorrect
        }))
        .filter(stmt => stmt.text || stmt.imageUrl);
      payload = {
        ...base,
        statements,
        correctAnswers: statements.map(stmt => !!stmt.isCorrect)
      };
    }

    onSubmit?.(payload);
    if (isEditing) {
      onCancel?.();
    } else {
      setQ(buildState());
    }
  };

  const handleCancel = () => {
    if (isEditing) {
      onCancel?.();
    } else {
      setQ(buildState());
    }
  };

  const isSingle = q.type === 'single';
  const isMultiple = q.type === 'multiple';
  const isTrueFalse = q.type === 'truefalse';
  const isTrueFalseMany = q.type === 'truefalse_many';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 p-4 rounded-xl border">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="tw-label mb-1">Loại câu hỏi</label>
          <select
            value={q.type}
            onChange={(e) => mutateQuestion(prev => buildState({ ...prev, type: e.target.value }))}
            className="w-full p-2 border rounded"
          >
            <option value="single">Một đáp án</option>
            <option value="multiple">Nhiều đáp án</option>
            <option value="truefalse">Đúng / Sai (1 câu)</option>
            <option value="truefalse_many">Đúng / Sai (nhiều câu)</option>
          </select>
        </div>
        <div>
          <label className="tw-label mb-1">Điểm số</label>
          <input
            type="number"
            min={0}
            step="0.25"
            value={q.score}
            onChange={(e) => mutateQuestion(prev => ({ ...prev, score: Number(e.target.value) }))}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      {!isTrueFalseMany && (
        <div>
          <label className="tw-label mb-1">Nội dung câu hỏi</label>
          <textarea
            value={q.question}
            onChange={(e) => mutateQuestion(prev => ({ ...prev, question: e.target.value }))}
            className="w-full p-2 border rounded"
            placeholder="Nhập nội dung câu hỏi..."
            rows={3}
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="tw-label mb-1">Hình ảnh câu hỏi (tùy chọn)</label>
        <div className="flex items-center gap-3">
          <label className="tw-btn tw-btn-secondary cursor-pointer">
            {uploading.question ? 'Đang tải...' : 'Chọn ảnh'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleQuestionImageChange}
              disabled={uploading.question}
            />
          </label>
          {q.imageUrl && (
            <button
              type="button"
              className="tw-btn tw-btn-secondary"
              onClick={removeQuestionImage}
            >
              Gỡ ảnh
            </button>
          )}
        </div>
        {q.imageUrl && (
          <img
            src={q.imageUrl}
            alt="question-preview"
            className="max-h-40 rounded border object-contain"
          />
        )}
      </div>

      <div>
        <label className="tw-label mb-1">Giải thích (tùy chọn)</label>
        <textarea
          value={q.explanation}
          onChange={(e) => mutateQuestion(prev => ({ ...prev, explanation: e.target.value }))}
          className="w-full p-2 border rounded"
          placeholder="Nhập giải thích hoặc ghi chú..."
          rows={2}
        />
      </div>

      {(isSingle || isMultiple) && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="tw-label">Danh sách đáp án</label>
            <button type="button" className="text-sm text-blue-600" onClick={addOption}>
              + Thêm đáp án
            </button>
          </div>
          <div className="space-y-3">
            {q.options.map((opt, idx) => (
              <div key={opt.id ?? idx} className="border rounded-lg p-3 bg-white space-y-2">
                <div className="flex items-center gap-2">
                  {isSingle ? (
                    <input
                      type="radio"
                      name="single-correct"
                      checked={q.correctAnswer === idx}
                      onChange={() => mutateQuestion(prev => ({
                        ...prev,
                        correctAnswer: idx,
                        options: prev.options.map((option, optionIdx) => ({
                          ...option,
                          isCorrect: optionIdx === idx
                        }))
                      }))}
                    />
                  ) : (
                    <input
                      type="checkbox"
                      checked={(q.correctAnswers || []).includes(idx)}
                      onChange={() => mutateQuestion(prev => {
                        const exists = (prev.correctAnswers || []).includes(idx);
                        const next = exists
                          ? (prev.correctAnswers || []).filter(value => value !== idx)
                          : [...(prev.correctAnswers || []), idx];
                        return {
                          ...prev,
                          correctAnswers: next,
                          options: prev.options.map((option, optionIdx) => ({
                            ...option,
                            isCorrect: next.includes(optionIdx)
                          }))
                        };
                      })}
                    />
                  )}
                  <input
                    className="flex-1 p-2 border rounded"
                    placeholder={`Đáp án ${String.fromCharCode(65 + idx)}`}
                    value={opt.text}
                    onChange={(e) => mutateQuestion(prev => ({
                      ...prev,
                      options: prev.options.map((option, optionIdx) =>
                        optionIdx === idx ? { ...option, text: e.target.value } : option
                      )
                    }))}
                  />
                  {q.options.length > 2 && (
                    <button
                      type="button"
                      className="tw-btn tw-btn-secondary text-sm"
                      onClick={() => removeOption(idx)}
                    >
                      Xóa
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="tw-btn tw-btn-secondary cursor-pointer text-sm">
                    {uploading.option === idx ? 'Đang tải...' : 'Ảnh đáp án'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleOptionImageChange(idx, e)}
                      disabled={uploading.option === idx}
                    />
                  </label>
                  {opt.imageUrl && (
                    <button
                      type="button"
                      className="tw-btn tw-btn-secondary text-sm"
                      onClick={() => removeOptionImage(idx)}
                    >
                      Gỡ ảnh
                    </button>
                  )}
                </div>
                {opt.imageUrl && (
                  <img
                    src={opt.imageUrl}
                    alt={`option-${idx}`}
                    className="max-h-32 rounded border object-contain"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isTrueFalse && (
        <div className="space-y-3">
          <label className="tw-label">Chọn đáp án đúng</label>
          {q.answers.map((ans, idx) => (
            <div key={ans.id ?? idx} className="border rounded-lg p-3 bg-white space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  name="truefalse-correct"
                  checked={idx === 0 ? !!q.trueFalseCorrect : !q.trueFalseCorrect}
                  onChange={() => mutateQuestion(prev => ({
                    ...prev,
                    trueFalseCorrect: idx === 0
                  }))}
                />
                {ans.label || (idx === 0 ? 'Đúng' : 'Sai')}
              </label>
              <div className="flex items-center gap-3">
                <label className="tw-btn tw-btn-secondary cursor-pointer text-sm">
                  {uploading.answer === idx ? 'Đang tải...' : 'Ảnh đáp án'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleAnswerImageChange(idx, e)}
                    disabled={uploading.answer === idx}
                  />
                </label>
                {ans.imageUrl && (
                  <button
                    type="button"
                    className="tw-btn tw-btn-secondary text-sm"
                    onClick={() => removeAnswerImage(idx)}
                  >
                    Gỡ ảnh
                  </button>
                )}
              </div>
              {ans.imageUrl && (
                <img
                  src={ans.imageUrl}
                  alt={`answer-${idx}`}
                  className="max-h-32 rounded border object-contain"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {isTrueFalseMany && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="tw-label">Danh sách phát biểu</label>
            <button type="button" className="text-sm text-blue-600" onClick={addStatement}>
              + Thêm phát biểu
            </button>
          </div>
          <div className="space-y-3">
            {q.statements.map((stmt, idx) => (
              <div key={stmt.id ?? idx} className="border rounded-lg p-3 bg-white space-y-2">
                <div className="flex items-center gap-3">
                  <select
                    value={stmt.isCorrect ? 'true' : 'false'}
                    onChange={(e) => mutateQuestion(prev => ({
                      ...prev,
                      statements: prev.statements.map((current, currentIdx) =>
                        currentIdx === idx
                          ? { ...current, isCorrect: e.target.value === 'true' }
                          : current
                      )
                    }))}
                    className="p-2 border rounded w-28"
                  >
                    <option value="true">Đúng</option>
                    <option value="false">Sai</option>
                  </select>
                  <input
                    className="flex-1 p-2 border rounded"
                    placeholder={`Phát biểu ${idx + 1}`}
                    value={stmt.text}
                    onChange={(e) => mutateQuestion(prev => ({
                      ...prev,
                      statements: prev.statements.map((current, currentIdx) =>
                        currentIdx === idx ? { ...current, text: e.target.value } : current
                      )
                    }))}
                  />
                  <button
                    type="button"
                    className="tw-btn tw-btn-secondary text-sm"
                    onClick={() => removeStatement(idx)}
                  >
                    Xóa
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <label className="tw-btn tw-btn-secondary cursor-pointer text-sm">
                    {uploading.statement === idx ? 'Đang tải...' : 'Ảnh minh họa'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleStatementImageChange(idx, e)}
                      disabled={uploading.statement === idx}
                    />
                  </label>
                  {stmt.imageUrl && (
                    <button
                      type="button"
                      className="tw-btn tw-btn-secondary text-sm"
                      onClick={() => removeStatementImage(idx)}
                    >
                      Gỡ ảnh
                    </button>
                  )}
                </div>
                {stmt.imageUrl && (
                  <img
                    src={stmt.imageUrl}
                    alt={`statement-${idx}`}
                    className="max-h-32 rounded border object-contain"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" className="tw-btn tw-btn-secondary" onClick={handleCancel}>
          {isEditing ? 'Hủy' : 'Làm mới'}
        </button>
        <button type="submit" className="tw-btn tw-btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
};

export default QuestionForm;
