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
    public class QuotationsController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;

        public QuotationsController(FurniMatchDbContext context)
        {
            _context = context;
        }

        [Authorize(Roles = "SELLER")]
        [HttpPost]
        public async Task<IActionResult> SubmitQuotation([FromBody] QuotationDto dto)
        {
            var sellerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var request = await _context.QuotationRequests.FindAsync(dto.QuotationRequestId);
            if (request == null || request.Status != "OPEN")
            {
                return BadRequest("Invalid or closed quotation request.");
            }

            var quotation = new Quotation
            {
                QuotationRequestId = dto.QuotationRequestId,
                SellerId = sellerId,
                Price = dto.Price,
                ProductionDays = dto.ProductionDays,
                Note = dto.Note,
                Status = "SUBMITTED"
            };

            _context.Quotations.Add(quotation);
            
            // Optionally change status to RECEIVING_QUOTES
            if (request.Status == "OPEN")
            {
                request.Status = "RECEIVING_QUOTES";
            }

            await _context.SaveChangesAsync();

            return Ok(quotation);
        }

        [Authorize(Roles = "CUSTOMER")]
        [HttpPost("{id}/accept")]
        public async Task<IActionResult> AcceptQuotation(int id)
        {
            var customerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var quotation = await _context.Quotations
                .Include(q => q.QuotationRequest)
                .FirstOrDefaultAsync(q => q.QuotationId == id);

            if (quotation == null || quotation.QuotationRequest!.CustomerId != customerId)
            {
                return Unauthorized();
            }

            quotation.Status = "ACCEPTED";
            quotation.QuotationRequest.Status = "SELLER_SELECTED";

            // Mark other quotations as REJECTED
            var otherQuotations = await _context.Quotations
                .Where(q => q.QuotationRequestId == quotation.QuotationRequestId && q.QuotationId != id)
                .ToListAsync();

            foreach (var q in otherQuotations)
            {
                q.Status = "REJECTED";
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Quotation accepted." });
        }
    }
}
