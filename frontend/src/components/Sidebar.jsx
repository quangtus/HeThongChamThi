import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Sidebar = ({ user }) => {
  const { isAdmin, isExaminer, isCandidate } = useAuth();

  // Menu cho Admin - Full quyền
  const adminNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { name: 'Quản lý Users', href: '/admin/users', icon: '👥' },
    { name: 'Cán bộ chấm thi', href: '/admin/examiners', icon: '👨‍🏫' },
    { name: 'Thí sinh', href: '/admin/candidates', icon: '👨‍🎓' },
    { name: 'Môn thi', href: '/admin/subjects', icon: '📚' },
    { name: 'Đề thi tự luận', href: '/admin/exam-essays', icon: '📝' },
    { name: 'Đề trắc nghiệm', href: '/admin/exam-mcq', icon: '📋' },
    { name: 'Tạo đề trắc nghiệm', href: '/admin/create-exam-mcq', icon: '➕' },
    { type: 'divider', name: 'Chấm thi tự luận' },
    { name: 'Phân công chấm thi', href: '/admin/grading/assignments', icon: '📑' },
    { name: 'So sánh kết quả', href: '/admin/grading/comparison', icon: '⚖️' },
    { name: 'Báo cáo thống kê', href: '/admin/statistics', icon: '📊' },
  ];

  // Menu cho Examiner - Chỉ chấm điểm
  const examinerNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { name: 'Chấm bài tự luận', href: '/examiner/grading', icon: '✍️' },
    { name: 'Thống kê cá nhân', href: '/examiner/statistics', icon: '📊' },
  ];

  // Menu cho Candidate - Chỉ làm bài
  const candidateNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
    { name: 'Danh sách bài thi', href: '/candidate/exams', icon: '📝' },
    { name: 'Kết quả của tôi', href: '/candidate/results', icon: '🏆' },
  ];

  // Chọn navigation dựa trên role
  let navigation = [];
  if (isAdmin) {
    navigation = adminNavigation;
  } else if (isExaminer) {
    navigation = examinerNavigation;
  } else if (isCandidate) {
    navigation = candidateNavigation;
  }

  return (
    <div className="w-[250px] bg-gray-800 text-white min-h-screen fixed left-0 top-0 p-5">
      <div>
        <h2 className="text-xl font-bold m-0">🎓 Hệ thống thi</h2>
        <p className="text-gray-400 text-sm mt-1">Chấm thi trực tuyến</p>
      </div>

      <nav className="mt-7">
        <div className="px-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {isAdmin && 'Quản lý'}
            {isExaminer && 'Chấm thi'}
            {isCandidate && 'Thi sinh'}
          </div>
        </div>

        <div className="mt-2">
          {navigation.map((item, index) => (
            item.type === 'divider' ? (
              <div key={index} className="mt-4 mb-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3">
                  {item.name}
                </div>
              </div>
            ) : (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) => `flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 transition ${isActive ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </NavLink>
            )
          ))}
        </div>
      </nav>

      {user && (
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-sm font-medium">
                {user.full_name?.charAt(0) || user.username?.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium m-0 text-white">{user.full_name || user.username}</p>
              <p className="text-xs text-gray-300 m-0">{user.role_name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
