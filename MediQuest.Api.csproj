using MediQuest.Api.Models;
using MediQuest.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace MediQuest.Api.Controllers;

[ApiController]
[Route("api/quests")]
public class QuestsController : ControllerBase
{
    private readonly QuestService _questService;

    public QuestsController(QuestService questService)
    {
        _questService = questService;
    }

    [HttpGet("today")]
    public async Task<ActionResult<IReadOnlyList<QuestDto>>> GetToday()
    {
        var quests = await _questService.GetQuestsAsync(QuestType.Daily);
        return Ok(quests);
    }

    [HttpGet("week")]
    public async Task<ActionResult<IReadOnlyList<QuestDto>>> GetWeek()
    {
        var quests = await _questService.GetQuestsAsync(QuestType.Weekly);
        return Ok(quests);
    }

    [HttpPost("claim/{id:int}")]
    public async Task<ActionResult<QuestDto>> Claim(int id)
    {
        var quest = await _questService.ClaimQuestAsync(id);
        if (quest is null)
        {
            return NotFound();
        }

        return Ok(quest);
    }
}
