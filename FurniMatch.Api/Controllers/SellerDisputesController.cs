using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using FurniMatch.Api.Data;
using FurniMatch.Api.Models;
using FurniMatch.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FurniMatch.Api.Controllers
{
    [ApiController]
    [Route("api/seller/disputes")]
    [Authorize(Roles = "SELLER")]
    public class SellerDisputesController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;
        private readonly IEmailService _emailService;

        public SellerDisputesController(FurniMatchDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        private int SellerId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        /// <summary>
        /// Lấy danh sách khiếu nại của các đơn hàng thuộc xưởng này
        /// GET /api/seller/disputes?status=ALL&page=1&pageSize=10
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetDisputes([FromQuery] string? status = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var query = _context.OrderDisputes
                .Include(d => d.Order)
                .Include(d => d.Customer)
                .Where(d => d.Order != null && d.Order.SellerId == SellerId)
                .AsQueryable();

            var pendingCount = await _context.OrderDisputes
                .Where(d => d.Order != null && d.Order.SellerId == SellerId && (d.Status == "PENDING_SELLER" || d.Status == "OPEN"))
                .CountAsync();

            var returnReceivedCount = await _context.OrderDisputes
                .Where(d => d.Order != null && d.Order.SellerId == SellerId && d.Status == "RETURN_RECEIVED")
                .CountAsync();

            if (!string.IsNullOrEmpty(status) && status.ToUpper() != "ALL")
            {
                var upper = status.ToUpper();
                if (upper == "PENDING_SELLER")
                {
                    query = query.Where(d => d.Status == "PENDING_SELLER" || d.Status == "OPEN");
                }
                else
                {
                    query = query.Where(d => d.Status == upper);
                }
            }

            var total = await query.CountAsync();
            var data = await query
                .OrderByDescending(d => d.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(d => new
                {
                    d.OrderDisputeId,
                    d.OrderId,
                    OrderCode = d.Order != null ? d.Order.OrderCode : "N/A",
                    OrderAmount = d.Order != null ? (d.Order.TotalAmount > 0 ? d.Order.TotalAmount : d.Order.Subtotal) : 0,
                    RecipientName = d.Order != null ? d.Order.RecipientName : "N/A",
                    RecipientPhone = d.Order != null ? d.Order.RecipientPhone : "N/A",
                    Address = d.Order != null ? d.Order.Address : "N/A",
                    CustomerName = d.Customer != null ? d.Customer.FullName : "N/A",
                    CustomerEmail = d.Customer != null ? d.Customer.Email : "N/A",
                    CustomerPhone = d.Customer != null ? d.Customer.Phone : "N/A",
                    d.Reason,
                    d.EvidenceImages,
                    d.Status,
                    d.SellerNote,
                    d.ReturnReceivedAt,
                    d.AdminNote,
                    d.CreatedAt,
                    d.ResolvedAt
                })
                .ToListAsync();

            return Ok(new
            {
                total,
                page,
                pageSize,
                pendingCount,
                returnReceivedCount,
                data
            });
        }

        /// <summary>
        /// Seller thông báo đã nhận được hàng hoàn từ user và không có vấn đề xảy ra
        /// PUT /api/seller/disputes/{id}/confirm-return
        /// </summary>
        [HttpPut("{id:int}/confirm-return")]
        public async Task<IActionResult> ConfirmReturn(int id, [FromBody] ConfirmReturnDto dto)
        {
            var dispute = await _context.OrderDisputes
                .Include(d => d.Order)
                .Include(d => d.Customer)
                .FirstOrDefaultAsync(d => d.OrderDisputeId == id && d.Order != null && d.Order.SellerId == SellerId);

            if (dispute == null)
            {
                return NotFound(new { message = "Không tìm thấy khiếu nại hoặc khiếu nại không thuộc xưởng của bạn." });
            }

            if (dispute.Status != "PENDING_SELLER" && dispute.Status != "OPEN")
            {
                return BadRequest(new { message = "Khiếu nại này không ở trạng thái chờ nhận hàng hoàn." });
            }

            dispute.Status = "RETURN_RECEIVED";
            dispute.ReturnReceivedAt = DateTime.UtcNow;
            dispute.SellerNote = dto.Note?.Trim();

            // Thông báo in-app cho Customer
            _context.Notifications.Add(new Notification
            {
                UserId = dispute.CustomerId,
                Title = "Người bán đã nhận được hàng hoàn ✅",
                Message = $"Xưởng sản xuất đã xác nhận nhận lại hàng hoàn cho đơn hàng #{dispute.Order?.OrderCode} và không có vấn đề xảy ra. Yêu cầu đã được chuyển cho Admin duyệt hoàn tiền vào ví của bạn." +
                          (!string.IsNullOrWhiteSpace(dto.Note) ? $" (Ghi chú xưởng: {dto.Note.Trim()})" : ""),
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });

            // Thông báo in-app cho toàn bộ Admin
            var adminUsers = await _context.Users
                .Where(u => u.Role != null && u.Role.RoleName == "ADMIN")
                .ToListAsync();

            foreach (var admin in adminUsers)
            {
                _context.Notifications.Add(new Notification
                {
                    UserId = admin.UserId,
                    Title = "Xưởng đã nhận hàng hoàn - Chờ hoàn tiền 📦",
                    Message = $"Xưởng đã xác nhận nhận hàng hoàn hợp lệ cho đơn #{dispute.Order?.OrderCode}. Vui lòng duyệt lệnh hoàn tiền vào ví cho khách hàng.",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            // Gửi email thông báo cho Admin
            var seller = await _context.Users.FindAsync(SellerId);
            var orderCode = dispute.Order?.OrderCode ?? id.ToString();
            var refundAmount = dispute.Order != null ? (dispute.Order.TotalAmount > 0 ? dispute.Order.TotalAmount : dispute.Order.Subtotal) : 0;
            var customerName = dispute.Customer?.FullName ?? dispute.Order?.RecipientName ?? "Khách hàng";

            _ = Task.Run(async () =>
            {
                try
                {
                    string adminEmail = "admin@furnimatch.com";
                    string subject = $"📦 [Yêu cầu hoàn tiền] Xưởng xác nhận đã nhận hàng hoàn đơn #{orderCode}";
                    string htmlBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;'>
                        <div style='background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 25px; text-align: center; color: white;'>
                            <h2 style='margin: 0; font-size: 20px;'>📦 Xác Nhận Đã Nhận Hàng Hoàn</h2>
                            <p style='margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;'>Đơn hàng #{orderCode}</p>
                        </div>
                        <div style='padding: 24px; background: white;'>
                            <p style='font-size: 15px; color: #374151;'>Chào <strong>Quản trị viên FurniMatch</strong>,</p>
                            <p style='font-size: 14px; color: #4b5563; line-height: 1.6;'>
                                Xưởng <strong>{seller?.ShopName ?? seller?.FullName ?? "Nhà sản xuất"}</strong> vừa xác nhận <strong>đã nhận được hàng hoàn trả</strong> từ khách hàng <strong>{customerName}</strong> và kiểm tra hàng hóa <strong>không có vấn đề xảy ra</strong>.
                            </p>
                            
                            <div style='background: #f8fafc; border-left: 4px solid #0284c7; padding: 14px 18px; margin: 18px 0; border-radius: 4px;'>
                                <p style='margin: 0 0 6px 0; font-size: 14px; color: #334155;'><strong>Mã đơn hàng:</strong> #{orderCode}</p>
                                <p style='margin: 0 0 6px 0; font-size: 14px; color: #334155;'><strong>Số tiền cần hoàn:</strong> <span style='color: #0284c7; font-weight: bold;'>{refundAmount:N0} VNĐ</span></p>
                                <p style='margin: 0 0 6px 0; font-size: 14px; color: #334155;'><strong>Khách hàng:</strong> {customerName}</p>
                                {(!string.IsNullOrWhiteSpace(dto.Note) ? $"<p style='margin: 0; font-size: 14px; color: #334155;'><strong>Ghi chú xưởng:</strong> {dto.Note.Trim()}</p>" : "")}
                            </div>

                            <p style='font-size: 14px; color: #4b5563; line-height: 1.6;'>
                                Vui lòng đăng nhập vào Bảng điều khiển Quản trị viên &gt; mục <strong>Khiếu Nại Đơn Hàng</strong> để thực hiện duyệt lệnh hoàn tiền vào ví cho khách hàng.
                            </p>

                            <div style='text-align: center; margin: 25px 0 10px 0;'>
                                <a href='http://localhost:5173/admin/dashboard' style='background: #0284c7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;'>Duyệt Hoàn Tiền Ngay</a>
                            </div>
                        </div>
                    </div>";

                    await _emailService.SendEmailAsync(adminEmail, subject, htmlBody);
                }
                catch { /* Ignore background email error */ }
            });

            return Ok(new
            {
                message = "Đã xác nhận nhận hàng hoàn hợp lệ thành công. Yêu cầu đã được chuyển tới Admin để hoàn tiền vào ví cho khách hàng."
            });
        }
    }

    public sealed class ConfirmReturnDto
    {
        public string? Note { get; set; }
    }
}
