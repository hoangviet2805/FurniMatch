using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.Models
{
    public class QuotationRequest
    {
        public int QuotationRequestId { get; set; }

        public int CustomerId { get; set; }
        public User? Customer { get; set; }

        public int CategoryId { get; set; }
        public Category? Category { get; set; }

        [MaxLength(100)]
        public string? ProductType { get; set; }

        [MaxLength(100)]
        public string? Pattern { get; set; }

        public double Length { get; set; }
        public double Width { get; set; }
        public double Height { get; set; }

        [MaxLength(100)]
        public string? Material { get; set; }

        [MaxLength(100)]
        public string? FrameType { get; set; }

        [MaxLength(50)]
        public string? Color { get; set; }

        public int Quantity { get; set; }

        public decimal? BudgetMin { get; set; }
        public decimal? BudgetMax { get; set; }

        public string? Description { get; set; }

        public string Status { get; set; } = "OPEN"; // OPEN, RECEIVING_QUOTES, SELLER_SELECTED, COMPLETED, EXPIRED, CANCELLED

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ExpiredAt { get; set; }

        public ICollection<Quotation> Quotations { get; set; } = new List<Quotation>();
    }
}
