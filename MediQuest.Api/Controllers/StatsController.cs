using MediQuest.Api.Models;
using MediQuest.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace MediQuest.Api.Controllers;

[ApiController]
[Route("api/stats")]
public class StatsController : ControllerBase
{
    private readonly StatsService _statsService;

    public StatsController(StatsService statsService)
    {
        _statsService = statsService;
    }

    [HttpGet("me")]
    public async Task<ActionResult<StatsDto>> GetMe()
    {
        var stats = await _statsService.GetUserStatsAsync();
        return Ok(stats);
    }

    [HttpGet("party")]
    public async Task<ActionResult<StatsDto>> GetParty()
    {
        var stats = await _statsService.GetPartyStatsAsync();
        return Ok(stats);
    }
}
