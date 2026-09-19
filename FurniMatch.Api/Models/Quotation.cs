using System;
using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.Models
{
    public class Quotation
    {
        public int QuotationId { get; set; }

        public int QuotationRequestId { get; set; }
        public QuotationRequest? QuotationRequest { get; set; }

        public int SellerId { get; set; }
        public User? Seller { get; set; }

        public decimal Price { get; set; }
        public int ProductionDays { get; set; }
        public string? Note { get; set; }

        public string Status { get; set; } = "SUBMITTED"; // SUBMITTED, ACCEPTED, REJECTED, EXPIRED

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
