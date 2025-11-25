const { getPool } = require('../config/db');
const QuestionMCQModels = require('../models/QuestionMCQModels');
const { extractS3Key, deleteS3Objects } = require('../utils/s3Helpers');

// GET /api/mcq-questions?mcq_id=123
async function listQuestions(req, res) {
  try {
    const { mcq_id } = req.query;
    if (!mcq_id) return res.status(400).json({ success: false, message: 'Thiếu mcq_id' });
    const data = await QuestionMCQModels.getByExam(mcq_id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error list questions:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách câu hỏi', error: error.message });
  }
}

// POST /api/mcq-questions (body: { mcq_id, question })
async function createQuestion(req, res) {
  const client = await getPool().connect();
  try {
    const { mcq_id, question } = req.body;
    if (!mcq_id || !question) return res.status(400).json({ success: false, message: 'Thiếu dữ liệu' });
    await client.query('BEGIN');
    const id = await QuestionMCQModels.create(mcq_id, question, client);
    await client.query('COMMIT');
    res.status(201).json({ success: true, data: { question_id: id } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error create question:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi tạo câu hỏi', error: error.message });
  } finally {
    client.release();
  }
}

// DELETE /api/mcq-questions/:id
async function deleteQuestion(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ success: false, message: 'Thiếu question_id' });

  const client = await getPool().connect();
  let transactionStarted = false;
  try {
    const questionRes = await client.query(
      `SELECT question_id, image_url FROM mcq_questions WHERE question_id = $1`,
      [id]
    );
    if (!questionRes.rows.length) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi' });
    }
    const question = questionRes.rows[0];

    const answerRes = await client.query(
      `SELECT image_url FROM mcq_answers WHERE question_id = $1`,
      [id]
    );

    const keysToDelete = [];
    const questionKey = extractS3Key(question.image_url);
    if (questionKey) keysToDelete.push(questionKey);
    answerRes.rows.forEach(row => {
      const key = extractS3Key(row.image_url);
      if (key) keysToDelete.push(key);
    });

    await client.query('BEGIN');
    transactionStarted = true;
    await client.query(`DELETE FROM mcq_answers WHERE question_id = $1`, [id]);
    await client.query(`DELETE FROM mcq_questions WHERE question_id = $1`, [id]);
    await client.query('COMMIT');
    transactionStarted = false;

    await deleteS3Objects(keysToDelete);

    res.json({ success: true, message: 'Đã xóa câu hỏi' });
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
    }
    console.error('Error delete question:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xóa câu hỏi', error: error.message });
  } finally {
    client.release();
  }
}

module.exports = { listQuestions, createQuestion, deleteQuestion };

