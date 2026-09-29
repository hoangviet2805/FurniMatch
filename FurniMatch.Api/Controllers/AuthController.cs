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
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using FurniMatch.Api.Services;
using Microsoft.AspNetCore.Hosting;
using BC = BCrypt.Net.BCrypt;

namespace FurniMatch.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IWebHostEnvironment _env;
        private readonly IPhotoService _photoService;

        public AuthController(FurniMatchDbContext context, IConfiguration configuration, IServiceScopeFactory scopeFactory, IWebHostEnvironment env, IPhotoService photoService)
        {
            _context = context;
            _configuration = configuration;
            _scopeFactory = scopeFactory;
            _env = env;
            _photoService = photoService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromForm] RegisterDto dto)
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

            // Save uploaded documents for SELLER
            if (dto.RoleName.ToUpper() == "SELLER" && dto.Documents != null && dto.Documents.Count > 0)
            {
                if (dto.Documents.Count > 10)
                {
                    return BadRequest(new { message = "Bạn chỉ có thể tải lên tối đa 10 ảnh." });
                }

                foreach (var file in dto.Documents)
                {
                    if (file.Length > 0)
                    {
                        var url = await _photoService.AddMediaAsync(file, "furnimatch_seller_docs");
                        if (!string.IsNullOrEmpty(url))
                        {
                            var sellerDoc = new SellerDocument
                            {
                                UserId = user.UserId,
                                ImageUrl = url
                            };
                            _context.SellerDocuments.Add(sellerDoc);
                        }
                    }
                }
                await _context.SaveChangesAsync();
            }

            var emailBody = $@"
                <h2>Xác thực tài khoản FurniMatch</h2>
                <p>Cảm ơn bạn đã đăng ký tài khoản. Mã xác nhận của bạn là:</p>
                <h1 style='color: #4CAF50; font-size: 32px; letter-spacing: 5px;'>{code}</h1>
                <p>Mã này sẽ hết hạn sau 15 phút.</p>
            ";

            // Gửi email xác nhận trong background để tránh nghẽn thread
            var targetEmail = dto.Email;
            _ = Task.Run(async () =>
            {
                using (var scope = _scopeFactory.CreateScope())
                {
                    var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
                    try
                    {
                        await emailService.SendEmailAsync(targetEmail, "Xác thực tài khoản mới - FurniMatch", emailBody);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[EmailService] Failed to send email to {targetEmail}: {ex.Message}");
                    }
                }
            });

            return Ok(new { message = "Registration successful. Please verify OTP." });
        }

        [HttpPost("verify-registration")]
        public async Task<IActionResult> VerifyRegistration([FromBody] VerifyRegistrationDto dto)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == dto.Email && u.Status == "PENDING");
            if (user == null)
            {
                return BadRequest(new { message = "Không tìm thấy yêu cầu đăng ký cho email này hoặc tài khoản đã được kích hoạt." });
            }

            if (user.ResetPasswordToken != dto.Code || user.ResetPasswordTokenExpiry < DateTime.UtcNow)
            {
                return BadRequest(new { message = "Mã xác thực không đúng hoặc đã hết hạn." });
            }

            // Kích hoạt tài khoản
            if (user.Role?.RoleName == "SELLER")
            {
                user.Status = "PENDING_APPROVAL";
            }
            else
            {
                user.Status = "ACTIVE";
            }
            user.ResetPasswordToken = null;
            user.ResetPasswordTokenExpiry = null;

            await _context.SaveChangesAsync();

            if (user.Status == "PENDING_APPROVAL")
            {
                return Ok(new { message = "Xác thực email thành công! Đơn đăng ký nhà sản xuất của bạn đang chờ Admin phê duyệt.", isSeller = true });
            }

            var token = GenerateJwtToken(user);
            return Ok(new
            {
                message = "Xác thực tài khoản thành công!",
                isSeller = false,
                token = token,
                userId = user.UserId,
                fullName = user.FullName,
                email = user.Email,
                role = user.Role!.RoleName,
                phone = user.Phone,
                shopName = user.ShopName,
                shopDescription = user.ShopDescription,
                isCustomSizeSupported = user.IsCustomSizeSupported,
                latitude = user.Latitude,
                longitude = user.Longitude,
                province = user.Province,
                district = user.District,
                ward = user.Ward,
                addressDetail = user.AddressDetail
            });
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

            if (user.Status == "PENDING_APPROVAL")
            {
                return Unauthorized(new { message = "Đơn đăng ký của bạn đang chờ kiểm duyệt viên xét duyệt." });
            }
            if (user.Status == "REJECTED")
            {
                return Unauthorized(new { message = "Đơn đăng ký của bạn đã bị từ chối. Vui lòng kiểm tra email để biết lý do và liên hệ hỗ trợ." });
            }
            if (user.Status != "ACTIVE")
            {
                return Unauthorized(new { message = $"Tài khoản của bạn đang ở trạng thái {user.Status}." });
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

            // Sanitize ShopName and ShopDescription
            if (!string.IsNullOrEmpty(dto.ShopName) || !string.IsNullOrEmpty(dto.ShopDescription))
            {
                var phoneRegex = new System.Text.RegularExpressions.Regex(@"\b\d{8,12}\b");
                var urlRegex = new System.Text.RegularExpressions.Regex(@"(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                
                if ((!string.IsNullOrEmpty(dto.ShopName) && (phoneRegex.IsMatch(dto.ShopName) || urlRegex.IsMatch(dto.ShopName))) ||
                    (!string.IsNullOrEmpty(dto.ShopDescription) && (phoneRegex.IsMatch(dto.ShopDescription) || urlRegex.IsMatch(dto.ShopDescription))))
                {
                    return BadRequest("Không được phép nhập thông tin liên hệ cá nhân (số điện thoại, link website) vào Tên Shop hoặc Mô tả Shop.");
                }
            }

            if (!string.IsNullOrWhiteSpace(dto.FullName)) user.FullName = dto.FullName;
            if (!string.IsNullOrWhiteSpace(dto.Phone)) user.Phone = dto.Phone;
            if (dto.ShopName != null) user.ShopName = dto.ShopName;
            if (dto.ShopDescription != null) user.ShopDescription = dto.ShopDescription;
            if (dto.AvatarUrl != null) user.AvatarUrl = dto.AvatarUrl;
            if (dto.CoverUrl != null) user.CoverUrl = dto.CoverUrl;
            user.IsCustomSizeSupported = dto.IsCustomSizeSupported;
            if (dto.Latitude.HasValue) user.Latitude = dto.Latitude;
            if (dto.Longitude.HasValue) user.Longitude = dto.Longitude;
            if (!string.IsNullOrWhiteSpace(dto.Province)) user.Province = dto.Province;
            if (!string.IsNullOrWhiteSpace(dto.District)) user.District = dto.District;
            if (!string.IsNullOrWhiteSpace(dto.Ward)) user.Ward = dto.Ward;
            if (!string.IsNullOrWhiteSpace(dto.AddressDetail)) user.AddressDetail = dto.AddressDetail;

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
                    user.AvatarUrl,
                    user.CoverUrl,
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

        [Authorize(Roles = "SELLER")]
        [HttpPut("toggle-custom-size")]
        public async Task<IActionResult> ToggleCustomSize()
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            user.IsCustomSizeSupported = !user.IsCustomSizeSupported;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                isCustomSizeSupported = user.IsCustomSizeSupported,
                message = user.IsCustomSizeSupported ? "Đã bật nhận đặt hàng theo yêu cầu thành công." : "Đã tắt nhận đặt hàng theo yêu cầu."
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
            
            // Gửi email xác nhận trong background
            var targetEmail = user.Email;
            _ = Task.Run(async () =>
            {
                using (var scope = _scopeFactory.CreateScope())
                {
                    var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
                    try 
                    {
                        await emailService.SendEmailAsync(targetEmail, subject, body);
                    } 
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[EmailService] Failed to send email to {targetEmail}: {ex.Message}");
                    }
                }
            });

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
        [Authorize]
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
            {
                return Unauthorized();
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return NotFound("Người dùng không tồn tại.");
            }

            if (!BC.Verify(dto.OldPassword, user.PasswordHash))
            {
                return BadRequest("Mật khẩu cũ không chính xác.");
            }

            user.PasswordHash = BC.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đổi mật khẩu thành công." });
        }
    }
}
