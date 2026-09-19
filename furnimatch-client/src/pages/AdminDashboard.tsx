import { useState, useEffect } from 'react';
import api from '../utils/api';

const AdminDashboard = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; userId: number | null }>({ isOpen: false, userId: null });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' }>({ isOpen: false, message: '', type: 'success' });

  useEffect(() => {
    fetchUsers();
    setCurrentPage(1);
  }, [filterRole]);

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
        message: error.response?.data?.message || 'Có lỗi xảy ra khi xóa tài khoản. Vui lòng khởi động lại Backend (dotnet run) nếu bạn chưa làm việc đó.', 
        type: 'error' 
      });
    }
  };

  const totalPages = Math.ceil(users.length / itemsPerPage);
  const currentUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý người dùng</h1>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50 transition-opacity">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 transform transition-all">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Xác nhận xóa</h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa tài khoản này khỏi hệ thống không? 
              Tài khoản sẽ bị xóa hoàn toàn, tuy nhiên người dùng vẫn có thể dùng email đó để đăng ký lại từ đầu.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setDeleteConfirmModal({ isOpen: false, userId: null })}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={deleteUser}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-md"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50 z-50 transition-opacity">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center transform transition-all">
            <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ${alertModal.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
              {alertModal.type === 'success' ? (
                <svg className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{alertModal.type === 'success' ? 'Thành công!' : 'Lỗi'}</h3>
            <p className="text-sm text-gray-500 text-center mb-6">{alertModal.message}</p>
            <button
              onClick={() => setAlertModal({ isOpen: false, message: '', type: 'success' })}
              className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none transition-colors shadow-md"
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
