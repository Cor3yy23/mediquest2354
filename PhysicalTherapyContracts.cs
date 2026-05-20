namespace MediQuest.Api.Contracts;

public record NotificationResponse(
    int Id,
    string Type,
    string Title,
    string Body,
    DateTime CreatedAt,
    DateTime? DueAt,
    DateTime? ReadAt,
    string? MetaJson);
