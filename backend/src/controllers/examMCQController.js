const ExamMCQ = require('../models/ExamMCQModels');
const { getPool } = require('../config/db');
const { extractS3Key, deleteS3Objects } = require('../utils/s3Helpers');
const { deleteFileFromS3 } = require('./s3controller');
/**
 * EXAM MCQ CONTROLLER
 * Quản lý đề thi trắc nghiệm
 */

// Lấy danh sách đề thi

function toDbQuestionType(type) {
  switch (type) {
    case 'single': return 'SINGLE_CHOICE';
    case 'multiple': return 'MULTIPLE_CHOICE';
    case 'truefalse': return 'TRUE_FALSE';
    case 'truefalse_many': return 'MULTIPLE_TRUE_FALSE';
    default: return 'SINGLE_CHOICE';
  }
}

function toClientQuestionType(dbType) {
  const map = {
    SINGLE_CHOICE: 'single',
    MULTIPLE_CHOICE: 'multiple',
    TRUE_FALSE: 'truefalse',
    MULTIPLE_TRUE_FALSE: 'truefalse_many'
  };
  return map[dbType] || 'single';
}


async function getExams(req, res) {
  try {
    const { page = 1, limit = 12, q = '' } = req.query;
    const result = await ExamMCQ.findPage({ page, limit, q });
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    console.error('Error getting exams:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách đề thi', error: error.message });
  }
}

// Lấy chi tiết đề thi
async function getExamById(req, res) {
  try {
    const { id } = req.params; // mcq_id or exam_code
    let exam;
    if (/^\d+$/.test(String(id))) {
      exam = await ExamMCQ.findByIdWithSubject(id);
    } else {
      const byCode = await ExamMCQ.findByCode(id);
      if (byCode) {
        exam = await ExamMCQ.findByIdWithSubject(byCode.mcq_id);
      }
    }
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề thi' });
    }

    const client = await getPool().connect();
    const mcqId = exam.mcq_id;
    let mappedQuestions = [];
    try {
      const qRes = await client.query(
        `SELECT * FROM mcq_questions WHERE mcq_id = $1 ORDER BY question_id ASC`,
        [mcqId]
      );
      const questions = qRes.rows || [];
      if (questions.length > 0) {
        const ids = questions.map(r => r.question_id);
        const aRes = await client.query(
          `SELECT * FROM mcq_answers WHERE question_id = ANY($1::int[]) ORDER BY answer_order ASC`,
          [ids]
        );
        const answersByQ = aRes.rows.reduce((acc, r) => {
          (acc[r.question_id] = acc[r.question_id] || []).push(r);
          return acc;
        }, {});

        mappedQuestions = questions.map(q => {
          const type = toClientQuestionType(q.question_type);
          const answers = answersByQ[q.question_id] || [];
          const base = {
            id: q.question_id,
            question: q.question_text,
            type,
            score: Number(q.score ?? 1),
            explanation: q.explanation || '',
            imageUrl: q.image_url || null
          };

          if (type === 'single' || type === 'multiple') {
            const options = answers.map((a, index) => ({
              id: a.answer_id,
              text: a.answer_text,
              imageUrl: a.image_url || null,
              isCorrect: !!a.is_correct,
              order: index + 1
            }));
            const correctIndices = options.reduce((acc, option, idx) => {
              if (option.isCorrect) acc.push(idx);
              return acc;
            }, []);
            if (type === 'single') {
              return {
                ...base,
                options,
                correctAnswer: correctIndices.length ? correctIndices[0] : 0
              };
            }
            return {
              ...base,
              options,
              correctAnswers: correctIndices
            };
          }

          if (type === 'truefalse') {
            const answersPayload = answers.map(a => ({
              id: a.answer_id,
              text: a.answer_text,
              isCorrect: !!a.is_correct,
              imageUrl: a.image_url || null
            }));
            const correct = answers.some(a => a.is_correct);
            return {
              ...base,
              correctAnswer: correct,
              answers: answersPayload
            };
          }

          if (type === 'truefalse_many') {
            const statements = answers.map(a => ({
              id: a.answer_id,
              text: a.answer_text,
              isCorrect: !!a.is_correct,
              imageUrl: a.image_url || null
            }));
            return {
              ...base,
              statements,
              correctAnswers: statements.map(stmt => stmt.isCorrect)
            };
          }

          return { ...base, options: [] };
        });
      }
    } finally {
      client.release();
    }

    const subject = {
      subject_id: exam.subject_id,
      subject_name: exam.subject_name || ''
    };
    const data = {
      id: exam.exam_code,
      title: exam.exam_title,
      subject,
      duration: exam.duration,
      description: exam.description,
      totalQuestions: exam.total_questions,
      totalScore: Number(exam.total_score ?? 0),
      linkPdf: exam.link_pdf,
      questions: mappedQuestions,
      created_at: exam.created_at,
      mcq_id: exam.mcq_id
    };

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting exam:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin đề thi', error: error.message });
  }
}

// Tạo đề thi mới (và câu hỏi)
async function createExam(req, res) {
  let client;
  try {
    client = await getPool().connect();

    const {
      id,
      title,
      subject,
      duration,
      link_pdf,
      linkPdf,
      description,
      questions: incomingQuestions = [],
      totalQuestions,
      total_questions,
      totalScore,
      total_score
    } = req.body;

    if (!title || !subject?.subject_id || !Array.isArray(incomingQuestions) || !incomingQuestions.length) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu dữ liệu bắt buộc (title, subject_id, questions)'
      });
    }

    const subject_id = parseInt(subject.subject_id, 10);
    if (Number.isNaN(subject_id)) {
      return res.status(400).json({
        success: false,
        message: 'subject_id không hợp lệ'
      });
    }

    const questions = incomingQuestions;
    const questionCount = questions.length;
    let totalQuestionsValue = Number(total_questions ?? totalQuestions);
    if (!Number.isFinite(totalQuestionsValue) || totalQuestionsValue <= 0) {
      totalQuestionsValue = questionCount;
    }

    const sumQuestionScores = questions.reduce((sum, q) => {
      const score = Number(q?.score);
      return sum + (Number.isFinite(score) ? score : 1);
    }, 0);

    let totalScoreValue = Number(total_score ?? totalScore);
    if (!Number.isFinite(totalScoreValue) || totalScoreValue <= 0) {
      totalScoreValue = sumQuestionScores || questionCount;
    }

    const pdfLink = typeof link_pdf === 'string'
      ? link_pdf
      : link_pdf?.url || linkPdf || null;

    const exam_code = id;
    const created_by = req.user?.userId || req.body.created_by || req.body.user_id || req.body.userId || 1;

    await client.query('BEGIN');

    const insertExamSql = `
      INSERT INTO exam_mcq
        (exam_code, exam_title, subject_id, total_questions, duration, total_score, link_pdf, description, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`;
    let examRes = await client.query(insertExamSql, [
      exam_code,
      title,
      subject_id,
      totalQuestionsValue,
      duration,
      totalScoreValue,
      pdfLink,
      description,
      created_by
    ]);
    let exam = examRes.rows[0];

    let insertedQuestions = 0;
    let accumulatedScore = 0;

    const correctSetFromArray = (arr) => {
      const set = new Set();
      if (Array.isArray(arr)) {
        arr.forEach((value, idx) => {
          if (typeof value === 'number') {
            set.add(value);
          } else if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
            set.add(Number(value));
          } else if (value === true) {
            set.add(idx);
          }
        });
      }
      return set;
    };

    for (const q of questions) {
      const dbType = toDbQuestionType(q.type);
      const questionText = q.question || '';
      const score = Number(q.score);
      const finalScore = Number.isFinite(score) ? score : 1;
      const explanation = q.explanation || null;
      const imageUrl = q.imageUrl || q.image_url || null;

      const qRes = await client.query(
        `INSERT INTO mcq_questions (mcq_id, question_text, question_type, score, explanation, image_url)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING question_id`,
        [exam.mcq_id, questionText, dbType, finalScore, explanation, imageUrl]
      );
      const question_id = qRes.rows[0].question_id;
      insertedQuestions += 1;
      accumulatedScore += finalScore;

      if (dbType === 'SINGLE_CHOICE' || dbType === 'MULTIPLE_CHOICE') {
        const optionsSource = Array.isArray(q.options) ? q.options : [];
        const correctIndex = Number(q.correctAnswer);
        const correctSet = correctSetFromArray(q.correctAnswers);
        const options = optionsSource.map((opt, idx) => {
          const isObject = typeof opt === 'object' && opt !== null;
          const text = isObject ? (opt.text ?? opt.answer_text ?? '') : (opt ?? '');
          const image = isObject ? (opt.imageUrl ?? opt.image_url ?? null) : null;
          const explicitCorrect = isObject && typeof opt.isCorrect === 'boolean' ? opt.isCorrect : undefined;
          const fallback = dbType === 'SINGLE_CHOICE'
            ? idx === correctIndex
            : correctSet.has(idx);
          return {
            text,
            imageUrl: image,
            isCorrect: explicitCorrect !== undefined ? explicitCorrect : fallback
          };
        }).filter(opt => (opt.text && opt.text.trim()) || opt.imageUrl);

        for (let idx = 0; idx < options.length; idx++) {
          const opt = options[idx];
          await client.query(
            `INSERT INTO mcq_answers (question_id, answer_text, is_correct, answer_order, image_url)
             VALUES ($1,$2,$3,$4,$5)`,
            [question_id, opt.text || '', !!opt.isCorrect, idx + 1, opt.imageUrl]
          );
        }
      } else if (dbType === 'TRUE_FALSE') {
        const answersSource = Array.isArray(q.answers) && q.answers.length
          ? q.answers
          : [
            { text: 'Đúng', isCorrect: !!q.correctAnswer, imageUrl: q.trueImageUrl },
            { text: 'Sai', isCorrect: !q.correctAnswer, imageUrl: q.falseImageUrl }
          ];

        for (let idx = 0; idx < answersSource.length; idx++) {
          const ans = answersSource[idx];
          const isObject = typeof ans === 'object' && ans !== null;
          const text = isObject ? (ans.text ?? '') : (ans ?? '');
          const image = isObject ? (ans.imageUrl ?? ans.image_url ?? null) : null;
          const explicitCorrect = isObject && typeof ans.isCorrect === 'boolean' ? ans.isCorrect : undefined;
          const fallback = idx === 0 ? !!q.correctAnswer : !q.correctAnswer;
          await client.query(
            `INSERT INTO mcq_answers (question_id, answer_text, is_correct, answer_order, image_url)
             VALUES ($1,$2,$3,$4,$5)`,
            [question_id, text || '', explicitCorrect !== undefined ? explicitCorrect : fallback, idx + 1, image]
          );
        }
      } else if (dbType === 'MULTIPLE_TRUE_FALSE') {
        const statementsSource = Array.isArray(q.statements) ? q.statements : [];
        const answersArray = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
        for (let idx = 0; idx < statementsSource.length; idx++) {
          const stmt = statementsSource[idx];
          const isObject = typeof stmt === 'object' && stmt !== null;
          const text = isObject ? (stmt.text ?? '') : (stmt ?? '');
          const image = isObject ? (stmt.imageUrl ?? stmt.image_url ?? null) : null;
          const explicitCorrect = isObject && typeof stmt.isCorrect === 'boolean' ? stmt.isCorrect : undefined;
          const fallback = typeof answersArray[idx] === 'boolean'
            ? answersArray[idx]
            : !!answersArray[idx];
          await client.query(
            `INSERT INTO mcq_answers (question_id, answer_text, is_correct, answer_order, image_url)
             VALUES ($1,$2,$3,$4,$5)`,
            [question_id, text || '', explicitCorrect !== undefined ? explicitCorrect : fallback, idx + 1, image]
          );
        }
      }
    }

    if (exam.total_questions !== insertedQuestions || Number(exam.total_score) !== Number(totalScoreValue)) {
      const finalScoreValue = totalScoreValue || accumulatedScore;
      const updated = await client.query(
        `UPDATE exam_mcq SET total_questions = $1, total_score = $2 WHERE mcq_id = $3 RETURNING *`,
        [insertedQuestions, finalScoreValue, exam.mcq_id]
      );
      exam = updated.rows[0];
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: '✅ Tạo đề thi trắc nghiệm thành công',
      data: exam
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('❌ Error creating exam:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo đề thi trắc nghiệm',
      error: error.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Cập nhật đề thi + thay thế câu hỏi (nếu gửi lên)
async function updateExamInfo(req, res) {
  const { id } = req.params;
  let client;
  let pdfToDelete;
  try {
    const {
      title,
      subject,
      duration,
      description,
      link_pdf,
      linkPdf,
      totalQuestions,
      total_questions,
      totalScore,
      total_score,
      exam_code,
      code,
      examCode,
      id: requestExamCode
    } = req.body;

    client = await getPool().connect();
    await client.query('BEGIN');

    const existingRes = await client.query(`SELECT * FROM exam_mcq WHERE mcq_id = $1`, [id]);
    if (!existingRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề thi' });
    }
    const existingExam = existingRes.rows[0];

    const fields = [];
    const values = [];
    let i = 1;

    const incomingExamCode = exam_code ?? code ?? examCode ?? requestExamCode;
    if (incomingExamCode !== undefined && incomingExamCode !== existingExam.exam_code) {
      fields.push(`exam_code = $${i++}`);
      values.push(String(incomingExamCode));
    }

    if (title != null) {
      fields.push(`exam_title = $${i++}`);
      values.push(title);
    }

    if (subject?.subject_id != null) {
      const parsedSubject = parseInt(subject.subject_id, 10);
      if (!Number.isNaN(parsedSubject)) {
        fields.push(`subject_id = $${i++}`);
        values.push(parsedSubject);
      }
    }

    if (duration != null) {
      fields.push(`duration = $${i++}`);
      values.push(duration);
    }

    if (description != null) {
      fields.push(`description = $${i++}`);
      values.push(description);
    }

    const pdfLinkRaw = link_pdf ?? linkPdf;
    let newPdfLink;
    if (pdfLinkRaw !== undefined) {
      newPdfLink = typeof pdfLinkRaw === 'string'
        ? pdfLinkRaw
        : pdfLinkRaw?.url || null;
      fields.push(`link_pdf = $${i++}`);
      values.push(newPdfLink);

      if (existingExam.link_pdf && existingExam.link_pdf !== newPdfLink) {
        pdfToDelete = extractS3Key(existingExam.link_pdf);
      }
    }

    const totalQuestionsRaw = total_questions ?? totalQuestions;
    if (totalQuestionsRaw !== undefined) {
      if (totalQuestionsRaw === null) {
        fields.push(`total_questions = $${i++}`);
        values.push(null);
      } else {
        const parsed = Number(totalQuestionsRaw);
        if (Number.isFinite(parsed) && parsed >= 0) {
          fields.push(`total_questions = $${i++}`);
          values.push(parsed);
        }
      }
    }

    const totalScoreRaw = total_score ?? totalScore;
    if (totalScoreRaw !== undefined) {
      if (totalScoreRaw === null) {
        fields.push(`total_score = $${i++}`);
        values.push(null);
      } else {
        const parsed = Number(totalScoreRaw);
        if (Number.isFinite(parsed)) {
          fields.push(`total_score = $${i++}`);
          values.push(parsed);
        }
      }
    }

    if (fields.length) {
      values.push(id);
      await client.query(`UPDATE exam_mcq SET ${fields.join(', ')} WHERE mcq_id = $${i}`, values);
    }

    const updatedRes = await client.query(
      `SELECT e.*, s.subject_name
       FROM exam_mcq e
       LEFT JOIN subjects s ON s.subject_id = e.subject_id
       WHERE e.mcq_id = $1`,
      [id]
    );
    await client.query('COMMIT');

    if (pdfToDelete) {
      await deleteFileFromS3(pdfToDelete);
    }

    const updatedExam = updatedRes.rows[0];
    const responseData = updatedExam
      ? {
          mcq_id: updatedExam.mcq_id,
          exam_code: updatedExam.exam_code,
          exam_title: updatedExam.exam_title,
          subject: {
            subject_id: updatedExam.subject_id,
            subject_name: updatedExam.subject_name || ''
          },
          total_questions: updatedExam.total_questions,
          duration: updatedExam.duration,
          total_score: Number(updatedExam.total_score ?? 0),
          link_pdf: updatedExam.link_pdf,
          description: updatedExam.description
        }
      : null;

    res.json({
      success: true,
      message: 'Cập nhật thông tin đề thi thành công',
      data: responseData
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('❌ Error updating exam info:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật thông tin đề thi', error: error.message });
  } finally {
    if (client) client.release();
  }
}

async function updateExam(req, res) {
  const { id } = req.params;
  let client;
  let pdfToDelete;
  try {
    const {
      title,
      subject,
      duration,
      description,
      link_pdf,
      linkPdf,
      questions: incomingQuestions,
      totalQuestions,
      total_questions,
      totalScore,
      total_score
    } = req.body;

    client = await getPool().connect();
    await client.query('BEGIN');

    const existingRes = await client.query(`SELECT * FROM exam_mcq WHERE mcq_id = $1`, [id]);
    if (!existingRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề thi' });
    }
    const existingExam = existingRes.rows[0];

    const fields = [];
    const values = [];
    let i = 1;

    if (title != null) {
      fields.push(`exam_title = $${i++}`);
      values.push(title);
    }

    if (subject?.subject_id != null) {
      const parsedSubject = parseInt(subject.subject_id, 10);
      if (!Number.isNaN(parsedSubject)) {
        fields.push(`subject_id = $${i++}`);
        values.push(parsedSubject);
      }
    }

    if (duration != null) {
      fields.push(`duration = $${i++}`);
      values.push(duration);
    }

    if (description != null) {
      fields.push(`description = $${i++}`);
      values.push(description);
    }

    const pdfLinkRaw = link_pdf ?? linkPdf;
    let newPdfLink;
    if (pdfLinkRaw !== undefined) {
      newPdfLink = typeof pdfLinkRaw === 'string'
        ? pdfLinkRaw
        : pdfLinkRaw?.url || null;
      fields.push(`link_pdf = $${i++}`);
      values.push(newPdfLink);

      if (existingExam.link_pdf && existingExam.link_pdf !== newPdfLink) {
        pdfToDelete = extractS3Key(existingExam.link_pdf);
      }
    }

    let requestedTotalQuestions = existingExam.total_questions;
    const totalQuestionsRaw = total_questions ?? totalQuestions;
    if (totalQuestionsRaw !== undefined) {
      if (totalQuestionsRaw === null) {
        requestedTotalQuestions = null;
        fields.push(`total_questions = $${i++}`);
        values.push(null);
      } else {
        const parsed = Number(totalQuestionsRaw);
        if (Number.isFinite(parsed) && parsed >= 0) {
          requestedTotalQuestions = parsed;
          fields.push(`total_questions = $${i++}`);
          values.push(parsed);
        }
      }
    }

    let requestedTotalScore = existingExam.total_score;
    const totalScoreRaw = total_score ?? totalScore;
    if (totalScoreRaw !== undefined) {
      if (totalScoreRaw === null) {
        requestedTotalScore = null;
        fields.push(`total_score = $${i++}`);
        values.push(null);
      } else {
        const parsed = Number(totalScoreRaw);
        if (Number.isFinite(parsed)) {
          requestedTotalScore = parsed;
          fields.push(`total_score = $${i++}`);
          values.push(parsed);
        }
      }
    }

    if (fields.length) {
      values.push(id);
      await client.query(`UPDATE exam_mcq SET ${fields.join(', ')} WHERE mcq_id = $${i}`, values);
    }

    let insertedQuestions = 0;
    let accumulatedScore = 0;

    const correctSetFromArray = (arr) => {
      const set = new Set();
      if (Array.isArray(arr)) {
        arr.forEach((value, idx) => {
          if (typeof value === 'number') {
            set.add(value);
          } else if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
            set.add(Number(value));
          } else if (value === true) {
            set.add(idx);
          }
        });
      }
      return set;
    };

    if (Array.isArray(incomingQuestions)) {
      await client.query(
        `DELETE FROM mcq_answers WHERE question_id IN (SELECT question_id FROM mcq_questions WHERE mcq_id = $1)`,
        [id]
      );
      await client.query(`DELETE FROM mcq_questions WHERE mcq_id = $1`, [id]);

      for (const q of incomingQuestions) {
        const dbType = toDbQuestionType(q.type);
        const questionText = q.question || '';
        const score = Number(q.score);
        const finalScore = Number.isFinite(score) ? score : 1;
        const explanation = q.explanation || null;
        const imageUrl = q.imageUrl || q.image_url || null;

        const qRes = await client.query(
          `INSERT INTO mcq_questions (mcq_id, question_text, question_type, score, explanation, image_url)
           VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING question_id`,
          [id, questionText, dbType, finalScore, explanation, imageUrl]
        );
        const question_id = qRes.rows[0].question_id;
        insertedQuestions += 1;
        accumulatedScore += finalScore;

        if (dbType === 'SINGLE_CHOICE' || dbType === 'MULTIPLE_CHOICE') {
          const optionsSource = Array.isArray(q.options) ? q.options : [];
          const correctIndex = Number(q.correctAnswer);
          const correctSet = correctSetFromArray(q.correctAnswers);
          const options = optionsSource.map((opt, idx) => {
            const isObject = typeof opt === 'object' && opt !== null;
            const text = isObject ? (opt.text ?? opt.answer_text ?? '') : (opt ?? '');
            const image = isObject ? (opt.imageUrl ?? opt.image_url ?? null) : null;
            const explicitCorrect = isObject && typeof opt.isCorrect === 'boolean' ? opt.isCorrect : undefined;
            const fallback = dbType === 'SINGLE_CHOICE'
              ? idx === correctIndex
              : correctSet.has(idx);
            return {
              text,
              imageUrl: image,
              isCorrect: explicitCorrect !== undefined ? explicitCorrect : fallback
            };
          }).filter(opt => (opt.text && opt.text.trim()) || opt.imageUrl);

          for (let idx = 0; idx < options.length; idx++) {
            const opt = options[idx];
            await client.query(
              `INSERT INTO mcq_answers (question_id, answer_text, is_correct, answer_order, image_url)
               VALUES ($1,$2,$3,$4,$5)`,
              [question_id, opt.text || '', !!opt.isCorrect, idx + 1, opt.imageUrl]
            );
          }
        } else if (dbType === 'TRUE_FALSE') {
          const answersSource = Array.isArray(q.answers) && q.answers.length
            ? q.answers
            : [
              { text: 'Đúng', isCorrect: !!q.correctAnswer, imageUrl: q.trueImageUrl },
              { text: 'Sai', isCorrect: !q.correctAnswer, imageUrl: q.falseImageUrl }
            ];

          for (let idx = 0; idx < answersSource.length; idx++) {
            const ans = answersSource[idx];
            const isObject = typeof ans === 'object' && ans !== null;
            const text = isObject ? (ans.text ?? '') : (ans ?? '');
            const image = isObject ? (ans.imageUrl ?? ans.image_url ?? null) : null;
            const explicitCorrect = isObject && typeof ans.isCorrect === 'boolean' ? ans.isCorrect : undefined;
            const fallback = idx === 0 ? !!q.correctAnswer : !q.correctAnswer;
            await client.query(
              `INSERT INTO mcq_answers (question_id, answer_text, is_correct, answer_order, image_url)
               VALUES ($1,$2,$3,$4,$5)`,
              [question_id, text || '', explicitCorrect !== undefined ? explicitCorrect : fallback, idx + 1, image]
            );
          }
        } else if (dbType === 'MULTIPLE_TRUE_FALSE') {
          const statementsSource = Array.isArray(q.statements) ? q.statements : [];
          const answersArray = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
          for (let idx = 0; idx < statementsSource.length; idx++) {
            const stmt = statementsSource[idx];
            const isObject = typeof stmt === 'object' && stmt !== null;
            const text = isObject ? (stmt.text ?? '') : (stmt ?? '');
            const image = isObject ? (stmt.imageUrl ?? stmt.image_url ?? null) : null;
            const explicitCorrect = isObject && typeof stmt.isCorrect === 'boolean' ? stmt.isCorrect : undefined;
            const fallback = typeof answersArray[idx] === 'boolean'
              ? answersArray[idx]
              : !!answersArray[idx];
            await client.query(
              `INSERT INTO mcq_answers (question_id, answer_text, is_correct, answer_order, image_url)
               VALUES ($1,$2,$3,$4,$5)`,
              [question_id, text || '', explicitCorrect !== undefined ? explicitCorrect : fallback, idx + 1, image]
            );
          }
        }
      }

      requestedTotalQuestions = insertedQuestions;
      if (requestedTotalScore == null || requestedTotalScore <= 0) {
        requestedTotalScore = accumulatedScore;
      }

      await client.query(
        `UPDATE exam_mcq SET total_questions = $1, total_score = $2 WHERE mcq_id = $3`,
        [requestedTotalQuestions, requestedTotalScore, id]
      );
    }

    await client.query('COMMIT');

    if (pdfToDelete) {
      await deleteFileFromS3(pdfToDelete);
    }

    res.json({ success: true, message: 'Cập nhật đề thi thành công' });
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('❌ Error updating exam:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật đề thi', error: error.message });
  } finally {
    if (client) client.release();
  }
}

async function deleteExam(req, res) {
  const { id } = req.params; // mcq_id or exam_code
  let client;
  try {
    client = await getPool().connect();

    let examRow;
    if (/^\d+$/.test(String(id))) {
      const examRes = await client.query(`SELECT * FROM exam_mcq WHERE mcq_id = $1`, [id]);
      examRow = examRes.rows[0];
    } else {
      const examRes = await client.query(`SELECT * FROM exam_mcq WHERE exam_code = $1`, [id]);
      examRow = examRes.rows[0];
    }

    if (!examRow) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề thi' });
    }

    const mcqId = examRow.mcq_id;
    const pdfKey = extractS3Key(examRow.link_pdf);

    const questionRes = await client.query(
      `SELECT question_id, image_url FROM mcq_questions WHERE mcq_id = $1`,
      [mcqId]
    );
    const questionRows = questionRes.rows || [];
    const questionIds = questionRows.map(row => row.question_id);

    let answerRows = [];
    if (questionIds.length) {
      const answerRes = await client.query(
        `SELECT image_url FROM mcq_answers WHERE question_id = ANY($1::int[])`,
        [questionIds]
      );
      answerRows = answerRes.rows || [];
    }

    await client.query('BEGIN');
    if (questionIds.length) {
      await client.query(
        `DELETE FROM mcq_answers WHERE question_id = ANY($1::int[])`,
        [questionIds]
      );
      await client.query(`DELETE FROM mcq_questions WHERE mcq_id = $1`, [mcqId]);
    }
    await client.query(`DELETE FROM exam_mcq WHERE mcq_id = $1`, [mcqId]);
    await client.query('COMMIT');

    const keysToDelete = [];
    if (pdfKey) keysToDelete.push(pdfKey);
    questionRows.forEach(row => {
      const key = extractS3Key(row.image_url);
      if (key) keysToDelete.push(key);
    });
    answerRows.forEach(row => {
      const key = extractS3Key(row.image_url);
      if (key) keysToDelete.push(key);
    });
    // xoá cả hình + pdf
    await deleteS3Objects(keysToDelete);

    res.json({ success: true, message: 'Đã xóa đề thi' });
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (rollbackErr) { console.error('Rollback error:', rollbackErr); }
    }
    console.error('❌ Error deleting exam:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa đề thi', error: error.message });
  } finally {
    if (client) client.release();
  }
}

module.exports = { getExams, getExamById, createExam, updateExamInfo, updateExam, deleteExam };
