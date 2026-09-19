import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { verifyRegistration } from '../utils/api';
import LocationPicker from '../components/LocationPicker';
import { useProvinces } from '../hooks/useProvinces';

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    roleName: 'CUSTOMER', // Default
    shopName: '',
    shopDescription: '',
    isCustomSizeSupported: false,
    latitude: null as number | null,
    longitude: null as number | null,
    province: '',
    district: '',
    ward: '',
    addressDetail: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  const {
    provinces,
    districts,
    wards,
    selectedProvinceCode,
    setSelectedProvinceCode,
    selectedDistrictCode,
    setSelectedDistrictCode
  } = useProvinces();

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Trình duyệt của bạn không hỗ trợ định vị.');
      return;
    }
    setLocationStatus('Đang lấy vị trí...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setLocationStatus('Đã lấy vị trí thành công!');
      },
      () => {
        setLocationStatus('Không thể lấy vị trí. Vui lòng cấp quyền.');
      }
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', formData);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data || 'Có lỗi xảy ra khi đăng ký.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (code.length !== 8) {
      setError('Mã xác nhận phải gồm 8 chữ số');
      return;
    }

    setLoading(true);
    try {
      await verifyRegistration({ email: formData.email, code });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Xác thực thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
            {step === 1 ? 'Tạo Tài Khoản Mới' : 'Xác Thực Email'}
          </h2>
          {step === 2 && (
            <p className="mt-2 text-center text-sm text-gray-600">
              Chúng tôi đã gửi một mã gồm 8 chữ số đến <span className="font-medium text-gray-900">{formData.email}</span>
            </p>
          )}
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm space-y-4">
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại Tài Khoản</label>
              <select
                name="roleName"
                value={formData.roleName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="CUSTOMER">Khách Hàng</option>
                <option value="SELLER">Nhà Sản Xuất (Xưởng)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ Tên</label>
              <input
                name="fullName"
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số Điện Thoại</label>
              <input
                name="phone"
                type="tel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <input
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ giao nhận</label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
                <select
                  name="province"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  value={selectedProvinceCode || ''}
                  onChange={(e) => {
                    const code = Number(e.target.value);
                    setSelectedProvinceCode(code);
                    const provinceName = provinces.find(p => p.code === code)?.name || '';
                    setFormData(prev => ({ ...prev, province: provinceName, district: '', ward: '' }));
                    setSelectedDistrictCode(null);
                  }}
                  required
                >
                  <option value="">Chọn Tỉnh/Thành</option>
                  {provinces.map(p => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>

                <select
                  name="district"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  value={selectedDistrictCode || ''}
                  onChange={(e) => {
                    const code = Number(e.target.value);
                    setSelectedDistrictCode(code);
                    const districtName = districts.find(d => d.code === code)?.name || '';
                    setFormData(prev => ({ ...prev, district: districtName, ward: '' }));
                  }}
                  required
                  disabled={!selectedProvinceCode}
                >
                  <option value="">Chọn Quận/Huyện</option>
                  {districts.map(d => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </select>

                <select
                  name="ward"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                  value={wards.find(w => w.name === formData.ward)?.code || ''}
                  onChange={(e) => {
                    const code = Number(e.target.value);
                    const wardName = wards.find(w => w.code === code)?.name || '';
                    setFormData(prev => ({ ...prev, ward: wardName }));
                  }}
                  required
                  disabled={!selectedDistrictCode}
                >
                  <option value="">Chọn Phường/Xã</option>
                  {wards.map(w => (
                    <option key={w.code} value={w.code}>{w.name}</option>
                  ))}
                </select>
              </div>
              <input
                name="addressDetail"
                type="text"
                placeholder="Số nhà, Tên đường..."
                className="w-full px-3 py-2 mb-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.addressDetail}
                onChange={handleChange}
                required
              />

              <div className="flex items-center justify-between mb-2 mt-4">
                <label className="block text-sm font-medium text-gray-700">Vị trí trên bản đồ</label>
                <button
                  type="button"
                  onClick={getLocation}
                  className="px-3 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-xs font-medium border border-blue-200 flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  Lấy vị trí hiện tại của tôi
                </button>
              </div>
              
              <LocationPicker 
                latitude={formData.latitude} 
                longitude={formData.longitude} 
                onChange={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))} 
              />
              {locationStatus && <p className="text-sm text-gray-500 mt-2">{locationStatus}</p>}
              
            </div>

            {formData.roleName === 'SELLER' && (
              <div className="pt-4 border-t border-gray-200 space-y-4">
                <h3 className="font-semibold text-gray-900">Thông tin Xưởng / Cửa hàng</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên Xưởng</label>
                  <input
                    name="shopName"
                    type="text"
                    required={formData.roleName === 'SELLER'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.shopName}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả Xưởng</label>
                  <textarea
                    name="shopDescription"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                    value={formData.shopDescription}
                    onChange={handleChange}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    name="isCustomSizeSupported"
                    type="checkbox"
                    className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
                    checked={formData.isCustomSizeSupported}
                    onChange={handleChange}
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Hỗ trợ may đo kích thước riêng theo yêu cầu?
                  </label>
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none transition-colors shadow-md disabled:bg-gray-400"
            >
              {loading ? 'Đang xử lý...' : 'Đăng Ký'}
            </button>
          </div>
          
            <div className="text-center mt-4">
              <span className="text-sm text-gray-600">Đã có tài khoản? </span>
              <Link to="/login" className="text-sm font-medium text-emerald-600 hover:text-emerald-500">
                Đăng nhập ngay
              </Link>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyCode}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã Xác Nhận (8 chữ số)</label>
              <input
                type="text"
                required
                maxLength={8}
                className="w-full px-3 py-2 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || code.length !== 8}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none transition-colors shadow-md disabled:bg-gray-400"
            >
              {loading ? 'Đang xử lý...' : 'Xác Nhận'}
            </button>
            
            <div className="text-center mt-4 text-sm text-gray-600">
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="text-emerald-600 hover:text-emerald-500 hover:underline"
              >
                Quay lại sửa thông tin
              </button>
            </div>
          </form>
        )}
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Đăng ký thành công!</h3>
            <p className="text-sm text-gray-500">Đang chuyển hướng về Đăng nhập...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
