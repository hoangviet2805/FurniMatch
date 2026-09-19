using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FurniMatch.Api.Models
{
    public class EContract
    {
        public int EContractId { get; set; }

        public int QuotationId { get; set; }
        public Quotation? Quotation { get; set; }

        public int CustomerId { get; set; }
        public User? Customer { get; set; }

        public int SellerId { get; set; }
        public User? Seller { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DepositAmount { get; set; }

        public string TermsAndConditions { get; set; } = string.Empty;

        // DRAFT, SIGNED_BY_CUSTOMER, SIGNED_BY_SELLER, ACTIVE, COMPLETED, CANCELLED
        public string Status { get; set; } = "DRAFT"; 

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? SignedAt { get; set; }
    }
}
