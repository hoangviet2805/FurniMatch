using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.DTOs
{
    public class RecordTrafficRequest
    {
        [Required]
        [MaxLength(64)]
        public string SessionId { get; set; } = string.Empty;

        [Required]
        [MaxLength(30)]
        public string TriggerReason { get; set; } = string.Empty;

        public int PagesCount { get; set; } = 1;

        public int DurationSeconds { get; set; } = 0;
    }

    public class DailyTrafficStatDto
    {
        public int Day { get; set; }
        public string Date { get; set; } = string.Empty; // dd/MM/yyyy
        public string DayOfWeek { get; set; } = string.Empty; // Thứ Hai, Thứ Ba...
        public int Visits { get; set; }
        public int ByTime { get; set; }
        public int ByPage { get; set; }
        public int ByConversion { get; set; }
    }

    public class WeeklyTrafficStatDto
    {
        public int WeekNumber { get; set; }
        public string WeekLabel { get; set; } = string.Empty; // "Tuần 1 (01/10 - 07/10)"
        public string ShortLabel { get; set; } = string.Empty; // "Tuần 1"
        public int StartDay { get; set; }
        public int EndDay { get; set; }
        public int Visits { get; set; }
        public int ByTime { get; set; }
        public int ByPage { get; set; }
        public int ByConversion { get; set; }
        public double AverageDailyVisits { get; set; }
        public List<DailyTrafficStatDto> Days { get; set; } = new List<DailyTrafficStatDto>();
    }

    public class MonthlyTrafficReportDto
    {
        public int Year { get; set; }
        public int Month { get; set; }
        public int TotalVisits { get; set; }
        public int PeakDay { get; set; }
        public int PeakDayVisits { get; set; }
        public int PeakWeek { get; set; }
        public int PeakWeekVisits { get; set; }
        public double AverageDailyVisits { get; set; }
        public int TotalConversions { get; set; }
        public List<DailyTrafficStatDto> DailyStats { get; set; } = new List<DailyTrafficStatDto>();
        public List<WeeklyTrafficStatDto> WeeklyStats { get; set; } = new List<WeeklyTrafficStatDto>();
    }
}
