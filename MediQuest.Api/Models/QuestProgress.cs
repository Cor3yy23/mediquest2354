namespace MediQuest.Api.Models;

public class QuestProgress
{
    public int Id { get; set; }
    public int QuestId { get; set; }
    public Quest Quest { get; set; } = null!;
    public int CurrentCount { get; set; }
    public bool IsCompleted { get; set; }
    public bool IsClaimed { get; set; }
    public DateTime PeriodStart { get; set; }
}
