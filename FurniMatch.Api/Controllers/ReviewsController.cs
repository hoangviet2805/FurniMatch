using System.Security.Claims;
using System.Text.Json;
using FurniMatch.Api.Data;
using FurniMatch.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FurniMatch.Api.Controllers;

[ApiController, Route("api/reviews")]
public class ReviewsController : ControllerBase
{
    private readonly FurniMatchDbContext _db;
    private readonly IWebHostEnvironment _env;

    public ReviewsController(FurniMatchDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // ─── UPLOAD MEDIA ────────────────────────────────────────────────────────
    /// <summary>Upload 1 file ảnh hoặc video, trả về URL để dùng khi POST review.</summary>
    [HttpPost("upload-media"), Authorize(Roles = "CUSTOMER")]
    public async Task<IActionResult> UploadMedia([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Vui lòng chọn file." });

        // Giới hạn 20 MB mỗi file
        if (file.Length > 20 * 1024 * 1024)
            return BadRequest(new { message = "File quá lớn. Giới hạn 20 MB mỗi file." });

        var allowedImages = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        var allowedVideos = new[] { ".mp4", ".mov", ".avi", ".mkv", ".webm" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedImages.Contains(ext) && !allowedVideos.Contains(ext))
            return BadRequest(new { message = "Định dạng file không được hỗ trợ. Chỉ chấp nhận ảnh (JPG, PNG, WEBP) và video (MP4, MOV)." });

        var folder = Path.Combine(
            _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"),
            "uploads", "reviews");

        if (!Directory.Exists(folder))
            Directory.CreateDirectory(folder);

        var fileName = $"review_{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(folder, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
            await file.CopyToAsync(stream);

        return Ok(new { url = $"/uploads/reviews/{fileName}", isVideo = allowedVideos.Contains(ext) });
    }

    // ─── POST REVIEW ─────────────────────────────────────────────────────────
    [HttpPost, Authorize(Roles = "CUSTOMER")]
    public async Task<IActionResult> Create([FromBody] CreateReviewRequest request)
    {
        if (request.Rating < 1 || request.Rating > 5)
            return BadRequest(new { message = "Số sao phải từ 1 đến 5." });
        if (request.Comment?.Length > 300)
            return BadRequest(new { message = "Nhận xét tối đa 300 ký tự." });

        // Kiểm tra đơn hàng
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.OrderId == request.OrderId && o.CustomerId == UserId);
        if (order == null)
            return NotFound(new { message = "Không tìm thấy đơn hàng." });
        if (order.OrderStatus != "COMPLETED")
            return BadRequest(new { message = "Chỉ có thể đánh giá đơn hàng đã hoàn thành." });

        // Kiểm tra thời hạn đánh giá
        var config = await _db.CommissionConfigs
            .Where(c => c.IsActive)
            .OrderByDescending(c => c.UpdatedAt)
            .FirstOrDefaultAsync();
        var deadlineDays = (config?.ReviewDeadlineDays > 0) ? config.ReviewDeadlineDays : 7;

        if (order.CompletedAt == null)
            return BadRequest(new { message = "Đơn hàng chưa có thời điểm hoàn thành." });

        var deadline = order.CompletedAt.Value.AddDays(deadlineDays);
        if (DateTime.UtcNow > deadline)
            return StatusCode(403, new { message = $"Đã hết thời hạn đánh giá ({deadlineDays} ngày kể từ lúc hoàn thành đơn)." });

        // Kiểm tra đã review chưa
        var exists = await _db.OrderReviews.AnyAsync(r =>
            r.OrderId == request.OrderId &&
            r.ProductId == request.ProductId &&
            r.CustomerId == UserId);
        if (exists)
            return Conflict(new { message = "Bạn đã đánh giá sản phẩm này trong đơn hàng rồi." });

        // Kiểm tra sản phẩm có trong đơn không
        List<dynamic> items = new();
        try { items = JsonSerializer.Deserialize<List<dynamic>>(order.ItemsJson) ?? new(); } catch { }

        var review = new OrderReview
        {
            OrderId = request.OrderId,
            CustomerId = UserId,
            ProductId = request.ProductId,
            ProductName = request.ProductName,
            Rating = request.Rating,
            Comment = request.Comment?.Trim(),
            MediaJson = request.MediaUrls?.Count > 0
                ? JsonSerializer.Serialize(request.MediaUrls)
                : null,
            CreatedAt = DateTime.UtcNow
        };

        _db.OrderReviews.Add(review);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            review.ReviewId,
            review.OrderId,
            review.ProductId,
            review.ProductName,
            review.Rating,
            review.Comment,
            review.MediaJson,
            review.CreatedAt,
            message = "Đánh giá của bạn đã được ghi nhận. Cảm ơn!"
        });
    }

    // ─── GET REVIEWS BY ORDER ────────────────────────────────────────────────
    /// <summary>Lấy tất cả reviews của một đơn hàng (dùng trong tracking modal).</summary>
    [HttpGet("order/{orderId:int}"), Authorize]
    public async Task<IActionResult> GetByOrder(int orderId)
    {
        // Chỉ customer của đơn hoặc seller mới xem được
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.OrderId == orderId);
        if (order == null) return NotFound();
        if (order.CustomerId != UserId && order.SellerId != UserId) return Forbid();

        var reviews = await _db.OrderReviews
            .Where(r => r.OrderId == orderId)
            .Include(r => r.Customer)
            .OrderBy(r => r.CreatedAt)
            .Select(r => new
            {
                r.ReviewId,
                r.ProductId,
                r.ProductName,
                r.Rating,
                r.Comment,
                r.MediaJson,
                r.CreatedAt,
                CustomerName = r.Customer != null ? r.Customer.FullName : "Khách hàng",
                CustomerAvatar = r.Customer != null ? r.Customer.AvatarUrl : null
            })
            .ToListAsync();

        return Ok(reviews);
    }

    // ─── GET REVIEWS BY PRODUCT ──────────────────────────────────────────────
    /// <summary>Lấy tất cả reviews của một sản phẩm (hiển thị trên trang Shop / ProductDetail).</summary>
    [HttpGet("product/{productId:int}"), AllowAnonymous]
    public async Task<IActionResult> GetByProduct(int productId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var query = _db.OrderReviews
            .Where(r => r.ProductId == productId)
            .Include(r => r.Customer);

        var total = await query.CountAsync();
        var avgRating = total > 0 ? await query.AverageAsync(r => (double)r.Rating) : 0;

        var reviews = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new
            {
                r.ReviewId,
                r.OrderId,
                r.Rating,
                r.Comment,
                r.MediaJson,
                r.CreatedAt,
                CustomerName = r.Customer != null ? r.Customer.FullName : "Khách hàng",
                CustomerAvatar = r.Customer != null ? r.Customer.AvatarUrl : null
            })
            .ToListAsync();

        return Ok(new
        {
            total,
            avgRating = Math.Round(avgRating, 1),
            page,
            pageSize,
            data = reviews
        });
    }

    // ─── GET REVIEW CONFIG (deadline days) ───────────────────────────────────
    /// <summary>Trả về ReviewDeadlineDays hiện tại để frontend tính nút enable/disable.</summary>
    [HttpGet("config"), AllowAnonymous]
    public async Task<IActionResult> GetConfig()
    {
        var config = await _db.CommissionConfigs
            .Where(c => c.IsActive)
            .OrderByDescending(c => c.UpdatedAt)
            .FirstOrDefaultAsync();
        return Ok(new { reviewDeadlineDays = (config?.ReviewDeadlineDays > 0) ? config.ReviewDeadlineDays : 7 });
    }
}

// ─── REQUEST DTOs ─────────────────────────────────────────────────────────────
public sealed class CreateReviewRequest
{
    public int OrderId      { get; set; }
    public int ProductId    { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Rating       { get; set; }
    public string? Comment  { get; set; }
    /// <summary>Danh sách URL trả về từ /api/reviews/upload-media</summary>
    public List<string>? MediaUrls { get; set; }
}
