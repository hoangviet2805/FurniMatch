namespace FurniMatch.Api.DTOs
{
    public class AuthResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;

        public string? Phone { get; set; }
        public string? ShopName { get; set; }
        public string? ShopDescription { get; set; }
        public bool IsCustomSizeSupported { get; set; }
        
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string? Province { get; set; }
        public string? District { get; set; }
        public string? Ward { get; set; }
        public string? AddressDetail { get; set; }
    }
}
