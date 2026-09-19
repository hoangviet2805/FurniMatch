using System;
using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.Models
{
    public class SellerDocument
    {
        [Key]
        public int DocumentId { get; set; }

        public int UserId { get; set; }
        public User? User { get; set; }

        [Required]
        [MaxLength(500)]
        public string ImageUrl { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
