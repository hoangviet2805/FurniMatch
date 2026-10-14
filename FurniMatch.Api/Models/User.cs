using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace FurniMatch.Api.Models
{
    public class User
    {
        public int UserId { get; set; }

        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(100)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Phone { get; set; }

        [Required]
        [JsonIgnore]
        public string PasswordHash { get; set; } = string.Empty;

        public int RoleId { get; set; }
        public Role? Role { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // For Seller Profile
        public string? ShopName { get; set; }
        public string? ShopDescription { get; set; }
        public string? AvatarUrl { get; set; }
        public string? CoverUrl { get; set; }
        public bool IsCustomSizeSupported { get; set; } = false;

        public string Status { get; set; } = "ACTIVE"; // ACTIVE, PENDING, BANNED

        // Bổ sung cho tính năng định vị (Geolocation)
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }

        public string? Province { get; set; }
        public string? District { get; set; }
        public string? Ward { get; set; }
        public string? AddressDetail { get; set; }

        [JsonIgnore]
        public string? ResetPasswordToken { get; set; }

        [JsonIgnore]
        public DateTime? ResetPasswordTokenExpiry { get; set; }

        [JsonIgnore]
        public ICollection<Product> Products { get; set; } = new List<Product>();

        [JsonIgnore]
        public ICollection<QuotationRequest> QuotationRequests { get; set; } = new List<QuotationRequest>();

        [JsonIgnore]
        public ICollection<Quotation> Quotations { get; set; } = new List<Quotation>();

        [JsonIgnore]
        public ICollection<SellerDocument> SellerDocuments { get; set; } = new List<SellerDocument>();
    }
}
