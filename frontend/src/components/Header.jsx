import React from 'react';
import { Link } from 'react-router-dom';

const Header = ({ user, onLogout }) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 m-0">Hệ thống thi và chấm thi</h1>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/profile" className="text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100">
              👤 Profile
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Xin chào, {user?.full_name || user?.username}</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{user?.role_name}</span>
            </div>

            <button onClick={onLogout} className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700">
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
