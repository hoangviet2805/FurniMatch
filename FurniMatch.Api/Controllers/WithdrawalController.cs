using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using FurniMatch.Api.Data;
using FurniMatch.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FurniMatch.Api.Controllers
{
    [ApiController]
    [Route("api/seller/withdrawals")]
    [Authorize(Roles = "SELLER")]
    public class WithdrawalController : ControllerBase
    {
        private readonly FurniMatchDbContext _db;
        public WithdrawalController(FurniMatchDbContext db) { _db = db; }
        private int SellerId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        /// <summary>Seller xem số dư ví</summary>
        [HttpGet("~/api/seller/wallet")]
        public async Task<IActionResult> GetWallet()
        {
            var wallet = await _db.EscrowWallets.FirstOrDefaultAsync(w => w.UserId == SellerId);

            // Tổng tiền đang chờ giải ngân (đơn COMPLETED nhưng chưa RELEASED)
            var commissionRate = await GetCurrentCommissionRate();
            var pendingPayout = await _db.Orders
                .Where(o => o.SellerId == SellerId && o.OrderStatus == "COMPLETED" && o.PayoutStatus == "PENDING")
                .SumAsync(o => (decimal?)(o.Subtotal - o.Subtotal * commissionRate / 100)) ?? 0;

            return Ok(new
            {
                availableBalance = wallet?.AvailableBalance ?? 0,
                frozenBalance = wallet?.FrozenBalance ?? 0,
                pendingPayoutAmount = pendingPayout,
                updatedAt = wallet?.UpdatedAt
            });
        }

        /// <summary>Seller xem lịch sử giao dịch EscrowWallet</summary>
        [HttpGet("~/api/seller/transactions")]
        public async Task<IActionResult> GetTransactions([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var wallet = await _db.EscrowWallets.FirstOrDefaultAsync(w => w.UserId == SellerId);
            if (wallet == null) return Ok(new { total = 0, data = Array.Empty<object>() });

            var query = _db.EscrowTransactions
                .Where(t => t.EscrowWalletId == wallet.EscrowWalletId)
                .OrderByDescending(t => t.CreatedAt);

            var total = await query.CountAsync();
            var data = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(t => new
                {
                    t.EscrowTransactionId,
                    t.Amount,
                    t.TransactionType,
                    t.Description,
                    t.OrderId,
                    t.CreatedAt
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, data });
        }

        /// <summary>Seller tạo yêu cầu rút tiền</summary>
        [HttpPost]
        public async Task<IActionResult> CreateWithdrawal([FromBody] CreateWithdrawalDto dto)
        {
            if (dto.Amount < 10000)
                return BadRequest(new { message = "Số tiền rút tối thiểu là 10,000đ." });

            var wallet = await _db.EscrowWallets.FirstOrDefaultAsync(w => w.UserId == SellerId);
            var available = wallet?.AvailableBalance ?? 0;

            if (available < 10000)
                return BadRequest(new { message = $"Số dư khả dụng của bạn ({available:N0}đ) chưa đủ mức tối thiểu 10,000đ để thực hiện rút tiền." });

            if (dto.Amount > available)
                return BadRequest(new { message = $"Số dư khả dụng không đủ. Hiện có: {available:N0}đ" });

            // Kiểm tra không có yêu cầu đang chờ duyệt
            var hasPending = await _db.WithdrawalRequests
                .AnyAsync(w => w.SellerId == SellerId && w.Status == "PENDING");
            if (hasPending)
                return BadRequest(new { message = "Bạn đang có yêu cầu rút tiền chờ xử lý. Vui lòng đợi Admin duyệt trước khi tạo yêu cầu mới." });

            // Tạm đóng băng số tiền
            wallet!.AvailableBalance -= dto.Amount;
            wallet.FrozenBalance += dto.Amount;
            wallet.UpdatedAt = DateTime.UtcNow;

            var request = new WithdrawalRequest
            {
                SellerId = SellerId,
                Amount = dto.Amount,
                BankName = dto.BankName.Trim(),
                BankAccountNumber = dto.BankAccountNumber.Trim(),
                BankAccountHolder = dto.BankAccountHolder.Trim(),
                Note = dto.Note?.Trim(),
                Status = "PENDING"
            };
            _db.WithdrawalRequests.Add(request);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Yêu cầu rút tiền đã được gửi. Admin sẽ xử lý trong vòng 1-3 ngày làm việc.", requestId = request.WithdrawalRequestId });
        }

        /// <summary>Seller xem lịch sử yêu cầu rút tiền</summary>
        [HttpGet]
        public async Task<IActionResult> GetWithdrawals([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var query = _db.WithdrawalRequests
                .Where(w => w.SellerId == SellerId)
                .OrderByDescending(w => w.CreatedAt);

            var total = await query.CountAsync();
            var data = await query
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
                    w.ProcessedAt
                })
                .ToListAsync();

            return Ok(new { total, page, pageSize, data });
        }

        private async Task<decimal> GetCurrentCommissionRate()
        {
            var config = await _db.CommissionConfigs
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.UpdatedAt)
                .FirstOrDefaultAsync();
            return config?.CommissionRate ?? 5.0m;
        }
    }

    public class CreateWithdrawalDto
    {
        public decimal Amount { get; set; }
        public string BankName { get; set; } = string.Empty;
        public string BankAccountNumber { get; set; } = string.Empty;
        public string BankAccountHolder { get; set; } = string.Empty;
        public string? Note { get; set; }
    }
}
