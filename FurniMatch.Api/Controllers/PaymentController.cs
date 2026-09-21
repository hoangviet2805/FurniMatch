using FurniMatch.Api.Data;
using FurniMatch.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace FurniMatch.Api.Controllers;
[ApiController, Route("api/payment")]
public class PaymentController : ControllerBase
{
    private readonly FurniMatchDbContext _db; public PaymentController(FurniMatchDbContext db) => _db = db;
    [HttpPost("momo-ipn")]
    public async Task<IActionResult> MomoIpn(MomoIpnRequest request)
    {
        var config = await _db.PaymentQrConfigs.OrderByDescending(x => x.UpdatedAt).FirstOrDefaultAsync(x => x.IsActive);
        if (config == null || !MomoPaymentService.VerifySignature(request, config.SecretKey)) return BadRequest(new { message = "Chữ ký MoMo không hợp lệ." });
        var order = await _db.Orders.FirstOrDefaultAsync(x => x.OrderCode == request.OrderId); if (order == null) return NotFound();
        order.PaymentStatus = request.ResultCode == 0 ? "PAID" : "FAILED"; order.OrderStatus = request.ResultCode == 0 ? "CONFIRMED" : "WAITING_PAYMENT"; order.LegacyStatus = order.OrderStatus; order.MomoTransId = request.TransId.ToString(); order.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(); return Ok(new { message = "Đã nhận IPN." });
    }
}
