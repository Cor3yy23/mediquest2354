namespace MediQuest.Api.Models;

public class MedicationSchedule
{
    public int Id { get; set; }
    public int MedicationId { get; set; }
    public Medication Medication { get; set; } = null!;
    public int TimesPerDay { get; set; }
    public string TimeSlotsJson { get; set; } = "[]";
}
