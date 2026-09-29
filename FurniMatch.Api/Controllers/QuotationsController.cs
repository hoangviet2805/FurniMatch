using System;
using System.Linq;
using System.IdentityModel.Tokens.Jwt;
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

            if (request.Status != "OPEN" && request.Status != "RECEIVING_QUOTES")
            {
                return BadRequest(new { message = "Yêu cầu này đã được khách hàng chốt xưởng gia công hoặc đã đóng." });
            }

            // Chuyển sang RECEIVING_QUOTES (Vẫn mở cho các xưởng khác gửi báo giá cạnh tranh)
            request.Status = "RECEIVING_QUOTES";

            var existingQuotation = await _context.Quotations
                .FirstOrDefaultAsync(q => q.QuotationRequestId == dto.QuotationRequestId && q.SellerId == sellerId);

            Quotation quotation;
            if (existingQuotation != null)
            {
                existingQuotation.Price = dto.Price;
                existingQuotation.ProductionDays = dto.ProductionDays;
                existingQuotation.Note = dto.Note?.Trim();
                existingQuotation.UpdatedAt = DateTime.UtcNow;
                quotation = existingQuotation;
            }
            else
            {
                quotation = new Quotation
                {
                    QuotationRequestId = dto.QuotationRequestId,
                    SellerId = sellerId,
                    Price = dto.Price,
                    ProductionDays = dto.ProductionDays,
                    Note = dto.Note?.Trim(),
                    Status = "PENDING",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Quotations.Add(quotation);
            }

            var formattedPrice = dto.Price.ToString("N0") + " đ";
            var sellerName = !string.IsNullOrEmpty(seller.ShopName) ? seller.ShopName : seller.FullName;

            // Thông báo in-app cho khách hàng
            _context.Notifications.Add(new Notification
            {
                UserId = request.CustomerId,
                Title = "Xưởng mộc vừa gửi báo giá mới cho bạn! 🪵",
                Message = $"Xưởng '{sellerName}' đã gửi báo giá cho yêu cầu '{request.ProductType}'. Báo giá: {formattedPrice}, thời gian dự kiến: {dto.ProductionDays} ngày.",
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
                        string subject = $"🎉 [FurniMatch] Xưởng '{sellerName}' đã gửi báo giá cho: {productType}";
                        string htmlBody = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;'>
                            <div style='background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center; color: white;'>
                                <h2 style='margin: 0; font-size: 20px;'>🎉 Bạn Có Báo Giá Mới Từ Xưởng Mộc</h2>
                                <p style='margin: 6px 0 0 0; font-size: 14px;'>Khách hàng: {customerName}</p>
                            </div>
                            <div style='padding: 24px; background: white;'>
                                <p style='font-size: 14px; color: #374151; line-height: 1.6;'>
                                    Yêu cầu đặt làm nội thất <strong>'{productType}'</strong> của bạn đã nhận được báo giá từ xưởng <strong>{sellerName}</strong>:
                                </p>
                                <div style='background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 18px 0;'>
                                    <p style='margin: 0 0 8px 0; font-size: 15px; color: #166534;'><strong>💰 Báo giá:</strong> <span style='font-size: 18px; font-weight: bold; color: #15803d;'>{formattedPrice}</span></p>
                                    <p style='margin: 0 0 8px 0; font-size: 14px; color: #374151;'><strong>⏱️ Thời gian hoàn thành dự kiến:</strong> {dto.ProductionDays} ngày</p>
                                    <p style='margin: 0 0 8px 0; font-size: 14px; color: #374151;'><strong>📝 Ghi chú từ xưởng:</strong> {note}</p>
                                    <hr style='border: none; border-top: 1px dashed #cbd5e1; margin: 12px 0;' />
                                    <p style='margin: 0 0 4px 0; font-size: 14px; color: #1e293b;'><strong>🏪 Xưởng báo giá:</strong> {sellerName}</p>
                                    <p style='margin: 0 0 4px 0; font-size: 14px; color: #374151;'><strong>📞 Hotline xưởng:</strong> {sellerPhone}</p>
                                    <p style='margin: 0; font-size: 14px; color: #374151;'><strong>📍 Địa chỉ xưởng:</strong> {sellerAddress}</p>
                                </div>
                                <div style='text-align: center; margin: 25px 0 10px 0;'>
                                    <a href='https://furnimatch-2.onrender.com/my-requests' style='background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;'>Xem Chi Tiết & Chốt Xưởng Này</a>
                                </div>
                            </div>
                        </div>";

                        await _emailService.SendEmailAsync(customerEmail, subject, htmlBody);
                    }
                    catch { /* Ignore background email failures */ }
                });
            }

            return Ok(new { 
                message = "Đã gửi báo giá cho khách hàng thành công! Bạn có thể theo dõi phản hồi của khách trong mục 'Yêu cầu xưởng đã nhận'.",
                quotation 
            });
        }

        [Authorize]
        [HttpPost("{id}/accept")]
        public async Task<IActionResult> AcceptQuotation(int id)
        {
            var customerIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                                ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub) 
                                ?? User.FindFirstValue("sub");

            if (string.IsNullOrEmpty(customerIdStr) || !int.TryParse(customerIdStr, out int customerId))
            {
                return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại." });
            }

            var quotation = await _context.Quotations
                .Include(q => q.QuotationRequest)
                    .ThenInclude(qr => qr!.Customer)
                .Include(q => q.Seller)
                .FirstOrDefaultAsync(q => q.QuotationId == id);

            if (quotation == null || quotation.QuotationRequest == null || quotation.QuotationRequest.CustomerId != customerId)
            {
                return Unauthorized(new { message = "Bạn không có quyền thao tác trên báo giá này." });
            }

            if (quotation.QuotationRequest.Status == "SELLER_SELECTED" || quotation.QuotationRequest.Status == "COMPLETED")
            {
                return BadRequest(new { message = "Yêu cầu này đã được chốt xưởng trước đó." });
            }

            // Chốt chọn xưởng này
            quotation.Status = "ACCEPTED";
            quotation.QuotationRequest.Status = "SELLER_SELECTED";
            quotation.UpdatedAt = DateTime.UtcNow;

            // Đánh dấu từ chối các báo giá của các xưởng khác
            var otherQuotations = await _context.Quotations
                .Include(q => q.Seller)
                .Where(q => q.QuotationRequestId == quotation.QuotationRequestId && q.QuotationId != id)
                .ToListAsync();

            foreach (var q in otherQuotations)
            {
                q.Status = "REJECTED";
                q.UpdatedAt = DateTime.UtcNow;

                // Thông báo cho các xưởng không được chọn
                _context.Notifications.Add(new Notification
                {
                    UserId = q.SellerId,
                    Title = "Khách hàng đã chọn xưởng khác cho đơn đặt hàng",
                    Message = $"Yêu cầu '{quotation.QuotationRequest.ProductType}' đã được khách hàng lựa chọn xưởng gia công khác. Cảm ơn xưởng đã gửi báo giá!",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Thông báo cho xưởng được chọn
            _context.Notifications.Add(new Notification
            {
                UserId = quotation.SellerId,
                Title = "🎉 Chúc mừng! Khách hàng đã chọn xưởng của bạn để gia công!",
                Message = $"Khách hàng {quotation.QuotationRequest.Customer?.FullName} đã chấp nhận báo giá {quotation.Price:N0} đ cho yêu cầu '{quotation.QuotationRequest.ProductType}'. Hãy liên hệ khách hàng để tiến hành sản xuất ngay!",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            // Gửi email cho xưởng thắng thầu trong background
            if (quotation.Seller != null && !string.IsNullOrEmpty(quotation.Seller.Email))
            {
                var sellerEmail = quotation.Seller.Email;
                var sellerName = !string.IsNullOrEmpty(quotation.Seller.ShopName) ? quotation.Seller.ShopName : quotation.Seller.FullName;
                var customerName = quotation.QuotationRequest.Customer?.FullName ?? "Khách hàng";
                var customerPhone = quotation.QuotationRequest.Customer?.Phone ?? "Chưa cập nhật";
                var customerEmail = quotation.QuotationRequest.Customer?.Email ?? "Chưa cập nhật";
                var customerAddress = string.Join(", ", new[] { 
                    quotation.QuotationRequest.Customer?.AddressDetail, 
                    quotation.QuotationRequest.Customer?.Ward, 
                    quotation.QuotationRequest.Customer?.District, 
                    quotation.QuotationRequest.Customer?.Province 
                }.Where(s => !string.IsNullOrWhiteSpace(s)));
                if (string.IsNullOrWhiteSpace(customerAddress)) customerAddress = "Chưa cập nhật";
                var productType = quotation.QuotationRequest.ProductType;
                var priceStr = quotation.Price.ToString("N0") + " đ";

                _ = Task.Run(async () =>
                {
                    try
                    {
                        string subject = $"🎉 [FurniMatch] Khách hàng {customerName} đã chọn xưởng của bạn cho đơn: {productType}";
                        string htmlBody = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;'>
                            <div style='background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center; color: white;'>
                                <h2 style='margin: 0; font-size: 20px;'>🎉 Khách Hàng Đã Chốt Chọn Xưởng Của Bạn</h2>
                                <p style='margin: 6px 0 0 0; font-size: 14px;'>Đơn đặt làm theo yêu cầu: {productType}</p>
                            </div>
                            <div style='padding: 24px; background: white;'>
                                <p style='font-size: 14px; color: #374151; line-height: 1.6;'>
                                    Xin chúc mừng <strong>{sellerName}</strong>! Khách hàng <strong>{customerName}</strong> đã tin tưởng và lựa chọn báo giá của xưởng bạn để tiến hành gia công sản phẩm.
                                </p>
                                <div style='background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 18px; margin: 18px 0;'>
                                    <p style='margin: 0 0 8px 0; font-size: 15px; color: #166534;'><strong>💰 Báo giá đã chốt:</strong> <span style='font-size: 18px; font-weight: bold; color: #15803d;'>{priceStr}</span></p>
                                    <p style='margin: 0 0 8px 0; font-size: 14px; color: #374151;'><strong>⏱️ Thời hạn gia công:</strong> {quotation.ProductionDays} ngày</p>
                                    <hr style='border: none; border-top: 1px dashed #cbd5e1; margin: 12px 0;' />
                                    <p style='margin: 0 0 6px 0; font-size: 14px; color: #1e293b;'><strong>👤 Khách hàng:</strong> {customerName}</p>
                                    <p style='margin: 0 0 6px 0; font-size: 14px; color: #374151;'><strong>📞 Hotline liên hệ:</strong> {customerPhone}</p>
                                    <p style='margin: 0 0 6px 0; font-size: 14px; color: #374151;'><strong>✉️ Email:</strong> {customerEmail}</p>
                                    <p style='margin: 0; font-size: 14px; color: #374151;'><strong>📍 Địa chỉ giao hàng:</strong> {customerAddress}</p>
                                </div>
                                <div style='text-align: center; margin: 25px 0 10px 0;'>
                                    <a href='https://furnimatch-2.onrender.com/seller/dashboard?tab=QUOTES' style='background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;'>Vào Quản Lý Đơn Xưởng</a>
                                </div>
                            </div>
                        </div>";
                        await _emailService.SendEmailAsync(sellerEmail, subject, htmlBody);
                    }
                    catch { /* Ignore background email failures */ }
                });
            }

            return Ok(new { message = "Đã xác nhận chốt xưởng thành công! Thông tin liên hệ đã sẵn sàng." });
        }
    }
}
