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
    private readonly FurniMatchDbContext _db; private readonly SePayPaymentService _sepay;
    public OrdersController(FurniMatchDbContext db, SePayPaymentService sepay) { _db = db; _sepay = sepay; }
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    [HttpPost, Authorize(Roles = "CUSTOMER")]
    public async Task<IActionResult> Create(CreateOrderRequest request)
    {
        if (request.Items.Count == 0 || string.IsNullOrWhiteSpace(request.RecipientName) || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Address)) return BadRequest(new { message = "Vui lòng điền đủ thông tin nhận hàng." });
        var productIds = request.Items.Select(x => x.ProductId).Distinct().ToArray();
        var products = await _db.Products.Where(x => productIds.Contains(x.ProductId) && x.Status == "ACTIVE").ToListAsync();
        if (products.Count != productIds.Length) return BadRequest(new { message = "Một số sản phẩm không còn được bán." });
        var sellerId = products.First().SellerId;
        if (products.Any(x => x.SellerId != sellerId)) return BadRequest(new { message = "Vui lòng thanh toán riêng các sản phẩm từ những xưởng khác nhau." });
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
        var orders = await _db.Orders
            .Where(x => x.CustomerId == UserId)
            .OrderByDescending(x => x.CreatedAt)
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
                o.CreatedAt,
                o.UpdatedAt,
                ShopName = o.Seller != null ? (o.Seller.ShopName ?? o.Seller.FullName) : "Xưởng nội thất"
            })
            .ToListAsync();
        return Ok(orders);
    }
    [HttpGet("seller"), Authorize(Roles = "SELLER")] public async Task<IActionResult> Seller() => Ok(await _db.Orders.Where(x => x.SellerId == UserId).OrderByDescending(x => x.CreatedAt).ToListAsync());
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
    [HttpPut("{id:int}/status"), Authorize(Roles = "SELLER")] public async Task<IActionResult> Status(int id, UpdateOrderStatusRequest request) { var allowed = new[] { "PREPARING", "PRODUCING", "SHIPPED", "COMPLETED" }; var order = await _db.Orders.FirstOrDefaultAsync(x => x.OrderId == id && x.SellerId == UserId); if (order == null) return NotFound(); if (!allowed.Contains(request.Status)) return BadRequest(new { message = "Trạng thái không hợp lệ." }); order.OrderStatus = request.Status; order.LegacyStatus = request.Status; order.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync(); return Ok(order); }
    [HttpPatch("{id:int}/cancel"), Authorize(Roles = "CUSTOMER")] public async Task<IActionResult> Cancel(int id) { var order = await _db.Orders.FirstOrDefaultAsync(x => x.OrderId == id && x.CustomerId == UserId); if (order == null) return NotFound(); if (order.PaymentStatus == "PAID") return BadRequest(new { message = "Đơn đã thanh toán, không thể hủy tại đây." }); order.PaymentStatus = "EXPIRED"; order.OrderStatus = "CANCELLED"; order.LegacyStatus = "CANCELLED"; await _db.SaveChangesAsync(); return Ok(order); }
}
public sealed class CreateOrderRequest { public List<OrderLine> Items { get; set; } = []; public string RecipientName { get; set; } = ""; public string Phone { get; set; } = ""; public string Address { get; set; } = ""; public string? Note { get; set; } public decimal ShippingFee { get; set; } public string PaymentMethod { get; set; } = "SEPAY"; }
public sealed class OrderLine { public int ProductId { get; set; } public int? VariantId { get; set; } public string Name { get; set; } = ""; public string SizeLabel { get; set; } = ""; public decimal Price { get; set; } public int Quantity { get; set; } public string? ImageUrl { get; set; } }
public sealed class UpdateOrderStatusRequest { public string Status { get; set; } = ""; }
