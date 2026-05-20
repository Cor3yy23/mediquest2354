using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MediQuest.Api.Migrations
{
    public partial class MidtermDemoFeatures : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(name: "Level", table: "AspNetUsers", type: "integer", nullable: false, defaultValue: 1);
            migrationBuilder.AddColumn<int>(name: "TotalXp", table: "AspNetUsers", type: "integer", nullable: false, defaultValue: 0);
            migrationBuilder.AddColumn<int>(name: "XpIntoLevel", table: "AspNetUsers", type: "integer", nullable: false, defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "UnlockDefinitions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false).Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Category = table.Column<string>(type: "text", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    RequiredLevel = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table => table.PrimaryKey("PK_UnlockDefinitions", x => x.Id));

            migrationBuilder.CreateTable(
                name: "Claims",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false).Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ClaimantUserId = table.Column<string>(type: "text", nullable: false),
                    PartyId = table.Column<int>(type: "integer", nullable: false),
                    MedicationId = table.Column<int>(type: "integer", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RequestedXp = table.Column<int>(type: "integer", nullable: false),
                    AwardedXp = table.Column<int>(type: "integer", nullable: false),
                    DecisionNote = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Claims", x => x.Id);
                    table.ForeignKey(name: "FK_Claims_AspNetUsers_ClaimantUserId", column: x => x.ClaimantUserId, principalTable: "AspNetUsers", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(name: "FK_Claims_Medications_MedicationId", column: x => x.MedicationId, principalTable: "Medications", principalColumn: "Id", onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(name: "FK_Claims_Parties_PartyId", column: x => x.PartyId, principalTable: "Parties", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserUnlocks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false).Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    UnlockDefinitionId = table.Column<int>(type: "integer", nullable: false),
                    UnlockedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserUnlocks", x => x.Id);
                    table.ForeignKey(name: "FK_UserUnlocks_AspNetUsers_UserId", column: x => x.UserId, principalTable: "AspNetUsers", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(name: "FK_UserUnlocks_UnlockDefinitions_UnlockDefinitionId", column: x => x.UnlockDefinitionId, principalTable: "UnlockDefinitions", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(name: "IX_Claims_ClaimantUserId", table: "Claims", column: "ClaimantUserId");
            migrationBuilder.CreateIndex(name: "IX_Claims_MedicationId", table: "Claims", column: "MedicationId");
            migrationBuilder.CreateIndex(name: "IX_Claims_PartyId", table: "Claims", column: "PartyId");
            migrationBuilder.CreateIndex(name: "IX_UserUnlocks_UnlockDefinitionId", table: "UserUnlocks", column: "UnlockDefinitionId");
            migrationBuilder.CreateIndex(name: "IX_UserUnlocks_UserId_UnlockDefinitionId", table: "UserUnlocks", columns: new[] { "UserId", "UnlockDefinitionId" }, unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "Claims");
            migrationBuilder.DropTable(name: "UserUnlocks");
            migrationBuilder.DropTable(name: "UnlockDefinitions");
            migrationBuilder.DropColumn(name: "Level", table: "AspNetUsers");
            migrationBuilder.DropColumn(name: "TotalXp", table: "AspNetUsers");
            migrationBuilder.DropColumn(name: "XpIntoLevel", table: "AspNetUsers");
        }
    }
}
