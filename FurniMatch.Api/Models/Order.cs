using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FurniMatch.Api.Models
{
    public class Order
    {
        [Key]
        public int OrderId { get; set; }

        [Required]
        [MaxLength(50)]
        public string OrderCode { get; set; } = string.Empty;

        public int CustomerId { get; set; }
        public User? Customer { get; set; }

        // SellerId của sản phẩm đầu tiên trong đơn (để seller quản lý)
        public int SellerId { get; set; }
        public User? Seller { get; set; }

        // JSON serialized list of order items
        [Required]
        public string ItemsJson { get; set; } = "[]";

        [Required]
        [MaxLength(200)]
        public string RecipientName { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string RecipientPhone { get; set; } = string.Empty;

        [Required]
        public string Address { get; set; } = string.Empty;

        public string? Note { get; set; }

        // Tương thích với bảng Orders đã có từ phiên bản trước.
        // Các cột này vẫn bắt buộc trong cơ sở dữ liệu cũ.
        [Column("Status")]
        public string LegacyStatus { get; set; } = "CONFIRMED";

        [Column("ShippingAddress")]
        public string LegacyShippingAddress { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Subtotal { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal ShippingFee { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }

        // SePay is the only supported payment method for newly created orders.
        [MaxLength(20)]
        public string PaymentMethod { get; set; } = "SEPAY";

        // "PENDING" | "PAID" | "FAILED" | "EXPIRED"
        [MaxLength(20)]
        public string PaymentStatus { get; set; } = "PENDING";

        // "WAITING_PAYMENT" | "CONFIRMED" | "PRODUCING" | "SHIPPED" | "COMPLETED" | "CANCELLED"
        [MaxLength(30)]
        public string OrderStatus { get; set; } = "WAITING_PAYMENT";

        // MoMo specific fields
        public string? MomoOrderId { get; set; }
        public string? MomoTransId { get; set; }
        public string? MomoQrCodeUrl { get; set; }
        public string? MomoDeeplink { get; set; }
        public string? MomoPayUrl { get; set; }

        public DateTime? PaymentExpiredAt { get; set; }

        /// <summary>Thời điểm đơn hàng được đánh dấu COMPLETED</summary>
        public DateTime? CompletedAt { get; set; }

        /// <summary>
        /// Trạng thái giải ngân cho seller.
        /// "PENDING" | "RELEASED" | "DISPUTED"
        /// </summary>
        [MaxLength(20)]
        public string PayoutStatus { get; set; } = "PENDING";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
