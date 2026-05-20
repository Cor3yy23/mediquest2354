using System.Security.Claims;
using MediQuest.Api.Contracts;
using MediQuest.Api.Data;
using MediQuest.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediQuest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/parties")]
public class PartiesController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly UserManager<AppUser> _userManager;

    public PartiesController(AppDbContext dbContext, UserManager<AppUser> userManager)
    {
        _dbContext = dbContext;
        _userManager = userManager;
    }

    [HttpPost]
    public async Task<ActionResult> Create(CreatePartyRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var party = new Party { Name = request.Name, OwnerUserId = userId };
        _dbContext.Parties.Add(party);
        await _dbContext.SaveChangesAsync();
        _dbContext.PartyMembers.Add(new PartyMember { PartyId = party.Id, UserId = userId, Role = "Owner" });
        await _dbContext.SaveChangesAsync();
        return Ok(new { party.Id, party.Name, party.CreatedAt });
    }

    [HttpGet("me")]
    public async Task<ActionResult> Mine()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var parties = await _dbContext.PartyMembers.Where(x => x.UserId == userId)
            .Select(x => new { x.PartyId, x.Party.Name, x.Role, memberCount = x.Party.Members.Count })
            .ToListAsync();
        return Ok(parties);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult> Details(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var isMember = await _dbContext.PartyMembers.AnyAsync(x => x.PartyId == id && x.UserId == userId);
        if (!isMember) return Forbid();

        var party = await _dbContext.Parties.Include(x => x.Members).ThenInclude(x => x.User).FirstOrDefaultAsync(x => x.Id == id);
        if (party is null) return NotFound();

        await EnsureMemberCodesAsync(party.Members.Select(x => x.User));

        return Ok(new
        {
            party.Id,
            party.Name,
            party.CreatedAt,
            memberCount = party.Members.Count,
            members = party.Members.Select(m => new
            {
                m.UserId,
                m.User.Email,
                m.User.DisplayName,
                m.User.MemberCode,
                m.Role,
                m.JoinedAt,
                m.User.Level,
                m.User.TotalXp
            })
        });
    }

    [HttpPost("{id:int}/members")]
    public async Task<ActionResult> AddMember(int id, AddPartyMemberRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var isAdmin = await IsAdminAsync(userId);
        var party = await _dbContext.Parties.FirstOrDefaultAsync(x => x.Id == id);
        if (party is null) return NotFound();
        if (party.OwnerUserId != userId && !isAdmin) return Forbid();

        var email = (request.Email ?? string.Empty).Trim();
        var memberCode = NormalizeMemberCode(request.MemberCode);
        AppUser? user = null;

        if (!string.IsNullOrWhiteSpace(email))
        {
            user = await _userManager.FindByEmailAsync(email);
        }
        else if (!string.IsNullOrWhiteSpace(memberCode))
        {
            user = await _dbContext.Users.FirstOrDefaultAsync(u => u.MemberCode == memberCode);
        }

        if (user is null) return BadRequest(new { message = "User not found." });

        if (string.IsNullOrWhiteSpace(user.MemberCode))
        {
            user.MemberCode = await GenerateUniqueMemberCodeAsync();
        }

        var exists = await _dbContext.PartyMembers.AnyAsync(x => x.PartyId == id && x.UserId == user.Id);
        if (exists)
        {
            await _dbContext.SaveChangesAsync();
            return Ok(new { message = "Already a member." });
        }

        _dbContext.PartyMembers.Add(new PartyMember { PartyId = id, UserId = user.Id, Role = "Member" });
        await _dbContext.SaveChangesAsync();
        return Ok();
    }

    [HttpDelete("{id:int}/members/{memberUserId}")]
    public async Task<ActionResult> RemoveMember(int id, string memberUserId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        var isAdmin = await IsAdminAsync(userId);
        var party = await _dbContext.Parties.FirstOrDefaultAsync(x => x.Id == id);
        if (party is null) return NotFound();
        if (party.OwnerUserId != userId && !isAdmin) return Forbid();
        if (party.OwnerUserId == memberUserId) return BadRequest(new { message = "Cannot remove owner." });

        var membership = await _dbContext.PartyMembers.FirstOrDefaultAsync(x => x.PartyId == id && x.UserId == memberUserId);
        if (membership is null) return NotFound();
        _dbContext.PartyMembers.Remove(membership);
        await _dbContext.SaveChangesAsync();
        return NoContent();
    }

    private async Task<bool> IsAdminAsync(string userId)
    {
        if (User.IsInRole("Admin")) return true;
        var user = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        return (user?.Email ?? string.Empty).Contains("admin", StringComparison.OrdinalIgnoreCase);
    }

    private static string NormalizeMemberCode(string? code)
    {
        if (string.IsNullOrWhiteSpace(code)) return string.Empty;
        var normalized = new string(code.Trim().ToUpperInvariant().Where(char.IsLetterOrDigit).ToArray());
        return normalized.StartsWith("MQ") ? normalized : $"MQ{normalized}";
    }

    private async Task EnsureMemberCodesAsync(IEnumerable<AppUser> users)
    {
        var needsUpdate = false;
        foreach (var user in users.Where(u => string.IsNullOrWhiteSpace(u.MemberCode)))
        {
            user.MemberCode = await GenerateUniqueMemberCodeAsync();
            needsUpdate = true;
        }

        if (needsUpdate)
        {
            await _dbContext.SaveChangesAsync();
        }
    }

    private async Task<string> GenerateUniqueMemberCodeAsync()
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var random = Random.Shared;

        while (true)
        {
            var chars = Enumerable.Range(0, 6)
                .Select(_ => alphabet[random.Next(alphabet.Length)])
                .ToArray();
            var candidate = $"MQ{new string(chars)}";
            var exists = await _dbContext.Users.AnyAsync(u => u.MemberCode == candidate);
            if (!exists) return candidate;
        }
    }
}
