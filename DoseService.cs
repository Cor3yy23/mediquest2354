namespace MediQuest.Api.Models;

public class User
{
    public int Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public int TotalXp { get; set; }
    public ICollection<PartyMember> PartyMemberships { get; set; } = new List<PartyMember>();
}
