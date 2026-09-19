using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

namespace FurniMatch.Api.DTOs
{
    public class RegisterDto
    {
        [Required]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public string? Phone { get; set; }

        [Required]
        public string Password { get; set; } = string.Empty;

        [Required]
        public string RoleName { get; set; } = "CUSTOMER"; // CUSTOMER or SELLER
        
        // Fields for Seller
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

        public List<IFormFile>? Documents { get; set; }
    }
}
