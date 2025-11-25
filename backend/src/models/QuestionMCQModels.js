const { getPool } = require('../config/db');

class QuestionMCQModels {
  static async getByExam(mcq_id) {
    const qRes = await getPool().query(
      `SELECT * FROM mcq_questions WHERE mcq_id = $1 ORDER BY question_id ASC`,
      [mcq_id]
    );
    const questions = qRes.rows;
    if (!questions.length) return [];
    const ids = questions.map(r => r.question_id);
    const aRes = await getPool().query(
      `SELECT * FROM mcq_answers WHERE question_id = ANY($1::int[]) ORDER BY answer_order ASC`,
      [ids]
    );
    const answersByQ = aRes.rows.reduce((acc, r) => {
      (acc[r.question_id] = acc[r.question_id] || []).push(r);
      return acc;
    }, {});
    return questions.map(q => ({ ...q, answers: answersByQ[q.question_id] || [] }));
  }

  static async create(mcq_id, q, client = getPool()) {
    let dbType;
    switch (q.type) {
      case 'single': dbType = 'SINGLE_CHOICE'; break;
      case 'multiple': dbType = 'MULTIPLE_CHOICE'; break;
      case 'truefalse': dbType = 'TRUE_FALSE'; break;
      case 'truefalse_many': dbType = 'MULTIPLE_TRUE_FALSE'; break;
      default: dbType = 'SINGLE_CHOICE';
    }
    const qRes = await client.query(
      `INSERT INTO mcq_questions (mcq_id, question_text, question_type, score)
       VALUES ($1,$2,$3,$4) RETURNING question_id`,
      [mcq_id, q.question, dbType, 1.0]
    );
    const question_id = qRes.rows[0].question_id;

    if (q.type === 'single') {
      for (let j = 0; j < (q.options || []).length; j++) {
        await client.query(
          `INSERT INTO mcq_answers (question_id, answer_text, is_correct, answer_order)
           VALUES ($1,$2,$3,$4)`,
          [question_id, q.options[j], j === q.correctAnswer, j + 1]
        );
      }
    } else if (q.type === 'multiple') {
      for (let j = 0; j < (q.options || []).length; j++) {
        const isCorrect = (q.correctAnswers || []).includes(j);
        await client.query(
          `INSERT INTO mcq_answers (question_id, answer_text, is_correct, answer_order)
           VALUES ($1,$2,$3,$4)`,
          [question_id, q.options[j], isCorrect, j + 1]
        );
      }
    } else if (q.type === 'truefalse') {
      await client.query(
        `INSERT INTO mcq_answers (question_id, answer_text, is_correct, answer_order) VALUES ($1,$2,$3,1)`,
        [question_id, 'Đúng', !!q.correctAnswer]
      );
      await client.query(
        `INSERT INTO mcq_answers (question_id, answer_text, is_correct, answer_order) VALUES ($1,$2,$3,2)`,
        [question_id, 'Sai', !q.correctAnswer]
      );
    } else if (q.type === 'truefalse_many') {
      const statements = q.statements || [];
      const answers = q.correctAnswers || [];
      for (let j = 0; j < statements.length; j++) {
        await client.query(
          `INSERT INTO mcq_answers (question_id, answer_text, is_correct, answer_order)
           VALUES ($1,$2,$3,$4)`,
          [question_id, statements[j], !!answers[j], j + 1]
        );
      }
    }
    return question_id;
  }

  static async remove(question_id) {
    await getPool().query(`DELETE FROM mcq_answers WHERE question_id = $1`, [question_id]);
    await getPool().query(`DELETE FROM mcq_questions WHERE question_id = $1`, [question_id]);
  }
}

module.exports = QuestionMCQModels;

