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
  const [documents, setDocuments] = useState<File[]>([]);
  const [showPassword, setShowPassword] = useState(false);
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
    setLocationStatus('Đang xác định vị trí...');
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
        setLocationStatus('Không thể lấy vị trí. Vui lòng cấp quyền truy cập vị trí.');
      }
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length > 10) {
        setError('Bạn chỉ có thể chọn tối đa 10 ảnh tài liệu.');
        return;
      }
      setDocuments(filesArray);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          data.append(key, value.toString());
        }
      });
      
      if (formData.roleName === 'SELLER') {
        documents.forEach((doc) => {
          data.append('Documents', doc);
        });
      }

      await api.post('/auth/register', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setStep(2);
    } catch (err: any) {
      const respData = err.response?.data;
      if (respData?.message) {
        setError(respData.message);
      } else if (typeof respData === 'string') {
        setError(respData);
      } else {
        setError('Có lỗi xảy ra khi đăng ký tài khoản.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (code.length !== 8) {
      setError('Mã xác nhận phải gồm 8 chữ số.');
      return;
    }

    setLoading(true);
    try {
      await verifyRegistration({ email: formData.email, code });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Xác thực thất bại. Vui lòng kiểm tra lại mã.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Background Orbs */}
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-teal-300/20 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-emerald-300/10 blur-2xl pointer-events-none" />

      {/* Main White Card Container */}
      <div className="relative max-w-xl w-full bg-white p-7 sm:p-10 rounded-3xl shadow-2xl shadow-emerald-950/30 border border-white/60 transition-all z-10">
        
        {/* Header Section */}
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            {step === 1 ? 'Tạo Tài Khoản Mới' : 'Xác Thực Email'}
          </h2>
          {step === 2 && (
            <p className="mt-1.5 text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
              Chúng tôi đã gửi mã 8 chữ số đến <span className="font-bold text-gray-900">{formData.email}</span>
            </p>
          )}
        </div>
        
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs sm:text-sm text-center flex items-center justify-center gap-2 animate-shake">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {step === 1 ? (
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Role Selection Segmented Cards */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-2">
                Bạn đăng ký với vai trò
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, roleName: 'CUSTOMER' }))}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    formData.roleName === 'CUSTOMER'
                      ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900 shadow-sm'
                      : 'bg-gray-50/70 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl">🛒</span>
                    {formData.roleName === 'CUSTOMER' && (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm">Khách Hàng</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Tìm kiếm & đặt mua nội thất</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, roleName: 'SELLER' }))}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    formData.roleName === 'SELLER'
                      ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-900 shadow-sm'
                      : 'bg-gray-50/70 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-100/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xl">🏭</span>
                    {formData.roleName === 'SELLER' && (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm">Xưởng Sản Xuất</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">Mở gian hàng & nhận đơn hàng</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Họ và Tên <span className="text-rose-500">*</span>
              </label>
              <input
                name="fullName"
                type="text"
                required
                placeholder="Nguyễn Văn A"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/40 focus:bg-white"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>

            {/* Email & Phone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="vidu@email.com"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/40 focus:bg-white"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Số Điện Thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  name="phone"
                  type="tel"
                  required
                  placeholder="0912 345 678"
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/40 focus:bg-white"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Mật Khẩu <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-4 py-2.5 pr-11 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50/40 focus:bg-white"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Address Section */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 flex items-center gap-1.5">
                <span>📍</span>
                <span>Địa chỉ giao nhận {formData.roleName === 'SELLER' ? '/ Cơ sở xưởng' : ''}</span>
              </label>
              
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-3">
                <select
                  name="province"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/40 focus:bg-white"
                  value={selectedProvinceCode || ''}
                  onChange={(e) => {
                    const codeVal = Number(e.target.value);
                    setSelectedProvinceCode(codeVal);
                    const provinceName = provinces.find(p => p.code === codeVal)?.name || '';
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
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/40 focus:bg-white disabled:opacity-50"
                  value={selectedDistrictCode || ''}
                  onChange={(e) => {
                    const codeVal = Number(e.target.value);
                    setSelectedDistrictCode(codeVal);
                    const districtName = districts.find(d => d.code === codeVal)?.name || '';
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
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/40 focus:bg-white disabled:opacity-50"
                  value={wards.find(w => w.name === formData.ward)?.code || ''}
                  onChange={(e) => {
                    const codeVal = Number(e.target.value);
                    const wardName = wards.find(w => w.code === codeVal)?.name || '';
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
                placeholder="Số nhà, tên đường, ngõ ngách..."
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/40 focus:bg-white"
                value={formData.addressDetail}
                onChange={handleChange}
                required
              />

              {/* Map Location Picker */}
              <div className="mt-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-200/70">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700">Tọa độ trên bản đồ (Giao hàng)</span>
                  <button
                    type="button"
                    onClick={getLocation}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors text-[11px] font-semibold border border-emerald-200/80 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Lấy vị trí hiện tại
                  </button>
                </div>
                
                <LocationPicker 
                  latitude={formData.latitude} 
                  longitude={formData.longitude} 
                  onChange={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))} 
                />
                {locationStatus && <p className="text-xs text-emerald-700 mt-1.5 font-medium">{locationStatus}</p>}
              </div>
            </div>

            {/* Seller Specific Extra Fields */}
            {formData.roleName === 'SELLER' && (
              <div className="pt-4 border-t border-emerald-200/60 bg-emerald-50/40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏭</span>
                  <h3 className="font-bold text-sm text-emerald-950 uppercase tracking-wider">Thông Tin Xưởng Mộc</h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Tên Xưởng / Thương Hiệu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    name="shopName"
                    type="text"
                    required={formData.roleName === 'SELLER'}
                    placeholder="Xưởng Gỗ Mỹ Nghệ Hoàng Gia"
                    className="w-full px-4 py-2 text-sm border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                    value={formData.shopName}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Giới Thiệu Xưởng</label>
                  <textarea
                    name="shopDescription"
                    rows={2}
                    placeholder="Chuyên sản xuất bàn ghế, tủ kệ gỗ sồi tự nhiên..."
                    className="w-full px-4 py-2 text-sm border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                    value={formData.shopDescription}
                    onChange={handleChange}
                  />
                </div>

                <div className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-emerald-200/80">
                  <input
                    id="custom-size-cb"
                    name="isCustomSizeSupported"
                    type="checkbox"
                    className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                    checked={formData.isCustomSizeSupported}
                    onChange={handleChange}
                  />
                  <label htmlFor="custom-size-cb" className="text-xs font-semibold text-gray-800 cursor-pointer">
                    Xưởng có nhận đóng theo kích thước yêu cầu của khách hàng
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Hồ sơ xác thực (CCCD / Giấy phép kinh doanh)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-gray-500
                      file:mr-3 file:py-2 file:px-3.5
                      file:rounded-xl file:border-0
                      file:text-xs file:font-semibold
                      file:bg-emerald-600 file:text-white
                      hover:file:bg-emerald-700 file:cursor-pointer transition-colors"
                  />
                  {documents.length > 0 && (
                    <p className="mt-1.5 text-xs text-emerald-700 font-medium">✓ Đã chọn {documents.length} tệp ảnh.</p>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none shadow-lg shadow-emerald-700/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm sm:text-base disabled:bg-gray-400 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Đang tạo tài khoản...</span>
                  </>
                ) : (
                  <>
                    <span>Đăng Ký Tài Khoản</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Bottom Link to Login */}
            <div className="text-center pt-2">
              <span className="text-xs sm:text-sm text-gray-600">Đã có tài khoản? </span>
              <Link to="/login" className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 hover:underline">
                Đăng nhập ngay
              </Link>
            </div>
          </form>
        ) : (
          /* Step 2: Email Verification */
          <form className="space-y-6" onSubmit={handleVerifyCode}>
            <div className="bg-emerald-50/60 p-6 rounded-2xl border border-emerald-100 text-center">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Nhập mã 8 chữ số xác thực
              </label>
              <input
                type="text"
                required
                maxLength={8}
                className="w-full px-4 py-3 text-center text-3xl tracking-widest border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono font-bold bg-white text-emerald-950 shadow-inner"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="••••••••"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                Vui lòng kiểm tra hòm thư đến hoặc mục Spam của email
              </p>
            </div>
            
            <button
              type="submit"
              disabled={loading || code.length !== 8}
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none shadow-lg shadow-emerald-700/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm sm:text-base disabled:bg-gray-400 disabled:shadow-none"
            >
              {loading ? 'Đang xác thực...' : 'Xác Nhận Kích Hoạt'}
            </button>
            
            <div className="text-center pt-2">
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="text-xs sm:text-sm text-emerald-700 hover:text-emerald-800 font-semibold hover:underline"
              >
                ← Quay lại chỉnh sửa thông tin
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Success Modal Overlay */}
      {success && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-950/70 backdrop-blur-sm z-50 transition-opacity">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center transform transition-all animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mb-4 shadow-sm">
              ✓
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-1">Đăng Ký Thành Công!</h3>
            <p className="text-xs sm:text-sm text-gray-500">
              Chào mừng bạn đến với FurniMatch. Đang chuyển hướng đến trang đăng nhập...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
