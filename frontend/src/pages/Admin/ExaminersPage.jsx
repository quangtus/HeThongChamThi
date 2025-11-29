import React, { useState, useEffect } from 'react';
import { examinerApi, userApi } from '../../api/adminApi';
import Alert from '../../components/ui/Alert';
import '../../styles/admin.css';

const ExaminersPage = () => {
  const [examiners, setExaminers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingExaminer, setEditingExaminer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [alert, setAlert] = useState({ show: false, type: 'error', message: '' });
  const [formData, setFormData] = useState({
    user_id: '',
    examiner_code: '',
    specialization: '',
    experience_years: 0,
    certification_level: 'JUNIOR',
    is_active: true
  });

  // State để lưu thông tin user được chọn
  const [selectedUser, setSelectedUser] = useState(null);

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

  // Load examiners when component mounts or filters change
  useEffect(() => {
    loadExaminers();
  }, [currentPage, debouncedSearchTerm, itemsPerPage]);

  // Load users when modal opens (only for creating new examiner)
  useEffect(() => {
    if (showModal && !editingExaminer) {
      loadUsers();
    }
  }, [showModal, editingExaminer]);

  const loadExaminers = async () => {
    try {
      setLoading(true);
      const response = await examinerApi.getExaminers({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearchTerm
      });
      
      if (response.success) {
        setExaminers(response.data);
        setTotalPages(response.pagination?.pages || 1);
      } else {
        setAlert({ show: true, type: 'error', message: 'Lỗi khi tải danh sách cán bộ chấm thi: ' + response.message });
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách cán bộ chấm thi:', error);
      setAlert({ show: true, type: 'error', message: `Lỗi khi tải danh sách cán bộ chấm thi: ${error.response?.data?.message || error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Chỉ lấy users có role_id = 2 (examiner) và chưa có examiner record
      const response = await userApi.getUsers({ 
        role_id: 2, 
        is_active: true,
        limit: 1000 // Lấy tất cả để filter
      });
      
      if (response.success) {
        // Reload examiners để có danh sách mới nhất
        const examinersResponse = await examinerApi.getExaminers({ limit: 1000 });
        const currentExaminers = examinersResponse.success ? examinersResponse.data : examiners;
        
        // Filter: chỉ lấy users chưa có examiner record
        const userIdsWithExaminer = new Set(currentExaminers.map(e => e.user_id));
        const availableUsers = response.data.filter(user => 
          !userIdsWithExaminer.has(user.user_id)
        );
        setUsers(availableUsers);
      } else {
        console.error('Lỗi khi tải danh sách users:', response.message);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách users:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'user_id') {
      // Khi chọn user, tự động lấy thông tin user đó
      const user = users.find(u => u.user_id === parseInt(value));
      setSelectedUser(user);
      setFormData({
        ...formData,
        [name]: value
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        examiner_code: (formData.examiner_code || '').toUpperCase() || undefined,
        specialization: formData.specialization || undefined,
        experience_years: Number(formData.experience_years || 0),
        certification_level: (formData.certification_level || 'JUNIOR').toUpperCase()
      };

      let response;
      if (editingExaminer) {
        response = await examinerApi.updateExaminer(editingExaminer.examiner_id, payload);
      } else {
        response = await examinerApi.createExaminer(payload);
      }
      
      if (response.success) {
        setAlert({ show: true, type: 'success', message: editingExaminer ? 'Cập nhật cán bộ chấm thi thành công!' : 'Tạo cán bộ chấm thi thành công!' });
        setShowModal(false);
        setEditingExaminer(null);
        resetForm();
        loadExaminers();
      } else {
        const detail = response.errors?.[0]?.msg || response.message;
        setAlert({ show: true, type: 'error', message: 'Lỗi: ' + detail });
      }
    } catch (error) {
      console.error('Lỗi khi lưu cán bộ chấm thi:', error);
      const data = error.response?.data;
      const detail = data?.errors?.[0]?.msg || data?.message || error.message;
      setAlert({ show: true, type: 'error', message: `Lỗi: ${detail}` });
    }
  };

  const handleEdit = (examiner) => {
    setEditingExaminer(examiner);
    // Tìm user tương ứng với examiner
    const user = users.find(u => u.user_id === examiner.user_id);
    setSelectedUser(user);
    setFormData({
      user_id: examiner.user_id,
      examiner_code: examiner.examiner_code,
      specialization: examiner.specialization || '',
      experience_years: examiner.experience_years || 0,
      certification_level: examiner.certification_level || 'JUNIOR',
      is_active: examiner.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (examiner) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa cán bộ chấm thi ${examiner.full_name}?`)) {
      try {
        const response = await examinerApi.deleteExaminer(examiner.examiner_id);
        if (response.success) {
          setAlert({ show: true, type: 'success', message: 'Xóa cán bộ chấm thi thành công!' });
          loadExaminers();
        } else {
          setAlert({ show: true, type: 'error', message: 'Lỗi: ' + response.message });
        }
      } catch (error) {
        console.error('Lỗi khi xóa cán bộ chấm thi:', error);
        setAlert({ show: true, type: 'error', message: `Lỗi: ${error.response?.data?.message || error.message}` });
      }
    }
  };

  const handleToggleStatus = async (examiner) => {
    try {
      const response = await examinerApi.toggleExaminerStatus(examiner.examiner_id, !examiner.is_active);
      if (response.success) {
        setAlert({ show: true, type: 'success', message: `Cán bộ chấm thi đã được ${!examiner.is_active ? 'kích hoạt' : 'vô hiệu hóa'}!` });
        loadExaminers();
      } else {
        setAlert({ show: true, type: 'error', message: 'Lỗi: ' + response.message });
      }
    } catch (error) {
      console.error('Lỗi khi thay đổi trạng thái cán bộ chấm thi:', error);
      setAlert({ show: true, type: 'error', message: `Lỗi: ${error.response?.data?.message || error.message}` });
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      examiner_code: '',
      specialization: '',
      experience_years: 0,
      certification_level: 'JUNIOR',
      is_active: true
    });
    setSelectedUser(null);
  };

  const handleAddNew = () => {
    setEditingExaminer(null);
    resetForm();
    setShowModal(true);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    // Không reset currentPage ở đây nữa vì đã xử lý trong debounce effect
  };

  const getCertificationLevelText = (level) => {
    const levels = {
      'JUNIOR': 'Cơ bản',
      'SENIOR': 'Nâng cao',
      'EXPERT': 'Chuyên gia'
    };
    return levels[level] || level;
  };

  const getCertificationLevelColor = (level) => {
    const colors = {
      'JUNIOR': 'bg-blue-100 text-blue-800',
      'SENIOR': 'bg-yellow-100 text-yellow-800',
      'EXPERT': 'bg-purple-100 text-purple-800'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="admin-container">
      <Alert 
        type={alert.type}
        message={alert.message}
        show={alert.show}
        position="fixed"
        autoClose={true}
        duration={4000}
        onClose={() => setAlert({ show: false, type: 'error', message: '' })}
      />
      
      <div className="admin-header">
        <h1 className="admin-title">Quản lý cán bộ chấm thi</h1>
        <button
          onClick={handleAddNew}
          className="admin-add-btn"
        >
          + Thêm cán bộ chấm thi
        </button>
      </div>

      {/* Search bar */}
      <div className="admin-search">
        <input
          type="text"
          placeholder="Tìm kiếm cán bộ chấm thi..."
          value={searchTerm}
          onChange={handleSearch}
          className="admin-search-input"
        />
        <div className="mt-4" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="file" id="examinerImport" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              
              // Validate file type
              const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
              if (!['.xlsx', '.xls', '.csv'].includes(fileExtension)) {
                setAlert({ show: true, type: 'error', message: 'Định dạng file không hợp lệ. Vui lòng chọn file .xlsx, .xls hoặc .csv' });
                e.target.value = '';
                return;
              }

              try {
                setLoading(true);
                const res = await examinerApi.importExaminers(file);
                
                // Check if there are errors in the response
                if (res.data && res.data.errors && res.data.errors.length > 0) {
                  const errorCount = res.data.failed || 0;
                  const successCount = res.data.success || 0;
                  const errorDetails = res.data.errors.slice(0, 5).map(err => 
                    `Dòng ${err.row}: ${err.message}`
                  ).join('\n');
                  
                  setAlert({ 
                    show: true, 
                    type: 'error', 
                    message: `Import hoàn tất: ${successCount} thành công, ${errorCount} lỗi.\n\nChi tiết lỗi:\n${errorDetails}${res.data.errors.length > 5 ? '\n...' : ''}` 
                  });
                } else {
                  setAlert({ show: true, type: 'success', message: res.message || 'Import thành công' });
                }
                loadExaminers();
              } catch (error) {
                const data = error.response?.data;
                let errorMessage = 'Import lỗi: ';
                
                if (data?.data?.errors && data.data.errors.length > 0) {
                  // Backend returned detailed errors
                  const errorCount = data.data.failed || 0;
                  const successCount = data.data.success || 0;
                  const errorDetails = data.data.errors.slice(0, 5).map(err => 
                    `Dòng ${err.row}: ${err.message}`
                  ).join('\n');
                  errorMessage = `Import hoàn tất: ${successCount} thành công, ${errorCount} lỗi.\n\nChi tiết lỗi:\n${errorDetails}${data.data.errors.length > 5 ? '\n...' : ''}`;
                } else {
                  errorMessage += data?.errors?.[0]?.msg || data?.message || error.message;
                }
                
                setAlert({ show: true, type: 'error', message: errorMessage });
              } finally {
                setLoading(false);
                e.target.value = '';
              }
            }} />
          <button className="admin-btn admin-btn-submit" onClick={() => document.getElementById('examinerImport').click()}>Import Excel/CSV</button>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
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
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          Đang tải...
        </div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Mã cán bộ</th>
                  <th>Họ tên</th>
                  <th>Chuyên môn</th>
                  <th>Kinh nghiệm</th>
                  <th>Cấp độ</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {examiners.map((examiner) => (
                  <tr key={examiner.examiner_id}>
                    <td><span className="admin-code">{examiner.examiner_id}</span></td>
                    <td><span className="admin-code">{examiner.examiner_code}</span></td>
                    <td>{examiner.full_name}</td>
                    <td>{examiner.specialization || '-'}</td>
                    <td>{examiner.experience_years} năm</td>
                    <td>
                      <span className={`certification-badge certification-${examiner.certification_level.toLowerCase()}`}>
                        {getCertificationLevelText(examiner.certification_level)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${examiner.is_active ? 'status-active' : 'status-inactive'}`}>
                        {examiner.is_active ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button 
                          onClick={() => handleEdit(examiner)}
                          className="admin-btn admin-btn-edit"
                        >
                          Sửa
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(examiner)}
                          className="admin-btn admin-btn-toggle"
                        >
                          {examiner.is_active ? 'Khóa' : 'Mở'}
                        </button>
                        <button 
                          onClick={() => handleDelete(examiner)}
                          className="admin-btn admin-btn-delete"
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="admin-pagination">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="admin-pagination-btn"
              >
                Trước
              </button>
              <span className="admin-pagination-info">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="admin-pagination-btn"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">
                {editingExaminer ? 'Sửa thông tin cán bộ chấm thi' : 'Thêm cán bộ chấm thi mới'}
              </h2>
            </div>
            
            {/* Alert bên trong modal */}
            <div className="px-6 pt-4">
              <Alert 
                type={alert.type}
                message={alert.message}
                show={alert.show && showModal}
                position="relative"
                autoClose={false}
                onClose={() => setAlert({ show: false, type: 'error', message: '' })}
              />
            </div>
            
            <div className="admin-modal-body">
              <form onSubmit={handleSubmit} className="admin-form">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">User:</label>
                    <select
                      name="user_id"
                      value={formData.user_id}
                      onChange={handleInputChange}
                      className="admin-form-select"
                      required
                    >
                      <option value="">-- Chọn user --</option>
                      {users.map((user) => (
                        <option key={user.user_id} value={user.user_id}>
                          {user.username} - {user.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Mã cán bộ chấm thi:</label>
                    <input
                      type="text"
                      name="examiner_code"
                      value={formData.examiner_code}
                      onChange={handleInputChange}
                      className="admin-form-input"
                      placeholder="Để trống để tự động tạo"
                    />
                  </div>
                </div>

                {/* Hiển thị thông tin user được chọn */}
                {selectedUser && (
                  <div className="admin-form-group">
                    <label className="admin-form-label">Thông tin User:</label>
                    <div className="user-info-display" style={{ 
                      background: '#f8f9fa', 
                      padding: '10px', 
                      borderRadius: '5px', 
                      border: '1px solid #dee2e6',
                      marginBottom: '15px'
                    }}>
                      <p><strong>Username:</strong> {selectedUser.username}</p>
                      <p><strong>Họ tên:</strong> {selectedUser.full_name}</p>
                      <p><strong>Email:</strong> {selectedUser.email || 'Chưa có'}</p>
                      <p><strong>Số điện thoại:</strong> {selectedUser.phone || 'Chưa có'}</p>
                    </div>
                  </div>
                )}

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Chuyên môn:</label>
                    <input
                      type="text"
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleInputChange}
                      className="admin-form-input"
                      placeholder="Ví dụ: Toán học, Vật lý..."
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Số năm kinh nghiệm:</label>
                    <input
                      type="number"
                      name="experience_years"
                      value={formData.experience_years}
                      onChange={handleInputChange}
                      className="admin-form-input"
                      min="0"
                      max="50"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Cấp độ chứng chỉ:</label>
                    <select
                      name="certification_level"
                      value={formData.certification_level}
                      onChange={handleInputChange}
                      className="admin-form-select"
                    >
                      <option value="JUNIOR">Cơ bản</option>
                      <option value="SENIOR">Nâng cao</option>
                      <option value="EXPERT">Chuyên gia</option>
                    </select>
                  </div>
                </div>

                <div className="admin-checkbox-group">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="admin-checkbox"
                  />
                  <label className="admin-form-label">Kích hoạt</label>
                </div>
              </form>
            </div>
            <div className="admin-modal-footer">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingExaminer(null);
                  resetForm();
                }}
                className="admin-btn-cancel"
              >
                Hủy
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="admin-btn-submit"
              >
                {editingExaminer ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExaminersPage;