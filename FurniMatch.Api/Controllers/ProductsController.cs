using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Text.Json;
using System.IO;
using System;
using Microsoft.AspNetCore.Hosting;
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
        private readonly IWebHostEnvironment _env;

        public ProductsController(FurniMatchDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        [HttpGet]
        public async Task<IActionResult> GetProducts(
            [FromQuery] int? categoryId,
            [FromQuery] int? maxLength,
            [FromQuery] int? maxWidth,
            [FromQuery] int? maxHeight,
            [FromQuery] string? search,
            [FromQuery] decimal? minPrice,
            [FromQuery] decimal? maxPrice,
            [FromQuery] string? sort)
        {
            IQueryable<Product> query = _context.Products
                .Include(p => p.Category)
                .Include(p => p.Seller)
                .Include(p => p.ProductVariants)
                .Include(p => p.ProductImages)
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

            if (!string.IsNullOrWhiteSpace(search))
            {
                var keyword = search.Trim().ToLower();
                query = query.Where(p => p.Name.ToLower().Contains(keyword)
                    || (p.Description != null && p.Description.ToLower().Contains(keyword))
                    || (p.Seller != null && p.Seller.ShopName != null && p.Seller.ShopName.ToLower().Contains(keyword)));
            }

            if (minPrice.HasValue)
            {
                query = query.Where(p => p.ProductVariants.Any(v => v.Price >= minPrice.Value));
            }
            if (maxPrice.HasValue)
            {
                query = query.Where(p => p.ProductVariants.Any(v => v.Price <= maxPrice.Value));
            }

            query = sort?.ToLower() switch
            {
                "price-asc" => query.OrderBy(p => p.ProductVariants.Any() ? p.ProductVariants.Min(v => v.Price) : p.Price),
                "price-desc" => query.OrderByDescending(p => p.ProductVariants.Any() ? p.ProductVariants.Min(v => v.Price) : p.Price),
                "oldest" => query.OrderBy(p => p.CreatedAt),
                _ => query.OrderByDescending(p => p.CreatedAt)
            };

            var products = await query.ToListAsync();
            return Ok(products);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetProduct(int id)
        {
            var product = await _context.Products
                .Include(p => p.Category)
                .Include(p => p.Seller)
                .Include(p => p.ProductVariants)
                .Include(p => p.ProductImages)
                .FirstOrDefaultAsync(p => p.ProductId == id && p.Status == "ACTIVE");

            return product == null
                ? NotFound(new { message = "Không tìm thấy sản phẩm." })
                : Ok(product);
        }

        [Authorize(Roles = "SELLER")]
        [HttpGet("my-products")]
        public async Task<IActionResult> GetMyProducts()
        {
            var sellerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var query = _context.Products
                .Include(p => p.Category)
                .Include(p => p.ProductVariants)
                .Include(p => p.ProductImages)
                .Where(p => p.SellerId == sellerId);

            var products = await query.ToListAsync();
            return Ok(products);
        }

        [Authorize(Roles = "SELLER")]
        [HttpPost]
        public async Task<IActionResult> CreateProduct([FromForm] CreateProductRequest request)
        {
            var sellerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var product = new Product
            {
                SellerId = sellerId,
                CategoryId = request.CategoryId,
                Name = request.Name,
                Description = request.Description,
                CustomSizeSupported = request.CustomSizeSupported,
                Status = "ACTIVE"
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            Console.WriteLine($"VariantsJson: {request.VariantsJson}");
            Console.WriteLine($"Images Count: {request.Images?.Count ?? 0}");

            // Handle variants
            if (!string.IsNullOrEmpty(request.VariantsJson))
            {
                try
                {
                    var variantDtos = JsonSerializer.Deserialize<List<ProductVariantDto>>(request.VariantsJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (variantDtos != null && variantDtos.Any())
                    {
                        foreach (var v in variantDtos)
                        {
                            var variant = new ProductVariant
                            {
                                ProductId = product.ProductId,
                                SizeName = v.SizeName,
                                Width = v.Width,
                                Height = v.Height,
                                Length = v.Length,
                                Price = v.Price,
                                ProductionDays = v.ProductionDays
                            };
                            _context.ProductVariants.Add(variant);
                        }
                    }
                }
                catch (Exception ex)
                {
                    return BadRequest(new { message = "Lỗi parse JSON các biến thể (variants).", error = ex.Message });
                }
            }

            // Handle images
            if (request.Images != null && request.Images.Any())
            {
                var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
                var uploadsFolder = Path.Combine(webRoot, "uploads", "products");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                int order = 0;
                foreach (var file in request.Images)
                {
                    if (file.Length > 0)
                    {
                        var uniqueFileName = Guid.NewGuid().ToString() + "_" + file.FileName;
                        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                        using (var fileStream = new FileStream(filePath, FileMode.Create))
                        {
                            await file.CopyToAsync(fileStream);
                        }

                        var productImage = new ProductImage
                        {
                            ProductId = product.ProductId,
                            ImageUrl = $"/uploads/products/{uniqueFileName}",
                            IsThumbnail = order == request.ThumbnailIndex,
                            DisplayOrder = order
                        };
                        _context.ProductImages.Add(productImage);
                        order++;
                    }
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Thêm sản phẩm thành công!", productId = product.ProductId });
        }

        [Authorize(Roles = "SELLER")]
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(int id, [FromForm] UpdateProductRequest request)
        {
            var sellerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var product = await _context.Products
                .Include(p => p.ProductVariants)
                .Include(p => p.ProductImages)
                .FirstOrDefaultAsync(p => p.ProductId == id && p.SellerId == sellerId);

            if (product == null)
            {
                return NotFound(new { message = "Không tìm thấy sản phẩm hoặc bạn không có quyền sửa." });
            }

            product.Name = request.Name;
            product.Description = request.Description;
            product.CategoryId = request.CategoryId;
            product.CustomSizeSupported = request.CustomSizeSupported;
            product.UpdatedAt = DateTime.UtcNow;

            // Handle variants
            if (!string.IsNullOrEmpty(request.VariantsJson))
            {
                try
                {
                    var variantDtos = JsonSerializer.Deserialize<List<ProductVariantDto>>(request.VariantsJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    if (variantDtos != null)
                    {
                        // Remove existing variants
                        _context.ProductVariants.RemoveRange(product.ProductVariants);
                        
                        // Add new variants
                        foreach (var v in variantDtos)
                        {
                            _context.ProductVariants.Add(new ProductVariant
                            {
                                ProductId = product.ProductId,
                                SizeName = v.SizeName,
                                Width = v.Width,
                                Height = v.Height,
                                Length = v.Length,
                                Price = v.Price,
                                ProductionDays = v.ProductionDays
                            });
                        }
                    }
                }
                catch (Exception ex)
                {
                    return BadRequest(new { message = "Lỗi parse JSON các biến thể (variants).", error = ex.Message });
                }
            }

            // Handle existing images
            List<string> existingImagesToKeep = new List<string>();
            if (!string.IsNullOrEmpty(request.ExistingImagesJson))
            {
                try
                {
                    existingImagesToKeep = JsonSerializer.Deserialize<List<string>>(request.ExistingImagesJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<string>();
                }
                catch { }
            }

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var uploadsFolder = Path.Combine(webRoot, "uploads", "products");

            // Remove images that are not in existingImagesToKeep
            var imagesToRemove = product.ProductImages.Where(img => !existingImagesToKeep.Contains(img.ImageUrl)).ToList();
            foreach (var img in imagesToRemove)
            {
                var filePath = Path.Combine(webRoot, img.ImageUrl.TrimStart('/'));
                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }
                _context.ProductImages.Remove(img);
            }

            // Reset IsThumbnail for all remaining
            foreach (var img in product.ProductImages)
            {
                img.IsThumbnail = false;
                if (img.ImageUrl == request.ThumbnailImageUrl)
                {
                    img.IsThumbnail = true;
                }
            }

            // Handle new images
            if (request.NewImages != null && request.NewImages.Any())
            {
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                int newIndex = 0;
                int currentMaxOrder = product.ProductImages.Any() ? product.ProductImages.Max(i => i.DisplayOrder) : -1;

                foreach (var file in request.NewImages)
                {
                    if (file.Length > 0)
                    {
                        var uniqueFileName = Guid.NewGuid().ToString() + "_" + file.FileName;
                        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                        using (var fileStream = new FileStream(filePath, FileMode.Create))
                        {
                            await file.CopyToAsync(fileStream);
                        }

                        bool isThumb = request.NewThumbnailIndex.HasValue && request.NewThumbnailIndex.Value == newIndex;

                        var productImage = new ProductImage
                        {
                            ProductId = product.ProductId,
                            ImageUrl = $"/uploads/products/{uniqueFileName}",
                            IsThumbnail = isThumb,
                            DisplayOrder = currentMaxOrder + 1 + newIndex
                        };
                        _context.ProductImages.Add(productImage);
                        
                        if (isThumb) {
                            // If this is the new thumbnail, ensure others are false
                            foreach (var img in product.ProductImages) img.IsThumbnail = false;
                            productImage.IsThumbnail = true;
                        }

                        newIndex++;
                    }
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật sản phẩm thành công", productId = product.ProductId });
        }

        [Authorize(Roles = "SELLER")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var sellerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var product = await _context.Products.FirstOrDefaultAsync(p => p.ProductId == id && p.SellerId == sellerId);

            if (product == null)
            {
                return NotFound(new { message = "Không tìm thấy sản phẩm hoặc bạn không có quyền xóa." });
            }

            // Remove physical image files
            var productImages = await _context.ProductImages.Where(pi => pi.ProductId == id).ToListAsync();
            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            foreach (var img in productImages)
            {
                var filePath = Path.Combine(webRoot, img.ImageUrl.TrimStart('/'));
                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }
            }

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa sản phẩm thành công!" });
        }

        [Authorize(Roles = "SELLER")]
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> ToggleProductStatus(int id)
        {
            var sellerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var product = await _context.Products.FirstOrDefaultAsync(p => p.ProductId == id && p.SellerId == sellerId);

            if (product == null)
            {
                return NotFound(new { message = "Không tìm thấy sản phẩm." });
            }

            product.Status = product.Status == "ACTIVE" ? "INACTIVE" : "ACTIVE";
            product.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật trạng thái thành công!", status = product.Status });
        }
    }
}
