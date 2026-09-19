using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.DTOs
{
    public class UpdateProfileDto
    {
        [Required]
        public string FullName { get; set; } = string.Empty;

        public string? Phone { get; set; }

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
    }
}
