using FurniMatch.Api.Data;
using FurniMatch.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FurniMatch.Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FooterSettingsController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;

        public FooterSettingsController(FurniMatchDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetFooterSetting()
        {
            var setting = await _context.FooterSettings.FirstOrDefaultAsync();
            if (setting == null)
            {
                // Return default values if not configured yet
                return Ok(new FooterSetting
                {
                    Description = "Nền tảng kết nối xưởng nội thất uy tín và chất lượng.",
                    Address = "Hà Nội, Việt Nam",
                    Phone = "0123 456 789",
                    Email = "contact@furnimatch.com",
                    HomeTitle = "Đặt Làm Nội Thất Theo Yêu Cầu",
                    HomeSubtitle = "Kết nối bạn với những xưởng sản xuất uy tín nhất. Chọn mẫu mã bạn thích, nhập kích thước riêng, và nhận báo giá tốt nhất."
                });
            }
            return Ok(setting);
        }

        [HttpPut]
        [Authorize(Roles = "ADMIN")]
        public async Task<IActionResult> UpdateFooterSetting([FromBody] FooterSetting updateDto)
        {
            var setting = await _context.FooterSettings.FirstOrDefaultAsync();
            if (setting == null)
            {
                // Create new
                setting = new FooterSetting();
                _context.FooterSettings.Add(setting);
            }

            setting.Description = updateDto.Description;
            setting.Address = updateDto.Address;
            setting.Phone = updateDto.Phone;
            setting.Email = updateDto.Email;
            setting.FacebookLink = updateDto.FacebookLink;
            setting.InstagramLink = updateDto.InstagramLink;
            setting.ZaloLink = updateDto.ZaloLink;
            setting.HomeTitle = updateDto.HomeTitle;
            setting.HomeSubtitle = updateDto.HomeSubtitle;

            await _context.SaveChangesAsync();

            return Ok(setting);
        }
    }
}
