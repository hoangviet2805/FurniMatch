using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using System.Collections.Generic;

namespace FurniMatch.Api.DTOs
{
    public class UpdateProductRequest
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        [Required]
        public int CategoryId { get; set; }

        public string? Description { get; set; }

        public bool CustomSizeSupported { get; set; }

        [Required]
        public string VariantsJson { get; set; } = "[]";

        // Mảng chứa các ID (hoặc URL) của ảnh cũ muốn giữ lại
        public string ExistingImagesJson { get; set; } = "[]";

        // ID (hoặc URL) của ảnh đại diện được chọn. Nếu chọn từ NewImages, có thể dùng 1 prefix đặc biệt hoặc xử lý qua ThumbnailIndex
        public string? ThumbnailImageUrl { get; set; }

        public List<IFormFile>? NewImages { get; set; }
        
        // Chỉ số của ảnh thumbnail mới trong danh sách NewImages (nếu thumbnail là 1 ảnh mới tải lên)
        public int? NewThumbnailIndex { get; set; }
    }
}
