import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { getImageUrl } from '../utils/api';
import { getCart, saveCart, updateCartQuantity, removeFromCart, type CartItem } from '../utils/cart';

const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
type Pay = { orderId: number; orderCode: string; qrCodeUrl?: string; deeplink?: string; payUrl?: string; expiredAt: string };

export default function Checkout() {
    const nav = useNavigate();
    const [searchParams] = useSearchParams();
    const quoteId = searchParams.get('quoteId');
    
    const [items, setItems] = useState<CartItem[]>(getCart());
    const [pay, setPay] = useState<Pay | null>(null);
    const [seconds, setSeconds] = useState(0);
    const [error, setError] = useState('');
    const [loadingQuote, setLoadingQuote] = useState(!!quoteId);
    
    const [f, setF] = useState({ recipient: '', phone: '', address: '', note: '' });
    
    const subtotal = useMemo(() => items.reduce((s, x) => s + x.price * x.quantity, 0), [items]);
    const shipping = 0;

    useEffect(() => {
        if (quoteId) return;
        const handleCartChanged = () => setItems(getCart());
        window.addEventListener('cart-changed', handleCartChanged);
        return () => window.removeEventListener('cart-changed', handleCartChanged);
    }, [quoteId]);

    const handleUpdateQty = (item: CartItem, newQty: number) => {
        if (newQty <= 0) {
            handleRemoveItem(item);
            return;
        }
        updateCartQuantity(item.productId, item.variantId, newQty);
        setItems(getCart());
    };

    const handleRemoveItem = (item: CartItem) => {
        removeFromCart(item.productId, item.variantId);
        setItems(getCart());
    };

    const distinctSellerIds = useMemo(() => {
        const ids = items.map(x => x.sellerId).filter((id): id is number => typeof id === 'number');
        return Array.from(new Set(ids));
    }, [items]);
    const hasMultipleSellers = distinctSellerIds.length > 1;

    useEffect(() => {
        if (quoteId) {
            Promise.all([
                api.get('/quotationrequests'),
                api.get('/orders').catch(() => ({ data: [] }))
            ]).then(([reqRes, ordRes]) => {
                const reqs = reqRes.data || [];
                let foundQuote = null;
                let foundReq = null;
                for (const r of reqs) {
                    const q = r.quotations?.find((x: any) => x.quotationId === Number(quoteId));
                    if (q) {
                        foundQuote = q;
                        foundReq = r;
                        break;
                    }
                }
                if (foundQuote && foundReq) {
                    setItems([{
                        productId: 0,
                        name: foundReq.productType,
                        price: foundQuote.price,
                        quantity: 1,
                        sizeLabel: 'Gia công theo yêu cầu',
                        imageUrl: foundReq.imageUrl || foundReq.pattern
                    }]);

                    // Kiểm tra xem có đơn hàng nào PENDING cho báo giá này chưa
                    const orders = ordRes.data;
                    const pendingOrder = orders.find((o: any) => {
                        if (o.paymentStatus !== 'PENDING') return false;
                        if (o.orderCode && o.orderCode.startsWith('QT-')) {
                            try {
                                const parsedItems = JSON.parse(o.itemsJson || '[]');
                                const qId = parsedItems[0]?.QuotationId || parsedItems[0]?.quotationId;
                                if (qId) {
                                    return qId === Number(quoteId);
                                }
                                // Fallback cho các đơn hàng cũ chưa lưu QuotationId
                                return true;
                            } catch { return true; }
                        }
                        return false;
                    });

                    if (pendingOrder) {
                        api.get(`/orders/${pendingOrder.orderId}/sepay`).then(qrRes => {
                            setPay({
                                orderId: pendingOrder.orderId,
                                orderCode: pendingOrder.orderCode,
                                qrCodeUrl: qrRes.data.qrCodeUrl,
                                expiredAt: qrRes.data.expiredAt || pendingOrder.paymentExpiredAt
                            });
                        }).catch(() => { /* Lỗi/hết hạn => kệ, vẫn hiện form checkout */ });
                    }
                } else {
                    setError('Không tìm thấy thông tin báo giá.');
                }
            }).finally(() => setLoadingQuote(false));
        }
    }, [quoteId]);

    useEffect(() => {
        if (!pay) return;
        const update = () => setSeconds(Math.max(0, Math.ceil((new Date(pay.expiredAt).getTime() - Date.now()) / 1000)));
        update();
        const t = setInterval(update, 1000);
        const p = setInterval(async () => {
            try {
                const r = await api.get(`/orders/${pay.orderId}`);
                if (r.data.paymentStatus === 'PAID') {
                    if (!quoteId) saveCart([]);
                    nav('/orders?paid=1');
                }
            } catch { }
        }, 5000);
        return () => { clearInterval(t); clearInterval(p); };
    }, [pay, nav, quoteId]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^0[35789]\d{8}$/.test(f.phone)) {
            setError('Số điện thoại không hợp lệ. Vui lòng nhập 10 số và bắt đầu bằng các đầu số 03, 05, 07, 08, 09.');
            return;
        }
        if (!quoteId && hasMultipleSellers) {
            setError('Giỏ hàng của bạn đang có sản phẩm từ các xưởng sản xuất khác nhau. Vui lòng xóa bớt hoặc thanh toán riêng các sản phẩm từ từng xưởng.');
            return;
        }
        setError('');
        try {
            let r;
            if (quoteId) {
                r = await api.post('/orders/quotation', {
                    quotationId: Number(quoteId),
                    recipientName: f.recipient,
                    phone: f.phone,
                    address: f.address,
                    note: f.note,
                    shippingFee: shipping,
                    paymentMethod: 'SEPAY'
                });
            } else {
                r = await api.post('/orders', {
                    items,
                    recipientName: f.recipient,
                    phone: f.phone,
                    address: f.address,
                    note: f.note,
                    shippingFee: shipping,
                    paymentMethod: 'SEPAY'
                });
                saveCart([]);
            }
            setPay(r.data);
        } catch (e: any) {
            setError(e.response?.data?.message ?? 'Không thể tạo đơn hàng.');
        }
    };

    if (loadingQuote) return <div className="text-center py-20">Đang tải thông tin...</div>;
    
    if (!items.length && !pay) return (
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
            <h1 className="text-2xl font-bold">Giỏ hàng đang trống</h1>
            <Link className="mt-5 inline-block text-emerald-600 font-semibold" to="/products">Quay lại danh mục</Link>
        </div>
    );

    if (pay) {
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        return (
            <div className="max-w-xl mx-auto px-4 py-12">
                <div className="rounded-2xl border bg-white p-7 text-center">
                    <h1 className="text-2xl font-bold text-[#0b6e4f]">Thanh toán qua SePay</h1>
                    <p className="mt-3 font-bold">⏱ Còn lại: {m}:{s}</p>
                    <div className="mt-4 h-2 rounded-full bg-gray-100">
                        <div className="h-full bg-emerald-600" style={{ width: `${Math.min(100, seconds / 18)}%` }} />
                    </div>
                    {pay.qrCodeUrl ? <img src={pay.qrCodeUrl} alt="Mã QR thanh toán SePay" className="mx-auto mt-7 h-60 w-60" /> : <p className="mt-8">Đang tạo mã QR…</p>}
                    <p className="mt-5">Mã đơn: <strong>{pay.orderCode}</strong></p>
                    <p className="mt-2">Số tiền: <strong>{money(subtotal + shipping)}</strong></p>
                    <p className="mt-5 text-sm text-gray-500">Quét QR bằng ứng dụng ngân hàng. Hệ thống sẽ tự xác nhận khi nhận đúng số tiền và mã đơn.</p>
                    <button type="button" onClick={() => api.patch(`/orders/${pay.orderId}/cancel`).finally(() => nav(quoteId ? '/my-requests' : '/orders'))} className="mt-5 text-sm text-rose-600">Huỷ đơn hàng</button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="max-w-6xl mx-auto px-4 py-10">
            <h1 className="text-3xl font-bold">Thanh toán {quoteId ? 'Đơn Gia Công' : ''}</h1>
            {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-rose-700">{error}</p>}
            <div className="mt-7 grid lg:grid-cols-[1fr_380px] gap-7">
                <section className="space-y-6">
                    <div className="rounded-2xl border bg-white p-6">
                        <h2 className="font-bold">Thông tin nhận hàng</h2>
                        <div className="mt-4 grid sm:grid-cols-2 gap-4">
                            <input required placeholder="Họ tên" className="border rounded-lg p-3" value={f.recipient} onChange={e => setF({ ...f, recipient: e.target.value })} />
                            <input required placeholder="Số điện thoại" className="border rounded-lg p-3" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
                        </div>
                        <input required placeholder="Địa chỉ giao hàng" className="mt-4 w-full border rounded-lg p-3" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} />
                        <textarea placeholder="Ghi chú" className="mt-4 w-full border rounded-lg p-3" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-white p-6">
                        <h2 className="font-bold">Phương thức thanh toán</h2>
                        <div className="mt-4 flex gap-3 rounded-lg border border-emerald-600 bg-emerald-50 p-4">
                            <span className="text-xl">▣</span>
                            <span>
                                <strong>SePay QR</strong>
                                <small className="block text-gray-500">Quét mã QR bằng ứng dụng ngân hàng để hoàn tất thanh toán.</small>
                            </span>
                        </div>
                    </div>
                </section>
                <aside className="h-fit rounded-2xl border bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between pb-3 border-b">
                        <h2 className="font-bold text-gray-900 text-lg">Đơn hàng của bạn</h2>
                        <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                            {items.reduce((s, x) => s + x.quantity, 0)} sản phẩm
                        </span>
                    </div>

                    {hasMultipleSellers && !quoteId && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-semibold leading-relaxed">
                            ⚠️ Giỏ hàng đang có sản phẩm từ nhiều xưởng. Vui lòng xóa bớt để đặt hàng cùng 1 xưởng sản xuất.
                        </div>
                    )}

                    <div className="divide-y divide-gray-100 max-h-[380px] overflow-y-auto pr-1">
                        {items.map((x, i) => (
                            <div key={i} className="py-4 text-sm flex gap-3 items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    {x.imageUrl && (
                                        <img 
                                            src={getImageUrl(x.imageUrl)} 
                                            alt={x.name} 
                                            className="w-12 h-12 object-cover rounded-lg border border-gray-100 shrink-0" 
                                        />
                                    )}
                                    <div className="min-w-0">
                                        <p className="font-bold text-gray-900 truncate text-sm">{x.name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{x.sizeLabel}</p>
                                        {x.sellerName && (
                                            <p className="text-[11px] text-emerald-700 font-medium truncate">Xưởng: {x.sellerName}</p>
                                        )}
                                        <p className="text-xs font-semibold text-gray-700 mt-0.5">{money(x.price)}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <strong className="text-emerald-700 font-extrabold text-sm">{money(x.price * x.quantity)}</strong>
                                    
                                    {!quoteId ? (
                                        <div className="flex items-center gap-1.5">
                                            <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden shadow-2xs">
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateQty(x, x.quantity - 1)}
                                                    className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-xs font-bold cursor-pointer"
                                                    title="Giảm số lượng"
                                                >
                                                    −
                                                </button>
                                                <span className="w-7 text-center text-xs font-bold text-gray-900 bg-white">
                                                    {x.quantity}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateQty(x, x.quantity + 1)}
                                                    className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 text-xs font-bold cursor-pointer"
                                                    title="Tăng số lượng"
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(x)}
                                                className="text-gray-400 hover:text-rose-600 p-1 text-xs cursor-pointer transition-colors"
                                                title="Xóa sản phẩm"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-500">Số lượng: 1</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="flex justify-between items-baseline">
                            <span className="text-sm text-gray-600 font-medium">Tổng tiền hàng:</span>
                            <strong className="text-xl font-black text-emerald-600">{money(subtotal + shipping)}</strong>
                        </p>
                        <p className="mt-2 text-xs font-medium text-rose-600 text-center bg-rose-50 p-2 rounded-lg border border-rose-100">
                            Giá này chưa bao gồm chi phí vận chuyển
                        </p>
                    </div>
                    <button 
                        disabled={hasMultipleSellers && !quoteId}
                        className="mt-6 w-full rounded-xl bg-emerald-600 py-3.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-emerald-700/20 active:scale-[0.99] cursor-pointer"
                    >
                        Tạo mã QR SePay
                    </button>
                </aside>
            </div>
        </form>
    );
}
