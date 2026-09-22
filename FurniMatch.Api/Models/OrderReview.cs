using System;
using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.Models
{
    public class OrderReview
    {
        [Key]
        public int ReviewId { get; set; }

        // FK → Orders
        public int OrderId { get; set; }
        public Order? Order { get; set; }

        // FK → Users (customer who wrote the review)
        public int CustomerId { get; set; }
        public User? Customer { get; set; }

        /// <summary>
        /// ProductId của sản phẩm được đánh giá (lấy từ itemsJson của Order).
        /// Dùng để hiển thị reviews theo sản phẩm trên trang Shop/ProductDetail.
        /// </summary>
        public int ProductId { get; set; }
        public Product? Product { get; set; }

        /// <summary>Tên sản phẩm snapshot tại thời điểm đánh giá (để hiển thị dù sản phẩm bị xóa)</summary>
        [MaxLength(200)]
        public string ProductName { get; set; } = string.Empty;

        /// <summary>Rating từ 1 đến 5 sao</summary>
        [Required]
        [Range(1, 5)]
        public int Rating { get; set; }

        /// <summary>Lời nhận xét, tối đa 300 ký tự</summary>
        [MaxLength(300)]
        public string? Comment { get; set; }

        /// <summary>
        /// JSON array các URL ảnh/video đã upload.
        /// Ví dụ: ["/uploads/reviews/abc.jpg", "/uploads/reviews/xyz.mp4"]
        /// </summary>
        public string? MediaJson { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
