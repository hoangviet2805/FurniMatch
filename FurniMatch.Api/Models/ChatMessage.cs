using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FurniMatch.Api.Models
{
    public class ChatMessage
    {
        [Key]
        public int ChatMessageId { get; set; }

        [Required]
        public int SenderId { get; set; }
        public User? Sender { get; set; }

        [Required]
        public int ReceiverId { get; set; }
        public User? Receiver { get; set; }

        public int? ProductId { get; set; }
        public Product? Product { get; set; }

        [Required]
        public string Content { get; set; } = string.Empty;

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
