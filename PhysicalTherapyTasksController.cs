using System.Security.Claims;
using MediQuest.Api.Contracts;
using MediQuest.Api.Data;
using MediQuest.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MediQuest.Api.Services;

namespace MediQuest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/medications")]
public class MedicationsController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly NotificationService _notificationService;
    private readonly ILogger<MedicationsController> _logger;

    public MedicationsController(AppDbContext dbContext, NotificationService notificationService, ILogger<MedicationsController> logger)
    {
        _dbContext = dbContext;
        _notificationService = notificationService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<MedicationResponse>>> Get([FromQuery] string? ownerUserId = null)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var requestedOwnerUserId = string.IsNullOrWhiteSpace(ownerUserId) ? userId : ownerUserId.Trim();
        var isAdmin = await IsAdminAsync(userId);
        var canManageRequestedOwner = requestedOwnerUserId == userId
            || isAdmin
            || await IsPartyOwnerOfMemberAsync(userId, requestedOwnerUserId);
        if (!canManageRequestedOwner)
        {
            return Forbid();
        }

        var meds = await _dbContext.Medications
            .Where(x => x.OwnerUserId == requestedOwnerUserId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        foreach (var medication in meds)
        {
            await _notificationService.CreateLowSupplyReminderIfMissingAsync(requestedOwnerUserId, medication);
        }

        var responses = meds.Select(MapMedication).ToList();
        if (_dbContext.ChangeTracker.HasChanges())
        {
            await _dbContext.SaveChangesAsync();
        }
        return Ok(responses);
    }

    [HttpPost]
    public async Task<ActionResult<MedicationResponse>> Post(CreateMedicationRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var isAdmin = await IsAdminAsync(userId);
        var requestedOwnerUserId = string.IsNullOrWhiteSpace(request.TargetUserId) ? userId : request.TargetUserId.Trim();
        var canManageRequestedOwner = requestedOwnerUserId == userId
            || isAdmin
            || await IsPartyOwnerOfMemberAsync(userId, requestedOwnerUserId);
        if (!canManageRequestedOwner)
        {
            return Forbid();
        }

        if (!isAdmin && requestedOwnerUserId == userId && await IsChildMemberAccountAsync(userId))
        {
            return Forbid();
        }

        var med = new Medication
        {
            OwnerUserId = requestedOwnerUserId,
            Source = "Manual",
            Name = request.Name,
            StrengthText = request.StrengthText,
            DirectionsText = request.DirectionsText,
            IsActive = request.IsActive,
            QuantityOnHand = request.QuantityOnHand,
            DosesRemaining = request.DosesRemaining,
            LowSupplyThreshold = request.LowSupplyThreshold is > 0 ? request.LowSupplyThreshold.Value : 3
        };
        _dbContext.Medications.Add(med);
        await _dbContext.SaveChangesAsync();
        await _notificationService.CreateLowSupplyReminderIfMissingAsync(requestedOwnerUserId, med);
        return Ok(MapMedication(med));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult> Put(int id, UpdateMedicationRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var isAdmin = await IsAdminAsync(userId);
        if (!isAdmin && await IsChildMemberAccountAsync(userId))
        {
            return Forbid();
        }

        var med = await _dbContext.Medications.FirstOrDefaultAsync(x => x.Id == id);
        if (med is null) return NotFound();
        var canManageMedication = med.OwnerUserId == userId
            || isAdmin
            || await IsPartyOwnerOfMemberAsync(userId, med.OwnerUserId);
        if (!canManageMedication)
        {
            return Forbid();
        }

        med.Name = request.Name;
        med.StrengthText = request.StrengthText;
        med.DirectionsText = request.DirectionsText;
        med.IsActive = request.IsActive;
        med.QuantityOnHand = request.QuantityOnHand;
        med.DosesRemaining = request.DosesRemaining;
        med.LowSupplyThreshold = request.LowSupplyThreshold is > 0 ? request.LowSupplyThreshold.Value : med.LowSupplyThreshold;

        await _dbContext.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:int}/refill-status")]
    public async Task<ActionResult<MedicationResponse>> UpdateRefillStatus(int id, UpdateMedicationRefillStatusRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var isAdmin = await IsAdminAsync(userId);
        var med = await _dbContext.Medications.FirstOrDefaultAsync(x => x.Id == id);
        if (med is null) return NotFound();

        var isOwner = med.OwnerUserId == userId;
        var isOwnerParent = await IsPartyOwnerOfMemberAsync(userId, med.OwnerUserId);
        if (!isOwner && !isOwnerParent && !isAdmin)
        {
            return Forbid();
        }

        var requesterIsChildMember = !isAdmin && await IsChildMemberAccountAsync(userId);
        if (requesterIsChildMember && request.RefillStatus != MedicationRefillStatus.RefillNeeded)
        {
            return Forbid();
        }

        med.RefillStatus = request.RefillStatus;
        await _dbContext.SaveChangesAsync();

        if (request.RefillStatus == MedicationRefillStatus.RefillNeeded)
        {
            var requesterName = await ResolveUserDisplayNameAsync(userId);
            var parentOwnerIds = await _dbContext.PartyMembers
                .Where(pm => pm.UserId == med.OwnerUserId && pm.Party.OwnerUserId != med.OwnerUserId)
                .Select(pm => pm.Party.OwnerUserId)
                .Distinct()
                .ToListAsync();

            foreach (var parentOwnerId in parentOwnerIds)
            {
                await _notificationService.CreateAsync(
                    parentOwnerId,
                    "RefillNeeded",
                    $"Refill needed for {requesterName} - {med.Name}",
                    $"{requesterName} requested a refill for {med.Name}.",
                    DateTime.UtcNow,
                    BuildRefillMeta(med, "RefillNeeded", requesterName));
            }

            await _notificationService.CreateAsync(
                med.OwnerUserId,
                "RefillNeeded",
                $"Refill requested: {med.Name}",
                $"You marked {med.Name} as needing a refill.",
                DateTime.UtcNow,
                BuildRefillMeta(med, "RefillNeeded", requesterName));
        }
        else
        {
            var actorName = await ResolveUserDisplayNameAsync(userId);
            var statusLabel = GetRefillStatusLabel(request.RefillStatus);
            var notificationMeta = BuildRefillMeta(med, request.RefillStatus.ToString(), actorName);

            await _notificationService.CreateAsync(
                med.OwnerUserId,
                "RefillStatusUpdated",
                $"Refill update: {med.Name}",
                $"{GetActorLabel(userId, isOwner)} updated {med.Name} to {statusLabel}.",
                DateTime.UtcNow,
                notificationMeta);

            if (userId != med.OwnerUserId)
            {
                await _notificationService.CreateAsync(
                    userId,
                    "RefillStatusUpdated",
                    $"Refill update: {med.Name}",
                    $"You updated {med.Name} to {statusLabel} for {await ResolveUserDisplayNameAsync(med.OwnerUserId)}.",
                    DateTime.UtcNow,
                    notificationMeta);
            }
        }

        return Ok(MapMedication(med));
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var isAdmin = await IsAdminAsync(userId);
        if (!isAdmin && await IsChildMemberAccountAsync(userId))
        {
            return Forbid();
        }

        var med = await _dbContext.Medications.FirstOrDefaultAsync(x => x.Id == id);
        if (med is null) return NotFound();
        var canManageMedication = med.OwnerUserId == userId
            || isAdmin
            || await IsPartyOwnerOfMemberAsync(userId, med.OwnerUserId);
        if (!canManageMedication)
        {
            return Forbid();
        }
        _dbContext.Medications.Remove(med);
        await _dbContext.SaveChangesAsync();
        return NoContent();
    }

    private async Task<bool> IsAdminAsync(string userId)
    {
        if (User.IsInRole("Admin")) return true;
        var user = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        return (user?.Email ?? string.Empty).Contains("admin", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<bool> IsChildMemberAccountAsync(string userId)
    {
        var memberships = await _dbContext.PartyMembers
            .Where(pm => pm.UserId == userId)
            .Select(pm => new { pm.Role, pm.Party.OwnerUserId })
            .ToListAsync();

        if (memberships.Count == 0) return false;
        return memberships.Any(pm =>
            pm.Role.Equals("Member", StringComparison.OrdinalIgnoreCase)
            && pm.OwnerUserId != userId);
    }

    private async Task<bool> IsPartyOwnerOfMemberAsync(string possibleOwnerUserId, string memberUserId)
    {
        return await _dbContext.PartyMembers
            .AnyAsync(pm => pm.UserId == memberUserId && pm.Party.OwnerUserId == possibleOwnerUserId);
    }

    private string GetActorLabel(string requesterUserId, bool isOwner)
    {
        if (isOwner) return "You";
        _logger.LogDebug("Refill action performed by another user {RequesterUserId}", requesterUserId);
        return "Your parent/guardian";
    }

    private static string GetRefillStatusLabel(MedicationRefillStatus status)
    {
        return status switch
        {
            MedicationRefillStatus.RefillNeeded => "Requested / Pending",
            MedicationRefillStatus.Approved => "Approved",
            MedicationRefillStatus.Denied => "Denied",
            MedicationRefillStatus.InProgress => "In Progress",
            MedicationRefillStatus.Resolved => "Resolved",
            _ => "No request"
        };
    }

    private static string BuildRefillMeta(Medication medication, string status, string actorName)
    {
        return $"{{\"medicationId\":{medication.Id},\"medicationName\":\"{EscapeJsonValue(medication.Name)}\",\"status\":\"{status}\",\"ownerUserId\":\"{medication.OwnerUserId}\",\"actorName\":\"{EscapeJsonValue(actorName)}\"}}";
    }

    private static string EscapeJsonValue(string value)
    {
        return value
            .Replace("\\", "\\\\")
            .Replace("\"", "\\\"");
    }

    private async Task<string> ResolveUserDisplayNameAsync(string userId)
    {
        return await _dbContext.Users
            .Where(u => u.Id == userId)
            .Select(u => string.IsNullOrWhiteSpace(u.DisplayName) ? u.UserName ?? "Member" : u.DisplayName)
            .FirstOrDefaultAsync() ?? "Member";
    }

    private static MedicationResponse MapMedication(Medication med) =>
        new(
            med.Id,
            med.Source,
            med.Name,
            med.StrengthText,
            med.DirectionsText,
            med.IsActive,
            med.QuantityOnHand,
            med.DosesRemaining,
            med.LowSupplyThreshold,
            med.RefillStatus,
            NotificationService.IsLowSupply(med),
            med.CreatedAt);
}
