namespace MediQuest.Api.Models;

public class Medication
{
    public int Id { get; set; }
    public string OwnerUserId { get; set; } = string.Empty;
    public string Source { get; set; } = "Manual";
    public string Name { get; set; } = string.Empty;
    public string? StrengthText { get; set; }
    public string? DirectionsText { get; set; }
    public bool IsActive { get; set; } = true;
    public int? QuantityOnHand { get; set; }
    public int? DosesRemaining { get; set; }
    public int LowSupplyThreshold { get; set; } = 3;
    public MedicationRefillStatus RefillStatus { get; set; } = MedicationRefillStatus.None;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public AppUser? OwnerUser { get; set; }
}
