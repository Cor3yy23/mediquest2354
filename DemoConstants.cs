namespace MediQuest.Api.Models;

public class UnlockDefinition
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public int LevelRequired { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}
