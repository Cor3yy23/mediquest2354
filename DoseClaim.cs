using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediQuest.Api.Migrations
{
    public partial class AddSelectedCosmeticsToAppUser : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SelectedAvatarKey",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SelectedThemeKey",
                table: "AspNetUsers",
                type: "text",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SelectedAvatarKey",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "SelectedThemeKey",
                table: "AspNetUsers");
        }
    }
}
