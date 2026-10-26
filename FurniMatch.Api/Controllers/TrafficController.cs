using System;
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

namespace FurniMatch.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TrafficController : ControllerBase
    {
        private readonly FurniMatchDbContext _context;

        // Cấu hình thời gian hết hạn phiên (Hiện tại: 3 phút theo yêu cầu, sau này dễ dàng sửa thành 30)
        public const int SESSION_TIMEOUT_MINUTES = 3;

        public TrafficController(FurniMatchDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Ghi nhận lượt truy cập từ frontend (Công khai - cho cả khách và thành viên)
        /// </summary>
        [HttpPost("record")]
        [AllowAnonymous]
        public async Task<IActionResult> RecordVisit([FromBody] RecordTrafficRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.SessionId))
            {
                return BadRequest(new { message = "SessionId không được để trống." });
            }

            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers.ContainsKey("User-Agent") ? Request.Headers["User-Agent"].ToString() : null;
            if (userAgent != null && userAgent.Length > 255)
            {
                userAgent = userAgent.Substring(0, 255);
            }

            // Lấy UserId nếu người dùng đã đăng nhập
            int? currentUserId = null;
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out var parsedId))
            {
                currentUserId = parsedId;
            }

            var nowUtc = DateTime.UtcNow;
            var sessionCutoff = nowUtc.AddMinutes(-SESSION_TIMEOUT_MINUTES);

            // Kiểm tra xem sessionId này đã được ghi nhận trong phiên gần nhất (3 phút) chưa
            var existingSession = await _context.TrafficLogs
                .Where(t => t.SessionId == request.SessionId && t.CreatedAt >= sessionCutoff)
                .OrderByDescending(t => t.CreatedAt)
                .FirstOrDefaultAsync();

            if (existingSession != null)
            {
                // Phiên đã được tính 1 lượt trước đó
                // Nếu lần này phát sinh chuyển hóa (đăng nhập / thanh toán) thì nâng cấp trigger
                bool updated = false;
                if (request.TriggerReason.StartsWith("CONVERSION", StringComparison.OrdinalIgnoreCase) &&
                    !existingSession.TriggerReason.StartsWith("CONVERSION", StringComparison.OrdinalIgnoreCase))
                {
                    existingSession.TriggerReason = request.TriggerReason;
                    updated = true;
                }

                if (currentUserId.HasValue && !existingSession.UserId.HasValue)
                {
                    existingSession.UserId = currentUserId;
                    updated = true;
                }

                if (request.PagesCount > existingSession.PagesCount)
                {
                    existingSession.PagesCount = request.PagesCount;
                    updated = true;
                }

                if (request.DurationSeconds > existingSession.DurationSeconds)
                {
                    existingSession.DurationSeconds = request.DurationSeconds;
                    updated = true;
                }

                if (updated)
                {
                    await _context.SaveChangesAsync();
                }

                return Ok(new { success = true, isNew = false, message = "Session updated" });
            }

            // Phiên mới hoàn toàn: Ghi nhận 1 lượt truy cập hợp lệ mới
            var newLog = new TrafficLog
            {
                SessionId = request.SessionId,
                IpAddress = ip,
                UserAgent = userAgent,
                UserId = currentUserId,
                TriggerReason = request.TriggerReason,
                PagesCount = Math.Max(1, request.PagesCount),
                DurationSeconds = Math.Max(0, request.DurationSeconds),
                CreatedAt = nowUtc
            };

            _context.TrafficLogs.Add(newLog);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, isNew = true, message = "Visit recorded" });
        }

        /// <summary>
        /// Thống kê lượt truy cập theo tháng (cho Admin Dashboard)
        /// Tính từ 0h00 ngày hôm trước đến 0h00 ngày hôm sau theo múi giờ Việt Nam (UTC+7)
        /// </summary>
        [HttpGet("monthly-stats")]
        public async Task<IActionResult> GetMonthlyStats([FromQuery] int? year, [FromQuery] int? month)
        {
            var nowVn = DateTime.UtcNow.AddHours(7);
            int targetYear = year.HasValue && year.Value >= 2020 && year.Value <= 2100 ? year.Value : nowVn.Year;
            int targetMonth = month.HasValue && month.Value >= 1 && month.Value <= 12 ? month.Value : nowVn.Month;

            // Mốc 0h00 ngày đầu tháng theo giờ VN (UTC+7)
            DateTime startOfMonthVn = new DateTime(targetYear, targetMonth, 1, 0, 0, 0);
            DateTime endOfMonthVn = startOfMonthVn.AddMonths(1);

            // Chuyển sang UTC để truy vấn DB
            DateTime startOfMonthUtc = startOfMonthVn.AddHours(-7);
            DateTime endOfMonthUtc = endOfMonthVn.AddHours(-7);

            var logs = await _context.TrafficLogs
                .Where(t => t.CreatedAt >= startOfMonthUtc && t.CreatedAt < endOfMonthUtc)
                .AsNoTracking()
                .ToListAsync();

            int daysInMonth = DateTime.DaysInMonth(targetYear, targetMonth);
            var dailyStats = new List<DailyTrafficStatDto>();

            int peakDay = 1;
            int peakVisits = 0;

            for (int d = 1; d <= daysInMonth; d++)
            {
                var dayDate = new DateTime(targetYear, targetMonth, d);
                // Lọc các bản ghi thuộc ngày này theo giờ VN
                var dayLogs = logs.Where(l => {
                    var vnTime = l.CreatedAt.AddHours(7);
                    return vnTime.Year == targetYear && vnTime.Month == targetMonth && vnTime.Day == d;
                }).ToList();

                int visits = dayLogs.Count;
                int byTime = dayLogs.Count(x => x.TriggerReason.Contains("TIME", StringComparison.OrdinalIgnoreCase));
                int byPage = dayLogs.Count(x => x.TriggerReason.Contains("PAGE", StringComparison.OrdinalIgnoreCase));
                int byConversion = dayLogs.Count(x => x.TriggerReason.Contains("CONVERSION", StringComparison.OrdinalIgnoreCase));

                if (visits > peakVisits)
                {
                    peakVisits = visits;
                    peakDay = d;
                }

                dailyStats.Add(new DailyTrafficStatDto
                {
                    Day = d,
                    Date = $"{d:D2}/{targetMonth:D2}/{targetYear}",
                    DayOfWeek = GetVietnameseDayOfWeek(dayDate.DayOfWeek),
                    Visits = visits,
                    ByTime = byTime,
                    ByPage = byPage,
                    ByConversion = byConversion
                });
            }

            int totalVisits = logs.Count;
            int totalConversions = logs.Count(x => x.TriggerReason.Contains("CONVERSION", StringComparison.OrdinalIgnoreCase));
            double avgDaily = daysInMonth > 0 ? Math.Round((double)totalVisits / daysInMonth, 1) : 0;

            // Tính thống kê theo các tuần trong tháng (Tuần 1: 01-07, Tuần 2: 08-14,...)
            var weeklyStats = new List<WeeklyTrafficStatDto>();
            int weekNumber = 1;
            int peakWeek = 1;
            int peakWeekVisits = 0;

            for (int startDay = 1; startDay <= daysInMonth; startDay += 7)
            {
                int endDay = Math.Min(startDay + 6, daysInMonth);
                var weekDays = dailyStats.Where(x => x.Day >= startDay && x.Day <= endDay).ToList();
                int weekVisits = weekDays.Sum(x => x.Visits);
                int weekByTime = weekDays.Sum(x => x.ByTime);
                int weekByPage = weekDays.Sum(x => x.ByPage);
                int weekByConversion = weekDays.Sum(x => x.ByConversion);
                double weekAvg = weekDays.Count > 0 ? Math.Round((double)weekVisits / weekDays.Count, 1) : 0;

                if (weekVisits > peakWeekVisits)
                {
                    peakWeekVisits = weekVisits;
                    peakWeek = weekNumber;
                }

                weeklyStats.Add(new WeeklyTrafficStatDto
                {
                    WeekNumber = weekNumber,
                    WeekLabel = $"Tuần {weekNumber} ({startDay:D2}/{targetMonth:D2} - {endDay:D2}/{targetMonth:D2})",
                    ShortLabel = $"Tuần {weekNumber}",
                    StartDay = startDay,
                    EndDay = endDay,
                    Visits = weekVisits,
                    ByTime = weekByTime,
                    ByPage = weekByPage,
                    ByConversion = weekByConversion,
                    AverageDailyVisits = weekAvg,
                    Days = weekDays
                });

                weekNumber++;
            }

            var report = new MonthlyTrafficReportDto
            {
                Year = targetYear,
                Month = targetMonth,
                TotalVisits = totalVisits,
                PeakDay = peakDay,
                PeakDayVisits = peakVisits,
                PeakWeek = peakWeek,
                PeakWeekVisits = peakWeekVisits,
                AverageDailyVisits = avgDaily,
                TotalConversions = totalConversions,
                DailyStats = dailyStats,
                WeeklyStats = weeklyStats
            };

            return Ok(report);
        }

        private static string GetVietnameseDayOfWeek(DayOfWeek dow)
        {
            return dow switch
            {
                DayOfWeek.Monday => "Thứ Hai",
                DayOfWeek.Tuesday => "Thứ Ba",
                DayOfWeek.Wednesday => "Thứ Tư",
                DayOfWeek.Thursday => "Thứ Năm",
                DayOfWeek.Friday => "Thứ Sáu",
                DayOfWeek.Saturday => "Thứ Bảy",
                DayOfWeek.Sunday => "Chủ Nhật",
                _ => ""
            };
        }
    }
}
