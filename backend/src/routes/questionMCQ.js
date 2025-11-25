const express = require('express');
const router = express.Router();
const { listQuestions, createQuestion, deleteQuestion } = require('../controllers/questionMCQ');
const { authenticateToken } = require('../middlewares/auth');

// GET /api/mcq-questions?mcq_id=123
router.get('/', listQuestions);

// POST /api/mcq-questions
router.post('/', authenticateToken, createQuestion);

// DELETE /api/mcq-questions/:id
router.delete('/:id', authenticateToken, deleteQuestion);

module.exports = router;
