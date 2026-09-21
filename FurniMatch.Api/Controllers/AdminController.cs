using System.Linq;
using System.Threading.Tasks;
using FurniMatch.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FurniMatch.Api.Services;
using System.Collections.Generic;
using System;
using FurniMatch.Api.Models;

namespace FurniMatch.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // [Authorize(Roles = "ADMIN")] // Uncomment when auth is fully strictly tested from UI
    public class AdminController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;
        private readonly IEmailService _emailService;

        public AdminController(FurniMatchDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers([FromQuery] string role = "")
        {
            var query = _context.Users
                .Include(u => u.Role)
                .AsQueryable();

            if (!string.IsNullOrEmpty(role))
            {
                query = query.Where(u => u.Role.RoleName.ToUpper() == role.ToUpper());
            }

            var users = await query
                .Select(u => new
                {
                    u.UserId,
                    u.FullName,
                    u.Email,
                    u.Phone,
                    u.Status,
                    u.ShopName,
                    u.CreatedAt,
                    RoleName = u.Role.RoleName
                })
                .OrderByDescending(u => u.CreatedAt)
                .ToListAsync();

            return Ok(users);
        }

        [HttpPut("users/{id}/status")]
        public async Task<IActionResult> UpdateUserStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            user.Status = dto.Status.ToUpper();
            await _context.SaveChangesAsync();

            return Ok(new { message = "Status updated successfully", status = user.Status });
        }

        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            try
            {
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();
                return Ok(new { message = "User deleted successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Không thể xóa người dùng này vì họ đang có dữ liệu liên kết. Chi tiết lỗi: " + (ex.InnerException?.Message ?? ex.Message) });
            }
        }

        [HttpGet("pending-sellers")]
        public async Task<IActionResult> GetPendingSellers()
        {
            var sellers = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.SellerDocuments)
                .Where(u => u.Role!.RoleName == "SELLER" && u.Status == "PENDING_APPROVAL")
                .Select(u => new
                {
                    u.UserId,
                    u.FullName,
                    u.Email,
                    u.Phone,
                    u.ShopName,
                    u.ShopDescription,
                    u.CreatedAt,
                    Documents = u.SellerDocuments.Select(d => d.ImageUrl).ToList()
                })
                .OrderByDescending(u => u.CreatedAt)
                .ToListAsync();

            return Ok(sellers);
        }

        [HttpPost("approve-seller/{id}")]
        public async Task<IActionResult> ApproveSeller(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null || user.Status != "PENDING_APPROVAL")
                return NotFound(new { message = "Không tìm thấy yêu cầu chờ duyệt hợp lệ." });

            user.Status = "ACTIVE";
            await _context.SaveChangesAsync();

            var emailBody = @"
                <h2>Chúc mừng! Đơn đăng ký Nhà Sản Xuất của bạn đã được duyệt</h2>
                <p>Đơn đăng ký của bạn đã được Admin phê duyệt.</p>
                <p>Bây giờ bạn có thể đăng nhập và bắt đầu đăng sản phẩm, nhận báo giá trên nền tảng FurniMatch.</p>
            ";
            try
            {
                await _emailService.SendEmailAsync(user.Email, "Đơn đăng ký đã được duyệt - FurniMatch", emailBody);
            }
            catch { }

            return Ok(new { message = "Đã duyệt đơn đăng ký thành công." });
        }

        [HttpPost("reject-seller/{id}")]
        public async Task<IActionResult> RejectSeller(int id, [FromBody] RejectSellerDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null || user.Status != "PENDING_APPROVAL")
                return NotFound(new { message = "Không tìm thấy yêu cầu chờ duyệt hợp lệ." });

            user.Status = "REJECTED";
            await _context.SaveChangesAsync();

            var emailBody = $@"
                <h2>Rất tiếc! Đơn đăng ký Nhà Sản Xuất của bạn đã bị từ chối</h2>
                <p>Chúng tôi đã xem xét hồ sơ của bạn, tuy nhiên đơn đăng ký đã bị từ chối với lý do sau:</p>
                <div style='padding: 15px; background-color: #f8d7da; color: #721c24; border-radius: 5px; margin: 20px 0;'>
                    {dto.Reason}
                </div>
                <p>Vui lòng cập nhật lại thông tin hoặc liên hệ hỗ trợ để được giải đáp.</p>
            ";
            try
            {
                await _emailService.SendEmailAsync(user.Email, "Đơn đăng ký bị từ chối - FurniMatch", emailBody);
            }
            catch { }

            return Ok(new { message = "Đã từ chối đơn đăng ký thành công." });
        }

        [HttpGet("payment-config")]
        public async Task<IActionResult> GetPaymentConfig()
        {
            var config = await _context.PaymentQrConfigs.OrderByDescending(x => x.UpdatedAt).FirstOrDefaultAsync();
            return Ok(config ?? new PaymentQrConfig());
        }

        [HttpPost("payment-config")]
        public async Task<IActionResult> SavePaymentConfig([FromBody] PaymentQrConfig input)
        {
            var config = await _context.PaymentQrConfigs.OrderByDescending(x => x.UpdatedAt).FirstOrDefaultAsync();
            if (config == null) { config = new PaymentQrConfig(); _context.PaymentQrConfigs.Add(config); }
            config.PartnerCode = input.PartnerCode; config.AccessKey = input.AccessKey; config.SecretKey = input.SecretKey;
            config.EndpointUrl = input.EndpointUrl; config.RedirectUrl = input.RedirectUrl; config.IpnUrl = input.IpnUrl;
            config.PaymentTimeoutMinutes = Math.Clamp(input.PaymentTimeoutMinutes, 1, 120); config.IsActive = input.IsActive; config.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(); return Ok(config);
        }
    }

    public class RejectSellerDto
    {
        public string Reason { get; set; } = string.Empty;
    }

    public class UpdateStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }
}
