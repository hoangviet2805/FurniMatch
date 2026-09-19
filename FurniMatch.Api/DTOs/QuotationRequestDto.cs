using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.DTOs
{
    public class QuotationRequestDto
    {
        public int CategoryId { get; set; }
        
        public string? ProductType { get; set; }
        public string? Pattern { get; set; }

        public int Length { get; set; }
        public int Width { get; set; }
        public int Height { get; set; }

        public string? Material { get; set; }
        public string? FrameType { get; set; }
        public string? Color { get; set; }

        public int Quantity { get; set; }

        public decimal? BudgetMin { get; set; }
        public decimal? BudgetMax { get; set; }

        public string? Description { get; set; }

        // Bổ sung cho tính năng đấu giá ngược
        public double RadiusKm { get; set; } = 50.0; // Default 50km
    }
}
