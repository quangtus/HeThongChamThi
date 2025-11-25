const { query } = require('../config/db');

class CandidateExamRegistration {
    // Tạo đăng ký thi mới
    static async create(registrationData) {
        const {
            candidate_id,
            subject_id,
            exam_type,
            exam_session,
            exam_room,
            seat_number,
            notes
        } = registrationData;

        const sql = `
      INSERT INTO candidate_exam_registrations 
      (candidate_id, subject_id, exam_type, exam_session, exam_room, seat_number, notes)
      VALUES (:candidate_id, :subject_id, :exam_type, :exam_session, :exam_room, :seat_number, :notes)
      RETURNING registration_id
    `;

        const rows = await query(sql, {
            candidate_id,
            subject_id,
            exam_type,
            exam_session,
            exam_room,
            seat_number,
            notes
        });

        return rows[0].registration_id;
    }

    // Lấy tất cả đăng ký thi với thông tin chi tiết
    static async findAllWithDetails(filters = {}) {
        let sql = `
      SELECT 
        cer.registration_id,
        cer.candidate_id,
        cer.subject_id,
        cer.exam_type,
        cer.registration_date,
        cer.status,
        cer.approved_by,
        cer.approved_at,
        cer.rejection_reason,
        cer.exam_session,
        cer.exam_room,
        cer.seat_number,
        cer.notes,
        cer.created_at,
        cer.updated_at,
        c.candidate_code,
        u_candidate.full_name as candidate_name,
        c.identity_card,
        u_candidate.phone,
        u_candidate.email,
        s.subject_code,
        s.subject_name,
        u_approved.full_name as approved_by_name
      FROM candidate_exam_registrations cer
      LEFT JOIN candidates c ON cer.candidate_id = c.candidate_id
      LEFT JOIN users u_candidate ON c.user_id = u_candidate.user_id
      LEFT JOIN subjects s ON cer.subject_id = s.subject_id
      LEFT JOIN users u_approved ON cer.approved_by = u_approved.user_id
      WHERE 1=1
    `;

        const params = {};

        // Áp dụng filters
        if (filters.candidate_id) {
            sql += ' AND cer.candidate_id = :candidate_id';
            params.candidate_id = filters.candidate_id;
        }

        if (filters.subject_id) {
            sql += ' AND cer.subject_id = :subject_id';
            params.subject_id = filters.subject_id;
        }

        if (filters.status) {
            sql += ' AND cer.status = :status';
            params.status = filters.status;
        }

        if (filters.exam_type) {
            sql += ' AND cer.exam_type = :exam_type';
            params.exam_type = filters.exam_type;
        }

        if (filters.exam_session) {
            sql += ' AND cer.exam_session = :exam_session';
            params.exam_session = filters.exam_session;
        }

        sql += ' ORDER BY cer.registration_date DESC';

        if (filters.limit) {
            sql += ' LIMIT :limit';
            params.limit = filters.limit;
        }

        return await query(sql, params);
    }

    // Lấy đăng ký thi theo ID
    static async findById(registrationId) {
        const sql = `
      SELECT 
        cer.*,
        c.candidate_code,
        u_candidate.full_name as candidate_name,
        s.subject_code,
        s.subject_name,
        u_approved.full_name as approved_by_name
      FROM candidate_exam_registrations cer
      LEFT JOIN candidates c ON cer.candidate_id = c.candidate_id
      LEFT JOIN users u_candidate ON c.user_id = u_candidate.user_id
      LEFT JOIN subjects s ON cer.subject_id = s.subject_id
      LEFT JOIN users u_approved ON cer.approved_by = u_approved.user_id
      WHERE cer.registration_id = :registrationId
    `;

        const rows = await query(sql, { registrationId });
        return rows[0];
    }

    // Cập nhật trạng thái đăng ký thi
    static async updateStatus(registrationId, status, approvedBy = null, rejectionReason = null) {
        const sql = `
      UPDATE candidate_exam_registrations 
      SET status = :status, 
          approved_by = :approvedBy, 
          approved_at = CASE WHEN :status = 'APPROVED' THEN CURRENT_TIMESTAMP ELSE approved_at END,
          rejection_reason = :rejectionReason
      WHERE registration_id = :registrationId
    `;

        const rows = await query(sql, { status, approvedBy, rejectionReason, registrationId });
        return rows.length > 0;
    }

    // Cập nhật thông tin đăng ký thi
    static async update(registrationId, updateData) {
        const {
            exam_type,
            exam_session,
            exam_room,
            seat_number,
            notes
        } = updateData;

        const sql = `
      UPDATE candidate_exam_registrations 
      SET exam_type = :exam_type, 
          exam_session = :exam_session, 
          exam_room = :exam_room, 
          seat_number = :seat_number, 
          notes = :notes
      WHERE registration_id = :registrationId
    `;

        const rows = await query(sql, {
            exam_type,
            exam_session,
            exam_room,
            seat_number,
            notes,
            registrationId
        });

        return rows.length > 0;
    }

    // Xóa đăng ký thi
    static async delete(registrationId) {
        const sql = 'DELETE FROM candidate_exam_registrations WHERE registration_id = :registrationId';
        const rows = await query(sql, { registrationId });
        return rows.length > 0;
    }

    // Lấy thống kê đăng ký thi
    static async getStatistics() {
        const sql = `
      SELECT 
        COUNT(*)::int as total_registrations,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END)::int as pending_count,
        SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END)::int as approved_count,
        SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END)::int as rejected_count,
        SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END)::int as cancelled_count,
        SUM(CASE WHEN exam_type = 'ESSAY' THEN 1 ELSE 0 END)::int as essay_count,
        SUM(CASE WHEN exam_type = 'MCQ' THEN 1 ELSE 0 END)::int as mcq_count,
        SUM(CASE WHEN exam_type = 'BOTH' THEN 1 ELSE 0 END)::int as both_count
      FROM candidate_exam_registrations
    `;

        const rows = await query(sql);
        return rows[0];
    }

    // Lấy đăng ký thi của một thí sinh
    static async findByCandidateId(candidateId) {
        const sql = `
      SELECT 
        cer.*,
        s.subject_code,
        s.subject_name,
        u_approved.full_name as approved_by_name
      FROM candidate_exam_registrations cer
      LEFT JOIN subjects s ON cer.subject_id = s.subject_id
      LEFT JOIN users u_approved ON cer.approved_by = u_approved.user_id
      WHERE cer.candidate_id = :candidateId
      ORDER BY cer.registration_date DESC
    `;

        return await query(sql, { candidateId });
    }
}

module.exports = CandidateExamRegistration;