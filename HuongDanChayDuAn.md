# Hướng dẫn chạy dự án FurniMatch

Đây là tài liệu hướng dẫn nhanh để khởi động và chạy dự án FurniMatch trên máy tính cá nhân (localhost).

Dự án bao gồm 2 phần chính:
- **Backend**: ASP.NET Core Web API (chạy trên .NET 8)
- **Frontend**: React.js với Vite và Tailwind CSS v4

---

## 1. Yêu cầu hệ thống (Prerequisites)
- Đã cài đặt **.NET 8 SDK**.
- Đã cài đặt **Node.js** (phiên bản >= 20.x, khuyến nghị 24.x) và **npm**.
- Đã cài đặt **SQL Server** (hoặc bản LocalDB/Express).

---

## 2. Cấu hình Cơ sở dữ liệu (Database)

Hệ thống sử dụng **Entity Framework Core** với kết nối `Integrated Security=True` (Windows Authentication). 

Nếu bạn muốn thay đổi tài khoản sa, hãy mở file `FurniMatch.Api/appsettings.json` và chỉnh sửa chuỗi kết nối ở mục `"DefaultConnection"`.

Để tạo/cập nhật database mới nhất, hãy mở Terminal/Command Prompt tại thư mục `FurniMatch.Api` và chạy:
```bash
dotnet ef database update
```
*(Nếu bạn chưa cài tool EF, hãy chạy lệnh `dotnet tool install --global dotnet-ef` trước).*

---

## 3. Khởi động Backend API (ASP.NET Core)

1. Mở Terminal/Command Prompt.
2. Di chuyển vào thư mục chứa backend:
   ```bash
   cd FurniMatch.Api
   ```
3. Chạy lệnh:
   ```bash
   dotnet run
   ```
4. Đợi thông báo `Now listening on: http://localhost:5234` (hoặc cổng tương tự). 
5. Backend API của bạn đã chạy thành công! Bạn có thể xem tài liệu API (Swagger) tại: `http://localhost:5234/swagger`

---

## 4. Khởi động Frontend (React + Vite)

1. Mở một cửa sổ Terminal/Command Prompt **MỚI** (đừng tắt terminal của backend).
2. Di chuyển vào thư mục chứa frontend:
   ```bash
   cd furnimatch-client
   ```
3. (Nếu là lần đầu tiên, hãy chạy `npm install` để cài đặt thư viện).
4. Chạy lệnh:
   ```bash
   npm run dev
   ```
5. Ứng dụng React sẽ khởi động và cung cấp đường dẫn cục bộ (thường là `http://localhost:5173`).
6. Mở trình duyệt web và truy cập: **[http://localhost:5173](http://localhost:5173)**

---

## 5. Lưu ý chung khi phát triển
- Trong quá trình phát triển, luôn giữ 2 cửa sổ terminal chạy song song (1 cái cho `dotnet run`, 1 cái cho `npm run dev`).
- Khi cần tắt server, hãy bấm tổ hợp phím `Ctrl + C` trên terminal tương ứng.
