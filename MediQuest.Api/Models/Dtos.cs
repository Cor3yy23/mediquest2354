namespace MediQuest.Api.Models;

public record MedicationDto(
    int Id,
    string Name,
    string? Strength,
    string? Directions,
    bool IsPrn,
    MedicationScheduleDto? Schedule);

public record MedicationScheduleDto(int TimesPerDay, IReadOnlyList<string> TimeSlots);

public record DoseCompleteRequest(int MedicationId, DoseStatus Status);

public record DoseCompleteResponse(int DoseId, int XpEarned, int TotalXp, int Level);

public record QuestDto(
    int Id,
    string Key,
    string Title,
    QuestType Type,
    int TargetCount,
    int RewardXp,
    QuestScope Scope,
    int CurrentCount,
    bool IsCompleted,
    bool IsClaimed,
    DateTime PeriodStart);

public record StatsDto(string Name, int TotalXp, int Level);
