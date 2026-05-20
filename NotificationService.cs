using MediQuest.Api.Data;
using MediQuest.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace MediQuest.Api.Seed;

public static class DbSeeder
{
    private const string SeedPassword = "Password123!";

    public static async Task SeedAsync(IApplicationBuilder app)
    {
        await using var scope = app.ApplicationServices.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<AppUser>>();

        await dbContext.Database.EnsureCreatedAsync();

        var admin = await EnsureUserAsync(userManager, "admin@mediquest.local", "Admin");
        var parent = await EnsureUserAsync(userManager, "parent@mediquest.local", "Parent");
        var member = await EnsureUserAsync(userManager, "member@mediquest.local", "Member");

        var party = await dbContext.Parties.FirstOrDefaultAsync(p => p.OwnerUserId == parent.Id);
        if (party is null)
        {
            party = new Party
            {
                Name = "Parent Party",
                OwnerUserId = parent.Id,
                TotalXp = 0
            };

            dbContext.Parties.Add(party);
            await dbContext.SaveChangesAsync();
        }

        await EnsurePartyMemberAsync(dbContext, party.Id, parent.Id, "Owner");
        await EnsurePartyMemberAsync(dbContext, party.Id, member.Id, "Member");

        await EnsureMedicationsAsync(dbContext, parent.Id, BuildParentMedications(parent.Id), 4);
        await EnsureMedicationsAsync(dbContext, member.Id, BuildMemberMedications(member.Id), 2);

        if (!string.Equals(admin.UserName, "admin@mediquest.local", StringComparison.OrdinalIgnoreCase))
        {
            admin.UserName = "admin@mediquest.local";
            await userManager.UpdateAsync(admin);
        }

        await EnsureAdminStarterUnlocksAsync(dbContext, admin.Id);

        await dbContext.SaveChangesAsync();
    }

    private static async Task<AppUser> EnsureUserAsync(UserManager<AppUser> userManager, string email, string displayName)
    {
        var user = await userManager.FindByEmailAsync(email);
        if (user is not null)
        {
            var changed = false;
            if (!string.Equals(user.UserName, email, StringComparison.OrdinalIgnoreCase))
            {
                user.UserName = email;
                changed = true;
            }

            if (!string.Equals(user.DisplayName, displayName, StringComparison.Ordinal))
            {
                user.DisplayName = displayName;
                changed = true;
            }

            if (changed)
            {
                var updateResult = await userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    throw new Exception($"Failed to update seeded user '{email}': {string.Join("; ", updateResult.Errors.Select(e => e.Description))}");
                }
            }

            return user;
        }

        var newUser = new AppUser
        {
            UserName = email,
            Email = email,
            DisplayName = displayName,
            TotalXp = 0,
            Level = 1,
            XpIntoLevel = 0
        };

        var createResult = await userManager.CreateAsync(newUser, SeedPassword);
        if (!createResult.Succeeded)
        {
            throw new Exception($"Failed to seed user '{email}': {string.Join("; ", createResult.Errors.Select(e => e.Description))}");
        }

        return newUser;
    }

    private static async Task EnsurePartyMemberAsync(AppDbContext dbContext, int partyId, string userId, string role)
    {
        var existingMembership = await dbContext.PartyMembers.FirstOrDefaultAsync(x => x.PartyId == partyId && x.UserId == userId);
        if (existingMembership is null)
        {
            dbContext.PartyMembers.Add(new PartyMember { PartyId = partyId, UserId = userId, Role = role });
            return;
        }

        if (!string.Equals(existingMembership.Role, role, StringComparison.Ordinal))
        {
            existingMembership.Role = role;
        }
    }

    private static async Task EnsureAdminStarterUnlocksAsync(AppDbContext dbContext, string adminUserId)
    {
        var starterUnlockIds = await dbContext.UnlockDefinitions
            .Where(u => u.LevelRequired == 0 || u.LevelRequired == 5)
            .Select(u => u.Id)
            .ToListAsync();

        if (starterUnlockIds.Count == 0)
        {
            return;
        }

        var existing = await dbContext.UserUnlocks
            .Where(u => u.UserId == adminUserId)
            .Select(u => u.UnlockDefinitionId)
            .ToListAsync();

        var toAdd = starterUnlockIds
            .Where(id => !existing.Contains(id))
            .Select(id => new UserUnlock { UserId = adminUserId, UnlockDefinitionId = id })
            .ToList();

        if (toAdd.Count > 0)
        {
            dbContext.UserUnlocks.AddRange(toAdd);
        }
    }

    private static async Task EnsureMedicationsAsync(
        AppDbContext dbContext,
        string ownerUserId,
        IEnumerable<Medication> seededMeds,
        int targetActiveCount)
    {
        var hasExistingMeds = await dbContext.Medications.AnyAsync(m => m.OwnerUserId == ownerUserId);
        if (hasExistingMeds)
        {
            return;
        }

        var activeCount = 0;
        foreach (var medication in seededMeds)
        {
            dbContext.Medications.Add(medication);

            activeCount++;
            if (activeCount >= targetActiveCount)
            {
                break;
            }
        }
    }

    private static IEnumerable<Medication> BuildParentMedications(string ownerUserId)
    {
        return
        [
            CreateMedication(ownerUserId, "atorvastatin"),
            CreateMedication(ownerUserId, "fluoxetine"),
            CreateMedication(ownerUserId, "divalproex"),
            CreateMedication(ownerUserId, "gabapentin")
        ];
    }

    private static IEnumerable<Medication> BuildMemberMedications(string ownerUserId)
    {
        return
        [
            CreateMedication(ownerUserId, "cetirizine"),
            CreateMedication(ownerUserId, "sertraline")
        ];
    }

    private static Medication CreateMedication(string ownerUserId, string name)
    {
        return new Medication
        {
            OwnerUserId = ownerUserId,
            Name = name,
            Source = "Seed",
            IsActive = true
        };
    }
}
