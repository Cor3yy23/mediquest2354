using System.Security.Claims;
using MediQuest.Api.Contracts;
using MediQuest.Api.Data;
using MediQuest.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediQuest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api")]
public class ProgressionController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ProgressionService _progressionService;

    public ProgressionController(AppDbContext dbContext, ProgressionService progressionService)
    {
        _dbContext = dbContext;
        _progressionService = progressionService;
    }

    [HttpGet("progression/me")]
    public async Task<ActionResult<ProgressionResponse>> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Unauthorized();

        await _progressionService.EnsureUnlocksForUserAsync(user.Id, user.Level);
        await _dbContext.SaveChangesAsync();

        var xpToday = await _progressionService.GetXpTodayAsync(userId, DateTime.UtcNow);
        var nextReq = user.Level >= ProgressionService.MaxLevel ? 0 : _progressionService.GetRequiredXpForLevel(user.Level);

        var defs = await _dbContext.UnlockDefinitions
            .Where(d => d.IsActive)
            .OrderBy(d => d.SortOrder)
            .ThenBy(d => d.LevelRequired)
            .Select(d => new { d.Id, d.Key, d.Category, d.DisplayName, d.LevelRequired })
            .ToListAsync();

        var unlockedMap = await _dbContext.UserUnlocks
            .Where(x => x.UserId == userId)
            .GroupBy(x => x.UnlockDefinitionId)
            .Select(g => new { UnlockDefinitionId = g.Key, UnlockedAt = (DateTime?)g.Min(x => x.UnlockedAt) })
            .ToDictionaryAsync(x => x.UnlockDefinitionId, x => x.UnlockedAt);

        var unlocks = defs
            .Select(d =>
            {
                unlockedMap.TryGetValue(d.Id, out var unlockedAt);
                return new UnlockItemResponse(d.Key, d.Category, d.DisplayName, d.LevelRequired, unlockedAt);
            })
            .ToList();

        return Ok(new ProgressionResponse(
            user.Level,
            user.TotalXp,
            xpToday,
            user.XpIntoLevel,
            nextReq,
            _progressionService.GetRank(user.Level),
            unlocks,
            user.SelectedThemeKey,
            user.SelectedAvatarKey
        ));
    }

    [HttpPut("progression/cosmetics")]
    public async Task<ActionResult> UpdateCosmetics([FromBody] UpdateCosmeticsRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Unauthorized();

        await _progressionService.EnsureUnlocksForUserAsync(user.Id, user.Level);

        var isAdmin = User.IsInRole("Admin") || string.Equals(user.AccountType, "admin", StringComparison.OrdinalIgnoreCase);

        if (!string.IsNullOrWhiteSpace(request.SelectedThemeKey))
        {
            var themeKey = request.SelectedThemeKey.Trim();
            var canUseTheme = await IsCosmeticSelectableAsync(userId, "theme", themeKey, isAdmin);
            if (!canUseTheme) return BadRequest(new { message = "Theme is not unlocked yet." });
            user.SelectedThemeKey = themeKey;
        }

        if (!string.IsNullOrWhiteSpace(request.SelectedAvatarKey))
        {
            var avatarKey = request.SelectedAvatarKey.Trim();
            var canUseAvatar = await IsCosmeticSelectableAsync(userId, "avatar", avatarKey, isAdmin);
            if (!canUseAvatar) return BadRequest(new { message = "Avatar is not unlocked yet." });
            user.SelectedAvatarKey = avatarKey;
        }

        await _dbContext.SaveChangesAsync();

        return Ok(new
        {
            selectedThemeKey = user.SelectedThemeKey,
            selectedAvatarKey = user.SelectedAvatarKey
        });
    }

    private async Task<bool> IsCosmeticSelectableAsync(string userId, string category, string key, bool bypassUnlockValidation = false)
    {
        var definition = await _dbContext.UnlockDefinitions
            .Where(d => d.IsActive && d.Category == category && d.Key == key)
            .Select(d => new { d.Id, d.LevelRequired })
            .FirstOrDefaultAsync();

        if (definition is null) return false;
        if (bypassUnlockValidation || definition.LevelRequired <= 0) return true;

        return await _dbContext.UserUnlocks.AnyAsync(x => x.UserId == userId && x.UnlockDefinitionId == definition.Id);
    }

    [HttpGet("leaderboard")]
    public async Task<ActionResult> Leaderboard()
    {
        var data = await _dbContext.Users.OrderByDescending(u => u.TotalXp).ThenByDescending(u => u.Level)
            .Take(20)
            .Select(u => new { userId = u.Id, u.DisplayName, u.Email, totalXp = u.TotalXp, u.Level, rank = _progressionService.GetRank(u.Level), avatarKey = u.SelectedAvatarKey })
            .ToListAsync();
        return Ok(data);
    }
}
