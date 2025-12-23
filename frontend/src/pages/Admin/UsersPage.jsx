import React, { useState, useEffect } from 'react';
import { userApi } from '../../api/adminApi';
import axios from 'axios';
import Alert from '../../components/ui/Alert';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: 'error', message: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    role_id: '',
    is_active: true
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadUsers();
  }, [currentPage, debouncedSearchTerm, itemsPerPage, selectedRole]);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userApi.getUsers({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearchTerm,
        role_id: selectedRole || undefined
      });
      
      if (response.success) {
        setUsers(response.data);
        setTotalPages(response.pagination?.pages || 1);
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

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleRoleFilterChange = (e) => {
    setSelectedRole(e.target.value);
    setCurrentPage(1);
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
      const roleId = parseInt(formData.role_id);
      if (isNaN(roleId) || roleId < 1) {
        setAlert({ show: true, type: 'error', message: 'Vui lòng chọn vai trò hợp lệ' });
        return;
      }
      
      const submitData = {
        ...formData,
        role_id: roleId
      };
      
      if (editingUser && (!submitData.password || submitData.password.trim() === '')) {
        delete submitData.password;
      }
      
      let response;
      if (editingUser) {
        response = await userApi.updateUser(editingUser.user_id, submitData);
      } else {
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
      const errorMessage = error.response?.data?.message || error.message;
      const errorDetails = error.response?.data?.errors?.[0]?.msg;
      setAlert({ show: true, type: 'error', message: `Lỗi: ${errorDetails || errorMessage}` });
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
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
          const mode = response.data?.mode;
          const dynamicMessage = response.message || (mode === 'soft'
            ? 'User đang liên kết dữ liệu khác nên đã được khóa.'
            : 'Xóa user thành công!');
          setAlert({ show: true, type: 'success', message: dynamicMessage });
          loadUsers();
        } else {
          setAlert({ show: true, type: 'error', message: 'Lỗi: ' + response.message });
        }
      } catch (error) {
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
      setAlert({ show: true, type: 'error', message: `Lỗi: ${error.response?.data?.message || error.message}` });
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!['.xlsx', '.xls', '.csv'].includes(fileExtension)) {
      setAlert({ show: true, type: 'error', message: 'Định dạng file không hợp lệ. Vui lòng chọn file .xlsx, .xls hoặc .csv' });
      e.target.value = '';
      return;
    }

    try {
      setLoading(true);
      const res = await userApi.importUsers(file);
      
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
      loadUsers();
    } catch (error) {
      const data = error.response?.data;
      let errorMessage = 'Import lỗi: ';
      
      if (data?.data?.errors && data.data.errors.length > 0) {
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
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <Alert 
        type={alert.type}
        message={alert.message}
        show={alert.show}
        position="fixed"
        autoClose={true}
        duration={4000}
        onClose={() => setAlert({ show: false, type: 'error', message: '' })}
      />
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-white">Quản lý người dùng</h1>
        <div className="flex gap-2">
          <input 
            type="file" 
            id="userImport" 
            accept=".xlsx,.xls,.csv" 
            className="hidden"
            onChange={handleImportFile} 
          />
          <button 
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition"
            onClick={() => document.getElementById('userImport').click()}
          >
            Import Excel/CSV
          </button>
          <button
            onClick={handleAddNew}
            className="px-6 py-2 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5"
          >
            + Thêm User
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
        <input
          type="text"
          placeholder="Tìm kiếm users..."
          value={searchTerm}
          onChange={handleSearch}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
        />
        <div className="flex flex-wrap gap-4 items-center mt-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Lọc vai trò:</label>
            <select
              value={selectedRole}
              onChange={handleRoleFilterChange}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value="">Tất cả</option>
              {roles.map(role => (
                <option key={role.role_id} value={String(role.role_id)}>
                  {role.role_name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Hiển thị:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
            >
              <option value={10}>10</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-500">mục/trang</span>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center gap-3 p-12 text-gray-500">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          Đang tải...
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">ID</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">Username</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">Họ tên</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">Email</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">Vai trò</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">Trạng thái</th>
                <th className="px-4 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.user_id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded font-mono text-sm">{user.user_id}</span>
                  </td>
                  <td className="px-4 py-4 text-gray-700">{user.username}</td>
                  <td className="px-4 py-4 text-gray-700">{user.full_name}</td>
                  <td className="px-4 py-4 text-gray-700">{user.email}</td>
                  <td className="px-4 py-4 text-gray-700">{user.role_name}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      user.is_active 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {user.is_active ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(user)}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition"
                      >
                        Sửa
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(user)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition"
                      >
                        {user.is_active ? 'Khóa' : 'Mở'}
                      </button>
                      <button 
                        onClick={() => handleDelete(user)}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition"
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
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Trước
          </button>
          <span className="text-sm text-gray-600">
            Trang {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Sau
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600">
              <h2 className="text-xl font-bold text-white">
                {editingUser ? 'Sửa thông tin User' : 'Thêm User Mới'}
              </h2>
            </div>
            
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
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username:</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password:</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                    required={!editingUser}
                    placeholder={editingUser ? "Để trống nếu không muốn thay đổi" : ""}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên:</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại:</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò:</label>
                  <select
                    name="role_id"
                    value={formData.role_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition"
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
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label className="text-sm font-medium text-gray-700">Kích hoạt</label>
                </div>
              </form>
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingUser(null);
                  resetForm();
                }}
                className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition"
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
