const CandidateExamRegistration = require('../models/CandidateExamRegistration');
const { validationResult } = require('express-validator');

// @desc    Lấy danh sách đăng ký thi
// @route   GET /api/registrations
// @access  Private (Admin, Supervisor)
const getRegistrations = async (req, res) => {
  try {
    const filters = {
      candidate_id: req.query.candidate_id,
      subject_id: req.query.subject_id,
      status: req.query.status,
      exam_type: req.query.exam_type,
      exam_session: req.query.exam_session,
      limit: req.query.limit ? parseInt(req.query.limit) : null
    };

    const registrations = await CandidateExamRegistration.findAllWithDetails(filters);

    res.json({
      success: true,
      data: registrations,
      total: registrations.length
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

    const registrationData = {
      candidate_id: req.body.candidate_id,
      subject_id: req.body.subject_id,
      exam_type: req.body.exam_type,
      exam_session: req.body.exam_session,
      exam_room: req.body.exam_room,
      seat_number: req.body.seat_number,
      notes: req.body.notes
    };

    const registrationId = await CandidateExamRegistration.create(registrationData);

    // Lấy thông tin đăng ký vừa tạo
    const newRegistration = await CandidateExamRegistration.findById(registrationId);

    res.status(201).json({
      success: true,
      message: 'Đăng ký thi thành công',
      data: newRegistration
    });
  } catch (error) {
    console.error('Error creating registration:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Thí sinh đã đăng ký môn thi này rồi'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo đăng ký thi',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Cập nhật trạng thái đăng ký thi
// @route   PUT /api/registrations/:id/status
// @access  Private (Admin, Supervisor)
const updateRegistrationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    const approvedBy = req.user.userId;

    // Kiểm tra đăng ký có tồn tại không
    const existingRegistration = await CandidateExamRegistration.findById(id);
    if (!existingRegistration) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đăng ký thi'
      });
    }

    const success = await CandidateExamRegistration.updateStatus(
      id, 
      status, 
      approvedBy, 
      rejection_reason
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
    const { id } = req.params;
    const updateData = {
      exam_type: req.body.exam_type,
      exam_session: req.body.exam_session,
      exam_room: req.body.exam_room,
      seat_number: req.body.seat_number,
      notes: req.body.notes
    };

    // Kiểm tra đăng ký có tồn tại không
    const existingRegistration = await CandidateExamRegistration.findById(id);
    if (!existingRegistration) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đăng ký thi'
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
