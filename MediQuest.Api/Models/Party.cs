namespace MediQuest.Api.Models;

public class Party
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string OwnerUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int TotalXp { get; set; }
    public AppUser? OwnerUser { get; set; }
    public ICollection<PartyMember> Members { get; set; } = new List<PartyMember>();
}
