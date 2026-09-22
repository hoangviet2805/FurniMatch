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
  const itemsPerPage = 10;
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; userId: number | null }>({ isOpen: false, userId: null });
  const [approveConfirmModal, setApproveConfirmModal] = useState<{ isOpen: boolean; sellerId: number | null }>({ isOpen: false, sellerId: null });
  const [deleteCategoryModal, setDeleteCategoryModal] = useState<{ isOpen: boolean; categoryId: number | null }>({ isOpen: false, categoryId: null });
  const [deleteBannerConfirmModal, setDeleteBannerConfirmModal] = useState<{ isOpen: boolean; bannerId: number | null }>({ isOpen: false, bannerId: null });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' }>({ isOpen: false, message: '', type: 'success' });
  
  // Tabs and Category States
  const [activeTab, setActiveTab] = useState<'USERS' | 'PENDING_SELLERS' | 'CATEGORIES' | 'BANNERS' | 'FOOTER' | 'HOME_SETTINGS' | 'REVENUE' | 'WITHDRAWALS' | 'DISPUTES' | 'PAYOUT_CONFIG'>('USERS');

  // ========== WITHDRAWAL / DISPUTE STATE ==========
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [wdTotal, setWdTotal] = useState(0);
  const [wdPage, setWdPage] = useState(1);
  const [wdLoading, setWdLoading] = useState(false);
  const [rejectWithdrawModal, setRejectWithdrawModal] = useState<{isOpen: boolean, requestId: number | null, note: string}>({isOpen: false, requestId: null, note: ''});
  const [approveWithdrawModal, setApproveWithdrawModal] = useState<{
    isOpen: boolean;
    item: any | null;
    file: File | null;
    preview: string | null;
    note: string;
    loading: boolean;
  }>({
    isOpen: false,
    item: null,
    file: null,
    preview: null,
    note: '',
    loading: false
  });
  const [viewReceiptModal, setViewReceiptModal] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
  }>({
    isOpen: false,
    url: '',
    title: ''
  });

  const [disputes, setDisputes] = useState<any[]>([]);
  const [dsTotal, setDsTotal] = useState(0);
  const [dsPage, setDsPage] = useState(1);
  const [dsLoading, setDsLoading] = useState(false);
  const [resolveDisputeModal, setResolveDisputeModal] = useState<{isOpen: boolean, disputeId: number | null, note: string, action: 'resolve'|'reject'}>({isOpen: false, disputeId: null, note: '', action: 'resolve'});

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
  const REV_PAGE_SIZE = 10;
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

  const WD_PAGE_SIZE = 10;
  const fetchWithdrawals = useCallback(async (page = 1) => {
    setWdLoading(true);
    try {
      const res = await api.get(`/admin/withdrawals?page=${page}&pageSize=${WD_PAGE_SIZE}`);
      setWithdrawals(res.data.data || []);
      setWdTotal(res.data.total || 0);
      setWdPage(page);
    } catch {} finally { setWdLoading(false); }
  }, []);

  const DS_PAGE_SIZE = 10;
  const fetchDisputes = useCallback(async (page = 1) => {
    setDsLoading(true);
    try {
      const res = await api.get(`/admin/disputes?page=${page}&pageSize=${DS_PAGE_SIZE}`);
      setDisputes(res.data.data || []);
      setDsTotal(res.data.total || 0);
      setDsPage(page);
    } catch {} finally { setDsLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'WITHDRAWALS') fetchWithdrawals(1);
    if (activeTab === 'DISPUTES') fetchDisputes(1);
  }, [activeTab]);

  const openApproveModal = (item: any) => {
    setApproveWithdrawModal({
      isOpen: true,
      item,
      file: null,
      preview: null,
      note: '',
      loading: false
    });
  };

  const handleApproveWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveWithdrawModal.item) return;
    setApproveWithdrawModal(m => ({ ...m, loading: true }));
    try {
      const formData = new FormData();
      if (approveWithdrawModal.file) {
        formData.append('receiptFile', approveWithdrawModal.file);
      }
      if (approveWithdrawModal.note) {
        formData.append('note', approveWithdrawModal.note);
      }

      await api.put(`/admin/withdrawals/${approveWithdrawModal.item.withdrawalRequestId}/approve`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setAlertModal({ isOpen: true, message: 'Đã phê duyệt yêu cầu rút tiền thành công!', type: 'success' });
      setApproveWithdrawModal({ isOpen: false, item: null, file: null, preview: null, note: '', loading: false });
      fetchWithdrawals(wdPage);
    } catch (err: any) {
      setAlertModal({ isOpen: true, message: err.response?.data?.message || 'Lỗi phê duyệt', type: 'error' });
      setApproveWithdrawModal(m => ({ ...m, loading: false }));
    }
  };

  const rejectWithdrawal = async () => {
    if (!rejectWithdrawModal.requestId) return;
    try {
      await api.put(`/admin/withdrawals/${rejectWithdrawModal.requestId}/reject`, { note: rejectWithdrawModal.note });
      setAlertModal({ isOpen: true, message: 'Đã từ chối yêu cầu rút tiền và hoàn trả số dư.', type: 'success' });
      setRejectWithdrawModal({isOpen: false, requestId: null, note: ''});
      fetchWithdrawals(wdPage);
    } catch (e: any) {
      setAlertModal({ isOpen: true, message: e.response?.data?.message || 'Lỗi từ chối', type: 'error' });
    }
  };

  const handleDisputeAction = async () => {
    if (!resolveDisputeModal.disputeId) return;
    const url = `/admin/disputes/${resolveDisputeModal.disputeId}/${resolveDisputeModal.action}`;
    try {
      await api.put(url, { note: resolveDisputeModal.note });
      setAlertModal({ isOpen: true, message: resolveDisputeModal.action === 'resolve' ? 'Đã chấp nhận khiếu nại.' : 'Đã bác khiếu nại.', type: 'success' });
      setResolveDisputeModal({isOpen: false, disputeId: null, note: '', action: 'resolve'});
      fetchDisputes(dsPage);
    } catch (e: any) {
      setAlertModal({ isOpen: true, message: e.response?.data?.message || 'Lỗi xử lý', type: 'error' });
    }
  };

  // ========== PAYOUT CONFIG & ORDERS STATE ==========
  const [payoutDays, setPayoutDays] = useState<number>(3);
  const [payoutHours, setPayoutHours] = useState<number>(0);
  const [payoutMinutes, setPayoutMinutes] = useState<number>(0);
  const [payoutNote, setPayoutNote] = useState<string>('');
  const [payoutPendingOrders, setPayoutPendingOrders] = useState<any[]>([]);
  const [loadingPayoutConfig, setLoadingPayoutConfig] = useState<boolean>(false);
  const [triggeringPayout, setTriggeringPayout] = useState<boolean>(false);

  const fetchPayoutConfigAndOrders = useCallback(async () => {
    setLoadingPayoutConfig(true);
    try {
      const res = await api.get('/admin/payouts/pending-orders');
      if (res.data?.config) {
        setPayoutDays(res.data.config.payoutDelayDays ?? 3);
        setPayoutHours(res.data.config.payoutDelayHours ?? 0);
        setPayoutMinutes(res.data.config.payoutDelayMinutes ?? 0);
      }
      setPayoutPendingOrders(res.data?.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPayoutConfig(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'PAYOUT_CONFIG') {
      fetchPayoutConfigAndOrders();
    }
  }, [activeTab, fetchPayoutConfigAndOrders]);

  const handleSavePayoutConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const d = Math.max(0, Number(payoutDays) || 0);
    const h = Math.max(0, Math.min(23, Number(payoutHours) || 0));
    const m = Math.max(0, Math.min(59, Number(payoutMinutes) || 0));
    try {
      await api.put('/admin/commission-config', {
        commissionRate: commissionRate,
        payoutDelayDays: d,
        payoutDelayHours: h,
        payoutDelayMinutes: m,
        note: payoutNote || undefined
      });
      setAlertModal({ isOpen: true, message: `Đã lưu cấu hình thời gian chờ: ${d} ngày ${h} giờ ${m} phút!`, type: 'success' });
      fetchPayoutConfigAndOrders();
    } catch (err: any) {
      setAlertModal({ isOpen: true, message: err.response?.data?.message || 'Lỗi khi lưu cấu hình', type: 'error' });
    }
  };

  const handleTriggerPayoutNow = async () => {
    setTriggeringPayout(true);
    try {
      const res = await api.post('/admin/payouts/trigger-now');
      setAlertModal({ isOpen: true, message: res.data.message || 'Đã quét và giải ngân thành công!', type: 'success' });
      fetchPayoutConfigAndOrders();
    } catch (err: any) {
      setAlertModal({ isOpen: true, message: err.response?.data?.message || 'Lỗi kích hoạt giải ngân', type: 'error' });
    } finally {
      setTriggeringPayout(false);
    }
  };

  const handleReleaseOrder = async (orderId: number, orderCode: string) => {
    if (!window.confirm(`Xác nhận giải ngân ngay cho đơn hàng ${orderCode}? Tiền sẽ được cộng vào ví người bán (sau khi trừ phí sàn).`)) return;
    try {
      const res = await api.post(`/admin/payouts/release-order/${orderId}`);
      setAlertModal({ isOpen: true, message: res.data.message || 'Giải ngân thành công!', type: 'success' });
      fetchPayoutConfigAndOrders();
    } catch (err: any) {
      setAlertModal({ isOpen: true, message: err.response?.data?.message || 'Lỗi giải ngân đơn hàng', type: 'error' });
    }
  };

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
          <button 
            onClick={() => setActiveTab('WITHDRAWALS')} 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'WITHDRAWALS' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
          >
            🏧 Yêu Cầu Rút Tiền
          </button>
          <button 
            onClick={() => setActiveTab('DISPUTES')} 
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'DISPUTES' ? 'bg-white text-emerald-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
          >
            ⚠️ Khiếu Nại
          </button>
          <div className="relative">
            <button 
              onClick={() => setIsSettingsDropdownOpen(!isSettingsDropdownOpen)} 
              className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${(activeTab === 'FOOTER' || activeTab === 'HOME_SETTINGS' || activeTab === 'PAYOUT_CONFIG') ? 'bg-white text-emerald-700 shadow' : 'text-gray-500 hover:text-gray-700'}`}
            >
              ⚙️ Cấu Hình Hệ Thống
              <svg className={`w-4 h-4 transition-transform ${isSettingsDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isSettingsDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl py-2 z-50 border border-gray-100 divide-y divide-gray-50">
                <div className="py-1">
                  <button
                    onClick={() => { setActiveTab('HOME_SETTINGS'); setIsSettingsDropdownOpen(false); }}
                    className={`block w-full text-left px-4 py-2.5 text-sm ${activeTab === 'HOME_SETTINGS' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    🏠 Cấu hình Trang chủ
                  </button>
                  <button
                    onClick={() => { setActiveTab('FOOTER'); setIsSettingsDropdownOpen(false); }}
                    className={`block w-full text-left px-4 py-2.5 text-sm ${activeTab === 'FOOTER' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    📄 Cấu hình Footer
                  </button>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => { setActiveTab('PAYOUT_CONFIG'); setIsSettingsDropdownOpen(false); }}
                    className={`block w-full text-left px-4 py-2.5 text-sm ${activeTab === 'PAYOUT_CONFIG' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    ⏱️ Thời Gian Chờ Hoàn Đơn / Giải Ngân
                  </button>
                </div>
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
              <div className="flex justify-center items-center gap-4 py-5 border-t border-gray-100 bg-gray-50">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || totalPages <= 1}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
                >
                  Trước
                </button>
                <div className="flex items-center justify-center min-w-[80px] px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-700 font-medium">
                  {currentPage} / {Math.max(1, totalPages)}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || totalPages <= 1}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
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

      {/* ===================== ORDER COMPLETION & PAYOUT CONFIG TAB ===================== */}
      {activeTab === 'PAYOUT_CONFIG' && (
        <div className="space-y-8 max-w-6xl mx-auto">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-700/60 rounded-full text-xs font-semibold text-emerald-200 mb-2">
                <span>⏱️ Cấu Hình Hệ Thống</span>
                <span>•</span>
                <span>Bảo Lưu Thanh Toán</span>
              </div>
              <h2 className="text-2xl font-bold">Thời Gian Chờ Hoàn Tất Đơn & Giải Ngân</h2>
              <p className="text-emerald-100 text-sm mt-1 max-w-2xl">
                Cấu hình thời hạn chờ sau khi đơn hàng hoàn thành (không phát sinh khiếu nại) trước khi tiền được tự động cộng vào Ví của Người Bán.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTriggerPayoutNow}
                disabled={triggeringPayout}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {triggeringPayout ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Đang quét...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Quét & Giải ngân ngay</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Main Setting Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <span>🕒 Thiết lập thời hạn chờ khiếu nại</span>
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Bạn có thể linh hoạt thiết lập theo <strong>Số Ngày</strong>, <strong>Số Giờ</strong> và <strong>Số Phút</strong>.
            </p>

            <form onSubmit={handleSavePayoutConfig} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Ngày */}
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200/80 focus-within:border-emerald-500 focus-within:bg-white transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-gray-800">📅 Số Ngày</label>
                    <span className="text-xs text-gray-400">0 - 30 ngày</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={payoutDays}
                      onChange={e => setPayoutDays(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-2xl font-bold text-gray-900 bg-transparent border-0 outline-none"
                    />
                    <span className="text-sm font-medium text-gray-500">ngày</span>
                  </div>
                </div>

                {/* Giờ */}
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200/80 focus-within:border-emerald-500 focus-within:bg-white transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-gray-800">⏰ Số Giờ</label>
                    <span className="text-xs text-gray-400">0 - 23 giờ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={payoutHours}
                      onChange={e => setPayoutHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                      className="w-full text-2xl font-bold text-gray-900 bg-transparent border-0 outline-none"
                    />
                    <span className="text-sm font-medium text-gray-500">giờ</span>
                  </div>
                </div>

                {/* Phút */}
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200/80 focus-within:border-emerald-500 focus-within:bg-white transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-gray-800">⏱️ Số Phút</label>
                    <span className="text-xs text-gray-400">0 - 59 phút</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={payoutMinutes}
                      onChange={e => setPayoutMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                      className="w-full text-2xl font-bold text-gray-900 bg-transparent border-0 outline-none"
                    />
                    <span className="text-sm font-medium text-gray-500">phút</span>
                  </div>
                </div>
              </div>

              {/* Presets Chips */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  ⚡ Mẫu thời gian gợi ý nhanh:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '3 Ngày (Chuẩn TMĐT)', d: 3, h: 0, m: 0 },
                    { label: '7 Ngày (Đồ gỗ lớn)', d: 7, h: 0, m: 0 },
                    { label: '1 Ngày (24h)', d: 1, h: 0, m: 0 },
                    { label: '2 Giờ', d: 0, h: 2, m: 0 },
                    { label: '10 Phút (Thử nghiệm)', d: 0, h: 0, m: 10 },
                    { label: '2 Phút (Test siêu tốc)', d: 0, h: 0, m: 2 },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPayoutDays(preset.d);
                        setPayoutHours(preset.h);
                        setPayoutMinutes(preset.m);
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total calculation banner */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      Tổng thời gian chờ sau khi đơn hoàn thành:
                    </p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      <span className="font-bold text-sm text-emerald-800">
                        {payoutDays} ngày {payoutHours} giờ {payoutMinutes} phút
                      </span>
                      {' '}(tương đương {(payoutDays * 24 * 60) + (payoutHours * 60) + payoutMinutes} phút)
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-gray-500">Phí hoa hồng sàn:</span>
                  <p className="text-base font-bold text-amber-600">{commissionRate}%</p>
                </div>
              </div>

              {/* Note input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú chính sách (tuỳ chọn)</label>
                <input
                  type="text"
                  value={payoutNote}
                  onChange={e => setPayoutNote(e.target.value)}
                  placeholder="VD: Cập nhật chính sách thanh toán áp dụng từ hôm nay..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={fetchPayoutConfigAndOrders}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  🔄 Hoàn tác / Tải lại
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
                >
                  💾 Lưu Cấu Hình Thời Gian
                </button>
              </div>
            </form>
          </div>

          {/* Process flow guide */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-4">
              📌 Quy trình bảo lưu và giải ngân tiền đơn hàng:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center mb-2">1</div>
                <h4 className="text-sm font-bold text-gray-900">Đơn Hoàn Thành</h4>
                <p className="text-xs text-gray-500 mt-1">Đơn giao thành công chuyển sang <code>COMPLETED</code>, ghi nhận thời điểm hoàn tất.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 font-bold flex items-center justify-center mb-2">2</div>
                <h4 className="text-sm font-bold text-gray-900">Thời Gian Chờ</h4>
                <p className="text-xs text-gray-500 mt-1">Hệ thống tạm giữ tiền trong <strong>{payoutDays}d {payoutHours}h {payoutMinutes}m</strong> để người mua kiểm tra sản phẩm.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 font-bold flex items-center justify-center mb-2">3</div>
                <h4 className="text-sm font-bold text-gray-900">Xử Lý Khiếu Nại</h4>
                <p className="text-xs text-gray-500 mt-1">Nếu khách khiếu nại, tiền lập tức bị đóng băng chờ Admin phân xử tại tab Khiếu Nại.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center mb-2">4</div>
                <h4 className="text-sm font-bold text-gray-900">Giải Ngân Vào Ví</h4>
                <p className="text-xs text-gray-500 mt-1">Hết hạn không khiếu nại, tiền tự động trừ hoa hồng ({commissionRate}%) và cộng vào Ví Seller.</p>
              </div>
            </div>
          </div>

          {/* Pending Payout Orders Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span>📦 Đơn hàng Hoàn tất đang bảo lưu thanh toán</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    {payoutPendingOrders.length} đơn
                  </span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Danh sách các đơn hàng đã hoàn tất (COMPLETED) đang trong thời gian chờ giải ngân hoặc sẵn sàng giải ngân
                </p>
              </div>
              <button
                type="button"
                onClick={fetchPayoutConfigAndOrders}
                disabled={loadingPayoutConfig}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 self-start sm:self-auto flex items-center gap-1.5"
              >
                <span>🔄 Làm mới</span>
              </button>
            </div>

            {loadingPayoutConfig ? (
              <div className="py-16 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent mx-auto mb-2" />
                <span className="text-xs text-gray-400">Đang tải danh sách đơn hàng...</span>
              </div>
            ) : payoutPendingOrders.length === 0 ? (
              <div className="py-16 text-center">
                <span className="text-3xl block mb-2">✨</span>
                <p className="text-sm font-medium text-gray-700">Hiện tại không có đơn hàng nào đang trong thời gian bảo lưu.</p>
                <p className="text-xs text-gray-400 mt-1">Tất cả đơn hoàn thành đã được giải ngân hoặc chưa có đơn hàng mới.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã Đơn</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Người Bán</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Khách Hàng</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Doanh thu</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Hoàn Tất Lúc</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trạng Thái</th>
                      <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {payoutPendingOrders.map((ord: any) => {
                      return (
                        <tr key={ord.orderId} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5 text-sm font-mono font-bold text-gray-900">
                            {ord.orderCode}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-medium text-gray-800">
                            {ord.sellerName}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-gray-600">
                            {ord.customerName}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-bold text-right text-emerald-700 whitespace-nowrap">
                            {money(ord.subtotal || ord.totalAmount)}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                            {ord.completedAt ? new Date(ord.completedAt).toLocaleString('vi-VN') : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {ord.hasDispute ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                ⚠️ Đang có khiếu nại
                              </span>
                            ) : ord.isEligible ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                ✅ Đủ điều kiện giải ngân
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                ⏳ Đang bảo lưu
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {!ord.hasDispute && (
                              <button
                                type="button"
                                onClick={() => handleReleaseOrder(ord.orderId, ord.orderCode)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                                title="Giải ngân ngay cho người bán mà không cần chờ hết hạn"
                              >
                                ⚡ Duyệt sớm
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
                {revOrders.length > 0 && (
                  <div className="flex justify-center items-center gap-4 py-5 border-t border-gray-100">
                    <button 
                      onClick={() => fetchRevenueOrders(Math.max(1, revOrdersPage - 1))}
                      disabled={revOrdersPage <= 1}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
                    >
                      Trước
                    </button>
                    <div className="flex items-center justify-center min-w-[80px] px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-700 font-medium">
                      {revOrdersPage} / {Math.max(1, revTotalOrderPages)}
                    </div>
                    <button 
                      onClick={() => fetchRevenueOrders(Math.min(revTotalOrderPages, revOrdersPage + 1))}
                      disabled={revOrdersPage >= revTotalOrderPages || revTotalOrderPages <= 1}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Alert Modal */}
      {/* ===================== WITHDRAWALS TAB ===================== */}
      {activeTab === 'WITHDRAWALS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900">🏧 Yêu Cầu Rút Tiền</h2>
            <span className="text-sm text-gray-500">{wdTotal} yêu cầu</span>
          </div>
          {wdLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" /></div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {withdrawals.length === 0 ? (
                <div className="py-12 text-center text-gray-400">Không có yêu cầu nào đang chờ xử lý.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày tạo</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Seller</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Số tiền</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngân hàng</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Số TK / Chủ TK</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {withdrawals.map((w: any) => {
                        const statusCls: Record<string, string> = { PENDING: 'bg-amber-100 text-amber-700', APPROVED: 'bg-emerald-100 text-emerald-700', REJECTED: 'bg-red-100 text-red-700' };
                        const statusLabel: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
                        return (
                          <tr key={w.withdrawalRequestId} className="hover:bg-gray-50/50">
                            <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{new Date(w.createdAt).toLocaleDateString('vi-VN')}</td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-gray-900">{w.sellerName}</p>
                              <p className="text-xs text-gray-400">{w.sellerEmail}</p>
                            </td>
                            <td className="px-5 py-4 text-sm font-bold text-emerald-700 text-right whitespace-nowrap">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(w.amount)}
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-700">{w.bankName}</td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-mono text-gray-900">{w.bankAccountNumber}</p>
                              <p className="text-xs text-gray-500">{w.bankAccountHolder}</p>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusCls[w.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                {statusLabel[w.status] ?? w.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              {w.status === 'PENDING' && (
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => openApproveModal(w)}
                                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
                                    ✅ Duyệt & Đính kèm Bill
                                  </button>
                                  <button onClick={() => setRejectWithdrawModal({isOpen: true, requestId: w.withdrawalRequestId, note: ''})}
                                    className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-200 transition-colors">
                                    ❌ Từ chối
                                  </button>
                                </div>
                              )}
                              {w.status !== 'PENDING' && (
                                <div className="space-y-1">
                                  {w.paymentReceiptUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setViewReceiptModal({
                                        isOpen: true,
                                        url: w.paymentReceiptUrl.startsWith('http') ? w.paymentReceiptUrl : `http://localhost:5234${w.paymentReceiptUrl}`,
                                        title: `Bill chuyển khoản - ${w.sellerName} (${money(w.amount)})`
                                      })}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors border border-emerald-200"
                                    >
                                      <span>🧾 Xem bill</span>
                                    </button>
                                  )}
                                  {w.adminNote && (
                                    <p className="text-xs text-gray-500 max-w-xs truncate" title={w.adminNote}>
                                      {w.status === 'REJECTED' ? `Lý do: ${w.adminNote}` : `Ghi chú: ${w.adminNote}`}
                                    </p>
                                  )}
                                  {!w.paymentReceiptUrl && !w.adminNote && <span className="text-xs text-gray-400">—</span>}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {wdTotal > 0 && (
                <div className="flex justify-center items-center gap-4 py-5 border-t border-gray-100">
                  <button 
                    disabled={wdPage <= 1} 
                    onClick={() => fetchWithdrawals(wdPage - 1)} 
                    className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
                  >
                    Trước
                  </button>
                  <div className="flex items-center justify-center min-w-[80px] px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-700 font-medium">
                    {wdPage} / {Math.max(1, Math.ceil(wdTotal / WD_PAGE_SIZE))}
                  </div>
                  <button 
                    disabled={wdPage >= Math.ceil(wdTotal / WD_PAGE_SIZE) || Math.ceil(wdTotal / WD_PAGE_SIZE) <= 1} 
                    onClick={() => fetchWithdrawals(wdPage + 1)} 
                    className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Reject Withdrawal Modal */}
          {rejectWithdrawModal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">❌ Từ chối yêu cầu rút tiền</h3>
                <p className="text-sm text-gray-600 mb-3">Vui lòng nhập lý do từ chối để thông báo cho seller:</p>
                <textarea
                  value={rejectWithdrawModal.note}
                  onChange={e => setRejectWithdrawModal(m => ({...m, note: e.target.value}))}
                  rows={3} placeholder="Lý do từ chối..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-400 resize-none text-sm"
                />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setRejectWithdrawModal({isOpen: false, requestId: null, note: ''})} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">Huỷ</button>
                  <button onClick={rejectWithdrawal} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700">Xác nhận từ chối</button>
                </div>
              </div>
            </div>
          )}

          {/* Approve Withdrawal Modal with Bill upload */}
          {approveWithdrawModal.isOpen && approveWithdrawModal.item && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white flex justify-between items-center">
                  <h3 className="text-lg font-bold">✅ Phê Duyệt & Tải Lên Bill Chuyển Khoản</h3>
                  <button
                    type="button"
                    onClick={() => setApproveWithdrawModal({ isOpen: false, item: null, file: null, preview: null, note: '', loading: false })}
                    className="text-white/80 hover:text-white text-xl"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleApproveWithdrawalSubmit} className="p-6 space-y-4">
                  {/* Bank & Transfer Info Box */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-emerald-800 uppercase">Số tiền chuyển:</span>
                      <span className="text-xl font-extrabold text-emerald-700">
                        {money(approveWithdrawModal.item.amount)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 grid grid-cols-2 gap-2 pt-2 border-t border-emerald-100">
                      <div>
                        <span className="text-gray-400 block">Xưởng / Seller:</span>
                        <span className="font-semibold text-gray-900">{approveWithdrawModal.item.sellerName}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Ngân hàng:</span>
                        <span className="font-semibold text-gray-900">{approveWithdrawModal.item.bankName}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Số tài khoản:</span>
                        <span className="font-mono font-bold text-gray-900 text-sm">{approveWithdrawModal.item.bankAccountNumber}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Chủ tài khoản:</span>
                        <span className="font-semibold text-gray-900">{approveWithdrawModal.item.bankAccountHolder}</span>
                      </div>
                    </div>
                  </div>

                  {/* Upload File Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      🧾 Đính kèm bill / Ủy nhiệm chi (Hình ảnh bill chuyển khoản)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setApproveWithdrawModal(m => ({
                            ...m,
                            file: f,
                            preview: URL.createObjectURL(f)
                          }));
                        }
                      }}
                      className="block w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                    />

                    {/* Preview Image */}
                    {approveWithdrawModal.preview && (
                      <div className="mt-3 relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50 max-h-48 flex items-center justify-center group">
                        <img
                          src={approveWithdrawModal.preview}
                          alt="Bill preview"
                          className="max-h-48 w-auto object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setApproveWithdrawModal(m => ({ ...m, file: null, preview: null }))}
                          className="absolute top-2 right-2 px-2 py-1 bg-red-600/80 hover:bg-red-700 text-white rounded text-xs font-semibold shadow"
                        >
                          Gỡ ảnh
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Note Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã tham chiếu giao dịch / Lời nhắn cho Seller (tuỳ chọn)
                    </label>
                    <input
                      type="text"
                      value={approveWithdrawModal.note}
                      onChange={e => setApproveWithdrawModal(m => ({ ...m, note: e.target.value }))}
                      placeholder="VD: FT2609221234 - Đã chuyển khoản qua Techcombank"
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setApproveWithdrawModal({ isOpen: false, item: null, file: null, preview: null, note: '', loading: false })}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50"
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      disabled={approveWithdrawModal.loading}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {approveWithdrawModal.loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang xử lý...</span>
                        </>
                      ) : (
                        <span>✅ Xác nhận Duyệt</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* View Receipt Image Modal */}
          {viewReceiptModal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900 text-sm truncate">{viewReceiptModal.title || 'Chứng từ chuyển khoản'}</h3>
                  <button
                    type="button"
                    onClick={() => setViewReceiptModal({ isOpen: false, url: '', title: '' })}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4 bg-gray-50 flex items-center justify-center max-h-[75vh] overflow-auto">
                  <img src={viewReceiptModal.url} alt="Receipt" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm" />
                </div>
                <div className="p-3 border-t border-gray-100 flex justify-between items-center">
                  <a
                    href={viewReceiptModal.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <span>Mở ảnh gốc trong tab mới ↗</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setViewReceiptModal({ isOpen: false, url: '', title: '' })}
                    className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-lg"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== DISPUTES TAB ===================== */}
      {activeTab === 'DISPUTES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900">⚠️ Khiếu Nại Đơn Hàng</h2>
            <span className="text-sm text-gray-500">{dsTotal} khiếu nại đang mở</span>
          </div>
          {dsLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" /></div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {disputes.length === 0 ? (
                <div className="py-12 text-center text-gray-400">✅ Không có khiếu nại nào đang mở.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày tạo</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Mã Đơn</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Giá trị</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Khách hàng</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lý do khiếu nại</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {disputes.map((d: any) => {
                        const statusCls: Record<string, string> = { OPEN: 'bg-amber-100 text-amber-700', RESOLVED: 'bg-blue-100 text-blue-700', REJECTED: 'bg-emerald-100 text-emerald-700' };
                        const statusLabel: Record<string, string> = { OPEN: 'Đang mở', RESOLVED: 'Đã chấp nhận', REJECTED: 'Đã bác' };
                        return (
                          <tr key={d.orderDisputeId} className="hover:bg-gray-50/50">
                            <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{new Date(d.createdAt).toLocaleDateString('vi-VN')}</td>
                            <td className="px-5 py-4 text-sm font-mono font-semibold text-gray-900">{d.orderCode}</td>
                            <td className="px-5 py-4 text-sm font-bold text-right text-gray-900 whitespace-nowrap">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(d.orderAmount)}
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-medium text-gray-900">{d.customerName}</p>
                              <p className="text-xs text-gray-400">{d.customerEmail}</p>
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-700 max-w-xs">
                              <p className="truncate" title={d.reason}>{d.reason}</p>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusCls[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                {statusLabel[d.status] ?? d.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              {d.status === 'OPEN' && (
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => setResolveDisputeModal({isOpen: true, disputeId: d.orderDisputeId, note: '', action: 'resolve'})}
                                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                                    ✅ Chấp nhận
                                  </button>
                                  <button onClick={() => setResolveDisputeModal({isOpen: true, disputeId: d.orderDisputeId, note: '', action: 'reject'})}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                                    ❌ Bác khiếu nại
                                  </button>
                                </div>
                              )}
                              {d.status !== 'OPEN' && <span className="text-xs text-gray-400">{d.adminNote || '—'}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {dsTotal > 0 && (
                <div className="flex justify-center items-center gap-4 py-5 border-t border-gray-100">
                  <button 
                    disabled={dsPage <= 1} 
                    onClick={() => fetchDisputes(dsPage - 1)} 
                    className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
                  >
                    Trước
                  </button>
                  <div className="flex items-center justify-center min-w-[80px] px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-700 font-medium">
                    {dsPage} / {Math.max(1, Math.ceil(dsTotal / DS_PAGE_SIZE))}
                  </div>
                  <button 
                    disabled={dsPage >= Math.ceil(dsTotal / DS_PAGE_SIZE) || Math.ceil(dsTotal / DS_PAGE_SIZE) <= 1} 
                    onClick={() => fetchDisputes(dsPage + 1)} 
                    className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resolve/Reject Dispute Modal */}
          {resolveDisputeModal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {resolveDisputeModal.action === 'resolve' ? '✅ Chấp nhận khiếu nại' : '❌ Bác khiếu nại'}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {resolveDisputeModal.action === 'resolve'
                    ? 'Khiếu nại sẽ được chấp nhận. Tiền sẽ không giải ngân cho seller và cần xử lý thủ công.'
                    : 'Khiếu nại sẽ bị bác. Đơn hàng sẽ được giải ngân về ví seller theo lịch tự động.'}
                </p>
                <textarea
                  value={resolveDisputeModal.note}
                  onChange={e => setResolveDisputeModal(m => ({...m, note: e.target.value}))}
                  rows={3} placeholder="Ghi chú của Admin..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400 resize-none text-sm"
                />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setResolveDisputeModal({isOpen: false, disputeId: null, note: '', action: 'resolve'})} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50">Huỷ</button>
                  <button onClick={handleDisputeAction} className={`flex-1 px-4 py-2.5 text-white rounded-xl font-semibold ${resolveDisputeModal.action === 'resolve' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Xác nhận</button>
                </div>
              </div>
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
