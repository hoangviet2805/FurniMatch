using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.Models
{
    public class ProductVariant
    {
        [Key]
        public int VariantId { get; set; }

        public int ProductId { get; set; }
        public Product? Product { get; set; }

        public int SizeId { get; set; }
        public Size? Size { get; set; }

        public int MaterialId { get; set; }
        public Material? Material { get; set; }

        [MaxLength(50)]
        public string? Color { get; set; }

        [MaxLength(50)]
        public string? FrameType { get; set; }

        public decimal Price { get; set; }
        public int Stock { get; set; }
    }
}
