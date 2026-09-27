import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  Wallet as WalletIcon, ArrowDownToLine, ArrowUpRight, Clock, CheckCircle2,
  XCircle, RefreshCw, FileText, ChevronRight, ShieldCheck, Eye, X
} from 'lucide-react';

const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

interface WalletData {
  availableBalance: number;
  frozenBalance: number;
  pendingPayoutAmount?: number;
  updatedAt?: string;
}

interface Transaction {
  escrowTransactionId: number;
  amount: number;
  transactionType: string;
  description: string;
  orderId?: number;
  createdAt: string;
}

interface WithdrawalItem {
  withdrawalRequestId: number;
  amount: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  note?: string;
  status: string;
  adminNote?: string;
  paymentReceiptUrl?: string;
  createdAt: string;
  processedAt?: string;
}

export default function Wallet() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'withdrawals' | 'transactions'>('withdrawals');

  // Withdrawals list state
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [wdTotal, setWdTotal] = useState(0);
  const [wdPage, setWdPage] = useState(1);
  const [wdLoading, setWdLoading] = useState(false);

  // Transactions list state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txLoading, setTxLoading] = useState(false);

  // Modal states
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [viewReceiptModal, setViewReceiptModal] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const PAGE_SIZE = 10;

  // Check login
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await api.get('/wallet');
      setWallet(res.data);
    } catch (err) {
      console.error('Error fetching wallet:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWithdrawals = useCallback(async (page = 1) => {
    setWdLoading(true);
    try {
      const res = await api.get(`/wallet/withdrawals?page=${page}&pageSize=${PAGE_SIZE}`);
      setWithdrawals(res.data.data || []);
      setWdTotal(res.data.total || 0);
      setWdPage(page);
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
    } finally {
      setWdLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async (page = 1) => {
    setTxLoading(true);
    try {
      const res = await api.get(`/wallet/transactions?page=${page}&pageSize=${PAGE_SIZE}`);
      setTransactions(res.data.data || []);
      setTxTotal(res.data.total || 0);
      setTxPage(page);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
    fetchWithdrawals(1);
    fetchTransactions(1);
  }, [fetchWallet, fetchWithdrawals, fetchTransactions]);

  const available = wallet?.availableBalance || 0;
  const frozen = wallet?.frozenBalance || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 mb-1">
              <Link to="/" className="hover:text-emerald-600 transition">Trang chủ</Link>
              <span>/</span>
              <span className="text-gray-700">Ví & Số dư của tôi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
              <span className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl shadow-xs">
                <WalletIcon className="w-7 h-7" />
              </span>
              Ví & Quản Lý Số Dư
            </h1>
          </div>

          <button
            onClick={() => { fetchWallet(); fetchWithdrawals(wdPage); fetchTransactions(txPage); }}
            className="self-start sm:self-center px-4 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới số dư
          </button>
        </div>

        {/* Balance Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Available Balance */}
          <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-emerald-100">Số Dư Khả Dụng</span>
                <span className="bg-white/20 px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-200" />
                  Sẵn sàng rút
                </span>
              </div>
              <p className="text-3xl sm:text-4xl font-black mt-3 tracking-tight">
                {loading ? '...' : money(available)}
              </p>
              <p className="text-xs text-emerald-100/90 mt-2 leading-relaxed">
                Tiền hoàn từ các khiếu nại thành công hoặc doanh thu được tích luỹ tại đây.
              </p>
            </div>

            <div className="pt-6">
              <button
                onClick={() => setShowWithdrawModal(true)}
                disabled={available < 10000}
                className="w-full py-3 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-98 font-bold rounded-2xl shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Rút Tiền Về Ngân Hàng
              </button>
              {available < 10000 && (
                <p className="text-[11px] text-emerald-100/80 text-center mt-2">
                  (Cần tối thiểu 10,000đ để thực hiện rút tiền)
                </p>
              )}
            </div>
          </div>

          {/* Frozen / Processing Balance */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-gray-500">Đang Chờ Xử Lý</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-3">
                {loading ? '...' : money(frozen)}
              </p>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Số tiền tạm thời đóng băng trong khi Admin đang xử lý lệnh rút tiền về tài khoản ngân hàng của bạn.
              </p>
            </div>
            <div className="pt-4 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
              <span>Trạng thái:</span>
              <span className="font-semibold text-gray-700">Đang xử lý</span>
            </div>
          </div>

          {/* Guide / How it works */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-wider text-gray-500">Quy Trình Rút Tiền</span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <FileText className="w-4 h-4" />
                </span>
              </div>
              <ul className="text-xs text-gray-600 space-y-2 mt-4">
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Khiếu nại đơn hàng được duyệt sẽ tự động cộng tiền hoàn vào ví.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                  <span>Tạo lệnh rút tiền với thông tin số tài khoản ngân hàng chính chủ.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                  <span>Admin duyệt và chuyển khoản trong vòng 1-3 ngày làm việc kèm bill xác nhận.</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <Link
                to="/orders"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
              >
                <span>Xem danh sách đơn hàng đã mua</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Tab Navigation & Data Tables */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-100 px-6 pt-4 flex gap-8">
            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`pb-4 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'withdrawals'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <ArrowDownToLine className="w-4 h-4" />
              Lịch sử rút tiền
              <span className="ml-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{wdTotal}</span>
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`pb-4 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'transactions'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Biến động số dư
              <span className="ml-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">{txTotal}</span>
            </button>
          </div>

          {/* Tab 1: Withdrawals */}
          {activeTab === 'withdrawals' && (
            <div>
              {wdLoading ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <ArrowDownToLine className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Bạn chưa tạo yêu cầu rút tiền nào.</p>
                  <p className="text-xs text-gray-400 mt-1">Khi có số dư khả dụng từ 10,000đ, bạn có thể tạo yêu cầu rút về ngân hàng.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50/70 text-gray-500 text-xs font-semibold uppercase">
                      <tr>
                        <th className="px-6 py-3.5 text-left">Ngày tạo</th>
                        <th className="px-6 py-3.5 text-right">Số tiền</th>
                        <th className="px-6 py-3.5 text-left">Ngân hàng</th>
                        <th className="px-6 py-3.5 text-left">Số tài khoản</th>
                        <th className="px-6 py-3.5 text-left">Chủ tài khoản</th>
                        <th className="px-6 py-3.5 text-center">Trạng thái</th>
                        <th className="px-6 py-3.5 text-left">Ghi chú & Chứng từ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {withdrawals.map((w) => {
                        const statusColors: Record<string, string> = {
                          PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
                          APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                          REJECTED: 'bg-rose-50 text-rose-700 border-rose-200'
                        };
                        const statusLabels: Record<string, string> = {
                          PENDING: 'Chờ duyệt',
                          APPROVED: 'Đã chuyển tiền',
                          REJECTED: 'Đã từ chối'
                        };
                        return (
                          <tr key={w.withdrawalRequestId} className="hover:bg-gray-50/50 transition">
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-xs">
                              {new Date(w.createdAt).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-extrabold text-emerald-600">
                              {money(w.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{w.bankName}</td>
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-gray-800">{w.bankAccountNumber}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700 uppercase font-medium">{w.bankAccountHolder}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColors[w.status] || 'bg-gray-100 text-gray-600'}`}>
                                {statusLabels[w.status] || w.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-600 max-w-xs">
                              {w.adminNote && (
                                <p className="mb-1 text-gray-700">
                                  <strong>Admin:</strong> {w.adminNote}
                                </p>
                              )}
                              {w.paymentReceiptUrl && (
                                <button
                                  type="button"
                                  onClick={() => setViewReceiptModal({
                                    isOpen: true,
                                    url: w.paymentReceiptUrl!,
                                    title: `Chứng từ chuyển khoản rút tiền #${w.withdrawalRequestId}`
                                  })}
                                  className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Xem bill chuyển khoản</span>
                                </button>
                              )}
                              {!w.adminNote && !w.paymentReceiptUrl && (
                                <span className="text-gray-400 italic">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination for Withdrawals */}
              {wdTotal > PAGE_SIZE && (
                <div className="flex justify-center items-center gap-3 py-4 border-t border-gray-100">
                  <button
                    disabled={wdPage <= 1}
                    onClick={() => fetchWithdrawals(wdPage - 1)}
                    className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <span className="text-xs text-gray-500 font-medium">
                    Trang {wdPage} / {Math.ceil(wdTotal / PAGE_SIZE)}
                  </span>
                  <button
                    disabled={wdPage >= Math.ceil(wdTotal / PAGE_SIZE)}
                    onClick={() => fetchWithdrawals(wdPage + 1)}
                    className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Transactions */}
          {activeTab === 'transactions' && (
            <div>
              {txLoading ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <ArrowUpRight className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Chưa có giao dịch biến động nào.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50/70 text-gray-500 text-xs font-semibold uppercase">
                      <tr>
                        <th className="px-6 py-3.5 text-left">Thời gian</th>
                        <th className="px-6 py-3.5 text-left">Loại giao dịch</th>
                        <th className="px-6 py-3.5 text-right">Biến động</th>
                        <th className="px-6 py-3.5 text-left">Nội dung</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {transactions.map((t) => {
                        const isPlus = t.transactionType === 'REFUND' || t.transactionType === 'RELEASE' || t.transactionType === 'DEPOSIT';
                        return (
                          <tr key={t.escrowTransactionId} className="hover:bg-gray-50/50 transition">
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-xs">
                              {new Date(t.createdAt).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-xs">
                              {t.transactionType === 'REFUND' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">
                                  Hoàn tiền khiếu nại
                                </span>
                              )}
                              {t.transactionType === 'FREEZE' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold">
                                  Tạm giữ rút tiền
                                </span>
                              )}
                              {t.transactionType === 'RELEASE' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold">
                                  Giải ngân
                                </span>
                              )}
                              {t.transactionType !== 'REFUND' && t.transactionType !== 'FREEZE' && t.transactionType !== 'RELEASE' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-semibold">
                                  {t.transactionType}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-bold">
                              <span className={isPlus ? 'text-emerald-600' : 'text-rose-600'}>
                                {isPlus ? `+${money(t.amount)}` : `-${money(t.amount)}`}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-700">{t.description}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination for Transactions */}
              {txTotal > PAGE_SIZE && (
                <div className="flex justify-center items-center gap-3 py-4 border-t border-gray-100">
                  <button
                    disabled={txPage <= 1}
                    onClick={() => fetchTransactions(txPage - 1)}
                    className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <span className="text-xs text-gray-500 font-medium">
                    Trang {txPage} / {Math.ceil(txTotal / PAGE_SIZE)}
                  </span>
                  <button
                    disabled={txPage >= Math.ceil(txTotal / PAGE_SIZE)}
                    onClick={() => fetchTransactions(txPage + 1)}
                    className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Withdrawal Request Modal */}
      {showWithdrawModal && (
        <WithdrawalModal
          available={available}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={() => {
            setShowWithdrawModal(false);
            fetchWallet();
            fetchWithdrawals(1);
            setAlertModal({
              isOpen: true,
              message: 'Yêu cầu rút tiền đã được gửi tới Admin. Tiền sẽ được chuyển vào tài khoản ngân hàng của bạn trong vòng 1-3 ngày làm việc.',
              type: 'success'
            });
          }}
        />
      )}

      {/* Receipt Image Modal */}
      {viewReceiptModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-[fadeInScale_0.2s_ease]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-sm truncate">{viewReceiptModal.title}</h3>
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

      {/* Alert Modal */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center animate-[fadeInScale_0.2s_ease]">
            <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
              alertModal.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
            }`}>
              {alertModal.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
            </div>
            <p className="text-sm text-gray-800 leading-relaxed font-medium mb-5">{alertModal.message}</p>
            <button
              onClick={() => setAlertModal({ isOpen: false, message: '', type: 'info' })}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
            >
              Đồng ý
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Modal Tạo Yêu Cầu Rút Tiền ────────────────────────────────────────────────
function WithdrawalModal({
  available,
  onClose,
  onSuccess
}: {
  available: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    amount: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountHolder: '',
    note: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amount = parseFloat(form.amount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ.');
      return;
    }
    if (amount < 10000) {
      setError('Số tiền rút tối thiểu là 10,000đ.');
      return;
    }
    if (amount > available) {
      setError(`Số tiền vượt quá số dư khả dụng (${money(available)}).`);
      return;
    }
    if (!form.bankName.trim() || !form.bankAccountNumber.trim() || !form.bankAccountHolder.trim()) {
      setError('Vui lòng điền đầy đủ tên ngân hàng, số tài khoản và tên chủ tài khoản.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/wallet/withdrawals', {
        amount,
        bankName: form.bankName.trim(),
        bankAccountNumber: form.bankAccountNumber.trim(),
        bankAccountHolder: form.bankAccountHolder.trim(),
        note: form.note.trim() || null
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi tạo yêu cầu rút tiền.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeInScale_0.2s_ease]">
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">🏧 Tạo Yêu Cầu Rút Tiền</h2>
            <p className="text-xs text-emerald-100 mt-0.5">
              Số dư khả dụng: <strong className="text-white">{money(available)}</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Số tiền muốn rút (VNĐ) <span className="text-rose-500">*</span>
              <span className="text-[11px] text-emerald-600 font-semibold ml-2">(Tối thiểu 10,000đ)</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: 100000"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Ngân hàng thụ hưởng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Vietcombank, MB Bank, Techcombank..."
              value={form.bankName}
              onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Số tài khoản ngân hàng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Nhập số tài khoản"
              value={form.bankAccountNumber}
              onChange={e => setForm(f => ({ ...f, bankAccountNumber: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Tên chủ tài khoản <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="NGUYEN VAN A (viết hoa không dấu)"
              value={form.bankAccountHolder}
              onChange={e => setForm(f => ({ ...f, bankAccountHolder: e.target.value.toUpperCase() }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Ghi chú (tuỳ chọn)</label>
            <textarea
              placeholder="Ghi chú thêm nếu cần..."
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-xs"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>Gửi yêu cầu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
