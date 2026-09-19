namespace FurniMatch.Api.DTOs
{
    public class VerifyRegistrationDto
    {
        public string Email { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
    }
}
