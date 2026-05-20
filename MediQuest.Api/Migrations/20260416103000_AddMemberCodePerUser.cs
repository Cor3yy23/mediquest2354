using MediQuest.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MediQuest.Api.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260416103000_AddMemberCodePerUser")]
    public partial class AddMemberCodePerUser : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MemberCode",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_MemberCode",
                table: "AspNetUsers",
                column: "MemberCode",
                unique: true,
                filter: "\"MemberCode\" IS NOT NULL");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_MemberCode",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "MemberCode",
                table: "AspNetUsers");
        }
    }
}
