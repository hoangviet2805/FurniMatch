using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Net.Http;

namespace FurniMatch.Api.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string body);
    }

    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;
        private static readonly HttpClient _httpClient = new HttpClient();

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            try
            {
                var emailSettings = _config.GetSection("EmailSettings");
                var googleScriptUrl = emailSettings["GoogleScriptUrl"];
                
                // NẾU CÓ CẤU HÌNH GOOGLE SCRIPT WEBHOOK -> DÙNG HTTP API (PORT 443) ĐỂ LÁCH LUẬT RENDER
                if (!string.IsNullOrWhiteSpace(googleScriptUrl))
                {
                    var payload = new
                    {
                        to = toEmail,
                        subject = subject,
                        body = body
                    };
                    var content = new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
                    
                    var response = await _httpClient.PostAsync(googleScriptUrl, content);
                    if (response.IsSuccessStatusCode)
                    {
                        _logger.LogInformation("Email sent successfully via Google Apps Script Webhook to {Email}", toEmail);
                    }
                    else
                    {
                        _logger.LogWarning("Failed to send email via Webhook. Status Code: {StatusCode}", response.StatusCode);
                    }
                    return; // Gửi bằng HTTP thành công, thoát hàm
                }

                var senderEmail = emailSettings["SenderEmail"];
                var brevoApiKey = emailSettings["BrevoApiKey"];
                if (!string.IsNullOrWhiteSpace(brevoApiKey))
                {
                    // DÙNG BREVO HTTP API (Không bị Render chặn)
                    var senderName = "FurniMatch System";
                    var payload = new
                    {
                        sender = new { name = senderName, email = senderEmail },
                        to = new[] { new { email = toEmail } },
                        subject = subject,
                        htmlContent = body
                    };

                    _httpClient.DefaultRequestHeaders.Clear();
                    _httpClient.DefaultRequestHeaders.Add("api-key", brevoApiKey);
                    _httpClient.DefaultRequestHeaders.Accept.Add(new System.Net.Http.Headers.MediaTypeWithQualityHeaderValue("application/json"));

                    var content = new StringContent(JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");
                    var response = await _httpClient.PostAsync("https://api.brevo.com/v3/smtp/email", content);

                    if (response.IsSuccessStatusCode)
                    {
                        _logger.LogInformation("Email sent successfully via Brevo to {Email}", toEmail);
                    }
                    else
                    {
                        var errorResp = await response.Content.ReadAsStringAsync();
                        _logger.LogWarning("Failed to send email via Brevo. Status: {StatusCode}, Error: {Error}", response.StatusCode, errorResp);
                    }
                    return; // Nếu có cấu hình Brevo thì dùng Brevo, không chạy tiếp xuống SMTP
                }

                // NẾU KHÔNG CÓ BREVO KEY -> DÙNG SMTP PORT 587 NHƯ CŨ (Chỉ chạy được ở Localhost)
                var senderPassword = emailSettings["SenderPassword"];
                var host = emailSettings["Host"];
                var port = int.Parse(emailSettings["Port"] ?? "587");

                senderPassword = senderPassword?.Trim().Replace(" ", "");

                if (string.IsNullOrWhiteSpace(senderEmail) || string.IsNullOrWhiteSpace(senderPassword))
                {
                    _logger.LogWarning("Email settings are not configured properly. Cannot send email to {Email}", toEmail);
                    return;
                }

                using var smtpClient = new SmtpClient(host, port)
                {
                    EnableSsl = true,
                    UseDefaultCredentials = false,
                    Credentials = new NetworkCredential(senderEmail, senderPassword),
                    DeliveryMethod = SmtpDeliveryMethod.Network,
                    Timeout = 30000 // 30 seconds
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(senderEmail!, "FurniMatch System"),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true,
                };
                mailMessage.To.Add(toEmail);

                var sendTask = smtpClient.SendMailAsync(mailMessage);
                var completedTask = await Task.WhenAny(sendTask, Task.Delay(30000));
                if (completedTask == sendTask)
                {
                    await sendTask;
                    _logger.LogInformation("Email sent successfully to {Email} with subject: {Subject}", toEmail, subject);
                }
                else
                {
                    _logger.LogWarning("Email to {Email} timed out after 30s.", toEmail);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {Email}", toEmail);
            }
        }
    }
}
