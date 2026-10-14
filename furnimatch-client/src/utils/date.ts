/**
 * Tiện ích xử lý chuẩn múi giờ UTC cho các chuỗi ngày giờ từ server.
 * Do ASP.NET Core & PostgreSQL có thể trả về chuỗi ISO không có hậu tố 'Z'
 * (ví dụ: "2026-10-14T04:37:00"), trình duyệt nếu dùng new Date(str) sẽ mặc định hiểu là GIỜ LOCAL,
 * dẫn đến lệch múi giờ (ví dụ: 04:37 UTC bị hiểu thành 04:37 GMT+7, lệch 7 tiếng so với thực tế).
 */
export const parseUtcDate = (dateInput: string | Date | null | undefined): Date => {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  let str = String(dateInput).trim();
  if (!str) return new Date();

  // Nếu chuỗi chưa có ký tự 'Z' hoặc múi giờ offset (+07:00 / -05:00)
  if (!str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
    str += 'Z';
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date(dateInput) : d;
};
