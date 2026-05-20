namespace MediQuest.Api.Models;

public class DoseLog
{
    public int Id { get; set; }
    public int MedicationId { get; set; }
    public Medication Medication { get; set; } = null!;
    public DateTime TakenAt { get; set; }
    public DoseStatus Status { get; set; }
    public int XpEarned { get; set; }
}
