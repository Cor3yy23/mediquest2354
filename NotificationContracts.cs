using MediQuest.Api.Models;

namespace MediQuest.Api.Contracts;

public record CreateClaimRequest(int PartyId, int? MedicationId, int? PhysicalTherapyTaskId, ClaimActivityType? ActivityType);
public record ClaimResponse(
    int Id,
    int PartyId,
    int? MedicationId,
    int? PhysicalTherapyTaskId,
    ClaimActivityType ActivityType,
    string ActivityLabel,
    ClaimStatus Status,
    int RequestedXp,
    int AwardedXp,
    DateTime CreatedAt,
    DateTime? ReviewedAt,
    string? DecisionNote);
public record ReviewClaimRequest(string? Note);
public record GrantXpRequest(int Amount);
