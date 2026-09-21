using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FurniMatch.Api.Models;

namespace FurniMatch.Api.Services;

public sealed class MomoPaymentService
{
    private readonly HttpClient _http;
    public MomoPaymentService(HttpClient http) => _http = http;

    public async Task<MomoCreateResponse> CreatePaymentAsync(Order order, PaymentQrConfig config)
    {
        var requestId = Guid.NewGuid().ToString("N");
        var orderId = order.OrderCode;
        var amount = decimal.Truncate(order.TotalAmount).ToString(System.Globalization.CultureInfo.InvariantCulture);
        var raw = $"accessKey={config.AccessKey}&amount={amount}&extraData=&ipnUrl={config.IpnUrl}&orderId={orderId}&orderInfo=Thanh toan don hang {orderId}&partnerCode={config.PartnerCode}&redirectUrl={config.RedirectUrl}&requestId={requestId}&requestType=captureWallet";
        var payload = new { partnerCode = config.PartnerCode, accessKey = config.AccessKey, requestId, amount, orderId, orderInfo = $"Thanh toan don hang {orderId}", redirectUrl = config.RedirectUrl, ipnUrl = config.IpnUrl, requestType = "captureWallet", extraData = "", lang = "vi", signature = Sign(raw, config.SecretKey) };
        using var response = await _http.PostAsJsonAsync(config.EndpointUrl, payload);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException("Không thể kết nối cổng thanh toán MoMo.");
        var result = JsonSerializer.Deserialize<MomoCreateResponse>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        if (result == null || result.ResultCode != 0) throw new InvalidOperationException(result?.Message ?? "MoMo không thể tạo yêu cầu thanh toán.");
        return result;
    }

    public static bool VerifySignature(MomoIpnRequest request, string secretKey)
    {
        var raw = $"accessKey={request.AccessKey}&amount={request.Amount}&extraData={request.ExtraData}&message={request.Message}&orderId={request.OrderId}&orderInfo={request.OrderInfo}&orderType={request.OrderType}&partnerCode={request.PartnerCode}&payType={request.PayType}&requestId={request.RequestId}&responseTime={request.ResponseTime}&resultCode={request.ResultCode}&transId={request.TransId}";
        return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(Sign(raw, secretKey)), Encoding.UTF8.GetBytes(request.Signature ?? ""));
    }
    private static string Sign(string value, string key) { using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(key)); return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(value))).ToLowerInvariant(); }
}
public sealed class MomoCreateResponse { public int ResultCode { get; set; } public string? Message { get; set; } public string? QrCodeUrl { get; set; } public string? Deeplink { get; set; } public string? PayUrl { get; set; } public string? OrderId { get; set; } }
public sealed class MomoIpnRequest { public string AccessKey { get; set; } = ""; public string Amount { get; set; } = ""; public string ExtraData { get; set; } = ""; public string Message { get; set; } = ""; public string OrderId { get; set; } = ""; public string OrderInfo { get; set; } = ""; public string OrderType { get; set; } = ""; public string PartnerCode { get; set; } = ""; public string PayType { get; set; } = ""; public string RequestId { get; set; } = ""; public string ResponseTime { get; set; } = ""; public int ResultCode { get; set; } public long TransId { get; set; } public string? Signature { get; set; } }
