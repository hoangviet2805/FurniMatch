import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Bước 1: Gửi yêu cầu lấy mã OTP
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data.message);
      setStep(2); // Chuyển sang bước nhập mã
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Bước 2: Bấm nút tiếp tục sau khi nhập mã OTP
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (code.length !== 8) {
      setError('Mã xác nhận phải gồm 8 chữ số.');
      return;
    }
    setMessage('Vui lòng nhập mật khẩu mới.');
    setStep(3); // Chuyển sang bước đổi mật khẩu
  };

  // Bước 3: Đổi mật khẩu
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        email,
        code,
        newPassword
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.response?.data || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
            Quên Mật Khẩu
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 1 && 'Nhập email của bạn để nhận mã khôi phục'}
            {step === 2 && 'Nhập mã 8 chữ số được gửi đến email của bạn'}
            {step === 3 && 'Thiết lập mật khẩu mới cho tài khoản'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center">
            {error}
          </div>
        )}

        {message && !success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm text-center">
            {message}
          </div>
        )}

        {/* BƯỚC 1: NHẬP EMAIL */}
        {step === 1 && (
          <form className="mt-8 space-y-6" onSubmit={handleRequestCode}>
            <div>
              <label htmlFor="email-address" className="sr-only">Email</label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder="Nhập địa chỉ email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors shadow-md disabled:bg-gray-400"
              >
                {loading ? 'Đang kiểm tra...' : 'Gửi Mã Xác Nhận'}
              </button>
            </div>
          </form>
        )}

        {/* BƯỚC 2: NHẬP MÃ OTP */}
        {step === 2 && (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyCode}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã xác nhận (8 số)</label>
              <input
                type="text"
                required
                maxLength={8}
                className="appearance-none rounded-lg text-center tracking-[0.5em] font-bold text-xl relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder="--------"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} // Chỉ cho nhập số
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors shadow-md"
              >
                Xác Nhận Mã
              </button>
            </div>
          </form>
        )}

        {/* BƯỚC 3: ĐỔI MẬT KHẨU */}
        {step === 3 && (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
             <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
                <input
                  type="password"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  placeholder="Nhập mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors shadow-md disabled:bg-gray-400"
              >
                {loading ? 'Đang lưu...' : 'Lưu Mật Khẩu Mới'}
              </button>
            </div>
          </form>
        )}

        {/* Nút quay lại chung */}
        <div className="text-center mt-4 pt-4 border-t border-gray-100">
          <Link to="/login" className="text-sm font-medium text-emerald-600 hover:text-emerald-500">
            Quay lại Đăng nhập
          </Link>
        </div>
      </div>

      {/* Success Modal Overlay */}
      {success && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50 transition-opacity">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center transform transition-all scale-100 opacity-100">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Đổi mật khẩu thành công!</h3>
            <p className="text-sm text-gray-500">Đang chuyển hướng về Đăng nhập...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgotPassword;
