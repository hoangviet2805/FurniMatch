import { useState, useEffect } from 'react';
import api from '../utils/api';
import LocationPicker from '../components/LocationPicker';
import { useProvinces } from '../hooks/useProvinces';

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
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
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [locationMsg, setLocationMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setFormData({
        fullName: parsedUser.fullName || '',
        phone: parsedUser.phone || '',
        shopName: parsedUser.shopName || '',
        shopDescription: parsedUser.shopDescription || '',
        isCustomSizeSupported: parsedUser.isCustomSizeSupported || false,
        latitude: parsedUser.latitude || null,
        longitude: parsedUser.longitude || null,
        province: parsedUser.province || '',
        district: parsedUser.district || '',
        ward: parsedUser.ward || '',
        addressDetail: parsedUser.addressDetail || ''
      });
    }
  }, []);

  const {
    provinces,
    districts,
    wards,
    selectedProvinceCode,
    setSelectedProvinceCode,
    selectedDistrictCode,
    setSelectedDistrictCode
  } = useProvinces();

  useEffect(() => {
    if (provinces.length > 0 && formData.province && !selectedProvinceCode) {
       const code = provinces.find(p => p.name === formData.province)?.code;
       if (code) setSelectedProvinceCode(code);
    }
  }, [provinces, formData.province]);

  useEffect(() => {
    if (districts.length > 0 && formData.district && !selectedDistrictCode) {
       const code = districts.find(d => d.name === formData.district)?.code;
       if (code) setSelectedDistrictCode(code);
    }
  }, [districts, formData.district]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }));
          setLocationMsg({ text: "Lấy vị trí thành công!", type: 'success' });
          setTimeout(() => setLocationMsg({ text: '', type: '' }), 3000);
        },
        (error) => {
          console.error("Error getting location", error);
          setLocationMsg({ text: "Không thể lấy vị trí. Vui lòng cho phép trình duyệt truy cập vị trí.", type: 'error' });
          setTimeout(() => setLocationMsg({ text: '', type: '' }), 5000);
        }
      );
    } else {
      alert("Trình duyệt của bạn không hỗ trợ định vị.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await api.put('/auth/profile', formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      // Update local storage
      const updatedUser = { ...user, ...response.data.user };
      localStorage.setItem('user', JSON.stringify({ ...user, ...response.data.user }));
      setUser(updatedUser);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000); // Hide after 2 seconds
    } catch (error: any) {
      console.error(error);
      setMessage('Có lỗi xảy ra khi cập nhật thông tin.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-8 text-center">Đang tải...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Thông Tin Cá Nhân</h1>
        
        {message && (
          <div className="p-4 mb-6 rounded-md bg-red-50 text-red-700">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
            />
            <p className="text-xs text-gray-500 mt-1">Email không thể thay đổi</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Địa chỉ giao nhận</h3>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/Thành</label>
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quận/Huyện</label>
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phường/Xã</label>
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
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ cụ thể</label>
              <input
                name="addressDetail"
                type="text"
                placeholder="Số nhà, Tên đường..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.addressDetail}
                onChange={handleChange}
                required
              />
            </div>

            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Vị trí trên bản đồ</label>
              <button
                type="button"
                onClick={handleGetLocation}
                className="px-3 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-xs font-medium border border-blue-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Lấy vị trí hiện tại
              </button>
            </div>
            <LocationPicker 
              latitude={formData.latitude} 
              longitude={formData.longitude} 
              onChange={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))} 
            />
          </div>

          {user.role === 'SELLER' && (
            <>
              <hr className="my-6" />
              <h3 className="text-lg font-semibold text-gray-900">Thông Tin Xưởng Sản Xuất</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Xưởng</label>
                <input
                  type="text"
                  name="shopName"
                  value={formData.shopName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả Xưởng</label>
                <textarea
                  name="shopDescription"
                  value={formData.shopDescription}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isCustomSizeSupported"
                  id="isCustomSizeSupported"
                  checked={formData.isCustomSizeSupported}
                  onChange={handleChange}
                  className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <label htmlFor="isCustomSizeSupported" className="ml-2 block text-sm text-gray-900">
                  Nhận làm hàng theo kích thước yêu cầu (Custom-made)
                </label>
              </div>
            </>
          )}

          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Vị trí của bạn (Phục vụ tìm kiếm gần nhất)</h4>
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                Vĩ độ: {formData.latitude || 'Chưa có'} | Kinh độ: {formData.longitude || 'Chưa có'}
              </p>
              <button
                type="button"
                onClick={handleGetLocation}
                className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-md text-sm font-medium hover:bg-emerald-200"
              >
                Cập nhật vị trí
              </button>
            </div>
            {locationMsg.text && (
              <p className={`text-sm mt-2 font-medium ${locationMsg.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {locationMsg.text}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
            >
              {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </div>
        </form>
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Lưu thay đổi thành công!</h3>
            <p className="text-sm text-gray-500">Thông tin của bạn đã được cập nhật.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
