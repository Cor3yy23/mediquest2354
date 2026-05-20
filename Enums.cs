using Microsoft.AspNetCore.Identity;

namespace MediQuest.Api.Models;

public class AppUser : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;
    public string? AccountType { get; set; }
    public string? MemberCode { get; set; }
    public int TotalXp { get; set; }
    public int Level { get; set; } = 1;
    public int XpIntoLevel { get; set; }
    public EpicConnection? EpicConnection { get; set; }
    public string? SelectedThemeKey { get; set; }
    public string? SelectedAvatarKey { get; set; }
}
