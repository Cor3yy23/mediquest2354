namespace MediQuest.Api.Models;

public class MedicationImportMap
{
    public int Id { get; set; }
    public string OwnerUserId { get; set; } = string.Empty;
    public string EpicResourceType { get; set; } = string.Empty;
    public string EpicResourceId { get; set; } = string.Empty;
    public int MedicationId { get; set; }
    public Medication Medication { get; set; } = null!;
    public DateTime LastImportedAt { get; set; } = DateTime.UtcNow;
}
