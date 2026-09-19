using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.Models
{
    public class Material
    {
        public int MaterialId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public ICollection<ProductVariant> ProductVariants { get; set; } = new List<ProductVariant>();
    }
}
