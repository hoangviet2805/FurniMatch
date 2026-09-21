import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import logoImg from '../assets/logo.png';
import { cartCount } from '../utils/cart';
import { ChevronDown, User as UserIcon, Key, LogOut } from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';

type MenuItem = { to: string; label: string };

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [comparisonCount, setComparisonCount] = useState(0);
  const [cartItems, setCartItems] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    const updateComparisonCount = () => {
      try { setComparisonCount(JSON.parse(localStorage.getItem('comparisonProductIds') ?? '[]').length); }
      catch { setComparisonCount(0); }
    };
    const updateCartCount = () => setCartItems(cartCount());
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    updateComparisonCount();
    updateCartCount();
    window.addEventListener('comparison-changed', updateComparisonCount);
    window.addEventListener('cart-changed', updateCartCount);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('comparison-changed', updateComparisonCount);
      window.removeEventListener('cart-changed', updateCartCount);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const menuItems = (): MenuItem[] => {
    const common = [{ to: '/', label: 'Trang chủ' }];
    if (user?.role === 'SELLER') return [...common, { to: `/shop/${user.userId}`, label: 'Gian hàng' }, { to: '/seller/dashboard', label: 'Quản lý đơn hàng' }, { to: '/seller/products', label: 'Sản phẩm' }];
    if (user?.role === 'ADMIN') return [...common, { to: '/admin/dashboard', label: 'Quản trị hệ thống' }];
    const browse = [{ to: '/products', label: 'Danh mục' }, { to: '/compare', label: `So sánh${comparisonCount ? ` (${comparisonCount})` : ''}` }, { to: '/space-planner', label: 'Tính không gian' }];
    if (user?.role === 'CUSTOMER') return [...common, ...browse, { to: '/favorites', label: 'Yêu thích' }, { to: '/my-requests', label: 'Yêu cầu của tôi' }, { to: '/orders', label: 'Đơn mua' }];
    return [...common, ...browse];
  };

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-3 py-2">
          <Link to="/" className="flex shrink-0 items-center" aria-label="FurniMatch - Trang chủ">
            <img src={logoImg} alt="FurniMatch" className="h-12 w-auto object-contain sm:h-14" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {user?.role !== 'SELLER' && user?.role !== 'ADMIN' && <Link to="/checkout" className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 sm:text-sm">🛒 <span className="hidden sm:inline">Giỏ hàng</span>{cartItems ? ` (${cartItems})` : ''}</Link>}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 sm:text-sm border border-gray-200 transition"
                >
                  <span className="max-w-24 sm:max-w-40 truncate">{user.fullName}</span>
                  <ChevronDown size={14} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-gray-50 mb-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.fullName}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email || user.role}</p>
                    </div>
                    
                    <Link 
                      to="/profile" 
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                    >
                      <UserIcon size={16} />
                      Thông tin cá nhân
                    </Link>
                    
                    <button 
                      onClick={() => { setIsDropdownOpen(false); setIsPasswordModalOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition text-left"
                    >
                      <Key size={16} />
                      Thay đổi mật khẩu
                    </button>
                    
                    <div className="h-px bg-gray-100 my-2"></div>
                    
                    <button 
                      onClick={() => { setIsDropdownOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition text-left"
                    >
                      <LogOut size={16} />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : <>
              <Link to="/login" className="rounded-full px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 sm:text-sm">Đăng nhập</Link>
              <Link to="/register" className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:px-4 sm:text-sm">Đăng ký</Link>
            </>}
          </div>
        </div>
        <nav aria-label="Điều hướng chính" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {menuItems().map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-800'}`}>{item.label}</NavLink>)}
        </nav>
      </div>
      
      {/* Change Password Modal */}
      {user && (
        <ChangePasswordModal 
          isOpen={isPasswordModalOpen} 
          onClose={() => setIsPasswordModalOpen(false)} 
          userRole={user.role} 
        />
      )}
    </header>
  );
};

export default Header;
