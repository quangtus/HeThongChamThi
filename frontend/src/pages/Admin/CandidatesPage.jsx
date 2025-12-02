import React, { useState, useEffect } from 'react';
import { candidateApi, userApi, subjectApi } from '../../api/adminApi';
import registrationApi from '../../api/registrationApi';
import Alert from '../../components/ui/Alert';
import '../../styles/admin.css';

const CandidatesPage = () => {
  const [candidates, setCandidates] = useState([]);
  const [users, setUsers] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [editingRegistration, setEditingRegistration] = useState(null);
  const [activeTab, setActiveTab] = useState('candidates'); // 'candidates' hoặc 'registrations'
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [registrationPage, setRegistrationPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [registrationTotalPages, setRegistrationTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [registrationItemsPerPage, setRegistrationItemsPerPage] = useState(10);
  const [alert, setAlert] = useState({ show: false, type: 'error', message: '' });
  const [formData, setFormData] = useState({
    user_id: '',
    candidate_code: '',
    date_of_birth: '',
    identity_card: '',
    address: '',
    is_active: true
  });

  // State để lưu thông tin user được chọn
  const [selectedUser, setSelectedUser] = useState(null);

  const [registrationFormData, setRegistrationFormData] = useState({
    candidate_id: '',
    subject_id: '',
    exam_type: 'BOTH',
    exam_session: '',
    exam_room: '',
    seat_number: '',
    notes: ''
  });

  // Debounce search term - chỉ gọi API sau khi người dùng ngừng gõ 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset về trang 1 khi tìm kiếm
      setRegistrationPage(1); // Reset registration page khi tìm kiếm
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  // Load candidates when component mounts
  useEffect(() => {
    if (activeTab === 'candidates') {
      loadCandidates();
    } else if (activeTab === 'registrations') {
      loadRegistrations();
      loadSubjects();
      loadCandidates(); // Load candidates for registration form
    }
  }, [currentPage, registrationPage, debouncedSearchTerm, activeTab, itemsPerPage, registrationItemsPerPage]);

  // Load users when modal opens (only for creating new candidate)
  useEffect(() => {
    if (showModal && activeTab === 'candidates' && !editingCandidate) {
      loadUsers();
    }
  }, [showModal, activeTab, editingCandidate]);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const response = await candidateApi.getCandidates({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearchTerm
      });
      
      if (response.success) {
        setCandidates(response.data);
        setTotalPages(response.pagination?.pages || 1);
      } else {
        setAlert({ show: true, type: 'error', message: 'Lỗi khi tải danh sách thí sinh: ' + response.message });
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách thí sinh:', error);
      setAlert({ show: true, type: 'error', message: `Lỗi khi tải danh sách thí sinh: ${error.response?.data?.message || error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async (includeUserId = null) => {
    try {
      // Chỉ lấy users có role_id = 3 (candidate) và chưa có candidate record
      const response = await userApi.getUsers({ 
        role_id: 3, 
        is_active: true,
        limit: 1000 // Lấy tất cả để filter
      });
      
      if (response.success) {
        // Reload candidates để có danh sách mới nhất
        const candidatesResponse = await candidateApi.getCandidates({ limit: 1000 });
        const currentCandidates = candidatesResponse.success ? candidatesResponse.data : candidates;
        
        // Filter: chỉ lấy users chưa có candidate record, hoặc include user hiện tại nếu đang edit
        const userIdsWithCandidate = new Set(currentCandidates.map(c => c.user_id));
        const availableUsers = response.data.filter(user => 
          !userIdsWithCandidate.has(user.user_id) || (includeUserId && user.user_id === includeUserId)
        );
        setUsers(availableUsers);
      } else {
        console.error('Lỗi khi tải danh sách users:', response.message);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách users:', error);
    }
  };

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const response = await registrationApi.getRegistrations({
        page: registrationPage,
        limit: registrationItemsPerPage,
        search: debouncedSearchTerm
      });
      
      if (response.data.success) {
        setRegistrations(response.data.data);
        setRegistrationTotalPages(response.data.pagination?.pages || 1);
      } else {
        setAlert({ show: true, type: 'error', message: 'Lỗi khi tải danh sách đăng ký thi: ' + response.data.message });
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách đăng ký thi:', error);
      setAlert({ show: true, type: 'error', message: `Lỗi khi tải danh sách đăng ký thi: ${error.response?.data?.message || error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const res = await subjectApi.getSubjects({ is_active: true, limit: 100 });
      if (res.success) {
        setSubjects(res.data || []);
      } else {
        console.error('Lỗi khi tải danh sách môn thi:', res.message);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách môn thi:', error);
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

  const handleRegistrationInputChange = (e) => {
    const { name, value } = e.target;
    setRegistrationFormData({
      ...registrationFormData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // sanitize payload to satisfy backend validations
      const payload = {
        ...formData,
        candidate_code: (formData.candidate_code || '').toUpperCase() || undefined,
        identity_card: formData.identity_card || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
      };

      let response;
      if (editingCandidate) {
        response = await candidateApi.updateCandidate(editingCandidate.candidate_id, payload);
      } else {
        response = await candidateApi.createCandidate(payload);
      }
      
      if (response.success) {
        setAlert({ show: true, type: 'success', message: editingCandidate ? 'Cập nhật thí sinh thành công!' : 'Tạo thí sinh thành công!' });
        setShowModal(false);
        setEditingCandidate(null);
        resetForm();
        loadCandidates();
      } else {
        const detail = response.errors?.[0]?.msg || response.message;
        setAlert({ show: true, type: 'error', message: 'Lỗi: ' + detail });
      }
    } catch (error) {
      console.error('Lỗi khi lưu thí sinh:', error);
      const data = error.response?.data;
      const detail = data?.errors?.[0]?.msg || data?.message || error.message;
      setAlert({ show: true, type: 'error', message: `Lỗi: ${detail}` });
    }
  };

  const handleEdit = async (candidate) => {
    // Load candidate mới nhất từ API để đảm bảo có dữ liệu cập nhật
    let latestCandidate = candidate;
    try {
      const candidateResponse = await candidateApi.getCandidateById(candidate.candidate_id);
      if (candidateResponse.success) {
        latestCandidate = candidateResponse.data;
      }
    } catch (error) {
      console.error('Lỗi khi load candidate mới nhất, sử dụng dữ liệu từ danh sách:', error);
    }
    
    setEditingCandidate(latestCandidate);
    
    // Load user hiện tại từ API để hiển thị thông tin
    let currentUser = null;
    try {
      const userResponse = await userApi.getUserById(latestCandidate.user_id);
      if (userResponse.success) {
        currentUser = userResponse.data;
        setSelectedUser(currentUser);
      }
    } catch (error) {
      console.error('Lỗi khi load user:', error);
    }
    
    // Load users với include user hiện tại và đảm bảo user hiện tại có trong danh sách
    await loadUsers(latestCandidate.user_id);
    
    // Đảm bảo user hiện tại luôn có trong danh sách
    if (currentUser) {
      setUsers(prevUsers => {
        const exists = prevUsers.some(u => u.user_id === latestCandidate.user_id);
        if (!exists) {
          return [currentUser, ...prevUsers];
        }
        return prevUsers;
      });
    }
    
    // Format date_of_birth cho input type="date" (YYYY-MM-DD)
    let formattedDate = '';
    if (latestCandidate.date_of_birth) {
      try {
        let dateValue = latestCandidate.date_of_birth;
        
        // Nếu đã là định dạng YYYY-MM-DD, dùng trực tiếp
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
          formattedDate = dateValue;
        } else {
          // Parse date và format lại
          let date;
          if (typeof dateValue === 'string') {
            // Xử lý các định dạng string khác nhau
            // Nếu có timezone info, parse bình thường
            if (dateValue.includes('T') || dateValue.includes('Z') || dateValue.includes('+')) {
              date = new Date(dateValue);
            } else {
              // Nếu chỉ có date (YYYY-MM-DD hoặc DD/MM/YYYY), parse cẩn thận
              // Thử parse như ISO date trước
              date = new Date(dateValue + 'T00:00:00');
              // Nếu không hợp lệ, thử parse như local date
              if (isNaN(date.getTime())) {
                // Thử format DD/MM/YYYY hoặc MM/DD/YYYY
                const parts = dateValue.split(/[\/\-]/);
                if (parts.length === 3) {
                  // Giả sử format là YYYY-MM-DD hoặc DD-MM-YYYY
                  if (parts[0].length === 4) {
                    // YYYY-MM-DD
                    date = new Date(parts[0], parts[1] - 1, parts[2]);
                  } else {
                    // DD-MM-YYYY hoặc MM-DD-YYYY
                    date = new Date(parts[2], parts[1] - 1, parts[0]);
                  }
                }
              }
            }
          } else if (dateValue instanceof Date) {
            date = dateValue;
          } else {
            date = new Date(dateValue);
          }
          
          // Format thành YYYY-MM-DD, tránh timezone issues
          if (date && !isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}`;
          }
        }
      } catch (error) {
        console.error('Lỗi khi format date_of_birth:', error, latestCandidate.date_of_birth);
        formattedDate = '';
      }
    }
    
    setFormData({
      user_id: latestCandidate.user_id,
      candidate_code: latestCandidate.candidate_code,
      date_of_birth: formattedDate,
      identity_card: latestCandidate.identity_card || '',
      address: latestCandidate.address || '',
      is_active: latestCandidate.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (candidate) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa thí sinh ${candidate.full_name}?`)) {
      try {
        const response = await candidateApi.deleteCandidate(candidate.candidate_id);
        if (response.success) {
          setAlert({ show: true, type: 'success', message: 'Xóa thí sinh thành công!' });
          loadCandidates();
        } else {
          setAlert({ show: true, type: 'error', message: 'Lỗi: ' + response.message });
        }
      } catch (error) {
        console.error('Lỗi khi xóa thí sinh:', error);
        setAlert({ show: true, type: 'error', message: `Lỗi: ${error.response?.data?.message || error.message}` });
      }
    }
  };

  const handleToggleStatus = async (candidate) => {
    try {
      const response = await candidateApi.toggleCandidateStatus(candidate.candidate_id, !candidate.is_active);
      if (response.success) {
        setAlert({ show: true, type: 'success', message: `Thí sinh đã được ${!candidate.is_active ? 'kích hoạt' : 'vô hiệu hóa'}!` });
        loadCandidates();
      } else {
        setAlert({ show: true, type: 'error', message: 'Lỗi: ' + response.message });
      }
    } catch (error) {
      console.error('Lỗi khi thay đổi trạng thái thí sinh:', error);
      setAlert({ show: true, type: 'error', message: `Lỗi: ${error.response?.data?.message || error.message}` });
    }
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      candidate_code: '',
      date_of_birth: '',
      identity_card: '',
      address: '',
      is_active: true
    });
    setSelectedUser(null);
  };

  const handleAddNew = () => {
    setEditingCandidate(null);
    resetForm();
    setShowModal(true);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    // Không reset currentPage ở đây nữa vì đã xử lý trong debounce effect
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'PENDING': { text: 'Chờ duyệt', class: 'status-pending' },
      'APPROVED': { text: 'Đã duyệt', class: 'status-approved' },
      'REJECTED': { text: 'Từ chối', class: 'status-rejected' },
      'CANCELLED': { text: 'Hủy bỏ', class: 'status-cancelled' }
    };
    const statusInfo = statusMap[status] || { text: status, class: 'status-default' };
    return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  const getExamTypeText = (examType) => {
    const typeMap = {
      'ESSAY': 'Tự luận',
      'MCQ': 'Trắc nghiệm',
      'BOTH': 'Cả hai'
    };
    return typeMap[examType] || examType;
  };

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (editingRegistration) {
        // Khi cập nhật, không gửi candidate_id và subject_id
        const updateData = {
          exam_type: registrationFormData.exam_type,
          exam_session: registrationFormData.exam_session || null,
          exam_room: registrationFormData.exam_room || null,
          seat_number: registrationFormData.seat_number || null,
          notes: registrationFormData.notes || null
        };
        response = await registrationApi.updateRegistration(editingRegistration.registration_id, updateData);
      } else {
        // Khi tạo mới, chuẩn hóa dữ liệu
        const createData = {
          candidate_id: parseInt(registrationFormData.candidate_id),
          subject_id: parseInt(registrationFormData.subject_id),
          exam_type: registrationFormData.exam_type,
          exam_session: registrationFormData.exam_session || null,
          exam_room: registrationFormData.exam_room || null,
          seat_number: registrationFormData.seat_number || null,
          notes: registrationFormData.notes || null
        };

        // Validate required fields
        if (!createData.candidate_id || !createData.subject_id || !createData.exam_type) {
          setAlert({ show: true, type: 'error', message: 'Vui lòng điền đầy đủ thông tin bắt buộc: Thí sinh, Môn thi, Loại thi' });
          return;
        }

        response = await registrationApi.createRegistration(createData);
      }
      
      if (response.data.success) {
        setAlert({ show: true, type: 'success', message: editingRegistration ? 'Cập nhật đăng ký thi thành công!' : 'Tạo đăng ký thi thành công!' });
        setShowRegistrationModal(false);
        setEditingRegistration(null);
        resetRegistrationForm();
        loadRegistrations();
      } else {
        setAlert({ show: true, type: 'error', message: 'Lỗi: ' + response.data.message });
      }
    } catch (error) {
      console.error('Lỗi khi lưu đăng ký thi:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      setAlert({ show: true, type: 'error', message: `Lỗi: ${errorMessage}` });
    }
  };

  const handleRegistrationEdit = (registration) => {
    setEditingRegistration(registration);
    setRegistrationFormData({
      candidate_id: registration.candidate_id,
      subject_id: registration.subject_id,
      exam_type: registration.exam_type,
      exam_session: registration.exam_session || '',
      exam_room: registration.exam_room || '',
      seat_number: registration.seat_number || '',
      notes: registration.notes || ''
    });
    setShowRegistrationModal(true);
  };

  const handleRegistrationStatusUpdate = async (registration, newStatus) => {
    try {
      const response = await registrationApi.updateRegistrationStatus(registration.registration_id, {
        status: newStatus
      });
      
      if (response.data.success) {
        setAlert({ show: true, type: 'success', message: 'Cập nhật trạng thái đăng ký thi thành công!' });
        loadRegistrations();
      } else {
        setAlert({ show: true, type: 'error', message: 'Lỗi: ' + response.data.message });
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái đăng ký thi:', error);
      setAlert({ show: true, type: 'error', message: `Lỗi: ${error.response?.data?.message || error.message}` });
    }
  };

  const handleRegistrationDelete = async (registration) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa đăng ký thi này?`)) {
      try {
        const response = await registrationApi.deleteRegistration(registration.registration_id);
        if (response.data.success) {
          setAlert({ show: true, type: 'success', message: 'Xóa đăng ký thi thành công!' });
          loadRegistrations();
        } else {
          setAlert({ show: true, type: 'error', message: 'Lỗi: ' + response.data.message });
        }
      } catch (error) {
        console.error('Lỗi khi xóa đăng ký thi:', error);
        setAlert({ show: true, type: 'error', message: `Lỗi: ${error.response?.data?.message || error.message}` });
      }
    }
  };

  const resetRegistrationForm = () => {
    setRegistrationFormData({
      candidate_id: '',
      subject_id: '',
      exam_type: 'BOTH',
      exam_session: '',
      exam_room: '',
      seat_number: '',
      notes: ''
    });
  };

  const handleAddNewRegistration = () => {
    setEditingRegistration(null);
    resetRegistrationForm();
    setShowRegistrationModal(true);
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
        <h1 className="admin-title">Quản lý thí sinh</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`admin-tab-btn ${activeTab === 'candidates' ? 'active' : ''}`}
          >
            Danh sách thí sinh
          </button>
          <button
            onClick={() => setActiveTab('registrations')}
            className={`admin-tab-btn ${activeTab === 'registrations' ? 'active' : ''}`}
          >
            Đăng ký thi
          </button>
        </div>
        <button
          onClick={activeTab === 'candidates' ? handleAddNew : handleAddNewRegistration}
          className="admin-add-btn"
        >
          + {activeTab === 'candidates' ? 'Thêm thí sinh' : 'Thêm đăng ký thi'}
        </button>
      </div>

      {/* Search bar */}
      <div className="admin-search">
        <input
          type="text"
          placeholder={activeTab === 'candidates' ? "Tìm kiếm thí sinh..." : "Tìm kiếm đăng ký thi..."}
          value={searchTerm}
          onChange={handleSearch}
          className="admin-search-input"
        />
        <div className="mt-4" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {activeTab === 'candidates' && (
            <>
              <input type="file" id="candidateImport" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
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
                    const res = await candidateApi.importCandidates(file);
                    
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
                    loadCandidates();
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
              <button className="admin-btn admin-btn-submit" onClick={() => document.getElementById('candidateImport').click()}>Import Excel/CSV</button>
            </>
          )}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
            <label style={{ fontSize: '14px' }}>Hiển thị:</label>
            <select
              value={activeTab === 'candidates' ? itemsPerPage : registrationItemsPerPage}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (activeTab === 'candidates') {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                } else {
                  setRegistrationItemsPerPage(value);
                  setRegistrationPage(1);
                }
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
          {activeTab === 'candidates' ? (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Mã thí sinh</th>
                    <th>Họ tên</th>
                    <th>Ngày sinh</th>
                    <th>CMND/CCCD</th>
                    <th>Email</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr key={candidate.candidate_id}>
                      <td><span className="admin-code">{candidate.candidate_id}</span></td>
                      <td><span className="admin-code">{candidate.candidate_code}</span></td>
                      <td>{candidate.full_name}</td>
                      <td>{formatDate(candidate.date_of_birth)}</td>
                      <td>{candidate.identity_card || '-'}</td>
                      <td>{candidate.email || '-'}</td>
                      <td>
                        <span className={`status-badge ${candidate.is_active ? 'status-active' : 'status-inactive'}`}>
                          {candidate.is_active ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button 
                            onClick={() => handleEdit(candidate)}
                            className="admin-btn admin-btn-edit"
                          >
                            Sửa
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(candidate)}
                            className="admin-btn admin-btn-toggle"
                          >
                            {candidate.is_active ? 'Khóa' : 'Mở'}
                          </button>
                          <button 
                            onClick={() => handleDelete(candidate)}
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
          ) : (
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Thí sinh</th>
                    <th>Môn thi</th>
                    <th>Loại thi</th>
                    <th>Trạng thái</th>
                    <th>Ca thi</th>
                    <th>Phòng thi</th>
                    <th>Số bàn</th>
                    <th>Ngày đăng ký</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((registration) => (
                    <tr key={registration.registration_id}>
                      <td><span className="admin-code">{registration.registration_id}</span></td>
                      <td>
                        <div>
                          <div><strong>{registration.candidate_name}</strong></div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{registration.candidate_code}</div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div><strong>{registration.subject_name}</strong></div>
                          <div style={{ fontSize: '12px', color: '#666' }}>{registration.subject_code}</div>
                        </div>
                      </td>
                      <td>{getExamTypeText(registration.exam_type)}</td>
                      <td>{getStatusBadge(registration.status)}</td>
                      <td>{registration.exam_session || '-'}</td>
                      <td>{registration.exam_room || '-'}</td>
                      <td>{registration.seat_number || '-'}</td>
                      <td>{formatDate(registration.registration_date)}</td>
                      <td>
                        <div className="admin-actions">
                          <button 
                            onClick={() => handleRegistrationEdit(registration)}
                            className="admin-btn admin-btn-edit"
                          >
                            Sửa
                          </button>
                          {registration.status === 'PENDING' && (
                            <>
                              <button 
                                onClick={() => handleRegistrationStatusUpdate(registration, 'APPROVED')}
                                className="admin-btn admin-btn-approve"
                                style={{ backgroundColor: '#10b981', color: 'white' }}
                              >
                                Duyệt
                              </button>
                              <button 
                                onClick={() => handleRegistrationStatusUpdate(registration, 'REJECTED')}
                                className="admin-btn admin-btn-reject"
                                style={{ backgroundColor: '#ef4444', color: 'white' }}
                              >
                                Từ chối
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => handleRegistrationDelete(registration)}
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
          )}

          {/* Pagination */}
          {activeTab === 'candidates' && totalPages > 1 && (
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
          {activeTab === 'registrations' && registrationTotalPages > 1 && (
            <div className="admin-pagination">
              <button
                onClick={() => setRegistrationPage(prev => Math.max(prev - 1, 1))}
                disabled={registrationPage === 1}
                className="admin-pagination-btn"
              >
                Trước
              </button>
              <span className="admin-pagination-info">
                Trang {registrationPage} / {registrationTotalPages}
              </span>
              <button
                onClick={() => setRegistrationPage(prev => Math.min(prev + 1, registrationTotalPages))}
                disabled={registrationPage === registrationTotalPages}
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
          <div className="admin-modal admin-modal--wide">
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">
                {editingCandidate ? 'Sửa thông tin thí sinh' : 'Thêm thí sinh mới'}
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
                      disabled={editingCandidate} // Không cho phép đổi user khi đang edit
                    >
                      <option value="">-- Chọn user (chỉ hiển thị users có role Thí sinh) --</option>
                      {users.length === 0 ? (
                        <option value="" disabled>
                          Không có user nào có role Thí sinh hoặc tất cả đã có candidate record
                        </option>
                      ) : (
                        users.map((user) => (
                          <option key={user.user_id} value={user.user_id}>
                            {user.username} - {user.full_name}
                          </option>
                        ))
                      )}
                    </select>
                    {users.length === 0 && !editingCandidate && (
                      <small className="admin-form-hint" style={{ color: '#e74c3c', display: 'block', marginTop: '5px' }}>
                        ⚠️ Không có user nào có role "Thí sinh" (role_id = 3) hoặc tất cả đã có candidate record. 
                        Vui lòng tạo user mới với role "Thí sinh" trước.
                      </small>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Mã thí sinh:</label>
                    <input
                      type="text"
                      name="candidate_code"
                      value={formData.candidate_code}
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
                    <label className="admin-form-label">Ngày sinh:</label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                      className="admin-form-input"
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">CMND/CCCD:</label>
                    <input
                      type="text"
                      name="identity_card"
                      value={formData.identity_card}
                      onChange={handleInputChange}
                      className="admin-form-input"
                    />
                  </div>
                </div>


                <div className="admin-form-group">
                  <label className="admin-form-label">Địa chỉ:</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="admin-form-textarea"
                    rows="3"
                  />
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
                  setEditingCandidate(null);
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
                {editingCandidate ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registration Modal */}
      {showRegistrationModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal admin-modal--wide">
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">
                {editingRegistration ? 'Sửa đăng ký thi' : 'Thêm đăng ký thi mới'}
              </h2>
            </div>
            
            {/* Alert bên trong modal */}
            <div className="px-6 pt-4">
              <Alert 
                type={alert.type}
                message={alert.message}
                show={alert.show && showRegistrationModal}
                position="relative"
                autoClose={false}
                onClose={() => setAlert({ show: false, type: 'error', message: '' })}
              />
            </div>
            
            <div className="admin-modal-body">
              <form onSubmit={handleRegistrationSubmit} className="admin-form">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Thí sinh:</label>
                    <select
                      name="candidate_id"
                      value={registrationFormData.candidate_id}
                      onChange={handleRegistrationInputChange}
                      className="admin-form-select"
                      required
                    >
                      <option value="">-- Chọn thí sinh --</option>
                      {candidates.map((candidate) => (
                        <option key={candidate.candidate_id} value={candidate.candidate_id}>
                          {candidate.candidate_code} - {candidate.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Môn thi:</label>
                    <select
                      name="subject_id"
                      value={registrationFormData.subject_id}
                      onChange={handleRegistrationInputChange}
                      className="admin-form-select"
                      required
                    >
                      <option value="">-- Chọn môn thi --</option>
                      {subjects.map((subject) => (
                        <option key={subject.subject_id} value={subject.subject_id}>
                          {subject.subject_code} - {subject.subject_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Loại thi:</label>
                    <select
                      name="exam_type"
                      value={registrationFormData.exam_type}
                      onChange={handleRegistrationInputChange}
                      className="admin-form-select"
                      required
                    >
                      <option value="ESSAY">Tự luận</option>
                      <option value="MCQ">Trắc nghiệm</option>
                      <option value="BOTH">Cả hai</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Ca thi:</label>
                    <input
                      type="text"
                      name="exam_session"
                      value={registrationFormData.exam_session}
                      onChange={handleRegistrationInputChange}
                      className="admin-form-input"
                      placeholder="VD: Ca 1, Ca 2"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label">Phòng thi:</label>
                    <input
                      type="text"
                      name="exam_room"
                      value={registrationFormData.exam_room}
                      onChange={handleRegistrationInputChange}
                      className="admin-form-input"
                      placeholder="VD: P101, P102"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label">Số bàn:</label>
                    <input
                      type="text"
                      name="seat_number"
                      value={registrationFormData.seat_number}
                      onChange={handleRegistrationInputChange}
                      className="admin-form-input"
                      placeholder="VD: A01, B02"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Ghi chú:</label>
                  <textarea
                    name="notes"
                    value={registrationFormData.notes}
                    onChange={handleRegistrationInputChange}
                    className="admin-form-textarea"
                    rows="3"
                    placeholder="Ghi chú thêm..."
                  />
                </div>
              </form>
            </div>
            <div className="admin-modal-footer">
              <button
                type="button"
                onClick={() => {
                  setShowRegistrationModal(false);
                  setEditingRegistration(null);
                  resetRegistrationForm();
                }}
                className="admin-btn-cancel"
              >
                Hủy
              </button>
              <button
                type="submit"
                onClick={handleRegistrationSubmit}
                className="admin-btn-submit"
              >
                {editingRegistration ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidatesPage;