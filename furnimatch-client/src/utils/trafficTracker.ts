import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from './api';

// ============================================================================
// CẤU HÌNH THỜI GIAN KẾT THÚC PHIÊN (SESSION TIMEOUT)
// Hiện tại cấu hình: 3 phút (để dễ dàng test nghiệm thu)
// Mai sau muốn tăng lên 30 phút, chỉ cần đổi số 3 thành 30!
// ============================================================================
export const SESSION_TIMEOUT_MINUTES = 3;
const SESSION_TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000;

const STORAGE_KEYS = {
  SESSION_ID: 'fm_traffic_session_id',
  LAST_ACTIVE: 'fm_traffic_last_active',
  SESSION_COUNTED: 'fm_traffic_session_counted',
  SESSION_START: 'fm_traffic_session_start',
  PAGE_COUNT: 'fm_traffic_page_count',
  LAST_PATH: 'fm_traffic_last_path',
};

// Hàm sinh mã định danh ngẫu nhiên cho phiên (UUID v4)
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Khởi tạo hoặc lấy phiên hiện tại
export function getOrCreateSession() {
  const now = Date.now();
  const sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID);
  const lastActiveStr = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
  const lastActive = lastActiveStr ? Number(lastActiveStr) : 0;

  // Kiểm tra phiên có bị hết hạn (quá 3 phút không tương tác) hoặc sang ngày mới (qua 0h00 đêm)
  const isExpired = !sessionId || !lastActive || (now - lastActive > SESSION_TIMEOUT_MS);
  const isDifferentDay = lastActive > 0 && new Date(lastActive).getDate() !== new Date(now).getDate();

  if (isExpired || isDifferentDay) {
    // Bắt đầu một phiên mới hoàn toàn
    const newSessionId = generateUUID();
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, newSessionId);
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, String(now));
    localStorage.setItem(STORAGE_KEYS.SESSION_START, String(now));
    localStorage.setItem(STORAGE_KEYS.SESSION_COUNTED, 'false');
    localStorage.setItem(STORAGE_KEYS.PAGE_COUNT, '1');
    localStorage.setItem(STORAGE_KEYS.LAST_PATH, window.location.pathname);

    return {
      sessionId: newSessionId,
      isNew: true,
      pageCount: 1,
      isCounted: false,
      startTime: now,
    };
  }

  // Tiếp tục phiên hiện tại và cập nhật thời điểm tương tác mới nhất
  localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, String(now));
  const pageCount = Number(localStorage.getItem(STORAGE_KEYS.PAGE_COUNT) || '1');
  const isCounted = localStorage.getItem(STORAGE_KEYS.SESSION_COUNTED) === 'true';
  const startTime = Number(localStorage.getItem(STORAGE_KEYS.SESSION_START) || String(now));

  return {
    sessionId,
    isNew: false,
    pageCount,
    isCounted,
    startTime,
  };
}

// Cập nhật timestamp hoạt động của người dùng
let lastThrottleUpdate = 0;
export function touchUserActivity() {
  const now = Date.now();
  // Giới hạn cập nhật 5 giây / lần để tránh ghi localStorage quá nhiều
  if (now - lastThrottleUpdate > 5000) {
    lastThrottleUpdate = now;
    const session = getOrCreateSession();
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, String(now));
    return session;
  }
}

// Gửi yêu cầu ghi nhận lượt truy cập về Backend
export async function sendTrafficRecord(
  triggerReason: 'TIME_10S' | 'PAGE_DEPTH' | 'CONVERSION_LOGIN' | 'CONVERSION_PAYMENT'
) {
  try {
    const session = getOrCreateSession();
    const durationSeconds = Math.max(0, Math.floor((Date.now() - session.startTime) / 1000));

    // Nếu phiên đã được tính lượt trước đó và lý do gửi không phải chuyển hóa (conversion),
    // thì không cần gửi lại để tiết kiệm băng thông
    if (session.isCounted && !triggerReason.startsWith('CONVERSION')) {
      return;
    }

    const payload = {
      sessionId: session.sessionId,
      triggerReason,
      pagesCount: session.pageCount,
      durationSeconds,
    };

    await api.post('/traffic/record', payload);
    localStorage.setItem(STORAGE_KEYS.SESSION_COUNTED, 'true');
  } catch (error) {
    console.warn('[TrafficTracker] Không thể gửi dữ liệu truy cập:', error);
  }
}

// Hàm gọi thủ công khi có chuyển hóa (Đăng nhập, Nạp tiền, Chuyển tiền, Thanh toán)
export function recordTrafficConversion(type: 'LOGIN' | 'PAYMENT') {
  const reason = type === 'LOGIN' ? 'CONVERSION_LOGIN' : 'CONVERSION_PAYMENT';
  sendTrafficRecord(reason);
}

// Hook tự động theo dõi trong toàn bộ ứng dụng React
export function useTrafficTracker() {
  const location = useLocation();
  const timerRef = useRef<any>(null);

  // 1. Lắng nghe các tương tác chuột, phím, cuộn để cập nhật hoạt động (không bị timeout phiên)
  useEffect(() => {
    const handleActivity = () => touchUserActivity();

    window.addEventListener('mousedown', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });

    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, []);

  // 2. Theo dõi chuyển trang (Page depth >= 2 -> Tính 1 lượt truy cập)
  useEffect(() => {
    const session = getOrCreateSession();
    const lastPath = localStorage.getItem(STORAGE_KEYS.LAST_PATH);

    if (lastPath !== location.pathname) {
      localStorage.setItem(STORAGE_KEYS.LAST_PATH, location.pathname);
      const newPageCount = session.pageCount + 1;
      localStorage.setItem(STORAGE_KEYS.PAGE_COUNT, String(newPageCount));

      // Điều kiện 2: Xem từ 2 trang trở lên thì tính 1 lượt truy cập
      if (newPageCount >= 2 && !session.isCounted) {
        sendTrafficRecord('PAGE_DEPTH');
      }
    }
  }, [location.pathname]);

  // 3. Theo dõi thời gian ở lại website (> 10s -> Tính 1 lượt truy cập)
  useEffect(() => {
    const session = getOrCreateSession();

    // Nếu phiên này chưa được ghi nhận lượt truy cập
    if (!session.isCounted) {
      if (timerRef.current) clearTimeout(timerRef.current);

      // Đặt hẹn giờ 10 giây
      timerRef.current = setTimeout(() => {
        const currentSession = getOrCreateSession();
        if (!currentSession.isCounted) {
          sendTrafficRecord('TIME_10S');
        }
      }, 10000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
}
