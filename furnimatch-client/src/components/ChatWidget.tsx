import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MessageCircle, Send, X, Minus, ChevronLeft, Store, 
  ExternalLink, Check, CheckCheck 
} from 'lucide-react';
import { 
  getChatConversations, getChatMessages, sendChatMessage, 
  getChatUnreadCount, getChatUser, getImageUrl 
} from '../utils/api';
import type { 
  ChatProductInfo, ChatUser, ChatMessageItem, 
  ChatConversation, OpenChatDetail 
} from '../utils/chat';

const formatMoney = (amount?: number) => {
  if (typeof amount !== 'number') return '0 đ';
  return amount.toLocaleString('vi-VN') + ' đ';
};

const formatTime = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return formatTime(dateStr);
    }
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  } catch {
    return '';
  }
};

const ChatWidget: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);

  // Conversation state
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeUser, setActiveUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [pendingProduct, setPendingProduct] = useState<ChatProductInfo | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeUserRef = useRef<ChatUser | null>(null);
  activeUserRef.current = activeUser;

  // Cập nhật người dùng hiện tại
  useEffect(() => {
    const loadUser = () => {
      const uStr = localStorage.getItem('user');
      if (uStr) {
        try { setCurrentUser(JSON.parse(uStr)); } catch { setCurrentUser(null); }
      } else {
        setCurrentUser(null);
      }
    };
    loadUser();

    const handleStorage = () => loadUser();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Lấy unread count định kỳ
  useEffect(() => {
    if (!currentUser) return;

    const fetchUnread = async () => {
      try {
        const res = await getChatUnreadCount();
        setUnreadTotal(res.data.count || 0);
      } catch {}
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 12000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Cuộn xuống tin nhắn mới nhất
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages]);

  // Tải danh sách các cuộc trò chuyện
  const loadConversations = async () => {
    if (!currentUser) return;
    try {
      const res = await getChatConversations();
      setConversations(res.data || []);
    } catch (e) {
      console.error('Lỗi tải danh sách chat:', e);
    }
  };

  // Tải tin nhắn của cuộc trò chuyện hiện tại
  const loadMessages = async (otherUserId: number, showLoading = false) => {
    if (showLoading) setLoadingMessages(true);
    try {
      const res = await getChatMessages(otherUserId);
      setMessages(res.data || []);
      // Refresh unread count
      const countRes = await getChatUnreadCount();
      setUnreadTotal(countRes.data.count || 0);
    } catch (e) {
      console.error('Lỗi tải tin nhắn:', e);
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  };

  // Polling tin nhắn khi đang mở cửa sổ chat với 1 user
  useEffect(() => {
    if (!isOpen || isMinimized || !activeUser || !currentUser) return;

    loadMessages(activeUser.userId, false);
    const interval = setInterval(() => {
      if (activeUserRef.current) {
        loadMessages(activeUserRef.current.userId, false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, isMinimized, activeUser, currentUser]);

  // Khi mở danh sách chat
  useEffect(() => {
    if (isOpen && !activeUser && currentUser) {
      loadConversations();
    }
  }, [isOpen, activeUser, currentUser]);

  // Lắng nghe sự kiện mở chat từ ProductDetail hoặc bất cứ trang nào
  useEffect(() => {
    const handleOpenChat = async (event: any) => {
      const detail: OpenChatDetail = event.detail || {};
      const uStr = localStorage.getItem('user');
      const cur = uStr ? JSON.parse(uStr) : null;

      if (!cur) {
        if (confirm('Bạn cần đăng nhập để trò chuyện với người bán. Chuyển đến trang Đăng nhập?')) {
          navigate('/login');
        }
        return;
      }

      setCurrentUser(cur);

      if (detail.sellerId) {
        if (cur.userId === detail.sellerId) {
          alert('Đây là sản phẩm từ chính xưởng của bạn.');
          return;
        }

        setIsOpen(true);
        setIsMinimized(false);

        // Chuẩn bị thông tin đối tác
        let partner: ChatUser = {
          userId: detail.sellerId,
          fullName: detail.sellerName || 'Người bán',
          shopName: detail.shopName,
          avatarUrl: detail.avatarUrl,
          role: 'SELLER'
        };

        try {
          const userRes = await getChatUser(detail.sellerId);
          if (userRes.data) {
            partner = userRes.data;
          }
        } catch {}

        setActiveUser(partner);

        // Tải tin nhắn hiện tại
        await loadMessages(partner.userId, true);

        // Nếu có cờ autoSendInquiry và có sản phẩm đính kèm: Tự động gửi tin nhắn hỏi về sản phẩm ngay lập tức!
        if (detail.autoSendInquiry && detail.product) {
          const prod = detail.product;
          setSending(true);
          try {
            const sendRes = await sendChatMessage({
              receiverId: partner.userId,
              content: `Xin chào xưởng! Tôi muốn hỏi thêm thông tin về sản phẩm "${prod.name}".`,
              productId: prod.productId
            });

            if (sendRes.data) {
              setMessages(prev => [...prev, sendRes.data]);
              setPendingProduct(null);
            }
          } catch (err) {
            console.error('Lỗi tự động gửi thông tin sản phẩm:', err);
            // Nếu tự động gửi gặp lỗi, lưu pending product để người dùng ấn gửi thủ công
            setPendingProduct(prod);
          } finally {
            setSending(false);
          }
        } else if (detail.product) {
          setPendingProduct(detail.product);
        }
      } else {
        // Mở danh sách chat tổng quát
        setIsOpen(true);
        setIsMinimized(false);
        setActiveUser(null);
        loadConversations();
      }
    };

    window.addEventListener('furnimatch:open-chat', handleOpenChat);
    return () => window.removeEventListener('furnimatch:open-chat', handleOpenChat);
  }, [navigate]);

  // Gửi tin nhắn từ input
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeUser || (!inputText.trim() && !pendingProduct) || sending) return;

    const content = inputText.trim();
    const prodId = pendingProduct?.productId;
    setSending(true);
    setInputText('');
    const sentProd = pendingProduct;
    setPendingProduct(null);

    try {
      const res = await sendChatMessage({
        receiverId: activeUser.userId,
        content: content || (sentProd ? `Xin chào xưởng! Tôi đang hỏi về sản phẩm "${sentProd.name}".` : ''),
        productId: prodId
      });

      if (res.data) {
        setMessages(prev => [...prev, res.data]);
        loadConversations();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.');
      // Khôi phục lại nếu gửi thất bại
      setInputText(content);
      if (sentProd) setPendingProduct(sentProd);
    } finally {
      setSending(false);
    }
  };

  const selectConversation = (partner: ChatUser) => {
    setActiveUser(partner);
    setPendingProduct(null);
    loadMessages(partner.userId, true);
  };

  if (!currentUser) return null;

  return (
    <>
      {/* Floating Trigger Button (when chat is closed or minimized) */}
      {(!isOpen || isMinimized) && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 group cursor-pointer"
          aria-label="Mở cửa sổ chat"
        >
          <div className="relative">
            <MessageCircle size={22} className="transition-transform group-hover:scale-110" />
            {unreadTotal > 0 && (
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[11px] font-black h-5 min-w-5 px-1 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {unreadTotal > 99 ? '99+' : unreadTotal}
              </span>
            )}
          </div>
          <span className="font-bold text-sm tracking-wide hidden sm:inline">
            Chat {unreadTotal > 0 ? `(${unreadTotal})` : ''}
          </span>
        </button>
      )}

      {/* Main Chat Window */}
      {isOpen && !isMinimized && (
        <div className="fixed bottom-4 right-4 z-50 w-[94vw] sm:w-[420px] h-[550px] max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              {activeUser ? (
                <>
                  <button
                    onClick={() => {
                      setActiveUser(null);
                      setPendingProduct(null);
                      loadConversations();
                    }}
                    className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white"
                    title="Quay lại danh sách"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden border border-white/30">
                    {activeUser.avatarUrl ? (
                      <img src={getImageUrl(activeUser.avatarUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{(activeUser.shopName || activeUser.fullName || 'U').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="min-w-0 leading-tight">
                    <p className="font-bold text-sm truncate text-white">
                      {activeUser.shopName || activeUser.fullName}
                    </p>
                    <p className="text-[11px] text-emerald-200 flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                      <span>{activeUser.shopName ? 'Xưởng sản xuất' : 'Thành viên'}</span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <MessageCircle size={20} />
                  <span className="font-bold text-base">Tin nhắn FurniMatch</span>
                  {unreadTotal > 0 && (
                    <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {unreadTotal}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 text-white/90">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title="Thu nhỏ"
              >
                <Minus size={18} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          {activeUser ? (
            /* CONVERSATION VIEW */
            <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50">
              
              {/* Product Pinned Preview Banner (if asking about a product and not sent yet) */}
              {pendingProduct && (
                <div className="bg-emerald-50/90 border-b border-emerald-200 px-3.5 py-2.5 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-gray-200 shrink-0 overflow-hidden border border-emerald-200">
                      {pendingProduct.imageUrl ? (
                        <img src={getImageUrl(pendingProduct.imageUrl)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Ảnh</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hỏi về sản phẩm</p>
                      <p className="text-xs font-bold text-gray-900 truncate">{pendingProduct.name}</p>
                      <p className="text-xs font-extrabold text-emerald-700">{formatMoney(pendingProduct.price)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={sending}
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-xs"
                  >
                    Gửi ngay
                  </button>
                </div>
              )}

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 [scrollbar-width:thin]">
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center text-gray-400 text-xs">
                    Đang tải cuộc trò chuyện...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center px-6">
                    <Store size={36} className="text-gray-300 mb-2" />
                    <p className="text-sm font-semibold text-gray-600">Bắt đầu trò chuyện với {activeUser.shopName || activeUser.fullName}</p>
                    <p className="text-xs text-gray-400 mt-1">Gửi tin nhắn để xưởng tư vấn về chất liệu, kích thước hoặc tiến độ sản xuất.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.userId;
                    return (
                      <div
                        key={msg.chatMessageId}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 shadow-xs text-sm ${
                            isMe
                              ? 'bg-emerald-600 text-white rounded-br-xs'
                              : 'bg-white text-gray-900 border border-gray-200/80 rounded-bl-xs'
                          }`}
                        >
                          {/* Attached Product Card */}
                          {msg.product && (
                            <div className={`mb-2 p-2.5 rounded-xl border flex gap-2.5 items-center ${
                              isMe 
                                ? 'bg-white/10 border-white/20 text-white' 
                                : 'bg-gray-50 border-gray-200 text-gray-900'
                            }`}>
                              <div className="w-13 h-13 rounded-lg bg-gray-200 overflow-hidden shrink-0 border border-black/10">
                                {msg.product.imageUrl ? (
                                  <img 
                                    src={getImageUrl(msg.product.imageUrl)} 
                                    alt={msg.product.name} 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs opacity-50">Ảnh</div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className={`text-[10px] font-bold uppercase tracking-wider block ${isMe ? 'text-emerald-100' : 'text-emerald-700'}`}>
                                  Sản phẩm quan tâm
                                </span>
                                <p className="font-bold text-xs truncate leading-snug">{msg.product.name}</p>
                                <p className={`text-xs font-extrabold mt-0.5 ${isMe ? 'text-amber-200' : 'text-emerald-600'}`}>
                                  {formatMoney(msg.product.price)}
                                </p>
                                <Link
                                  to={`/products/${msg.product.productId}`}
                                  target="_blank"
                                  className={`inline-flex items-center gap-1 text-[11px] underline mt-1 font-medium ${isMe ? 'text-white' : 'text-emerald-700'}`}
                                >
                                  <span>Xem chi tiết</span>
                                  <ExternalLink size={10} />
                                </Link>
                              </div>
                            </div>
                          )}

                          {/* Message Content */}
                          <p className="whitespace-pre-line leading-relaxed break-words">{msg.content}</p>

                          {/* Meta: time and status */}
                          <div className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${isMe ? 'text-emerald-100' : 'text-gray-400'}`}>
                            <span>{formatTime(msg.createdAt)}</span>
                            {isMe && (
                              msg.isRead ? (
                                <span title="Đã xem" className="inline-flex">
                                  <CheckCheck size={13} className="text-emerald-200" />
                                </span>
                              ) : (
                                <span title="Đã gửi" className="inline-flex">
                                  <Check size={13} className="text-emerald-200" />
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 bg-gray-50 focus:bg-white transition-colors"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || (!inputText.trim() && !pendingProduct)}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white p-2.5 rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
                  title="Gửi tin nhắn"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          ) : (
            /* CONVERSATIONS LIST */
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 [scrollbar-width:thin]">
              {conversations.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center px-6 py-12">
                  <MessageCircle size={40} className="text-gray-300 mb-2" />
                  <p className="text-sm font-semibold text-gray-600">Chưa có tin nhắn nào</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs">
                    Khi bạn nhấn "Chat với xưởng" ở chi tiết sản phẩm, cuộc trò chuyện sẽ hiển thị tại đây.
                  </p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const hasUnread = conv.unreadCount > 0;
                  return (
                    <button
                      key={conv.otherUser.userId}
                      onClick={() => selectConversation(conv.otherUser)}
                      className={`w-full text-left p-3.5 hover:bg-gray-50 flex items-center gap-3 transition-colors ${
                        hasUnread ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center overflow-hidden border border-emerald-200">
                          {conv.otherUser.avatarUrl ? (
                            <img 
                              src={getImageUrl(conv.otherUser.avatarUrl)} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <span>{(conv.otherUser.shopName || conv.otherUser.fullName || 'U').charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        {hasUnread && (
                          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black h-4.5 min-w-4.5 px-1 rounded-full flex items-center justify-center border-2 border-white">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className={`text-sm truncate ${hasUnread ? 'font-black text-gray-900' : 'font-bold text-gray-800'}`}>
                            {conv.otherUser.shopName || conv.otherUser.fullName}
                          </p>
                          <span className="text-[11px] text-gray-400 shrink-0">
                            {formatDate(conv.lastMessage.createdAt)}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${hasUnread ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                          {conv.lastMessage.productName ? `[${conv.lastMessage.productName}] ` : ''}
                          {conv.lastMessage.content}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;
