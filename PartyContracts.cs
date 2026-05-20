using MediQuest.Api.Models;

namespace MediQuest.Api.Contracts;

public record MedicationResponse(
    int Id,
    string Source,
    string Name,
    string? StrengthText,
    string? DirectionsText,
    bool IsActive,
    int? QuantityOnHand,
    int? DosesRemaining,
    int LowSupplyThreshold,
    MedicationRefillStatus RefillStatus,
    bool IsLowSupply,
    DateTime CreatedAt);

public record CreateMedicationRequest(
    string Name,
    string? StrengthText,
    string? DirectionsText,
    bool IsActive,
    int? QuantityOnHand,
    int? DosesRemaining,
    int? LowSupplyThreshold,
    string? TargetUserId);

public record UpdateMedicationRequest(
    string Name,
    string? StrengthText,
    string? DirectionsText,
    bool IsActive,
    int? QuantityOnHand,
    int? DosesRemaining,
    int? LowSupplyThreshold);

public record UpdateMedicationRefillStatusRequest(MedicationRefillStatus RefillStatus);
