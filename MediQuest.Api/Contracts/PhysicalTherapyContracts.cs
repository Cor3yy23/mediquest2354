namespace MediQuest.Api.Contracts;

public record PhysicalTherapyTaskResponse(int Id, string Title, string? Instructions, bool IsActive, DateTime CreatedAt);
public record CreatePhysicalTherapyTaskRequest(string Title, string? Instructions, string? TargetUserId);
public record UpdatePhysicalTherapyTaskRequest(string Title, string? Instructions, bool IsActive);
