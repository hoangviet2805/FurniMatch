using System;
using System.ComponentModel.DataAnnotations;

namespace FurniMatch.Api.Models
{
    public class PaymentQrConfig
    {
        [Key]
        public int ConfigId { get; set; }

        // MoMo sandbox credentials
        [MaxLength(100)]
        public string PartnerCode { get; set; } = "MOMO";

        [MaxLength(200)]
        public string AccessKey { get; set; } = "F8BBA842ECF85DC";

        [MaxLength(500)]
        public string SecretKey { get; set; } = "K951B6PE1waDMi640xX08PD3vg6EkVlz";

        // MoMo endpoint (sandbox or production)
        public string EndpointUrl { get; set; } = "https://test-payment.momo.vn/v2/gateway/api/create";

        // URL MoMo redirect sau khi thanh toán
        public string RedirectUrl { get; set; } = "http://localhost:5174/orders";

        // URL MoMo gọi IPN callback (cần là URL public, VD: ngrok)
        public string IpnUrl { get; set; } = "http://localhost:5234/api/payment/momo-ipn";

        // Thời hạn thanh toán tính bằng phút (mặc định 30)
        public int PaymentTimeoutMinutes { get; set; } = 30;

        public bool IsActive { get; set; } = true;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
