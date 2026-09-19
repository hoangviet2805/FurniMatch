import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="text-2xl font-bold text-emerald-600 tracking-tight">
              FurniMatch
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            <Link to="/" className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors">
              Trang Chủ
            </Link>
            <Link to="/products" className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors">
              Danh mục sản Phẩm
            </Link>
            
            {user?.role === 'SELLER' && (
              <>
                <Link to="/seller/dashboard" className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors">
                  Yêu Cầu Từ Khách (Báo Giá)
                </Link>
                <Link to="/seller/products" className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors">
                  Quản Lý Sản Phẩm
                </Link>
              </>
            )}
            
            {user?.role === 'CUSTOMER' && (
              <Link to="/request-quotation" className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors">
                Yêu Cầu Khảo Giá
              </Link>
            )}

            {user?.role === 'ADMIN' && (
              <Link to="/admin/dashboard" className="text-gray-700 hover:text-emerald-600 px-3 py-2 text-sm font-medium transition-colors">
                Quản Trị Hệ Thống
              </Link>
            )}
          </nav>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/profile" className="text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors">
                  Xin chào, {user.fullName}
                </Link>
                <button
                  onClick={handleLogout} className="text-red-600 hover:text-red-700 font-medium text-sm transition-colors">
                  Đăng Xuất
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-emerald-600 font-medium text-sm transition-colors">
                  Đăng Nhập
                </Link>
                <Link to="/register" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm">
                  Đăng Ký
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
