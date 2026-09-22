using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FurniMatch.Api.Models
{
    public class CommissionConfig
    {
        [Key]
        public int CommissionConfigId { get; set; }

        /// <summary>
        /// Tỷ lệ hoa hồng platform tính trên Subtotal của mỗi đơn PAID.
        /// Ví dụ: 5.0 = 5%
        /// </summary>
        [Required]
        [Column(TypeName = "decimal(5,2)")]
        public decimal CommissionRate { get; set; } = 5.0m;

        /// <summary>
        /// Thời điểm tỷ lệ này bắt đầu có hiệu lực
        /// </summary>
        public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;

        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Thời gian chờ sau khi đơn COMPLETED trước khi tự động giải ngân cho seller (theo ngày, giờ, phút).
        /// Mặc định: 3 ngày, 0 giờ, 0 phút. Admin có thể thay đổi.
        /// </summary>
        public int PayoutDelayDays { get; set; } = 3;

        public int PayoutDelayHours { get; set; } = 0;

        public int PayoutDelayMinutes { get; set; } = 0;

        /// <summary>
        /// Số ngày Customer được phép viết đánh giá kể từ lúc Seller đánh dấu đơn COMPLETED.
        /// Admin có thể thay đổi. Mặc định: 7 ngày.
        /// </summary>
        public int ReviewDeadlineDays { get; set; } = 7;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public string? Note { get; set; }
    }
}
