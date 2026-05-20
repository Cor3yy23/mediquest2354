using System.Security.Claims;
using MediQuest.Api.Contracts;
using MediQuest.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediQuest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public NotificationsController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NotificationResponse>>> Get()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var notifications = await _dbContext.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(30)
            .Select(n => new NotificationResponse(n.Id, n.Type, n.Title, n.Body, n.CreatedAt, n.DueAt, n.ReadAt, n.MetaJson))
            .ToListAsync();

        return Ok(notifications);
    }

    [HttpPost("{id:int}/read")]
    public async Task<ActionResult> MarkRead(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var notification = await _dbContext.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);
        if (notification is null) return NotFound();

        notification.ReadAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();
        return NoContent();
    }
}
