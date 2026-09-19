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

using System;
using FurniMatch.Api.Utils;

namespace FurniMatch.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuotationRequestsController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;

        public QuotationRequestsController(FurniMatchDbContext context)
        {
            _context = context;
        }

        [Authorize(Roles = "CUSTOMER")]
        [HttpPost]
        public async Task<IActionResult> CreateRequest([FromBody] QuotationRequestDto dto)
        {
            var customerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var customer = await _context.Users.FindAsync(customerId);

            if (customer == null) return Unauthorized();

            var request = new QuotationRequest
            {
                CustomerId = customerId,
                CategoryId = dto.CategoryId,
                ProductType = dto.ProductType,
                Pattern = dto.Pattern,
                Length = dto.Length,
                Width = dto.Width,
                Height = dto.Height,
                Material = dto.Material,
                FrameType = dto.FrameType,
                Color = dto.Color,
                Quantity = dto.Quantity,
                BudgetMin = dto.BudgetMin,
                BudgetMax = dto.BudgetMax,
                Description = dto.Description,
                Status = "OPEN"
            };

            _context.QuotationRequests.Add(request);
            await _context.SaveChangesAsync(); // Save to get the ID

            // 1. Tìm các Xưởng (Seller) hỗ trợ may đo (IsCustomSizeSupported = true)
            var sellers = await _context.Users
                .Include(u => u.Role)
                .Where(u => u.Role != null && u.Role.RoleName == "SELLER" && u.IsCustomSizeSupported)
                .ToListAsync();

            int matchedSellersCount = 0;

            // 2. Lọc theo bán kính (Radius R km)
            if (customer.Latitude.HasValue && customer.Longitude.HasValue)
            {
                foreach (var seller in sellers)
                {
                    if (seller.Latitude.HasValue && seller.Longitude.HasValue)
                    {
                        var distance = DistanceHelper.CalculateDistanceInKm(
                            customer.Latitude.Value, customer.Longitude.Value,
                            seller.Latitude.Value, seller.Longitude.Value);

                        if (distance <= dto.RadiusKm)
                        {
                            // 3. Tạo thông báo (Notification) cho các xưởng thỏa mãn
                            var notification = new Notification
                            {
                                UserId = seller.UserId,
                                Title = "Có Yêu cầu Khảo giá mới!",
                                Message = $"Một khách hàng cách bạn {Math.Round(distance, 1)}km vừa tạo yêu cầu cho sản phẩm {request.ProductType}. Hãy vào xem ngay!"
                            };
                            _context.Notifications.Add(notification);
                            matchedSellersCount++;
                        }
                    }
                }
                
                if (matchedSellersCount > 0)
                {
                    await _context.SaveChangesAsync();
                }
            }

            return Ok(new { 
                Request = request, 
                MatchedSellers = matchedSellersCount,
                Message = $"Đã gửi yêu cầu khảo giá thành công tới {matchedSellersCount} xưởng trong bán kính {dto.RadiusKm}km."
            });
        }

        [Authorize(Roles = "SELLER,CUSTOMER")]
        [HttpGet]
        public async Task<IActionResult> GetRequests()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var role = User.FindFirstValue(ClaimTypes.Role);

            if (role == "CUSTOMER")
            {
                var requests = await _context.QuotationRequests
                    .Where(qr => qr.CustomerId == userId)
                    .Include(qr => qr.Category)
                    .Include(qr => qr.Quotations)
                    .ToListAsync();
                return Ok(requests);
            }
            else // SELLER
            {
                var seller = await _context.Users.FindAsync(userId);
                if (seller == null || !seller.IsCustomSizeSupported)
                {
                    return Ok(new List<QuotationRequest>());
                }

                // Simplified matching: Seller sees all OPEN requests. 
                // For a real app, filter by category or seller capabilities.
                var requests = await _context.QuotationRequests
                    .Where(qr => qr.Status == "OPEN")
                    .Include(qr => qr.Category)
                    .ToListAsync();
                return Ok(requests);
            }
        }
    }
}
