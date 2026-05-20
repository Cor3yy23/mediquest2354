using System;
using MediQuest.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace MediQuest.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260415120000_AddNotificationsRefillAndPtClaims")]
    public partial class AddNotificationsRefillAndPtClaims : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ActivityLabel",
                table: "Claims",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ActivityType",
                table: "Claims",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PhysicalTherapyTaskId",
                table: "Claims",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DosesRemaining",
                table: "Medications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LowSupplyThreshold",
                table: "Medications",
                type: "integer",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.AddColumn<int>(
                name: "QuantityOnHand",
                table: "Medications",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RefillStatus",
                table: "Medications",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Body = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DueAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReadAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MetaJson = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Notifications_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PhysicalTherapyTasks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OwnerUserId = table.Column<string>(type: "text", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Instructions = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PhysicalTherapyTasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PhysicalTherapyTasks_AspNetUsers_OwnerUserId",
                        column: x => x.OwnerUserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Claims_PhysicalTherapyTaskId",
                table: "Claims",
                column: "PhysicalTherapyTaskId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId",
                table: "Notifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PhysicalTherapyTasks_OwnerUserId",
                table: "PhysicalTherapyTasks",
                column: "OwnerUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Claims_PhysicalTherapyTasks_PhysicalTherapyTaskId",
                table: "Claims",
                column: "PhysicalTherapyTaskId",
                principalTable: "PhysicalTherapyTasks",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Claims_PhysicalTherapyTasks_PhysicalTherapyTaskId",
                table: "Claims");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "PhysicalTherapyTasks");

            migrationBuilder.DropIndex(
                name: "IX_Claims_PhysicalTherapyTaskId",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "ActivityLabel",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "ActivityType",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "PhysicalTherapyTaskId",
                table: "Claims");

            migrationBuilder.DropColumn(
                name: "DosesRemaining",
                table: "Medications");

            migrationBuilder.DropColumn(
                name: "LowSupplyThreshold",
                table: "Medications");

            migrationBuilder.DropColumn(
                name: "QuantityOnHand",
                table: "Medications");

            migrationBuilder.DropColumn(
                name: "RefillStatus",
                table: "Medications");
        }
    }
}