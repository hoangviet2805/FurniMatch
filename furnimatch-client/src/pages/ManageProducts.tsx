import { useState, useEffect } from 'react';
import api from '../utils/api';

const ManageProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    categoryId: 1,
    description: '',
    price: '',
    productionDays: '',
    customSizeSupported: false
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      // Assuming GET /products returns all. In reality, you'd filter by sellerId.
      const response = await api.get('/products');
      // Just mock filtering for the seller (in a real app, API handles this based on token)
      setProducts(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/products', {
        ...formData,
        price: Number(formData.price),
        productionDays: Number(formData.productionDays)
      });
      alert('Thêm sản phẩm thành công!');
      setShowForm(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Lỗi khi thêm sản phẩm.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-20">Đang tải sản phẩm...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Quản Lý Sản Phẩm</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          {showForm ? 'Đóng form' : '+ Thêm Sản Phẩm Mới'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 max-w-3xl">
          <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-2">Thêm Sản Phẩm Mới</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm</label>
              <input
                name="name"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
              <textarea
                name="description"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giá cơ bản (VNĐ)</label>
                <input
                  name="price"
                  type="number"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.price}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian thi công (Ngày)</label>
                <input
                  name="productionDays"
                  type="number"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  value={formData.productionDays}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div className="flex items-center pt-2">
              <input
                name="customSizeSupported"
                type="checkbox"
                className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
                checked={formData.customSizeSupported}
                onChange={handleChange}
              />
              <label className="ml-2 block text-sm text-gray-900">
                Cho phép khách hàng may đo lại theo kích thước riêng?
              </label>
            </div>
            
            <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 mt-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-md disabled:bg-gray-400"
              >
                {submitting ? 'Đang lưu...' : 'Lưu Sản Phẩm'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Sản Phẩm</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá Bán</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T.G Thi Công</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">May Đo</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng Thái</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                  Chưa có sản phẩm nào. Hãy tạo sản phẩm đầu tiên!
                </td>
              </tr>
            ) : (
              products.map((product: any) => (
                <tr key={product.productId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.productionDays} ngày</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.customSizeSupported ? (
                      <span className="text-emerald-600 font-semibold">Có</span>
                    ) : (
                      <span className="text-gray-400">Không</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                      {product.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageProducts;
