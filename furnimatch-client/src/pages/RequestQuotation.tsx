import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const RequestQuotation = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    categoryId: 1, // Default, would be dynamic
    productType: '',
    length: 0,
    width: 0,
    height: 0,
    material: '',
    quantity: 1,
    description: '',
    radiusKm: 50, // Default 50km
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/quotationrequests', formData);
      alert('Đã gửi yêu cầu khảo giá thành công!');
      navigate('/quotations');
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra, vui lòng đăng nhập trước khi gửi yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isNumberField = ['categoryId', 'length', 'width', 'height', 'quantity', 'radiusKm'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumberField ? Number(value) : value }));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Tạo Yêu Cầu Khảo Giá Kích Thước Riêng</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại Sản Phẩm</label>
              <input
                name="productType"
                required
                placeholder="VD: Tủ bếp, Bàn làm việc"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chất Liệu Mong Muốn</label>
              <input
                name="material"
                required
                placeholder="VD: Gỗ Sồi, Gỗ Công Nghiệp"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chiều dài (cm)</label>
              <input
                name="length"
                type="number"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chiều rộng (cm)</label>
              <input
                name="width"
                type="number"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chiều cao (cm)</label>
              <input
                name="height"
                type="number"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
              <input
                name="quantity"
                type="number"
                min="1"
                defaultValue="1"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bán kính tìm kiếm Xưởng (Km): {formData.radiusKm} km
            </label>
            <input
              name="radiusKm"
              type="range"
              min="1"
              max="200"
              value={formData.radiusKm}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              onChange={handleChange}
            />
            <p className="text-xs text-gray-500 mt-1">Hệ thống sẽ tìm các Xưởng nằm trong bán kính này tính từ vị trí của bạn.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả chi tiết</label>
            <textarea
              name="description"
              rows={4}
              placeholder="Mô tả thêm về yêu cầu của bạn, ví dụ: màu sắc sơn, phụ kiện đi kèm..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              onChange={handleChange}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-md disabled:bg-gray-400"
          >
            {loading ? 'Đang gửi...' : 'Gửi Yêu Cầu Báo Giá'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RequestQuotation;
