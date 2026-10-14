using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace FurniMatch.Api.Models
{
    public class ProductImage
    {
        [Key]
        public int ProductImageId { get; set; }

        public int ProductId { get; set; }
        
        [ForeignKey("ProductId")]
        [JsonIgnore]
        public Product? Product { get; set; }

        [Required]
        [MaxLength(500)]
        public string ImageUrl { get; set; } = string.Empty;

        public bool IsThumbnail { get; set; } = false;

        public int DisplayOrder { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
