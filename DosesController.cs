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
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ProgressionService _progressionService;

    public AdminController(AppDbContext dbContext, ProgressionService progressionService)
    {
        _dbContext = dbContext;
        _progressionService = progressionService;
    }

    [HttpPost("grant-xp")]
    public async Task<ActionResult> GrantXp(GrantXpRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Unauthorized();
        var isAdmin = string.Equals(user.Email, "admin@mediquest.local", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(user.UserName, "admin@mediquest.local", StringComparison.OrdinalIgnoreCase);
        if (!isAdmin) return Forbid();
        if (request.Amount <= 0) return BadRequest(new { message = "Amount must be positive." });

        await _progressionService.ApplyXpAsync(user, request.Amount);
        await _dbContext.SaveChangesAsync();
        return Ok(new { user.TotalXp, user.Level, user.XpIntoLevel });
    }

    [HttpPost("unlock-all")]
    public async Task<ActionResult> UnlockAll()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Unauthorized();
        var isAdmin = string.Equals(user.Email, "admin@mediquest.local", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(user.UserName, "admin@mediquest.local", StringComparison.OrdinalIgnoreCase);
        if (!isAdmin) return Forbid();

        var defs = await _dbContext.UnlockDefinitions.ToListAsync();
        var existing = await _dbContext.UserUnlocks.Where(u => u.UserId == userId).Select(u => u.UnlockDefinitionId).ToListAsync();
        var missing = defs.Where(d => !existing.Contains(d.Id)).Select(d => new UserUnlock { UserId = userId, UnlockDefinitionId = d.Id });
        _dbContext.UserUnlocks.AddRange(missing);
        await _dbContext.SaveChangesAsync();
        return Ok();
    }
}
