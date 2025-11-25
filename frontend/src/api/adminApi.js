import api from './axios';

// API functions for authentication
export const authApi = {
    login: async(credentials) => {
        try {
            console.log('🔗 Making login request to:', '/auth/login');
            console.log('📤 Request data:', { username: credentials.username, password: '***' });

            const response = await api.post('/auth/login', credentials);

            console.log('📥 Login response:', response.data);

            return response.data;
        } catch (error) {
            console.error('❌ Login API error:', (error.response && error.response.data) || error.message);
            throw error;
        }
    },

    getCurrentUser: async() => {
        try {
            const response = await api.get('/auth/me');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    logout: async() => {
        try {
            const response = await api.post('/auth/logout');
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

// API functions for Node.js backend
export const userApi = {
    getUsers: async(params = {}) => {
        try {
            const response = await api.get('/users', { params });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getUserById: async(id) => {
        try {
            const response = await api.get(`/users/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    createUser: async(userData) => {
        try {
            const response = await api.post('/users', userData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    updateUser: async(id, userData) => {
        try {
            const response = await api.put(`/users/${id}`, userData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    deleteUser: async(id) => {
        try {
            const response = await api.delete(`/users/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    changeUserStatus: async(id, is_active) => {
        try {
            const response = await api.patch(`/users/${id}/status`, { is_active });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    importUsers: async(file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await api.post('/users/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

// API functions for roles
export const roleApi = {
    getRoles: async(params = {}) => {
        try {
            const response = await api.get('/roles', { params });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getRoleById: async(id) => {
        try {
            const response = await api.get(`/roles/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    createRole: async(roleData) => {
        try {
            const response = await api.post('/roles', roleData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    updateRole: async(id, roleData) => {
        try {
            const response = await api.put(`/roles/${id}`, roleData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    deleteRole: async(id) => {
        try {
            const response = await api.delete(`/roles/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

// API functions for candidates
export const candidateApi = {
    getCandidates: async(params = {}) => {
        try {
            const response = await api.get('/candidates', { params });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getCandidateById: async(id) => {
        try {
            const response = await api.get(`/candidates/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    createCandidate: async(candidateData) => {
        try {
            const response = await api.post('/candidates', candidateData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    updateCandidate: async(id, candidateData) => {
        try {
            const response = await api.put(`/candidates/${id}`, candidateData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    deleteCandidate: async(id) => {
        try {
            const response = await api.delete(`/candidates/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    toggleCandidateStatus: async(id, is_active) => {
        try {
            const response = await api.patch(`/candidates/${id}/status`, { is_active });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    importCandidates: async(file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await api.post('/candidates/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    exportCandidates: async(params = {}) => {
        try {
            const response = await api.get('/candidates/export', {
                params,
                responseType: 'blob'
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

// API functions for examiners
export const examinerApi = {
    getExaminers: async(params = {}) => {
        try {
            const response = await api.get('/examiners', { params });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getExaminerById: async(id) => {
        try {
            const response = await api.get(`/examiners/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    createExaminer: async(examinerData) => {
        try {
            const response = await api.post('/examiners', examinerData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    updateExaminer: async(id, examinerData) => {
        try {
            const response = await api.put(`/examiners/${id}`, examinerData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    deleteExaminer: async(id) => {
        try {
            const response = await api.delete(`/examiners/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    toggleExaminerStatus: async(id, is_active) => {
        try {
            const response = await api.patch(`/examiners/${id}/status`, { is_active });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    addExaminerSubject: async(id, subjectData) => {
        try {
            const response = await api.post(`/examiners/${id}/subjects`, subjectData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    removeExaminerSubject: async(id, subjectId) => {
        try {
            const response = await api.delete(`/examiners/${id}/subjects/${subjectId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getExaminerSubjects: async(id) => {
        try {
            const response = await api.get(`/examiners/${id}/subjects`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    importExaminers: async(file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await api.post('/examiners/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

// API functions for subjects
export const subjectApi = {
    getSubjects: async(params = {}) => {
        try {
            const response = await api.get('/subjects', { params });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getSubjectById: async(id) => {
        try {
            const response = await api.get(`/subjects/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    createSubject: async(subjectData) => {
        try {
            const response = await api.post('/subjects', subjectData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    updateSubject: async(id, subjectData) => {
        try {
            const response = await api.put(`/subjects/${id}`, subjectData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    deleteSubject: async(id) => {
        try {
            const response = await api.delete(`/subjects/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

// API functions for exam sessions
export const examSessionApi = {
    getExamSessions: async(params = {}) => {
        try {
            const response = await api.get('/exam-sessions', { params });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getExamSessionById: async(id) => {
        try {
            const response = await api.get(`/exam-sessions/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    createExamSession: async(sessionData) => {
        try {
            const response = await api.post('/exam-sessions', sessionData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    updateExamSession: async(id, sessionData) => {
        try {
            const response = await api.put(`/exam-sessions/${id}`, sessionData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    deleteExamSession: async(id) => {
        try {
            const response = await api.delete(`/exam-sessions/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

// API functions for exam essays (đề thi tự luận)
export const examEssayApi = {
    getExamEssays: async(params = {}) => {
        try {
            const response = await api.get('/exam-essays', { params });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    getExamEssayById: async(id) => {
        try {
            const response = await api.get(`/exam-essays/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    createExamEssay: async(essayData) => {
        try {
            const response = await api.post('/exam-essays', essayData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    updateExamEssay: async(id, essayData) => {
        try {
            const response = await api.put(`/exam-essays/${id}`, essayData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    deleteExamEssay: async(id) => {
        try {
            const response = await api.delete(`/exam-essays/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Essay Questions
    getQuestions: async(essayId) => {
        try {
            const response = await api.get(`/exam-essays/${essayId}/questions`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    addQuestion: async(essayId, questionData) => {
        try {
            const response = await api.post(`/exam-essays/${essayId}/questions`, questionData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    updateQuestion: async(questionId, questionData) => {
        try {
            const response = await api.put(`/exam-essays/questions/${questionId}`, questionData);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    deleteQuestion: async(questionId) => {
        try {
            const response = await api.delete(`/exam-essays/questions/${questionId}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

// API functions for question banks (ngân hàng trắc nghiệm)
// Question bank feature moved to Team 2; API removed

export default userApi;