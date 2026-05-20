using MediQuest.Api.Models;
using MediQuest.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace MediQuest.Api.Controllers;

[ApiController]
[Route("api/doses")]
public class DosesController : ControllerBase
{
    private readonly DoseService _doseService;

    public DosesController(DoseService doseService)
    {
        _doseService = doseService;
    }

    [HttpPost("complete")]
    public async Task<ActionResult<DoseCompleteResponse>> Complete([FromBody] DoseCompleteRequest request)
    {
        var response = await _doseService.CompleteDoseAsync(request);
        return Ok(response);
    }
}
