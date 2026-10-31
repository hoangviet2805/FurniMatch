import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token || !userStr) {
    // Chưa đăng nhập -> Chuyển hướng sang trang đăng nhập và lưu lại đường dẫn cũ
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    try {
      const user = JSON.parse(userStr);
      if (!allowedRoles.includes(user?.role)) {
        // Đã đăng nhập nhưng không có vai trò phù hợp -> Chuyển về trang chủ
        return <Navigate to="/" replace />;
      }
    } catch {
      // Dữ liệu trong localStorage không hợp lệ
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}
