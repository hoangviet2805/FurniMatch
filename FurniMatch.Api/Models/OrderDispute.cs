using System;
using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.Models
{
    public class OrderDispute
    {
        public int OrderDisputeId { get; set; }

        public int OrderId { get; set; }
        public Order? Order { get; set; }

        public int CustomerId { get; set; }
        public User? Customer { get; set; }

        [Required]
        public string Reason { get; set; } = string.Empty;

        /// <summary>
        /// "OPEN" | "RESOLVED" | "REJECTED"
        /// </summary>
        [MaxLength(20)]
        public string Status { get; set; } = "OPEN";

        /// <summary>Ghi chú của Admin khi xử lý khiếu nại</summary>
        public string? AdminNote { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
    }
}
