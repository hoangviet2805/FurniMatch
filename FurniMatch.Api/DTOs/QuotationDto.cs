using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.DTOs
{
    public class QuotationDto
    {
        public int QuotationRequestId { get; set; }

        public decimal Price { get; set; }
        public int ProductionDays { get; set; }
        public string? Note { get; set; }
    }
}
