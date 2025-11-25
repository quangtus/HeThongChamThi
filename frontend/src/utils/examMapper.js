const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const normaliseOption = (option, fallbackIsCorrect, index = 0) => {
  if (!option) {
    return {
      id: `opt-${index}`,
      text: '',
      imageUrl: '',
      isCorrect: !!fallbackIsCorrect(index)
    };
  }
  if (typeof option === 'string') {
    return {
      id: `opt-${index}`,
      text: option,
      imageUrl: '',
      isCorrect: !!fallbackIsCorrect(index)
    };
  }
  return {
    id: option.id ?? `opt-${index}`,
    text: option.text ?? option.answer_text ?? '',
    imageUrl: option.imageUrl ?? option.image_url ?? '',
    isCorrect: typeof option.isCorrect === 'boolean'
      ? option.isCorrect
      : !!fallbackIsCorrect(index)
  };
};

const normaliseStatement = (statement, fallbackIsCorrect, index = 0) => {
  if (!statement) {
    return {
      id: `stmt-${index}`,
      text: '',
      imageUrl: '',
      isCorrect: !!fallbackIsCorrect(index)
    };
  }
  if (typeof statement === 'string') {
    return {
      id: `stmt-${index}`,
      text: statement,
      imageUrl: '',
      isCorrect: !!fallbackIsCorrect(index)
    };
  }
  return {
    id: statement.id ?? `stmt-${index}`,
    text: statement.text ?? statement.answer_text ?? '',
    imageUrl: statement.imageUrl ?? statement.image_url ?? '',
    isCorrect: typeof statement.isCorrect === 'boolean'
      ? statement.isCorrect
      : !!fallbackIsCorrect(index)
  };
};

const sumQuestionScores = (questions = []) =>
  questions.reduce((sum, q) => {
    const score = Number(q?.score);
    return sum + (Number.isFinite(score) ? score : 0);
  }, 0);

export const mapExamResponse = (apiExam = {}) => {
  const questions = (apiExam.questions || []).map((question, idx) => {
    const type = question.type || 'single';
    const base = {
      id: question.id ?? question.question_id ?? `q-${idx}`,
      type,
      question: question.question || question.question_text || '',
      score: Number(question.score ?? 1) || 1,
      explanation: question.explanation || '',
      imageUrl: question.imageUrl ?? question.image_url ?? '',
    };

    if (type === 'single' || type === 'multiple') {
      const options = (question.options || []).map((opt, optIdx) => normaliseOption(opt, (index) => {
        if (typeof question.correctAnswer === 'number') {
          return question.correctAnswer === index;
        }
        if (Array.isArray(question.correctAnswers) && question.correctAnswers.length) {
          return question.correctAnswers.includes(index);
        }
        if (typeof opt?.isCorrect === 'boolean') {
          return opt.isCorrect;
        }
        return false;
      }, optIdx));

      const correctAnswer = type === 'single'
        ? (typeof question.correctAnswer === 'number'
          ? question.correctAnswer
          : options.findIndex((opt) => opt.isCorrect))
        : undefined;

      const correctAnswers = type === 'multiple'
        ? (Array.isArray(question.correctAnswers) && question.correctAnswers.length
          ? question.correctAnswers.map((value, index) => {
              if (typeof value === 'number') return value;
              if (value === true) return index;
              const numeric = Number(value);
              return Number.isFinite(numeric) ? numeric : -1;
            }).filter((value) => value >= 0)
          : options.reduce((acc, opt, index) => (opt.isCorrect ? [...acc, index] : acc), []))
        : [];

      return {
        ...base,
        options,
        correctAnswer: typeof correctAnswer === 'number' && correctAnswer >= 0 ? correctAnswer : 0,
        correctAnswers
      };
    }

    if (type === 'truefalse') {
      const answers = (question.answers || []).map((ans, ansIdx) => ({
        id: ans.id ?? `ans-${ansIdx}`,
        text: ans.text ?? ans.answer_text ?? (ansIdx === 0 ? 'Đúng' : 'Sai'),
        imageUrl: ans.imageUrl ?? ans.image_url ?? '',
        isCorrect: typeof ans.isCorrect === 'boolean' ? ans.isCorrect : (ansIdx === 0 ? !!question.correctAnswer : !question.correctAnswer)
      }));

      const correctAnswer = typeof question.correctAnswer === 'boolean'
        ? question.correctAnswer
        : answers.some((ans) => ans.isCorrect);

      return {
        ...base,
        answers,
        correctAnswer
      };
    }

    if (type === 'truefalse_many') {
      const statements = (question.statements || []).map((stmt, stmtIdx) =>
        normaliseStatement(stmt, (index) => {
          if (Array.isArray(question.correctAnswers) && question.correctAnswers.length) {
            const value = question.correctAnswers[index];
            return typeof value === 'boolean' ? value : !!value;
          }
          if (typeof stmt?.isCorrect === 'boolean') {
            return stmt.isCorrect;
          }
          return false;
        }, stmtIdx)
      );

      const correctAnswers = statements.map((stmt) => !!stmt.isCorrect);

      return {
        ...base,
        statements,
        correctAnswers
      };
    }

    return base;
  });

  const mapped = {
    id: apiExam.id || apiExam.exam_code || '',
    mcq_id: apiExam.mcq_id ?? apiExam.id ?? null,
    mcqId: apiExam.mcq_id ?? apiExam.id ?? null,
    title: apiExam.title || apiExam.exam_title || '',
    subject: apiExam.subject || { subject_id: '', subject_name: '' },
    duration: Number(apiExam.duration) || 45,
    description: apiExam.description || '',
    totalQuestions: apiExam.totalQuestions ?? apiExam.total_questions ?? questions.length,
    totalScore: Number(apiExam.totalScore ?? apiExam.total_score ?? sumQuestionScores(questions)),
    linkPdf: apiExam.linkPdf ?? apiExam.link_pdf ?? '',
    questions
  };

  return mapped;
};

export const prepareExamPayload = (examState = {}) => {
  const questions = (examState.questions || []).map((question, idx) => {
    const type = question.type || 'single';
    const base = {
      id: question.id ?? `q-${idx}`,
      type,
      question: question.question || '',
      score: Number(question.score) || 1,
      explanation: question.explanation || '',
      imageUrl: question.imageUrl || ''
    };

    if (type === 'single' || type === 'multiple') {
      const options = (question.options || []).map((opt, optIdx) => normaliseOption(opt, () => false, optIdx));
      const correctAnswer = type === 'single'
        ? (typeof question.correctAnswer === 'number'
          ? question.correctAnswer
          : options.findIndex((opt) => opt.isCorrect))
        : undefined;

      const correctAnswers = type === 'multiple'
        ? (Array.isArray(question.correctAnswers) && question.correctAnswers.length
          ? question.correctAnswers.map((value, index) => {
              if (typeof value === 'number') return value;
              if (value === true) return index;
              const numeric = Number(value);
              return Number.isFinite(numeric) ? numeric : -1;
            }).filter((value) => value >= 0)
          : options.reduce((acc, opt, index) => (opt.isCorrect ? [...acc, index] : acc), []))
        : [];

      return {
        ...base,
        options,
        correctAnswer: typeof correctAnswer === 'number' && correctAnswer >= 0 ? correctAnswer : 0,
        correctAnswers
      };
    }

    if (type === 'truefalse') {
      const answers = (question.answers && question.answers.length
        ? question.answers
        : [
          { text: 'Đúng', isCorrect: !!question.correctAnswer, imageUrl: '' },
          { text: 'Sai', isCorrect: !question.correctAnswer, imageUrl: '' }
        ]).map((ans, ansIdx) => ({
          text: ans.text ?? ans.answer_text ?? (ansIdx === 0 ? 'Đúng' : 'Sai'),
          imageUrl: ans.imageUrl ?? ans.image_url ?? '',
          isCorrect: typeof ans.isCorrect === 'boolean'
            ? ans.isCorrect
            : (ansIdx === 0 ? !!question.correctAnswer : !question.correctAnswer)
        }));

      return {
        ...base,
        answers,
        correctAnswer: !!question.correctAnswer
      };
    }

    if (type === 'truefalse_many') {
      const statements = (question.statements || []).map((stmt, stmtIdx) => normaliseStatement(stmt, () => false, stmtIdx));
      const correctAnswers = statements.map((stmt, index) => {
        if (typeof stmt.isCorrect === 'boolean') return stmt.isCorrect;
        if (Array.isArray(question.correctAnswers)) {
          const value = question.correctAnswers[index];
          return typeof value === 'boolean' ? value : !!value;
        }
        return false;
      });

      return {
        ...base,
        statements,
        correctAnswers
      };
    }

    return base;
  });

  const totalQuestions = toNumberOrNull(examState.totalQuestions);
  const totalScore = toNumberOrNull(examState.totalScore);

  const payload = {
    id: examState.id,
    title: examState.title,
    subject: examState.subject,
    duration: Number(examState.duration) || 0,
    description: examState.description || '',
    total_questions: totalQuestions ?? questions.length,
    total_score: totalScore ?? sumQuestionScores(questions),
    questions
  };

  // Only include link_pdf when provided to avoid wiping existing PDF on update
  const linkPdfValue = examState.linkPdf || examState.link_pdf;
  if (typeof linkPdfValue === 'string' && linkPdfValue.trim() !== '') {
    payload.link_pdf = linkPdfValue;
  }

  if (examState.created_by) payload.created_by = examState.created_by;
  if (examState.createdDate) payload.createdDate = examState.createdDate;

  return payload;
};

export const examMapper = {
  mapExamResponse,
  prepareExamPayload,
  sumQuestionScores
};

export default examMapper;
