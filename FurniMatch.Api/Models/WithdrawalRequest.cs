using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FurniMatch.Api.Models
{
    public class WithdrawalRequest
    {
        public int WithdrawalRequestId { get; set; }

        public int SellerId { get; set; }
        public User? Seller { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [Required]
        [MaxLength(100)]
        public string BankName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string BankAccountNumber { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string BankAccountHolder { get; set; } = string.Empty;

        public string? Note { get; set; }

        /// <summary>
        /// "PENDING" | "APPROVED" | "REJECTED"
        /// </summary>
        [MaxLength(20)]
        public string Status { get; set; } = "PENDING";

        /// <summary>Lý do từ chối hoặc ghi chú giao dịch của Admin</summary>
        public string? AdminNote { get; set; }

        /// <summary>Đường dẫn hình ảnh bill / chứng từ chuyển khoản Admin đính kèm khi duyệt</summary>
        [MaxLength(500)]
        public string? PaymentReceiptUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ProcessedAt { get; set; }
    }
}
