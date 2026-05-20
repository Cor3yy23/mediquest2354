using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediQuest.Api.Migrations
{
    /// <inheritdoc />
    public partial class UnlockCosmetics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "RequiredLevel",
                table: "UnlockDefinitions",
                newName: "SortOrder");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "UnlockDefinitions",
                newName: "DisplayName");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "UnlockDefinitions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Key",
                table: "UnlockDefinitions",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "LevelRequired",
                table: "UnlockDefinitions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_UnlockDefinitions_Key",
                table: "UnlockDefinitions",
                column: "Key",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UnlockDefinitions_Key",
                table: "UnlockDefinitions");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "UnlockDefinitions");

            migrationBuilder.DropColumn(
                name: "Key",
                table: "UnlockDefinitions");

            migrationBuilder.DropColumn(
                name: "LevelRequired",
                table: "UnlockDefinitions");

            migrationBuilder.RenameColumn(
                name: "SortOrder",
                table: "UnlockDefinitions",
                newName: "RequiredLevel");

            migrationBuilder.RenameColumn(
                name: "DisplayName",
                table: "UnlockDefinitions",
                newName: "Name");
        }
    }
}
