import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, EyeOff, KeyRound, Mail, CheckCircle2, Lock } from 'lucide-react';
import api from '../utils/api';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, userRole }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleClose = () => {
    setStep(1);
    setEmail('');
    setOtp('');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    onClose();
  };

  const validatePassword = (pass: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
    return regex.test(pass);
  };

  const handleAdminChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validatePassword(newPassword)) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và ký tự đặc biệt.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    try {
      setLoading(true);
      await api.put('/auth/change-password', {
        oldPassword,
        newPassword
      });
      setSuccess('Đổi mật khẩu thành công!');
      setTimeout(() => handleClose(), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data || 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await api.post('/auth/forgot-password', { email });
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email không tồn tại trong hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validatePassword(newPassword)) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và ký tự đặc biệt.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/reset-password', {
        email,
        code: otp,
        newPassword
      });
      setSuccess('Đổi mật khẩu thành công!');
      setTimeout(() => handleClose(), 2000);
    } catch (err: any) {
      setError(err.response?.data || 'OTP không hợp lệ hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  const renderAdminFlow = () => (
    <form onSubmit={handleAdminChangePassword} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu hiện tại</label>
        <div className="relative">
          <input
            type={showOldPass ? "text" : "password"}
            required
            className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
          <button type="button" onClick={() => setShowOldPass(!showOldPass)} className="absolute right-3 top-2.5 text-gray-400">
            {showOldPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
        <div className="relative">
          <input
            type={showNewPass ? "text" : "password"}
            required
            className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-2.5 text-gray-400">
            {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nhập lại mật khẩu mới</label>
        <div className="relative">
          <input
            type={showConfirmPass ? "text" : "password"}
            required
            className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-2.5 text-gray-400">
            {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition font-medium"
      >
        {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
      </button>
    </form>
  );

  const renderOtpFlowStep1 = () => (
    <form onSubmit={handleSendOtp} className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">Vui lòng nhập email bạn đã dùng để đăng ký tài khoản. Chúng tôi sẽ gửi một mã OTP để xác nhận.</p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email đăng ký</label>
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="email"
            required
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ví dụ: nguyenvan@gmail.com"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition font-medium"
      >
        {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
      </button>
    </form>
  );

  const renderOtpFlowStep2 = () => (
    <form onSubmit={(e) => { e.preventDefault(); setError(''); setStep(3); }} className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">Mã OTP gồm 8 chữ số đã được gửi đến <strong>{email}</strong>.</p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nhập mã OTP</label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            required
            maxLength={8}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 tracking-widest text-center font-bold"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="••••••••"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={otp.length !== 8}
        className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Tiếp tục
      </button>
      <button
        type="button"
        onClick={() => setStep(1)}
        className="w-full text-emerald-600 text-sm hover:underline mt-2"
      >
        Quay lại
      </button>
    </form>
  );

  const renderOtpFlowStep3 = () => (
    <form onSubmit={handleVerifyOtpAndChangePassword} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type={showNewPass ? "text" : "password"}
            required
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-2.5 text-gray-400">
            {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nhập lại mật khẩu mới</label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type={showConfirmPass ? "text" : "password"}
            required
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-2.5 text-gray-400">
            {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition font-medium"
      >
        {loading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
      </button>
    </form>
  );

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
          Thay Đổi Mật Khẩu
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-sm rounded-lg border border-rose-100">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 text-sm rounded-lg border border-emerald-100 flex items-center gap-2">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        {!success && (
          userRole === 'ADMIN' 
            ? renderAdminFlow() 
            : step === 1 
              ? renderOtpFlowStep1() 
              : step === 2 
                ? renderOtpFlowStep2() 
                : renderOtpFlowStep3()
        )}
      </div>
    </div>,
    document.body
  );
};

export default ChangePasswordModal;
