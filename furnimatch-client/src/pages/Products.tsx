import { useState, useEffect } from 'react';
import api from '../utils/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/products');
        setProducts(response.data);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) return <div className="text-center py-20">Đang tải sản phẩm...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Danh sách Sản phẩm</h1>
      
      {products.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-white rounded-lg shadow-sm border border-gray-100">
          Chưa có sản phẩm nào.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product: any) => (
            <div key={product.productId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                Hình Ảnh
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{product.name}</h3>
                <p className="text-gray-500 text-sm mt-1 line-clamp-2">{product.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-emerald-600 font-bold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}</span>
                  {product.customSizeSupported && (
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full">May đo</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;
