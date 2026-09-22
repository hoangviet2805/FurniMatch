using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FurniMatch.Api.Models
{
    public class EscrowTransaction
    {
        public int EscrowTransactionId { get; set; }

        public int EscrowWalletId { get; set; }
        public EscrowWallet? EscrowWallet { get; set; }

        public int? EContractId { get; set; }
        public EContract? EContract { get; set; }

        public int? OrderId { get; set; }
        public Order? Order { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        // DEPOSIT, FREEZE, RELEASE, REFUND
        public string TransactionType { get; set; } = string.Empty;
        
        public string Description { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
