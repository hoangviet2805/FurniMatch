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

        [HttpGet("commission-config")]
        public async Task<IActionResult> GetCommissionConfig()
        {
            var config = await _context.CommissionConfigs
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.UpdatedAt)
                .FirstOrDefaultAsync();
            return Ok(config ?? new FurniMatch.Api.Models.CommissionConfig { CommissionRate = 5.0m });
        }

        [HttpPut("commission-config")]
        public async Task<IActionResult> SaveCommissionConfig([FromBody] CommissionConfigDto dto)
        {
            var config = await _context.CommissionConfigs
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.UpdatedAt)
                .FirstOrDefaultAsync();
            if (config == null)
            {
                config = new FurniMatch.Api.Models.CommissionConfig();
                _context.CommissionConfigs.Add(config);
            }
            config.CommissionRate = Math.Clamp(dto.CommissionRate, 0, 100);
            config.Note = dto.Note;
            config.IsActive = true;
            config.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(config);
        }

        [HttpGet("revenue/summary")]
        public async Task<IActionResult> GetRevenueSummary([FromQuery] string? from, [FromQuery] string? to)
        {
            var commissionRate = await GetCurrentCommissionRate();
            var query = _context.Orders.Where(o => o.PaymentStatus == "PAID");
            if (DateTime.TryParse(from, out var fromDate)) query = query.Where(o => o.CreatedAt >= fromDate);
            if (DateTime.TryParse(to, out var toDate)) query = query.Where(o => o.CreatedAt <= toDate.AddDays(1));

            var orders = await query.ToListAsync();
            var totalGmv = orders.Sum(o => o.Subtotal);
            var totalCommission = totalGmv * (commissionRate / 100);
            var activeSellers = await _context.Users
                .Include(u => u.Role)
                .CountAsync(u => u.Role!.RoleName == "SELLER" && u.Status == "ACTIVE");

            return Ok(new
            {
                totalGmv,
                totalCommission,
                commissionRate,
                totalPaidOrders = orders.Count,
                activeSellers
            });
        }

        [HttpGet("revenue/chart")]
        public async Task<IActionResult> GetRevenueChart([FromQuery] string period = "monthly", [FromQuery] int year = 0)
        {
            if (year == 0) year = DateTime.UtcNow.Year;
            var orders = await _context.Orders
                .Where(o => o.PaymentStatus == "PAID" && o.CreatedAt.Year == year)
                .ToListAsync();

            if (period == "monthly")
            {
                var data = Enumerable.Range(1, 12).Select(m => new
                {
                    label = new DateTime(year, m, 1).ToString("MMM", new System.Globalization.CultureInfo("vi-VN")),
                    month = m,
                    gmv = orders.Where(o => o.CreatedAt.Month == m).Sum(o => o.Subtotal),
                    orders = orders.Count(o => o.CreatedAt.Month == m)
                }).ToList();
                return Ok(data);
            }
            else // weekly - last 12 weeks
            {
                var data = Enumerable.Range(0, 12).Select(w =>
                {
                    var weekStart = DateTime.UtcNow.AddDays(-7 * (11 - w));
                    var weekEnd = weekStart.AddDays(7);
                    return new
                    {
                        label = $"Tuần {weekStart:dd/MM}",
                        gmv = orders.Where(o => o.CreatedAt >= weekStart && o.CreatedAt < weekEnd).Sum(o => o.Subtotal),
                        orders = orders.Count(o => o.CreatedAt >= weekStart && o.CreatedAt < weekEnd)
                    };
                }).ToList();
                return Ok(data);
            }
        }

        [HttpGet("revenue/by-seller")]
        public async Task<IActionResult> GetRevenueBySeller([FromQuery] string? from, [FromQuery] string? to)
        {
            var commissionRate = await GetCurrentCommissionRate();
            var query = _context.Orders.Where(o => o.PaymentStatus == "PAID");
            if (DateTime.TryParse(from, out var fromDate)) query = query.Where(o => o.CreatedAt >= fromDate);
            if (DateTime.TryParse(to, out var toDate)) query = query.Where(o => o.CreatedAt <= toDate.AddDays(1));

            var orders = await query.Include(o => o.Seller).ToListAsync();
            var data = orders
                .GroupBy(o => o.SellerId)
                .Select(g =>
                {
                    var gmv = g.Sum(o => o.Subtotal);
                    var commission = gmv * (commissionRate / 100);
                    return new
                    {
                        sellerId = g.Key,
                        shopName = g.First().Seller?.ShopName ?? g.First().Seller?.FullName ?? "N/A",
                        totalOrders = g.Count(),
                        gmv,
                        commission,
                        netRevenue = gmv - commission
                    };
                })
                .OrderByDescending(x => x.gmv)
                .ToList();
            return Ok(data);
        }

        [HttpGet("revenue/orders")]
        public async Task<IActionResult> GetRevenueOrders(
            [FromQuery] string? from,
            [FromQuery] string? to,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var commissionRate = await GetCurrentCommissionRate();
            var query = _context.Orders
                .Include(o => o.Seller)
                .Include(o => o.Customer)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
                query = query.Where(o => o.PaymentStatus == status);
            else
                query = query.Where(o => o.PaymentStatus == "PAID");

            if (DateTime.TryParse(from, out var fromDate)) query = query.Where(o => o.CreatedAt >= fromDate);
            if (DateTime.TryParse(to, out var toDate)) query = query.Where(o => o.CreatedAt <= toDate.AddDays(1));

            var total = await query.CountAsync();
            var orders = await query
                .OrderByDescending(o => o.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(o => new
                {
                    o.OrderId,
                    o.OrderCode,
                    o.Subtotal,
                    o.ShippingFee,
                    o.TotalAmount,
                    commission = o.Subtotal * (commissionRate / 100),
                    o.PaymentStatus,
                    o.OrderStatus,
                    o.CreatedAt,
                    SellerShopName = o.Seller != null ? (o.Seller.ShopName ?? o.Seller.FullName) : "N/A",
                    CustomerName = o.Customer != null ? o.Customer.FullName : "N/A"
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, data = orders });
        }

        private async Task<decimal> GetCurrentCommissionRate()
        {
            var config = await _context.CommissionConfigs
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.UpdatedAt)
                .FirstOrDefaultAsync();
            return config?.CommissionRate ?? 5.0m;
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

    public class CommissionConfigDto
    {
        public decimal CommissionRate { get; set; } = 5.0m;
        public string? Note { get; set; }
    }
}
