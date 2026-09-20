using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FurniMatch.Api.Data;
using System.Linq;
using System.Threading.Tasks;

namespace FurniMatch.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ShopsController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;

        public ShopsController(FurniMatchDbContext context)
        {
            _context = context;
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
                user.Province,
                user.District,
                user.Ward,
                user.AddressDetail
            });
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
