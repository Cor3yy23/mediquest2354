using MediQuest.Api.Data;
using MediQuest.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace MediQuest.Api.Seed;

public static class UnlockSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await db.Database.ExecuteSqlRawAsync("""
            ALTER TABLE "UnlockDefinitions" ADD COLUMN IF NOT EXISTS "Key" text;
            ALTER TABLE "UnlockDefinitions" ADD COLUMN IF NOT EXISTS "DisplayName" text;
            ALTER TABLE "UnlockDefinitions" ADD COLUMN IF NOT EXISTS "LevelRequired" integer NOT NULL DEFAULT 0;
            ALTER TABLE "UnlockDefinitions" ADD COLUMN IF NOT EXISTS "IsActive" boolean NOT NULL DEFAULT TRUE;
            ALTER TABLE "UnlockDefinitions" ADD COLUMN IF NOT EXISTS "SortOrder" integer NOT NULL DEFAULT 0;

            UPDATE "UnlockDefinitions"
            SET "Key" = NULL
            WHERE "Key" IS NOT NULL AND btrim("Key") = '';

            DELETE FROM "UnlockDefinitions" a
            USING "UnlockDefinitions" b
            WHERE a.ctid < b.ctid
              AND a."Key" IS NOT NULL
              AND b."Key" IS NOT NULL
              AND a."Key" = b."Key";
            """);

        await db.Database.ExecuteSqlRawAsync("""
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_UnlockDefinitions_Key"
            ON "UnlockDefinitions" ("Key")
            WHERE "Key" IS NOT NULL;
            """);

        var unlocks = new[]
        {
            new UnlockDefinition { Key = "theme_clinic_blue", Category = "theme", DisplayName = "Clinic Blue", LevelRequired = 0, IsActive = true, SortOrder = 10 },
            new UnlockDefinition { Key = "theme_sterile_mint", Category = "theme", DisplayName = "Sterile Mint", LevelRequired = 5, IsActive = true, SortOrder = 20 },
            new UnlockDefinition { Key = "theme_surgical_teal", Category = "theme", DisplayName = "Surgical Teal", LevelRequired = 10, IsActive = true, SortOrder = 30 },
            new UnlockDefinition { Key = "theme_pharmacy_purple", Category = "theme", DisplayName = "Pharmacy Purple", LevelRequired = 15, IsActive = true, SortOrder = 40 },
            new UnlockDefinition { Key = "theme_emergency_red", Category = "theme", DisplayName = "Emergency Red", LevelRequired = 20, IsActive = true, SortOrder = 50 },
            new UnlockDefinition { Key = "theme_night_shift", Category = "theme", DisplayName = "Night Shift", LevelRequired = 25, IsActive = true, SortOrder = 60 },
            new UnlockDefinition { Key = "theme_icu_blue", Category = "theme", DisplayName = "ICU Blue", LevelRequired = 30, IsActive = true, SortOrder = 70 },
               
                /*maleAvatars*/
           new UnlockDefinition { Key = "avatar_default_logo", Category = "avatar", DisplayName = "Default Logo", LevelRequired = 0, IsActive = true, SortOrder = 110 },
            new UnlockDefinition { Key = "avatar_first_aid", Category = "avatar", DisplayName = "First Aid", LevelRequired = 5, IsActive = true, SortOrder = 120 },
            new UnlockDefinition { Key = "avatar_pill_bottle", Category = "avatar", DisplayName = "Pill Bottle", LevelRequired = 10, IsActive = true, SortOrder = 130 },
            new UnlockDefinition { Key = "avatar_stethoscope", Category = "avatar", DisplayName = "Stethoscope", LevelRequired = 15, IsActive = true, SortOrder = 140 },
            new UnlockDefinition { Key = "avatar_heartbeat", Category = "avatar", DisplayName = "Heartbeat", LevelRequired = 20, IsActive = true, SortOrder = 150 },
            new UnlockDefinition { Key = "avatar_medic_shield", Category = "avatar", DisplayName = "Medic Shield", LevelRequired = 25, IsActive = true, SortOrder = 160 },
            new UnlockDefinition { Key = "avatar_scrubs_star", Category = "avatar", DisplayName = "Scrubs Star", LevelRequired = 30, IsActive = true, SortOrder = 170 },
            new UnlockDefinition { Key = "avatar_health_defender", Category = "avatar", DisplayName = "Health Defender", LevelRequired = 35, IsActive = true, SortOrder = 180 },
            new UnlockDefinition { Key = "avatar_medic_marine", Category = "avatar", DisplayName = "Medic Marine", LevelRequired = 40, IsActive = true, SortOrder = 190 },
            new UnlockDefinition { Key = "avatar_medimancer_prime", Category = "avatar", DisplayName = "Medimancer Prime", LevelRequired = 45, IsActive = true, SortOrder = 200 },
        
                /*femaleAvatars*/
            new UnlockDefinition { Key = "avatar_first_aidW", Category = "avatar", DisplayName = "First Aid", LevelRequired = 5, IsActive = true, SortOrder = 120 },
            new UnlockDefinition { Key = "avatar_pill_bottleW", Category = "avatar", DisplayName = "Pill Bottle", LevelRequired = 10, IsActive = true, SortOrder = 130 },
            new UnlockDefinition { Key = "avatar_stethoscopeW", Category = "avatar", DisplayName = "Stethoscope", LevelRequired = 15, IsActive = true, SortOrder = 140 },
            new UnlockDefinition { Key = "avatar_heartbeatW", Category = "avatar", DisplayName = "Heartbeat", LevelRequired = 20, IsActive = true, SortOrder = 150 },
            new UnlockDefinition { Key = "avatar_medic_shieldW", Category = "avatar", DisplayName = "Medic Shield", LevelRequired = 25, IsActive = true, SortOrder = 160 },
            new UnlockDefinition { Key = "avatar_scrubs_starW", Category = "avatar", DisplayName = "Scrubs Star", LevelRequired = 30, IsActive = true, SortOrder = 170 },
            new UnlockDefinition { Key = "avatar_health_defenderW", Category = "avatar", DisplayName = "Health Defender", LevelRequired = 35, IsActive = true, SortOrder = 180 },
            new UnlockDefinition { Key = "avatar_medic_marineW", Category = "avatar", DisplayName = "Medic Marine", LevelRequired = 40, IsActive = true, SortOrder = 190 },
            new UnlockDefinition { Key = "avatar_medimancer_primeW", Category = "avatar", DisplayName = "Medimancer Prime", LevelRequired = 45, IsActive = true, SortOrder = 200 },
        
            /*malePTavatars*/
            new UnlockDefinition { Key = "avatar_beginnier_gainsM", Category = "avatar", DisplayName = "Beginner Gains", LevelRequired = 5, IsActive = true, SortOrder = 120 },
            new UnlockDefinition { Key = "avatar_recovery_warriorM", Category = "avatar", DisplayName = "Recovery Warrior", LevelRequired = 10, IsActive = true, SortOrder = 130 },
            new UnlockDefinition { Key = "avatar_dumbbell_beastM", Category = "avatar", DisplayName = "Dumbbell Beast", LevelRequired = 15, IsActive = true, SortOrder = 140 },
            new UnlockDefinition { Key = "avatar_fitness_medicM", Category = "avatar", DisplayName = "Fitness Medic", LevelRequired = 20, IsActive = true, SortOrder = 150 },
            new UnlockDefinition { Key = "avatar_strength_guardianM", Category = "avatar", DisplayName = "Strength Guardian", LevelRequired = 25, IsActive = true, SortOrder = 160 },

                /*femalePTavatars*/
            new UnlockDefinition { Key = "avatar_beginnier_gainsW", Category = "avatar", DisplayName = "Beginner Gains", LevelRequired = 5, IsActive = true, SortOrder = 120 },
            new UnlockDefinition { Key = "avatar_recovery_warriorW", Category = "avatar", DisplayName = "Recovery Warrior", LevelRequired = 10, IsActive = true, SortOrder = 130 },
            new UnlockDefinition { Key = "avatar_dumbbell_beastW", Category = "avatar", DisplayName = "Dumbbell Beast", LevelRequired = 15, IsActive = true, SortOrder = 140 },
            new UnlockDefinition { Key = "avatar_fitness_medicW", Category = "avatar", DisplayName = "Fitness Medic", LevelRequired = 20, IsActive = true, SortOrder = 150 },
            new UnlockDefinition { Key = "avatar_strength_guardianW", Category = "avatar", DisplayName = "Strength Guardian", LevelRequired = 25, IsActive = true, SortOrder = 160 }
        };


        var normalizedUnlocks = unlocks
            .Where(x => !string.IsNullOrWhiteSpace(x.Key))
            .Select(x => new UnlockDefinition
            {
                Key = x.Key!.Trim(),
                Category = x.Category,
                DisplayName = x.DisplayName,
                LevelRequired = x.LevelRequired,
                IsActive = x.IsActive,
                SortOrder = x.SortOrder
            })
            .GroupBy(x => x.Key!, StringComparer.Ordinal)
            .Select(g => g
                .OrderByDescending(x => !string.IsNullOrWhiteSpace(x.DisplayName))
                .ThenByDescending(x => !string.IsNullOrWhiteSpace(x.Category))
                .ThenByDescending(x => x.IsActive)
                .ThenByDescending(x => x.LevelRequired)
                .ThenByDescending(x => x.SortOrder)
                .First())
            .ToList();

        var existingByKey = await db.UnlockDefinitions
            .Where(x => x.Key != null)
            .ToDictionaryAsync(x => x.Key!, StringComparer.Ordinal);

        foreach (var unlock in normalizedUnlocks)
        {
            if (existingByKey.TryGetValue(unlock.Key, out var existing))
            {
                if (existing.Category != unlock.Category)
                    existing.Category = unlock.Category;
                if (existing.DisplayName != unlock.DisplayName)
                    existing.DisplayName = unlock.DisplayName;
                if (existing.LevelRequired != unlock.LevelRequired)
                    existing.LevelRequired = unlock.LevelRequired;
                if (existing.IsActive != unlock.IsActive)
                    existing.IsActive = unlock.IsActive;
                if (existing.SortOrder != unlock.SortOrder)
                    existing.SortOrder = unlock.SortOrder;
            }
            else
            {
                db.UnlockDefinitions.Add(unlock);
            }
        }

        await db.SaveChangesAsync();
    }
}
