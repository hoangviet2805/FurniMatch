import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { getRecentlyViewedIds } from '../utils/comparison';

const Home = () => {
  const [user, setUser] = useState<any>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [latestProducts, setLatestProducts] = useState<any[]>([]);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [homeSettings, setHomeSettings] = useState({
    title: 'Đặt Làm Nội Thất Theo Yêu Cầu',
    subtitle: 'Kết nối bạn với những xưởng sản xuất uy tín nhất. Chọn mẫu mã bạn thích, nhập kích thước riêng, và nhận báo giá tốt nhất.'
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }

    // Fetch banners
    api.get('/banners').then(res => {
      setBanners(res.data);
    }).catch(err => console.error('Error fetching banners:', err));

    // Fetch home settings
    api.get('/footersettings').then(res => {
      if (res.data) {
        setHomeSettings({
          title: res.data.homeTitle || 'Đặt Làm Nội Thất Theo Yêu Cầu',
          subtitle: res.data.homeSubtitle || 'Kết nối bạn với những xưởng sản xuất uy tín nhất. Chọn mẫu mã bạn thích, nhập kích thước riêng, và nhận báo giá tốt nhất.'
        });
      }
    }).catch(err => console.error('Error fetching settings:', err));

    // Fetch categories
    api.get('/categories').then(res => {
      setCategories(res.data);
    }).catch(err => console.error('Error fetching categories:', err));

    // Fetch latest products
    api.get('/products').then(res => {
      setAllProducts(res.data);
      updateRandomLatest(res.data);
      const viewedIds = getRecentlyViewedIds();
      setRecentProducts(viewedIds.map(id => res.data.find((product: any) => product.productId === id)).filter(Boolean).slice(0, 4));
    }).catch(err => console.error('Error fetching products:', err));
  }, []);

  // Handle 3s auto slide
  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const updateRandomLatest = (products: any[]) => {
    const sorted = [...products].sort((a: any, b: any) => b.productId - a.productId);
    const bySeller: Record<string, any[]> = {};
    sorted.forEach(p => {
      const sellerId = p.sellerId || (p.seller && p.seller.userId) || 'unknown';
      if (!bySeller[sellerId]) bySeller[sellerId] = [];
      bySeller[sellerId].push(p);
    });

    let selected: any[] = [];
    Object.values(bySeller).forEach(sellerProducts => {
      const newestFew = sellerProducts.slice(0, 3);
      const randomP = newestFew[Math.floor(Math.random() * newestFew.length)];
      selected.push(randomP);
    });

    selected.sort(() => 0.5 - Math.random());

    if (selected.length < 8) {
      const remaining = sorted.filter(p => !selected.includes(p));
      remaining.sort(() => 0.5 - Math.random());
      selected = [...selected, ...remaining.slice(0, 8 - selected.length)];
    }
    
    setLatestProducts(selected.slice(0, 8));
  };

  useEffect(() => {
    if (allProducts.length === 0) return;
    const timer = setInterval(() => {
      updateRandomLatest(allProducts);
    }, 30000);
    return () => clearInterval(timer);
  }, [allProducts]);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-emerald-50 to-teal-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
            {homeSettings.title}
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            {homeSettings.subtitle}
          </p>
          <div className="flex justify-center space-x-4">
            <Link to="/products" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors shadow-md">
              Khám Phá Sản Phẩm
            </Link>
            
            {user?.role === 'CUSTOMER' && (
              <Link to="/request-quotation" className="bg-white hover:bg-gray-50 text-emerald-700 border border-emerald-200 px-8 py-3 rounded-lg font-medium text-lg transition-colors shadow-sm">
                Tạo Yêu Cầu Khảo Giá
              </Link>
            )}
            
            {!user && (
              <Link to="/register" className="bg-white hover:bg-gray-50 text-emerald-700 border border-emerald-200 px-8 py-3 rounded-lg font-medium text-lg transition-colors shadow-sm">
                Tham Gia Ngay
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Banner Slider Section */}
      {banners.length > 0 && (
        <section className="bg-white pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-full relative aspect-[16/9] sm:aspect-[21/9] lg:aspect-[21/9] rounded-2xl overflow-hidden shadow-md bg-gray-100">
              {banners.map((banner, index) => (
              <div
                key={banner.bannerId}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentSlide ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <img
                  src={banner.imageUrl.startsWith('http') ? banner.imageUrl : `http://localhost:5234${banner.imageUrl}`}
                  alt={`Banner ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {/* Optional dark overlay for better text readability if we add text later */}
                <div className="absolute inset-0 bg-black/10"></div>
              </div>
            ))}
            
            {/* Dots */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-3">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-emerald-600' : 'bg-white/60 hover:bg-white'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Danh Mục Nổi Bật</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link to={`/products?categoryId=${category.categoryId}`} key={category.categoryId} className="bg-white p-6 rounded-xl text-center shadow-sm hover:shadow-md hover:border-emerald-500 border border-transparent transition-all cursor-pointer group">
                <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </div>
                <h3 className="font-semibold text-gray-900">{category.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Products */}
      {latestProducts.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Sản Phẩm Mới Nhất</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {latestProducts.map((product) => (
                <Link to={`/products/${product.productId}`} key={product.productId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group block">
                  <div className="h-48 bg-gray-100 relative overflow-hidden">
                    {product.productImages && product.productImages.length > 0 ? (
                      <img src={product.productImages[0].imageUrl.startsWith('http') ? product.productImages[0].imageUrl : `http://localhost:5234${product.productImages[0].imageUrl}`} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">Không có ảnh</div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-500 mb-1">{product.seller?.shopName || 'Nhà sản xuất'}</div>
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{product.name}</h3>
                    <div className="mt-2 text-emerald-600 font-bold">
                      {product.productVariants && product.productVariants.length > 0 
                        ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.min(...product.productVariants.map((v: any) => v.price)))
                        : 'Liên hệ'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link to="/products" className="inline-block px-8 py-3 bg-white border-2 border-emerald-600 text-emerald-600 font-semibold rounded-lg hover:bg-emerald-50 transition-colors">
                Xem Tất Cả Sản Phẩm
              </Link>
            </div>
          </div>
        </section>
      )}

      {recentProducts.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-gray-900">Bạn vừa xem</h2><Link to="/products" className="text-sm font-medium text-emerald-600">Xem thêm sản phẩm</Link></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {recentProducts.map(product => <Link to={`/products/${product.productId}`} key={product.productId} className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow group"><div className="h-32 sm:h-40 bg-gray-100">{product.productImages?.[0] ? <img src={product.productImages[0].imageUrl.startsWith('http') ? product.productImages[0].imageUrl : `http://localhost:5234${product.productImages[0].imageUrl}`} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="h-full flex items-center justify-center text-gray-400 text-xs">Không có ảnh</div>}</div><div className="p-3"><p className="font-semibold text-sm text-gray-900 truncate">{product.name}</p><p className="mt-1 text-sm font-bold text-emerald-600">{product.productVariants?.length ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.min(...product.productVariants.map((variant: any) => variant.price))) : 'Liên hệ'}</p></div></Link>)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
