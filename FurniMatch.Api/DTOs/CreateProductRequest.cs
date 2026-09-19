using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;

namespace FurniMatch.Api.DTOs
{
    public class CreateProductRequest
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public int CategoryId { get; set; }

        public string? Description { get; set; }

        public bool CustomSizeSupported { get; set; }

        [Required]
        public string VariantsJson { get; set; } = string.Empty;

        public List<IFormFile>? Images { get; set; }

        public int ThumbnailIndex { get; set; } = 0;
    }
}
