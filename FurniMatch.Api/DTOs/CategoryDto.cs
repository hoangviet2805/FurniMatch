using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.DTOs
{
    public class CategoryDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }
    }
}
