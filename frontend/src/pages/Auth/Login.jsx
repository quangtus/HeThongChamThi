import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth.jsx';
import Alert from '../../components/ui/Alert';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username.trim() || !formData.password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(formData);

      if (result.success) {
        toast.success('Đăng nhập thành công!');
        navigate(from, { replace: true });
      } else {
        setError(result.message || 'Đăng nhập thất bại');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl px-8 py-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-slate-900">Đăng nhập hệ thống</h2>
            <p className="mt-2 text-sm text-slate-500">Hệ thống thi và chấm thi trực tuyến</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <Alert
                type="error"
                message={error}
                position="relative"
                autoClose={false}
                className="w-full"
              />
            )}

            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-slate-700">
                Tên đăng nhập
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100"
                placeholder="Nhập tên đăng nhập"
                value={formData.username}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:bg-slate-100"
                  placeholder="Nhập mật khẩu"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-indigo-600 transition"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? (
                <>
                  <span className="mr-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                  Đang đăng nhập...
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-indigo-100 bg-indigo-50 px-6 py-5 text-sm text-indigo-900 shadow-inner">
            <h4 className="font-semibold text-indigo-800 mb-2">Tài khoản demo</h4>
            <ul className="space-y-1 text-xs text-indigo-700">
              <li><strong>Admin:</strong> admin / admin123</li>
              <li><strong>Examiner:</strong> examiner / examiner123</li>
              <li><strong>Candidate:</strong> candidate / candidate123</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;