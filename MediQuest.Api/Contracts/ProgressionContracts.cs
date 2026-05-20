namespace MediQuest.Api.Contracts;

public record UnlockItemResponse(string Key, string Category, string DisplayName, int LevelRequired, DateTime? UnlockedAt);
public record ProgressionResponse(int Level, int TotalXp, int XpToday, int XpIntoLevel, int NextLevelRequirement, string Rank, IReadOnlyList<UnlockItemResponse> Unlocks, string? SelectedThemeKey, string? SelectedAvatarKey);

public record UpdateCosmeticsRequest(string? SelectedThemeKey, string? SelectedAvatarKey);
