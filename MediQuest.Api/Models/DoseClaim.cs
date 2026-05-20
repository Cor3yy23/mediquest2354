namespace MediQuest.Api.Models;

public class DoseClaim
{
    public int Id { get; set; }
    public string ClaimantUserId { get; set; } = string.Empty;
    public int PartyId { get; set; }
    public int? MedicationId { get; set; }
    public int? PhysicalTherapyTaskId { get; set; }
    public ClaimActivityType ActivityType { get; set; } = ClaimActivityType.Medication;
    public string ActivityLabel { get; set; } = string.Empty;
    public ClaimStatus Status { get; set; } = ClaimStatus.Pending;
    public int RequestedXp { get; set; }
    public int AwardedXp { get; set; }
    public string? DecisionNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }

    public AppUser? ClaimantUser { get; set; }
    public Party? Party { get; set; }
    public Medication? Medication { get; set; }
    public PhysicalTherapyTask? PhysicalTherapyTask { get; set; }
}
