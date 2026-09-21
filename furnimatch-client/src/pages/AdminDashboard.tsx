import { useState, useEffect } from 'react';
import api from '../utils/api';

const AdminDashboard = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; userId: number | null }>({ isOpen: false, userId: null });
  const [deleteCategoryModal, setDeleteCategoryModal] = useState<{ isOpen: boolean; categoryId: number | null }>({ isOpen: false, categoryId: null });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' }>({ isOpen: false, message: '', type: 'success' });
  
  // Tabs and Category States
  const [activeTab, setActiveTab] = useState<'USERS' | 'PENDING_SELLERS' | 'CATEGORIES' | 'BANNERS' | 'FOOTER'>('USERS');
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
    zaloLink: ''
  });
  const [loadingFooter, setLoadingFooter] = useState(false);

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
        setFooterSetting(response.data);
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
    } else if (activeTab === 'FOOTER') {
      fetchFooterSetting();
    }
  }, [filterRole, activeTab]);

  const approveSeller = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn duyệt nhà sản xuất này?')) return;
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
      setAlertModal({ isOpen: true, message: 'Cập nhật Footer thành công!', type: 'success' });
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

  const handleDeleteBanner = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ảnh banner này?')) return;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Quản Trị Hệ Thống</h1>
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
            onClick={() => setActiveTab('FOOTER')} 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'FOOTER' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
          >
            ⚙️ Cấu hình Footer
          </button>
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
                          onClick={() => approveSeller(seller.userId)}
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
                    onClick={() => handleDeleteBanner(banner.bannerId)}
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
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors">
                  Lưu Thay Đổi
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
