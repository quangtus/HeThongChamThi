const { query } = require('../config/db');

class CandidateExamRegistration {
    // Tạo đăng ký thi mới
    static async create(registrationData) {
        // Validate và chuẩn hóa dữ liệu
        const candidate_id = parseInt(registrationData.candidate_id);
        const subject_id = parseInt(registrationData.subject_id);
        const exam_type = registrationData.exam_type?.toUpperCase();

        // Validate required fields
        if (!candidate_id || isNaN(candidate_id)) {
            throw new Error('candidate_id không hợp lệ');
        }
        if (!subject_id || isNaN(subject_id)) {
            throw new Error('subject_id không hợp lệ');
        }
        if (!exam_type || !['ESSAY', 'MCQ', 'BOTH'].includes(exam_type)) {
            throw new Error('exam_type không hợp lệ. Phải là: ESSAY, MCQ, hoặc BOTH');
        }

        const sql = `
      INSERT INTO candidate_exam_registrations 
      (candidate_id, subject_id, exam_type, exam_session, exam_room, seat_number, notes)
      VALUES (:candidate_id, :subject_id, :exam_type, :exam_session, :exam_room, :seat_number, :notes)
      RETURNING registration_id
    `;

        const params = {
            candidate_id,
            subject_id,
            exam_type,
            exam_session: registrationData.exam_session || null,
            exam_room: registrationData.exam_room || null,
            seat_number: registrationData.seat_number || null,
            notes: registrationData.notes || null
        };

        try {
            const result = await query(sql, params);

            // INSERT với RETURNING trả về rows (đã là array, không phải object có property rows)
            if (!result || !result[0] || !result[0].registration_id) {
                throw new Error('Không thể tạo đăng ký thi: không nhận được registration_id từ database');
            }
            return result[0].registration_id;
        } catch (error) {
            console.error('Error in CandidateExamRegistration.create:', error);
            console.error('SQL:', sql);
            console.error('Params:', params);
            throw error;
        }
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

        // Search filter
        if (filters.search) {
            sql += ' AND (LOWER(u_candidate.full_name) LIKE :search OR LOWER(c.candidate_code) LIKE :search OR LOWER(s.subject_name) LIKE :search)';
            params.search = `%${filters.search.toLowerCase()}%`;
        }

        // Get total count
        const countSql = sql.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
        const countResult = await query(countSql, params);
        const total = parseInt(countResult[0]?.total || 0);

        sql += ' ORDER BY cer.registration_date DESC';

        // Pagination
        if (filters.limit) {
            sql += ' LIMIT :limit';
            params.limit = filters.limit;
        }
        if (filters.offset !== undefined) {
            sql += ' OFFSET :offset';
            params.offset = filters.offset;
        }

        const registrations = await query(sql, params);
        return { registrations, total };
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
        // Xây dựng SQL động để xử lý NULL values đúng cách
        const updateFields = ['status = :status'];
        const params = { 
            status, 
            registrationId 
        };

        // Xử lý approved_by: luôn cập nhật (có thể là null)
        updateFields.push('approved_by = :approvedBy');
        params.approvedBy = (approvedBy !== null && approvedBy !== undefined) ? approvedBy : null;

        // Xử lý approved_at: chỉ set khi status là APPROVED
        if (status === 'APPROVED') {
            updateFields.push('approved_at = CURRENT_TIMESTAMP');
        } else {
            // Nếu không phải APPROVED và đang chuyển từ APPROVED, giữ nguyên approved_at
            // (không update field này)
        }

        // Xử lý rejection_reason
        if (status === 'REJECTED') {
            // Nếu là REJECTED, cập nhật rejection_reason (có thể null)
            if (rejectionReason !== null && rejectionReason !== undefined && rejectionReason !== '') {
                updateFields.push('rejection_reason = :rejectionReason');
                params.rejectionReason = rejectionReason;
            } else {
                // Nếu không có lý do, set NULL
                updateFields.push('rejection_reason = NULL');
            }
        } else {
            // Nếu không phải REJECTED, clear rejection_reason
            updateFields.push('rejection_reason = NULL');
        }

        const sql = `
      UPDATE candidate_exam_registrations 
      SET ${updateFields.join(', ')}
      WHERE registration_id = :registrationId
    `;

        try {
            const result = await query(sql, params);
            // UPDATE trả về rowCount, không phải rows
            return result.rowCount > 0;
        } catch (error) {
            console.error('Error in updateStatus:', error);
            console.error('SQL:', sql);
            console.error('Params:', params);
            throw error;
        }
    }

    // Cập nhật thông tin đăng ký thi
    static async update(registrationId, updateData) {
        const updateFields = [];
        const params = { registrationId };

        if (updateData.exam_type !== undefined) {
            updateFields.push('exam_type = :exam_type');
            params.exam_type = updateData.exam_type;
        }
        if (updateData.exam_session !== undefined) {
            updateFields.push('exam_session = :exam_session');
            params.exam_session = updateData.exam_session;
        }
        if (updateData.exam_room !== undefined) {
            updateFields.push('exam_room = :exam_room');
            params.exam_room = updateData.exam_room;
        }
        if (updateData.seat_number !== undefined) {
            updateFields.push('seat_number = :seat_number');
            params.seat_number = updateData.seat_number;
        }
        if (updateData.notes !== undefined) {
            updateFields.push('notes = :notes');
            params.notes = updateData.notes;
        }

        if (updateFields.length === 0) {
            return false;
        }

        const sql = `
      UPDATE candidate_exam_registrations 
      SET ${updateFields.join(', ')}
      WHERE registration_id = :registrationId
    `;

        const result = await query(sql, params);
        // UPDATE trả về rowCount, không phải rows
        return result.rowCount > 0;
    }

    // Xóa đăng ký thi
    static async delete(registrationId) {
        const sql = 'DELETE FROM candidate_exam_registrations WHERE registration_id = :registrationId';
        const result = await query(sql, { registrationId });
        // DELETE trả về rowCount, không phải rows
        return result.rowCount > 0;
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