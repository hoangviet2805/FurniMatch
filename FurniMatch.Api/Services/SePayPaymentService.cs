using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FurniMatch.Api.Models;

namespace FurniMatch.Api.Services;

public sealed class SePayOptions
{
    public string ApiToken { get; set; } = "";
    public string BankAccountId { get; set; } = "";
    public int PaymentTimeoutMinutes { get; set; } = 30;
}

public sealed class SePayPaymentService
{
    private readonly HttpClient _http;
    private readonly SePayOptions _options;

    public SePayPaymentService(HttpClient http, Microsoft.Extensions.Options.IOptions<SePayOptions> options)
    {
        _http = http;
        _options = options.Value;
    }

    public int PaymentTimeoutMinutes => _options.PaymentTimeoutMinutes;

    public async Task<string> CreateQrUrlAsync(Order order)
    {
        EnsureConfigured();
        var account = await GetAccountAsync();
        var amount = decimal.ToInt32(decimal.Truncate(order.TotalAmount));
        var parameters = new Dictionary<string, string>
        {
            ["acc"] = account.AccountNumber,
            ["bank"] = account.BankShortName,
            ["amount"] = amount.ToString(System.Globalization.CultureInfo.InvariantCulture),
            ["des"] = PaymentReference(order.OrderCode),
            ["template"] = "compact",
            ["showinfo"] = "true",
            ["holder"] = account.AccountHolderName
        };
        return "https://vietqr.app/img?" + string.Join("&", parameters.Select(pair => $"{pair.Key}={Uri.EscapeDataString(pair.Value)}"));
    }

    public async Task<bool> HasMatchingPaymentAsync(Order order)
    {
        EnsureConfigured();
        var amount = decimal.ToInt32(decimal.Truncate(order.TotalAmount));
        var query = new Dictionary<string, string>
        {
            ["bank_account_id"] = _options.BankAccountId,
            ["q"] = PaymentReference(order.OrderCode),
            ["amount_in_min"] = amount.ToString(System.Globalization.CultureInfo.InvariantCulture),
            ["amount_in_max"] = amount.ToString(System.Globalization.CultureInfo.InvariantCulture),
            ["transfer_type"] = "in",
            ["per_page"] = "20"
        };
        using var request = Authorize(new HttpRequestMessage(HttpMethod.Get, "transactions?" + string.Join("&", query.Select(pair => $"{pair.Key}={Uri.EscapeDataString(pair.Value)}"))));
        using var response = await _http.SendAsync(request);
        if (!response.IsSuccessStatusCode) return false;
        var payload = await response.Content.ReadFromJsonAsync<SePayListResponse<SePayTransaction>>(JsonOptions);
        return payload?.Data?.Any(transaction =>
            string.Equals(transaction.TransferType, "in", StringComparison.OrdinalIgnoreCase)
            && transaction.AmountIn == amount
            && NormalizeReference(transaction.TransactionContent).Contains(PaymentReference(order.OrderCode), StringComparison.OrdinalIgnoreCase)) == true;
    }

    private async Task<SePayBankAccount> GetAccountAsync()
    {
        using var request = Authorize(new HttpRequestMessage(HttpMethod.Get, $"bank-accounts/{_options.BankAccountId}"));
        using var response = await _http.SendAsync(request);
        if (!response.IsSuccessStatusCode) throw new InvalidOperationException("Không thể lấy thông tin tài khoản SePay để tạo mã QR.");
        var payload = await response.Content.ReadFromJsonAsync<SePayResponse<SePayBankAccount>>(JsonOptions);
        if (payload?.Data is not { AccountNumber: { Length: > 0 }, BankShortName: { Length: > 0 } } account) throw new InvalidOperationException("Thông tin tài khoản SePay chưa đầy đủ.");
        return account;
    }

    private HttpRequestMessage Authorize(HttpRequestMessage request)
    {
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiToken);
        return request;
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.ApiToken) || string.IsNullOrWhiteSpace(_options.BankAccountId)) throw new InvalidOperationException("Cổng thanh toán SePay chưa được cấu hình.");
    }

    // Banking apps and bank statements can omit punctuation from the transfer note.
    private static string PaymentReference(string orderCode) => NormalizeReference(orderCode);
    private static string NormalizeReference(string? value) => new string((value ?? "").Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
}

public sealed class SePayResponse<T> { public T? Data { get; set; } }
public sealed class SePayListResponse<T> { public List<T>? Data { get; set; } }
public sealed class SePayBankAccount
{
    [System.Text.Json.Serialization.JsonPropertyName("account_number")] public string AccountNumber { get; set; } = "";
    [System.Text.Json.Serialization.JsonPropertyName("bank_short_name")] public string BankShortName { get; set; } = "";
    [System.Text.Json.Serialization.JsonPropertyName("account_holder_name")] public string AccountHolderName { get; set; } = "";
}
public sealed class SePayTransaction
{
    [System.Text.Json.Serialization.JsonPropertyName("amount_in")] public decimal AmountIn { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("transfer_type")] public string? TransferType { get; set; }
    [System.Text.Json.Serialization.JsonPropertyName("transaction_content")] public string? TransactionContent { get; set; }
}
