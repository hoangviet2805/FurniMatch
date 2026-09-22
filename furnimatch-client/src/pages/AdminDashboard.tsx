import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const AdminDashboard = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; userId: number | null }>({ isOpen: false, userId: null });
  const [approveConfirmModal, setApproveConfirmModal] = useState<{ isOpen: boolean; sellerId: number | null }>({ isOpen: false, sellerId: null });
  const [deleteCategoryModal, setDeleteCategoryModal] = useState<{ isOpen: boolean; categoryId: number | null }>({ isOpen: false, categoryId: null });
  const [deleteBannerConfirmModal, setDeleteBannerConfirmModal] = useState<{ isOpen: boolean; bannerId: number | null }>({ isOpen: false, bannerId: null });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' }>({ isOpen: false, message: '', type: 'success' });
  
  // Tabs and Category States
  const [activeTab, setActiveTab] = useState<'USERS' | 'PENDING_SELLERS' | 'CATEGORIES' | 'BANNERS' | 'FOOTER' | 'HOME_SETTINGS' | 'REVENUE'>('USERS');

  // ========== REVENUE STATE ==========
  const [revSummary, setRevSummary] = useState<any>(null);
  const [revChart, setRevChart] = useState<any[]>([]);
  const [revBySeller, setRevBySeller] = useState<any[]>([]);
  const [revOrders, setRevOrders] = useState<any[]>([]);
  const [revOrdersTotal, setRevOrdersTotal] = useState(0);
  const [revOrdersPage, setRevOrdersPage] = useState(1);
  const [revChartPeriod, setRevChartPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [revChartYear, setRevChartYear] = useState(new Date().getFullYear());
  const [revLoading, setRevLoading] = useState(false);
  const [revFromDate, setRevFromDate] = useState('');
  const [revToDate, setRevToDate] = useState('');
  const [commissionRate, setCommissionRate] = useState(5);
  const [commissionEditMode, setCommissionEditMode] = useState(false);
  const [commissionInput, setCommissionInput] = useState('5');
  const REV_PAGE_SIZE = 15;
  const [categories, setCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [pendingSellers, setPendingSellers] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryModal, setCategoryModal] = useState<{isOpen: boolean, isEdit: boolean, data: {categoryId?: number, name: string, description: string}}>({
    isOpen: false, isEdit: false, data: {name: '', description: ''}
  });

  const [rejectModal, setRejectModal] = useState<{isOpen: boolean, userId: number | null, reason: string}>({
    isOpen: false, userId: null, reason: ''
  });
  const [imageModal, setImageModal] = useState<{isOpen: boolean, images: string[], currentIndex: number}>({
    isOpen: false, images: [], currentIndex: 0
  });

  const [footerSetting, setFooterSetting] = useState({
    description: '',
    address: '',
    phone: '',
    email: '',
    facebookLink: '',
    instagramLink: '',
    zaloLink: '',
    homeTitle: '',
    homeSubtitle: ''
  });
  const [loadingFooter, setLoadingFooter] = useState(false);
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/users?role=${filterRole}`);
      setUsers(response.data.filter((u: any) => u.roleName !== 'ADMIN'));
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const response = await api.get('/banners');
      setBanners(response.data);
    } catch (error) {
      console.error(error);
      setAlertModal({ isOpen: true, message: 'Lỗi tải danh sách banner', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.put(`/admin/users/${userId}/status`, { status: newStatus });
      setUsers(users.map(u => u.userId === userId ? { ...u, status: newStatus } : u));
    } catch (error) {
      console.error('Error updating status:', error);
      setAlertModal({ isOpen: true, message: 'Có lỗi xảy ra khi cập nhật trạng thái.', type: 'error' });
    }
  };

  const fetchPendingSellers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/pending-sellers');
      setPendingSellers(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  const fetchFooterSetting = async () => {
    setLoadingFooter(true);
    try {
      const response = await api.get('/footersettings');
      if (response.data) {
        setFooterSetting({
          description: response.data.description || '',
          address: response.data.address || '',
          phone: response.data.phone || '',
          email: response.data.email || '',
          facebookLink: response.data.facebookLink || '',
          instagramLink: response.data.instagramLink || '',
          zaloLink: response.data.zaloLink || '',
          homeTitle: response.data.homeTitle || 'Đặt Làm Nội Thất Theo Yêu Cầu',
          homeSubtitle: response.data.homeSubtitle || 'Kết nối bạn với những xưởng sản xuất uy tín nhất. Chọn mẫu mã bạn thích, nhập kích thước riêng, và nhận báo giá tốt nhất.'
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingFooter(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'USERS') {
      fetchUsers();
      setCurrentPage(1);
    } else if (activeTab === 'CATEGORIES') {
      fetchCategories();
    } else if (activeTab === 'BANNERS') {
      fetchBanners();
    } else if (activeTab === 'PENDING_SELLERS') {
      fetchPendingSellers();
    } else if (activeTab === 'FOOTER' || activeTab === 'HOME_SETTINGS') {
      fetchFooterSetting();
    }
  }, [filterRole, activeTab]);

  const confirmApproveSeller = (id: number) => {
    setApproveConfirmModal({ isOpen: true, sellerId: id });
  };

  const submitApproveSeller = async () => {
    if (!approveConfirmModal.sellerId) return;
    const id = approveConfirmModal.sellerId;
    setApproveConfirmModal({ isOpen: false, sellerId: null });
    
    try {
      await api.post(`/admin/approve-seller/${id}`);
      setAlertModal({ isOpen: true, message: 'Đã duyệt nhà sản xuất thành công!', type: 'success' });
      fetchPendingSellers();
    } catch (error: any) {
      setAlertModal({ isOpen: true, message: error.response?.data?.message || 'Có lỗi xảy ra', type: 'error' });
    }
  };

  const submitRejectSeller = async () => {
    if (!rejectModal.userId) return;
    if (!rejectModal.reason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    
    try {
      await api.post(`/admin/reject-seller/${rejectModal.userId}`, { reason: rejectModal.reason });
      setAlertModal({ isOpen: true, message: 'Đã từ chối nhà sản xuất!', type: 'success' });
      setRejectModal({ isOpen: false, userId: null, reason: '' });
      fetchPendingSellers();
    } catch (error: any) {
      setAlertModal({ isOpen: true, message: error.response?.data?.message || 'Có lỗi xảy ra', type: 'error' });
    }
  };

  const handleSaveFooter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put('/footersettings', footerSetting);
      setAlertModal({ isOpen: true, message: 'Cập nhật thành công!', type: 'success' });
    } catch (error: any) {
      setAlertModal({ isOpen: true, message: error.response?.data?.message || 'Có lỗi xảy ra.', type: 'error' });
    }
  };

  const confirmDeleteUser = (userId: number) => {
    setDeleteConfirmModal({ isOpen: true, userId });
  };

  const deleteUser = async () => {
    if (deleteConfirmModal.userId === null) return;
    const userId = deleteConfirmModal.userId;
    setDeleteConfirmModal({ isOpen: false, userId: null });
    
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u.userId !== userId));
      setAlertModal({ isOpen: true, message: 'Đã xóa tài khoản thành công!', type: 'success' });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setAlertModal({ 
        isOpen: true, 
        message: error.response?.data?.message || 'Có lỗi xảy ra khi xóa tài khoản.', 
        type: 'error' 
      });
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (categoryModal.isEdit && categoryModal.data.categoryId) {
        await api.put(`/categories/${categoryModal.data.categoryId}`, categoryModal.data);
        setAlertModal({ isOpen: true, message: 'Cập nhật danh mục thành công!', type: 'success' });
      } else {
        await api.post('/categories', categoryModal.data);
        setAlertModal({ isOpen: true, message: 'Thêm danh mục thành công!', type: 'success' });
      }
      setCategoryModal({ isOpen: false, isEdit: false, data: { name: '', description: '' } });
      fetchCategories();
    } catch (error: any) {
      setAlertModal({ isOpen: true, message: error.response?.data?.message || 'Có lỗi xảy ra.', type: 'error' });
    }
  };

  const deleteCategory = async () => {
    if (deleteCategoryModal.categoryId === null) return;
    const categoryId = deleteCategoryModal.categoryId;
    setDeleteCategoryModal({ isOpen: false, categoryId: null });

    try {
      await api.delete(`/categories/${categoryId}`);
      setAlertModal({ isOpen: true, message: 'Đã xóa danh mục!', type: 'success' });
      fetchCategories();
    } catch (error: any) {
      setAlertModal({ isOpen: true, message: error.response?.data?.message || 'Không thể xóa danh mục này.', type: 'error' });
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    
    if (banners.length + files.length > 10) {
      setAlertModal({ isOpen: true, message: 'Chỉ được tải lên tối đa 10 ảnh banner!', type: 'error' });
      return;
    }

    const formData = new FormData();
    files.forEach(f => formData.append('images', f));

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5234/api/banners', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Lỗi tải ảnh');
      }
      setAlertModal({ isOpen: true, message: 'Tải ảnh banner thành công!', type: 'success' });
      fetchBanners();
    } catch (error: any) {
      setAlertModal({ isOpen: true, message: error.message || 'Lỗi tải ảnh lên', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteBanner = (id: number) => {
    setDeleteBannerConfirmModal({ isOpen: true, bannerId: id });
  };

  const submitDeleteBanner = async () => {
    if (!deleteBannerConfirmModal.bannerId) return;
    const id = deleteBannerConfirmModal.bannerId;
    setDeleteBannerConfirmModal({ isOpen: false, bannerId: null });
    
    try {
      await api.delete(`/banners/${id}`);
      setAlertModal({ isOpen: true, message: 'Đã xóa ảnh banner!', type: 'success' });
      fetchBanners();
    } catch (error: any) {
      setAlertModal({ isOpen: true, message: error.response?.data?.message || 'Không thể xóa banner.', type: 'error' });
    }
  };

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const currentUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ========== REVENUE LOGIC ==========
  const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

  const fetchRevenueSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (revFromDate) params.set('from', revFromDate);
      if (revToDate) params.set('to', revToDate);
      const res = await api.get(`/admin/revenue/summary?${params}`);
      setRevSummary(res.data);
      setCommissionRate(res.data.commissionRate);
      setCommissionInput(String(res.data.commissionRate));
    } catch {}
  }, [revFromDate, revToDate]);

  const fetchRevenueChart = useCallback(async () => {
    try {
      const res = await api.get(`/admin/revenue/chart?period=${revChartPeriod}&year=${revChartYear}`);
      setRevChart(res.data);
    } catch {}
  }, [revChartPeriod, revChartYear]);

  const fetchRevenueBySeller = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (revFromDate) params.set('from', revFromDate);
      if (revToDate) params.set('to', revToDate);
      const res = await api.get(`/admin/revenue/by-seller?${params}`);
      setRevBySeller(res.data);
    } catch {}
  }, [revFromDate, revToDate]);

  const fetchRevenueOrders = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(REV_PAGE_SIZE) });
      if (revFromDate) params.set('from', revFromDate);
      if (revToDate) params.set('to', revToDate);
      const res = await api.get(`/admin/revenue/orders?${params}`);
      setRevOrders(res.data.data);
      setRevOrdersTotal(res.data.total);
      setRevOrdersPage(page);
    } catch {}
  }, [revFromDate, revToDate]);

  const loadAllRevenue = useCallback(async () => {
    setRevLoading(true);
    await Promise.all([fetchRevenueSummary(), fetchRevenueChart(), fetchRevenueBySeller(), fetchRevenueOrders(1)]);
    setRevLoading(false);
  }, [fetchRevenueSummary, fetchRevenueChart, fetchRevenueBySeller, fetchRevenueOrders]);

  useEffect(() => {
    if (activeTab === 'REVENUE') loadAllRevenue();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'REVENUE') fetchRevenueChart();
  }, [revChartPeriod, revChartYear]);

  const handleSaveCommission = async () => {
    const rate = parseFloat(commissionInput);
    if (isNaN(rate) || rate < 0 || rate > 100) return alert('Tỷ lệ hoa hồng phải từ 0-100%');
    try {
      await api.put('/admin/commission-config', { commissionRate: rate });
      setCommissionRate(rate);
      setCommissionEditMode(false);
      loadAllRevenue();
    } catch { alert('Lỗi lưu cấu hình'); }
  };

  const revTotalOrderPages = Math.ceil(revOrdersTotal / REV_PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 whitespace-nowrap shrink-0">Quản Trị Hệ Thống</h1>
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('USERS')} 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'USERS' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Quản lý Người Dùng
          </button>
          <button 
            onClick={() => setActiveTab('PENDING_SELLERS')} 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'PENDING_SELLERS' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Duyệt Nhà Sản Xuất
          </button>
          <button 
            onClick={() => setActiveTab('CATEGORIES')} 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'CATEGORIES' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Quản lý Danh Mục
          </button>
          <button 
            onClick={() => setActiveTab('BANNERS')} 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'BANNERS' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Quản lý Slide Trang Chủ
          </button>
          <button 
            onClick={() => setActiveTab('REVENUE')} 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'REVENUE' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📊 Báo Cáo Doanh Thu
          </button>
          <div className="relative">
            <button 
              onClick={() => setIsSettingsDropdownOpen(!isSettingsDropdownOpen)} 
              className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${(activeTab === 'FOOTER' || activeTab === 'HOME_SETTINGS') ? 'bg-white text-emerald-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              ⚙️ Cấu Hình Hệ Thống
              <svg className={`w-4 h-4 transition-transform ${isSettingsDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isSettingsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-100">
                <button
                  onClick={() => { setActiveTab('HOME_SETTINGS'); setIsSettingsDropdownOpen(false); }}
                  className={`block w-full text-left px-4 py-2 text-sm ${activeTab === 'HOME_SETTINGS' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  Cấu hình Trang chủ
                </button>
                <button
                  onClick={() => { setActiveTab('FOOTER'); setIsSettingsDropdownOpen(false); }}
                  className={`block w-full text-left px-4 py-2 text-sm ${activeTab === 'FOOTER' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  Cấu hình Footer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>



      {activeTab === 'USERS' && (
        <>
          <div className="flex justify-end mb-4">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Tất cả tài khoản</option>
              <option value="CUSTOMER">Khách Hàng</option>
              <option value="SELLER">Nhà Sản Xuất</option>
            </select>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ Tên</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai Trò</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Liên Hệ</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày Đăng Ký</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng Thái</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành Động</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentUsers.map((user) => (
                  <tr key={user.userId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                      {user.roleName === 'SELLER' && (
                        <div className="text-sm text-gray-500">Cửa hàng: {user.shopName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.roleName === 'SELLER' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {user.roleName === 'SELLER' ? 'Xưởng Mộc' : 'Khách Hàng'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{user.email}</div>
                      <div>{user.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.status === 'ACTIVE' ? 'Hoạt động' : 'Bị Khóa'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => toggleStatus(user.userId, user.status)}
                        className={`text-${user.status === 'ACTIVE' ? 'red' : 'green'}-600 hover:text-${user.status === 'ACTIVE' ? 'red' : 'green'}-900 mr-4`}
                      >
                        {user.status === 'ACTIVE' ? 'Khóa Tài Khoản' : 'Mở Khóa'}
                      </button>
                      <button
                        onClick={() => confirmDeleteUser(user.userId)}
                        className="text-gray-500 hover:text-red-700"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Không tìm thấy tài khoản nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {totalPages > 0 && (
              <div className="px-6 py-4 flex items-center justify-center gap-6 border-t border-gray-200 bg-gray-50">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Trước
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </>
      )}

      {activeTab === 'PENDING_SELLERS' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ Tên / Shop</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Liên Hệ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày Đăng Ký</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tài Liệu (CCCD/GPKD)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingSellers.map((seller) => (
                    <tr key={seller.userId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{seller.fullName}</div>
                        <div className="text-sm text-gray-500">Xưởng: {seller.shopName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{seller.email}</div>
                        <div>{seller.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(seller.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4">
                        {seller.documents && seller.documents.length > 0 ? (
                          <button
                            onClick={() => setImageModal({ isOpen: true, images: seller.documents, currentIndex: 0 })}
                            className="text-emerald-600 hover:text-emerald-900 text-sm font-medium underline"
                          >
                            Xem {seller.documents.length} ảnh
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">Không có</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => confirmApproveSeller(seller.userId)}
                          className="text-green-600 hover:text-green-900 mr-4 font-bold"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => setRejectModal({ isOpen: true, userId: seller.userId, reason: '' })}
                          className="text-red-600 hover:text-red-900 font-bold"
                        >
                          Từ Chối
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pendingSellers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Không có yêu cầu đăng ký nào đang chờ duyệt.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'BANNERS' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Hình ảnh Slide Trang chủ</h2>
              <p className="text-sm text-gray-500 mt-1">Quản lý tối đa 10 ảnh sẽ chạy ngoài trang chủ. Tỉ lệ khuyên dùng 16:9 hoặc 21:9.</p>
            </div>
            <div>
              <label className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm inline-block">
                + Tải Ảnh Lên
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={loading} />
              </label>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Đang xử lý...</div>
          ) : banners.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <div className="text-4xl mb-4">🖼️</div>
              <p className="text-gray-500">Chưa có hình ảnh nào. Hãy tải ảnh lên để hiện thị ngoài trang chủ.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {banners.map((banner, index) => (
                <div key={banner.bannerId} className="relative group rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-gray-50">
                  <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white w-8 h-8 flex items-center justify-center rounded-full font-bold z-10">
                    {index + 1}
                  </div>
                  <button 
                    onClick={() => confirmDeleteBanner(banner.bannerId)}
                    className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                    title="Xóa ảnh này"
                  >
                    &times;
                  </button>
                  <div className="aspect-[21/9] w-full">
                    <img 
                      src={banner.imageUrl.startsWith('http') ? banner.imageUrl : `http://localhost:5234${banner.imageUrl}`} 
                      alt={`Banner ${index + 1}`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'CATEGORIES' && (
        <>
          <div className="flex justify-end mb-4">
            <button 
              onClick={() => setCategoryModal({isOpen: true, isEdit: false, data: {name: '', description: ''}})}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              + Thêm Danh Mục Mới
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {loadingCategories ? (
              <div className="p-8 text-center text-gray-500">Đang tải danh mục...</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Danh Mục</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mô tả</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((cat) => (
                    <tr key={cat.categoryId}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cat.categoryId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{cat.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{cat.description || 'Không có mô tả'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setCategoryModal({isOpen: true, isEdit: true, data: {categoryId: cat.categoryId, name: cat.name, description: cat.description || ''}})}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => setDeleteCategoryModal({ isOpen: true, categoryId: cat.categoryId })}
                          className="text-red-600 hover:text-red-900"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Chưa có danh mục nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'FOOTER' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Cấu hình Footer</h2>
          {loadingFooter ? (
            <div className="text-center text-gray-500 py-8">Đang tải...</div>
          ) : (
            <form onSubmit={handleSaveFooter} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả về FurniMatch</label>
                <textarea 
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  value={footerSetting.description}
                  onChange={e => setFooterSetting({...footerSetting, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    value={footerSetting.address}
                    onChange={e => setFooterSetting({...footerSetting, address: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    value={footerSetting.phone}
                    onChange={e => setFooterSetting({...footerSetting, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    value={footerSetting.email}
                    onChange={e => setFooterSetting({...footerSetting, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Facebook</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    value={footerSetting.facebookLink}
                    onChange={e => setFooterSetting({...footerSetting, facebookLink: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Instagram</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    value={footerSetting.instagramLink}
                    onChange={e => setFooterSetting({...footerSetting, instagramLink: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link Zalo</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                    value={footerSetting.zaloLink}
                    onChange={e => setFooterSetting({...footerSetting, zaloLink: e.target.value})}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeTab === 'HOME_SETTINGS' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Cấu hình Trang Chủ</h2>
          {loadingFooter ? (
            <div className="text-center text-gray-500 py-8">Đang tải...</div>
          ) : (
            <form onSubmit={handleSaveFooter} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề chính (Title)</label>
                <input 
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  value={footerSetting.homeTitle}
                  onChange={e => setFooterSetting({...footerSetting, homeTitle: e.target.value})}
                  placeholder="VD: Đặt Làm Nội Thất Theo Yêu Cầu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả phụ (Subtitle)</label>
                <textarea 
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  value={footerSetting.homeSubtitle}
                  onChange={e => setFooterSetting({...footerSetting, homeSubtitle: e.target.value})}
                  placeholder="VD: Kết nối bạn với những xưởng sản xuất uy tín nhất..."
                />
              </div>
              <div className="pt-4 flex justify-end">
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Category Edit/Create Modal */}
      {categoryModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50 transition-opacity">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{categoryModal.isEdit ? 'Chỉnh sửa Danh Mục' : 'Thêm Danh Mục Mới'}</h3>
            <form onSubmit={handleSaveCategory}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Danh Mục *</label>
                <input 
                  type="text" required 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  value={categoryModal.data.name}
                  onChange={e => setCategoryModal({...categoryModal, data: {...categoryModal.data, name: e.target.value}})}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea 
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  value={categoryModal.data.description}
                  onChange={e => setCategoryModal({...categoryModal, data: {...categoryModal.data, description: e.target.value}})}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setCategoryModal({ isOpen: false, isEdit: false, data: { name: '', description: '' } })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-md"
                >
                  {categoryModal.isEdit ? 'Cập nhật' : 'Thêm Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirm Modal */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Xóa Tài Khoản</h3>
            <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn xóa tài khoản này? Hành động này không thể hoàn tác.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmModal({ isOpen: false, userId: null })}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={deleteUser}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Seller Confirm Modal */}
      {approveConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Duyệt Nhà Sản Xuất</h3>
            <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn duyệt nhà sản xuất này không?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setApproveConfirmModal({ isOpen: false, sellerId: null })}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={submitApproveSeller}
                className="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirm Modal */}
      {deleteCategoryModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Xóa Danh Mục</h3>
            <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn xóa danh mục này? Hành động này không thể hoàn tác.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteCategoryModal({ isOpen: false, categoryId: null })}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={deleteCategory}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Banner Confirm Modal */}
      {deleteBannerConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Xóa Ảnh Banner</h3>
            <p className="text-gray-600 mb-6">Bạn có chắc chắn muốn xóa ảnh banner này không?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteBannerConfirmModal({ isOpen: false, bannerId: null })}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={submitDeleteBanner}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Seller Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Từ chối đơn đăng ký</h3>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 mb-4"
              rows={4}
              placeholder="Nhập lý do từ chối (sẽ được gửi qua email cho người đăng ký)..."
              value={rejectModal.reason}
              onChange={e => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRejectModal({ isOpen: false, userId: null, reason: '' })}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={submitRejectSeller}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                Từ Chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {imageModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center z-[60]">
          <button 
            onClick={() => setImageModal({ isOpen: false, images: [], currentIndex: 0 })}
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          
          <div className="relative w-full max-w-4xl max-h-[80vh] flex justify-center px-12">
            <img 
              src={`http://localhost:5234${imageModal.images[imageModal.currentIndex]}`} 
              alt="Document" 
              className="max-w-full max-h-[80vh] object-contain"
            />
            
            {imageModal.images.length > 1 && (
              <>
                <button
                  onClick={() => setImageModal(prev => ({ ...prev, currentIndex: prev.currentIndex === 0 ? prev.images.length - 1 : prev.currentIndex - 1 }))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-emerald-400 bg-black bg-opacity-50 rounded-full p-2"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <button
                  onClick={() => setImageModal(prev => ({ ...prev, currentIndex: prev.currentIndex === prev.images.length - 1 ? 0 : prev.currentIndex + 1 }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-emerald-400 bg-black bg-opacity-50 rounded-full p-2"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
              </>
            )}
          </div>
          
          {imageModal.images.length > 1 && (
            <div className="text-white mt-4 text-lg font-medium">
              Ảnh {imageModal.currentIndex + 1} / {imageModal.images.length}
            </div>
          )}
        </div>
      )}

      {/* ===================== REVENUE TAB ===================== */}
      {activeTab === 'REVENUE' && (
        <div className="space-y-6">
          {/* Filter Bar + Commission Config */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col md:flex-row gap-4 items-end justify-between">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
                <input type="date" value={revFromDate} onChange={e => setRevFromDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
                <input type="date" value={revToDate} onChange={e => setRevToDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500" />
              </div>
              <button onClick={loadAllRevenue}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                🔍 Lọc
              </button>
              <button onClick={() => { setRevFromDate(''); setRevToDate(''); }} 
                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                Xóa lọc
              </button>
            </div>
            {/* Commission Config */}
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
              <span className="text-sm font-medium text-amber-800">💰 Hoa hồng platform:</span>
              {commissionEditMode ? (
                <>
                  <input type="number" min="0" max="100" step="0.1" value={commissionInput}
                    onChange={e => setCommissionInput(e.target.value)}
                    className="w-20 px-2 py-1 border border-amber-300 rounded text-sm text-center" />
                  <span className="text-amber-700 text-sm">%</span>
                  <button onClick={handleSaveCommission} className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700">Lưu</button>
                  <button onClick={() => setCommissionEditMode(false)} className="px-3 py-1 bg-gray-200 text-gray-600 rounded text-xs">Hủy</button>
                </>
              ) : (
                <>
                  <span className="text-xl font-bold text-amber-700">{commissionRate}%</span>
                  <button onClick={() => setCommissionEditMode(true)} className="px-3 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium hover:bg-amber-200">Sửa</button>
                </>
              )}
            </div>
          </div>

          {/* KPI Cards */}
          {revLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div></div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-sm">
                  <p className="text-emerald-100 text-xs font-medium uppercase tracking-wide mb-1">Tổng GMV</p>
                  <p className="text-2xl font-bold truncate">{money(revSummary?.totalGmv)}</p>
                  <p className="text-emerald-200 text-xs mt-1">Tổng doanh thu sản phẩm</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white shadow-sm">
                  <p className="text-amber-100 text-xs font-medium uppercase tracking-wide mb-1">Hoa Hồng Platform</p>
                  <p className="text-2xl font-bold truncate">{money(revSummary?.totalCommission)}</p>
                  <p className="text-amber-200 text-xs mt-1">Tỷ lệ {revSummary?.commissionRate}%</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-sm">
                  <p className="text-blue-100 text-xs font-medium uppercase tracking-wide mb-1">Đơn Đã Thanh Toán</p>
                  <p className="text-2xl font-bold">{revSummary?.totalPaidOrders ?? 0}</p>
                  <p className="text-blue-200 text-xs mt-1">Đơn có PaymentStatus=PAID</p>
                </div>
                <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-5 text-white shadow-sm">
                  <p className="text-violet-100 text-xs font-medium uppercase tracking-wide mb-1">Seller Hoạt Động</p>
                  <p className="text-2xl font-bold">{revSummary?.activeSellers ?? 0}</p>
                  <p className="text-violet-200 text-xs mt-1">Nhà sản xuất ACTIVE</p>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                  <h2 className="text-lg font-bold text-gray-900">📈 Biểu Đồ Doanh Thu</h2>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                      <button onClick={() => setRevChartPeriod('monthly')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${revChartPeriod === 'monthly' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500'}`}>Theo tháng</button>
                      <button onClick={() => setRevChartPeriod('weekly')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${revChartPeriod === 'weekly' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500'}`}>Theo tuần</button>
                    </div>
                    {revChartPeriod === 'monthly' && (
                      <select value={revChartYear} onChange={e => setRevChartYear(Number(e.target.value))}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm">
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revChart} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis tickFormatter={(v: number) => v >= 1000000 ? `${(v/1000000).toFixed(0)}M` : String(v)} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Tooltip formatter={(val: any) => [money(val), '']} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                    <Legend />
                    <Bar dataKey="gmv" name="Doanh thu (VND)" fill="#10b981" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue by Seller */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">🏪 Doanh Thu Theo Nhà Sản Xuất</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tên Xưởng</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Số Đơn</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tổng GMV</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Hoa Hồng</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Thực Nhận</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {revBySeller.length === 0 ? (
                        <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Chưa có dữ liệu</td></tr>
                      ) : revBySeller.map((s, i) => (
                        <tr key={s.sellerId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 text-sm text-gray-500">{i + 1}</td>
                          <td className="px-5 py-3 text-sm font-medium text-gray-900">{s.shopName}</td>
                          <td className="px-5 py-3 text-sm text-gray-700 text-right">{s.totalOrders}</td>
                          <td className="px-5 py-3 text-sm text-emerald-700 font-semibold text-right">{money(s.gmv)}</td>
                          <td className="px-5 py-3 text-sm text-amber-600 font-medium text-right">{money(s.commission)}</td>
                          <td className="px-5 py-3 text-sm text-blue-700 font-semibold text-right">{money(s.netRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Orders Detail Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">📋 Chi Tiết Đơn Hàng Đã Thanh Toán</h2>
                  <p className="text-sm text-gray-500 mt-1">Tổng cộng: {revOrdersTotal} đơn</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã Đơn</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nhà SX</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Khách Hàng</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tiền Hàng</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Hoa Hồng</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Trạng Thái</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Ngày</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {revOrders.length === 0 ? (
                        <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-400">Chưa có đơn hàng nào</td></tr>
                      ) : revOrders.map(o => (
                        <tr key={o.orderId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 text-sm font-mono text-gray-700">{o.orderCode}</td>
                          <td className="px-5 py-3 text-sm text-gray-700 max-w-[120px] truncate">{o.sellerShopName}</td>
                          <td className="px-5 py-3 text-sm text-gray-700 max-w-[120px] truncate">{o.customerName}</td>
                          <td className="px-5 py-3 text-sm text-emerald-700 font-semibold text-right">{money(o.subtotal)}</td>
                          <td className="px-5 py-3 text-sm text-amber-600 font-medium text-right">{money(o.commission)}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${o.orderStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                              {o.orderStatus === 'COMPLETED' ? 'Hoàn thành' : o.orderStatus === 'CONFIRMED' ? 'Đã xác nhận' : o.orderStatus}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-500 text-right">{new Date(o.createdAt).toLocaleDateString('vi-VN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {revTotalOrderPages > 1 && (
                  <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-500">Trang {revOrdersPage} / {revTotalOrderPages}</p>
                    <div className="flex gap-2">
                      <button disabled={revOrdersPage <= 1} onClick={() => fetchRevenueOrders(revOrdersPage - 1)}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">← Trước</button>
                      <button disabled={revOrdersPage >= revTotalOrderPages} onClick={() => fetchRevenueOrders(revOrdersPage + 1)}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">Tiếp →</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Alert Modal */}
      {alertModal.isOpen && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
            {alertModal.type === 'success' ? (
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Thông báo</h3>
            <p className="text-gray-600 mb-6">{alertModal.message}</p>
            <button
              onClick={() => setAlertModal({ ...alertModal, isOpen: false })}
              className="w-full px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
