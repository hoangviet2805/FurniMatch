namespace FurniMatch.Api.DTOs
{
    public class ProductVariantDto
    {
        public string? SizeName { get; set; }
        public double? Width { get; set; }
        public double? Height { get; set; }
        public double? Length { get; set; }
        public decimal Price { get; set; }
        public int ProductionDays { get; set; }
    }
}
