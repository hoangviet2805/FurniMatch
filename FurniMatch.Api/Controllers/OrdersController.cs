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
    private readonly FurniMatchDbContext _db; private readonly SePayPaymentService _sepay; private readonly IEmailService _emailService; private readonly FurniMatch.Api.Services.IPhotoService _photoService;
    public OrdersController(FurniMatchDbContext db, SePayPaymentService sepay, IEmailService emailService, FurniMatch.Api.Services.IPhotoService photoService) { _db = db; _sepay = sepay; _emailService = emailService; _photoService = photoService; }
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
            if (variant.Stock <= 0)
            {
                try
                {
                    var sellerEmail = (await _db.Users.FindAsync(sellerId))?.Email;
                    if (!string.IsNullOrEmpty(sellerEmail))
                    {
                        string lbl = string.IsNullOrEmpty(item.SizeLabel) ? "Tiêu chuẩn" : item.SizeLabel;
                        string subj = $"[FurniMatch] Thông báo hết hàng: {item.Name}";
                        string body = $@"<div style='font-family: Arial; padding: 20px; color: #333;'><h2 style='color: #e11d48;'>Thông báo hết hàng</h2><p>Sản phẩm <strong>{item.Name}</strong> - phân loại <strong>{lbl}</strong> hiện đã hết số lượng trong kho.</p><p>Vui lòng đăng nhập vào trang quản trị để cập nhật thêm kho hàng nếu bạn muốn tiếp tục bán sản phẩm này.</p><br/><p>Trân trọng,<br/>FurniMatch</p></div>";
                        await _emailService.SendEmailAsync(sellerEmail, subj, body);
                    }
                } catch { }
            }
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
    [HttpDelete("my/cancelled"), Authorize(Roles = "CUSTOMER")]
    public async Task<IActionResult> DeleteCancelledOrders()
    {
        var cancelledOrders = await _db.Orders
            .Where(x => x.CustomerId == UserId && x.OrderStatus == "CANCELLED")
            .ToListAsync();
            
        if (cancelledOrders.Any())
        {
            _db.Orders.RemoveRange(cancelledOrders);
            await _db.SaveChangesAsync();
        }
        
        return Ok(new { message = "Đã xóa tất cả đơn hàng đã hủy" });
    }

    [HttpGet("my"), Authorize(Roles = "CUSTOMER")]
    public async Task<IActionResult> Mine()
    {
        var now = DateTime.UtcNow;
        var expiredOrders = await _db.Orders.Where(x => x.CustomerId == UserId && x.PaymentStatus == "PENDING" && x.PaymentExpiredAt <= now).ToListAsync();
        if (expiredOrders.Any())
        {
            foreach (var o in expiredOrders) { await CancelOrderAsync(o); }
            await _db.SaveChangesAsync();
        }

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
                        d.SellerNote,
                        d.ReturnReceivedAt,
                        d.AdminNote,
                        d.CreatedAt,
                        d.ResolvedAt
                    })
                    .FirstOrDefault()
            })
            .ToListAsync();
        return Ok(orders);
    }

    [HttpPost("quotation"), Authorize(Roles = "CUSTOMER")]
    public async Task<IActionResult> CreateFromQuotation(CreateOrderFromQuotationRequest request)
    {
        if (request.QuotationId <= 0 || string.IsNullOrWhiteSpace(request.RecipientName) || string.IsNullOrWhiteSpace(request.Phone) || string.IsNullOrWhiteSpace(request.Address)) return BadRequest(new { message = "Vui lòng điền đủ thông tin nhận hàng." });
        
        var quotation = await _db.Quotations
            .Include(q => q.QuotationRequest)
            .FirstOrDefaultAsync(q => q.QuotationId == request.QuotationId);
            
        if (quotation == null || quotation.QuotationRequest == null || quotation.QuotationRequest.CustomerId != UserId) return BadRequest(new { message = "Không tìm thấy báo giá hoặc báo giá không thuộc về bạn." });
        
        // Cập nhật trạng thái
        quotation.Status = "ACCEPTED";
        quotation.QuotationRequest.Status = "SELLER_SELECTED";
        
        // Tạo đơn hàng ảo từ quotation
        var order = new Order
        {
            OrderCode = "QT-" + DateTime.UtcNow.Ticks.ToString().Substring(8, 6),
            CustomerId = UserId,
            SellerId = quotation.SellerId,
            RecipientName = request.RecipientName,
            RecipientPhone = request.Phone,
            Address = request.Address,
            Note = request.Note,
            ShippingFee = request.ShippingFee,
            Subtotal = quotation.Price,
            TotalAmount = quotation.Price + request.ShippingFee,
            PaymentMethod = "SEPAY",
            PaymentStatus = "PENDING",
            OrderStatus = "PENDING",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            PaymentExpiredAt = DateTime.UtcNow.AddMinutes(15),
            ItemsJson = System.Text.Json.JsonSerializer.Serialize(new[] {
                new {
                    ProductId = 0,
                    Name = quotation.QuotationRequest.ProductType,
                    SizeLabel = $"{quotation.QuotationRequest.Length}x{quotation.QuotationRequest.Width}x{quotation.QuotationRequest.Height}cm",
                    Price = quotation.Price,
                    Quantity = 1,
                    ImageUrl = quotation.QuotationRequest.ImageUrl ?? ""
                }
            })
        };

        _db.Orders.Add(order);
        await _db.SaveChangesAsync();

        var bankAccount = "9998188188"; 
        var bankId = "MB";
        var amount = (int)order.TotalAmount;
        var sepayUrl = $"https://qr.sepay.vn/img?acc={bankAccount}&bank={bankId}&amount={amount}&des={order.OrderCode}";

        return Ok(new { orderId = order.OrderId, orderCode = order.OrderCode, qrCodeUrl = sepayUrl, expiredAt = order.PaymentExpiredAt });
    }

    [HttpGet("seller"), Authorize(Roles = "SELLER")]
    public async Task<IActionResult> Seller()
    {
        var now = DateTime.UtcNow;
        var expiredOrders = await _db.Orders.Where(x => x.SellerId == UserId && x.PaymentStatus == "PENDING" && x.PaymentExpiredAt <= now).ToListAsync();
        if (expiredOrders.Any())
        {
            foreach (var o in expiredOrders) { await CancelOrderAsync(o); }
            await _db.SaveChangesAsync();
        }
        var orders = await _db.Orders
            .Where(x => x.SellerId == UserId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(o => new {
                o.OrderId,
                o.OrderCode,
                o.CustomerId,
                o.SellerId,
                o.RecipientName,
                o.RecipientPhone,
                o.Address,
                o.ItemsJson,
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
                Customer = o.Customer != null ? new { o.Customer.UserId, o.Customer.FullName, o.Customer.Email, o.Customer.Phone } : null,
                Dispute = _db.OrderDisputes
                    .Where(d => d.OrderId == o.OrderId)
                    .OrderByDescending(d => d.CreatedAt)
                    .Select(d => new {
                        d.OrderDisputeId,
                        d.Reason,
                        d.Status,
                        d.EvidenceImages,
                        d.SellerNote,
                        d.ReturnReceivedAt,
                        d.AdminNote,
                        d.CreatedAt,
                        d.ResolvedAt
                    })
                    .FirstOrDefault()
            })
            .ToListAsync();
        return Ok(orders);
    }
    [HttpGet("{id:int}")] public async Task<IActionResult> Get(int id)
    {
        var order = await _db.Orders.FindAsync(id);
        if (order == null || (order.CustomerId != UserId && order.SellerId != UserId)) return NotFound();
        if (order.PaymentStatus == "PENDING" && order.PaymentExpiredAt <= DateTime.UtcNow)
        {
            await CancelOrderAsync(order); await _db.SaveChangesAsync();
        }
        else if (order.PaymentStatus == "PENDING")
        {
            try
            {
                if (await _sepay.HasMatchingPaymentAsync(order))
                {
                    order.PaymentStatus = "PAID"; order.OrderStatus = "CONFIRMED"; order.LegacyStatus = "CONFIRMED"; order.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync();
                    await SendOrderEmailToSeller(order.SellerId, order.OrderCode, order.TotalAmount);
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

    private async Task CancelOrderAsync(Order order)
    {
        if (order.OrderStatus == "CANCELLED") return;
        order.PaymentStatus = "EXPIRED";
        order.OrderStatus = "CANCELLED";
        order.LegacyStatus = "CANCELLED";
        if (!string.IsNullOrEmpty(order.ItemsJson))
        {
            try
            {
                var items = JsonSerializer.Deserialize<List<OrderLine>>(order.ItemsJson, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
                if (items != null)
                {
                    foreach (var item in items)
                    {
                        var variant = item.VariantId.HasValue 
                            ? await _db.ProductVariants.FirstOrDefaultAsync(v => v.VariantId == item.VariantId.Value)
                            : await _db.ProductVariants.FirstOrDefaultAsync(v => v.ProductId == item.ProductId);
                        if (variant != null)
                        {
                            variant.Stock += item.Quantity;
                            var product = await _db.Products.FindAsync(variant.ProductId);
                            if (product != null && product.Status == "OUT_OF_STOCK") product.Status = "ACTIVE";
                        }
                    }
                }
            }
            catch { }
        }
    }

    [HttpPatch("{id:int}/cancel"), Authorize(Roles = "CUSTOMER")]
    public async Task<IActionResult> Cancel(int id)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(x => x.OrderId == id && x.CustomerId == UserId);
        if (order == null) return NotFound();
        if (order.PaymentStatus == "PAID") return BadRequest(new { message = "Đơn đã thanh toán, không thể hủy tại đây." });
        await CancelOrderAsync(order);
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

        var existing = await _db.OrderDisputes.AnyAsync(d => d.OrderId == id && 
            (d.Status == "OPEN" || d.Status == "PENDING_SELLER" || d.Status == "RETURN_RECEIVED" || d.Status == "RESOLVED"));
        if (existing) return BadRequest(new { message = "Đã có khiếu nại đang xử lý hoặc đã được chấp thuận cho đơn hàng này." });

        if (string.IsNullOrWhiteSpace(form.Reason))
            return BadRequest(new { message = "Vui lòng nhập lý do khiếu nại." });

        var imageUrls = new List<string>();
        if (form.Images != null && form.Images.Count > 0)
        {
            foreach (var file in form.Images)
            {
                if (file.Length > 0)
                {
                    var ext = Path.GetExtension(file.FileName).ToLower();
                    var allowedExts = new[] { ".jpg", ".jpeg", ".png", ".webp" };
                    if (!allowedExts.Contains(ext)) continue;

                    var url = await _photoService.AddMediaAsync(file, "furnimatch_disputes");
                    if (!string.IsNullOrEmpty(url))
                    {
                        imageUrls.Add(url);
                    }
                }
            }
        }

        var dispute = new FurniMatch.Api.Models.OrderDispute
        {
            OrderId = id,
            CustomerId = UserId,
            Reason = form.Reason.Trim(),
            EvidenceImages = imageUrls.Count > 0 ? System.Text.Json.JsonSerializer.Serialize(imageUrls) : null,
            Status = "PENDING_SELLER",
            CreatedAt = DateTime.UtcNow
        };
        _db.OrderDisputes.Add(dispute);
        order.PayoutStatus = "DISPUTED";

        _db.Notifications.Add(new Notification
        {
            UserId = order.SellerId,
            Title = "Yêu cầu khiếu nại từ khách hàng ⚠️",
            Message = $"Khách hàng đã gửi yêu cầu khiếu nại cho đơn hàng #{order.OrderCode}. Vui lòng kiểm tra email và xác nhận sau khi nhận lại hàng hoàn.",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });

        // Thông báo cho Customer
        _db.Notifications.Add(new Notification
        {
            UserId = UserId,
            Title = "Đã gửi khiếu nại thành công 📨",
            Message = $"Yêu cầu khiếu nại cho đơn hàng #{order.OrderCode} đã được gửi trực tiếp tới xưởng sản xuất. Vui lòng gửi trả hàng để xưởng kiểm tra.",
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync();

        // Gửi email thông báo cho Seller
        var customer = await _db.Users.FindAsync(UserId);
        _ = Task.Run(async () =>
        {
            try
            {
                await SendDisputeEmailToSeller(order.SellerId, order, customer, form.Reason.Trim(), imageUrls);
            }
            catch { /* Ignored background email error */ }
        });

        return Ok(new { message = "Yêu cầu khiếu nại đã được chuyển trực tiếp tới người bán kèm email thông báo. Khi người bán nhận hàng hoàn hợp lệ, Admin sẽ duyệt hoàn tiền vào ví cho bạn." });
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

    private async Task SendOrderEmailToSeller(int sellerId, string orderCode, decimal amount)
    {
        var seller = await _db.Users.FindAsync(sellerId);
        if (seller != null && !string.IsNullOrEmpty(seller.Email))
        {
            string subject = $"🎉 Bạn có đơn hàng mới - {orderCode}";
            string htmlBody = $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);'>
                <div style='background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;'>
                    <h1 style='color: white; margin: 0; font-size: 24px; font-weight: 700;'>Bạn vừa nhận được đơn hàng mới! 🎊</h1>
                </div>
                <div style='padding: 30px; background-color: #ffffff;'>
                    <p style='font-size: 16px; color: #374151; line-height: 1.6; margin-top: 0;'>Chào <strong>{seller.FullName ?? "Nhà sản xuất"}</strong>,</p>
                    <p style='font-size: 16px; color: #374151; line-height: 1.6;'>Khách hàng vừa hoàn tất thanh toán thành công cho đơn hàng <strong>{orderCode}</strong>.</p>
                    
                    <div style='background-color: #f3f4f6; border-left: 4px solid #10b981; padding: 15px 20px; border-radius: 4px; margin: 25px 0;'>
                        <p style='margin: 0; font-size: 14px; color: #6b7280; text-transform: uppercase; font-weight: bold;'>Mã đơn hàng</p>
                        <p style='margin: 5px 0 0 0; font-size: 20px; color: #111827; font-weight: 800;'>{orderCode}</p>
                        
                        <p style='margin: 15px 0 0 0; font-size: 14px; color: #6b7280; text-transform: uppercase; font-weight: bold;'>Tổng tiền thanh toán</p>
                        <p style='margin: 5px 0 0 0; font-size: 20px; color: #10b981; font-weight: 800;'>{amount:N0} VNĐ</p>
                    </div>

                    <p style='font-size: 16px; color: #374151; line-height: 1.6;'>Vui lòng đăng nhập vào hệ thống để kiểm tra chi tiết đơn hàng và tiến hành chuẩn bị sản phẩm.</p>
                    
                    <div style='text-align: center; margin-top: 35px; margin-bottom: 20px;'>
                        <a href='http://localhost:5173/seller/orders' style='background-color: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.25);'>Xem Chi Tiết Đơn Hàng</a>
                    </div>
                </div>
                <div style='background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;'>
                    <p style='margin: 0; font-size: 13px; color: #6b7280;'>© 2026 FurniMatch. Trân trọng cảm ơn bạn đã hợp tác cùng chúng tôi.</p>
                </div>
            </div>";
            await _emailService.SendEmailAsync(seller.Email, subject, htmlBody);
        }
    }

    private async Task SendDisputeEmailToSeller(int sellerId, Order order, User? customer, string reason, List<string> imageUrls)
    {
        var seller = await _db.Users.FindAsync(sellerId);
        if (seller != null && !string.IsNullOrEmpty(seller.Email))
        {
            string customerName = customer?.FullName ?? order.RecipientName;
            string customerPhone = customer?.Phone ?? order.RecipientPhone;
            string customerAddress = order.Address;
            decimal totalAmount = order.TotalAmount > 0 ? order.TotalAmount : order.Subtotal;

            string subject = $"⚠️ [Khiếu nại & Yêu cầu hoàn hàng] Đơn hàng #{order.OrderCode}";
            string htmlBody = $@"
            <div style='font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);'>
                <div style='background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;'>
                    <h1 style='color: white; margin: 0; font-size: 22px; font-weight: 700;'>⚠️ Yêu Cầu Khiếu Nại & Hoàn Hàng</h1>
                    <p style='color: #fef3c7; margin: 6px 0 0 0; font-size: 14px;'>Đơn hàng #{order.OrderCode}</p>
                </div>
                <div style='padding: 28px; background-color: #ffffff;'>
                    <p style='font-size: 16px; color: #374151; line-height: 1.6; margin-top: 0;'>Chào <strong>{seller.FullName ?? "Quý xưởng"}</strong>,</p>
                    <p style='font-size: 15px; color: #4b5563; line-height: 1.6;'>
                        Khách hàng vừa gửi yêu cầu khiếu nại cho đơn hàng <strong>#{order.OrderCode}</strong> và mong muốn hoàn trả hàng về xưởng của bạn.
                    </p>
                    
                    <!-- Order & Customer Summary -->
                    <div style='background-color: #f9fafb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 6px; margin: 20px 0;'>
                        <p style='margin: 0 0 8px 0; font-size: 14px; color: #374151;'><strong>Mã đơn hàng:</strong> #{order.OrderCode}</p>
                        <p style='margin: 0 0 8px 0; font-size: 14px; color: #374151;'><strong>Giá trị đơn hàng:</strong> <span style='color: #d97706; font-weight: 700;'>{totalAmount:N0} VNĐ</span></p>
                        <p style='margin: 0 0 8px 0; font-size: 14px; color: #374151;'><strong>Khách hàng:</strong> {customerName}</p>
                        <p style='margin: 0 0 8px 0; font-size: 14px; color: #374151;'><strong>Số điện thoại:</strong> {customerPhone}</p>
                        <p style='margin: 0; font-size: 14px; color: #374151;'><strong>Địa chỉ khách hàng:</strong> {customerAddress}</p>
                    </div>

                    <!-- Complaint Reason -->
                    <div style='background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 16px; margin: 20px 0;'>
                        <p style='margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #991b1b;'>Lý do khiếu nại từ khách hàng:</p>
                        <p style='margin: 0; font-size: 14px; color: #7f1d1d; line-height: 1.6; font-style: italic;'>""{reason}""</p>
                        {(imageUrls.Count > 0 ? $"<p style='margin: 10px 0 0 0; font-size: 13px; color: #991b1b;'><em>(Khách hàng đã đính kèm {imageUrls.Count} hình ảnh bằng chứng trên hệ thống)</em></p>" : "")}
                    </div>

                    <!-- Next Steps for Seller -->
                    <div style='background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 18px; margin: 24px 0;'>
                        <p style='margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #065f46;'>📌 Quy trình xử lý tiếp theo dành cho xưởng:</p>
                        <ol style='margin: 0; padding-left: 20px; font-size: 14px; color: #047857; line-height: 1.7;'>
                            <li>Chủ động liên hệ với khách hàng qua số điện thoại <strong>{customerPhone}</strong> để tiếp nhận và hướng dẫn gửi hàng hoàn về địa chỉ của xưởng.</li>
                            <li>Khi đã nhận được kiện hàng hoàn trả từ khách hàng, vui lòng kiểm tra tình trạng hàng hóa.</li>
                            <li>Nếu hàng hoàn đúng và <strong>không có vấn đề gì xảy ra</strong>, hãy truy cập Kênh Người Bán &gt; mục <strong>Khiếu nại &amp; Hàng hoàn</strong> và bấm nút <strong>""Xác nhận đã nhận hàng hoàn""</strong>.</li>
                            <li>Ngay sau khi xưởng xác nhận, <strong>Admin sẽ kiểm duyệt và hoàn tiền vào ví cho khách hàng</strong> để đóng khiếu nại.</li>
                        </ol>
                    </div>
                    
                    <div style='text-align: center; margin: 30px 0 10px 0;'>
                        <a href='http://localhost:5173/seller/dashboard?tab=DISPUTES' style='background-color: #d97706; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px rgba(217, 119, 6, 0.25);'>Xem Chi Tiết Khiếu Nại &amp; Xác Nhận</a>
                    </div>
                </div>
                <div style='background-color: #f9fafb; padding: 18px; text-align: center; border-top: 1px solid #e5e7eb;'>
                    <p style='margin: 0; font-size: 13px; color: #6b7280;'>FurniMatch Escrow System - Hệ thống bảo vệ quyền lợi người mua và người bán.</p>
                </div>
            </div>";

            await _emailService.SendEmailAsync(seller.Email, subject, htmlBody);
        }
    }
}
public sealed class CreateOrderRequest { public List<OrderLine> Items { get; set; } = []; public string RecipientName { get; set; } = ""; public string Phone { get; set; } = ""; public string Address { get; set; } = ""; public string? Note { get; set; } public decimal ShippingFee { get; set; } public string PaymentMethod { get; set; } = "SEPAY"; }
public sealed class OrderLine { public int ProductId { get; set; } public int? VariantId { get; set; } public string Name { get; set; } = ""; public string SizeLabel { get; set; } = ""; public decimal Price { get; set; } public int Quantity { get; set; } public string? ImageUrl { get; set; } }
public sealed class UpdateOrderStatusRequest { public string Status { get; set; } = ""; }
public sealed class CreateDisputeRequest { public string Reason { get; set; } = ""; }
public sealed class CreateDisputeForm { public string Reason { get; set; } = ""; public List<IFormFile>? Images { get; set; } }
public sealed class UpdateShippingInfoRequest { public string RecipientName { get; set; } = ""; public string Phone { get; set; } = ""; public string Address { get; set; } = ""; public string? Note { get; set; } }

p u b l i c   s e a l e d   c l a s s   C r e a t e O r d e r F r o m Q u o t a t i o n R e q u e s t   {   p u b l i c   i n t   Q u o t a t i o n I d   {   g e t ;   s e t ;   }   p u b l i c   s t r i n g   R e c i p i e n t N a m e   {   g e t ;   s e t ;   }   =   " " ;   p u b l i c   s t r i n g   P h o n e   {   g e t ;   s e t ;   }   =   " " ;   p u b l i c   s t r i n g   A d d r e s s   {   g e t ;   s e t ;   }   =   " " ;   p u b l i c   s t r i n g ?   N o t e   {   g e t ;   s e t ;   }   p u b l i c   d e c i m a l   S h i p p i n g F e e   {   g e t ;   s e t ;   }   p u b l i c   s t r i n g   P a y m e n t M e t h o d   {   g e t ;   s e t ;   }   =   " S E P A Y " ;   }  
 