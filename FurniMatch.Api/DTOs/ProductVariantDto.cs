namespace FurniMatch.Api.DTOs
{
    public class ProductVariantDto
    {
        public string? SizeName { get; set; }
        public int? Width { get; set; }
        public int? Height { get; set; }
        public int? Length { get; set; }
        public decimal Price { get; set; }
        public int ProductionDays { get; set; }
    }
}
