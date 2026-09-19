using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using FurniMatch.Api.Data;
using FurniMatch.Api.DTOs;
using FurniMatch.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using FurniMatch.Api.Services;
using BC = BCrypt.Net.BCrypt;

namespace FurniMatch.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;

        public AuthController(FurniMatchDbContext context, IConfiguration configuration, IEmailService emailService)
        {
            _context = context;
            _configuration = configuration;
            _emailService = emailService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (existingUser != null)
            {
                if (existingUser.Status == "ACTIVE")
                {
                    return BadRequest("Email already exists.");
                }
                
                // If PENDING, allow re-registration by removing the old pending record
                _context.Users.Remove(existingUser);
                await _context.SaveChangesAsync();
            }

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == dto.RoleName.ToUpper());
            if (role == null)
            {
                // Create roles if they don't exist for the MVP
                role = new Role { RoleName = dto.RoleName.ToUpper() };
                _context.Roles.Add(role);
                await _context.SaveChangesAsync();
            }

            var user = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                Phone = dto.Phone,
                PasswordHash = BC.HashPassword(dto.Password),
                RoleId = role.RoleId,
                Status = "PENDING", // Set to PENDING until email is verified
                ShopName = dto.ShopName,
                ShopDescription = dto.ShopDescription,
                IsCustomSizeSupported = dto.IsCustomSizeSupported,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                Province = dto.Province,
                District = dto.District,
                Ward = dto.Ward,
                AddressDetail = dto.AddressDetail
            };

            var random = new Random();
            var code = random.Next(10000000, 99999999).ToString();
            
            user.ResetPasswordToken = code;
            user.ResetPasswordTokenExpiry = DateTime.UtcNow.AddMinutes(15);
            
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var emailBody = $@"
                <h2>Xác thực tài khoản FurniMatch</h2>
                <p>Cảm ơn bạn đã đăng ký tài khoản. Mã xác nhận của bạn là:</p>
                <h1 style='color: #4CAF50; font-size: 32px; letter-spacing: 5px;'>{code}</h1>
                <p>Mã này sẽ hết hạn sau 15 phút.</p>
            ";

            try
            {
                await _emailService.SendEmailAsync(dto.Email, "Xác thực tài khoản mới - FurniMatch", emailBody);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Không thể gửi email lúc này. Vui lòng kiểm tra cấu hình SMTP." });
            }

            return Ok(new { message = "Registration successful. Please verify OTP." });
        }

        [HttpPost("verify-registration")]
        public async Task<IActionResult> VerifyRegistration([FromBody] VerifyRegistrationDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email && u.Status == "PENDING");
            if (user == null)
            {
                return BadRequest(new { message = "Không tìm thấy yêu cầu đăng ký cho email này hoặc tài khoản đã được kích hoạt." });
            }

            if (user.ResetPasswordToken != dto.Code || user.ResetPasswordTokenExpiry < DateTime.UtcNow)
            {
                return BadRequest(new { message = "Mã xác thực không đúng hoặc đã hết hạn." });
            }

            // Kích hoạt tài khoản
            user.Status = "ACTIVE";
            user.ResetPasswordToken = null;
            user.ResetPasswordTokenExpiry = null;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ." });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null || !BC.Verify(dto.Password, user.PasswordHash))
            {
                return Unauthorized("Invalid email or password.");
            }

            if (user.Status != "ACTIVE")
            {
                return Unauthorized($"Account is {user.Status}.");
            }

            var token = GenerateJwtToken(user);

            return Ok(new AuthResponseDto
            {
                Token = token,
                UserId = user.UserId,
                FullName = user.FullName,
                Email = user.Email,
                Role = user.Role!.RoleName,
                Phone = user.Phone,
                ShopName = user.ShopName,
                ShopDescription = user.ShopDescription,
                IsCustomSizeSupported = user.IsCustomSizeSupported,
                Latitude = user.Latitude,
                Longitude = user.Longitude,
                Province = user.Province,
                District = user.District,
                Ward = user.Ward,
                AddressDetail = user.AddressDetail
            });
        }

        private string GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role!.RoleName)
            };

            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        [HttpPut("profile")]
        [Microsoft.AspNetCore.Authorization.Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out int userId))
            {
                return Unauthorized("User not authenticated.");
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound("User not found.");
            }

            user.FullName = dto.FullName;
            user.Phone = dto.Phone;
            user.ShopName = dto.ShopName;
            user.ShopDescription = dto.ShopDescription;
            user.IsCustomSizeSupported = dto.IsCustomSizeSupported;
            user.Latitude = dto.Latitude;
            user.Longitude = dto.Longitude;
            user.Province = dto.Province;
            user.District = dto.District;
            user.Ward = dto.Ward;
            user.AddressDetail = dto.AddressDetail;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Profile updated successfully.",
                user = new
                {
                    user.UserId,
                    user.FullName,
                    user.Email,
                    user.Phone,
                    user.ShopName,
                    user.ShopDescription,
                    user.IsCustomSizeSupported,
                    user.Latitude,
                    user.Longitude,
                    user.Province,
                    user.District,
                    user.Ward,
                    user.AddressDetail
                }
            });
        }
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null)
            {
                return NotFound(new { message = "Email của bạn không tồn tại trong hệ thống." });
            }

            var random = new Random();
            var code = random.Next(10000000, 99999999).ToString();
            
            user.ResetPasswordToken = code;
            user.ResetPasswordTokenExpiry = DateTime.UtcNow.AddMinutes(15);
            await _context.SaveChangesAsync();

            // Send email
            string subject = "Mã xác nhận khôi phục mật khẩu - FurniMatch";
            string body = $@"
                <h3>Chào bạn,</h3>
                <p>Bạn vừa yêu cầu khôi phục mật khẩu. Mã xác nhận của bạn là: <strong style='font-size: 24px;'>{code}</strong></p>
                <p>Mã này có hiệu lực trong vòng 15 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
                <br />
                <p>Trân trọng,</p>
                <p>FurniMatch Team</p>";
            
            try 
            {
                await _emailService.SendEmailAsync(user.Email, subject, body);
            } 
            catch (Exception)
            {
                return StatusCode(500, new { message = "Không thể gửi email lúc này, vui lòng thử lại sau." });
            }

            return Ok(new 
            { 
                message = "Mã xác nhận đã được gửi đến email của bạn." 
            });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => 
                u.Email == dto.Email &&
                u.ResetPasswordToken == dto.Code && 
                u.ResetPasswordTokenExpiry > DateTime.UtcNow);

            if (user == null)
            {
                return BadRequest("Mã xác nhận không hợp lệ hoặc đã hết hạn.");
            }

            user.PasswordHash = BC.HashPassword(dto.NewPassword);
            user.ResetPasswordToken = null;
            user.ResetPasswordTokenExpiry = null;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Đổi mật khẩu thành công." });
        }
    }
}
