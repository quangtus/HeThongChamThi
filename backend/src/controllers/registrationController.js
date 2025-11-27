const CandidateExamRegistration = require('../models/CandidateExamRegistration');
const { validationResult } = require('express-validator');

// @desc    Lấy danh sách đăng ký thi
// @route   GET /api/registrations
// @access  Private (Admin, Supervisor)
const getRegistrations = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (page - 1) * limit;

    const filters = {
      candidate_id: req.query.candidate_id,
      subject_id: req.query.subject_id,
      status: req.query.status,
      exam_type: req.query.exam_type,
      exam_session: req.query.exam_session,
      search: search,
      limit: parseInt(limit),
      offset: parseInt(skip)
    };

    const { registrations, total } = await CandidateExamRegistration.findAllWithDetails(filters);

    res.json({
      success: true,
      data: registrations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách đăng ký thi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Lấy thông tin đăng ký thi theo ID
// @route   GET /api/registrations/:id
// @access  Private
const getRegistrationById = async (req, res) => {
  try {
    const { id } = req.params;
    const registration = await CandidateExamRegistration.findById(id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đăng ký thi'
      });
    }

    res.json({
      success: true,
      data: registration
    });
  } catch (error) {
    console.error('Error getting registration:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin đăng ký thi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Tạo đăng ký thi mới
// @route   POST /api/registrations
// @access  Private (Candidate, Admin)
const createRegistration = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    // Validate và chuẩn hóa dữ liệu
    const registrationData = {
      candidate_id: parseInt(req.body.candidate_id),
      subject_id: parseInt(req.body.subject_id),
      exam_type: req.body.exam_type?.toUpperCase(),
      exam_session: req.body.exam_session || null,
      exam_room: req.body.exam_room || null,
      seat_number: req.body.seat_number || null,
      notes: req.body.notes || null
    };

    // Validate required fields
    if (!registrationData.candidate_id || !registrationData.subject_id || !registrationData.exam_type) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: candidate_id, subject_id, exam_type'
      });
    }

    // Validate exam_type
    if (!['ESSAY', 'MCQ', 'BOTH'].includes(registrationData.exam_type)) {
      return res.status(400).json({
        success: false,
        message: 'Loại thi không hợp lệ. Phải là: ESSAY, MCQ, hoặc BOTH'
      });
    }

    console.log('Creating registration with data:', registrationData);

    const registrationId = await CandidateExamRegistration.create(registrationData);

    if (!registrationId) {
      return res.status(500).json({
        success: false,
        message: 'Không thể tạo đăng ký thi: không nhận được ID từ database'
      });
    }

    // Lấy thông tin đăng ký vừa tạo
    const newRegistration = await CandidateExamRegistration.findById(registrationId);

    if (!newRegistration) {
      return res.status(500).json({
        success: false,
        message: 'Đăng ký thi đã được tạo nhưng không thể lấy thông tin chi tiết'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Đăng ký thi thành công',
      data: newRegistration
    });
  } catch (error) {
    console.error('Error creating registration:', error);
    console.error('Error stack:', error.stack);
    
    // Xử lý các lỗi PostgreSQL phổ biến
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Thí sinh đã đăng ký môn thi này rồi'
      });
    }

    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Thí sinh hoặc môn thi không tồn tại'
      });
    }

    if (error.code === '23514') {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ với ràng buộc database'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo đăng ký thi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      errorCode: process.env.NODE_ENV === 'development' ? error.code : undefined
    });
  }
};

// @desc    Cập nhật trạng thái đăng ký thi
// @route   PUT /api/registrations/:id/status
// @access  Private (Admin, Supervisor)
const updateRegistrationStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    
    // Kiểm tra user đã đăng nhập
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Chưa đăng nhập hoặc phiên đăng nhập không hợp lệ'
      });
    }

    const approvedBy = req.user.userId;

    // Kiểm tra đăng ký có tồn tại không
    const existingRegistration = await CandidateExamRegistration.findById(id);
    if (!existingRegistration) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đăng ký thi'
      });
    }

    // Validate status transition (nghiệp vụ)
    const currentStatus = existingRegistration.status;
    const validTransitions = {
      'PENDING': ['APPROVED', 'REJECTED', 'CANCELLED'],
      'APPROVED': ['CANCELLED'], // Đã duyệt chỉ có thể hủy
      'REJECTED': ['PENDING', 'APPROVED'], // Từ chối có thể chuyển về chờ duyệt hoặc duyệt lại
      'CANCELLED': [] // Đã hủy không thể chuyển trạng thái
    };

    if (validTransitions[currentStatus] && !validTransitions[currentStatus].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Không thể chuyển từ trạng thái "${currentStatus}" sang "${status}". Chỉ có thể chuyển sang: ${validTransitions[currentStatus].join(', ')}`
      });
    }

    const success = await CandidateExamRegistration.updateStatus(
      id, 
      status, 
      approvedBy, 
      rejection_reason || null
    );

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Không thể cập nhật trạng thái đăng ký thi'
      });
    }

    // Lấy thông tin đăng ký đã cập nhật
    const updatedRegistration = await CandidateExamRegistration.findById(id);

    res.json({
      success: true,
      message: 'Cập nhật trạng thái đăng ký thi thành công',
      data: updatedRegistration
    });
  } catch (error) {
    console.error('Error updating registration status:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật trạng thái đăng ký thi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Cập nhật thông tin đăng ký thi
// @route   PUT /api/registrations/:id
// @access  Private (Admin, Supervisor)
const updateRegistration = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    
    // Chỉ lấy các trường được phép cập nhật (không bao gồm candidate_id và subject_id)
    const updateData = {};
    if (req.body.exam_type !== undefined) updateData.exam_type = req.body.exam_type;
    if (req.body.exam_session !== undefined) updateData.exam_session = req.body.exam_session;
    if (req.body.exam_room !== undefined) updateData.exam_room = req.body.exam_room;
    if (req.body.seat_number !== undefined) updateData.seat_number = req.body.seat_number;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;

    // Kiểm tra đăng ký có tồn tại không
    const existingRegistration = await CandidateExamRegistration.findById(id);
    if (!existingRegistration) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đăng ký thi'
      });
    }

    // Kiểm tra có dữ liệu để cập nhật không
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có dữ liệu để cập nhật'
      });
    }

    const success = await CandidateExamRegistration.update(id, updateData);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Không thể cập nhật thông tin đăng ký thi'
      });
    }

    // Lấy thông tin đăng ký đã cập nhật
    const updatedRegistration = await CandidateExamRegistration.findById(id);

    res.json({
      success: true,
      message: 'Cập nhật thông tin đăng ký thi thành công',
      data: updatedRegistration
    });
  } catch (error) {
    console.error('Error updating registration:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật thông tin đăng ký thi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Xóa đăng ký thi
// @route   DELETE /api/registrations/:id
// @access  Private (Admin, Candidate - chỉ xóa của mình)
const deleteRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra đăng ký có tồn tại không
    const existingRegistration = await CandidateExamRegistration.findById(id);
    if (!existingRegistration) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đăng ký thi'
      });
    }

    // Kiểm tra quyền xóa (Candidate chỉ có thể xóa đăng ký của mình)
    if (req.user.roleName === 'candidate' && existingRegistration.candidate_id !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa đăng ký thi này'
      });
    }

    const success = await CandidateExamRegistration.delete(id);

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa đăng ký thi'
      });
    }

    res.json({
      success: true,
      message: 'Xóa đăng ký thi thành công'
    });
  } catch (error) {
    console.error('Error deleting registration:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa đăng ký thi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Lấy đăng ký thi của thí sinh
// @route   GET /api/registrations/candidate/:candidateId
// @access  Private
const getRegistrationsByCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;

    // Kiểm tra quyền truy cập (Candidate chỉ có thể xem đăng ký của mình)
    if (req.user.roleName === 'candidate' && parseInt(candidateId) !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem đăng ký thi này'
      });
    }

    const registrations = await CandidateExamRegistration.findByCandidateId(candidateId);

    res.json({
      success: true,
      data: registrations,
      total: registrations.length
    });
  } catch (error) {
    console.error('Error getting candidate registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy đăng ký thi của thí sinh',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Lấy thống kê đăng ký thi
// @route   GET /api/registrations/statistics
// @access  Private (Admin, Supervisor)
const getRegistrationStatistics = async (req, res) => {
  try {
    const statistics = await CandidateExamRegistration.getStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error getting registration statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thống kê đăng ký thi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getRegistrations,
  getRegistrationById,
  createRegistration,
  updateRegistrationStatus,
  updateRegistration,
  deleteRegistration,
  getRegistrationsByCandidate,
  getRegistrationStatistics
};
