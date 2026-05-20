namespace MediQuest.Api.Models;

public class PhysicalTherapyTask
{
    public int Id { get; set; }
    public string OwnerUserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Instructions { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public AppUser? OwnerUser { get; set; }
}
