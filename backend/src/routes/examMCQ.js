const express = require('express');
const router = express.Router();
const { getExams, getExamById, createExam, updateExamInfo, updateExam, deleteExam } = require('../controllers/examMCQController');
const { authenticateToken } = require('../middlewares/auth');

// GET /api/exam-mcq
router.get('/', getExams);

// GET /api/exam-mcq/:id
router.get('/:id', getExamById);

// POST /api/exam-mcq
router.post('/', authenticateToken, createExam);

// PATCH /api/exam-mcq/:id/info
router.patch('/:id/info', authenticateToken, updateExamInfo);

// PUT /api/exam-mcq/:id
router.put('/:id', authenticateToken, updateExam);

// DELETE /api/exam-mcq/:id
router.delete('/:id', authenticateToken, deleteExam);

module.exports = router;
