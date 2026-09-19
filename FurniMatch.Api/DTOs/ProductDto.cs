using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace FurniMatch.Api.DTOs
{
    public class ProductDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        public int CategoryId { get; set; }

        public string? Description { get; set; }

        public decimal Price { get; set; }

        public int ProductionDays { get; set; }

        public bool CustomSizeSupported { get; set; }

        public int? Length { get; set; }
        public int? Width { get; set; }
        public int? Height { get; set; }
    }
}
