import React from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="container">
      <h1>👤 Thông tin cá nhân</h1>
      {user ? (
        <div className="card">
          <h3>Thông tin tài khoản</h3>
          <p><strong>Tên đăng nhập:</strong> {user.username}</p>
          <p><strong>Họ tên:</strong> {user.full_name}</p>
          <p><strong>Email:</strong> {user.email || 'Chưa cập nhật'}</p>
          <p><strong>Vai trò:</strong> {user.role_name}</p>
          <p><strong>Trạng thái:</strong> {user.is_active ? 'Hoạt động' : 'Bị khóa'}</p>
        </div>
      ) : (
        <p>Không có thông tin người dùng</p>
      )}
    </div>
  );
};

export default ProfilePage;
