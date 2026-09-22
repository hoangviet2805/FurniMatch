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
            config.PayoutDelayDays = Math.Max(0, dto.PayoutDelayDays);
            config.PayoutDelayHours = Math.Clamp(dto.PayoutDelayHours, 0, 23);
            config.PayoutDelayMinutes = Math.Clamp(dto.PayoutDelayMinutes, 0, 59);
            config.ReviewDeadlineDays = Math.Max(1, dto.ReviewDeadlineDays);
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
            [FromQuery] int pageSize = 10)
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
                    o.Note,
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

        // ─── WITHDRAWAL MANAGEMENT ───────────────────────────────────────────

        [HttpGet("withdrawals")]
        public async Task<IActionResult> GetWithdrawals([FromQuery] string? status = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var query = _context.WithdrawalRequests
                .Include(w => w.Seller)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
                query = query.Where(w => w.Status == status.ToUpper());

            var total = await query.CountAsync();
            var data = await query
                .OrderByDescending(w => w.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(w => new
                {
                    w.WithdrawalRequestId,
                    w.Amount,
                    w.BankName,
                    w.BankAccountNumber,
                    w.BankAccountHolder,
                    w.Note,
                    w.Status,
                    w.AdminNote,
                    w.PaymentReceiptUrl,
                    w.CreatedAt,
                    w.ProcessedAt,
                    SellerName = w.Seller != null ? (w.Seller.ShopName ?? w.Seller.FullName) : "N/A",
                    SellerEmail = w.Seller != null ? w.Seller.Email : "N/A"
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, data });
        }

        [HttpPut("withdrawals/{id}/approve")]
        public async Task<IActionResult> ApproveWithdrawal(
            int id,
            [FromForm] ApproveWithdrawalForm? form,
            [FromServices] IWebHostEnvironment env)
        {
            var request = await _context.WithdrawalRequests
                .Include(w => w.Seller)
                .FirstOrDefaultAsync(w => w.WithdrawalRequestId == id);

            if (request == null) return NotFound(new { message = "Không tìm thấy yêu cầu." });
            if (request.Status != "PENDING") return BadRequest(new { message = "Yêu cầu này đã được xử lý." });

            // Giải phóng số tiền đóng băng
            var wallet = await _context.EscrowWallets.FirstOrDefaultAsync(w => w.UserId == request.SellerId);
            if (wallet == null) return BadRequest(new { message = "Không tìm thấy ví của seller." });

            wallet.FrozenBalance -= request.Amount;
            wallet.UpdatedAt = DateTime.UtcNow;

            // Xử lý lưu ảnh bill chuyển khoản đính kèm nếu có
            if (form?.ReceiptFile != null && form.ReceiptFile.Length > 0)
            {
                var uploadsFolder = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "uploads", "receipts");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                var ext = Path.GetExtension(form.ReceiptFile.FileName);
                var fileName = $"receipt_{request.WithdrawalRequestId}_{Guid.NewGuid():N}{ext}";
                var filePath = Path.Combine(uploadsFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await form.ReceiptFile.CopyToAsync(stream);
                }

                request.PaymentReceiptUrl = $"/uploads/receipts/{fileName}";
            }

            if (!string.IsNullOrWhiteSpace(form?.Note))
            {
                request.AdminNote = form.Note.Trim();
            }

            request.Status = "APPROVED";
            request.ProcessedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Gửi thông báo chuông cho seller
            _context.Notifications.Add(new Notification
            {
                UserId = request.SellerId,
                Title = "Yêu cầu rút tiền đã được duyệt",
                Message = $"Yêu cầu rút {request.Amount:N0}đ về ngân hàng {request.BankName} ({request.BankAccountNumber}) đã được chuyển khoản thành công." +
                          (!string.IsNullOrEmpty(request.PaymentReceiptUrl) ? " Admin đã đính kèm bill chuyển khoản." : ""),
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            // Gửi email thông báo cho seller
            if (request.Seller != null)
            {
                try
                {
                    var emailBody = $@"
                        <h2>✅ Yêu cầu rút tiền đã được phê duyệt!</h2>
                        <p>Yêu cầu rút <strong>{request.Amount:N0}đ</strong> về tài khoản <strong>{request.BankName} - {request.BankAccountNumber} ({request.BankAccountHolder})</strong> đã được Admin phê duyệt và thực hiện chuyển khoản.</p>
                        {(!string.IsNullOrEmpty(request.AdminNote) ? $"<p><strong>Ghi chú:</strong> {request.AdminNote}</p>" : "")}
                        {(!string.IsNullOrEmpty(request.PaymentReceiptUrl) ? "<p>Hình ảnh chứng từ / bill chuyển khoản đã được lưu vào hệ thống, bạn có thể xem lại tại trang Quản lý Ví của Seller.</p>" : "")}
                    ";
                    await _emailService.SendEmailAsync(request.Seller.Email, "Yêu cầu rút tiền được phê duyệt - FurniMatch", emailBody);
                }
                catch { }
            }

            return Ok(new { 
                message = "Đã phê duyệt yêu cầu rút tiền.", 
                paymentReceiptUrl = request.PaymentReceiptUrl 
            });
        }

        [HttpPut("withdrawals/{id}/reject")]
        public async Task<IActionResult> RejectWithdrawal(int id, [FromBody] AdminNoteDto dto)
        {
            var request = await _context.WithdrawalRequests
                .Include(w => w.Seller)
                .FirstOrDefaultAsync(w => w.WithdrawalRequestId == id);

            if (request == null) return NotFound(new { message = "Không tìm thấy yêu cầu." });
            if (request.Status != "PENDING") return BadRequest(new { message = "Yêu cầu này đã được xử lý." });

            // Hoàn trả số tiền đóng băng về AvailableBalance
            var wallet = await _context.EscrowWallets.FirstOrDefaultAsync(w => w.UserId == request.SellerId);
            if (wallet != null)
            {
                wallet.FrozenBalance -= request.Amount;
                wallet.AvailableBalance += request.Amount;
                wallet.UpdatedAt = DateTime.UtcNow;
            }

            request.Status = "REJECTED";
            request.AdminNote = dto.Note;
            request.ProcessedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Gửi email thông báo lý do từ chối
            if (request.Seller != null)
            {
                try
                {
                    var emailBody = $@"
                        <h2>❌ Yêu cầu rút tiền bị từ chối</h2>
                        <p>Yêu cầu rút <strong>{request.Amount:N0}đ</strong> của bạn đã bị từ chối với lý do:</p>
                        <div style='padding:15px;background:#f8d7da;color:#721c24;border-radius:5px;'>{dto.Note}</div>
                        <p>Số tiền đã được hoàn trả vào số dư khả dụng của bạn. Vui lòng kiểm tra lại thông tin và thử lại.</p>
                    ";
                    await _emailService.SendEmailAsync(request.Seller.Email, "Yêu cầu rút tiền bị từ chối - FurniMatch", emailBody);
                }
                catch { }
            }

            return Ok(new { message = "Đã từ chối yêu cầu rút tiền và hoàn trả số dư." });
        }

        // ─── DISPUTE MANAGEMENT ──────────────────────────────────────────────

        [HttpGet("disputes")]
        public async Task<IActionResult> GetDisputes([FromQuery] string? status = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var query = _context.OrderDisputes
                .Include(d => d.Order)
                .Include(d => d.Customer)
                .AsQueryable();

            if (!string.IsNullOrEmpty(status))
                query = query.Where(d => d.Status == status.ToUpper());
            else
                query = query.Where(d => d.Status == "OPEN");

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
                    OrderAmount = d.Order != null ? d.Order.Subtotal : 0,
                    CustomerName = d.Customer != null ? d.Customer.FullName : "N/A",
                    CustomerEmail = d.Customer != null ? d.Customer.Email : "N/A",
                    d.Reason,
                    d.Status,
                    d.AdminNote,
                    d.CreatedAt,
                    d.ResolvedAt
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, data });
        }

        /// <summary>Admin bác khiếu nại → đơn hàng được giải ngân bình thường</summary>
        [HttpPut("disputes/{id}/reject")]
        public async Task<IActionResult> RejectDispute(int id, [FromBody] AdminNoteDto dto)
        {
            var dispute = await _context.OrderDisputes
                .Include(d => d.Order)
                .FirstOrDefaultAsync(d => d.OrderDisputeId == id);

            if (dispute == null) return NotFound();
            if (dispute.Status != "OPEN") return BadRequest(new { message = "Khiếu nại này đã được xử lý." });

            dispute.Status = "REJECTED";
            dispute.AdminNote = dto.Note;
            dispute.ResolvedAt = DateTime.UtcNow;

            // Trả trạng thái giải ngân về PENDING để background job có thể xử lý
            if (dispute.Order != null && dispute.Order.PayoutStatus == "DISPUTED")
                dispute.Order.PayoutStatus = "PENDING";

            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã bác khiếu nại. Đơn hàng sẽ được giải ngân theo lịch tự động." });
        }

        /// <summary>Admin duyệt khiếu nại → giải ngân bị đóng băng (xử lý thủ công)</summary>
        [HttpPut("disputes/{id}/resolve")]
        public async Task<IActionResult> ResolveDispute(int id, [FromBody] AdminNoteDto dto)
        {
            var dispute = await _context.OrderDisputes
                .Include(d => d.Order)
                .FirstOrDefaultAsync(d => d.OrderDisputeId == id);

            if (dispute == null) return NotFound();
            if (dispute.Status != "OPEN") return BadRequest(new { message = "Khiếu nại này đã được xử lý." });

            dispute.Status = "RESOLVED";
            dispute.AdminNote = dto.Note;
            dispute.ResolvedAt = DateTime.UtcNow;

            // Đánh dấu đơn là DISPUTED — tiền không giải ngân tự động
            if (dispute.Order != null)
                dispute.Order.PayoutStatus = "DISPUTED";

            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã chấp nhận khiếu nại. Đơn hàng sẽ được xử lý thủ công." });
        }

        /// <summary>
        /// Lấy danh sách các đơn hàng hoàn thành đang chờ giải ngân hoặc sẵn sàng giải ngân
        /// </summary>
        [HttpGet("payouts/pending-orders")]
        public async Task<IActionResult> GetPendingPayoutOrders()
        {
            var config = await _context.CommissionConfigs
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.UpdatedAt)
                .FirstOrDefaultAsync();

            var delayDays = config?.PayoutDelayDays ?? 3;
            var delayHours = config?.PayoutDelayHours ?? 0;
            var delayMinutes = config?.PayoutDelayMinutes ?? 0;
            var totalDelay = TimeSpan.FromDays(delayDays).Add(TimeSpan.FromHours(delayHours)).Add(TimeSpan.FromMinutes(delayMinutes));
            var cutoff = DateTime.UtcNow.Subtract(totalDelay);

            var orders = await _context.Orders
                .Where(o => o.OrderStatus == "COMPLETED" && o.PayoutStatus != "RELEASED")
                .OrderByDescending(o => o.CompletedAt)
                .Take(50)
                .Select(o => new
                {
                    o.OrderId,
                    o.OrderCode,
                    o.TotalAmount,
                    o.Subtotal,
                    o.CompletedAt,
                    o.PayoutStatus,
                    HasDispute = _context.OrderDisputes.Any(d => d.OrderId == o.OrderId && d.Status == "OPEN"),
                    IsEligible = o.CompletedAt != null && o.CompletedAt <= cutoff && !_context.OrderDisputes.Any(d => d.OrderId == o.OrderId && d.Status == "OPEN"),
                    SellerName = _context.Users.Where(u => u.UserId == o.SellerId).Select(u => u.ShopName ?? u.FullName).FirstOrDefault() ?? "Người bán",
                    CustomerName = _context.Users.Where(u => u.UserId == o.CustomerId).Select(u => u.FullName).FirstOrDefault() ?? "Khách hàng"
                })
                .ToListAsync();

            return Ok(new
            {
                config = new
                {
                    commissionRate = config?.CommissionRate ?? 5.0m,
                    payoutDelayDays = delayDays,
                    payoutDelayHours = delayHours,
                    payoutDelayMinutes = delayMinutes,
                    totalDelayMinutes = (int)totalDelay.TotalMinutes,
                    reviewDeadlineDays = (config?.ReviewDeadlineDays > 0) ? config.ReviewDeadlineDays : 7
                },
                orders
            });
        }

        /// <summary>
        /// Kích hoạt quét và giải ngân ngay lập tức cho các đơn đủ điều kiện
        /// </summary>
        [HttpPost("payouts/trigger-now")]
        public async Task<IActionResult> TriggerPayoutsNow(
            [FromServices] FurniMatch.Api.Services.EscrowService escrowService,
            [FromServices] ILogger<AdminController> logger)
        {
            var config = await _context.CommissionConfigs
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.UpdatedAt)
                .FirstOrDefaultAsync();

            var commissionRate = config?.CommissionRate ?? 5.0m;
            var delayDays = config?.PayoutDelayDays ?? 3;
            var delayHours = config?.PayoutDelayHours ?? 0;
            var delayMinutes = config?.PayoutDelayMinutes ?? 0;

            var totalDelay = TimeSpan.FromDays(delayDays)
                .Add(TimeSpan.FromHours(delayHours))
                .Add(TimeSpan.FromMinutes(delayMinutes));

            var cutoffDate = DateTime.UtcNow.Subtract(totalDelay);

            var ordersToRelease = await _context.Orders
                .Where(o =>
                    o.OrderStatus == "COMPLETED" &&
                    o.PayoutStatus == "PENDING" &&
                    o.CompletedAt != null &&
                    o.CompletedAt <= cutoffDate &&
                    !_context.OrderDisputes.Any(d => d.OrderId == o.OrderId && d.Status == "OPEN"))
                .ToListAsync();

            int count = 0;
            foreach (var order in ordersToRelease)
            {
                try
                {
                    await escrowService.ReleasePayoutAsync(order, commissionRate);
                    count++;
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Lỗi giải ngân đơn {OrderCode}", order.OrderCode);
                }
            }

            return Ok(new
            {
                processedCount = count,
                message = count > 0 
                    ? $"Đã quét và giải ngân thành công cho {count} đơn hàng đủ điều kiện." 
                    : "Hiện tại không có đơn hàng nào đủ điều kiện giải ngân (chưa qua thời gian chờ hoặc có khiếu nại)."
            });
        }

        /// <summary>
        /// Admin chủ động giải ngân sớm cho 1 đơn hàng cụ thể
        /// </summary>
        [HttpPost("payouts/release-order/{orderId}")]
        public async Task<IActionResult> ReleaseOrderNow(int orderId, [FromServices] FurniMatch.Api.Services.EscrowService escrowService)
        {
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.OrderId == orderId);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng." });
            if (order.PayoutStatus == "RELEASED") return BadRequest(new { message = "Đơn hàng này đã được giải ngân trước đó." });

            var config = await _context.CommissionConfigs
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.UpdatedAt)
                .FirstOrDefaultAsync();
            var commissionRate = config?.CommissionRate ?? 5.0m;

            await escrowService.ReleasePayoutAsync(order, commissionRate);
            return Ok(new { message = $"Đã giải ngân thành công đơn hàng {order.OrderCode} cho người bán." });
        }

        /// <summary>
        /// Admin: Lấy danh sách đánh giá sản phẩm để theo dõi và quản lý
        /// </summary>
        [HttpGet("reviews")]
        public async Task<IActionResult> GetReviews([FromQuery] int page = 1, [FromQuery] int pageSize = 15)
        {
            var query = _context.OrderReviews
                .Include(r => r.Customer)
                .Include(r => r.Order);

            var total = await query.CountAsync();
            var avgRating = total > 0 ? await query.AverageAsync(r => (double)r.Rating) : 5.0;

            var items = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new
                {
                    r.ReviewId,
                    r.OrderId,
                    OrderCode = r.Order != null ? r.Order.OrderCode : "",
                    r.ProductId,
                    r.ProductName,
                    r.Rating,
                    r.Comment,
                    r.MediaJson,
                    r.CreatedAt,
                    CustomerName = r.Customer != null ? r.Customer.FullName : "Khách hàng",
                    CustomerEmail = r.Customer != null ? r.Customer.Email : ""
                })
                .ToListAsync();

            return Ok(new
            {
                total,
                avgRating = Math.Round(avgRating, 1),
                page,
                pageSize,
                data = items
            });
        }

        [HttpDelete("reviews/{reviewId:int}")]
        public async Task<IActionResult> DeleteReview(int reviewId)
        {
            var rev = await _context.OrderReviews.FindAsync(reviewId);
            if (rev == null) return NotFound(new { message = "Không tìm thấy đánh giá." });
            _context.OrderReviews.Remove(rev);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã xóa đánh giá thành công." });
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
        public int PayoutDelayDays { get; set; } = 3;
        public int PayoutDelayHours { get; set; } = 0;
        public int PayoutDelayMinutes { get; set; } = 0;
        /// <summary>Số ngày Customer được phép viết đánh giá kể từ CompletedAt. Mặc định 7.</summary>
        public int ReviewDeadlineDays { get; set; } = 7;
        public string? Note { get; set; }
    }

    public class AdminNoteDto
    {
        public string Note { get; set; } = string.Empty;
    }

    public class ApproveWithdrawalForm
    {
        public IFormFile? ReceiptFile { get; set; }
        public string? Note { get; set; }
    }
}

