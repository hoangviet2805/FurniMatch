using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FurniMatch.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSellerDisputeFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrderDisputes') AND name = 'SellerNote')
                BEGIN
                    ALTER TABLE [OrderDisputes] ADD [SellerNote] nvarchar(max) NULL;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('OrderDisputes') AND name = 'ReturnReceivedAt')
                BEGIN
                    ALTER TABLE [OrderDisputes] ADD [ReturnReceivedAt] datetime2 NULL;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SellerNote",
                table: "OrderDisputes");

            migrationBuilder.DropColumn(
                name: "ReturnReceivedAt",
                table: "OrderDisputes");
        }
    }
}
