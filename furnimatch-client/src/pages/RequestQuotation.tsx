import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const RequestQuotation = ({ onSuccess, onCancel }: Props) => {
  const [searchParams] = useSearchParams();
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
    budgetMin: 0,
    budgetMax: 0,
  });
  const [loading, setLoading] = useState(false);
  const [sourceProduct, setSourceProduct] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const productId = searchParams.get('productId');
    if (!productId) return;
    api.get(`/products/${productId}`).then(response => {
      const product = response.data;
      const variant = product.productVariants?.[0];
      const price = product.productVariants?.length ? Math.min(...product.productVariants.map((item: any) => item.price)) : product.price || 0;
      setFormData(current => ({ ...current, categoryId: product.categoryId || current.categoryId, productType: product.name || '', length: variant?.length || product.length || 0, width: variant?.width || product.width || 0, height: variant?.height || product.height || 0, description: `Tôi muốn đặt làm theo mẫu “${product.name}”. ${product.description || ''}`, budgetMin: price, budgetMax: price ? Math.round(price * 1.15) : 0 }));
      setSourceProduct(product.name);
    }).catch(() => setSourceProduct('Không thể tải thông tin mẫu đã chọn.'));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/quotationrequests', formData);
      setSuccessMessage(response.data.message || 'Đã gửi yêu cầu khảo giá thành công!');
      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra, vui lòng đăng nhập trước khi gửi yêu cầu.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isNumberField = ['categoryId', 'length', 'width', 'height', 'quantity', 'radiusKm', 'budgetMin', 'budgetMax'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumberField ? Number(value) : value }));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 relative">
        {onCancel && (
          <button type="button" onClick={onCancel} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl font-bold p-2">✕</button>
        )}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Tạo Yêu Cầu Khảo Giá Kích Thước Riêng</h2>
        {successMessage && <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">✓ {successMessage}</div>}
        {sourceProduct && <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 text-sm text-emerald-800">Đang điền sẵn yêu cầu theo mẫu: <strong>{sourceProduct}</strong>. Bạn vẫn có thể điều chỉnh mọi thông tin bên dưới.</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại Sản Phẩm</label>
              <input
                name="productType"
                required
                placeholder="VD: Tủ bếp, Bàn làm việc"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.productType}
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
                value={formData.length || ''}
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
                value={formData.width || ''}
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
                value={formData.height || ''}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Ngân sách dự kiến từ (VNĐ)</label><input name="budgetMin" type="number" min="0" value={formData.budgetMin || ''} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" onChange={handleChange} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Ngân sách tối đa (VNĐ)</label><input name="budgetMax" type="number" min="0" value={formData.budgetMax || ''} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" onChange={handleChange} /></div>
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
              value={formData.description}
              onChange={handleChange}
            />
          </div>
          <div className="flex gap-4 pt-4">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-1/3 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`${onCancel ? 'w-2/3' : 'w-full'} py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-md disabled:bg-gray-400`}
            >
              {loading ? 'Đang gửi...' : 'Gửi Yêu Cầu Báo Giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestQuotation;
