using System;
using System.Linq;
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
    public class QuotationsController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;
        private readonly IEmailService _emailService;

        public QuotationsController(FurniMatchDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [Authorize(Roles = "SELLER")]
        [HttpPost]
        public async Task<IActionResult> SubmitQuotation([FromBody] QuotationDto dto)
        {
            var sellerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var seller = await _context.Users.FindAsync(sellerId);
            if (seller == null || !seller.IsCustomSizeSupported)
            {
                return BadRequest(new { message = "Chỉ xưởng có đăng ký 'Nhận đặt hàng theo yêu cầu' mới có thể tiếp nhận và báo giá yêu cầu này." });
            }

            if (dto.Price <= 0)
            {
                return BadRequest(new { message = "Vui lòng nhập báo giá hợp lệ (lớn hơn 0)." });
            }

            if (dto.ProductionDays <= 0)
            {
                return BadRequest(new { message = "Vui lòng nhập thời gian làm dự kiến hợp lệ (tối thiểu 1 ngày)." });
            }

            var request = await _context.QuotationRequests
                .Include(r => r.Customer)
                .FirstOrDefaultAsync(r => r.QuotationRequestId == dto.QuotationRequestId);

            if (request == null)
            {
                return NotFound(new { message = "Không tìm thấy yêu cầu đặt hàng này." });
            }

            if (request.Status != "OPEN")
            {
                return BadRequest(new { message = "Yêu cầu này đã được xưởng khác tiếp nhận trước đó hoặc đã đóng." });
            }

            // Tiếp nhận yêu cầu: Đổi trạng thái sang CLAIMED để ẩn khỏi tất cả xưởng khác
            request.Status = "CLAIMED";

            var quotation = new Quotation
            {
                QuotationRequestId = dto.QuotationRequestId,
                SellerId = sellerId,
                Price = dto.Price,
                ProductionDays = dto.ProductionDays,
                Note = dto.Note?.Trim(),
                Status = "ACCEPTED",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Quotations.Add(quotation);

            var formattedPrice = dto.Price.ToString("N0") + " đ";
            var sellerName = !string.IsNullOrEmpty(seller.ShopName) ? seller.ShopName : seller.FullName;

            // Thông báo in-app cho khách hàng
            _context.Notifications.Add(new Notification
            {
                UserId = request.CustomerId,
                Title = "Xưởng đã tiếp nhận yêu cầu đặt hàng của bạn! 🎉",
                Message = $"Xưởng '{sellerName}' đã tiếp nhận yêu cầu '{request.ProductType}'. Báo giá: {formattedPrice}, thời gian làm dự kiến: {dto.ProductionDays} ngày.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            // Gửi email cho khách hàng trong background
            if (request.Customer != null && !string.IsNullOrEmpty(request.Customer.Email))
            {
                var customerEmail = request.Customer.Email;
                var customerName = request.Customer.FullName;
                var productType = request.ProductType;
                var note = !string.IsNullOrWhiteSpace(dto.Note) ? dto.Note.Trim() : "Không có ghi chú thêm";
                var sellerPhone = seller.Phone ?? "Chưa cập nhật";
                var sellerAddress = string.Join(", ", new[] { seller.AddressDetail, seller.Ward, seller.District, seller.Province }.Where(s => !string.IsNullOrWhiteSpace(s)));
                if (string.IsNullOrWhiteSpace(sellerAddress)) sellerAddress = "Chưa cập nhật";

                _ = Task.Run(async () =>
                {
                    try
                    {
                        string subject = $"🎉 [FurniMatch] Xưởng '{sellerName}' đã tiếp nhận yêu cầu đặt làm: {productType}";
                        string htmlBody = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;'>
                            <div style='background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center; color: white;'>
                                <h2 style='margin: 0; font-size: 20px;'>🎉 Xưởng Đã Tiếp Nhận & Báo Giá Đơn Hàng</h2>
                                <p style='margin: 6px 0 0 0; font-size: 14px;'>Khách hàng: {customerName}</p>
                            </div>
                            <div style='padding: 24px; background: white;'>
                                <p style='font-size: 14px; color: #374151; line-height: 1.6;'>
                                    Tin vui! Yêu cầu đặt làm nội thất <strong>'{productType}'</strong> của bạn đã được xưởng <strong>{sellerName}</strong> tiếp nhận với thông tin báo giá chi tiết như sau:
                                </p>
                                <div style='background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 18px 0;'>
                                    <p style='margin: 0 0 8px 0; font-size: 15px; color: #166534;'><strong>💰 Báo giá:</strong> <span style='font-size: 18px; font-weight: bold; color: #15803d;'>{formattedPrice}</span></p>
                                    <p style='margin: 0 0 8px 0; font-size: 14px; color: #374151;'><strong>⏱️ Thời gian làm dự kiến:</strong> {dto.ProductionDays} ngày</p>
                                    <p style='margin: 0 0 8px 0; font-size: 14px; color: #374151;'><strong>📝 Ghi chú từ xưởng:</strong> {note}</p>
                                    <hr style='border: none; border-top: 1px dashed #cbd5e1; margin: 12px 0;' />
                                    <p style='margin: 0 0 4px 0; font-size: 14px; color: #1e293b;'><strong>🏪 Xưởng tiếp nhận:</strong> {sellerName}</p>
                                    <p style='margin: 0 0 4px 0; font-size: 14px; color: #374151;'><strong>📞 Hotline xưởng:</strong> {sellerPhone}</p>
                                    <p style='margin: 0; font-size: 14px; color: #374151;'><strong>📍 Địa chỉ xưởng:</strong> {sellerAddress}</p>
                                </div>
                                <div style='text-align: center; margin: 25px 0 10px 0;'>
                                    <a href='https://furnimatch-2.onrender.com/my-requests' style='background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;'>Xem Chi Tiết Yêu Cầu Của Bạn</a>
                                </div>
                            </div>
                        </div>";

                        await _emailService.SendEmailAsync(customerEmail, subject, htmlBody);
                    }
                    catch { /* Ignore background email failures */ }
                });
            }

            return Ok(new { 
                message = "Đã tiếp nhận yêu cầu và gửi báo giá cho khách hàng thành công!",
                quotation 
            });
        }

        [Authorize(Roles = "CUSTOMER")]
        [HttpPost("{id}/accept")]
        public async Task<IActionResult> AcceptQuotation(int id)
        {
            var customerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var quotation = await _context.Quotations
                .Include(q => q.QuotationRequest)
                .FirstOrDefaultAsync(q => q.QuotationId == id);

            if (quotation == null || quotation.QuotationRequest!.CustomerId != customerId)
            {
                return Unauthorized();
            }

            quotation.Status = "ACCEPTED";
            quotation.QuotationRequest.Status = "COMPLETED";

            // Mark other quotations as REJECTED if any
            var otherQuotations = await _context.Quotations
                .Where(q => q.QuotationRequestId == quotation.QuotationRequestId && q.QuotationId != id)
                .ToListAsync();

            foreach (var q in otherQuotations)
            {
                q.Status = "REJECTED";
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã xác nhận chốt báo giá thành công." });
        }
    }
}
