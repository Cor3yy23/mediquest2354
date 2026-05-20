namespace MediQuest.Api.Models;

public class UserUnlock
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public int UnlockDefinitionId { get; set; }
    public DateTime UnlockedAt { get; set; } = DateTime.UtcNow;

    public AppUser? User { get; set; }
    public UnlockDefinition? UnlockDefinition { get; set; }
}
