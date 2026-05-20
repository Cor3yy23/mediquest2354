using System.Security.Claims;
using MediQuest.Api.Contracts;
using MediQuest.Api.Data;
using MediQuest.Api.Models;
using MediQuest.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediQuest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/claims")]
public class ClaimsController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ProgressionService _progressionService;
    private readonly NotificationService _notificationService;

    public ClaimsController(AppDbContext dbContext, ProgressionService progressionService, NotificationService notificationService)
    {
        _dbContext = dbContext;
        _progressionService = progressionService;
        _notificationService = notificationService;
    }

    [HttpPost]
    public async Task<ActionResult<ClaimResponse>> Create(CreateClaimRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var partyMember = await _dbContext.PartyMembers.FirstOrDefaultAsync(p => p.PartyId == request.PartyId && p.UserId == userId);
        if (partyMember is null) return Forbid();

        var activityType = request.ActivityType ?? (request.PhysicalTherapyTaskId.HasValue ? ClaimActivityType.PhysicalTherapy : ClaimActivityType.Medication);
        string activityLabel;

        if (activityType == ClaimActivityType.Medication)
        {
            if (!request.MedicationId.HasValue)
            {
                return BadRequest(new { message = "MedicationId is required for medication claims." });
            }

            var ownsMedication = await _dbContext.Medications.AnyAsync(m => m.Id == request.MedicationId.Value && m.OwnerUserId == userId);
            if (!ownsMedication) return BadRequest(new { message = "Medication not found for user." });
            activityLabel = await _dbContext.Medications.Where(m => m.Id == request.MedicationId.Value).Select(m => m.Name).FirstAsync();
        }
        else
        {
            if (!request.PhysicalTherapyTaskId.HasValue)
            {
                return BadRequest(new { message = "PhysicalTherapyTaskId is required for PT claims." });
            }

            var ownsTask = await _dbContext.PhysicalTherapyTasks.AnyAsync(t => t.Id == request.PhysicalTherapyTaskId.Value && t.OwnerUserId == userId);
            if (!ownsTask) return BadRequest(new { message = "Physical therapy task not found for user." });
            activityLabel = await _dbContext.PhysicalTherapyTasks.Where(t => t.Id == request.PhysicalTherapyTaskId.Value).Select(t => t.Title).FirstAsync();
        }

        var claim = new DoseClaim
        {
            ClaimantUserId = userId,
            PartyId = request.PartyId,
            MedicationId = request.MedicationId,
            PhysicalTherapyTaskId = request.PhysicalTherapyTaskId,
            ActivityType = activityType,
            ActivityLabel = activityLabel,
            RequestedXp = ProgressionService.DailyCap
        };

        _dbContext.Claims.Add(claim);
        await _dbContext.SaveChangesAsync();

        var partyOwnerId = await _dbContext.Parties
            .Where(p => p.Id == request.PartyId)
            .Select(p => p.OwnerUserId)
            .FirstOrDefaultAsync();

        if (!string.IsNullOrWhiteSpace(partyOwnerId) && !string.Equals(partyOwnerId, userId, StringComparison.Ordinal))
        {
            var requesterName = await _dbContext.Users
                .Where(u => u.Id == userId)
                .Select(u => string.IsNullOrWhiteSpace(u.DisplayName) ? u.UserName ?? "Member" : u.DisplayName)
                .FirstOrDefaultAsync() ?? "Member";

            await _notificationService.CreateAsync(
                partyOwnerId,
                "ClaimApprovalRequested",
                $"{requesterName} requested approval",
                $"{requesterName} requested approval for {activityLabel}.",
                DateTime.UtcNow,
                $"{{\"claimId\":{claim.Id},\"partyId\":{request.PartyId}}}");
        }

        return Ok(MapClaim(claim));
    }

    [HttpGet("mine")]
    public async Task<ActionResult<IReadOnlyList<ClaimResponse>>> Mine()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var claims = await _dbContext.Claims.Where(c => c.ClaimantUserId == userId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();
        return Ok(claims.Select(MapClaim).ToList());
    }

    [HttpGet("pending")]
    public async Task<ActionResult<IReadOnlyList<ClaimResponse>>> Pending()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var partyIds = await _dbContext.Parties.Where(p => p.OwnerUserId == userId).Select(p => p.Id).ToListAsync();
        var claims = await _dbContext.Claims
            .Where(c => partyIds.Contains(c.PartyId) && c.Status == ClaimStatus.Pending)
            .Include(c => c.ClaimantUser)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync();
        return Ok(claims.Select(MapClaim).ToList());
    }

    [HttpPost("{id:int}/approve")]
    public async Task<ActionResult> Approve(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var claim = await _dbContext.Claims.Include(c => c.Party).FirstOrDefaultAsync(c => c.Id == id);
        if (claim is null) return NotFound();
        if (claim.Party?.OwnerUserId != userId) return Forbid();
        if (claim.Status != ClaimStatus.Pending) return BadRequest(new { message = "Claim already reviewed." });

        var targetUser = await _dbContext.Users.FirstAsync(u => u.Id == claim.ClaimantUserId);
        var award = await _progressionService.CalculateClaimAwardAsync(targetUser.Id, DateTime.UtcNow);
        claim.Status = ClaimStatus.Approved;
        claim.ReviewedAt = DateTime.UtcNow;
        claim.AwardedXp = award;
        await _progressionService.ApplyXpAsync(targetUser, award);
        await _dbContext.SaveChangesAsync();
        await _notificationService.CreateAsync(
            claim.ClaimantUserId,
            "ClaimApproved",
            $"Claim approved: {claim.ActivityLabel}",
            $"{claim.ActivityLabel} was approved. You earned {claim.AwardedXp} XP.");
        return Ok(new { claim.Id, claim.Status, claim.AwardedXp, targetUser.TotalXp, targetUser.Level });
    }

    [HttpPost("{id:int}/deny")]
    public async Task<ActionResult> Deny(int id, ReviewClaimRequest? request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var claim = await _dbContext.Claims.Include(c => c.Party).FirstOrDefaultAsync(c => c.Id == id);
        if (claim is null) return NotFound();
        if (claim.Party?.OwnerUserId != userId) return Forbid();
        if (claim.Status != ClaimStatus.Pending) return BadRequest(new { message = "Claim already reviewed." });

        claim.Status = ClaimStatus.Denied;
        claim.ReviewedAt = DateTime.UtcNow;
        claim.DecisionNote = request?.Note;
        await _dbContext.SaveChangesAsync();
        await _notificationService.CreateAsync(
            claim.ClaimantUserId,
            "ClaimDenied",
            $"Claim denied: {claim.ActivityLabel}",
            request?.Note is { Length: > 0 }
                ? $"Reason: {request.Note}"
                : $"{claim.ActivityLabel} was denied.");
        return Ok(new { claim.Id, claim.Status });
    }

    private static ClaimResponse MapClaim(DoseClaim claim) =>
        new(
            claim.Id,
            claim.PartyId,
            claim.MedicationId,
            claim.PhysicalTherapyTaskId,
            claim.ActivityType,
            claim.ActivityLabel,
            claim.Status,
            claim.RequestedXp,
            claim.AwardedXp,
            claim.CreatedAt,
            claim.ReviewedAt,
            claim.DecisionNote);
}
