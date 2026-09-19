using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FurniMatch.Api.Data;
using FurniMatch.Api.Models;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;
using System;

namespace FurniMatch.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BannersController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;
        private readonly IWebHostEnvironment _env;

        public BannersController(FurniMatchDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        [HttpGet]
        public async Task<IActionResult> GetBanners()
        {
            var banners = await _context.Banners
                .Where(b => b.IsActive)
                .OrderBy(b => b.DisplayOrder)
                .ToListAsync();

            return Ok(banners);
        }

        [Authorize(Roles = "ADMIN")]
        [HttpPost]
        public async Task<IActionResult> UploadBanners([FromForm] List<IFormFile> images)
        {
            if (images == null || !images.Any())
            {
                return BadRequest(new { message = "Không có hình ảnh nào được tải lên." });
            }

            var currentBannersCount = await _context.Banners.CountAsync();
            if (currentBannersCount + images.Count > 10)
            {
                return BadRequest(new { message = $"Chỉ được phép tối đa 10 ảnh. Hiện tại đã có {currentBannersCount} ảnh." });
            }

            var uploadsFolder = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads", "banners");
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            foreach (var file in images)
            {
                if (file.Length > 0)
                {
                    var fileExtension = Path.GetExtension(file.FileName);
                    var uniqueFileName = Guid.NewGuid().ToString() + fileExtension;
                    var filePath = Path.Combine(uploadsFolder, uniqueFileName);

                    using (var fileStream = new FileStream(filePath, FileMode.Create))
                    {
                        await file.CopyToAsync(fileStream);
                    }

                    var banner = new Banner
                    {
                        ImageUrl = $"/uploads/banners/{uniqueFileName}",
                        DisplayOrder = currentBannersCount++,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Banners.Add(banner);
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Tải lên thành công." });
        }

        [Authorize(Roles = "ADMIN")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBanner(int id)
        {
            var banner = await _context.Banners.FindAsync(id);
            if (banner == null)
            {
                return NotFound(new { message = "Không tìm thấy banner." });
            }

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var filePath = Path.Combine(webRoot, banner.ImageUrl.TrimStart('/'));
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }

            _context.Banners.Remove(banner);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Xóa thành công." });
        }
    }
}
