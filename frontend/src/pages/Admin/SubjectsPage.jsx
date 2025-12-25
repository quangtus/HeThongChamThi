import React, { useState, useEffect } from 'react';
import { subjectApi } from '../../api/adminApi';
import Alert from '../../components/ui/Alert';
import { validateSubjectForm } from '../../utils/formValidation';
import '../../styles/admin.css';
import '../../styles/admin.tw.css';

const SubjectsPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: 'error', message: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    subject_code: '',
    subject_name: '',
    description: '',
    is_active: true
  });

  // Debounce search term - chỉ gọi API sau khi người dùng ngừng gõ 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset về trang 1 khi tìm kiếm
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  useEffect(() => {
    loadSubjects();
  }, [currentPage, debouncedSearchTerm, itemsPerPage]);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const response = await subjectApi.getSubjects({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearchTerm
      });

      if (response.success) {
        setSubjects(response.data);
        setTotalPages((response.pagination && response.pagination.pages) || 1);
      }
    } catch (error) {
      setAlert({ show: true, type: 'error', message: 'Lỗi khi tải danh sách: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Validate form data trước khi gửi
      const validatedData = validateSubjectForm(formData);
      
      const response = editingSubject
        ? await subjectApi.updateSubject(editingSubject.subject_id, validatedData)
        : await subjectApi.createSubject(validatedData);

      if (response.success) {
        setAlert({ show: true, type: 'success', message: response.message });
        loadSubjects();
        handleCloseModal();
      }
    } catch (error) {
      const errorMessage = error.message || 
                           (error.response && error.response.data && error.response.data.message) || 
                           'Đã xảy ra lỗi';
      setAlert({ show: true, type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (subject) => {
    if (window.confirm(`Bạn có chắc muốn xóa môn "${subject.subject_name}"?`)) {
      try {
        const response = await subjectApi.deleteSubject(subject.subject_id);
        if (response.success) {
          setAlert({ show: true, type: 'success', message: response.message });
          loadSubjects();
        }
      } catch (error) {
        setAlert({ show: true, type: 'error', message: (error.response && error.response.data && error.response.data.message) || error.message });
      }
    }
  };

  const handleOpenModal = (subject = null) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        subject_code: subject.subject_code,
        subject_name: subject.subject_name,
        description: subject.description || '',
        is_active: subject.is_active
      });
    } else {
      setEditingSubject(null);
      setFormData({
        subject_code: '',
        subject_name: '',
        description: '',
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSubject(null);
  };

  return (
    <div className="admin-container">
      {alert.show && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ show: false, type: 'error', message: '' })}
        />
      )}

      {/* Header với Gradient và Icons */}
      <div className="admin-header flex justify-between items-center">
        <div>
          <h1 className="admin-title text-3xl font-bold flex items-center gap-3">
            📚 Quản lý Môn thi
          </h1>
          <p className="text-white/80 text-sm mt-2">
            Quản lý danh sách các môn thi trong hệ thống
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="admin-add-btn hover:scale-105 transition-transform duration-200 flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          Thêm môn thi
        </button>
      </div>

      {/* Search Bar với Icon */}
      <div className="admin-search">
        <div className="relative">
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm theo mã môn hoặc tên môn..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              // Không reset currentPage ở đây nữa vì đã xử lý trong debounce effect
            }}
            className="admin-search-input pl-12 w-full"
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
          <label style={{ fontSize: '14px' }}>Hiển thị:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="admin-form-select"
            style={{ width: 'auto', padding: '4px 8px' }}
          >
            <option value={10}>10</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span style={{ fontSize: '14px', color: '#666' }}>mục/trang</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Tổng số môn</p>
              <p className="text-3xl font-bold mt-2">{subjects.length}</p>
            </div>
            <div className="text-5xl opacity-30">📚</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Đang hoạt động</p>
              <p className="text-3xl font-bold mt-2">
                {subjects.filter(s => s.is_active).length}
              </p>
            </div>
            <div className="text-5xl opacity-30">✅</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Ngừng hoạt động</p>
              <p className="text-3xl font-bold mt-2">
                {subjects.filter(s => !s.is_active).length}
              </p>
            </div>
            <div className="text-5xl opacity-30">⛔</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-container">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-500"></div>
            <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-gray-500 text-lg">Chưa có môn thi nào</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Thêm môn thi đầu tiên
            </button>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã môn</th>
                <th>Tên môn thi</th>
                <th>Mô tả</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject) => (
                <tr key={subject.subject_id} className="hover:bg-gray-50 transition">
                  <td>
                    <span className="font-mono font-bold text-blue-600">
                      {subject.subject_code}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📖</span>
                      <span className="font-semibold">{subject.subject_name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-gray-600 text-sm">{subject.description || '-'}</span>
                  </td>
                  <td>
                    {subject.is_active ? (
                      <span className="admin-badge-active inline-flex items-center gap-1">
                        <span>✓</span> Hoạt động
                      </span>
                    ) : (
                      <span className="admin-badge-inactive inline-flex items-center gap-1">
                        <span>⊘</span> Ngừng
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenModal(subject)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition flex items-center gap-1"
                        title="Sửa"
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(subject)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition flex items-center gap-1"
                        title="Xóa"
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-pagination flex justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="admin-page-btn px-4 py-2 disabled:opacity-50"
          >
            ← Trước
          </button>
          
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i + 1}
              className={`admin-page-btn px-4 py-2 ${
                currentPage === i + 1 ? 'active' : ''
              }`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="admin-page-btn px-4 py-2 disabled:opacity-50"
          >
            Sau →
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSubject ? 'Sửa Môn thi' : 'Thêm Môn thi mới'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Mã môn *</label>
                <input
                  type="text"
                  value={formData.subject_code}
                  onChange={(e) => setFormData({...formData, subject_code: e.target.value})}
                  required
                  disabled={editingSubject}
                />
                {editingSubject && <small className="form-hint">Không thể thay đổi mã môn</small>}
              </div>
              <div className="form-group">
                <label>Tên môn thi *</label>
                <input
                  type="text"
                  value={formData.subject_name}
                  onChange={(e) => setFormData({...formData, subject_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Trạng thái</label>
                <select
                  value={formData.is_active ? 'true' : 'false'}
                  onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="true">✅ Kích hoạt</option>
                  <option value="false">⛔ Ngừng hoạt động</option>
                </select>
                <small className="text-gray-500 text-xs mt-1">Môn thi có thể được sử dụng để tạo đề thi khi ở trạng thái kích hoạt</small>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Đang xử lý...' : (editingSubject ? 'Cập nhật' : 'Thêm mới')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectsPage;
