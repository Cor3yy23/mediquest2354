namespace MediQuest.Api.Models;

public class Quest
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public QuestType Type { get; set; }
    public int TargetCount { get; set; }
    public int RewardXp { get; set; }
    public QuestScope Scope { get; set; }
    public ICollection<QuestProgress> ProgressEntries { get; set; } = new List<QuestProgress>();
}
