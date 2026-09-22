import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { getShopInfo, getShopProducts } from '../utils/api';
import { useProvinces } from '../hooks/useProvinces';
import {
  Settings, Camera, MapPin, Package, Phone, CheckCircle,
  X, Loader2, Sparkles, Image as ImageIcon
} from 'lucide-react';

interface ShopInfo {
  userId: number;
  shopName: string;
  shopDescription: string;
  avatarUrl: string;
  coverUrl: string;
  isCustomSizeSupported: boolean;
  province: string;
  district: string;
  ward: string;
  addressDetail: string;
  phone?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  createdAt: string;
  categoryName: string;
  primaryImage: string;
}

const resolveImageUrl = (url?: string) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `http://localhost:5234${url}`;
};

// ─── Modal Tùy Chỉnh Gian Hàng ──────────────────────────────────────────────
interface EditShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: ShopInfo;
  onSuccess: (updated: ShopInfo) => void;
  initialTab?: 'all' | 'avatar' | 'cover';
}

const EditShopModal: React.FC<EditShopModalProps> = ({ isOpen, onClose, shop, onSuccess }) => {
  const [formData, setFormData] = useState({
    shopName: shop.shopName || '',
    shopDescription: shop.shopDescription || '',
    avatarUrl: shop.avatarUrl || '',
    coverUrl: shop.coverUrl || '',
    phone: shop.phone || '',
    isCustomSizeSupported: shop.isCustomSizeSupported || false,
    province: shop.province || '',
    district: shop.district || '',
    ward: shop.ward || '',
    addressDetail: shop.addressDetail || '',
    latitude: shop.latitude || null,
    longitude: shop.longitude || null
  });

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [locationStatus, setLocationStatus] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const {
    provinces,
    districts,
    wards,
    selectedProvinceCode,
    setSelectedProvinceCode,
    selectedDistrictCode,
    setSelectedDistrictCode
  } = useProvinces();

  // Sync initial provinces
  useEffect(() => {
    if (provinces.length > 0 && formData.province && !selectedProvinceCode) {
      const p = provinces.find(x => x.name === formData.province);
      if (p) setSelectedProvinceCode(p.code);
    }
  }, [provinces, formData.province]);

  useEffect(() => {
    if (districts.length > 0 && formData.district && !selectedDistrictCode) {
      const d = districts.find(x => x.name === formData.district);
      if (d) setSelectedDistrictCode(d.code);
    }
  }, [districts, formData.district]);

  if (!isOpen) return null;

  const handleUploadImage = async (file: File, type: 'avatar' | 'cover') => {
    const data = new FormData();
    data.append('file', file);

    try {
      if (type === 'avatar') setUploadingAvatar(true);
      else setUploadingCover(true);

      setErrorMsg('');
      const res = await api.post('/shops/upload-image', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const url = res.data.url;
      if (type === 'avatar') {
        setFormData(prev => ({ ...prev, avatarUrl: url }));
      } else {
        setFormData(prev => ({ ...prev, coverUrl: url }));
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Không thể tải ảnh lên, vui lòng thử lại.');
    } finally {
      if (type === 'avatar') setUploadingAvatar(false);
      else setUploadingCover(false);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setLocationStatus('Đang lấy tọa độ GPS...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData(prev => ({
            ...prev,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          }));
          setLocationStatus('✓ Đã cập nhật tọa độ GPS thành công');
          setTimeout(() => setLocationStatus(''), 3000);
        },
        () => {
          setLocationStatus('⚠️ Không thể lấy vị trí. Vui lòng cho phép quyền định vị.');
          setTimeout(() => setLocationStatus(''), 4000);
        }
      );
    } else {
      setLocationStatus('Trình duyệt không hỗ trợ định vị.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shopName.trim()) {
      setErrorMsg('Vui lòng nhập tên gian hàng.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    try {
      const res = await api.put(`/shops/${shop.userId}`, formData);
      const updated = res.data.shop || { ...shop, ...formData };
      
      // Update local storage user if matching
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.userId === shop.userId || user.id === shop.userId) {
            localStorage.setItem('user', JSON.stringify({
              ...user,
              shopName: formData.shopName,
              avatarUrl: formData.avatarUrl,
              coverUrl: formData.coverUrl
            }));
          }
        } catch { /* ignore */ }
      }

      setSuccessMsg('Cập nhật gian hàng thành công!');
      setTimeout(() => {
        onSuccess(updated);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu thông tin gian hàng.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease]">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Tùy Chỉnh Gian Hàng</h2>
              <p className="text-xs text-gray-500">Cập nhật hình ảnh, tên gọi, mô tả và vị trí xưởng của bạn</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
              <span className="font-semibold">Lỗi:</span> {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section: Cover & Avatar */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              Hình ảnh gian hàng
            </h3>

            {/* Cover Preview & Upload */}
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 group">
              <div 
                className="h-36 sm:h-44 w-full bg-cover bg-center transition-all"
                style={{ 
                  backgroundImage: `url(${resolveImageUrl(formData.coverUrl) || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1920&q=80'})` 
                }}
              >
                <div className="w-full h-full bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="px-4 py-2 bg-white/90 hover:bg-white text-gray-800 text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 backdrop-blur-sm transition-all hover:scale-105"
                  >
                    {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> : <Camera className="w-4 h-4 text-emerald-600" />}
                    <span>{uploadingCover ? 'Đang tải lên...' : 'Tải lên ảnh bìa mới'}</span>
                  </button>
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleUploadImage(e.target.files[0], 'cover');
                    }}
                  />
                </div>
              </div>

              {/* Avatar position inside cover */}
              <div className="absolute bottom-3 left-4 flex items-center gap-3">
                <div className="relative group/avatar">
                  <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-white">
                    <img
                      src={resolveImageUrl(formData.avatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.shopName || 'Shop')}&background=random&size=200`}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 rounded-full bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                    title="Đổi ảnh đại diện"
                  >
                    {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    <span className="text-[10px] mt-0.5 font-medium">Đổi</span>
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleUploadImage(e.target.files[0], 'avatar');
                    }}
                  />
                </div>
                <div className="text-white drop-shadow-md">
                  <p className="text-xs font-semibold">Ảnh đại diện Shop</p>
                  <p className="text-[11px] text-white/80">Khuyên dùng ảnh vuông tối thiểu 300x300px</p>
                </div>
              </div>
            </div>

            {/* Direct URL input fallback */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hoặc dán URL ảnh bìa</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formData.coverUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, coverUrl: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-gray-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hoặc dán URL ảnh đại diện</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, avatarUrl: e.target.value }))}
                  className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-gray-700"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Section: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Thông tin chung
            </h3>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Tên Gian Hàng / Xưởng Sản Xuất <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Xưởng Gỗ Mỹ Nghệ Hoàng Gia"
                value={formData.shopName}
                onChange={(e) => setFormData(prev => ({ ...prev, shopName: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-medium text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Số Điện Thoại Liên Hệ
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Ví dụ: 0987654321"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Mô Tả / Giới Thiệu Gian Hàng
              </label>
              <textarea
                rows={3}
                placeholder="Giới thiệu về xưởng nội thất, năng lực sản xuất, phong cách thiết kế, chất liệu gỗ sử dụng..."
                value={formData.shopDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, shopDescription: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900 resize-none text-sm leading-relaxed"
              />
            </div>

            <label className="flex items-center gap-3 p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl cursor-pointer hover:bg-emerald-50 transition-colors">
              <input
                type="checkbox"
                checked={formData.isCustomSizeSupported}
                onChange={(e) => setFormData(prev => ({ ...prev, isCustomSizeSupported: e.target.checked }))}
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
              />
              <div>
                <p className="text-sm font-bold text-emerald-950">Nhận gia công / đóng theo kích thước yêu cầu</p>
                <p className="text-xs text-emerald-700">Khách hàng có thể gửi yêu cầu báo giá kích thước riêng đến xưởng của bạn.</p>
              </div>
            </label>
          </div>

          <hr className="border-gray-100" />

          {/* Section: Address & Location */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Vị trí & Địa chỉ xưởng
              </h3>
              <button
                type="button"
                onClick={handleGetLocation}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 transition-colors cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>📍 Định vị GPS</span>
              </button>
            </div>

            {locationStatus && (
              <p className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                {locationStatus}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tỉnh / Thành phố</label>
                <select
                  value={selectedProvinceCode || ''}
                  onChange={(e) => {
                    const code = Number(e.target.value);
                    setSelectedProvinceCode(code || null);
                    setSelectedDistrictCode(null);
                    const p = provinces.find(x => x.code === code);
                    setFormData(prev => ({ ...prev, province: p ? p.name : '', district: '', ward: '' }));
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white"
                >
                  <option value="">-- Chọn Tỉnh / Thành --</option>
                  {provinces.map(p => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Quận / Huyện</label>
                <select
                  disabled={!selectedProvinceCode}
                  value={selectedDistrictCode || ''}
                  onChange={(e) => {
                    const code = Number(e.target.value);
                    setSelectedDistrictCode(code || null);
                    const d = districts.find(x => x.code === code);
                    setFormData(prev => ({ ...prev, district: d ? d.name : '', ward: '' }));
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">-- Chọn Quận / Huyện --</option>
                  {districts.map(d => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phường / Xã</label>
                <select
                  disabled={!selectedDistrictCode}
                  value={formData.ward}
                  onChange={(e) => setFormData(prev => ({ ...prev, ward: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">-- Chọn Phường / Xã --</option>
                  {wards.map(w => (
                    <option key={w.code} value={w.name}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Địa chỉ chi tiết (Số nhà, tên đường, thôn xóm...)</label>
              <input
                type="text"
                placeholder="Ví dụ: Số 123 Đường Làng Nghề, Khu Công Nghiệp..."
                value={formData.addressDetail}
                onChange={(e) => setFormData(prev => ({ ...prev, addressDetail: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100 sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Shop Component ──────────────────────────────────────────────────
const Shop: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // Current logged in user info
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isOwner = currentUser && (
    Number(currentUser.userId) === Number(shop?.userId) || 
    Number(currentUser.id) === Number(shop?.userId) || 
    currentUser.role === 'ADMIN'
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  const fetchShopData = async () => {
    try {
      setLoading(true);
      if (!id) return;
      
      const [shopRes, productsRes] = await Promise.all([
        getShopInfo(id),
        getShopProducts(id)
      ]);

      setShop(shopRes.data);
      setProducts(productsRes.data);
    } catch (err: any) {
      console.error(err);
      setError('Không thể tải thông tin cửa hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopData();
  }, [id]);

  if (loading) return <div className="text-center py-20 text-xl text-gray-600">Đang tải thông tin gian hàng...</div>;
  if (error || !shop) return <div className="text-center py-20 text-xl text-red-500">{error || 'Không tìm thấy gian hàng'}</div>;

  const filteredProducts = products.filter(p => selectedCategory === '' || p.categoryName === selectedCategory);

  const displayCover = resolveImageUrl(shop.coverUrl) || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1920&q=80';
  const displayAvatar = resolveImageUrl(shop.avatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(shop.shopName || 'Shop')}&background=random&size=200`;

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* Cover Image */}
      <div 
        className="h-64 md:h-80 w-full bg-cover bg-center relative transition-all"
        style={{ backgroundImage: `url(${displayCover})` }}
      >
        <div className="w-full h-full bg-gradient-to-t from-black/70 via-black/30 to-black/10"></div>
        {isOwner && (
          <button
            onClick={() => setShowEditModal(true)}
            className="absolute top-5 right-5 z-20 flex items-center gap-2 px-3.5 py-2 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold rounded-xl border border-white/20 transition-all cursor-pointer shadow-lg hover:scale-105"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>Đổi ảnh bìa</span>
          </button>
        )}
      </div>

      {/* Shop Info Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 border border-gray-100/80">
          {/* Avatar with hover change if owner */}
          <div className="relative group w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-lg overflow-hidden flex-shrink-0 bg-white">
            <img 
              src={displayAvatar} 
              alt={shop.shopName || 'Shop Avatar'} 
              className="w-full h-full object-cover"
            />
            {isOwner && (
              <button
                onClick={() => setShowEditModal(true)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-medium transition-opacity cursor-pointer"
                title="Thay đổi ảnh đại diện"
              >
                <Camera className="w-6 h-6 mb-1 text-emerald-300" />
                <span>Đổi ảnh</span>
              </button>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-left mt-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {shop.shopName || 'Gian hàng chưa đặt tên'}
              </h1>

              {/* Nút Tùy Chỉnh Gian Hàng */}
              {isOwner && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:shadow-lg cursor-pointer shrink-0"
                >
                  <Settings className="w-4 h-4" />
                  <span>Tùy chỉnh gian hàng</span>
                </button>
              )}
            </div>
            
            {(shop.province || shop.addressDetail) && (
              <p className="text-gray-500 text-sm flex items-center justify-center md:justify-start gap-1.5 mb-3">
                <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  {[shop.addressDetail, shop.ward, shop.district, shop.province].filter(Boolean).join(', ')}
                </span>
              </p>
            )}

            {shop.phone && (
              <p className="text-gray-500 text-sm flex items-center justify-center md:justify-start gap-1.5 mb-3">
                <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-mono">{shop.phone}</span>
              </p>
            )}

            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
              {shop.isCustomSizeSupported && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <span className="mr-1.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Nhận đóng theo yêu cầu
                </span>
              )}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {products.length} Sản phẩm
              </span>
            </div>

            {shop.shopDescription && (
              <p className="text-gray-600 max-w-3xl text-sm leading-relaxed bg-gray-50/80 p-4 rounded-xl border border-gray-100">
                {shop.shopDescription}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Shop Modal */}
      {shop && (
        <EditShopModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          shop={shop}
          onSuccess={(updated) => {
            setShop(updated);
          }}
        />
      )}

      {/* Products Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b pb-4 gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Sản phẩm của Shop</h2>
          
          {products.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="category-filter" className="text-sm font-medium text-gray-700">Lọc theo danh mục:</label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border-gray-300 rounded-xl shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm py-2 pl-3 pr-10 bg-white"
              >
                <option value="">Tất cả sản phẩm</option>
                {Array.from(new Set(products.filter(p => p.categoryName).map(p => p.categoryName))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-lg font-medium">Chưa có sản phẩm nào trong danh mục này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(product => (
              <Link to={`/products/${product.productId}`} key={product.productId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer flex flex-col">
                <div className="h-52 bg-gray-100 relative overflow-hidden shrink-0">
                  {product.primaryImage ? (
                    <img 
                      src={resolveImageUrl(product.primaryImage)} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">Không có ảnh</div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Package className="w-3 h-3 text-emerald-600" />
                    {shop.shopName || 'Nhà sản xuất'}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1 group-hover:text-emerald-600 transition-colors">{product.name}</h3>
                  <div className="mt-3 flex items-end justify-between">
                    <div className="text-emerald-600 font-bold text-lg">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {filteredProducts.length > 0 && (
          <div className="flex justify-center items-center gap-4 mt-12">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) <= 1}
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
            >
              Trước
            </button>
            <div className="flex items-center justify-center min-w-[80px] px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-700 font-medium">
              {currentPage} / {Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))}
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredProducts.length / ITEMS_PER_PAGE), p + 1))}
              disabled={currentPage === Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) <= 1}
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;
