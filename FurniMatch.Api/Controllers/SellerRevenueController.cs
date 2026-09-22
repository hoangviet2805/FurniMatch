using System.Security.Claims;
using FurniMatch.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FurniMatch.Api.Controllers
{
    [ApiController]
    [Route("api/seller/revenue")]
    [Authorize(Roles = "SELLER")]
    public class SellerRevenueController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;
        public SellerRevenueController(FurniMatchDbContext context) { _context = context; }
        private int SellerId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        private async Task<decimal> GetCurrentCommissionRate()
        {
            var config = await _context.CommissionConfigs
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.UpdatedAt)
                .FirstOrDefaultAsync();
            return config?.CommissionRate ?? 5.0m;
        }

        /// <summary>
        /// Tổng quan doanh thu của seller hiện tại
        /// GET /api/seller/revenue/summary?from=2026-01-01&to=2026-12-31
        /// </summary>
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary([FromQuery] string? from, [FromQuery] string? to)
        {
            var commissionRate = await GetCurrentCommissionRate();
            var query = _context.Orders.Where(o => o.SellerId == SellerId && o.PaymentStatus == "PAID");
            if (DateTime.TryParse(from, out var fromDate)) query = query.Where(o => o.CreatedAt >= fromDate);
            if (DateTime.TryParse(to, out var toDate)) query = query.Where(o => o.CreatedAt <= toDate.AddDays(1));

            var orders = await query.ToListAsync();
            var totalGmv = orders.Sum(o => o.Subtotal);
            var totalCommission = totalGmv * (commissionRate / 100);

            // Count completed orders
            var completedOrders = orders.Count(o => o.OrderStatus == "COMPLETED");

            return Ok(new
            {
                totalGmv,
                totalCommission,
                commissionRate,
                netRevenue = totalGmv - totalCommission,
                totalPaidOrders = orders.Count,
                completedOrders
            });
        }

        /// <summary>
        /// Biểu đồ doanh thu theo tháng/tuần của seller
        /// GET /api/seller/revenue/chart?period=monthly&year=2026
        /// </summary>
        [HttpGet("chart")]
        public async Task<IActionResult> GetChart([FromQuery] string period = "monthly", [FromQuery] int year = 0)
        {
            if (year == 0) year = DateTime.UtcNow.Year;
            var orders = await _context.Orders
                .Where(o => o.SellerId == SellerId && o.PaymentStatus == "PAID" && o.CreatedAt.Year == year)
                .ToListAsync();

            var commissionRate = await GetCurrentCommissionRate();

            if (period == "monthly")
            {
                var data = Enumerable.Range(1, 12).Select(m => new
                {
                    label = new DateTime(year, m, 1).ToString("MMM", new System.Globalization.CultureInfo("vi-VN")),
                    month = m,
                    gmv = orders.Where(o => o.CreatedAt.Month == m).Sum(o => o.Subtotal),
                    commission = orders.Where(o => o.CreatedAt.Month == m).Sum(o => o.Subtotal) * (commissionRate / 100),
                    orders = orders.Count(o => o.CreatedAt.Month == m)
                }).ToList();
                return Ok(data);
            }
            else
            {
                var data = Enumerable.Range(0, 12).Select(w =>
                {
                    var weekStart = DateTime.UtcNow.AddDays(-7 * (11 - w));
                    var weekEnd = weekStart.AddDays(7);
                    var gmv = orders.Where(o => o.CreatedAt >= weekStart && o.CreatedAt < weekEnd).Sum(o => o.Subtotal);
                    return new
                    {
                        label = $"Tuần {weekStart:dd/MM}",
                        gmv,
                        commission = gmv * (commissionRate / 100),
                        orders = orders.Count(o => o.CreatedAt >= weekStart && o.CreatedAt < weekEnd)
                    };
                }).ToList();
                return Ok(data);
            }
        }

        /// <summary>
        /// Danh sách đơn hàng đã thanh toán của seller (phân trang)
        /// GET /api/seller/revenue/orders?page=1&pageSize=10&from=&to=
        /// </summary>
        [HttpGet("orders")]
        public async Task<IActionResult> GetOrders(
            [FromQuery] string? from,
            [FromQuery] string? to,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var commissionRate = await GetCurrentCommissionRate();
            var query = _context.Orders
                .Include(o => o.Customer)
                .Where(o => o.SellerId == SellerId && o.PaymentStatus == "PAID");

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
                    netRevenue = o.Subtotal - o.Subtotal * (commissionRate / 100),
                    o.PaymentStatus,
                    o.OrderStatus,
                    o.CreatedAt,
                    o.Note,
                    CustomerName = o.Customer != null ? o.Customer.FullName : "N/A"
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, commissionRate, data = orders });
        }
    }
}
