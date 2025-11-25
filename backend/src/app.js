const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

app.use('/api', require('./routes/upload'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/roles', require('./routes/roles'));
app.use('/api/candidates', require('./routes/candidates'));
app.use('/api/examiners', require('./routes/examiners'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/exam-essays', require('./routes/examEssays'));
app.use('/api/exam-mcq', require("./routes/examMCQ"));
app.use('/api/mcq-questions', require('./routes/questionMCQ'));
app.use('/api/grading', require('./routes/grading'));
app.use('/api/statistics', require('./routes/statistics'));

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Default route
app.get('/', (req, res) => {
    res.json({
        message: 'Exam Management System API',
        version: '1.0.0',
        endpoints: [
            '/api/auth/login',
            '/api/users',
            '/api/roles',
            '/api/candidates',
            '/api/examiners',
            '/api/registrations',
            '/api/subjects',
            '/api/exam-essays',
            '/api/question-banks',
            '/api/exam-mcq',
            '/api/mcq-questions',
            '/api/grading',
            '/api/statistics',
        ]
    });
});

// 404 handler
app.use('*', (req, res) => {
    console.log('❌ Route not found:', req.method, req.originalUrl);
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/auth/login`);
    console.log(`👥 Users endpoint: http://localhost:${PORT}/api/users`);
});

module.exports = app;