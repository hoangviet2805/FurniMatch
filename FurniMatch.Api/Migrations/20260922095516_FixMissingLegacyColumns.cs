using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FurniMatch.Api.Migrations
{
    /// <inheritdoc />
    public partial class FixMissingLegacyColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF COL_LENGTH('Orders', 'Status') IS NULL
BEGIN
    ALTER TABLE [Orders] ADD [Status] nvarchar(max) NOT NULL DEFAULT 'CONFIRMED';
END
IF COL_LENGTH('Orders', 'ShippingAddress') IS NULL
BEGIN
    ALTER TABLE [Orders] ADD [ShippingAddress] nvarchar(max) NOT NULL DEFAULT '';
END
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
