import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getShopInfo, getShopProducts } from '../utils/api';

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

const Shop: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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

    fetchShopData();
  }, [id]);

  if (loading) return <div className="text-center py-20 text-xl text-gray-600">Đang tải thông tin gian hàng...</div>;
  if (error || !shop) return <div className="text-center py-20 text-xl text-red-500">{error || 'Không tìm thấy gian hàng'}</div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* Cover Image */}
      <div 
        className="h-64 md:h-80 w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${shop.coverUrl || 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1920&q=80'})` }}
      >
        <div className="w-full h-full bg-black bg-opacity-40"></div>
      </div>

      {/* Shop Info Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-md overflow-hidden flex-shrink-0 bg-white">
            <img 
              src={shop.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(shop.shopName || 'Shop')}&background=random&size=200`} 
              alt={shop.shopName || 'Shop Avatar'} 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details */}
          <div className="flex-1 text-center md:text-left mt-2">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{shop.shopName || 'Gian hàng chưa đặt tên'}</h1>
            
            {shop.province && (
              <p className="text-gray-500 flex items-center justify-center md:justify-start gap-1 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {shop.district && shop.province ? `${shop.district}, ${shop.province}` : shop.province}
              </p>
            )}

            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
              {shop.isCustomSizeSupported && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <svg className="mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
                  Nhận đóng theo yêu cầu
                </span>
              )}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {products.length} Sản phẩm
              </span>
            </div>

            {shop.shopDescription && (
              <p className="text-gray-600 max-w-2xl text-sm md:text-base leading-relaxed bg-gray-50 p-4 rounded-lg">
                {shop.shopDescription}
              </p>
            )}
          </div>
        </div>
      </div>

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
                className="border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm py-2 pl-3 pr-10"
              >
                <option value="">Tất cả sản phẩm</option>
                {Array.from(new Set(products.filter(p => p.categoryName).map(p => p.categoryName))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-500 text-lg">Gian hàng này chưa có sản phẩm nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.filter(p => selectedCategory === '' || p.categoryName === selectedCategory).map(product => (
              <div key={product.productId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group cursor-pointer flex flex-col">
                <div className="h-48 bg-gray-100 relative overflow-hidden shrink-0">
                  {product.primaryImage ? (
                    <img 
                      src={product.primaryImage.startsWith('http') ? product.primaryImage : `http://localhost:5234${product.primaryImage}`} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">Không có ảnh</div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 8h8" /></svg>
                    {shop.shopName || 'Nhà sản xuất'}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1 group-hover:text-emerald-600 transition-colors">{product.name}</h3>
                  <div className="mt-3 flex items-end justify-between">
                    <div className="text-emerald-600 font-bold text-lg">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Shop;
