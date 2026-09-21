using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.Models
{
    public class FooterSetting
    {
        [Key]
        public int Id { get; set; }
        
        public string? Description { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? FacebookLink { get; set; }
        public string? InstagramLink { get; set; }
        public string? ZaloLink { get; set; }

        // Home settings
        public string? HomeTitle { get; set; }
        public string? HomeSubtitle { get; set; }
    }
}
