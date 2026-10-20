using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FurniMatch.Api.Models
{
    [Table("TrafficLogs")]
    public class TrafficLog
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public long Id { get; set; }

        [Required]
        [MaxLength(64)]
        public string SessionId { get; set; } = string.Empty;

        [MaxLength(45)]
        public string? IpAddress { get; set; }

        [MaxLength(255)]
        public string? UserAgent { get; set; }

        public int? UserId { get; set; }

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        [Required]
        [MaxLength(30)]
        public string TriggerReason { get; set; } = string.Empty; // TIME_10S, PAGE_DEPTH, CONVERSION_LOGIN, CONVERSION_PAYMENT

        public int PagesCount { get; set; } = 1;

        public int DurationSeconds { get; set; } = 0;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
