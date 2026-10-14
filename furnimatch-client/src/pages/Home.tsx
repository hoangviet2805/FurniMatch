import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sparkles, Camera, ArrowRight } from 'lucide-react';
import api, { API_BASE_URL } from '../utils/api';
import { getRecentlyViewedIds } from '../utils/comparison';
import { getCache, setCache } from '../utils/cache';

const Home = () => {
  const [user, setUser] = useState<any>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>(() => getCache<any[]>('categories') || []);
  const [allProducts, setAllProducts] = useState<any[]>(() => getCache<any[]>('home_products') || []);
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

    // Fetch categories with cache
    const cachedCats = getCache<any[]>('categories');
    if (cachedCats) setCategories(cachedCats);
    api.get('/categories').then(res => {
      setCache('categories', res.data);
      setCategories(res.data);
    }).catch(err => console.error('Error fetching categories:', err));

    // Fetch latest products with cache
    const cachedProds = getCache<any[]>('home_products');
    if (cachedProds) {
      setAllProducts(cachedProds);
      updateRandomLatest(cachedProds);
      const viewedIds = getRecentlyViewedIds();
      setRecentProducts(viewedIds.map(id => cachedProds.find((product: any) => product.productId === id)).filter(Boolean).slice(0, 4));
    }

    api.get('/products').then(res => {
      setCache('home_products', res.data);
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
                  src={banner.imageUrl.startsWith('http') ? banner.imageUrl : `${API_BASE_URL}${banner.imageUrl.startsWith('/') ? '' : '/'}${banner.imageUrl}`}
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

      {/* 3D Room Reconstruction Feature Spotlight */}
      <section className="py-10 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-8 sm:p-12 lg:p-14 text-white shadow-2xl shadow-emerald-900/15 border border-emerald-500/30">
            {/* Subtle architectural 3D grid background pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none text-white" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="room-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                  <path d="M 36 0 L 0 0 0 36" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#room-grid)" />
            </svg>

            {/* Ambient decorative glowing orbs */}
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-teal-300/20 blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 text-emerald-100 border border-white/25 backdrop-blur-sm text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
                  <Sparkles size={14} className="text-amber-300 animate-pulse" />
                  <span>Tính Năng Mới • 3D Room Reconstruction</span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                  Tải ảnh căn phòng thực tế <span className="inline-block text-emerald-200">➔</span> Tái tạo 3D tức thì
                </h2>
                <p className="mt-4 text-emerald-50/90 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
                  Biến bức ảnh phòng khách, phòng ngủ hoặc căn hộ của bạn thành không gian 3D tương tác. Thử hàng chục mẫu gạch lát nền thực tế từ Furni Match và tự do sắp đặt, xoay nội thất (giường, tủ, sofa, bàn làm việc) trước khi mua sắm.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    to="/custom-room-designer"
                    className="px-6 py-3.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-sm sm:text-base shadow-xl shadow-black/10 hover:shadow-2xl transition duration-200 flex items-center gap-2.5 group transform hover:-translate-y-0.5"
                  >
                    <Camera size={18} className="text-emerald-700" />
                    <span>Trải nghiệm Tái tạo phòng từ ảnh</span>
                    <ArrowRight size={18} className="text-emerald-700 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    to="/space-planner"
                    className="px-6 py-3.5 rounded-xl bg-emerald-800/40 hover:bg-emerald-800/70 text-white font-semibold text-sm sm:text-base border border-white/25 hover:border-white/40 backdrop-blur-sm transition duration-200"
                  >
                    Xem phòng mẫu 3D dựng sẵn
                  </Link>
                </div>

                {/* Value propositions */}
                <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-emerald-100/90 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                    <span>Miễn phí 100%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                    <span>Không cần cài đặt ứng dụng</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                    <span>Xem 3D trực quan tức thì</span>
                  </div>
                </div>
              </div>

              {/* 3 Steps Guide Card */}
              <div className="bg-emerald-950/40 backdrop-blur-md p-6 sm:p-7 rounded-3xl border border-white/20 flex flex-col gap-5 text-xs text-emerald-50 max-w-sm w-full shrink-0 shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-white/15">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Quy trình trải nghiệm</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/15 text-emerald-100 font-semibold border border-white/20">3 bước</span>
                </div>

                <div className="relative flex flex-col gap-4">
                  {/* Connecting dashed line */}
                  <div className="absolute left-5 top-5 bottom-5 w-0.5 border-l-2 border-dashed border-emerald-400/30 -z-0" />

                  <div className="flex items-start gap-3.5 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-white text-emerald-800 flex items-center justify-center font-black text-sm shadow-md shrink-0 ring-4 ring-emerald-500/20">
                      1
                    </div>
                    <div className="pt-0.5">
                      <h4 className="font-bold text-white text-sm">Tải ảnh chụp phòng</h4>
                      <p className="text-emerald-100/80 text-xs mt-0.5 leading-snug">JPG, PNG, WebP với góc chụp rõ mặt sàn</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-white text-emerald-800 flex items-center justify-center font-black text-sm shadow-md shrink-0 ring-4 ring-emerald-500/20">
                      2
                    </div>
                    <div className="pt-0.5">
                      <h4 className="font-bold text-white text-sm">Ước lượng ranh giới</h4>
                      <p className="text-emerald-100/80 text-xs mt-0.5 leading-snug">Tự động nhận diện diện tích & góc chân tường</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-white text-emerald-800 flex items-center justify-center font-black text-sm shadow-md shrink-0 ring-4 ring-emerald-500/20">
                      3
                    </div>
                    <div className="pt-0.5">
                      <h4 className="font-bold text-white text-sm">Lát gạch & Thử nội thất</h4>
                      <p className="text-emerald-100/80 text-xs mt-0.5 leading-snug">Quan sát 360°, tính số hộp gạch & thêm giỏ hàng</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                      <img src={product.productImages[0].imageUrl.startsWith('http') ? product.productImages[0].imageUrl : `${API_BASE_URL}${product.productImages[0].imageUrl.startsWith('/') ? '' : '/'}${product.productImages[0].imageUrl}`} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
              {recentProducts.map(product => <Link to={`/products/${product.productId}`} key={product.productId} className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow group"><div className="h-32 sm:h-40 bg-gray-100">{product.productImages?.[0] ? <img src={product.productImages[0].imageUrl.startsWith('http') ? product.productImages[0].imageUrl : `${API_BASE_URL}${product.productImages[0].imageUrl.startsWith('/') ? '' : '/'}${product.productImages[0].imageUrl}`} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="h-full flex items-center justify-center text-gray-400 text-xs">Không có ảnh</div>}</div><div className="p-3"><p className="font-semibold text-sm text-gray-900 truncate">{product.name}</p><p className="mt-1 text-sm font-bold text-emerald-600">{product.productVariants?.length ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.min(...product.productVariants.map((variant: any) => variant.price))) : 'Liên hệ'}</p></div></Link>)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
