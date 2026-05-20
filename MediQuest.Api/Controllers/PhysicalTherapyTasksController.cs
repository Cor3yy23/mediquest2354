using System.Security.Claims;
using MediQuest.Api.Contracts;
using MediQuest.Api.Data;
using MediQuest.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediQuest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/pt-tasks")]
public class PhysicalTherapyTasksController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public PhysicalTherapyTasksController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PhysicalTherapyTaskResponse>>> GetMine([FromQuery] string? ownerUserId = null)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var requestedOwnerUserId = string.IsNullOrWhiteSpace(ownerUserId) ? userId : ownerUserId.Trim();
        var isAdmin = await IsAdminAsync(userId);
        var canManageRequestedOwner = requestedOwnerUserId == userId
            || isAdmin
            || await IsPartyOwnerOfMemberAsync(userId, requestedOwnerUserId);
        if (!canManageRequestedOwner) return Forbid();

        var tasks = await _dbContext.PhysicalTherapyTasks
            .Where(t => t.OwnerUserId == requestedOwnerUserId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new PhysicalTherapyTaskResponse(t.Id, t.Title, t.Instructions, t.IsActive, t.CreatedAt))
            .ToListAsync();

        return Ok(tasks);
    }

    [HttpPost]
    public async Task<ActionResult<PhysicalTherapyTaskResponse>> Create(CreatePhysicalTherapyTaskRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var requestedOwnerUserId = string.IsNullOrWhiteSpace(request.TargetUserId) ? userId : request.TargetUserId.Trim();
        var isAdmin = await IsAdminAsync(userId);
        var canManageRequestedOwner = requestedOwnerUserId == userId
            || isAdmin
            || await IsPartyOwnerOfMemberAsync(userId, requestedOwnerUserId);
        if (!canManageRequestedOwner) return Forbid();
        if (!isAdmin && requestedOwnerUserId == userId && await IsChildMemberAccountAsync(userId)) return Forbid();

        var title = request.Title.Trim();
        if (string.IsNullOrWhiteSpace(title))
        {
            return BadRequest(new { message = "Title is required." });
        }

        var task = new PhysicalTherapyTask
        {
            OwnerUserId = requestedOwnerUserId,
            Title = title,
            Instructions = string.IsNullOrWhiteSpace(request.Instructions) ? null : request.Instructions.Trim()
        };

        _dbContext.PhysicalTherapyTasks.Add(task);
        await _dbContext.SaveChangesAsync();
        return Ok(new PhysicalTherapyTaskResponse(task.Id, task.Title, task.Instructions, task.IsActive, task.CreatedAt));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult> Update(int id, UpdatePhysicalTherapyTaskRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var isAdmin = await IsAdminAsync(userId);
        if (!isAdmin && await IsChildMemberAccountAsync(userId)) return Forbid();

        var task = await _dbContext.PhysicalTherapyTasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task is null) return NotFound();

        var canManageTask = task.OwnerUserId == userId
            || isAdmin
            || await IsPartyOwnerOfMemberAsync(userId, task.OwnerUserId);
        if (!canManageTask) return Forbid();

        var title = request.Title.Trim();
        if (string.IsNullOrWhiteSpace(title))
        {
            return BadRequest(new { message = "Title is required." });
        }

        task.Title = title;
        task.Instructions = string.IsNullOrWhiteSpace(request.Instructions) ? null : request.Instructions.Trim();
        task.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var isAdmin = await IsAdminAsync(userId);
        if (!isAdmin && await IsChildMemberAccountAsync(userId)) return Forbid();

        var task = await _dbContext.PhysicalTherapyTasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task is null) return NotFound();

        var canManageTask = task.OwnerUserId == userId
            || isAdmin
            || await IsPartyOwnerOfMemberAsync(userId, task.OwnerUserId);
        if (!canManageTask) return Forbid();

        _dbContext.PhysicalTherapyTasks.Remove(task);
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
}
