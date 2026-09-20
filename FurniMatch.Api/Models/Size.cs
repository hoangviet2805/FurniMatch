using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.Models
{
    public class Size
    {
        public int SizeId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public double Width { get; set; }
        public double Height { get; set; }
        public bool IsStandard { get; set; } = true;

        public ICollection<ProductVariant> ProductVariants { get; set; } = new List<ProductVariant>();
    }
}
