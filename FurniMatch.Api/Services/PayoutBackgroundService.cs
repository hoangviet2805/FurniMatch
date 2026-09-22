using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FurniMatch.Api.Data;
using FurniMatch.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FurniMatch.Api.Services
{
    /// <summary>
    /// Background job chạy mỗi 60 phút, tự động giải ngân cho seller
    /// khi đơn hàng đã COMPLETED quá N ngày mà không có khiếu nại.
    /// </summary>
    public class PayoutBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<PayoutBackgroundService> _logger;
        // Quét mỗi 2 phút để xử lý kịp thời các cấu hình theo giờ/phút
        private static readonly TimeSpan Interval = TimeSpan.FromMinutes(2);

        public PayoutBackgroundService(IServiceScopeFactory scopeFactory, ILogger<PayoutBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("PayoutBackgroundService started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessPendingPayoutsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi trong PayoutBackgroundService");
                }

                await Task.Delay(Interval, stoppingToken);
            }
        }

        private async Task ProcessPendingPayoutsAsync()
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<FurniMatchDbContext>();
            var escrowService = scope.ServiceProvider.GetRequiredService<EscrowService>();

            // Lấy cấu hình hoa hồng & thời gian chờ (ngày, giờ, phút)
            var config = await db.CommissionConfigs
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

            if (totalDelay < TimeSpan.Zero) totalDelay = TimeSpan.FromDays(3);

            var cutoffDate = DateTime.UtcNow.Subtract(totalDelay);

            // Lấy đơn hàng đủ điều kiện giải ngân:
            // - OrderStatus = COMPLETED
            // - PayoutStatus = PENDING
            // - CompletedAt + delayDays <= Now (đã qua thời gian chờ)
            // - Không có khiếu nại OPEN
            var ordersToRelease = await db.Orders
                .Where(o =>
                    o.OrderStatus == "COMPLETED" &&
                    o.PayoutStatus == "PENDING" &&
                    o.CompletedAt != null &&
                    o.CompletedAt <= cutoffDate &&
                    !db.OrderDisputes.Any(d => d.OrderId == o.OrderId && d.Status == "OPEN"))
                .ToListAsync();

            if (ordersToRelease.Count == 0)
            {
                _logger.LogDebug("Không có đơn nào cần giải ngân lúc {Time}", DateTime.UtcNow);
                return;
            }

            _logger.LogInformation("Bắt đầu giải ngân {Count} đơn hàng...", ordersToRelease.Count);

            foreach (var order in ordersToRelease)
            {
                try
                {
                    await escrowService.ReleasePayoutAsync(order, commissionRate);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi giải ngân đơn {OrderCode}", order.OrderCode);
                }
            }

            _logger.LogInformation("Hoàn tất giải ngân {Count} đơn.", ordersToRelease.Count);
        }
    }
}
