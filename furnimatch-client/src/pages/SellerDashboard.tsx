import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { getImageUrl } from '../utils/api';
import { Package, User, MapPin, Phone, CheckCircle, Clock, Truck, Hammer, XCircle, ClipboardList, Wallet, ArrowDownToLine, History, FileText, AlertTriangle, CheckCircle2, Eye, ShieldAlert, ZoomIn, ZoomOut, RotateCcw, X, ExternalLink, Sparkles } from 'lucide-react';
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
                                  url: getImageUrl(w.paymentReceiptUrl),
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

// ─── Disputes Section for Seller ──────────────────────────────────────────────
function SellerDisputesSection({ 
  onCountUpdate, 
  onPreviewImage 
}: { 
  onCountUpdate?: (count: number) => void;
  onPreviewImage?: (url: string, title: string) => void;
}) {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_SELLER' | 'RETURN_RECEIVED' | 'RESOLVED' | 'REJECTED'>('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [returnReceivedCount, setReturnReceivedCount] = useState(0);
  const pageSize = 10;

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; item: any | null; note: string; submitting: boolean }>({
    isOpen: false, item: null, note: '', submitting: false
  });

  const [previewImageModal, setPreviewImageModal] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false, url: '', title: ''
  });
  const [localZoom, setLocalZoom] = useState<number>(1);

  const handleOpenPreview = (url: string, title: string) => {
    if (onPreviewImage) {
      onPreviewImage(url, title);
    } else {
      setLocalZoom(1);
      setPreviewImageModal({ isOpen: true, url, title });
    }
  };

  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDisputes = useCallback(async (p = 1, st = statusFilter) => {
    setLoading(true);
    try {
      const res = await api.get(`/seller/disputes?page=${p}&pageSize=${pageSize}&status=${st}`);
      setDisputes(res.data.data || []);
      setTotal(res.data.total || 0);
      setPendingCount(res.data.pendingCount || 0);
      setReturnReceivedCount(res.data.returnReceivedCount || 0);
      setPage(p);
      if (onCountUpdate) onCountUpdate(res.data.pendingCount || 0);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, pageSize, onCountUpdate]);

  useEffect(() => {
    fetchDisputes(1, statusFilter);
  }, [statusFilter]);

  const handleConfirmReturn = async () => {
    if (!confirmModal.item) return;
    setConfirmModal(m => ({ ...m, submitting: true }));
    try {
      const res = await api.put(`/seller/disputes/${confirmModal.item.orderDisputeId}/confirm-return`, {
        note: confirmModal.note.trim() || undefined
      });
      setAlert({ type: 'success', message: res.data.message || 'Đã xác nhận nhận hàng hoàn hợp lệ!' });
      setConfirmModal({ isOpen: false, item: null, note: '', submitting: false });
      fetchDisputes(page, statusFilter);
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.response?.data?.message || 'Có lỗi xảy ra khi xác nhận.' });
      setConfirmModal(m => ({ ...m, submitting: false }));
    }
  };

  const statusConfigMap: Record<string, { label: string; color: string; border: string }> = {
    PENDING_SELLER: { label: 'Chờ xưởng nhận hàng hoàn & kiểm tra', color: 'bg-amber-100 text-amber-800', border: 'border-amber-300' },
    OPEN: { label: 'Chờ xưởng nhận hàng hoàn & kiểm tra', color: 'bg-amber-100 text-amber-800', border: 'border-amber-300' },
    RETURN_RECEIVED: { label: 'Đã nhận hàng - Chờ Admin hoàn tiền ví', color: 'bg-blue-100 text-blue-800', border: 'border-blue-300' },
    RESOLVED: { label: 'Admin đã hoàn tiền cho khách (Hoàn tất)', color: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-300' },
    REJECTED: { label: 'Khiếu nại bị từ chối / hủy', color: 'bg-rose-100 text-rose-800', border: 'border-rose-300' }
  };

  return (
    <div className="space-y-6">
      {/* Alert message */}
      {alert && (
        <div className={`p-4 rounded-xl flex items-center justify-between ${alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
            <span className="text-sm font-semibold">{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-xs font-bold px-2 py-1 hover:bg-black/5 rounded">✕</button>
        </div>
      )}

      {/* Header & Flow info banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-amber-600" />
              Khiếu Nại &amp; Nhận Hàng Hoàn Trả
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Quy trình hoàn trả an toàn: Khách gửi khiếu nại &rarr; <strong>Xưởng nhận &amp; xác nhận hàng hoàn tốt</strong> &rarr; <strong>Admin hoàn tiền vào ví người dùng</strong>.
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="px-4 py-2.5 bg-amber-500 text-white rounded-xl shadow-sm text-sm font-bold flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
              <span>Có {pendingCount} yêu cầu đang chờ bạn xác nhận!</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto">
        {[
          { key: 'ALL', label: 'Tất cả' },
          { key: 'PENDING_SELLER', label: 'Chờ xưởng nhận hàng', count: pendingCount },
          { key: 'RETURN_RECEIVED', label: 'Đã nhận - Chờ Admin hoàn tiền', count: returnReceivedCount },
          { key: 'RESOLVED', label: 'Đã hoàn tiền (Hoàn tất)' },
          { key: 'REJECTED', label: 'Đã từ chối' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setStatusFilter(t.key as any); }}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              statusFilter === t.key
                ? 'bg-white text-gray-900 shadow-sm font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>{t.label}</span>
            {t.count !== undefined && t.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${statusFilter === t.key ? 'bg-amber-100 text-amber-800' : 'bg-amber-200 text-amber-900'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : disputes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <p className="text-gray-600 font-semibold text-base">Không có yêu cầu khiếu nại nào trong mục này.</p>
          <p className="text-gray-400 text-xs mt-1">Khi khách hàng gửi yêu cầu đổi trả, thông tin và email sẽ lập tức xuất hiện tại đây.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((d: any) => {
            let images: string[] = [];
            try {
              if (d.evidenceImages) images = JSON.parse(d.evidenceImages);
            } catch {}

            const statusObj = statusConfigMap[d.status] || { label: d.status, color: 'bg-gray-100 text-gray-700', border: 'border-gray-200' };
            const isPendingConfirm = d.status === 'PENDING_SELLER' || d.status === 'OPEN';

            return (
              <div key={d.orderDisputeId} className={`rounded-2xl border ${isPendingConfirm ? 'border-amber-300 shadow-sm bg-amber-50/20' : 'border-gray-200 bg-white'} p-6 transition-all`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-base font-bold text-gray-900">Đơn hàng #{d.orderCode}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusObj.color}`}>
                        {statusObj.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Khách gửi khiếu nại lúc: {new Date(d.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-gray-400">Giá trị đơn / Số tiền hoàn</p>
                    <p className="text-lg font-black text-emerald-600">{money(d.orderAmount)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
                  {/* Customer Info */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      Thông tin khách hàng
                    </h4>
                    <p className="text-sm font-semibold text-gray-900">{d.customerName}</p>
                    <p className="text-xs text-gray-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <a href={`tel:${d.customerPhone || d.recipientPhone}`} className="text-emerald-600 font-semibold hover:underline">
                        {d.customerPhone || d.recipientPhone || 'Chưa có SĐT'}
                      </a>
                    </p>
                    <p className="text-xs text-gray-500 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <span>{d.address || 'Địa chỉ đơn hàng'}</span>
                    </p>
                  </div>

                  {/* Reason & Evidence */}
                  <div className="space-y-2 md:col-span-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                      Lý do khiếu nại &amp; Bằng chứng
                    </h4>
                    <div className="bg-white border border-gray-100 rounded-xl p-3 text-sm text-gray-800 shadow-2xs">
                      <p className="italic font-medium text-gray-700">"{d.reason}"</p>
                    </div>

                    {images.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs text-gray-500 font-medium mb-1.5">Ảnh bằng chứng khách gửi ({images.length} ảnh):</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {images.map((img: string, idx: number) => {
                            const fullUrl = getImageUrl(img);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleOpenPreview(fullUrl, `Bằng chứng khiếu nại #${d.orderCode} (Ảnh ${idx + 1}/${images.length})`)}
                                className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 hover:border-amber-500 shadow-xs transition-all relative group bg-gray-50 cursor-pointer cursor-zoom-in"
                                title="Nhấn để phóng to ảnh bằng chứng"
                              >
                                <img src={fullUrl} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-4 h-4 text-white" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* History / Notes */}
                {(d.sellerNote || d.adminNote || d.returnReceivedAt) && (
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {d.returnReceivedAt && (
                      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-blue-900">
                        <p className="font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                          Xưởng đã xác nhận nhận hàng:
                        </p>
                        <p className="text-blue-800 mt-0.5">{new Date(d.returnReceivedAt).toLocaleString('vi-VN')}</p>
                        {d.sellerNote && <p className="italic mt-1 text-blue-950 font-medium">Ghi chú: {d.sellerNote}</p>}
                      </div>
                    )}
                    {d.adminNote && (
                      <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 text-emerald-900">
                        <p className="font-bold flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                          Phản hồi của Admin:
                        </p>
                        <p className="italic mt-0.5 text-emerald-950 font-medium">{d.adminNote}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action button */}
                {isPendingConfirm && (
                  <div className="mt-5 pt-4 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/70 -mx-6 -mb-6 p-4 rounded-b-2xl">
                    <div className="text-xs text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Hãy đảm bảo bạn đã nhận được kiện hàng hoàn trả từ khách hàng và sản phẩm không có vấn đề trước khi xác nhận.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmModal({ isOpen: true, item: d, note: '', submitting: false })}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                    >
                      <Package className="w-4 h-4" />
                      <span>Xác nhận đã nhận hàng hoàn</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex justify-center items-center gap-3 pt-4">
          <button
            disabled={page <= 1}
            onClick={() => fetchDisputes(page - 1)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            Trước
          </button>
          <span className="text-xs text-gray-500 font-medium">{page} / {Math.ceil(total / pageSize)}</span>
          <button
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => fetchDisputes(page + 1)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      )}

      {/* Confirm Return Modal */}
      {confirmModal.isOpen && confirmModal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-[fadeInScale_0.2s_ease]">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Package className="w-5 h-5" />
                Xác Nhận Đã Nhận Hàng Hoàn Hợp Lệ
              </h3>
              <button
                onClick={() => setConfirmModal({ isOpen: false, item: null, note: '', submitting: false })}
                className="text-white/80 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Mã đơn hàng:</span>
                  <span className="font-mono font-bold text-gray-900">#{confirmModal.item.orderCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Khách hàng:</span>
                  <span className="font-semibold text-gray-900">{confirmModal.item.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Số tiền hoàn cho khách:</span>
                  <span className="font-bold text-emerald-600">{money(confirmModal.item.orderAmount)}</span>
                </div>
              </div>

              {/* Customer Complaint Reason & Evidence in Confirm Modal */}
              {(() => {
                let cImgs: string[] = [];
                try {
                  if (confirmModal.item.evidenceImages) cImgs = JSON.parse(confirmModal.item.evidenceImages);
                } catch {}
                return (
                  <div className="space-y-2 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/80">
                    <p className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                      Lý do khiếu nại của khách:
                    </p>
                    <p className="text-xs font-medium text-gray-800 italic">"{confirmModal.item.reason}"</p>
                    {cImgs.length > 0 && (
                      <div className="pt-1.5">
                        <p className="text-[11px] text-gray-500 font-semibold mb-1">Ảnh bằng chứng khách gửi ({cImgs.length} ảnh) - Nhấn để xem:</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {cImgs.map((img: string, idx: number) => {
                            const fullUrl = img.startsWith('http') ? img : `https://furnimatch-2.onrender.com${img.startsWith('/') ? '' : '/'}${img}`;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleOpenPreview(fullUrl, `Bằng chứng khiếu nại #${confirmModal.item.orderCode} (Ảnh ${idx + 1}/${cImgs.length})`)}
                                className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 hover:border-amber-500 shadow-2xs transition-all relative group bg-white cursor-pointer cursor-zoom-in"
                                title="Nhấn để phóng to ảnh"
                              >
                                <img src={fullUrl} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-1">
                <p className="font-bold flex items-center gap-1 text-blue-800">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Quy trình sau khi xác nhận:
                </p>
                <p>
                  1. Hệ thống sẽ ghi nhận kiện hàng hoàn trả đã được giao lại xưởng an toàn và không có lỗi phát sinh.
                </p>
                <p>
                  2. Yêu cầu sẽ tự động được gửi thông báo đến <strong>Admin</strong> để Admin hoàn tất lệnh <strong>chuyển tiền hoàn vào ví của khách hàng</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Ghi chú kiểm tra hàng hoàn (tùy chọn)
                </label>
                <textarea
                  rows={3}
                  value={confirmModal.note}
                  onChange={e => setConfirmModal(m => ({ ...m, note: e.target.value }))}
                  placeholder="Ví dụ: Đã nhận đầy đủ sản phẩm và phụ kiện, tình trạng tốt, không có vấn đề..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal({ isOpen: false, item: null, note: '', submitting: false })}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={confirmModal.submitting}
                  onClick={handleConfirmReturn}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {confirmModal.submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Xác nhận &amp; Báo Admin</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fallback Image Preview Modal */}
      {previewImageModal.isOpen && (
        <div 
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => { setPreviewImageModal({ isOpen: false, url: '', title: '' }); setLocalZoom(1); }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <h4 className="font-bold text-sm text-gray-900 truncate mr-4">{previewImageModal.title}</h4>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-2xs">
                  <button
                    type="button"
                    title="Thu nhỏ"
                    onClick={() => setLocalZoom(z => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                    className="p-1 rounded hover:bg-gray-100 text-gray-600 cursor-pointer disabled:opacity-40"
                    disabled={localZoom <= 0.5}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold px-1.5 text-gray-700 min-w-[42px] text-center select-none">
                    {Math.round(localZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    title="Phóng to"
                    onClick={() => setLocalZoom(z => Math.min(3, Number((z + 0.25).toFixed(2))))}
                    className="p-1 rounded hover:bg-gray-100 text-gray-600 cursor-pointer disabled:opacity-40"
                    disabled={localZoom >= 3}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  {localZoom !== 1 && (
                    <button
                      type="button"
                      title="Đặt lại kích thước (100%)"
                      onClick={() => setLocalZoom(1)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-600 cursor-pointer border-l border-gray-200 ml-0.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => { setPreviewImageModal({ isOpen: false, url: '', title: '' }); setLocalZoom(1); }}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 bg-gray-950/95 flex-1 min-h-[300px] overflow-auto flex items-center justify-center select-none">
              <img 
                src={previewImageModal.url} 
                alt="Evidence" 
                style={{ 
                  transform: `scale(${localZoom})`, 
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out' 
                }}
                className={`max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl transition-transform ${localZoom > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
                onClick={() => setLocalZoom(z => z === 1 ? 1.75 : 1)}
                title="Nhấp vào ảnh để phóng to / thu nhỏ nhanh"
              />
            </div>
            <div className="p-3 border-t border-gray-100 flex justify-between items-center bg-gray-50 text-xs text-gray-500">
              <span className="hidden sm:inline">💡 Nhấp vào ảnh hoặc dùng thanh công cụ để zoom chi tiết</span>
              <div className="flex items-center gap-3 ml-auto">
                <a href={previewImageModal.url} target="_blank" rel="noreferrer" className="font-semibold text-emerald-600 hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở ảnh gốc trong tab mới</span>
                </a>
                <button
                  onClick={() => { setPreviewImageModal({ isOpen: false, url: '', title: '' }); setLocalZoom(1); }}
                  className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg cursor-pointer"
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
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<'ORDERS' | 'QUOTES' | 'DISPUTES' | 'REVENUE' | 'WALLET'>('ORDERS');
  const [orders, setOrders] = useState<any[]>([]);
  const [orderStatusFilter, setOrderStatusFilter] = useState<'ALL' | 'INCOMPLETE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [pendingDisputeCount, setPendingDisputeCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // QUOTES (Đặt hàng theo yêu cầu) State
  const [quotesData, setQuotesData] = useState<{
    isCustomSizeSupported: boolean;
    availableRequests: any[];
    myClaimedRequests: any[];
  }>({
    isCustomSizeSupported: true,
    availableRequests: [],
    myClaimedRequests: []
  });
  const [quoteSubTab, setQuoteSubTab] = useState<'AVAILABLE' | 'CLAIMED'>('AVAILABLE');
  const [quotingModal, setQuotingModal] = useState<{
    isOpen: boolean;
    request: any | null;
    price: string;
    productionDays: string;
    note: string;
    submitting: boolean;
    error: string;
  }>({
    isOpen: false,
    request: null,
    price: '',
    productionDays: '7',
    note: '',
    submitting: false,
    error: ''
  });
  const [quoteToast, setQuoteToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Root image preview modal with zoom
  const [previewImageModal, setPreviewImageModal] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });
  const [previewZoom, setPreviewZoom] = useState<number>(1);

  const handlePreviewImage = (url: string, title: string) => {
    setPreviewZoom(1);
    setPreviewImageModal({ isOpen: true, url, title });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewImageModal.isOpen) {
        setPreviewImageModal({ isOpen: false, url: '', title: '' });
        setPreviewZoom(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImageModal.isOpen]);

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && ['ORDERS', 'QUOTES', 'DISPUTES', 'REVENUE', 'WALLET'].includes(urlTab)) {
      setTab(urlTab as any);
    }
  }, [searchParams]);

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

  const loadDisputeBadge = useCallback(async () => {
    try {
      const res = await api.get('/seller/disputes?pageSize=1');
      if (res.data?.pendingCount !== undefined) {
        setPendingDisputeCount(res.data.pendingCount);
      }
    } catch {}
  }, []);

  const loadQuotes = useCallback(async () => {
    try {
      const res = await api.get('/quotationrequests');
      if (res.data) {
        if (Array.isArray(res.data)) {
          setQuotesData({
            isCustomSizeSupported: true,
            availableRequests: res.data.filter((r: any) => r.status === 'OPEN'),
            myClaimedRequests: res.data.filter((r: any) => r.status !== 'OPEN')
          });
        } else {
          setQuotesData({
            isCustomSizeSupported: res.data.isCustomSizeSupported ?? true,
            availableRequests: res.data.availableRequests || [],
            myClaimedRequests: res.data.myClaimedRequests || []
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'ORDERS') {
        const res = await api.get('/orders/seller');
        setOrders(res.data);
      } else if (tab === 'QUOTES') {
        await loadQuotes();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputeBadge();
    loadQuotes();
  }, [loadDisputeBadge, loadQuotes]);

  useEffect(() => {
    if (tab !== 'REVENUE' && tab !== 'WALLET' && tab !== 'DISPUTES') {
      load();
      setCurrentPage(1);
    }
  }, [tab]);

  const update = async (id: number, status: string) => {
    await api.put(`/orders/${id}/status`, { status });
    load();
  };

  const handleOpenQuoteModal = (req: any) => {
    const defaultPrice = req.budgetMin ? String(req.budgetMin) : '';
    setQuotingModal({
      isOpen: true,
      request: req,
      price: defaultPrice,
      productionDays: '7',
      note: 'Xưởng cam kết sử dụng chất liệu chuẩn chất lượng, bàn giao đúng hạn.',
      submitting: false,
      error: ''
    });
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quotingModal.request) return;

    const priceNum = parseFloat(quotingModal.price.replace(/,/g, ''));
    if (isNaN(priceNum) || priceNum <= 0) {
      setQuotingModal(m => ({ ...m, error: 'Vui lòng nhập báo giá hợp lệ (lớn hơn 0).' }));
      return;
    }
    
    if (quotingModal.request.budgetMin > 0 && quotingModal.request.budgetMax > 0) {
      if (priceNum < quotingModal.request.budgetMin || priceNum > quotingModal.request.budgetMax) {
        setQuotingModal(m => ({ ...m, error: `Giá báo phải nằm trong khoảng ngân sách khách mong đợi: ${money(quotingModal.request.budgetMin)} - ${money(quotingModal.request.budgetMax)}.` }));
        return;
      }
    }

    const daysNum = parseInt(quotingModal.productionDays, 10);
    if (isNaN(daysNum) || daysNum <= 0) {
      setQuotingModal(m => ({ ...m, error: 'Vui lòng nhập số ngày hoàn thiện dự kiến (tối thiểu 1 ngày).' }));
      return;
    }

    setQuotingModal(m => ({ ...m, submitting: true, error: '' }));
    try {
      await api.post('/quotations', {
        quotationRequestId: quotingModal.request.quotationRequestId,
        price: priceNum,
        productionDays: daysNum,
        note: quotingModal.note.trim()
      });

      setQuotingModal({
        isOpen: false,
        request: null,
        price: '',
        productionDays: '7',
        note: '',
        submitting: false,
        error: ''
      });

      setQuoteToast({
        type: 'success',
        message: '🎉 Gửi báo giá thành công! Báo giá và thời gian hoàn thành đã được gửi tới khách hàng. Bạn có thể theo dõi tiến trình trong mục "Yêu cầu xưởng đã báo giá".'
      });
      setTimeout(() => setQuoteToast(null), 7000);

      await loadQuotes();
      setQuoteSubTab('CLAIMED');
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || (typeof err?.response?.data === 'string' ? err.response.data : 'Có lỗi xảy ra khi gửi báo giá.');
      setQuotingModal(m => ({ ...m, submitting: false, error: errMsg }));
    }
  };

  const handleEnableCustomOrder = async () => {
    try {
      try {
        await api.put('/auth/toggle-custom-size', { isCustomSizeSupported: true });
      } catch {
        await api.put('/auth/profile', { isCustomSizeSupported: true });
      }

      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        u.isCustomSizeSupported = true;
        localStorage.setItem('user', JSON.stringify(u));
      }
      setQuotesData(d => ({ ...d, isCustomSizeSupported: true }));
      setQuoteToast({
        type: 'success',
        message: '🎉 Đã kích hoạt tính năng "Nhận Đặt Hàng Theo Yêu Cầu" thành công! Bạn có thể xem các đơn đặt làm của khách hàng ngay bên dưới.'
      });
      setTimeout(() => setQuoteToast(null), 6000);
      await loadQuotes();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Không thể kích hoạt tính năng. Vui lòng kiểm tra lại thông tin hồ sơ.';
      setQuoteToast({ type: 'error', message: msg });
      setTimeout(() => setQuoteToast(null), 6000);
    }
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
    { 
      key: 'QUOTES', 
      label: '🪵 Đặt hàng theo yêu cầu',
      badge: quotesData.availableRequests.length > 0 ? quotesData.availableRequests.length : undefined
    },
    { 
      key: 'DISPUTES', 
      label: '⚠️ Khiếu nại & Hàng hoàn',
      badge: pendingDisputeCount > 0 ? pendingDisputeCount : undefined
    },
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
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 ${tab === t.key ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            <span>{t.label}</span>
            {'badge' in t && t.badge !== undefined && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ===================== DISPUTES TAB ===================== */}
      {tab === 'DISPUTES' && <SellerDisputesSection onCountUpdate={setPendingDisputeCount} onPreviewImage={handlePreviewImage} />}

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
                  <p className="text-emerald-200 text-xs mt-1">Tiền hàng (đã trừ hoàn)</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white shadow-sm">
                  <p className="text-amber-100 text-xs font-medium uppercase tracking-wide mb-1">Hoa Hồng Platform</p>
                  <p className="text-xl font-bold truncate">{money(revSummary?.totalCommission)}</p>
                  <p className="text-amber-200 text-xs mt-1">Tỷ lệ {revSummary?.commissionRate}% (đã trừ hoàn)</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-sm">
                  <p className="text-blue-100 text-xs font-medium uppercase tracking-wide mb-1">Thực Nhận</p>
                  <p className="text-xl font-bold truncate">{money(revSummary?.netRevenue)}</p>
                  <p className="text-blue-200 text-xs mt-1">Sau khi trừ hoa hồng & hoàn</p>
                </div>
                <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-5 text-white shadow-sm">
                  <p className="text-violet-100 text-xs font-medium uppercase tracking-wide mb-1">Đơn Hoàn Tất</p>
                  <p className="text-xl font-bold">{revSummary?.totalPaidOrders ?? 0}</p>
                  <p className="text-violet-200 text-xs mt-1">
                    {revSummary?.totalRefundedOrders > 0 ? `Đã hoàn tiền ${revSummary?.totalRefundedOrders} đơn` : 'Đơn thành công'}
                  </p>
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
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              o.payoutStatus === 'REFUNDED' || o.paymentStatus === 'REFUNDED'
                                ? 'bg-rose-100 text-rose-700'
                                : o.orderStatus === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {o.payoutStatus === 'REFUNDED' || o.paymentStatus === 'REFUNDED'
                                ? 'Đã hoàn tiền'
                                : o.orderStatus === 'COMPLETED'
                                ? 'Hoàn thành'
                                : o.orderStatus === 'CONFIRMED'
                                ? 'Đã xác nhận'
                                : o.orderStatus}
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

                      {/* Dispute Alert Banner if order is in dispute */}
                      {o.dispute && (() => {
                        let dispImgs: string[] = [];
                        try {
                          if (o.dispute.evidenceImages) dispImgs = JSON.parse(o.dispute.evidenceImages);
                        } catch {}
                        return (
                          <div className="bg-amber-50/90 border-b border-amber-200 px-6 py-3 space-y-2 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-amber-900">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>
                                  <strong>Khiếu nại đổi trả:</strong>{' '}
                                  {o.dispute.status === 'PENDING_SELLER' || o.dispute.status === 'OPEN'
                                    ? 'Khách hàng đã gửi khiếu nại (Chờ xưởng nhận & xác nhận hàng hoàn).'
                                    : o.dispute.status === 'RETURN_RECEIVED'
                                    ? 'Xưởng đã xác nhận nhận hàng hoàn hợp lệ (Đang chờ Admin hoàn tiền ví).'
                                    : o.dispute.status === 'RESOLVED'
                                    ? 'Admin đã duyệt hoàn tiền vào ví cho khách hàng.'
                                    : 'Khiếu nại đơn hàng đã bị từ chối / hủy.'}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setTab('DISPUTES')}
                                className="text-amber-800 hover:text-amber-950 font-bold underline flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <span>Xem chi tiết khiếu nại &rarr;</span>
                              </button>
                            </div>

                            {o.dispute.reason && (
                              <p className="text-gray-700 italic bg-white/70 px-3 py-1.5 rounded-lg border border-amber-200/60">
                                <span className="font-semibold text-gray-800 not-italic">Lý do khách gửi: </span>"{o.dispute.reason}"
                              </p>
                            )}

                            {dispImgs.length > 0 && (
                              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                <span className="text-[11px] font-semibold text-gray-600">Ảnh bằng chứng ({dispImgs.length} ảnh):</span>
                                {dispImgs.map((img: string, idx: number) => {
                                  const fullUrl = img.startsWith('http') ? img : `https://furnimatch-2.onrender.com${img.startsWith('/') ? '' : '/'}${img}`;
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => handlePreviewImage(fullUrl, `Bằng chứng khiếu nại #${o.orderCode} (Ảnh ${idx + 1}/${dispImgs.length})`)}
                                      className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 hover:border-amber-500 shadow-2xs transition-all relative group bg-white cursor-pointer cursor-zoom-in"
                                      title="Nhấn để phóng to ảnh bằng chứng"
                                    >
                                      <img src={fullUrl} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Eye className="w-3.5 h-3.5 text-white" />
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })()}

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
                                  <div className="h-16 w-16 shrink-0 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                                    {imageUrl ? (
                                      <img 
                                        src={imageUrl.startsWith('http') ? imageUrl : `https://furnimatch-2.onrender.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`} 
                                        className="h-full w-full object-cover" 
                                        alt={name || 'Sản phẩm'}
                                        onError={(e) => {
                                          e.currentTarget.onerror = null;
                                          e.currentTarget.src = 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=300';
                                        }}
                                      />
                                    ) : (
                                      <Package className="h-8 w-8 text-gray-300" />
                                    )}
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
            <div className="space-y-6">
              {/* Toast message */}
              {quoteToast && (
                <div className={`p-4 rounded-2xl flex items-center justify-between text-sm shadow-sm ${
                  quoteToast.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{quoteToast.type === 'success' ? '🎉' : '⚠️'}</span>
                    <span className="font-semibold">{quoteToast.message}</span>
                  </div>
                  <button onClick={() => setQuoteToast(null)} className="text-gray-400 hover:text-gray-700 font-bold p-1">✕</button>
                </div>
              )}

              {!quotesData.isCustomSizeSupported ? (
                <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-8 sm:p-12 text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl mb-4 shadow-xs">
                    🪵
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Xưởng của bạn chưa bật tính năng "Nhận Đặt Hàng Theo Yêu Cầu"
                  </h3>
                  <p className="text-sm text-gray-600 max-w-xl mx-auto mb-6 leading-relaxed">
                    Khách hàng trên FurniMatch thường xuyên tìm kiếm các xưởng mộc uy tín để gia công bàn ghế, tủ kệ theo mẫu và kích thước riêng biệt. Bật tính năng ngay để nhận thông báo đơn hàng độc quyền!
                  </p>
                  <button
                    type="button"
                    onClick={handleEnableCustomOrder}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-700/25 transition-all hover:scale-105 cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>Kích Hoạt Nhận Đặt Hàng Ngay</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Sub-tabs */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setQuoteSubTab('AVAILABLE')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          quoteSubTab === 'AVAILABLE'
                            ? 'bg-white text-emerald-800 shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <span>⚡ Yêu Cầu Mới Chờ Báo Giá</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          quoteSubTab === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {quotesData.availableRequests.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setQuoteSubTab('CLAIMED')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                          quoteSubTab === 'CLAIMED'
                            ? 'bg-white text-emerald-800 shadow-xs'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <span>📋 Yêu Cầu Xưởng Đã Báo Giá</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          quoteSubTab === 'CLAIMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {quotesData.myClaimedRequests.length}
                        </span>
                      </button>
                    </div>

                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Hệ thống mở cho tất cả xưởng mộc cùng tiếp nhận & báo giá</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-center gap-2.5">
                    <span className="text-base">💡</span>
                    <span>
                      <strong>Cơ chế báo giá:</strong> Tất cả các xưởng đều có thể gửi báo giá cạnh tranh. Khi khách hàng bấm chọn xưởng của bạn để gia công, đơn hàng sẽ chính thức được chốt và ẩn khỏi các xưởng khác!
                    </span>
                  </div>

                  {/* Subtab AVAILABLE */}
                  {quoteSubTab === 'AVAILABLE' && (
                    <>
                      {quotesData.availableRequests.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
                          <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-2xl mb-3">
                            📋
                          </div>
                          <p className="font-bold text-gray-800">Hiện chưa có yêu cầu mới đang mở</p>
                          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                            Khi có khách hàng gửi yêu cầu đặt làm nội thất theo ảnh mẫu riêng, hệ thống sẽ lập tức gửi thông báo và email đến xưởng của bạn.
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-5">
                          {quotesData.availableRequests.map((req: any) => {
                            const reqImage = req.imageUrl || req.pattern;
                            return (
                              <div 
                                key={req.quotationRequestId} 
                                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                              >
                                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 pb-4 border-b border-gray-100">
                                  <div className="flex items-start gap-4">
                                    {reqImage && (
                                      <div 
                                        onClick={() => handlePreviewImage(reqImage, req.productType || 'Ảnh mẫu khách gửi')}
                                        className="w-20 h-20 rounded-xl overflow-hidden border border-emerald-200 shrink-0 bg-gray-50 cursor-pointer group relative shadow-xs hover:border-emerald-500"
                                        title="Nhấn để xem ảnh phóng to"
                                      >
                                        <img 
                                          src={reqImage} 
                                          alt={req.productType || 'Ảnh mẫu'} 
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                          🔍 Xem
                                        </div>
                                      </div>
                                    )}
                                    <div>
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                          {req.category?.name || 'Nội thất đặt đóng'}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                          {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                                        </span>
                                      </div>
                                      <h3 className="text-xl font-bold text-gray-900">{req.productType}</h3>
                                      {reqImage && (
                                        <p className="text-xs text-emerald-600 font-medium mt-0.5">
                                          📸 Khách đã đính kèm ảnh mẫu cần làm
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 self-start">
                                    <Clock className="w-3.5 h-3.5" />
                                    Đang nhận báo giá
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-gray-100 text-sm">
                                  <div>
                                    <p className="text-xs text-gray-500">Kích thước (D × R × C)</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{req.length} × {req.width} × {req.height} cm</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Số lượng</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{req.quantity} cái/bộ</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Ngân sách dự kiến</p>
                                    <p className="font-bold text-emerald-700 mt-0.5">
                                      {req.budgetMin || req.budgetMax ? `${money(req.budgetMin)} – ${money(req.budgetMax)}` : 'Chưa định'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Chất liệu / Tư vấn</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{req.material || 'Xưởng tư vấn'}</p>
                                  </div>
                                </div>

                                {req.description && (
                                  <div className="py-3 text-xs sm:text-sm text-gray-600 bg-gray-50/70 p-3.5 rounded-xl border border-gray-100 my-4">
                                    <span className="font-bold text-gray-800">Yêu cầu từ khách: </span>
                                    <span>{req.description}</span>
                                  </div>
                                )}

                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
                                  <div className="text-xs text-gray-500 flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span>Khách hàng: <strong className="text-gray-700">{req.customer?.fullName || 'Khách hàng'}</strong></span>
                                    {req.customer?.province && (
                                      <span className="text-gray-400">· 📍 {req.customer.district ? `${req.customer.district}, ` : ''}{req.customer.province}</span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenQuoteModal(req)}
                                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-700/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                  >
                                    <span>🪵 Báo Giá Yêu Cầu Này</span>
                                    <span>→</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {/* Subtab CLAIMED */}
                  {quoteSubTab === 'CLAIMED' && (
                    <>
                      {quotesData.myClaimedRequests.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center">
                          <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-2xl mb-3">
                            🛠️
                          </div>
                          <p className="font-bold text-gray-800">Xưởng chưa gửi báo giá cho yêu cầu nào</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Hãy chuyển sang tab "Yêu cầu mới chờ báo giá" để chọn đơn hàng phù hợp và gửi báo giá cho khách!
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-5">
                          {quotesData.myClaimedRequests.map((req: any) => {
                            const myQuote = req.quotations?.[0];
                            const reqImage = req.imageUrl || req.pattern;
                            const isChosen = req.status === 'SELLER_SELECTED' || myQuote?.status === 'ACCEPTED';
                            const isWaitingPayment = req.status === 'WAITING_PAYMENT' && myQuote?.status === 'WAITING_PAYMENT';
                            const isRejected = myQuote?.status === 'REJECTED';

                            return (
                              <div 
                                key={req.quotationRequestId} 
                                className={`rounded-2xl border p-6 shadow-sm relative overflow-hidden ${
                                  isChosen ? 'border-emerald-400 bg-emerald-50/20 ring-2 ring-emerald-200' : isWaitingPayment ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-200' : 'border-gray-200 bg-white'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 pb-4 border-b border-gray-100">
                                  <div className="flex items-start gap-4">
                                    {reqImage && (
                                      <div 
                                        onClick={() => handlePreviewImage(reqImage, req.productType || 'Ảnh mẫu khách gửi')}
                                        className="w-20 h-20 rounded-xl overflow-hidden border border-emerald-200 shrink-0 bg-gray-50 cursor-pointer group relative shadow-xs hover:border-emerald-500"
                                        title="Nhấn để xem ảnh phóng to"
                                      >
                                        <img 
                                          src={reqImage} 
                                          alt={req.productType || 'Ảnh mẫu'} 
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                        />
                                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                          🔍 Xem
                                        </div>
                                      </div>
                                    )}
                                    <div>
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                          {req.category?.name || 'Nội thất đặt đóng'}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                          Ngày gửi: {new Date(req.createdAt).toLocaleDateString('vi-VN')}
                                        </span>
                                      </div>
                                      <h3 className="text-xl font-bold text-gray-900">{req.productType}</h3>
                                    </div>
                                  </div>

                                  {isChosen ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 self-start animate-bounce">
                                      <CheckCircle className="w-4 h-4" />
                                      🎉 Khách Hàng Đã Chọn Xưởng Bạn!
                                    </span>
                                  ) : isWaitingPayment ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500 text-white shadow-sm shadow-amber-500/20 self-start">
                                      <Clock className="w-4 h-4" />
                                      ⏳ Khách Đã Chọn - Đang Chờ Thanh Toán!
                                    </span>
                                  ) : isRejected ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 self-start">
                                      Khách đã chọn xưởng khác
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 self-start">
                                      <Clock className="w-3.5 h-3.5" />
                                      Đã gửi báo giá (Chờ khách chọn)
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-gray-100 text-sm">
                                  <div>
                                    <p className="text-xs text-gray-500">Kích thước</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{req.length} × {req.width} × {req.height} cm</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Số lượng</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{req.quantity} cái/bộ</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Ghi chú của khách</p>
                                    <p className="text-xs text-gray-700 mt-0.5 truncate">{req.description || 'Không có'}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Trạng thái yêu cầu</p>
                                    <p className="font-bold text-emerald-700 mt-0.5">
                                      {isChosen ? 'Đã chốt gia công' : isWaitingPayment ? 'Chờ thanh toán' : isRejected ? 'Đã đóng' : 'Đang mở'}
                                    </p>
                                  </div>
                                </div>

                                {/* Thông tin báo giá xưởng đã gửi */}
                                {myQuote && (
                                  <div className="my-4 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
                                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-950 mb-2 flex items-center gap-1.5">
                                      <span>💰</span>
                                      <span>Báo Giá Xưởng Đã Gửi Khách Hàng:</span>
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                      <div>
                                        <span className="text-xs text-emerald-800">Giá hoàn thiện:</span>
                                        <p className="text-lg font-extrabold text-emerald-700">{money(myQuote.price)}</p>
                                      </div>
                                      <div>
                                        <span className="text-xs text-emerald-800">Thời gian hoàn thiện dự kiến:</span>
                                        <p className="text-base font-bold text-emerald-900">{myQuote.productionDays} ngày</p>
                                      </div>
                                      <div className="sm:col-span-1">
                                        <span className="text-xs text-emerald-800">Cam kết / Ghi chú:</span>
                                        <p className="text-xs text-gray-700 mt-0.5 italic">{myQuote.note || 'Không có ghi chú'}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Thông tin liên hệ khách hàng */}
                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-xs sm:text-sm">
                                  <p className="font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                                    <Phone className="w-4 h-4 text-emerald-600" />
                                    {isChosen ? 'Thông tin liên hệ khách hàng để tiến hành sản xuất:' : 'Thông tin khách hàng (Ẩn thông tin liên hệ cho đến khi khách chọn xưởng):'}
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-gray-700">
                                    <div>
                                      <span className="text-gray-500">Khách hàng: </span>
                                      <strong className="text-gray-900">{req.customer?.fullName}</strong>
                                    </div>
                                    {isChosen && (
                                      <>
                                        <div>
                                          <span className="text-gray-500">Hotline: </span>
                                          <strong className="text-emerald-700 font-mono">{req.customer?.phone || 'Chưa cung cấp'}</strong>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Email: </span>
                                          <span className="text-gray-900">{req.customer?.email}</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  <div className="mt-2 text-gray-600">
                                    <span className="text-gray-500">Địa chỉ giao hàng: </span>
                                    <strong>
                                      {[req.customer?.addressDetail, req.customer?.ward, req.customer?.district, req.customer?.province].filter(Boolean).join(', ') || 'Chưa cập nhật'}
                                    </strong>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Modal Báo Giá */}
              {quotingModal.isOpen && quotingModal.request && (
                <div 
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
                  onClick={() => setQuotingModal(m => ({ ...m, isOpen: false }))}
                >
                  <div 
                    className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                          Gửi Báo Giá Cho Khách
                        </span>
                        <h3 className="text-lg font-bold text-gray-900 mt-1">Báo Giá & Thời Gian Hoàn Thành</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuotingModal(m => ({ ...m, isOpen: false }))}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 bg-white hover:bg-gray-100 text-lg font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleSubmitQuote} className="p-6 space-y-4">
                      {quotingModal.error && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                          ⚠️ {quotingModal.error}
                        </div>
                      )}

                      {/* Tóm tắt sản phẩm kèm ảnh mẫu */}
                      <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 text-xs space-y-2">
                        <div className="flex gap-3 items-center">
                          {(quotingModal.request.imageUrl || quotingModal.request.pattern) && (
                            <img 
                              src={quotingModal.request.imageUrl || quotingModal.request.pattern} 
                              alt="Ảnh mẫu" 
                              className="w-16 h-16 rounded-lg object-cover border border-emerald-200 shrink-0 bg-white"
                            />
                          )}
                          <div>
                            <p className="font-bold text-sm text-gray-900">{quotingModal.request.productType}</p>
                            <p className="text-gray-600 mt-0.5">
                              Kích thước: <strong>{quotingModal.request.length} × {quotingModal.request.width} × {quotingModal.request.height} cm</strong>
                            </p>
                            <p className="text-gray-600">
                              Số lượng: <strong>{quotingModal.request.quantity} cái/bộ</strong>
                            </p>
                          </div>
                        </div>

                        {quotingModal.request.budgetMin && (
                          <p className="text-emerald-700 font-semibold pt-1 border-t border-gray-200">
                            Ngân sách khách mong đợi: {money(quotingModal.request.budgetMin)} - {money(quotingModal.request.budgetMax)}
                          </p>
                        )}
                        {quotingModal.request.description && (
                          <p className="text-gray-600 italic">
                            "{quotingModal.request.description}"
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                          Báo giá trọn gói (VNĐ) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="10000"
                          step="10000"
                          required
                          placeholder="Ví dụ: 3500000"
                          className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-emerald-700 text-base"
                          value={quotingModal.price}
                          onChange={e => setQuotingModal(m => ({ ...m, price: e.target.value }))}
                        />
                        <p className="text-[11px] text-gray-400 mt-1">
                          Giá hoàn thiện đã bao gồm vật liệu, gia công theo mẫu yêu cầu của khách.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                          Thời gian hoàn thiện dự kiến (Số ngày) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="180"
                          required
                          placeholder="7"
                          className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-gray-900"
                          value={quotingModal.productionDays}
                          onChange={e => setQuotingModal(m => ({ ...m, productionDays: e.target.value }))}
                        />
                        <p className="text-[11px] text-gray-400 mt-1">
                          Số ngày xưởng cần để hoàn thành sản phẩm và sẵn sàng bàn giao cho khách.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                          Ghi chú / Cam kết chất lượng từ xưởng
                        </label>
                        <textarea
                          rows={2}
                          readOnly
                          className="w-full px-4 py-3 text-sm border border-emerald-500 bg-emerald-50 text-emerald-800 font-medium rounded-xl focus:outline-none opacity-90 cursor-not-allowed"
                          value={quotingModal.note}
                        />
                      </div>

                      <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-900 leading-relaxed">
                        💡 <strong>Lưu ý:</strong> Báo giá và thời gian hoàn thiện sẽ được gửi ngay đến khách hàng. Khách hàng sẽ xem xét và chọn xưởng phù hợp nhất để tiến hành gia công.
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setQuotingModal(m => ({ ...m, isOpen: false }))}
                          className="w-1/3 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors text-sm cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={quotingModal.submitting}
                          className="w-2/3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-700/20 active:scale-[0.99] transition-all text-sm disabled:bg-gray-400 cursor-pointer"
                        >
                          {quotingModal.submitting ? 'Đang gửi báo giá...' : '🚀 Gửi Báo Giá Cho Khách'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Global Image Preview Modal with Zoom */}
      {previewImageModal.isOpen && (
        <div 
          className="fixed inset-0 z-[99] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => { setPreviewImageModal({ isOpen: false, url: '', title: '' }); setPreviewZoom(1); }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <h4 className="font-bold text-sm text-gray-900 truncate mr-4">{previewImageModal.title}</h4>
              <div className="flex items-center gap-2 shrink-0">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-2xs">
                  <button
                    type="button"
                    title="Thu nhỏ"
                    onClick={() => setPreviewZoom(z => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                    className="p-1 rounded hover:bg-gray-100 text-gray-600 cursor-pointer disabled:opacity-40"
                    disabled={previewZoom <= 0.5}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold px-1.5 text-gray-700 min-w-[42px] text-center select-none">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    title="Phóng to"
                    onClick={() => setPreviewZoom(z => Math.min(3, Number((z + 0.25).toFixed(2))))}
                    className="p-1 rounded hover:bg-gray-100 text-gray-600 cursor-pointer disabled:opacity-40"
                    disabled={previewZoom >= 3}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  {previewZoom !== 1 && (
                    <button
                      type="button"
                      title="Đặt lại kích thước (100%)"
                      onClick={() => setPreviewZoom(1)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-600 cursor-pointer border-l border-gray-200 ml-0.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  title="Đóng (Esc)"
                  onClick={() => { setPreviewImageModal({ isOpen: false, url: '', title: '' }); setPreviewZoom(1); }}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image Body */}
            <div className="p-4 bg-gray-950/95 flex-1 min-h-[300px] overflow-auto flex items-center justify-center select-none">
              <img 
                src={previewImageModal.url} 
                alt="Evidence Preview" 
                style={{ 
                  transform: `scale(${previewZoom})`, 
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out' 
                }}
                className={`max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl transition-transform ${previewZoom > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
                onClick={() => setPreviewZoom(z => z === 1 ? 1.75 : 1)}
                title="Nhấp vào ảnh để phóng to / thu nhỏ nhanh"
              />
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 flex justify-between items-center bg-gray-50 text-xs text-gray-500">
              <span className="hidden sm:inline">💡 Nhấp vào ảnh hoặc dùng thanh công cụ để zoom chi tiết</span>
              <div className="flex items-center gap-3 ml-auto">
                <a 
                  href={previewImageModal.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="font-semibold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở ảnh gốc trong tab mới</span>
                </a>
                <button
                  type="button"
                  onClick={() => { setPreviewImageModal({ isOpen: false, url: '', title: '' }); setPreviewZoom(1); }}
                  className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg cursor-pointer"
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

