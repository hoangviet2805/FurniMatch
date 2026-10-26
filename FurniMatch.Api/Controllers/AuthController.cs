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
using Microsoft.Extensions.Caching.Memory;
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
        private readonly IMemoryCache _memoryCache;

        public AuthController(
            FurniMatchDbContext context, 
            IConfiguration configuration, 
            IServiceScopeFactory scopeFactory, 
            IWebHostEnvironment env, 
            IPhotoService photoService,
            IMemoryCache memoryCache)
        {
            _context = context;
            _configuration = configuration;
            _scopeFactory = scopeFactory;
            _env = env;
            _photoService = photoService;
            _memoryCache = memoryCache;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromForm] RegisterDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(new { message = "Email không được để trống." });
            }

            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
            if (existingUser != null)
            {
                // Nếu là tài khoản PENDING cũ (chưa từng xác thực OTP trước đây) thì cho phép ghi đè/dọn dẹp để đăng ký lại
                if (existingUser.Status == "PENDING")
                {
                    _context.Users.Remove(existingUser);
                    await _context.SaveChangesAsync();
                }
                else
                {
                    return BadRequest(new { message = "Email này đã được đăng ký trong hệ thống." });
                }
            }

            var roleName = string.IsNullOrWhiteSpace(dto.RoleName) ? "CUSTOMER" : dto.RoleName.Trim().ToUpper();
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == roleName);
            if (role == null)
            {
                role = new Role { RoleName = roleName };
                _context.Roles.Add(role);
                await _context.SaveChangesAsync();
            }

            var documentUrls = new List<string>();
            // Lưu các tài liệu tải lên nếu là SELLER
            if (roleName == "SELLER" && dto.Documents != null && dto.Documents.Count > 0)
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
                            documentUrls.Add(url);
                        }
                    }
                }
            }

            var random = new Random();
            var code = random.Next(10000000, 99999999).ToString();

            // Lưu thông tin đăng ký vào IMemoryCache (TTL: 15 phút), KHÔNG ghi vào DB để tránh rác nếu user bỏ dở
            var pending = new PendingRegistration
            {
                FullName = dto.FullName,
                Email = normalizedEmail,
                Phone = dto.Phone,
                PasswordHash = BC.HashPassword(dto.Password),
                RoleId = role.RoleId,
                RoleName = role.RoleName,
                ShopName = dto.ShopName,
                ShopDescription = dto.ShopDescription,
                IsCustomSizeSupported = dto.IsCustomSizeSupported,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                Province = dto.Province,
                District = dto.District,
                Ward = dto.Ward,
                AddressDetail = dto.AddressDetail,
                DocumentUrls = documentUrls,
                OtpCode = code,
                ExpiryTime = DateTime.UtcNow.AddMinutes(15)
            };

            var cacheKey = $"pending_reg_{normalizedEmail}";
            _memoryCache.Set(cacheKey, pending, TimeSpan.FromMinutes(15));

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

        [HttpPost("resend-registration-otp")]
        public IActionResult ResendRegistrationOtp([FromBody] ResendRegistrationOtpDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(new { message = "Email không được để trống." });
            }

            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
            var cacheKey = $"pending_reg_{normalizedEmail}";

            if (!_memoryCache.TryGetValue<PendingRegistration>(cacheKey, out var pending) || pending == null)
            {
                return BadRequest(new { message = "Yêu cầu đăng ký đã hết hạn hoặc không tồn tại. Vui lòng quay lại đăng ký lại từ đầu." });
            }

            var random = new Random();
            var code = random.Next(10000000, 99999999).ToString();
            pending.OtpCode = code;
            pending.ExpiryTime = DateTime.UtcNow.AddMinutes(15);
            _memoryCache.Set(cacheKey, pending, TimeSpan.FromMinutes(15));

            var emailBody = $@"
                <h2>Xác thực tài khoản FurniMatch</h2>
                <p>Mã xác nhận mới của bạn là:</p>
                <h1 style='color: #4CAF50; font-size: 32px; letter-spacing: 5px;'>{code}</h1>
                <p>Mã này sẽ hết hạn sau 15 phút.</p>
            ";

            var targetEmail = pending.Email;
            _ = Task.Run(async () =>
            {
                using (var scope = _scopeFactory.CreateScope())
                {
                    var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
                    try
                    {
                        await emailService.SendEmailAsync(targetEmail, "Mã xác thực mới - FurniMatch", emailBody);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[EmailService] Failed to send email to {targetEmail}: {ex.Message}");
                    }
                }
            });

            return Ok(new { message = "Mã xác thực mới đã được gửi vào email của bạn." });
        }

        [HttpPost("verify-registration")]
        public async Task<IActionResult> VerifyRegistration([FromBody] VerifyRegistrationDto dto)
        {
            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
            var cacheKey = $"pending_reg_{normalizedEmail}";

            // 1. Kiểm tra trong IMemoryCache
            if (!_memoryCache.TryGetValue<PendingRegistration>(cacheKey, out var pending) || pending == null)
            {
                // Fallback hỗ trợ nếu có tài khoản PENDING từ hệ thống cũ trong DB
                var legacyPendingUser = await _context.Users
                    .Include(u => u.Role)
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail && u.Status == "PENDING");

                if (legacyPendingUser == null)
                {
                    return BadRequest(new { message = "Không tìm thấy yêu cầu đăng ký cho email này hoặc mã đã hết hạn. Vui lòng đăng ký lại." });
                }

                if (legacyPendingUser.ResetPasswordToken != dto.Code || legacyPendingUser.ResetPasswordTokenExpiry < DateTime.UtcNow)
                {
                    return BadRequest(new { message = "Mã xác thực không đúng hoặc đã hết hạn." });
                }

                if (legacyPendingUser.Role?.RoleName == "SELLER")
                {
                    legacyPendingUser.Status = "PENDING_APPROVAL";
                }
                else
                {
                    legacyPendingUser.Status = "ACTIVE";
                }
                legacyPendingUser.ResetPasswordToken = null;
                legacyPendingUser.ResetPasswordTokenExpiry = null;
                await _context.SaveChangesAsync();

                if (legacyPendingUser.Status == "PENDING_APPROVAL")
                {
                    return Ok(new { message = "Xác thực email thành công! Đơn đăng ký nhà sản xuất của bạn đang chờ Admin phê duyệt.", isSeller = true });
                }

                var legacyToken = GenerateJwtToken(legacyPendingUser);
                return Ok(new
                {
                    message = "Xác thực tài khoản thành công!",
                    isSeller = false,
                    token = legacyToken,
                    userId = legacyPendingUser.UserId,
                    fullName = legacyPendingUser.FullName,
                    email = legacyPendingUser.Email,
                    role = legacyPendingUser.Role!.RoleName,
                    phone = legacyPendingUser.Phone,
                    shopName = legacyPendingUser.ShopName,
                    shopDescription = legacyPendingUser.ShopDescription,
                    isCustomSizeSupported = legacyPendingUser.IsCustomSizeSupported,
                    latitude = legacyPendingUser.Latitude,
                    longitude = legacyPendingUser.Longitude,
                    province = legacyPendingUser.Province,
                    district = legacyPendingUser.District,
                    ward = legacyPendingUser.Ward,
                    addressDetail = legacyPendingUser.AddressDetail
                });
            }

            // 2. Kiểm tra mã OTP và hạn dùng trong Cache
            if (pending.OtpCode != dto.Code.Trim() || pending.ExpiryTime < DateTime.UtcNow)
            {
                return BadRequest(new { message = "Mã xác thực không đúng hoặc đã hết hạn." });
            }

            // 3. Kiểm tra lại phòng hờ trùng email
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
            if (existingUser != null)
            {
                if (existingUser.Status == "PENDING")
                {
                    _context.Users.Remove(existingUser);
                }
                else
                {
                    _memoryCache.Remove(cacheKey);
                    return BadRequest(new { message = "Email này đã được đăng ký bởi tài khoản khác." });
                }
            }

            var userRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleId == pending.RoleId) 
                ?? await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == pending.RoleName);

            // 4. CHÍNH THỨC TẠO TÀI KHOẢN VÀO CƠ SỞ DỮ LIỆU
            var user = new User
            {
                FullName = pending.FullName,
                Email = pending.Email,
                Phone = pending.Phone,
                PasswordHash = pending.PasswordHash,
                RoleId = userRole?.RoleId ?? pending.RoleId,
                Status = pending.RoleName == "SELLER" ? "PENDING_APPROVAL" : "ACTIVE",
                ShopName = pending.ShopName,
                ShopDescription = pending.ShopDescription,
                IsCustomSizeSupported = pending.IsCustomSizeSupported,
                Latitude = pending.Latitude,
                Longitude = pending.Longitude,
                Province = pending.Province,
                District = pending.District,
                Ward = pending.Ward,
                AddressDetail = pending.AddressDetail,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Lưu các tài liệu chứng minh xưởng (nếu là Seller)
            if (pending.DocumentUrls != null && pending.DocumentUrls.Count > 0)
            {
                foreach (var url in pending.DocumentUrls)
                {
                    _context.SellerDocuments.Add(new SellerDocument
                    {
                        UserId = user.UserId,
                        ImageUrl = url
                    });
                }
                await _context.SaveChangesAsync();
            }

            // 5. Xóa dữ liệu tạm trong Cache
            _memoryCache.Remove(cacheKey);

            if (user.Status == "PENDING_APPROVAL")
            {
                return Ok(new { message = "Xác thực email thành công! Đơn đăng ký nhà sản xuất của bạn đang chờ Admin phê duyệt.", isSeller = true });
            }

            user.Role = userRole;
            var token = GenerateJwtToken(user);
            return Ok(new
            {
                message = "Xác thực tài khoản thành công!",
                isSeller = false,
                token = token,
                userId = user.UserId,
                fullName = user.FullName,
                email = user.Email,
                role = user.Role?.RoleName ?? "CUSTOMER",
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
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
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
