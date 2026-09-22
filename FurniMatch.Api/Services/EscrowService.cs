using System;
using System.Threading.Tasks;
using FurniMatch.Api.Data;
using FurniMatch.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FurniMatch.Api.Services
{
    /// <summary>
    /// Xử lý logic giải ngân cho seller: cộng tiền vào EscrowWallet, ghi EscrowTransaction.
    /// </summary>
    public class EscrowService
    {
        private readonly FurniMatchDbContext _db;
        private readonly IEmailService _emailService;
        private readonly ILogger<EscrowService> _logger;

        public EscrowService(FurniMatchDbContext db, IEmailService emailService, ILogger<EscrowService> logger)
        {
            _db = db;
            _emailService = emailService;
            _logger = logger;
        }

        /// <summary>
        /// Giải ngân cho seller: cộng NetAmount vào AvailableBalance.
        /// NetAmount = Subtotal - (Subtotal * commissionRate / 100)
        /// </summary>
        public async Task ReleasePayoutAsync(Order order, decimal commissionRate)
        {
            var netAmount = order.Subtotal - (order.Subtotal * commissionRate / 100m);

            // Tìm hoặc tạo ví cho seller
            var wallet = await _db.EscrowWallets
                .FirstOrDefaultAsync(w => w.UserId == order.SellerId);

            if (wallet == null)
            {
                wallet = new EscrowWallet { UserId = order.SellerId, AvailableBalance = 0, FrozenBalance = 0, UpdatedAt = DateTime.UtcNow };
                _db.EscrowWallets.Add(wallet);
                await _db.SaveChangesAsync();
            }

            wallet.AvailableBalance += netAmount;
            wallet.UpdatedAt = DateTime.UtcNow;

            // Ghi lịch sử giao dịch
            _db.EscrowTransactions.Add(new EscrowTransaction
            {
                EscrowWalletId = wallet.EscrowWalletId,
                OrderId = order.OrderId,
                Amount = netAmount,
                TransactionType = "RELEASE",
                Description = $"Giải ngân đơn hàng {order.OrderCode} (đã trừ {commissionRate}% hoa hồng)",
                CreatedAt = DateTime.UtcNow
            });

            // Cập nhật trạng thái giải ngân
            order.PayoutStatus = "RELEASED";
            order.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            // Thông báo cho seller
            await NotifySellerAsync(order, netAmount, commissionRate);

            _logger.LogInformation(
                "Đã giải ngân {Amount:N0}đ cho seller {SellerId} từ đơn {OrderCode}",
                netAmount, order.SellerId, order.OrderCode);
        }

        private async Task NotifySellerAsync(Order order, decimal netAmount, decimal commissionRate)
        {
            var seller = await _db.Users.FindAsync(order.SellerId);
            if (seller == null) return;

            // Tạo Notification trong DB
            _db.Notifications.Add(new Notification
            {
                UserId = order.SellerId,
                Title = "Giải ngân thành công 💰",
                Message = $"Đơn {order.OrderCode} đã được giải ngân {netAmount:N0}đ vào ví của bạn (sau khi trừ {commissionRate}% hoa hồng).",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            // Gửi email
            try
            {
                var emailBody = $@"
                    <h2>💰 Giải ngân thành công!</h2>
                    <p>Đơn hàng <strong>{order.OrderCode}</strong> đã hoàn thành và tiền đã được giải ngân vào ví của bạn.</p>
                    <table style='border-collapse:collapse;width:100%;'>
                        <tr><td style='padding:8px;border:1px solid #ddd;'>Mã đơn hàng</td><td style='padding:8px;border:1px solid #ddd;'>{order.OrderCode}</td></tr>
                        <tr><td style='padding:8px;border:1px solid #ddd;'>Doanh thu đơn hàng</td><td style='padding:8px;border:1px solid #ddd;'>{order.Subtotal:N0}đ</td></tr>
                        <tr><td style='padding:8px;border:1px solid #ddd;'>Hoa hồng ({commissionRate}%)</td><td style='padding:8px;border:1px solid #ddd;'>-{order.Subtotal * commissionRate / 100:N0}đ</td></tr>
                        <tr style='font-weight:bold;background:#f0fff4;'><td style='padding:8px;border:1px solid #ddd;'>Số tiền nhận được</td><td style='padding:8px;border:1px solid #ddd;color:#16a34a;'>{netAmount:N0}đ</td></tr>
                    </table>
                    <p style='margin-top:16px;'>Đăng nhập vào <a href='http://localhost:5173'>FurniMatch</a> để xem số dư ví và tạo yêu cầu rút tiền.</p>
                ";
                await _emailService.SendEmailAsync(seller.Email, $"Giải ngân đơn {order.OrderCode} - FurniMatch", emailBody);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Không gửi được email giải ngân cho {Email}: {Msg}", seller.Email, ex.Message);
            }
        }
    }
}
