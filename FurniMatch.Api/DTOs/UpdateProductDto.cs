namespace FurniMatch.Api.DTOs
{
    public class UpdateProductDto
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public bool CustomSizeSupported { get; set; }
    }
}
