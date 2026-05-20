using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediQuest.Api.Migrations
{
    public partial class AddAccountTypeAndFixEpicConnectionUserFk : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccountType",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.DropForeignKey(
                name: "FK_EpicConnections_AspNetUsers_UserId1",
                table: "EpicConnections");

            migrationBuilder.DropIndex(
                name: "IX_EpicConnections_UserId1",
                table: "EpicConnections");

            migrationBuilder.DropColumn(
                name: "UserId1",
                table: "EpicConnections");

            migrationBuilder.AddForeignKey(
                name: "FK_EpicConnections_AspNetUsers_UserId",
                table: "EpicConnections",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EpicConnections_AspNetUsers_UserId",
                table: "EpicConnections");

            migrationBuilder.AddColumn<string>(
                name: "UserId1",
                table: "EpicConnections",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.DropColumn(
                name: "AccountType",
                table: "AspNetUsers");

            migrationBuilder.CreateIndex(
                name: "IX_EpicConnections_UserId1",
                table: "EpicConnections",
                column: "UserId1");

            migrationBuilder.AddForeignKey(
                name: "FK_EpicConnections_AspNetUsers_UserId1",
                table: "EpicConnections",
                column: "UserId1",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
