using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using FurniMatch.Api.Data;
using FurniMatch.Api.DTOs;
using FurniMatch.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FurniMatch.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductsController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;

        public ProductsController(FurniMatchDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetProducts(
            [FromQuery] int? categoryId,
            [FromQuery] int? maxLength,
            [FromQuery] int? maxWidth,
            [FromQuery] int? maxHeight)
        {
            var query = _context.Products
                .Include(p => p.Category)
                .Include(p => p.Seller)
                .Include(p => p.ProductVariants)
                .Where(p => p.Status == "ACTIVE");

            if (categoryId.HasValue)
            {
                query = query.Where(p => p.CategoryId == categoryId.Value);
            }

            // Tối ưu không gian (3D Dimension Filter)
            // Lọc ra các sản phẩm có sẵn kích thước L, W, H và nhỏ hơn hoặc bằng không gian tối đa
            if (maxLength.HasValue)
            {
                query = query.Where(p => p.Length == null || p.Length <= maxLength.Value);
            }
            if (maxWidth.HasValue)
            {
                query = query.Where(p => p.Width == null || p.Width <= maxWidth.Value);
            }
            if (maxHeight.HasValue)
            {
                query = query.Where(p => p.Height == null || p.Height <= maxHeight.Value);
            }

            var products = await query.ToListAsync();
            return Ok(products);
        }

        [Authorize(Roles = "SELLER")]
        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromBody] ProductDto dto)
        {
            var sellerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var product = new Product
            {
                SellerId = sellerId,
                CategoryId = dto.CategoryId,
                Name = dto.Name,
                Description = dto.Description,
                Price = dto.Price,
                ProductionDays = dto.ProductionDays,
                CustomSizeSupported = dto.CustomSizeSupported,
                Length = dto.Length,
                Width = dto.Width,
                Height = dto.Height,
                Status = "ACTIVE"
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return Ok(product);
        }
    }
}
