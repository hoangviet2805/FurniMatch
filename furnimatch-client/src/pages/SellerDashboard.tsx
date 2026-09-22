import { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import { Package, User, MapPin, Phone, CheckCircle, Clock, Truck, Hammer, XCircle, ClipboardList, Wallet, ArrowDownToLine, History, FileText } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

const stateConfig: Record<string, { label: string, color: string, icon: any }> = {
  WAITING_PAYMENT: { label: 'Chờ thanh toán', color: 'bg-amber-100 text-amber-800', icon: Clock },
  CONFIRMED: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  PREPARING: { label: 'Đang chuẩn bị hàng', color: 'bg-cyan-100 text-cyan-800', icon: ClipboardList },
  PRODUCING: { label: 'Đang sản xuất', color: 'bg-indigo-100 text-indigo-800', icon: Hammer },
  SHIPPED: { label: 'Đang giao hàng', color: 'bg-purple-100 text-purple-800', icon: Truck },
  COMPLETED: { label: 'Hoàn thành', color: 'bg-emerald-100 text-emerald-800', icon: Package },
  CANCELLED: { label: 'Đã huỷ', color: 'bg-rose-100 text-rose-800', icon: XCircle }
};

// ─── Withdrawal Modal ─────────────────────────────────────────────────────────
function WithdrawalModal({ available, onClose, onSuccess }: { available: number, onClose: () => void, onSuccess: () => void }) {
  const [form, setForm] = useState({ amount: '', bankName: '', bankAccountNumber: '', bankAccountHolder: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amount = parseFloat(form.amount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) { setError('Vui lòng nhập số tiền hợp lệ.'); return; }
    if (amount < 10000) { setError('Số tiền rút tối thiểu là 10,000đ.'); return; }
    if (available < 10000) { setError(`Số dư khả dụng hiện tại (${money(available)}) chưa đủ hạn mức rút tối thiểu (10,000đ).`); return; }
    if (amount > available) { setError(`Số tiền vượt quá số dư khả dụng (${money(available)}).`); return; }
    if (!form.bankName.trim() || !form.bankAccountNumber.trim() || !form.bankAccountHolder.trim()) {
      setError('Vui lòng điền đầy đủ thông tin ngân hàng.'); return;
    }
    try {
      setSubmitting(true);
      await api.post('/seller/withdrawals', { amount, bankName: form.bankName, bankAccountNumber: form.bankAccountNumber, bankAccountHolder: form.bankAccountHolder, note: form.note });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-[fadeInScale_0.2s_ease]">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">🏧 Yêu cầu rút tiền</h2>
            <p className="text-sm text-gray-500 mt-0.5">Số dư khả dụng: <span className="font-semibold text-emerald-600">{money(available)}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">{error}</div>}
          {available < 10000 && (
            <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
              ⚠️ Số dư khả dụng hiện tại ({money(available)}) chưa đủ hạn mức rút tối thiểu (10,000đ).
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Số tiền muốn rút (đ) <span className="text-red-500">*</span>
              <span className="text-xs text-emerald-600 font-semibold ml-2">(Tối thiểu 10,000đ)</span>
            </label>
            <input
              type="text" placeholder="Ví dụ: 10,000 hoặc 1,000,000"
              value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900"
            />
            {form.amount && !isNaN(parseFloat(form.amount.replace(/,/g, ''))) && parseFloat(form.amount.replace(/,/g, '')) < 10000 && (
              <p className="text-xs text-red-500 mt-1">⚠️ Số tiền rút tối thiểu là 10,000đ.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên ngân hàng <span className="text-red-500">*</span></label>
            <input
              type="text" placeholder="Ví dụ: Vietcombank, BIDV, Techcombank..."
              value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Số tài khoản <span className="text-red-500">*</span></label>
            <input
              type="text" placeholder="Nhập số tài khoản ngân hàng"
              value={form.bankAccountNumber} onChange={e => setForm(f => ({ ...f, bankAccountNumber: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên chủ tài khoản <span className="text-red-500">*</span></label>
            <input
              type="text" placeholder="Nhập đúng tên chủ tài khoản"
              value={form.bankAccountHolder} onChange={e => setForm(f => ({ ...f, bankAccountHolder: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú (tuỳ chọn)</label>
            <textarea
              placeholder="Ghi chú thêm nếu cần..."
              value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors">
              Huỷ
            </button>
            <button type="submit" disabled={submitting || available < 10000} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
              {submitting ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Đang gửi...</> : <><ArrowDownToLine className="w-4 h-4" />Gửi yêu cầu</>}
            </button>
          </div>
        </form>
        <div className="px-6 pb-4">
          <p className="text-xs text-gray-400 text-center">Yêu cầu sẽ được Admin xem xét và xử lý trong 1–3 ngày làm việc</p>
        </div>
      </div>
    </div>
  );
}

// ─── Wallet Section ───────────────────────────────────────────────────────────
function WalletSection() {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [receiptPreviewModal, setReceiptPreviewModal] = useState<{ isOpen: boolean; url: string; item: any | null }>({ isOpen: false, url: '', item: null });
  const [loading, setLoading] = useState(true);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [wdPage, setWdPage] = useState(1);
  const [wdTotal, setWdTotal] = useState(0);
  const PAGE_SIZE = 10;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [walletRes, txRes, wdRes] = await Promise.all([
        api.get('/seller/wallet'),
        api.get(`/seller/transactions?page=1&pageSize=${PAGE_SIZE}`),
        api.get(`/seller/withdrawals?page=1&pageSize=${PAGE_SIZE}`),
      ]);
      setWallet(walletRes.data);
      setTransactions(txRes.data.data || []);
      setTxTotal(txRes.data.total || 0);
      setWithdrawals(wdRes.data.data || []);
      setWdTotal(wdRes.data.total || 0);
    } catch {
      setWallet({ availableBalance: 0, frozenBalance: 0, pendingPayoutAmount: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTxPage = async (page: number) => {
    const res = await api.get(`/seller/transactions?page=${page}&pageSize=${PAGE_SIZE}`);
    setTransactions(res.data.data || []);
    setTxPage(page);
  };

  const fetchWdPage = async (page: number) => {
    const res = await api.get(`/seller/withdrawals?page=${page}&pageSize=${PAGE_SIZE}`);
    setWithdrawals(res.data.data || []);
    setWdPage(page);
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" /></div>;

  const txTypeMeta: Record<string, { label: string, color: string, sign: string }> = {
    RELEASE: { label: 'Giải ngân', color: 'text-emerald-600', sign: '+' },
    DEPOSIT: { label: 'Nạp tiền', color: 'text-blue-600', sign: '+' },
    FREEZE:  { label: 'Tạm giữ', color: 'text-amber-600', sign: '-' },
    REFUND:  { label: 'Hoàn tiền', color: 'text-violet-600', sign: '+' },
  };

  const wdStatusMeta: Record<string, { label: string, cls: string }> = {
    PENDING:  { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-700' },
    APPROVED: { label: 'Đã duyệt', cls: 'bg-emerald-100 text-emerald-700' },
    REJECTED: { label: 'Bị từ chối', cls: 'bg-red-100 text-red-700' },
  };

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />
          <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
          <Wallet className="w-8 h-8 mb-3 opacity-80" />
          <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">Số dư khả dụng</p>
          <p className="text-3xl font-extrabold">{money(wallet?.availableBalance ?? 0)}</p>
          <p className="text-emerald-200 text-xs mt-2">Có thể rút ngay</p>
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={(wallet?.availableBalance ?? 0) <= 0}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-xl transition-all border border-white/20"
          >
            <ArrowDownToLine className="w-4 h-4" />
            Yêu cầu rút tiền
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-amber-100 shadow-sm">
          <Clock className="w-7 h-7 text-amber-500 mb-3" />
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Đang chờ giải ngân</p>
          <p className="text-2xl font-bold text-amber-600">{money(wallet?.pendingPayoutAmount ?? 0)}</p>
          <p className="text-gray-400 text-xs mt-2">Từ đơn COMPLETED chưa đủ thời gian</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-violet-100 shadow-sm">
          <div className="w-7 h-7 text-violet-500 mb-3 text-xl">🔒</div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">Đang đóng băng</p>
          <p className="text-2xl font-bold text-violet-600">{money(wallet?.frozenBalance ?? 0)}</p>
          <p className="text-gray-400 text-xs mt-2">Yêu cầu rút đang chờ duyệt</p>
        </div>
      </div>

      {/* Withdrawal History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <ArrowDownToLine className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-gray-900">Lịch sử yêu cầu rút tiền</h2>
          <span className="ml-auto text-sm text-gray-400">{wdTotal} yêu cầu</span>
        </div>
        {withdrawals.length === 0 ? (
          <div className="py-10 text-center text-gray-400">Chưa có yêu cầu rút tiền nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-50">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngày tạo</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Số tiền</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Ngân hàng nhận</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Số TK / Chủ TK</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Chứng từ / Phản hồi của Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {withdrawals.map((w: any) => {
                  const meta = wdStatusMeta[w.status] ?? { label: w.status, cls: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={w.withdrawalRequestId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{new Date(w.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td className="px-5 py-4 text-sm font-bold text-right text-emerald-700 whitespace-nowrap">{money(w.amount)}</td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-800">{w.bankName}</td>
                      <td className="px-5 py-4 text-sm">
                        <p className="font-mono text-gray-900 font-semibold">{w.bankAccountNumber}</p>
                        <p className="text-xs text-gray-400">{w.bankAccountHolder}</p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        {w.status === 'APPROVED' && (
                          <div className="flex flex-col gap-1.5 items-start">
                            {w.paymentReceiptUrl ? (
                              <button
                                type="button"
                                onClick={() => setReceiptPreviewModal({
                                  isOpen: true,
                                  url: w.paymentReceiptUrl.startsWith('http') ? w.paymentReceiptUrl : `http://localhost:5234${w.paymentReceiptUrl}`,
                                  item: w
                                })}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 transition-all shadow-sm"
                              >
                                <span>🧾 Xem Bill Chuyển Khoản</span>
                                <span>↗</span>
                              </button>
                            ) : (
                              <span className="text-xs text-emerald-600 font-medium">✅ Đã chuyển khoản</span>
                            )}
                            {w.adminNote && (
                              <p className="text-xs text-gray-500 italic">Ghi chú: {w.adminNote}</p>
                            )}
                          </div>
                        )}

                        {w.status === 'REJECTED' && (
                          <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-3 py-1.5 text-xs inline-block max-w-sm">
                            <span className="font-bold">Lý do từ chối: </span>
                            <span>{w.adminNote || 'Yêu cầu rút tiền không hợp lệ. Số tiền đã được hoàn trả lại ví khả dụng.'}</span>
                          </div>
                        )}

                        {w.status === 'PENDING' && (
                          <span className="text-xs text-amber-600 font-medium italic">Đang chờ Admin kiểm tra và chuyển khoản (1-3 ngày)</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {withdrawals.length > 0 && (
          <div className="flex justify-center items-center gap-4 py-5 border-t border-gray-100">
            <button 
              disabled={wdPage <= 1} 
              onClick={() => fetchWdPage(wdPage - 1)} 
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
            >
              Trước
            </button>
            <div className="flex items-center justify-center min-w-[80px] px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-700 font-medium">
              {wdPage} / {Math.max(1, Math.ceil(wdTotal / PAGE_SIZE))}
            </div>
            <button 
              disabled={wdPage >= Math.ceil(wdTotal / PAGE_SIZE) || Math.ceil(wdTotal / PAGE_SIZE) <= 1} 
              onClick={() => fetchWdPage(wdPage + 1)} 
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
            >
              Sau
            </button>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Lịch sử giao dịch ví</h2>
          <span className="ml-auto text-sm text-gray-400">{txTotal} giao dịch</span>
        </div>
        {transactions.length === 0 ? (
          <div className="py-10 text-center text-gray-400">Chưa có giao dịch nào.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map((t: any) => {
              const meta = txTypeMeta[t.transactionType] ?? { label: t.transactionType, color: 'text-gray-600', sign: '' };
              return (
                <div key={t.escrowTransactionId} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${meta.sign === '+' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {meta.sign}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
                    <p className="text-xs text-gray-400 truncate">{t.description}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${meta.color}`}>{meta.sign}{money(t.amount)}</p>
                    <p className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {transactions.length > 0 && (
          <div className="flex justify-center items-center gap-4 py-5 border-t border-gray-100">
            <button 
              disabled={txPage <= 1} 
              onClick={() => fetchTxPage(txPage - 1)} 
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
            >
              Trước
            </button>
            <div className="flex items-center justify-center min-w-[80px] px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-700 font-medium">
              {txPage} / {Math.max(1, Math.ceil(txTotal / PAGE_SIZE))}
            </div>
            <button 
              disabled={txPage >= Math.ceil(txTotal / PAGE_SIZE) || Math.ceil(txTotal / PAGE_SIZE) <= 1} 
              onClick={() => fetchTxPage(txPage + 1)} 
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
            >
              Sau
            </button>
          </div>
        )}
      </div>

      {showWithdrawModal && (
        <WithdrawalModal
          available={wallet?.availableBalance ?? 0}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={() => { setShowWithdrawModal(false); fetchAll(); }}
        />
      )}

      {/* Receipt Image Preview Modal for Seller */}
      {receiptPreviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-fadeIn">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <span>🧾 Bill Chuyển Khoản Từ Admin</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Đã thanh toán</span>
                </h3>
                {receiptPreviewModal.item && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    Số tiền: <strong className="text-emerald-600">{money(receiptPreviewModal.item.amount)}</strong> · Ngân hàng: {receiptPreviewModal.item.bankName} ({receiptPreviewModal.item.bankAccountNumber})
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setReceiptPreviewModal({ isOpen: false, url: '', item: null })}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 text-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-gray-900/5 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={receiptPreviewModal.url}
                alt="Bill chuyển khoản"
                className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-md border border-gray-200"
              />
            </div>
            <div className="p-4 bg-white border-t border-gray-100 flex justify-between items-center">
              {receiptPreviewModal.item?.adminNote ? (
                <p className="text-xs text-gray-600">
                  <span className="font-semibold">Lời nhắn:</span> {receiptPreviewModal.item.adminNote}
                </p>
              ) : <div />}
              <div className="flex gap-2">
                <a
                  href={receiptPreviewModal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-semibold transition-colors"
                >
                  Mở ảnh gốc ↗
                </a>
                <button
                  type="button"
                  onClick={() => setReceiptPreviewModal({ isOpen: false, url: '', item: null })}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SellerDashboard() {
  const [tab, setTab] = useState<'ORDERS' | 'QUOTES' | 'REVENUE' | 'WALLET'>('ORDERS');
  const [orders, setOrders] = useState<any[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'INCOMPLETE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter === 'ALL') return true;
    if (orderStatusFilter === 'INCOMPLETE') return o.orderStatus !== 'COMPLETED' && o.orderStatus !== 'CANCELLED';
    if (orderStatusFilter === 'COMPLETED') return o.orderStatus === 'COMPLETED';
    if (orderStatusFilter === 'CANCELLED') return o.orderStatus === 'CANCELLED';
    return true;
  });

  const incompleteCount = orders.filter(o => o.orderStatus !== 'COMPLETED' && o.orderStatus !== 'CANCELLED').length;
  const completedCount = orders.filter(o => o.orderStatus === 'COMPLETED').length;
  const cancelledCount = orders.filter(o => o.orderStatus === 'CANCELLED').length;

  // ========== REVENUE STATE ==========
  const [revSummary, setRevSummary] = useState<any>(null);
  const [revChart, setRevChart] = useState<any[]>([]);
  const [revOrders, setRevOrders] = useState<any[]>([]);
  const [revOrdersTotal, setRevOrdersTotal] = useState(0);
  const [revOrdersPage, setRevOrdersPage] = useState(1);
  const [revChartPeriod, setRevChartPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [revChartYear, setRevChartYear] = useState(new Date().getFullYear());
  const [revLoading, setRevLoading] = useState(false);
  const [revFromDate, setRevFromDate] = useState('');
  const [revToDate, setRevToDate] = useState('');
  const REV_PAGE_SIZE = 10;

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'ORDERS') {
        const res = await api.get('/orders/seller');
        setOrders(res.data);
      } else if (tab === 'QUOTES') {
        const res = await api.get('/quotationrequests');
        setRequests(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 'REVENUE' && tab !== 'WALLET') {
      load();
      setCurrentPage(1);
    }
  }, [tab]);

  const update = async (id: number, status: string) => {
    await api.put(`/orders/${id}/status`, { status });
    load();
  };

  // ========== REVENUE LOGIC ==========
  const fetchRevSummary = useCallback(async () => {
    const params = new URLSearchParams();
    if (revFromDate) params.set('from', revFromDate);
    if (revToDate) params.set('to', revToDate);
    const res = await api.get(`/seller/revenue/summary?${params}`);
    setRevSummary(res.data);
  }, [revFromDate, revToDate]);

  const fetchRevChart = useCallback(async () => {
    const res = await api.get(`/seller/revenue/chart?period=${revChartPeriod}&year=${revChartYear}`);
    setRevChart(res.data);
  }, [revChartPeriod, revChartYear]);

  const fetchRevOrders = useCallback(async (page = 1) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(REV_PAGE_SIZE) });
    if (revFromDate) params.set('from', revFromDate);
    if (revToDate) params.set('to', revToDate);
    const res = await api.get(`/seller/revenue/orders?${params}`);
    setRevOrders(res.data.data);
    setRevOrdersTotal(res.data.total);
    setRevOrdersPage(page);
  }, [revFromDate, revToDate]);

  const loadAllRevenue = useCallback(async () => {
    setRevLoading(true);
    try {
      await Promise.all([fetchRevSummary(), fetchRevChart(), fetchRevOrders(1)]);
    } finally {
      setRevLoading(false);
    }
  }, [fetchRevSummary, fetchRevChart, fetchRevOrders]);

  useEffect(() => {
    if (tab === 'REVENUE') loadAllRevenue();
  }, [tab]);

  useEffect(() => {
    if (tab === 'REVENUE') fetchRevChart();
  }, [revChartPeriod, revChartYear]);

  const revTotalOrderPages = Math.ceil(revOrdersTotal / REV_PAGE_SIZE);

  const tabs = [
    { key: 'ORDERS', label: '📦 Quản lý đơn hàng' },
    { key: 'QUOTES', label: '📄 Yêu cầu báo giá' },
    { key: 'REVENUE', label: '📊 Doanh Thu Của Tôi' },
    { key: 'WALLET', label: '💰 Ví & Rút Tiền' },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Bảng điều khiển xưởng</h1>
      
      <div className="flex gap-2 rounded-xl bg-gray-100 p-1 w-fit mb-8 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${tab === t.key ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ===================== WALLET TAB ===================== */}
      {tab === 'WALLET' && <WalletSection />}

      {/* ===================== REVENUE TAB ===================== */}
      {tab === 'REVENUE' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Từ ngày</label>
              <input type="date" value={revFromDate} onChange={e => setRevFromDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Đến ngày</label>
              <input type="date" value={revToDate} onChange={e => setRevToDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
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

          {revLoading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div></div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-sm">
                  <p className="text-emerald-100 text-xs font-medium uppercase tracking-wide mb-1">Tổng Doanh Thu</p>
                  <p className="text-xl font-bold truncate">{money(revSummary?.totalGmv)}</p>
                  <p className="text-emerald-200 text-xs mt-1">Tiền hàng đã thanh toán</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white shadow-sm">
                  <p className="text-amber-100 text-xs font-medium uppercase tracking-wide mb-1">Hoa Hồng Platform</p>
                  <p className="text-xl font-bold truncate">{money(revSummary?.totalCommission)}</p>
                  <p className="text-amber-200 text-xs mt-1">Tỷ lệ {revSummary?.commissionRate}%</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-sm">
                  <p className="text-blue-100 text-xs font-medium uppercase tracking-wide mb-1">Thực Nhận</p>
                  <p className="text-xl font-bold truncate">{money(revSummary?.netRevenue)}</p>
                  <p className="text-blue-200 text-xs mt-1">Sau khi trừ hoa hồng</p>
                </div>
                <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-5 text-white shadow-sm">
                  <p className="text-violet-100 text-xs font-medium uppercase tracking-wide mb-1">Đơn Đã Thanh Toán</p>
                  <p className="text-xl font-bold">{revSummary?.totalPaidOrders ?? 0}</p>
                  <p className="text-violet-200 text-xs mt-1">Đơn hoàn tất thanh toán</p>
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
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={revChart} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis tickFormatter={(v: number) => v >= 1000000 ? `${(v/1000000).toFixed(0)}M` : String(v)} tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Tooltip formatter={(val: any) => [money(val), '']} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                    <Legend />
                    <Bar dataKey="gmv" name="Doanh thu (VND)" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="commission" name="Hoa hồng (VND)" fill="#f59e0b" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
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
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Khách Hàng</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tiền Hàng</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Hoa Hồng</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Thực Nhận</th>
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
                          <td className="px-5 py-3 text-sm text-gray-700">{o.customerName}</td>
                          <td className="px-5 py-3 text-sm text-emerald-700 font-semibold text-right">{money(o.subtotal)}</td>
                          <td className="px-5 py-3 text-sm text-amber-600 font-medium text-right">-{money(o.commission)}</td>
                          <td className="px-5 py-3 text-sm text-blue-700 font-bold text-right">{money(o.netRevenue)}</td>
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
                {revOrders.length > 0 && (
                  <div className="flex justify-center items-center gap-4 py-5 border-t border-gray-100">
                    <button 
                      onClick={() => fetchRevOrders(Math.max(1, revOrdersPage - 1))}
                      disabled={revOrdersPage <= 1}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
                    >
                      Trước
                    </button>
                    <div className="flex items-center justify-center min-w-[80px] px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-700 font-medium">
                      {revOrdersPage} / {Math.max(1, revTotalOrderPages)}
                    </div>
                    <button 
                      onClick={() => fetchRevOrders(Math.min(revTotalOrderPages, revOrdersPage + 1))}
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

      {/* ===================== ORDERS & QUOTES TABS ===================== */}
      {tab !== 'REVENUE' && tab !== 'WALLET' && (
        <>
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : tab === 'ORDERS' ? (
            <div className="space-y-6">
              {/* Order Status Filters */}
              <div className="flex flex-wrap items-center gap-2 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/80 w-fit shadow-xs">
                <button
                  type="button"
                  onClick={() => { setOrderStatusFilter('ALL'); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    orderStatusFilter === 'ALL'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>Tất cả</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    orderStatusFilter === 'ALL' ? 'bg-gray-100 text-gray-800' : 'bg-gray-200/70 text-gray-600'
                  }`}>
                    {orders.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setOrderStatusFilter('INCOMPLETE'); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    orderStatusFilter === 'INCOMPLETE'
                      ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                      : 'text-amber-800 hover:bg-amber-100/60'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Chưa hoàn thành</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    orderStatusFilter === 'INCOMPLETE' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {incompleteCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setOrderStatusFilter('COMPLETED'); setCurrentPage(1); }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    orderStatusFilter === 'COMPLETED'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                      : 'text-emerald-800 hover:bg-emerald-100/60'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Đã hoàn thành</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    orderStatusFilter === 'COMPLETED' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {completedCount}
                  </span>
                </button>

                {cancelledCount > 0 && (
                  <button
                    type="button"
                    onClick={() => { setOrderStatusFilter('CANCELLED'); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      orderStatusFilter === 'CANCELLED'
                        ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/20'
                        : 'text-rose-700 hover:bg-rose-100/60'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Đã huỷ</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      orderStatusFilter === 'CANCELLED' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {cancelledCount}
                    </span>
                  </button>
                )}
              </div>

              {filteredOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 font-medium">
                    {orderStatusFilter === 'INCOMPLETE'
                      ? 'Không có đơn hàng nào chưa hoàn thành.'
                      : orderStatusFilter === 'COMPLETED'
                      ? 'Chưa có đơn hàng nào đã hoàn thành.'
                      : orderStatusFilter === 'CANCELLED'
                      ? 'Không có đơn hàng nào đã huỷ.'
                      : 'Chưa có đơn hàng nào.'}
                  </p>
                </div>
              ) : (
                filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(o => {
                  let lines: any[] = [];
                  try { lines = JSON.parse(o.itemsJson); } catch {}
                  const StatusIcon = stateConfig[o.orderStatus]?.icon || Package;

                  return (
                    <article key={o.orderId} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      {/* Header */}
                      <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h2 className="text-lg font-bold text-gray-900">Đơn hàng #{o.orderCode}</h2>
                          <p className="text-sm text-gray-500 mt-1">{new Date(o.createdAt).toLocaleString('vi-VN')}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${stateConfig[o.orderStatus]?.color || 'bg-gray-100 text-gray-800'}`}>
                            <StatusIcon className="w-4 h-4" />
                            {stateConfig[o.orderStatus]?.label || o.orderStatus}
                          </div>
                          <select 
                            value={o.orderStatus} 
                            onChange={e => update(o.orderId, e.target.value)} 
                            disabled={o.orderStatus === 'CANCELLED' || o.orderStatus === 'WAITING_PAYMENT' || o.orderStatus === 'COMPLETED'} 
                            className="rounded-lg border-gray-300 shadow-sm text-sm font-medium focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                          >
                            <option value="WAITING_PAYMENT" disabled>Chờ thanh toán</option>
                            {o.orderStatus === 'CONFIRMED' && <option value="CONFIRMED" disabled>Đã xác nhận</option>}
                            <option value="PREPARING" disabled={!['CONFIRMED', 'PREPARING'].includes(o.orderStatus)}>Đang chuẩn bị hàng</option>
                            <option value="PRODUCING" disabled={!['PREPARING', 'PRODUCING'].includes(o.orderStatus)}>Đang sản xuất</option>
                            <option value="SHIPPED" disabled={!['PRODUCING', 'SHIPPED'].includes(o.orderStatus)}>Đang giao hàng</option>
                            <option value="COMPLETED" disabled={!['SHIPPED', 'COMPLETED'].includes(o.orderStatus)}>Hoàn thành</option>
                            {o.orderStatus === 'CANCELLED' && <option value="CANCELLED" disabled>Đã huỷ</option>}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-gray-100">
                        {/* Customer Info */}
                        <div className="p-6">
                          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <User className="w-4 h-4 text-emerald-600" />
                            Thông tin khách hàng
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <User className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{o.recipientName}</p>
                                <p className="text-xs text-gray-500">Tên người nhận</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <Phone className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{o.recipientPhone}</p>
                                <p className="text-xs text-gray-500">Số điện thoại</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-gray-900 leading-snug">{o.address}</p>
                                <p className="text-xs text-gray-500 mt-0.5">Địa chỉ giao hàng</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <FileText className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium leading-snug">
                                  {(o.note || o.Note) ? (
                                    <span className="inline-block bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-200/80 font-normal">
                                      {o.note || o.Note}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic">Không có ghi chú</span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">Ghi chú đơn hàng</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Order Details */}
                        <div className="p-6 bg-gray-50/30">
                          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Package className="w-4 h-4 text-emerald-600" />
                            Chi tiết đơn hàng
                          </h3>
                          <div className="space-y-4">
                            {lines.map((x, i) => {
                              const name = x.name || x.Name;
                              const sizeLabel = x.sizeLabel || x.SizeLabel;
                              const quantity = x.quantity || x.Quantity;
                              const price = x.price || x.Price;
                              const imageUrl = x.imageUrl || x.ImageUrl;
                              return (
                                <div key={i} className="flex gap-4">
                                  <div className="h-16 w-16 shrink-0 rounded-lg border bg-white overflow-hidden">
                                    {imageUrl ? <img src={imageUrl.startsWith('http') ? imageUrl : `http://localhost:5234${imageUrl}`} className="h-full w-full object-cover" alt="" /> : <Package className="h-full w-full p-4 text-gray-200" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                                    <p className="text-xs text-gray-500 mt-1">{sizeLabel}</p>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-sm font-medium text-gray-700">SL: {quantity}</span>
                                      <span className="text-sm font-semibold text-gray-900">{money(price)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
                            <span className="font-medium text-gray-700">Tổng cộng:</span>
                            <span className="text-xl font-bold text-emerald-600">{money(o.totalAmount)}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}

              {filteredOrders.length > 0 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) <= 1}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
                  >
                    Trước
                  </button>
                  <div className="flex items-center justify-center min-w-[80px] px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-700 font-medium">
                    {currentPage} / {Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE))}
                  </div>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredOrders.length / ITEMS_PER_PAGE), p + 1))}
                    disabled={currentPage === Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) || Math.ceil(filteredOrders.length / ITEMS_PER_PAGE) <= 1}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-emerald-600 disabled:opacity-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold shadow-sm transition-all"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {requests.length ? (
                requests.map((r: any) => (
                  <div key={r.quotationRequestId} className="rounded-xl border bg-white p-6 shadow-sm">
                    <h3 className="font-bold text-lg text-gray-900">{r.productType}</h3>
                    <p className="mt-2 text-gray-600">Số lượng: {r.quantity} · {r.description || 'Không có mô tả'}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                  <p className="text-gray-500 font-medium">Chưa có yêu cầu báo giá.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
