using System.Linq;
using System.Threading.Tasks;
using FurniMatch.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FurniMatch.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    // [Authorize(Roles = "ADMIN")] // Uncomment when auth is fully strictly tested from UI
    public class AdminController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;

        public AdminController(FurniMatchDbContext context)
        {
            _context = context;
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetUsers([FromQuery] string role = "")
        {
            var query = _context.Users
                .Include(u => u.Role)
                .AsQueryable();

            if (!string.IsNullOrEmpty(role))
            {
                query = query.Where(u => u.Role.RoleName.ToUpper() == role.ToUpper());
            }

            var users = await query
                .Select(u => new
                {
                    u.UserId,
                    u.FullName,
                    u.Email,
                    u.Phone,
                    u.Status,
                    u.ShopName,
                    u.CreatedAt,
                    RoleName = u.Role.RoleName
                })
                .OrderByDescending(u => u.CreatedAt)
                .ToListAsync();

            return Ok(users);
        }

        [HttpPut("users/{id}/status")]
        public async Task<IActionResult> UpdateUserStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            user.Status = dto.Status.ToUpper();
            await _context.SaveChangesAsync();

            return Ok(new { message = "Status updated successfully", status = user.Status });
        }

        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            try
            {
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();
                return Ok(new { message = "User deleted successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Không thể xóa người dùng này vì họ đang có dữ liệu liên kết. Chi tiết lỗi: " + (ex.InnerException?.Message ?? ex.Message) });
            }
        }
    }

    public class UpdateStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }
}
