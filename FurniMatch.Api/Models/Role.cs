using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.Models
{
    public class Role
    {
        public int RoleId { get; set; }

        [Required]
        [MaxLength(50)]
        public string RoleName { get; set; } = string.Empty; // ADMIN, SELLER, CUSTOMER

        public ICollection<User> Users { get; set; } = new List<User>();
    }
}
