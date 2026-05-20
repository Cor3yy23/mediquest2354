namespace MediQuest.Api.Models;

public class EpicConnection
{
    public string UserId { get; set; } = string.Empty;
    public string FhirBaseUrl { get; set; } = string.Empty;
    public string? PatientId { get; set; }
    public string AccessToken { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime ExpiresAt { get; set; }
    public string? IdToken { get; set; }
    public string Scopes { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public AppUser? User { get; set; }
}
