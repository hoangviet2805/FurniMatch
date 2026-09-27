using FurniMatch.Api.Data;
using FurniMatch.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace FurniMatch.Api.Controllers;
[ApiController, Route("api/payment")]
public class PaymentController : ControllerBase
{
    private readonly FurniMatchDbContext _db;
    private readonly IEmailService _emailService;
    
    public PaymentController(FurniMatchDbContext db, IEmailService emailService) 
    {
        _db = db;
        _emailService = emailService;
    }
    [HttpPost("momo-ipn")]
    public async Task<IActionResult> MomoIpn(MomoIpnRequest request)
    {
        var config = await _db.PaymentQrConfigs.OrderByDescending(x => x.UpdatedAt).FirstOrDefaultAsync(x => x.IsActive);
        if (config == null || !MomoPaymentService.VerifySignature(request, config.SecretKey)) return BadRequest(new { message = "Chữ ký MoMo không hợp lệ." });
        var order = await _db.Orders.FirstOrDefaultAsync(x => x.OrderCode == request.OrderId); if (order == null) return NotFound();
        if (request.ResultCode == 0)
        {
            if (order.PaymentStatus != "PAID")
            {
                order.PaymentStatus = "PAID"; order.OrderStatus = "CONFIRMED"; order.LegacyStatus = order.OrderStatus; order.MomoTransId = request.TransId.ToString(); order.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                await SendOrderEmailToSeller(order.SellerId, order.OrderCode, order.TotalAmount);
            }
        }
        else
        {
            order.PaymentStatus = "FAILED"; order.OrderStatus = "WAITING_PAYMENT"; order.LegacyStatus = order.OrderStatus; order.MomoTransId = request.TransId.ToString(); order.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
        return Ok(new { message = "Đã nhận IPN." });
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
}
