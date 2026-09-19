import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

const Home = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

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
