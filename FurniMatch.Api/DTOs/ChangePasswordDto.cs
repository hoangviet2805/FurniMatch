using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.DTOs
{
    public class ChangePasswordDto
    {
        [Required]
        public string OldPassword { get; set; }

        [Required]
        public string NewPassword { get; set; }
    }
}
