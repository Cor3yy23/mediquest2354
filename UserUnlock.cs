namespace MediQuest.Api.Models;

public class PartyMember
{
    public int PartyId { get; set; }
    public Party Party { get; set; } = null!;
    public string UserId { get; set; } = string.Empty;
    public AppUser User { get; set; } = null!;
    public string Role { get; set; } = "Member";
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}
