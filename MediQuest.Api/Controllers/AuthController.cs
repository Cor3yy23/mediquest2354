using System.Security.Claims;
using MediQuest.Api.Data;
using MediQuest.Api.Contracts;
using MediQuest.Api.Models;
using MediQuest.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediQuest.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly SignInManager<AppUser> _signInManager;
    private readonly JwtTokenService _tokenService;
    private readonly AppDbContext _dbContext;

    public AuthController(
        UserManager<AppUser> userManager,
        SignInManager<AppUser> signInManager,
        JwtTokenService tokenService,
        AppDbContext dbContext)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _tokenService = tokenService;
        _dbContext = dbContext;
    }

    [HttpPost("register")]
    public async Task<ActionResult> Register(RegisterRequest request)
    {
        var user = new AppUser
        {
            UserName = request.Email,
            Email = request.Email,
            DisplayName = request.DisplayName,
            AccountType = NormalizeAccountType(request.AccountType),
            MemberCode = await GenerateUniqueMemberCodeAsync()
        };
        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded) return BadRequest(result.Errors);
        return Ok();
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null) return Unauthorized();
        var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, false);
        if (!result.Succeeded) return Unauthorized();

        var (token, expiresIn) = _tokenService.CreateToken(user);
        return Ok(new AuthResponse(token, expiresIn));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<MeResponse>> Me()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(user.MemberCode))
        {
            user.MemberCode = await GenerateUniqueMemberCodeAsync();
            await _userManager.UpdateAsync(user);
        }

        var role = await ResolveAccountRoleAsync(user.Id);
        return Ok(new MeResponse(user.Id, user.Email ?? string.Empty, user.DisplayName, user.MemberCode ?? string.Empty, role, user.SelectedThemeKey, user.SelectedAvatarKey));
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

    private async Task<string> ResolveAccountRoleAsync(string userId)
    {
        var identity = await _dbContext.Users
            .Where(u => u.Id == userId)
            .Select(u => new { Email = u.Email ?? string.Empty, u.AccountType })
            .FirstOrDefaultAsync();

        var userEmail = identity?.Email ?? string.Empty;
        var accountType = NormalizeAccountType(identity?.AccountType);

        if (User.IsInRole("Admin") || userEmail.Contains("admin", StringComparison.OrdinalIgnoreCase))
        {
            return "admin";
        }

        if (string.Equals(accountType, "parent", StringComparison.OrdinalIgnoreCase))
        {
            return "parent";
        }

        if (string.Equals(accountType, "child", StringComparison.OrdinalIgnoreCase))
        {
            return "child";
        }

        var memberships = await _dbContext.PartyMembers
            .Where(pm => pm.UserId == userId)
            .Select(pm => new { pm.Role, pm.Party.OwnerUserId })
            .ToListAsync();

        if (memberships.Any(pm => pm.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase) || pm.OwnerUserId == userId))
        {
            return "parent";
        }

        if (memberships.Any(pm => pm.Role.Equals("Member", StringComparison.OrdinalIgnoreCase)))
        {
            return "member";
        }

        return "member";
    }

    private static string NormalizeAccountType(string? value)
    {
        if (string.Equals(value, "parent", StringComparison.OrdinalIgnoreCase)
            || string.Equals(value, "owner", StringComparison.OrdinalIgnoreCase))
        {
            return "parent";
        }

        if (string.Equals(value, "child", StringComparison.OrdinalIgnoreCase)
            || string.Equals(value, "member", StringComparison.OrdinalIgnoreCase)
            || string.Equals(value, "player", StringComparison.OrdinalIgnoreCase))
        {
            return "child";
        }

        return "child";
    }
}
