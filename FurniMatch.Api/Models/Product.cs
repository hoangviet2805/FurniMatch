using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.Models
{
    public class Product
    {
        public int ProductId { get; set; }

        public int SellerId { get; set; }
        public User? Seller { get; set; }

        public int CategoryId { get; set; }
        public Category? Category { get; set; }

        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public decimal Price { get; set; }

        public int ProductionDays { get; set; }

        public bool CustomSizeSupported { get; set; }

        // Bổ sung cho tính năng Không gian 3D
        public int? Length { get; set; }
        public int? Width { get; set; }
        public int? Height { get; set; }

        public string Status { get; set; } = "ACTIVE";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<ProductVariant> ProductVariants { get; set; } = new List<ProductVariant>();
        public ICollection<ProductImage> ProductImages { get; set; } = new List<ProductImage>();
    }
}
