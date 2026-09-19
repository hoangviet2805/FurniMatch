import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../utils/api';

const Home = () => {
  const [user, setUser] = useState<any>(null);
  const [banners, setBanners] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }

    // Fetch banners
    api.get('/banners').then(res => {
      setBanners(res.data);
    }).catch(err => console.error('Error fetching banners:', err));
  }, []);

  // Handle 3s auto slide
  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-emerald-50 to-teal-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-6">
            Đặt Làm Nội Thất Theo Yêu Cầu
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Kết nối bạn với những xưởng sản xuất uy tín nhất. Chọn mẫu mã bạn thích, nhập kích thước riêng, và nhận báo giá tốt nhất.
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

      {/* Featured Categories (Placeholder) */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Danh Mục Nổi Bật</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-gray-100 h-64 rounded-xl flex items-center justify-center text-gray-400 font-medium text-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                Hình Ảnh Danh Mục {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
