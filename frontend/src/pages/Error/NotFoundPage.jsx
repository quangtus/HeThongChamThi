import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="container text-center">
      <h1>404 - Trang không tìm thấy</h1>
      <p>Xin lỗi, trang bạn đang tìm kiếm không tồn tại.</p>
      <Link to="/dashboard" className="action-button">
        Về trang chủ
      </Link>
    </div>
  );
};

export default NotFoundPage;
