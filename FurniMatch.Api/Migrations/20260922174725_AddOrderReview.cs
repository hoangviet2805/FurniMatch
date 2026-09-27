using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FurniMatch.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('WithdrawalRequests') AND name = 'PaymentReceiptUrl')
                BEGIN
                    ALTER TABLE [WithdrawalRequests] ADD [PaymentReceiptUrl] nvarchar(500) NULL;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CommissionConfigs') AND name = 'PayoutDelayHours')
                BEGIN
                    ALTER TABLE [CommissionConfigs] ADD [PayoutDelayHours] int NOT NULL DEFAULT 0;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CommissionConfigs') AND name = 'PayoutDelayMinutes')
                BEGIN
                    ALTER TABLE [CommissionConfigs] ADD [PayoutDelayMinutes] int NOT NULL DEFAULT 0;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PaymentReceiptUrl",
                table: "WithdrawalRequests");

            migrationBuilder.DropColumn(
                name: "PayoutDelayHours",
                table: "CommissionConfigs");

            migrationBuilder.DropColumn(
                name: "PayoutDelayMinutes",
                table: "CommissionConfigs");
        }
    }
}
