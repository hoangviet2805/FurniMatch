using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FurniMatch.Api.Data;
using System.Linq;
using System.Threading.Tasks;
using System.IO;
using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;

namespace FurniMatch.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ShopsController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;
        private readonly IWebHostEnvironment _env;

        public ShopsController(FurniMatchDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        [HttpGet("{sellerId}")]
        public async Task<IActionResult> GetShopInfo(int sellerId)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.UserId == sellerId);

            if (user == null || user.Role?.RoleName != "SELLER")
            {
                return NotFound("Shop not found.");
            }

            return Ok(new
            {
                user.UserId,
                user.ShopName,
                user.ShopDescription,
                user.AvatarUrl,
                user.CoverUrl,
                user.IsCustomSizeSupported,
                user.Phone,
                user.Province,
                user.District,
                user.Ward,
                user.AddressDetail,
                user.Latitude,
                user.Longitude
            });
        }

        [HttpPost("upload-image")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> UploadShopImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "Vui lòng chọn hình ảnh để tải lên." });

            var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
            var ext = Path.GetExtension(file.FileName).ToLower();
            if (!allowed.Contains(ext))
                return BadRequest(new { message = "Định dạng ảnh không hỗ trợ. Vui lòng chọn JPG, PNG, WEBP." });

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var folder = Path.Combine(webRoot, "uploads", "shops");
            if (!Directory.Exists(folder))
                Directory.CreateDirectory(folder);

            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(folder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var url = $"/uploads/shops/{fileName}";
            return Ok(new { url });
        }

        [HttpPut("{sellerId}")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> UpdateShopInfo(int sellerId, [FromBody] UpdateShopDto dto)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userRole = User.FindFirstValue(ClaimTypes.Role);

            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int currentUserId))
                return Unauthorized();

            if (currentUserId != sellerId && userRole != "ADMIN")
                return Forbid();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == sellerId);
            if (user == null)
                return NotFound("Gian hàng không tồn tại.");

            if (!string.IsNullOrWhiteSpace(dto.ShopName))
                user.ShopName = dto.ShopName.Trim();

            if (dto.ShopDescription != null)
                user.ShopDescription = dto.ShopDescription.Trim();

            if (dto.AvatarUrl != null)
                user.AvatarUrl = dto.AvatarUrl.Trim();

            if (dto.CoverUrl != null)
                user.CoverUrl = dto.CoverUrl.Trim();

            user.IsCustomSizeSupported = dto.IsCustomSizeSupported;

            if (dto.Phone != null)
                user.Phone = dto.Phone.Trim();

            if (dto.Province != null)
                user.Province = dto.Province.Trim();

            if (dto.District != null)
                user.District = dto.District.Trim();

            if (dto.Ward != null)
                user.Ward = dto.Ward.Trim();

            if (dto.AddressDetail != null)
                user.AddressDetail = dto.AddressDetail.Trim();

            if (dto.Latitude.HasValue)
                user.Latitude = dto.Latitude;

            if (dto.Longitude.HasValue)
                user.Longitude = dto.Longitude;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật thông tin gian hàng thành công!",
                shop = new
                {
                    user.UserId,
                    user.ShopName,
                    user.ShopDescription,
                    user.AvatarUrl,
                    user.CoverUrl,
                    user.IsCustomSizeSupported,
                    user.Phone,
                    user.Province,
                    user.District,
                    user.Ward,
                    user.AddressDetail,
                    user.Latitude,
                    user.Longitude
                }
            });
        }

        public class UpdateShopDto
        {
            public string? ShopName { get; set; }
            public string? ShopDescription { get; set; }
            public string? AvatarUrl { get; set; }
            public string? CoverUrl { get; set; }
            public bool IsCustomSizeSupported { get; set; }
            public string? Phone { get; set; }
            public string? Province { get; set; }
            public string? District { get; set; }
            public string? Ward { get; set; }
            public string? AddressDetail { get; set; }
            public double? Latitude { get; set; }
            public double? Longitude { get; set; }
        }

        [HttpGet("{sellerId}/products")]
        public async Task<IActionResult> GetShopProducts(int sellerId)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.UserId == sellerId);

            if (user == null || user.Role?.RoleName != "SELLER")
            {
                return NotFound("Shop not found.");
            }

            var products = await _context.Products
                .Include(p => p.ProductImages)
                .Include(p => p.Category)
                .Include(p => p.ProductVariants)
                .Where(p => p.SellerId == sellerId && p.Status == "ACTIVE")
                .Select(p => new
                {
                    p.ProductId,
                    p.Name,
                    p.Description,
                    Price = p.ProductVariants.Any() ? p.ProductVariants.Min(v => v.Price) : p.Price,
                    p.CreatedAt,
                    CategoryName = p.Category != null ? p.Category.Name : null,
                    PrimaryImage = p.ProductImages.FirstOrDefault(i => i.IsThumbnail) != null 
                        ? p.ProductImages.FirstOrDefault(i => i.IsThumbnail)!.ImageUrl 
                        : (p.ProductImages.FirstOrDefault() != null ? p.ProductImages.FirstOrDefault()!.ImageUrl : null)
                })
                .ToListAsync();

            return Ok(products);
        }
    }
}
