using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FurniMatch.Api.Models
{
    public class EscrowWallet
    {
        public int EscrowWalletId { get; set; }

        public int UserId { get; set; }
        public User? User { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal AvailableBalance { get; set; } = 0;

        [Column(TypeName = "decimal(18,2)")]
        public decimal FrozenBalance { get; set; } = 0;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
