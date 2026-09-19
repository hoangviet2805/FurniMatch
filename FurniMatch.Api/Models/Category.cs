using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.Models
{
    public class Category
    {
        public int CategoryId { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public ICollection<Product> Products { get; set; } = new List<Product>();
    }
}
