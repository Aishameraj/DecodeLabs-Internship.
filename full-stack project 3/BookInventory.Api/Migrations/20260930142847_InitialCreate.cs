using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BookInventory.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Books",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Author = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    PublicationYear = table.Column<int>(type: "int", nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Books", x => x.Id);
                    table.CheckConstraint("CK_Books_Author", "LEN(LTRIM(RTRIM([Author]))) > 0");
                    table.CheckConstraint("CK_Books_PublicationYear", "[PublicationYear] BETWEEN 1 AND 9999");
                    table.CheckConstraint("CK_Books_Quantity", "[Quantity] BETWEEN 0 AND 1000000");
                    table.CheckConstraint("CK_Books_Title", "LEN(LTRIM(RTRIM([Title]))) > 0");
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Books");
        }
    }
}
