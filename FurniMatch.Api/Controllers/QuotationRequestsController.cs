using System;
using System.Collections.Generic;
using System.Linq;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using FurniMatch.Api.Data;
using FurniMatch.Api.DTOs;
using FurniMatch.Api.Models;
using FurniMatch.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FurniMatch.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuotationRequestsController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;
        private readonly IEmailService _emailService;
        private readonly IPhotoService _photoService;

        public QuotationRequestsController(
            FurniMatchDbContext context, 
            IEmailService emailService,
            IPhotoService photoService)
        {
            _context = context;
            _emailService = emailService;
            _photoService = photoService;
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateRequest([FromForm] QuotationRequestDto dto)
        {
            var customerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                                ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub) 
                                ?? User.FindFirstValue("sub");

            if (string.IsNullOrEmpty(customerIdStr) || !int.TryParse(customerIdStr, out int customerId))
            {
                return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại." });
            }

            var customer = await _context.Users.FindAsync(customerId);
            if (customer == null) 
            {
                return Unauthorized(new { message = "Tài khoản không tồn tại trên hệ thống. Vui lòng đăng nhập lại." });
            }

            var category = await _context.Categories.FindAsync(dto.CategoryId)
                           ?? await _context.Categories.FirstOrDefaultAsync();
            var categoryName = category?.Name ?? "nội thất";

            // Xử lý upload ảnh mẫu sản phẩm
            string? uploadedImageUrl = dto.ImageUrl;
            if (dto.ImageFile != null && dto.ImageFile.Length > 0)
            {
                try
                {
                    uploadedImageUrl = await _photoService.AddMediaAsync(dto.ImageFile, "furnimatch_custom_requests");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[Cloudinary Upload Warning]: {ex.Message}");
                    // Fallback lưu cục bộ nếu Cloudinary gặp sự cố
                    try
                    {
                        var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "quotations");
                        if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);
                        var ext = Path.GetExtension(dto.ImageFile.FileName);
                        var fileName = $"{Guid.NewGuid()}{ext}";
                        var filePath = Path.Combine(uploadsFolder, fileName);
                        using (var stream = new FileStream(filePath, FileMode.Create))
                        {
                            await dto.ImageFile.CopyToAsync(stream);
                        }
                        uploadedImageUrl = $"/uploads/quotations/{fileName}";
                    }
                    catch { }
                }
            }

            var productType = !string.IsNullOrWhiteSpace(dto.ProductType) 
                ? dto.ProductType.Trim() 
                : $"Đặt đóng {categoryName} theo ảnh mẫu";

            var material = !string.IsNullOrWhiteSpace(dto.Material)
                ? dto.Material.Trim()
                : "Xưởng tư vấn chất liệu";

            var request = new QuotationRequest
            {
                CustomerId = customerId,
                CategoryId = category?.CategoryId ?? 1,
                ProductType = productType,
                Pattern = uploadedImageUrl != null && uploadedImageUrl.Length > 100 ? uploadedImageUrl.Substring(0, 100) : uploadedImageUrl,
                ImageUrl = uploadedImageUrl,
                Length = dto.Length > 0 ? dto.Length : 120,
                Width = dto.Width > 0 ? dto.Width : 60,
                Height = dto.Height > 0 ? dto.Height : 75,
                Material = material,
                FrameType = dto.FrameType?.Trim(),
                Color = dto.Color?.Trim(),
                Quantity = dto.Quantity > 0 ? dto.Quantity : 1,
                BudgetMin = dto.BudgetMin,
                BudgetMax = dto.BudgetMax,
                Description = dto.Description?.Trim(),
                Status = "OPEN",
                CreatedAt = DateTime.UtcNow
            };

            _context.QuotationRequests.Add(request);
            await _context.SaveChangesAsync();

            // Tìm TẤT CẢ các Xưởng (Seller) hỗ trợ làm theo yêu cầu (IsCustomSizeSupported = true) và đang ACTIVE
            var targetSellers = await _context.Users
                .Include(u => u.Role)
                .Where(u => u.Role != null && u.Role.RoleName == "SELLER" && u.IsCustomSizeSupported && u.Status == "ACTIVE")
                .ToListAsync();

            int matchedSellersCount = 0;
            foreach (var seller in targetSellers)
            {
                _context.Notifications.Add(new Notification
                {
                    UserId = seller.UserId,
                    Title = "Yêu cầu đặt làm theo yêu cầu mới! 🪵",
                    Message = $"Khách hàng {customer.FullName} vừa tạo yêu cầu '{request.ProductType}'. Hãy vào xem ảnh mẫu và gửi báo giá ngay!",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
                matchedSellersCount++;
            }

            if (matchedSellersCount > 0)
            {
                await _context.SaveChangesAsync();

                // Gửi email thông báo cho các xưởng trong background
                var customerName = customer.FullName;
                var dimensions = $"{request.Length} × {request.Width} × {request.Height} cm";
                var quantity = request.Quantity;
                var desc = request.Description ?? "Không có mô tả thêm";
                var imgHtml = !string.IsNullOrEmpty(uploadedImageUrl) 
                    ? $"<div style='text-align: center; margin: 15px 0;'><img src='{uploadedImageUrl}' style='max-width: 100%; max-height: 250px; border-radius: 8px; border: 1px solid #e5e7eb;' alt='Ảnh mẫu' /></div>" 
                    : "";
                var sellerEmails = targetSellers.Where(s => !string.IsNullOrEmpty(s.Email)).Select(s => s.Email).ToList();

                _ = Task.Run(async () =>
                {
                    foreach (var email in sellerEmails)
                    {
                        try
                        {
                            string subject = $"🪵 [FurniMatch] Cơ hội đơn hàng mới: {productType}";
                            string htmlBody = $@"
                            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;'>
                                <div style='background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center; color: white;'>
                                    <h2 style='margin: 0; font-size: 20px;'>🪵 Yêu Cầu Đặt Làm Theo Yêu Cầu Mới</h2>
                                    <p style='margin: 6px 0 0 0; font-size: 14px;'>Khách hàng: {customerName}</p>
                                </div>
                                <div style='padding: 24px; background: white;'>
                                    <p style='font-size: 14px; color: #374151; line-height: 1.6;'>
                                        Khách hàng vừa gửi yêu cầu đặt đóng nội thất kèm ảnh mẫu thiết kế. Hãy xem yêu cầu và nhanh tay gửi báo giá cạnh tranh!
                                    </p>
                                    {imgHtml}
                                    <div style='background: #f3f4f6; border-left: 4px solid #10b981; padding: 14px 18px; margin: 18px 0; border-radius: 4px;'>
                                        <p style='margin: 0 0 6px 0; font-size: 14px; color: #111827;'><strong>Loại món đồ:</strong> {productType}</p>
                                        <p style='margin: 0 0 6px 0; font-size: 14px; color: #374151;'><strong>Kích thước:</strong> {dimensions}</p>
                                        <p style='margin: 0 0 6px 0; font-size: 14px; color: #374151;'><strong>Số lượng:</strong> {quantity}</p>
                                        <p style='margin: 0; font-size: 14px; color: #374151;'><strong>Ghi chú từ khách:</strong> {desc}</p>
                                    </div>
                                    <div style='text-align: center; margin: 25px 0 10px 0;'>
                                        <a href='https://furnimatch-2.onrender.com/seller/dashboard?tab=QUOTES' style='background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;'>Xem Chi Tiết & Báo Giá Ngay</a>
                                    </div>
                                </div>
                            </div>";

                            await _emailService.SendEmailAsync(email, subject, htmlBody);
                        }
                        catch { /* Ignore background email failures */ }
                    }
                });
            }

            return Ok(new { 
                Request = request, 
                MatchedSellers = matchedSellersCount,
                Message = $"Đã gửi yêu cầu tới {matchedSellersCount} xưởng sản xuất nhận gia công theo yêu cầu."
            });
        }

        [Authorize]
        [HttpGet]
        public async Task<IActionResult> GetRequests([FromQuery] string? tab = null)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub) 
                            ?? User.FindFirstValue("sub");

            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
            {
                return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại." });
            }

            var role = User.FindFirstValue(ClaimTypes.Role) ?? "";

            if (!role.Equals("SELLER", StringComparison.OrdinalIgnoreCase))
            {
                var requests = await _context.QuotationRequests
                    .Where(qr => qr.CustomerId == userId)
                    .Include(qr => qr.Category)
                    .Include(qr => qr.Quotations)
                        .ThenInclude(q => q.Seller)
                    .OrderByDescending(qr => qr.CreatedAt)
                    .ToListAsync();
                return Ok(requests);
            }
            else // SELLER
            {
                var seller = await _context.Users.FindAsync(userId);
                if (seller == null || !seller.IsCustomSizeSupported)
                {
                    if (tab == "available" || tab == "my-claimed") return Ok(new List<object>());
                    return Ok(new 
                    { 
                        isCustomSizeSupported = false,
                        availableRequests = new List<object>(), 
                        myClaimedRequests = new List<object>() 
                    });
                }

                // 1. Các yêu cầu đang OPEN hoặc RECEIVING_QUOTES mà xưởng này CHƯA gửi báo giá
                // (Tất cả seller đều có thể nhận & gửi báo giá cho đến khi khách hàng chốt chọn 1 xưởng)
                var availableRequests = await _context.QuotationRequests
                    .Where(qr => (qr.Status == "OPEN" || qr.Status == "RECEIVING_QUOTES") && !qr.Quotations.Any(q => q.SellerId == userId))
                    .Include(qr => qr.Category)
                    .Include(qr => qr.Customer)
                    .OrderByDescending(qr => qr.CreatedAt)
                    .ToListAsync();

                // 2. Các yêu cầu mà chính xưởng này đã tiếp nhận và gửi báo giá
                var myClaimedRequests = await _context.QuotationRequests
                    .Where(qr => qr.Quotations.Any(q => q.SellerId == userId))
                    .Include(qr => qr.Category)
                    .Include(qr => qr.Customer)
                    .Include(qr => qr.Quotations.Where(q => q.SellerId == userId))
                    .OrderByDescending(qr => qr.CreatedAt)
                    .ToListAsync();

                if (tab == "available") return Ok(availableRequests);
                if (tab == "my-claimed") return Ok(myClaimedRequests);

                return Ok(new {
                    isCustomSizeSupported = true,
                    availableRequests,
                    myClaimedRequests
                });
            }
        }
    }
}
