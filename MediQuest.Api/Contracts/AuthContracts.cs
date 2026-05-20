namespace MediQuest.Api.Contracts;

public record RegisterRequest(string Email, string Password, string DisplayName, string? AccountType);
public record LoginRequest(string Email, string Password);
public record AuthResponse(string AccessToken, int ExpiresIn);
public record MeResponse(string UserId, string Email, string DisplayName, string MemberCode, string Role, string? SelectedThemeKey, string? SelectedAvatarKey);
