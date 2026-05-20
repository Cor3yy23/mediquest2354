namespace MediQuest.Api.Models;

public enum MedicationRefillStatus
{
    None = 0,
    RefillNeeded = 1,
    InProgress = 2,
    Resolved = 3,
    Approved = 4,
    Denied = 5
}
