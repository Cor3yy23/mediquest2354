using MediQuest.Api.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace MediQuest.Api.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Party> Parties => Set<Party>();
    public DbSet<PartyMember> PartyMembers => Set<PartyMember>();
    public DbSet<Medication> Medications => Set<Medication>();
    public DbSet<MedicationImportMap> MedicationImportMaps => Set<MedicationImportMap>();
    public DbSet<EpicConnection> EpicConnections => Set<EpicConnection>();
    public DbSet<DoseClaim> Claims => Set<DoseClaim>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<PhysicalTherapyTask> PhysicalTherapyTasks => Set<PhysicalTherapyTask>();
    public DbSet<UnlockDefinition> UnlockDefinitions => Set<UnlockDefinition>();
    public DbSet<UserUnlock> UserUnlocks => Set<UserUnlock>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<PartyMember>().HasKey(pm => new { pm.PartyId, pm.UserId });

        modelBuilder.Entity<Party>()
            .HasOne(p => p.OwnerUser)
            .WithMany()
            .HasForeignKey(p => p.OwnerUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<PartyMember>()
            .HasOne(pm => pm.User)
            .WithMany()
            .HasForeignKey(pm => pm.UserId);

        modelBuilder.Entity<MedicationImportMap>()
            .HasIndex(x => new { x.OwnerUserId, x.EpicResourceType, x.EpicResourceId })
            .IsUnique();

        modelBuilder.Entity<EpicConnection>().HasKey(e => e.UserId);
        modelBuilder.Entity<EpicConnection>()
            .HasOne(e => e.User)
            .WithOne(u => u.EpicConnection)
            .HasForeignKey<EpicConnection>(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DoseClaim>().ToTable("Claims");

        modelBuilder.Entity<DoseClaim>()
            .HasOne(c => c.ClaimantUser)
            .WithMany()
            .HasForeignKey(c => c.ClaimantUserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DoseClaim>()
            .HasOne(c => c.Party)
            .WithMany()
            .HasForeignKey(c => c.PartyId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DoseClaim>()
            .HasOne(c => c.Medication)
            .WithMany()
            .HasForeignKey(c => c.MedicationId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<DoseClaim>()
            .HasOne(c => c.PhysicalTherapyTask)
            .WithMany()
            .HasForeignKey(c => c.PhysicalTherapyTaskId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Notification>()
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Notification>()
            .Property(n => n.Type)
            .HasMaxLength(80);

        modelBuilder.Entity<PhysicalTherapyTask>()
            .HasOne(p => p.OwnerUser)
            .WithMany()
            .HasForeignKey(p => p.OwnerUserId)
            .OnDelete(DeleteBehavior.Cascade);


        modelBuilder.Entity<UnlockDefinition>()
            .HasIndex(x => x.Key)
            .IsUnique();

        modelBuilder.Entity<UnlockDefinition>()
            .Property(x => x.Key)
            .HasMaxLength(120);

        modelBuilder.Entity<UserUnlock>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserUnlock>()
            .HasOne(x => x.UnlockDefinition)
            .WithMany()
            .HasForeignKey(x => x.UnlockDefinitionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserUnlock>()
            .HasIndex(x => new { x.UserId, x.UnlockDefinitionId })
            .IsUnique();

        modelBuilder.Entity<AppUser>()
            .HasIndex(u => u.MemberCode)
            .IsUnique()
            .HasFilter("\"MemberCode\" IS NOT NULL");
    }
}
