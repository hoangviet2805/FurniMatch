using System.Security.Claims;
using System.Text.Json;
using FurniMatch.Api.Data;
using FurniMatch.Api.Models;
using FurniMatch.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FurniMatch.Api.Controllers;

[ApiController, Route("api/orders"), Authorize]
public class OrdersController : ControllerBase
{
    private readonly FurniMatchDbContext _db; private readonly SePayPaymentService _sepay; private readonly IEmailService _emailService;
    public OrdersController(FurniMatchDbContext db, SePayPaymentService sepay, IEmailService emailService) { _db = db; _sepay = sepay; _emailService = emailService; }
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    [HttpPost, Authorize(Roles = "CUSTOMER")]
    public async Task<IActionResult> Create(CreateOrderRequest request)
    {
        if (request.Items.Count == 0 || string.IsNullOrWhiteSpace(request.RecipientName) || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Address)) return BadRequest(new { message = "Vui lòng điền đủ thông tin nhận hàng." });
        var productIds = request.Items.Select(x => x.ProductId).Distinct().ToArray();
        var products = await _db.Products.Include(p => p.ProductVariants).Where(x => productIds.Contains(x.ProductId) && x.Status == "ACTIVE").ToListAsync();
        if (products.Count != productIds.Length) return BadRequest(new { message = "Một số sản phẩm không còn được bán hoặc đã hết hàng." });
        var sellerId = products.First().SellerId;
        if (products.Any(x => x.SellerId != sellerId)) return BadRequest(new { message = "Vui lòng thanh toán riêng các sản phẩm từ những xưởng khác nhau." });
        
        foreach (var item in request.Items)
        {
            var product = products.First(p => p.ProductId == item.ProductId);
            var variant = item.VariantId.HasValue 
                ? product.ProductVariants.FirstOrDefault(v => v.VariantId == item.VariantId.Value)
                : product.ProductVariants.FirstOrDefault();

            if (variant == null) return BadRequest(new { message = $"Không tìm thấy phân loại sản phẩm cho {item.Name}." });
            
            if (variant.Stock < item.Quantity)
            {
                return BadRequest(new { message = $"Sản phẩm {item.Name} ({(string.IsNullOrEmpty(item.SizeLabel) ? "Tiêu chuẩn" : item.SizeLabel)}) chỉ còn {variant.Stock} sản phẩm trong kho." });
            }
            
            variant.Stock -= item.Quantity;
        }

        foreach (var product in products)
        {
            if (product.ProductVariants.All(v => v.Stock <= 0))
            {
                product.Status = "OUT_OF_STOCK";
            }
        }
        var subtotal = request.Items.Sum(x => x.Price * x.Quantity); var shipping = 0m;
        if (!string.Equals(request.PaymentMethod, "SEPAY", StringComparison.OrdinalIgnoreCase)) return BadRequest(new { message = "Chỉ hỗ trợ thanh toán qua SePay." });
        var order = new Order { OrderCode = $"FM{DateTime.UtcNow:yyyyMMdd}{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}", CustomerId = UserId, SellerId = sellerId, ItemsJson = JsonSerializer.Serialize(request.Items, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }), RecipientName = request.RecipientName.Trim(), RecipientPhone = request.Phone.Trim(), Address = request.Address.Trim(), LegacyShippingAddress = request.Address.Trim(), Note = request.Note?.Trim(), Subtotal = subtotal, ShippingFee = shipping, TotalAmount = subtotal + shipping, PaymentMethod = "SEPAY", PaymentStatus = "PENDING", OrderStatus = "WAITING_PAYMENT", LegacyStatus = "WAITING_PAYMENT", PaymentExpiredAt = DateTime.UtcNow.AddMinutes(_sepay.PaymentTimeoutMinutes) };
        _db.Orders.Add(order); await _db.SaveChangesAsync();
        try { var qrCodeUrl = await _sepay.CreateQrUrlAsync(order); return Ok(new { orderId = order.OrderId, orderCode = order.OrderCode, qrCodeUrl, expiredAt = order.PaymentExpiredAt }); }
        catch (Exception ex) { order.PaymentStatus = "FAILED"; await _db.SaveChangesAsync(); return BadRequest(new { message = ex.Message }); }
    }
    [HttpGet("my"), Authorize(Roles = "CUSTOMER")]
    public async Task<IActionResult> Mine()
    {
        var now = DateTime.UtcNow;
        var expiredOrders = await _db.Orders.Where(x => x.CustomerId == UserId && x.PaymentStatus == "PENDING" && x.PaymentExpiredAt <= now).ToListAsync();
        if (expiredOrders.Any())
        {
            foreach (var o in expiredOrders) { o.PaymentStatus = "EXPIRED"; o.OrderStatus = "CANCELLED"; o.LegacyStatus = "CANCELLED"; }
            await _db.SaveChangesAsync();
        }

        var orders = await _db.Orders
            .Where(x => x.CustomerId == UserId)
            .OrderByDescending(x => x.UpdatedAt)
            .Select(o => new {
                o.OrderId,
                o.OrderCode,
                o.CustomerId,
                o.SellerId,
                o.ItemsJson,
                o.RecipientName,
                o.RecipientPhone,
                o.Address,
                o.Note,
                o.Subtotal,
                o.ShippingFee,
                o.TotalAmount,
                o.PaymentMethod,
                o.PaymentStatus,
                o.OrderStatus,
                o.PaymentExpiredAt,
                o.CompletedAt,
                o.PayoutStatus,
                o.CreatedAt,
                o.UpdatedAt,
                ShopName = o.Seller != null ? (o.Seller.ShopName ?? o.Seller.FullName) : "Xưởng nội thất",
                Dispute = _db.OrderDisputes
                    .Where(d => d.OrderId == o.OrderId)
                    .OrderByDescending(d => d.CreatedAt)
                    .Select(d => new {
                        d.OrderDisputeId,
                        d.Reason,
                        d.Status,
                        d.EvidenceImages,
                        d.AdminNote,
                        d.CreatedAt,
                        d.ResolvedAt
                    })
                    .FirstOrDefault()
            })
            .ToListAsync();
        return Ok(orders);
    }
    [HttpGet("seller"), Authorize(Roles = "SELLER")]
    public async Task<IActionResult> Seller()
    {
        var now = DateTime.UtcNow;
        var expiredOrders = await _db.Orders.Where(x => x.SellerId == UserId && x.PaymentStatus == "PENDING" && x.PaymentExpiredAt <= now).ToListAsync();
        if (expiredOrders.Any())
        {
            foreach (var o in expiredOrders) { o.PaymentStatus = "EXPIRED"; o.OrderStatus = "CANCELLED"; o.LegacyStatus = "CANCELLED"; }
            await _db.SaveChangesAsync();
        }
        return Ok(await _db.Orders.Where(x => x.SellerId == UserId).OrderByDescending(x => x.UpdatedAt).ToListAsync());
    }
    [HttpGet("{id:int}")] public async Task<IActionResult> Get(int id)
    {
        var order = await _db.Orders.FindAsync(id);
        if (order == null || (order.CustomerId != UserId && order.SellerId != UserId)) return NotFound();
        if (order.PaymentStatus == "PENDING" && order.PaymentExpiredAt <= DateTime.UtcNow)
        {
            order.PaymentStatus = "EXPIRED"; order.OrderStatus = "CANCELLED"; order.LegacyStatus = "CANCELLED"; await _db.SaveChangesAsync();
        }
        else if (order.PaymentStatus == "PENDING")
        {
            try
            {
                if (await _sepay.HasMatchingPaymentAsync(order))
                {
                    order.PaymentStatus = "PAID"; order.OrderStatus = "CONFIRMED"; order.LegacyStatus = "CONFIRMED"; order.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync();
                }
            }
            catch { /* Keep the order pending; another poll can retry. */ }
        }
        return Ok(order);
    }
    [HttpGet("{id:int}/sepay"), Authorize(Roles = "CUSTOMER")]
    public async Task<IActionResult> GetSePayQr(int id)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(x => x.OrderId == id && x.CustomerId == UserId);
        if (order == null) return NotFound();
        if (order.PaymentStatus != "PENDING" || order.PaymentExpiredAt <= DateTime.UtcNow) return BadRequest(new { message = "Đơn hàng không ở trạng thái chờ thanh toán hoặc đã hết hạn." });
        
        try { 
            var qrCodeUrl = await _sepay.CreateQrUrlAsync(order); 
            return Ok(new { orderId = order.OrderId, orderCode = order.OrderCode, qrCodeUrl, expiredAt = order.PaymentExpiredAt }); 
        }
        catch (Exception ex) { return BadRequest(new { message = ex.Message }); }
    }
    [HttpPut("{id:int}/status"), Authorize(Roles = "SELLER")]
    public async Task<IActionResult> Status(int id, UpdateOrderStatusRequest request)
    {
        var allowed = new[] { "PREPARING", "PRODUCING", "SHIPPED", "COMPLETED" };
        var order = await _db.Orders.Include(x => x.Customer).FirstOrDefaultAsync(x => x.OrderId == id && x.SellerId == UserId);
        if (order == null) return NotFound();
        if (!allowed.Contains(request.Status)) return BadRequest(new { message = "Trạng thái không hợp lệ." });

        order.OrderStatus = request.Status;
        order.LegacyStatus = request.Status;
        order.UpdatedAt = DateTime.UtcNow;

        // Ghi thời điểm hoàn thành để background job tính thời gian chờ giải ngân
        if (request.Status == "COMPLETED")
            order.CompletedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        try
        {
            if (order.Customer != null && !string.IsNullOrWhiteSpace(order.Customer.Email))
            {
                string statusText = request.Status switch
                {
                    "PREPARING" => "Đang chuẩn bị hàng",
                    "PRODUCING" => "Đang sản xuất",
                    "SHIPPED" => "Đang giao hàng",
                    "COMPLETED" => "Hoàn thành",
                    _ => request.Status
                };

                var body = $@"
<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);'>
    <div style='background-color: #0b6e4f; padding: 24px; text-align: center; color: white;'>
        <h1 style='margin: 0; font-size: 26px; letter-spacing: 1px;'>FurniMatch</h1>
    </div>
    <div style='padding: 32px; color: #374151;'>
        <h2 style='margin-top: 0; color: #111827; font-size: 20px;'>Cập nhật trạng thái đơn hàng</h2>
        <p style='font-size: 16px; line-height: 1.5;'>Xin chào <strong>{order.Customer.FullName ?? order.RecipientName}</strong>,</p>
        <p style='font-size: 16px; line-height: 1.5;'>Đơn hàng <strong>{order.OrderCode}</strong> của bạn vừa được cập nhật trạng thái thành:</p>
        
        <div style='background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;'>
            <strong style='color: #047857; font-size: 18px;'>{statusText}</strong>
        </div>
        
        <h3 style='margin: 32px 0 16px 0; color: #111827; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px; font-size: 18px;'>Chi tiết đơn hàng</h3>
        <table style='width: 100%; border-collapse: collapse; font-size: 15px;'>
            <tr>
                <td style='padding: 10px 0; color: #6b7280; width: 130px;'>Mã đơn hàng:</td>
                <td style='padding: 10px 0; font-weight: 600; color: #111827;'>{order.OrderCode}</td>
            </tr>
            <tr>
                <td style='padding: 10px 0; color: #6b7280;'>Người nhận:</td>
                <td style='padding: 10px 0; font-weight: 600; color: #111827;'>{order.RecipientName}</td>
            </tr>
            <tr>
                <td style='padding: 10px 0; color: #6b7280;'>Số điện thoại:</td>
                <td style='padding: 10px 0; font-weight: 600; color: #111827;'>{order.RecipientPhone}</td>
            </tr>
            <tr>
                <td style='padding: 10px 0; color: #6b7280;'>Địa chỉ:</td>
                <td style='padding: 10px 0; font-weight: 600; color: #111827; line-height: 1.4;'>{order.Address}</td>
            </tr>
            <tr>
                <td style='padding: 10px 0; color: #6b7280;'>Tổng tiền:</td>
                <td style='padding: 10px 0; font-weight: 700; color: #0b6e4f; font-size: 16px;'>{order.TotalAmount:N0} đ</td>
            </tr>
        </table>
        
        <p style='margin-top: 32px; font-size: 15px; color: #4b5563; line-height: 1.5; padding-top: 24px; border-top: 1px solid #f3f4f6;'>
            Bạn có thể theo dõi chi tiết quá trình vận chuyển trong mục <strong>Đơn mua của tôi</strong> trên website của chúng tôi.
        </p>
    </div>
    <div style='background-color: #f9fafb; padding: 20px; text-align: center; font-size: 13px; color: #9ca3af; border-top: 1px solid #e5e7eb;'>
        <p style='margin: 0;'>&copy; {DateTime.UtcNow.Year} FurniMatch. Cảm ơn bạn đã tin tưởng và đồng hành.</p>
    </div>
</div>";

                await _emailService.SendEmailAsync(order.Customer.Email, $"[FurniMatch] Cập nhật đơn hàng {order.OrderCode}", body);
            }
        }
        catch
        {
            // Ignore email sending errors
        }

        return Ok(order);
    }

    [HttpPatch("{id:int}/cancel"), Authorize(Roles = "CUSTOMER")]
    public async Task<IActionResult> Cancel(int id)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(x => x.OrderId == id && x.CustomerId == UserId);
        if (order == null) return NotFound();
        if (order.PaymentStatus == "PAID") return BadRequest(new { message = "Đơn đã thanh toán, không thể hủy tại đây." });
        order.PaymentStatus = "EXPIRED"; order.OrderStatus = "CANCELLED"; order.LegacyStatus = "CANCELLED";
        await _db.SaveChangesAsync();
        return Ok(order);
    }

    /// <summary>Customer gửi khiếu nại trong vòng 3 ngày sau khi hoàn thành đơn</summary>
    [HttpPost("{id:int}/dispute"), Authorize(Roles = "CUSTOMER")]
    public async Task<IActionResult> CreateDispute(int id, [FromForm] CreateDisputeForm form, [FromServices] IWebHostEnvironment env)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(x => x.OrderId == id && x.CustomerId == UserId);
        if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng." });
        if (order.OrderStatus != "COMPLETED")
            return BadRequest(new { message = "Chỉ có thể khiếu nại đơn hàng đã hoàn thành." });
        if (order.PayoutStatus == "RELEASED")
            return BadRequest(new { message = "Đơn hàng đã được giải ngân, không thể khiếu nại." });

        var completedTime = order.CompletedAt ?? order.UpdatedAt;
        if (DateTime.UtcNow > completedTime.AddDays(3))
            return BadRequest(new { message = "Đã quá thời hạn khiếu nại. Bạn chỉ có thể khiếu nại trong vòng 3 ngày sau khi đơn hàng hoàn thành." });

        var existing = await _db.OrderDisputes.AnyAsync(d => d.OrderId == id && (d.Status == "OPEN" || d.Status == "RESOLVED"));
        if (existing) return BadRequest(new { message = "Đã có khiếu nại đang xử lý hoặc đã được chấp thuận cho đơn hàng này." });

        if (string.IsNullOrWhiteSpace(form.Reason))
            return BadRequest(new { message = "Vui lòng nhập lý do khiếu nại." });

        var imageUrls = new List<string>();
        if (form.Images != null && form.Images.Count > 0)
        {
            var uploadsFolder = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "uploads", "disputes");
            if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

            foreach (var file in form.Images)
            {
                if (file.Length > 0)
                {
                    var ext = Path.GetExtension(file.FileName).ToLower();
                    var allowedExts = new[] { ".jpg", ".jpeg", ".png", ".webp" };
                    if (!allowedExts.Contains(ext)) continue;

                    var fileName = $"dispute_{id}_{Guid.NewGuid():N}{ext}";
                    var filePath = Path.Combine(uploadsFolder, fileName);
                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await file.CopyToAsync(stream);
                    }
                    imageUrls.Add($"/uploads/disputes/{fileName}");
                }
            }
        }

        var dispute = new FurniMatch.Api.Models.OrderDispute
        {
            OrderId = id,
            CustomerId = UserId,
            Reason = form.Reason.Trim(),
            EvidenceImages = imageUrls.Count > 0 ? System.Text.Json.JsonSerializer.Serialize(imageUrls) : null,
            Status = "OPEN",
            CreatedAt = DateTime.UtcNow
        };
        _db.OrderDisputes.Add(dispute);
        order.PayoutStatus = "DISPUTED";

        _db.Notifications.Add(new Notification
        {
            UserId = order.SellerId,
            Title = "Đơn hàng có khiếu nại ⚠️",
            Message = $"Đơn hàng #{order.OrderCode} có khiếu nại mới từ khách hàng. Khoản giải ngân tạm thời bị đóng băng để Admin xử lý.",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new { message = "Khiếu nại đã được ghi nhận. Admin sẽ xem xét và phản hồi sớm nhất." });
    }

    /// <summary>Customer cập nhật thông tin giao hàng khi đơn hàng đang ở bước chuẩn bị</summary>
    [HttpPut("{id:int}/shipping-info"), Authorize(Roles = "CUSTOMER")]
    public async Task<IActionResult> UpdateShippingInfo(int id, [FromBody] UpdateShippingInfoRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RecipientName) ||
            string.IsNullOrWhiteSpace(request.Phone) ||
            string.IsNullOrWhiteSpace(request.Address))
        {
            return BadRequest(new { message = "Vui lòng nhập đầy đủ tên người nhận, số điện thoại và địa chỉ giao hàng." });
        }

        var order = await _db.Orders.FirstOrDefaultAsync(x => x.OrderId == id && x.CustomerId == UserId);
        if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng." });

        // Chỉ cho phép cập nhật khi đơn hàng đang ở bước chuẩn bị hàng (CONFIRMED, PREPARING, PRODUCING)
        var allowedStatuses = new[] { "PREPARING", "PRODUCING", "CONFIRMED" };
        if (!allowedStatuses.Contains(order.OrderStatus))
        {
            return BadRequest(new { message = "Chỉ có thể cập nhật thông tin giao hàng khi đơn hàng đang trong giai đoạn chuẩn bị hàng (chưa bàn giao vận chuyển)." });
        }

        order.RecipientName = request.RecipientName.Trim();
        order.RecipientPhone = request.Phone.Trim();
        order.Address = request.Address.Trim();
        order.LegacyShippingAddress = request.Address.Trim();
        if (request.Note != null) order.Note = request.Note.Trim();
        order.UpdatedAt = DateTime.UtcNow;

        _db.Notifications.Add(new Notification
        {
            UserId = order.SellerId,
            Title = "Cập nhật thông tin giao hàng 📦",
            Message = $"Khách hàng đã cập nhật thông tin nhận hàng cho đơn #{order.OrderCode}: {order.RecipientName} - {order.RecipientPhone} - {order.Address}",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        return Ok(new
        {
            message = "Cập nhật thông tin nhận hàng thành công!",
            recipientName = order.RecipientName,
            recipientPhone = order.RecipientPhone,
            address = order.Address,
            note = order.Note
        });
    }
}
public sealed class CreateOrderRequest { public List<OrderLine> Items { get; set; } = []; public string RecipientName { get; set; } = ""; public string Phone { get; set; } = ""; public string Address { get; set; } = ""; public string? Note { get; set; } public decimal ShippingFee { get; set; } public string PaymentMethod { get; set; } = "SEPAY"; }
public sealed class OrderLine { public int ProductId { get; set; } public int? VariantId { get; set; } public string Name { get; set; } = ""; public string SizeLabel { get; set; } = ""; public decimal Price { get; set; } public int Quantity { get; set; } public string? ImageUrl { get; set; } }
public sealed class UpdateOrderStatusRequest { public string Status { get; set; } = ""; }
public sealed class CreateDisputeRequest { public string Reason { get; set; } = ""; }
public sealed class CreateDisputeForm { public string Reason { get; set; } = ""; public List<IFormFile>? Images { get; set; } }
public sealed class UpdateShippingInfoRequest { public string RecipientName { get; set; } = ""; public string Phone { get; set; } = ""; public string Address { get; set; } = ""; public string? Note { get; set; } }

