import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import logoImg from '../assets/logo.png';
import { cartCount } from '../utils/cart';

type MenuItem = { to: string; label: string };

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [comparisonCount, setComparisonCount] = useState(0);
  const [cartItems, setCartItems] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    const updateComparisonCount = () => {
      try { setComparisonCount(JSON.parse(localStorage.getItem('comparisonProductIds') ?? '[]').length); }
      catch { setComparisonCount(0); }
    };
    const updateCartCount = () => setCartItems(cartCount());
    updateComparisonCount();
    updateCartCount();
    window.addEventListener('comparison-changed', updateComparisonCount);
    window.addEventListener('cart-changed', updateCartCount);
    return () => {
      window.removeEventListener('comparison-changed', updateComparisonCount);
      window.removeEventListener('cart-changed', updateCartCount);
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
            {user?.role !== 'SELLER' && <Link to="/checkout" className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 sm:text-sm">🛒 <span className="hidden sm:inline">Giỏ hàng</span>{cartItems ? ` (${cartItems})` : ''}</Link>}
            {user ? <>
              <Link to="/profile" className="max-w-32 truncate rounded-full px-2 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 sm:max-w-48 sm:text-sm">{user.fullName}</Link>
              <button onClick={handleLogout} className="rounded-full px-2 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 sm:text-sm">Đăng xuất</button>
            </> : <>
              <Link to="/login" className="rounded-full px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 sm:text-sm">Đăng nhập</Link>
              <Link to="/register" className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:px-4 sm:text-sm">Đăng ký</Link>
            </>}
          </div>
        </div>
        <nav aria-label="Điều hướng chính" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          {menuItems().map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-800'}`}>{item.label}</NavLink>)}
        </nav>
      </div>
    </header>
  );
};

export default Header;
