import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAuth } from '../hooks/useAuth.jsx';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const confirmed = window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?');
    if (!confirmed) return;

    try {
      await logout();
      toast.info('Đã đăng xuất khỏi hệ thống');
      navigate('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Đăng xuất thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar user={user} />
      <div className="min-h-screen lg:ml-[250px] flex flex-col">
        <Header user={user} onLogout={handleLogout} />
        <main className="flex-1 px-5 py-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;