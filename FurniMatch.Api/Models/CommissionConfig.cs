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

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public string? Note { get; set; }
    }
}
