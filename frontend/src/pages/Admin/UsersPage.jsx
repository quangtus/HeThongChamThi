import React, { useState, useEffect } from 'react';
import { userApi } from '../../api/adminApi';
import axios from 'axios';
import Alert from '../../components/ui/Alert';
import '../../styles/admin.css';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: 'error', message: '' });
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    role_id: '',
    is_active: true
  });

  // Load users and roles when component mounts
  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userApi.getUsers();
      
      if (response.success) {
        setUsers(response.data);
      } else {
        setAlert({ show: true, type: 'error', message: 'Lỗi khi tải danh sách users: ' + response.message });
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách users:', error);
      setAlert({ show: true, type: 'error', message: `Lỗi khi tải danh sách users: ${error.response?.data?.message || error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users/roles/list', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        setRoles(response.data.data);
        console.log('Roles loaded:', response.data.data);
      } else {
        console.error('Lỗi khi tải danh sách roles:', response.data.message);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách roles:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate and convert role_id to integer
      const roleId = parseInt(formData.role_id);
      if (isNaN(roleId) || roleId < 1) {
        setAlert({ show: true, type: 'error', message: 'Vui lòng chọn vai trò hợp lệ' });
        return;
      }
      
      const submitData = {
        ...formData,
        role_id: roleId
      };
      
      console.log('📤 Sending user data:', submitData);
      
      let response;
      if (editingUser) {
        // Update existing user
        response = await userApi.updateUser(editingUser.user_id, submitData);
      } else {
        // Create new user
        response = await userApi.createUser(submitData);
      }
      
      if (response.success) {
        setAlert({ show: true, type: 'success', message: editingUser ? 'Cập nhật user thành công!' : 'Tạo user thành công!' });
        setShowModal(false);
        setEditingUser(null);
        resetForm();
        loadUsers();
      } else {
        setAlert({ show: true, type: 'error', message: 'Lỗi: ' + response.message });
      }
    } catch (error) {
      console.error('Lỗi khi lưu user:', error);
      const errorMessage = error.response?.data?.message || error.message;
      const errorDetails = error.response?.data?.errors?.[0]?.msg;
      setAlert({ show: true, type: 'error', message: `Lỗi: ${errorDetails || errorMessage}` });
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Don't pre-fill password for security
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || '',
      role_id: user.role_id,
      is_active: user.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (user) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa user ${user.username}?`)) {
      try {
        const response = await userApi.deleteUser(user.user_id);
        
        if (response.success) {
          setAlert({ show: true, type: 'success', message: 'Xóa user thành công!' });
          loadUsers();
        } else {
          setAlert({ show: true, type: 'error', message: 'Lỗi: ' + response.message });
        }
      } catch (error) {
        console.error('Lỗi khi xóa user:', error);
        setAlert({ show: true, type: 'error', message: `Lỗi: ${error.response?.data?.message || error.message}` });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      full_name: '',
      email: '',
      phone: '',
      role_id: '',
      is_active: true
    });
  };

  const handleAddNew = () => {
    setEditingUser(null);
    resetForm();
    setShowModal(true);
  };

  const handleToggleStatus = async (user) => {
    try {
      const response = await userApi.updateUser(user.user_id, {
        ...user,
        is_active: !user.is_active
      });
      
      if (response.success) {
        setAlert({ show: true, type: 'success', message: `User đã được ${!user.is_active ? 'kích hoạt' : 'vô hiệu hóa'}!` });
        loadUsers();
      } else {
        setAlert({ show: true, type: 'error', message: 'Lỗi: ' + response.message });
      }
    } catch (error) {
      console.error('Lỗi khi thay đổi trạng thái user:', error);
      setAlert({ show: true, type: 'error', message: `Lỗi: ${error.response?.data?.message || error.message}` });
    }
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
        <h1 className="admin-title">Quản lý người dùng</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="file" id="userImport" accept=".xlsx,.xls" style={{ display: 'none' }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const res = await userApi.importUsers(file);
                setAlert({ show: true, type: 'success', message: res.message || 'Import thành công' });
                loadUsers();
              } catch (error) {
                const data = error.response?.data;
                const detail = data?.errors?.[0]?.msg || data?.message || error.message;
                setAlert({ show: true, type: 'error', message: 'Import lỗi: ' + detail });
              } finally {
                e.target.value = '';
              }
            }} />
          <button className="admin-btn admin-btn-submit" onClick={() => document.getElementById('userImport').click()}>Import Excel</button>
          <button
            onClick={handleAddNew}
            className="admin-add-btn"
          >
            + Thêm User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          Đang tải...
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td><span className="admin-code">{user.user_id}</span></td>
                  <td>{user.username}</td>
                  <td>{user.full_name}</td>
                  <td>{user.email}</td>
                  <td>{user.role_name}</td>
                  <td>
                    <span className={`status-badge ${user.is_active ? 'status-active' : 'status-inactive'}`}>
                      {user.is_active ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button 
                        onClick={() => handleEdit(user)}
                        className="admin-btn admin-btn-edit"
                      >
                        Sửa
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(user)}
                        className="admin-btn admin-btn-toggle"
                      >
                        {user.is_active ? 'Khóa' : 'Mở'}
                      </button>
                      <button 
                        onClick={() => handleDelete(user)}
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

      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">
                {editingUser ? 'Sửa thông tin User' : 'Thêm User Mới'}
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
                <div className="admin-form-group">
                  <label className="admin-form-label">Username:</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="admin-form-input"
                    required
                  />
                </div>
                
                <div className="admin-form-group">
                  <label className="admin-form-label">Password:</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="admin-form-input"
                    required={!editingUser}
                    placeholder={editingUser ? "Để trống nếu không muốn thay đổi" : ""}
                  />
                </div>
                
                <div className="admin-form-group">
                  <label className="admin-form-label">Họ tên:</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="admin-form-input"
                    required
                  />
                </div>
                
                <div className="admin-form-group">
                  <label className="admin-form-label">Email:</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="admin-form-input"
                    required
                  />
                </div>
                
                <div className="admin-form-group">
                  <label className="admin-form-label">Số điện thoại:</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="admin-form-input"
                  />
                </div>
                
                <div className="admin-form-group">
                  <label className="admin-form-label">Vai trò:</label>
                  <select
                    name="role_id"
                    value={formData.role_id}
                    onChange={handleInputChange}
                    className="admin-form-select"
                    required
                  >
                    <option value="">-- Chọn vai trò --</option>
                    {roles.map((role) => (
                      <option key={role.role_id} value={String(role.role_id)}>
                        {role.role_name}
                      </option>
                    ))}
                  </select>
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
                  setEditingUser(null);
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
                {editingUser ? 'Cập nhật' : 'Tạo mới'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;