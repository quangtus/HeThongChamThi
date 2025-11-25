const { getPool } = require('../config/db');

class ExamMCQ {
  // Helper: map row -> object
  static mapExam(row) {
    if (!row) return null;
    return {
      mcq_id: row.mcq_id,
      exam_code: row.exam_code,
      exam_title: row.exam_title,
      subject_id: row.subject_id,
      subject_name: row.subject_name, // when joined
      total_questions: row.total_questions,
      duration: row.duration,
      total_score: row.total_score,
      link_pdf: row.link_pdf,
      is_active: row.is_active,
      created_by: row.created_by,
      created_at: row.created_at,
      description: row.description
    };
  }

  // Lấy danh sách đề thi
  static async findAll() {
    const result = await getPool().query(`
      SELECT * FROM exam_mcq
      ORDER BY created_at DESC
    `);
    return result.rows.map(ExamMCQ.mapExam);
  }

  // Lấy đề thi theo ID
  static async findById(id) {
    const result = await getPool().query(
      `SELECT * FROM exam_mcq WHERE mcq_id = $1`,
      [id]
    );
    return ExamMCQ.mapExam(result.rows[0]);
  }

  // Lấy đề thi theo ID kèm subject name
  static async findByIdWithSubject(id) {
    const result = await getPool().query(
      `SELECT e.*, s.subject_name
       FROM exam_mcq e
       LEFT JOIN subjects s ON s.subject_id = e.subject_id
       WHERE e.mcq_id = $1`,
      [id]
    );
    return ExamMCQ.mapExam(result.rows[0]);
  }

  // Lấy đề thi theo mã đề
  static async findByCode(exam_code) {
    const result = await getPool().query(
      `SELECT * FROM exam_mcq WHERE exam_code = $1`,
      [exam_code]
    );
    return ExamMCQ.mapExam(result.rows[0]);
  }

  // Tạo đề thi mới
  static async insert(exam) {
    const result = await getPool().query(
      `INSERT INTO exam_mcq
       (exam_code, exam_title, subject_id, total_questions, duration, total_score,link_pdf, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        exam.exam_code,
        exam.exam_title,
        exam.subject_id,
        exam.total_questions,
        exam.duration,
        exam.total_score,
        exam.link_pdf,
        exam.description,
        exam.created_by
      ]
    );
    return ExamMCQ.mapExam(result.rows[0]);
  }

  // Phân trang + tìm kiếm
  static async findPage({ page = 1, limit = 12, q = '' }) {
    page = Number(page) || 1;
    limit = Math.min(Math.max(Number(limit) || 12, 1), 100);
    const offset = (page - 1) * limit;

    const params = [];
    let where = '';
    if (q && q.trim()) {
      params.push(`%${q.trim().toLowerCase()}%`);
      where = `WHERE LOWER(e.exam_title) LIKE $${params.length} OR LOWER(e.exam_code) LIKE $${params.length}`;
    }

    const countSql = `SELECT COUNT(*) AS cnt FROM exam_mcq e ${where}`;
    const countRes = await getPool().query(countSql, params);
    const total = Number(countRes.rows[0]?.cnt || 0);

    const dataSql = `
      SELECT e.*, s.subject_name
      FROM exam_mcq e
      LEFT JOIN subjects s ON s.subject_id = e.subject_id
      ${where}
      ORDER BY e.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const dataRes = await getPool().query(dataSql, [...params, limit, offset]);
    const data = dataRes.rows.map(ExamMCQ.mapExam);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    return { data, pagination: { page, limit, total, totalPages } };
  }
}

module.exports = ExamMCQ;
