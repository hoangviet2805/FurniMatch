using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using FurniMatch.Api.Data;
using FurniMatch.Api.DTOs;
using FurniMatch.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using System;
using FurniMatch.Api.Utils;

namespace FurniMatch.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuotationRequestsController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;
        private readonly FurniMatch.Api.Services.IEmailService _emailService;

        public QuotationRequestsController(FurniMatchDbContext context, FurniMatch.Api.Services.IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [Authorize(Roles = "CUSTOMER")]
        [HttpPost]
        public async Task<IActionResult> CreateRequest([FromBody] QuotationRequestDto dto)
        {
            var customerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var customer = await _context.Users.FindAsync(customerId);

            if (customer == null) return Unauthorized();

            var request = new QuotationRequest
            {
                CustomerId = customerId,
                CategoryId = dto.CategoryId > 0 ? dto.CategoryId : 1,
                ProductType = dto.ProductType?.Trim() ?? "Sản phẩm đặt làm theo yêu cầu",
                Pattern = dto.Pattern?.Trim(),
                Length = dto.Length,
                Width = dto.Width,
                Height = dto.Height,
                Material = dto.Material?.Trim(),
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
            await _context.SaveChangesAsync(); // Save to get QuotationRequestId

            // 1. Tìm các Xưởng (Seller) hỗ trợ làm theo yêu cầu (IsCustomSizeSupported = true) và đang ACTIVE
            var sellers = await _context.Users
                .Include(u => u.Role)
                .Where(u => u.Role != null && u.Role.RoleName == "SELLER" && u.IsCustomSizeSupported && u.Status == "ACTIVE")
                .ToListAsync();

            var targetSellers = new List<User>();
            bool hasCustomerCoords = customer.Latitude.HasValue && customer.Longitude.HasValue;

            foreach (var seller in sellers)
            {
                if (hasCustomerCoords && seller.Latitude.HasValue && seller.Longitude.HasValue && dto.RadiusKm > 0)
                {
                    var distance = DistanceHelper.CalculateDistanceInKm(
                        customer.Latitude.Value, customer.Longitude.Value,
                        seller.Latitude.Value, seller.Longitude.Value);

                    if (distance <= dto.RadiusKm)
                    {
                        targetSellers.Add(seller);
                    }
                }
                else
                {
                    targetSellers.Add(seller);
                }
            }

            // Fallback: nếu lọc theo bán kính không có xưởng nào, gửi tới tất cả xưởng nhận làm theo yêu cầu
            if (targetSellers.Count == 0 && sellers.Count > 0)
            {
                targetSellers = sellers;
            }

            int matchedSellersCount = 0;
            foreach (var seller in targetSellers)
            {
                _context.Notifications.Add(new Notification
                {
                    UserId = seller.UserId,
                    Title = "Yêu cầu đặt làm theo yêu cầu mới! 🪵",
                    Message = $"Khách hàng {customer.FullName} vừa tạo yêu cầu '{request.ProductType}'. Hãy vào tiếp nhận và gửi báo giá ngay!",
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
                var productType = request.ProductType;
                var dimensions = $"{request.Length} × {request.Width} × {request.Height} cm";
                var material = request.Material ?? "Chưa chỉ định";
                var quantity = request.Quantity;
                var desc = request.Description ?? "Không có mô tả thêm";
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
                                        Khách hàng vừa gửi yêu cầu đặt đóng nội thất theo kích thước riêng. Bạn hãy nhanh tay tiếp nhận và gửi báo giá để nhận đơn hàng trước các xưởng khác!
                                    </p>
                                    <div style='background: #f3f4f6; border-left: 4px solid #10b981; padding: 14px 18px; margin: 18px 0; border-radius: 4px;'>
                                        <p style='margin: 0 0 6px 0; font-size: 14px; color: #111827;'><strong>Sản phẩm:</strong> {productType}</p>
                                        <p style='margin: 0 0 6px 0; font-size: 14px; color: #374151;'><strong>Kích thước:</strong> {dimensions}</p>
                                        <p style='margin: 0 0 6px 0; font-size: 14px; color: #374151;'><strong>Chất liệu:</strong> {material}</p>
                                        <p style='margin: 0 0 6px 0; font-size: 14px; color: #374151;'><strong>Số lượng:</strong> {quantity}</p>
                                        <p style='margin: 0; font-size: 14px; color: #374151;'><strong>Ghi chú:</strong> {desc}</p>
                                    </div>
                                    <div style='text-align: center; margin: 25px 0 10px 0;'>
                                        <a href='https://furnimatch-2.onrender.com/seller/dashboard?tab=QUOTES' style='background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;'>Xem Yêu Cầu & Báo Giá Ngay</a>
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
                Message = $"Đã gửi yêu cầu tới {matchedSellersCount} xưởng sản xuất nhận may đo/gia công theo yêu cầu."
            });
        }

        [Authorize(Roles = "SELLER,CUSTOMER")]
        [HttpGet]
        public async Task<IActionResult> GetRequests([FromQuery] string? tab = null)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var role = User.FindFirstValue(ClaimTypes.Role);

            if (role == "CUSTOMER")
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

                // 1. Các yêu cầu đang OPEN (chưa có seller nào nhận)
                var availableRequests = await _context.QuotationRequests
                    .Where(qr => qr.Status == "OPEN")
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
