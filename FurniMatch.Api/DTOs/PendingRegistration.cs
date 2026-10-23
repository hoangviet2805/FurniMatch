using System;
using System.Collections.Generic;

namespace FurniMatch.Api.DTOs
{
    public class PendingRegistration
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string PasswordHash { get; set; } = string.Empty;
        public int RoleId { get; set; }
        public string RoleName { get; set; } = "CUSTOMER";

        // Seller details
        public string? ShopName { get; set; }
        public string? ShopDescription { get; set; }
        public bool IsCustomSizeSupported { get; set; }

        // Geolocation
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string? Province { get; set; }
        public string? District { get; set; }
        public string? Ward { get; set; }
        public string? AddressDetail { get; set; }

        // Uploaded seller document URLs
        public List<string> DocumentUrls { get; set; } = new();

        // OTP
        public string OtpCode { get; set; } = string.Empty;
        public DateTime ExpiryTime { get; set; }
    }
}
